import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { ACTIVE_GOAL_NAMES } from "@/lib/hq-goals";
import { cloudflareEnv, createId, json, run } from "@/lib/cloudflare-store";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    path?: unknown;
    metadata?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name : "";
  if (!ACTIVE_GOAL_NAMES.has(name)) {
    return json({ error: "Unknown event." }, { status: 400 });
  }

  const session = await auth();
  const env = await cloudflareEnv();
  await run(
    env.DRKARD_DB,
    `insert into analytics_events
      (id, name, clerk_user_id, path, metadata, user_agent, referrer, country, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    createId("evt"),
    name,
    session.userId ?? null,
    typeof body?.path === "string" ? body.path.slice(0, 300) : null,
    body?.metadata ? JSON.stringify(body.metadata).slice(0, 2000) : null,
    req.headers.get("user-agent")?.slice(0, 300) ?? null,
    req.headers.get("referer")?.slice(0, 300) ?? null,
    (req as NextRequest & { cf?: { country?: string } }).cf?.country ?? null,
    Date.now(),
  );

  return json({ ok: true });
}
