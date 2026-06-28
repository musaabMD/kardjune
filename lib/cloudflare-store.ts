import { getCloudflareContext } from "@opennextjs/cloudflare";
import { FREE_QUESTIONS_PER_24H, FREE_UPLOADS_PER_24H } from "@/lib/billing-limits";
import { PRO_AI_BUDGET_USD } from "@/lib/constants";
import { monthStartUtcMs, nextMonthStartUtcMs } from "@/lib/ai-pricing";
import { SAMPLE_EXAMS, sampleQuestionsForExam, type BankQuestion, type ExamRecord } from "@/lib/sample-data";

const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

export type DrKardEnv = CloudflareEnv & {
  DRKARD_DB?: D1Database;
  DRKARD_LIMITS?: KVNamespace;
  DRKARD_QBANKS?: R2Bucket;
  DRKARD_UPLOADS?: R2Bucket;
};

export type Entitlements = {
  isPro: boolean;
  plan: string;
  status: string;
  currentPeriodEnd?: number;
  aiAllowed: boolean;
  aiBudgetUsd: number | null;
  aiUsedUsd: number | null;
  aiRemainingUsd: number | null;
  aiResetsAt: number | null;
  aiRequestCount?: number | null;
  questionsUsedToday: number;
  questionsLimit: number | null;
  questionsRemaining: number | null;
  uploadsUsedToday: number;
  uploadsLimit: number | null;
  uploadsRemaining: number | null;
};

