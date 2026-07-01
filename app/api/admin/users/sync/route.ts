import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cloudflareEnv } from "@/lib/cloudflare-store";
import { HQ_OWNER_EMAIL } from "@/lib/hq-admin";

export const dynamic = "force-dynamic";

type ClerkUserListItem = Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUserList"]>>["data"][number];

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function assertOwner() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  return email === HQ_OWNER_EMAIL;
}

function primaryEmail(user: ClerkUserListItem) {
  const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

export async function POST() {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);

  const env = await cloudflareEnv();
  if (!env.DRKARD_DB) return jsonError("DRKARD_DB binding is not configured.", 500);

  const client = await clerkClient();
  const pageSize = 100;
  let offset = 0;
  let synced = 0;
  let total = 0;
  const clerkUserIds: string[] = [];
  const statement = env.DRKARD_DB.prepare(
    `insert into users (clerk_user_id, email, first_name, last_name, image_url, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?)
     on conflict(clerk_user_id) do update set
       email = excluded.email,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       image_url = excluded.image_url,
       updated_at = excluded.updated_at`,
  );

  do {
    const page = await client.users.getUserList({ limit: pageSize, offset, orderBy: "-created_at" });
    total = page.totalCount;
    if (!page.data.length) break;
    const clerkUsers = page.data.filter((user) => user.id.startsWith("user_"));
    clerkUserIds.push(...clerkUsers.map((user) => user.id));
    if (clerkUsers.length) {
      await env.DRKARD_DB.batch(
        clerkUsers.map((user) =>
          statement.bind(
            user.id,
            primaryEmail(user),
            user.firstName ?? null,
            user.lastName ?? null,
            user.imageUrl ?? null,
            user.createdAt,
            user.updatedAt,
          ),
        ),
      );
    }
    synced += clerkUsers.length;
    offset += page.data.length;
  } while (offset < total);

  await env.DRKARD_DB.prepare("delete from users where clerk_user_id not like 'user_%'").run();
  if (clerkUserIds.length) {
    const placeholders = clerkUserIds.map(() => "?").join(",");
    await env.DRKARD_DB.prepare(`delete from users where clerk_user_id not in (${placeholders})`).bind(...clerkUserIds).run();
  } else {
    await env.DRKARD_DB.prepare("delete from users").run();
  }

  revalidatePath("/hq");
  return NextResponse.json({ synced, total, removedStale: true });
}
