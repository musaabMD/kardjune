import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/cloudflare-store";
import { getStripe, getStripePriceId } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Sign in before checkout." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { lookupKey?: string } | null;
    const lookupKey = body?.lookupKey ?? "";
    const price = getStripePriceId(lookupKey);
    if (!price) {
      return NextResponse.json(
        { error: `Stripe price for ${lookupKey || "selected plan"} is not configured.` },
        { status: 500 },
      );
    }

    const user = await currentUser();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/pricing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      client_reference_id: userId,
      customer_email: user?.primaryEmailAddress?.emailAddress,
      metadata: {
        clerkUserId: userId,
        plan: lookupKey,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
          plan: lookupKey,
          email: user?.primaryEmailAddress?.emailAddress ?? "",
        },
      },
    });
    await recordEvent({
      name: "checkout_initiated",
      clerkUserId: userId,
      path: "/api/stripe/checkout",
      metadata: { lookupKey, price },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    console.error("Stripe checkout failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
