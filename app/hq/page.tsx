/* eslint-disable react-hooks/purity */
import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import HqDashboard, { type HqColumn, type HqMetric, type IconKey, type Row, type Stat, type Status } from "./HqDashboard";
import { all, cloudflareEnv, first } from "@/lib/cloudflare-store";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const HQ_OWNER_EMAIL = "mousab.r@gmail.com";
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const PERIODS = ["This week", "Last week", "2 weeks ago", "3 weeks ago", "4 weeks ago", "5 weeks ago", "6 weeks ago", "7 weeks ago"];

const ownerPalette = [
  "bg-teal-100 text-teal-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

export const metadata: Metadata = {
  title: "DrKard HQ",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type CountRow = { value: number | null };
type AiRow = { usedUsd: number | null; requests: number | null };
type GoalRow = { name: string; count: number };
type ExamRow = { id: string; slug: string; title: string; role: string };
type UserTableRow = {
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  createdAt: number;
  updatedAt: number;
};
type SubscriptionTableRow = UserTableRow & {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: number | null;
};
type SessionTableRow = {
  id: string;
  clerkUserId: string;
  email: string | null;
  examId: string;
  title: string;
  total: number;
  correct: number;
  durationSec: number;
  createdAt: number;
};
type AnswerTableRow = {
  id: string;
  clerkUserId: string;
  email: string | null;
  sessionId: string;
  examId: string;
  questionId: string;
  position: number;
  selected: number;
  correct: number;
};
type UploadTableRow = {
  id: string;
  clerkUserId: string;
  email: string | null;
  key: string;
  name: string;
  size: number;
  contentType: string | null;
  url: string | null;
  createdAt: number;
};
type FeedbackTableRow = {
  id: string;
  clerkUserId: string | null;
  email: string | null;
  examId: string;
  questionId: string;
  issueType: string;
  note: string;
  selectedAnswer: number | null;
  reportStatus: string;
  createdAt: number;
};
type AiUsageTableRow = {
  id: string;
  clerkUserId: string;
  email: string | null;
  examId: string | null;
  threadId: string | null;
  kind: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  billingPeriodStart: number;
  createdAt: number;
};
type AnalyticsTableRow = {
  id: string;
  name: string;
  clerkUserId: string | null;
  email: string | null;
  path: string | null;
  metadata: string | null;
  country: string | null;
  referrer: string | null;
  createdAt: number;
};
type RetentionTableRow = {
  clerkUserId: string;
  email: string | null;
  sessions: number;
  questions: number;
  accuracy: number | null;
  lastSessionAt: number;
};
type Formatter = (value: number) => string;

const number = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const bytes = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatDate(value: number | null | undefined) {
  return value ? dateTime.format(new Date(value)) : "";
}

function formatBytes(value: number | null | undefined) {
  const size = Number(value ?? 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${bytes.format(size / 1024)} KB`;
  return `${bytes.format(size / (1024 * 1024))} MB`;
}

function row(input: Partial<Row> & Record<string, string | number | boolean | null | undefined>): Row {
  return {
    period: String(input.period ?? ""),
    value: String(input.value ?? ""),
    change: String(input.change ?? ""),
    changeDir: input.changeDir === "down" ? "down" : "up",
    changeGood: input.changeGood !== false,
    vsTarget: String(input.vsTarget ?? ""),
    status: input.status === "At risk" || input.status === "Off track" ? input.status : "On track",
    ...input,
  };
}

function accuracyStatus(value: number | null | undefined): Status {
  const score = Number(value ?? 0);
  if (score >= 0.75) return "On track";
  if (score >= 0.5) return "At risk";
  return "Off track";
}

function subscriptionStatus(status: string | null | undefined): Status {
  if (status === "active") return "On track";
  if (status === "trialing" || status === "past_due") return "At risk";
  return "Off track";
}

function openStatus(status: string | null | undefined): Status {
  return status === "open" ? "Off track" : "On track";
}

async function safeFirst<T>(db: D1Database | undefined, sql: string, ...binds: unknown[]) {
  try {
    return await first<T>(db, sql, ...binds);
  } catch {
    return null;
  }
}

async function safeAll<T>(db: D1Database | undefined, sql: string, ...binds: unknown[]) {
  try {
    return await all<T>(db, sql, ...binds);
  } catch {
    return [];
  }
}

async function weeklySeries(db: D1Database | undefined, sql: string, now: number) {
  return Promise.all(
    PERIODS.map(async (_period, index) => {
      const end = now - index * WEEK;
      const start = end - WEEK;
      const row = await safeFirst<CountRow>(db, sql, start, end);
      return Number(row?.value ?? 0);
    }),
  );
}

function flatSeries(value: number) {
  return PERIODS.map(() => value);
}

async function questionCountFromR2(bucket: R2Bucket | undefined, examSlug: string) {
  try {
    const object = await bucket?.get(`qbanks/v1/${examSlug}/all.json`);
    if (!object) return 0;
    const payload = (await object.json()) as { questions?: unknown[] } | unknown[];
    return Array.isArray(payload) ? payload.length : payload.questions?.length ?? 0;
  } catch {
    return 0;
  }
}

function changeStat(current: number, baseline: number, positiveIsGood: boolean): Stat {
  const delta = current - baseline;
  const dir: "up" | "down" = delta >= 0 ? "up" : "down";
  const percent = baseline === 0 ? (current === 0 ? 0 : 100) : (delta / Math.abs(baseline)) * 100;
  return {
    value: `${percent >= 0 ? "" : ""}${Math.abs(percent).toFixed(1)}%`,
    dir,
    good: positiveIsGood ? dir === "up" : dir === "down",
  };
}

function targetProgress(value: number, target: number, positiveIsGood: boolean) {
  if (target <= 0) return value <= 0 ? 100 : 0;
  const raw = positiveIsGood ? (value / target) * 100 : (1 - value / target) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function statusFromProgress(progress: number): Status {
  if (progress >= 70) return "On track";
  if (progress >= 40) return "At risk";
  return "Off track";
}

function metricFromSeries(options: {
  id: string;
  title: string;
  unit: string;
  value: string;
  category: string;
  icon: IconKey;
  ownerIndex: number;
  series: number[];
  targetValue: number;
  targetLabel: string;
  positiveIsGood: boolean;
  format: Formatter;
  rows: Row[];
  columns: HqColumn[];
}): HqMetric {
  const current = options.series[0] ?? 0;
  const lastWeek = options.series[1] ?? current;
  const monthBaseline = options.series.slice(1, 5).reduce((sum, value) => sum + value, 0) / Math.max(1, options.series.slice(1, 5).length);
  const olderBaseline = options.series.slice(1).reduce((sum, value) => sum + value, 0) / Math.max(1, options.series.slice(1).length);
  const progress = targetProgress(current, options.targetValue, options.positiveIsGood);

  return {
    id: options.id,
    title: options.title,
    unit: options.unit,
    value: options.value,
    category: options.category,
    icon: options.icon,
    owner: { initials: "HQ", color: ownerPalette[options.ownerIndex % ownerPalette.length] },
    stats: {
      wow: changeStat(current, lastWeek, options.positiveIsGood),
      mom: changeStat(current, monthBaseline, options.positiveIsGood),
      yoy: changeStat(current, olderBaseline, options.positiveIsGood),
    },
    target: {
      label: options.targetLabel,
      status: statusFromProgress(progress),
      progress,
    },
    columns: options.columns,
    rows: options.rows,
  };
}

export default async function HqPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/hq");

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (email !== HQ_OWNER_EMAIL) notFound();

  const env = await cloudflareEnv();
  const db = env.DRKARD_DB;
  const now = Date.now();
  const since30 = now - 30 * DAY;
  const monthStart = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);

  const [
    userCount,
    proCount,
    sessions30,
    questions30,
    avgCorrect30,
    uploads30,
    openFeedback,
    aiMonth,
    goalRows,
    exams,
    userSeries,
    proSeries,
    sessionSeries,
    questionSeries,
    scoreSeries,
    uploadSeries,
    feedbackSeries,
    aiCostSeries,
    eventSeries,
  ] = await Promise.all([
    safeFirst<CountRow>(db, "select count(*) as value from users"),
    safeFirst<CountRow>(db, "select count(*) as value from subscriptions where status in ('active', 'trialing', 'past_due')"),
    safeFirst<CountRow>(db, "select count(*) as value from practice_sessions where created_at >= ?", since30),
    safeFirst<CountRow>(db, "select coalesce(sum(total), 0) as value from practice_sessions where created_at >= ?", since30),
    safeFirst<CountRow>(db, "select avg(correct * 1.0 / nullif(total, 0)) as value from practice_sessions where created_at >= ?", since30),
    safeFirst<CountRow>(db, "select count(*) as value from uploads where created_at >= ?", since30),
    safeFirst<CountRow>(db, "select count(*) as value from question_feedback where status = 'open'"),
    safeFirst<AiRow>(db, "select coalesce(sum(estimated_cost_usd), 0) as usedUsd, count(*) as requests from ai_usage_events where billing_period_start = ?", monthStart),
    safeAll<GoalRow>(db, "select name, count(*) as count from analytics_events where created_at >= ? group by name", since30),
    safeAll<ExamRow>(db, "select id, slug, title, role from exams order by title"),
    weeklySeries(db, "select count(*) as value from users where created_at >= ? and created_at < ?", now),
    weeklySeries(db, "select count(*) as value from subscriptions where updated_at >= ? and updated_at < ? and status in ('active', 'trialing', 'past_due')", now),
    weeklySeries(db, "select count(*) as value from practice_sessions where created_at >= ? and created_at < ?", now),
    weeklySeries(db, "select coalesce(sum(total), 0) as value from practice_sessions where created_at >= ? and created_at < ?", now),
    weeklySeries(db, "select avg(correct * 1.0 / nullif(total, 0)) as value from practice_sessions where created_at >= ? and created_at < ?", now),
    weeklySeries(db, "select count(*) as value from uploads where created_at >= ? and created_at < ?", now),
    weeklySeries(db, "select count(*) as value from question_feedback where created_at >= ? and created_at < ?", now),
    weeklySeries(db, "select coalesce(sum(estimated_cost_usd), 0) as value from ai_usage_events where created_at >= ? and created_at < ?", now),
    weeklySeries(db, "select count(*) as value from analytics_events where created_at >= ? and created_at < ?", now),
  ]);

  const questionCounts = await Promise.all(
    exams.map(async (exam) => {
      try {
        return await questionCountFromR2(env.DRKARD_QBANKS, exam.slug);
      } catch {
        return 0;
      }
    }),
  );
  const totalBankQuestions = questionCounts.reduce((sum, count) => sum + count, 0);
  const cloudflareReady = [env.DRKARD_DB, env.DRKARD_QBANKS, env.DRKARD_UPLOADS, env.DRKARD_LIMITS].filter(Boolean).length;
  const eventCount30 = goalRows.reduce((sum, row) => sum + row.count, 0);

  const [
    usersTable,
    subscriptionsTable,
    sessionsTable,
    answersTable,
    uploadsTable,
    feedbackTable,
    aiUsageTable,
    analyticsTable,
    retentionTable,
  ] = await Promise.all([
    safeAll<UserTableRow>(
      db,
      `select u.clerk_user_id as clerkUserId, u.email, u.first_name as firstName, u.last_name as lastName,
        s.plan, s.status as subscriptionStatus, u.created_at as createdAt, u.updated_at as updatedAt
       from users u
       left join subscriptions s on s.clerk_user_id = u.clerk_user_id
       order by u.created_at desc
       limit 250`,
    ),
    safeAll<SubscriptionTableRow>(
      db,
      `select s.clerk_user_id as clerkUserId, u.email, u.first_name as firstName, u.last_name as lastName,
        s.plan, s.status as subscriptionStatus, s.stripe_customer_id as stripeCustomerId,
        s.stripe_subscription_id as stripeSubscriptionId, s.current_period_end as currentPeriodEnd,
        s.updated_at as updatedAt, coalesce(u.created_at, s.updated_at) as createdAt
       from subscriptions s
       left join users u on u.clerk_user_id = s.clerk_user_id
       order by s.updated_at desc
       limit 250`,
    ),
    safeAll<SessionTableRow>(
      db,
      `select p.id, p.clerk_user_id as clerkUserId, u.email, p.exam_id as examId, p.title,
        p.total, p.correct, p.duration_sec as durationSec, p.created_at as createdAt
       from practice_sessions p
       left join users u on u.clerk_user_id = p.clerk_user_id
       order by p.created_at desc
       limit 250`,
    ),
    safeAll<AnswerTableRow>(
      db,
      `select a.id, a.clerk_user_id as clerkUserId, u.email, a.session_id as sessionId, a.exam_id as examId,
        a.question_id as questionId, a.position, a.selected, a.correct
       from session_answers a
       left join users u on u.clerk_user_id = a.clerk_user_id
       order by a.session_id desc, a.position asc
       limit 250`,
    ),
    safeAll<UploadTableRow>(
      db,
      `select f.id, f.clerk_user_id as clerkUserId, u.email, f.key, f.name, f.size,
        f.content_type as contentType, f.url, f.created_at as createdAt
       from uploads f
       left join users u on u.clerk_user_id = f.clerk_user_id
       order by f.created_at desc
       limit 250`,
    ),
    safeAll<FeedbackTableRow>(
      db,
      `select q.id, q.clerk_user_id as clerkUserId, u.email, q.exam_id as examId, q.question_id as questionId,
        q.issue_type as issueType, q.note, q.selected_answer as selectedAnswer, q.status as reportStatus,
        q.created_at as createdAt
       from question_feedback q
       left join users u on u.clerk_user_id = q.clerk_user_id
       order by q.created_at desc
       limit 250`,
    ),
    safeAll<AiUsageTableRow>(
      db,
      `select a.id, a.clerk_user_id as clerkUserId, u.email, a.exam_id as examId, a.thread_id as threadId,
        a.kind, a.model, a.prompt_tokens as promptTokens, a.completion_tokens as completionTokens,
        a.estimated_cost_usd as estimatedCostUsd, a.billing_period_start as billingPeriodStart,
        a.created_at as createdAt
       from ai_usage_events a
       left join users u on u.clerk_user_id = a.clerk_user_id
       order by a.created_at desc
       limit 250`,
    ),
    safeAll<AnalyticsTableRow>(
      db,
      `select e.id, e.name, e.clerk_user_id as clerkUserId, u.email, e.path, e.metadata,
        e.country, e.referrer, e.created_at as createdAt
       from analytics_events e
       left join users u on u.clerk_user_id = e.clerk_user_id
       order by e.created_at desc
       limit 250`,
    ),
    safeAll<RetentionTableRow>(
      db,
      `select p.clerk_user_id as clerkUserId, u.email, count(*) as sessions,
        coalesce(sum(p.total), 0) as questions,
        avg(p.correct * 1.0 / nullif(p.total, 0)) as accuracy,
        max(p.created_at) as lastSessionAt
       from practice_sessions p
       left join users u on u.clerk_user_id = p.clerk_user_id
       group by p.clerk_user_id, u.email
       order by sessions desc, lastSessionAt desc
       limit 250`,
    ),
  ]);

  const userRows = usersTable.map((item) =>
    row({
      email: item.email ?? "",
      name: [item.firstName, item.lastName].filter(Boolean).join(" "),
      clerkUserId: item.clerkUserId,
      plan: item.plan ?? "free",
      subscription: item.subscriptionStatus ?? "none",
      createdAt: formatDate(item.createdAt),
      updatedAt: formatDate(item.updatedAt),
      status: subscriptionStatus(item.subscriptionStatus),
      mode: "Single",
      assignee: "Unassigned",
      period: item.email ?? item.clerkUserId,
      value: item.plan ?? "free",
      change: formatDate(item.createdAt),
      vsTarget: item.subscriptionStatus ?? "none",
    }),
  );

  const subscriptionRows = subscriptionsTable.map((item) =>
    row({
      email: item.email ?? "",
      clerkUserId: item.clerkUserId,
      plan: item.plan ?? "free",
      subscription: item.subscriptionStatus ?? "none",
      stripeCustomerId: item.stripeCustomerId ?? "",
      stripeSubscriptionId: item.stripeSubscriptionId ?? "",
      currentPeriodEnd: formatDate(item.currentPeriodEnd),
      updatedAt: formatDate(item.updatedAt),
      status: subscriptionStatus(item.subscriptionStatus),
      mode: item.subscriptionStatus === "active" ? "Single" : "Multi-select",
      assignee: "Unassigned",
      period: item.email ?? item.clerkUserId,
      value: item.plan ?? "free",
      change: item.subscriptionStatus ?? "none",
      vsTarget: formatDate(item.currentPeriodEnd),
    }),
  );

  const sessionRows = sessionsTable.map((item) => {
    const accuracy = item.total ? item.correct / item.total : 0;
    return row({
      createdAt: formatDate(item.createdAt),
      email: item.email ?? "",
      examId: item.examId,
      title: item.title,
      total: item.total,
      correct: item.correct,
      accuracy: `${Math.round(accuracy * 100)}%`,
      duration: `${item.durationSec}s`,
      status: accuracyStatus(accuracy),
      trend: accuracy >= 0.75 ? "Up" : "Down",
      mode: "Single",
      assignee: "Unassigned",
      period: formatDate(item.createdAt),
      value: item.title,
      change: `${Math.round(accuracy * 100)}%`,
      changeDir: accuracy >= 0.75 ? "up" : "down",
      changeGood: accuracy >= 0.75,
      vsTarget: `${item.correct}/${item.total}`,
    });
  });

  const answerRows = answersTable.map((item) =>
    row({
      email: item.email ?? "",
      sessionId: item.sessionId,
      examId: item.examId,
      questionId: item.questionId,
      position: item.position,
      selected: item.selected,
      correctAnswer: item.correct,
      status: item.selected === item.correct ? "On track" : "Off track",
      trend: item.selected === item.correct ? "Up" : "Down",
      mode: "Single",
      assignee: "Unassigned",
      period: item.questionId,
      value: String(item.selected),
      change: String(item.correct),
      changeDir: item.selected === item.correct ? "up" : "down",
      changeGood: item.selected === item.correct,
      vsTarget: item.selected === item.correct ? "Correct" : "Wrong",
    }),
  );

  const uploadRows = uploadsTable.map((item) =>
    row({
      createdAt: formatDate(item.createdAt),
      email: item.email ?? "",
      name: item.name,
      size: formatBytes(item.size),
      contentType: item.contentType ?? "",
      key: item.key,
      url: item.url ?? "",
      status: "On track",
      mode: "Single",
      assignee: "Unassigned",
      period: formatDate(item.createdAt),
      value: item.name,
      change: formatBytes(item.size),
      vsTarget: item.contentType ?? "",
    }),
  );

  const feedbackRows = feedbackTable.map((item) =>
    row({
      createdAt: formatDate(item.createdAt),
      email: item.email ?? "",
      examId: item.examId,
      questionId: item.questionId,
      issueType: item.issueType,
      reportStatus: item.reportStatus,
      note: item.note,
      selectedAnswer: item.selectedAnswer ?? "",
      status: openStatus(item.reportStatus),
      trend: item.reportStatus === "open" ? "Down" : "Up",
      mode: "Multi-select",
      assignee: "Content",
      period: formatDate(item.createdAt),
      value: item.issueType,
      change: item.reportStatus,
      changeDir: item.reportStatus === "open" ? "down" : "up",
      changeGood: item.reportStatus !== "open",
      vsTarget: item.questionId,
    }),
  );

  const aiRows = aiUsageTable.map((item) =>
    row({
      createdAt: formatDate(item.createdAt),
      email: item.email ?? "",
      model: item.model,
      kind: item.kind ?? "",
      examId: item.examId ?? "",
      threadId: item.threadId ?? "",
      promptTokens: item.promptTokens,
      completionTokens: item.completionTokens,
      cost: money.format(item.estimatedCostUsd),
      billingPeriod: formatDate(item.billingPeriodStart),
      status: item.estimatedCostUsd <= 0.05 ? "On track" : "At risk",
      trend: item.estimatedCostUsd <= 0.05 ? "Up" : "Down",
      mode: "Single",
      assignee: "Ops",
      period: formatDate(item.createdAt),
      value: item.model,
      change: money.format(item.estimatedCostUsd),
      changeDir: item.estimatedCostUsd <= 0.05 ? "up" : "down",
      changeGood: item.estimatedCostUsd <= 0.05,
      vsTarget: `${item.promptTokens + item.completionTokens} tokens`,
    }),
  );

  const questionBankRows = exams.map((exam, index) =>
    row({
      slug: exam.slug,
      title: exam.title,
      role: exam.role,
      r2Key: `qbanks/v1/${exam.slug}/all.json`,
      questions: questionCounts[index] ?? 0,
      status: (questionCounts[index] ?? 0) > 0 ? "On track" : "Off track",
      mode: "Single",
      assignee: "Content",
      period: exam.slug,
      value: exam.title,
      change: number.format(questionCounts[index] ?? 0),
      changeDir: (questionCounts[index] ?? 0) > 0 ? "up" : "down",
      changeGood: (questionCounts[index] ?? 0) > 0,
      vsTarget: exam.role,
    }),
  );

  const analyticsRows = analyticsTable.map((item) =>
    row({
      createdAt: formatDate(item.createdAt),
      name: item.name,
      email: item.email ?? "",
      path: item.path ?? "",
      country: item.country ?? "",
      referrer: item.referrer ?? "",
      metadata: item.metadata ?? "",
      status: "On track",
      mode: "Single",
      assignee: "Ops",
      period: formatDate(item.createdAt),
      value: item.name,
      change: item.path ?? "",
      vsTarget: item.country ?? "",
    }),
  );

  const cloudflareRows = [
    { binding: "DRKARD_DB", service: "D1", ready: Boolean(env.DRKARD_DB) },
    { binding: "DRKARD_QBANKS", service: "R2 question banks", ready: Boolean(env.DRKARD_QBANKS) },
    { binding: "DRKARD_UPLOADS", service: "R2 uploads", ready: Boolean(env.DRKARD_UPLOADS) },
    { binding: "DRKARD_LIMITS", service: "KV quotas", ready: Boolean(env.DRKARD_LIMITS) },
  ].map((item) =>
    row({
      binding: item.binding,
      service: item.service,
      ready: item.ready ? "Connected" : "Missing",
      status: item.ready ? "On track" : "Off track",
      mode: "Single",
      assignee: "Ops",
      period: item.binding,
      value: item.service,
      change: item.ready ? "Connected" : "Missing",
      changeDir: item.ready ? "up" : "down",
      changeGood: item.ready,
      vsTarget: "Required",
    }),
  );

  const retentionRows = retentionTable.map((item) =>
    row({
      email: item.email ?? "",
      clerkUserId: item.clerkUserId,
      sessions: item.sessions,
      questions: item.questions,
      accuracy: `${Math.round((item.accuracy ?? 0) * 100)}%`,
      lastSessionAt: formatDate(item.lastSessionAt),
      status: item.sessions > 1 ? "On track" : "At risk",
      trend: item.sessions > 1 ? "Up" : "Down",
      mode: "Single",
      assignee: "Support",
      period: item.email ?? item.clerkUserId,
      value: number.format(item.sessions),
      change: number.format(item.questions),
      changeDir: item.sessions > 1 ? "up" : "down",
      changeGood: item.sessions > 1,
      vsTarget: formatDate(item.lastSessionAt),
    }),
  );

  const userColumns: HqColumn[] = [
    { field: "email", headerName: "Email", minWidth: 260, pinned: "left", editable: false },
    { field: "name", headerName: "Name", minWidth: 180 },
    { field: "plan", headerName: "Plan", minWidth: 120 },
    { field: "subscription", headerName: "Subscription", minWidth: 150 },
    { field: "createdAt", headerName: "Created", minWidth: 190, editable: false },
    { field: "updatedAt", headerName: "Updated", minWidth: 190, editable: false },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
    { field: "assignee", headerName: "Owner", minWidth: 150, kind: "assignee" },
  ];

  const subscriptionColumns: HqColumn[] = [
    { field: "email", headerName: "Email", minWidth: 260, pinned: "left", editable: false },
    { field: "plan", headerName: "Plan", minWidth: 120 },
    { field: "subscription", headerName: "Subscription", minWidth: 150 },
    { field: "currentPeriodEnd", headerName: "Period End", minWidth: 190, editable: false },
    { field: "stripeCustomerId", headerName: "Stripe Customer", minWidth: 220, editable: false },
    { field: "updatedAt", headerName: "Updated", minWidth: 190, editable: false },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
    { field: "assignee", headerName: "Owner", minWidth: 150, kind: "assignee" },
  ];

  const sessionColumns: HqColumn[] = [
    { field: "createdAt", headerName: "Created", minWidth: 190, pinned: "left", editable: false },
    { field: "email", headerName: "User", minWidth: 240, editable: false },
    { field: "title", headerName: "Exam", minWidth: 220 },
    { field: "total", headerName: "Total", minWidth: 110 },
    { field: "correct", headerName: "Correct", minWidth: 110 },
    { field: "accuracy", headerName: "Accuracy", minWidth: 130 },
    { field: "duration", headerName: "Duration", minWidth: 120 },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
    { field: "trend", headerName: "Trend", minWidth: 130, kind: "trend" },
  ];

  const answerColumns: HqColumn[] = [
    { field: "questionId", headerName: "Question", minWidth: 260, pinned: "left", editable: false },
    { field: "email", headerName: "User", minWidth: 240, editable: false },
    { field: "examId", headerName: "Exam", minWidth: 160 },
    { field: "position", headerName: "Position", minWidth: 120 },
    { field: "selected", headerName: "Selected", minWidth: 120 },
    { field: "correctAnswer", headerName: "Correct", minWidth: 120 },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
  ];

  const uploadColumns: HqColumn[] = [
    { field: "createdAt", headerName: "Created", minWidth: 190, pinned: "left", editable: false },
    { field: "name", headerName: "Name", minWidth: 260 },
    { field: "email", headerName: "User", minWidth: 240, editable: false },
    { field: "size", headerName: "Size", minWidth: 110 },
    { field: "contentType", headerName: "Type", minWidth: 180 },
    { field: "key", headerName: "R2 Key", minWidth: 320, editable: false },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
  ];

  const feedbackColumns: HqColumn[] = [
    { field: "createdAt", headerName: "Created", minWidth: 190, pinned: "left", editable: false },
    { field: "issueType", headerName: "Issue", minWidth: 170 },
    { field: "reportStatus", headerName: "Report State", minWidth: 150 },
    { field: "email", headerName: "User", minWidth: 240, editable: false },
    { field: "examId", headerName: "Exam", minWidth: 160 },
    { field: "questionId", headerName: "Question", minWidth: 240 },
    { field: "note", headerName: "Note", minWidth: 360 },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
    { field: "assignee", headerName: "Owner", minWidth: 150, kind: "assignee" },
  ];

  const aiColumns: HqColumn[] = [
    { field: "createdAt", headerName: "Created", minWidth: 190, pinned: "left", editable: false },
    { field: "email", headerName: "User", minWidth: 240, editable: false },
    { field: "model", headerName: "Model", minWidth: 220 },
    { field: "kind", headerName: "Kind", minWidth: 150 },
    { field: "promptTokens", headerName: "Prompt", minWidth: 120 },
    { field: "completionTokens", headerName: "Completion", minWidth: 140 },
    { field: "cost", headerName: "Cost", minWidth: 120 },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
  ];

  const questionBankColumns: HqColumn[] = [
    { field: "slug", headerName: "Slug", minWidth: 220, pinned: "left", editable: false },
    { field: "title", headerName: "Exam", minWidth: 260 },
    { field: "role", headerName: "Role", minWidth: 160 },
    { field: "questions", headerName: "Questions", minWidth: 140 },
    { field: "r2Key", headerName: "R2 Key", minWidth: 320, editable: false },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
  ];

  const analyticsColumns: HqColumn[] = [
    { field: "createdAt", headerName: "Created", minWidth: 190, pinned: "left", editable: false },
    { field: "name", headerName: "Event", minWidth: 220 },
    { field: "email", headerName: "User", minWidth: 240, editable: false },
    { field: "path", headerName: "Path", minWidth: 240 },
    { field: "country", headerName: "Country", minWidth: 120 },
    { field: "referrer", headerName: "Referrer", minWidth: 260 },
    { field: "metadata", headerName: "Metadata", minWidth: 360 },
  ];

  const cloudflareColumns: HqColumn[] = [
    { field: "binding", headerName: "Binding", minWidth: 220, pinned: "left", editable: false },
    { field: "service", headerName: "Service", minWidth: 240 },
    { field: "ready", headerName: "Ready", minWidth: 160 },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
    { field: "assignee", headerName: "Owner", minWidth: 150, kind: "assignee" },
  ];

  const retentionColumns: HqColumn[] = [
    { field: "email", headerName: "User", minWidth: 260, pinned: "left", editable: false },
    { field: "sessions", headerName: "Sessions", minWidth: 130 },
    { field: "questions", headerName: "Questions", minWidth: 140 },
    { field: "accuracy", headerName: "Accuracy", minWidth: 130 },
    { field: "lastSessionAt", headerName: "Last Session", minWidth: 190, editable: false },
    { field: "status", headerName: "Status", minWidth: 150, kind: "status" },
    { field: "trend", headerName: "Trend", minWidth: 130, kind: "trend" },
    { field: "assignee", headerName: "Owner", minWidth: 150, kind: "assignee" },
  ];

  const metrics: HqMetric[] = [
    metricFromSeries({
      id: "users",
      title: "Users",
      unit: "Total accounts",
      value: compact.format(userCount?.value ?? 0),
      category: "Growth",
      icon: "UserPlus",
      ownerIndex: 0,
      series: userSeries,
      targetValue: 100,
      targetLabel: "First 100 users",
      positiveIsGood: true,
      format: (value) => number.format(Math.round(value)),
      rows: userRows,
      columns: userColumns,
    }),
    metricFromSeries({
      id: "pro",
      title: "Pro Subscriptions",
      unit: "Active, trialing, or past due",
      value: compact.format(proCount?.value ?? 0),
      category: "Revenue",
      icon: "DollarSign",
      ownerIndex: 1,
      series: proSeries,
      targetValue: 10,
      targetLabel: "First 10 Pro",
      positiveIsGood: true,
      format: (value) => number.format(Math.round(value)),
      rows: subscriptionRows,
      columns: subscriptionColumns,
    }),
    metricFromSeries({
      id: "sessions",
      title: "Practice Sessions",
      unit: "Last 30 days",
      value: compact.format(sessions30?.value ?? 0),
      category: "Learning",
      icon: "Activity",
      ownerIndex: 2,
      series: sessionSeries,
      targetValue: 100,
      targetLabel: "Weekly practice target",
      positiveIsGood: true,
      format: (value) => number.format(Math.round(value)),
      rows: sessionRows,
      columns: sessionColumns,
    }),
    metricFromSeries({
      id: "questions",
      title: "Questions Answered",
      unit: "Last 30 days",
      value: compact.format(questions30?.value ?? 0),
      category: "Learning",
      icon: "FileText",
      ownerIndex: 3,
      series: questionSeries,
      targetValue: 1000,
      targetLabel: "Weekly answer target",
      positiveIsGood: true,
      format: (value) => compact.format(Math.round(value)),
      rows: answerRows,
      columns: answerColumns,
    }),
    metricFromSeries({
      id: "score",
      title: "Average Score",
      unit: "Practice accuracy",
      value: `${Math.round((avgCorrect30?.value ?? 0) * 100)}%`,
      category: "Quality",
      icon: "TargetIcon",
      ownerIndex: 4,
      series: scoreSeries,
      targetValue: 0.75,
      targetLabel: "75% accuracy",
      positiveIsGood: true,
      format: (value) => `${Math.round(value * 100)}%`,
      rows: sessionRows,
      columns: sessionColumns,
    }),
    metricFromSeries({
      id: "uploads",
      title: "Uploads",
      unit: "Files, notes, and links",
      value: compact.format(uploads30?.value ?? 0),
      category: "Content",
      icon: "FileText",
      ownerIndex: 5,
      series: uploadSeries,
      targetValue: 50,
      targetLabel: "Weekly upload target",
      positiveIsGood: true,
      format: (value) => number.format(Math.round(value)),
      rows: uploadRows,
      columns: uploadColumns,
    }),
    metricFromSeries({
      id: "reports",
      title: "Open Reports",
      unit: "Question issues to fix",
      value: compact.format(openFeedback?.value ?? 0),
      category: "Quality",
      icon: "Star",
      ownerIndex: 0,
      series: feedbackSeries,
      targetValue: 5,
      targetLabel: "Keep under 5",
      positiveIsGood: false,
      format: (value) => number.format(Math.round(value)),
      rows: feedbackRows,
      columns: feedbackColumns,
    }),
    metricFromSeries({
      id: "ai",
      title: "AI Usage",
      unit: `${number.format(aiMonth?.requests ?? 0)} requests this month`,
      value: money.format(aiMonth?.usedUsd ?? 0),
      category: "AI",
      icon: "Gauge",
      ownerIndex: 1,
      series: aiCostSeries,
      targetValue: 2,
      targetLabel: "$2 budget",
      positiveIsGood: false,
      format: (value) => money.format(value),
      rows: aiRows,
      columns: aiColumns,
    }),
    metricFromSeries({
      id: "question-bank",
      title: "Question Bank",
      unit: `${number.format(exams.length)} exams in Cloudflare R2`,
      value: compact.format(totalBankQuestions),
      category: "Content",
      icon: "Hexagon",
      ownerIndex: 2,
      series: flatSeries(totalBankQuestions),
      targetValue: 2_000_000,
      targetLabel: "2M question target",
      positiveIsGood: true,
      format: (value) => compact.format(Math.round(value)),
      rows: questionBankRows,
      columns: questionBankColumns,
    }),
    metricFromSeries({
      id: "analytics",
      title: "Goal Events",
      unit: "DrKard goals only",
      value: compact.format(eventCount30),
      category: "Analytics",
      icon: "TrendingUp",
      ownerIndex: 3,
      series: eventSeries,
      targetValue: 100,
      targetLabel: "Weekly event target",
      positiveIsGood: true,
      format: (value) => number.format(Math.round(value)),
      rows: analyticsRows,
      columns: analyticsColumns,
    }),
    metricFromSeries({
      id: "cloudflare",
      title: "Cloudflare Bindings",
      unit: "D1, R2 qbanks, R2 uploads, KV",
      value: `${cloudflareReady}/4`,
      category: "Operations",
      icon: "LayoutDashboard",
      ownerIndex: 4,
      series: flatSeries(cloudflareReady),
      targetValue: 4,
      targetLabel: "Production ready",
      positiveIsGood: true,
      format: (value) => `${Math.round(value)}/4`,
      rows: cloudflareRows,
      columns: cloudflareColumns,
    }),
    metricFromSeries({
      id: "retention",
      title: "Retention Loop",
      unit: "Repeat learning signal",
      value: compact.format(sessions30?.value ?? 0),
      category: "Retention",
      icon: "Repeat",
      ownerIndex: 5,
      series: sessionSeries,
      targetValue: 100,
      targetLabel: "Weekly repeat use",
      positiveIsGood: true,
      format: (value) => number.format(Math.round(value)),
      rows: retentionRows,
      columns: retentionColumns,
    }),
  ];

  return <HqDashboard metrics={metrics} />;
}
