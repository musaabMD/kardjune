import { NextRequest, NextResponse } from "next/server";
import { monthStartUtcMs } from "@/lib/ai-pricing";
import { all, cloudflareEnv } from "@/lib/cloudflare-store";

/** Admin-only: per-user AI usage for a calendar month. */
export async function GET(req: NextRequest) {
  const adminSecret = process.env.DRKARD_ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "DRKARD_ADMIN_SECRET is not configured." }, { status: 500 });
  }

  const provided =
    req.headers.get("x-admin-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const periodParam = req.nextUrl.searchParams.get("period");
  let billingPeriodStart = monthStartUtcMs();
  if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
    const [year, month] = periodParam.split("-").map(Number);
    billingPeriodStart = Date.UTC(year, month - 1, 1);
  }

  const env = await cloudflareEnv();
  const rows = await all<{
    clerkUserId: string;
    email: string | null;
    usedUsd: number;
    requestCount: number;
  }>(
    env.DRKARD_DB,
    `select
       e.clerk_user_id as clerkUserId,
       u.email as email,
       coalesce(sum(e.estimated_cost_usd), 0) as usedUsd,
       count(*) as requestCount
     from ai_usage_events e
     left join users u on u.clerk_user_id = e.clerk_user_id
     where e.billing_period_start = ?
     group by e.clerk_user_id, u.email
     order by usedUsd desc`,
    billingPeriodStart,
  );

  const totalUsd = rows.reduce((sum: number, row: { usedUsd: number }) => sum + row.usedUsd, 0);

  return NextResponse.json({
    billingPeriodStart,
    period: new Date(billingPeriodStart).toISOString().slice(0, 7),
    totalUsd: Math.round(totalUsd * 1_000_000) / 1_000_000,
    userCount: rows.length,
    users: rows,
  });
}
