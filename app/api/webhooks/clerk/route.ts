import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { cloudflareEnv, run } from "@/lib/cloudflare-store";

// Runs on the default (Node) runtime, not edge: Clerk's `verifyWebhook` (svix)
// needs Node crypto, which the Worker's edge runtime does not provide.

async function sendResendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
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

export async function POST(req: NextRequest) {
  // Reject obviously-unsigned requests up front so a malformed probe can never
  // reach (and crash) the verifier.
  if (!req.headers.get("svix-signature")) {
    return new Response("Missing svix-signature", { status: 400 });
  }

  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return new Response("Verification failed", { status: 400 });
  }

  // Keep Cloudflare D1's user table in sync with Clerk.
  if (evt.type === "user.created" || evt.type === "user.updated") {
    try {
      const env = await cloudflareEnv();
      await run(
        env.DRKARD_DB,
        `insert into users (clerk_user_id, email, first_name, last_name, image_url, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?)
         on conflict(clerk_user_id) do update set
           email = excluded.email,
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           image_url = excluded.image_url,
           updated_at = excluded.updated_at`,
        evt.data.id,
        evt.data.email_addresses[0]?.email_address ?? null,
        evt.data.first_name ?? null,
        evt.data.last_name ?? null,
        evt.data.image_url ?? null,
        Date.now(),
        Date.now(),
      );
    } catch (error) {
      console.error("D1 user upsert failed:", error);
    }
  }

  if (evt.type === "user.created") {
    const email = evt.data.email_addresses[0]?.email_address;
    const name = `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim();
    if (email) {
      await sendResendEmail({
        to: email,
        subject: "Welcome to DrKard",
        html: `<p>Hi ${name || "there"},</p><p>Your DrKard account is ready. Choose an exam and start practicing.</p>`,
      });
    }
  }

  return new Response("OK", { status: 200 });
}
