import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { estimateOpenRouterCostUsd, monthStartUtcMs } from "@/lib/ai-pricing";
import { cloudflareEnv, createId, getEntitlements, recordEvent, run } from "@/lib/cloudflare-store";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0 &&
    candidate.content.length <= 4000
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    return NextResponse.json({ error: "Sign in to use the AI tutor." }, { status: 401 });
  }

  const entitlements = await getEntitlements(session.userId);
  if (!entitlements.isPro) {
    return NextResponse.json(
      {
        error: "AI assistant is a Pro feature. Upgrade to ask questions.",
        code: "pro_required",
      },
      { status: 403 },
    );
  }
  if (!entitlements.aiAllowed) {
    return NextResponse.json(
      {
        error: `Monthly AI budget reached ($${entitlements.aiBudgetUsd?.toFixed(2)}). Resets on ${entitlements.aiResetsAt ? new Date(entitlements.aiResetsAt).toLocaleDateString() : "the 1st"}.`,
        code: "ai_budget_exceeded",
        aiUsedUsd: entitlements.aiUsedUsd,
        aiBudgetUsd: entitlements.aiBudgetUsd,
        aiResetsAt: entitlements.aiResetsAt,
      },
      { status: 429 },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured." }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    system?: unknown;
    messages?: unknown;
    examId?: unknown;
    threadId?: unknown;
    kind?: unknown;
  } | null;
  const messages = Array.isArray(body?.messages)
    ? body.messages.filter(isMessage).slice(-12)
    : [];
  const system =
    typeof body?.system === "string" && body.system.length <= 4000
      ? body.system
      : "You are DrKard's medical study assistant. Be concise, accurate, and exam-focused.";

  if (!messages.length || messages[0]?.role !== "user") {
    return NextResponse.json({ error: "A user message is required." }, { status: 400 });
  }

  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "DrKard",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });

  const data = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_cost?: number };
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? "OpenRouter request failed." },
      { status: response.status },
    );
  }

  const promptTokens = data?.usage?.prompt_tokens ?? 0;
  const completionTokens = data?.usage?.completion_tokens ?? 0;
  const estimatedCostUsd =
    typeof data?.usage?.total_cost === "number"
      ? data.usage.total_cost
      : estimateOpenRouterCostUsd(model, promptTokens, completionTokens);

  const env = await cloudflareEnv();
  await run(
    env.DRKARD_DB,
    `insert into ai_usage_events
      (id, clerk_user_id, exam_id, thread_id, kind, model, prompt_tokens, completion_tokens, estimated_cost_usd, billing_period_start, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    createId("aiuse"),
    session.userId,
    typeof body?.examId === "string" ? body.examId : null,
    typeof body?.threadId === "string" ? body.threadId : null,
    typeof body?.kind === "string" ? body.kind : null,
    model,
    promptTokens,
    completionTokens,
    estimatedCostUsd,
    monthStartUtcMs(),
    Date.now(),
  );

  const updated = await getEntitlements(session.userId);
  await recordEvent({
    name: "ai_message_sent",
    clerkUserId: session.userId,
    path: "/api/chat",
    metadata: {
      examId: typeof body?.examId === "string" ? body.examId : undefined,
      kind: typeof body?.kind === "string" ? body.kind : undefined,
      estimatedCostUsd,
      model,
    },
  });

  return NextResponse.json({
    text: data?.choices?.[0]?.message?.content ?? "",
    usage: {
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      aiUsedUsd: updated.aiUsedUsd,
      aiRemainingUsd: updated.aiRemainingUsd,
      aiBudgetUsd: updated.aiBudgetUsd,
    },
  });
}
