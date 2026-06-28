import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { cloudflareEnv, run } from "@/lib/cloudflare-store";

async function sendResendEmail(options: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...options }),
  });
}

function planForPrice(priceId: string | undefined): string {
  if (priceId && priceId === process.env.STRIPE_PRICE_MONTHLY_ID) return "monthly";
  if (priceId && priceId === process.env.STRIPE_PRICE_ANNUAL_ID) return "annual";
  return "pro";
}

async function syncSubscription(sub: Stripe.Subscription) {
  const clerkUserId = sub.metadata?.clerkUserId;
  if (!clerkUserId) {
    throw new Error("Missing clerkUserId on subscription.");
  }

  const periodEnd =
    sub.items.data[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;

  const env = await cloudflareEnv();
  await run(
    env.DRKARD_DB,
    `insert into subscriptions
      (clerk_user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, updated_at)
     values (?, ?, ?, ?, ?, ?, ?)
     on conflict(clerk_user_id) do update set
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       plan = excluded.plan,
       status = excluded.status,
       current_period_end = excluded.current_period_end,
       updated_at = excluded.updated_at`,
    clerkUserId,
    typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    sub.id,
    planForPrice(sub.items.data[0]?.price?.id),
    sub.status,
    periodEnd,
    Date.now(),
  );
}

async function notifySubscriptionChange(sub: Stripe.Subscription, eventType: string) {
  const email = sub.metadata?.email;
  if (!email) return;

  if (eventType === "customer.subscription.deleted") {
    await sendResendEmail({
      to: email,
      subject: "DrKard subscription canceled",
      html: "<p>Your DrKard Pro subscription has ended. You can resubscribe anytime from the pricing page.</p>",
    });
    return;
  }

  if (sub.status === "past_due" || sub.status === "unpaid") {
    await sendResendEmail({
      to: email,
      subject: "DrKard payment issue",
      html: `<p>There is a billing issue with your DrKard subscription (${sub.status}). Open manage billing from your account to update payment details.</p>`,
    });
  }
}

export async function POST(req: NextRequest) {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) {
    return new Response("STRIPE_WEBHOOK_SECRET is not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const stripe = getStripe();
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, signingSecret);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        await notifySubscriptionChange(sub, event.type);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id,
          );
          if (!sub.metadata?.clerkUserId && session.metadata?.clerkUserId) {
            sub.metadata = {
              ...sub.metadata,
              clerkUserId: session.metadata.clerkUserId,
              email: session.customer_details?.email ?? sub.metadata.email,
            };
          }
          await syncSubscription(sub);
          const email = session.customer_details?.email;
          if (email) {
            await sendResendEmail({
              to: email,
              subject: "Welcome to DrKard Pro",
              html: "<p>Thanks for subscribing to DrKard Pro. Unlimited practice and AI help are now active on your account.</p>",
            });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return new Response("Handler failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
