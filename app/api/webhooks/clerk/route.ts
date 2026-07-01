import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { cloudflareEnv } from "@/lib/cloudflare-store";

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

function primaryEmail(data: {
  email_addresses: { id?: string; email_address?: string }[];
  primary_email_address_id?: string | null;
}) {
  const primary = data.email_addresses.find((email) => email.id === data.primary_email_address_id);
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? null;
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

  // Keep Cloudflare D1's user table in sync with Clerk. Return 500 on write
  // failures so Clerk/Svix retries instead of marking the event delivered.
  if (evt.type === "user.created" || evt.type === "user.updated" || evt.type === "user.deleted") {
    try {
      const env = await cloudflareEnv();
      if (!env.DRKARD_DB) throw new Error("DRKARD_DB binding is not configured.");

      if (evt.type === "user.deleted") {
        if (evt.data.id) {
          const result = await env.DRKARD_DB.prepare("delete from users where clerk_user_id = ?").bind(evt.data.id).run();
          if (!result.success) throw new Error(result.error ?? "D1 user delete failed.");
        }
      } else {
        const now = Date.now();
        const createdAt = Number(evt.data.created_at) || now;
        const updatedAt = Number(evt.data.updated_at) || now;
        const result = await env.DRKARD_DB.prepare(
          `insert into users (clerk_user_id, email, first_name, last_name, image_url, created_at, updated_at)
           values (?, ?, ?, ?, ?, ?, ?)
           on conflict(clerk_user_id) do update set
             email = excluded.email,
             first_name = excluded.first_name,
             last_name = excluded.last_name,
             image_url = excluded.image_url,
             updated_at = excluded.updated_at`,
        )
          .bind(
            evt.data.id,
            primaryEmail(evt.data),
            evt.data.first_name ?? null,
            evt.data.last_name ?? null,
            evt.data.image_url ?? null,
            createdAt,
            updatedAt,
          )
          .run();
        if (!result.success) throw new Error(result.error ?? "D1 user upsert failed.");
      }
      revalidatePath("/hq");
    } catch (error) {
      console.error("D1 user sync failed:", error);
      return new Response("D1 user sync failed", { status: 500 });
    }
  }

  if (evt.type === "user.created") {
    const email = primaryEmail(evt.data);
    const name = `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim();
    if (email) {
      try {
        await sendResendEmail({
          to: email,
          subject: "Welcome to DrKard",
          html: `<p>Hi ${name || "there"},</p><p>Your DrKard account is ready. Choose an exam and start practicing.</p>`,
        });
      } catch (error) {
        console.error("Welcome email failed:", error);
      }
    }
  }

  return new Response("OK", { status: 200 });
}