export async function cloudflareEnv() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as DrKardEnv;
  } catch {
    return {} as DrKardEnv;
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function all<T>(db: D1Database | undefined, sql: string, ...binds: unknown[]) {
  if (!db) return [];
  const result = await db.prepare(sql).bind(...binds).all<T>();
  return result.results ?? [];
}

export async function first<T>(db: D1Database | undefined, sql: string, ...binds: unknown[]) {
  if (!db) return null;
  return await db.prepare(sql).bind(...binds).first<T>();
}

export async function run(db: D1Database | undefined, sql: string, ...binds: unknown[]) {
  if (!db) return null;
  return await db.prepare(sql).bind(...binds).run();
}

export function currentPeriodKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dayBucket(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

async function kvNumber(kv: KVNamespace | undefined, key: string) {
  if (!kv) return 0;
  const value = await kv.get(key);
  return value ? Number(value) || 0 : 0;
}

async function kvIncrement(kv: KVNamespace | undefined, key: string, by: number) {
  if (!kv) return;
  const next = (await kvNumber(kv, key)) + by;
  await kv.put(key, String(next), { expirationTtl: 60 * 60 * 48 });
}

export async function incrementQuestionUsage(userId: string, count: number) {
  const env = await cloudflareEnv();
  await kvIncrement(env.DRKARD_LIMITS, `usage:${userId}:questions:${dayBucket()}`, count);
}

export async function incrementUploadUsage(userId: string) {
  const env = await cloudflareEnv();
  await kvIncrement(env.DRKARD_LIMITS, `usage:${userId}:uploads:${dayBucket()}`, 1);
}

export async function listExams(): Promise<ExamRecord[]> {
  const env = await cloudflareEnv();
  const rows = await all<ExamRecord>(env.DRKARD_DB, "select id, slug, title, role from exams order by title");
  return rows.length ? rows : SAMPLE_EXAMS;
}

export async function examBySlug(slug: string) {
  const exams = await listExams();
  return exams.find((exam) => exam.slug === slug || exam.id === slug) ?? null;
}

export async function readQuestions(examSlug: string): Promise<BankQuestion[]> {
  const env = await cloudflareEnv();
  const exam = await examBySlug(examSlug);
  if (!exam) return [];

  const key = `qbanks/v1/${exam.slug}/all.json`;
  const object = await env.DRKARD_QBANKS?.get(key);
  if (object) {
    const payload = (await object.json()) as { questions?: BankQuestion[] } | BankQuestion[];
    return Array.isArray(payload) ? payload : payload.questions ?? [];
  }
  return sampleQuestionsForExam(exam);
}

export async function getEntitlements(clerkUserId: string | null | undefined): Promise<Entitlements> {
  const env = await cloudflareEnv();
  if (!clerkUserId) {
    return {
      isPro: false,
      plan: "free",
      status: "none",
      aiAllowed: false,
      aiBudgetUsd: null,
      aiUsedUsd: null,
      aiRemainingUsd: null,
      aiResetsAt: null,
      questionsUsedToday: 0,
      questionsLimit: FREE_QUESTIONS_PER_24H,
      questionsRemaining: FREE_QUESTIONS_PER_24H,
      uploadsUsedToday: 0,
      uploadsLimit: FREE_UPLOADS_PER_24H,
      uploadsRemaining: FREE_UPLOADS_PER_24H,
    };
  }

  const sub = await first<{
    plan: string;
    status: string;
    currentPeriodEnd?: number;
  }>(
    env.DRKARD_DB,
    "select plan, status, current_period_end as currentPeriodEnd from subscriptions where clerk_user_id = ?",
    clerkUserId,
  );
  const isPro = Boolean(sub && PRO_STATUSES.has(sub.status));
  const questionsUsedToday = await kvNumber(env.DRKARD_LIMITS, `usage:${clerkUserId}:questions:${dayBucket()}`);
  const uploadsUsedToday = await kvNumber(env.DRKARD_LIMITS, `usage:${clerkUserId}:uploads:${dayBucket()}`);
  const usage = await first<{ usedUsd: number; requestCount: number }>(
    env.DRKARD_DB,
    "select coalesce(sum(estimated_cost_usd), 0) as usedUsd, count(*) as requestCount from ai_usage_events where clerk_user_id = ? and billing_period_start = ?",
    clerkUserId,
    monthStartUtcMs(),
  );
  const aiUsedUsd = Math.round((usage?.usedUsd ?? 0) * 1_000_000) / 1_000_000;
  const aiRemainingUsd = Math.max(0, PRO_AI_BUDGET_USD - aiUsedUsd);

  return {
    isPro,
    plan: isPro ? sub!.plan : "free",
    status: sub?.status ?? "none",
    currentPeriodEnd: sub?.currentPeriodEnd,
    aiAllowed: isPro && aiRemainingUsd > 0,
    aiBudgetUsd: isPro ? PRO_AI_BUDGET_USD : null,
    aiUsedUsd: isPro ? aiUsedUsd : null,
    aiRemainingUsd: isPro ? Math.round(aiRemainingUsd * 1_000_000) / 1_000_000 : null,
    aiResetsAt: isPro ? nextMonthStartUtcMs() : null,
    aiRequestCount: isPro ? usage?.requestCount ?? 0 : null,
    questionsUsedToday,
    questionsLimit: isPro ? null : FREE_QUESTIONS_PER_24H,
    questionsRemaining: isPro ? null : Math.max(0, FREE_QUESTIONS_PER_24H - questionsUsedToday),
    uploadsUsedToday,
    uploadsLimit: isPro ? null : FREE_UPLOADS_PER_24H,
    uploadsRemaining: isPro ? null : Math.max(0, FREE_UPLOADS_PER_24H - uploadsUsedToday),
  };
}

export async function assertQuestionQuota(clerkUserId: string, count: number) {
  const entitlements = await getEntitlements(clerkUserId);
  if (entitlements.questionsLimit !== null && entitlements.questionsUsedToday + count > entitlements.questionsLimit) {
    return `Daily question limit reached (${entitlements.questionsLimit} per 24 hours). Upgrade to Pro for unlimited practice.`;
  }
  return null;
}

export async function assertUploadQuota(clerkUserId: string) {
  const entitlements = await getEntitlements(clerkUserId);
  if (entitlements.uploadsLimit !== null && entitlements.uploadsUsedToday >= entitlements.uploadsLimit) {
    return `Daily upload limit reached (${entitlements.uploadsLimit} per 24 hours). Upgrade to Pro for unlimited uploads.`;
  }
  return null;
}
