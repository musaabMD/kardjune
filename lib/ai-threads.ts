export type Msg = { role: "user" | "assistant"; content: string };

export type AIThreadItem = {
  id: string;
  type: string;
  title: string;
  messages: Msg[];
};

const KIND_LABELS: Record<string, string> = {
  ask: "Ask",
  explain: "Question",
  question: "Question",
  review: "Review",
  card: "Card",
  note: "Note",
};

export function kindLabel(kind: string) {
  return KIND_LABELS[kind.toLowerCase()] ?? kind;
}

export function parseAiThreadId(value: string | null | undefined): string | null {
  if (!value) return null;
  return value;
}

export function apiReply(data: unknown) {
  const payload = data as { text?: string; content?: Array<{ type?: string; text?: string }> };
  if (typeof payload?.text === "string") return payload.text.trim();
  return (payload?.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n")
    .trim();
}

export type ChatPostBody = {
  system?: string;
  messages: Msg[];
  examId?: string;
  threadId?: string;
  kind?: string;
};

export type ChatPostResult =
  | {
      ok: true;
      reply: string;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        estimatedCostUsd?: number;
        aiUsedUsd?: number | null;
        aiRemainingUsd?: number | null;
        aiBudgetUsd?: number | null;
      };
    }
  | {
      ok: false;
      error: string;
      code?: string;
      aiUsedUsd?: number | null;
      aiBudgetUsd?: number | null;
      aiResetsAt?: number | null;
    };

export async function postChat(body: ChatPostBody): Promise<ChatPostResult> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "Request failed.",
      code: typeof data.code === "string" ? data.code : undefined,
      aiUsedUsd: typeof data.aiUsedUsd === "number" ? data.aiUsedUsd : null,
      aiBudgetUsd: typeof data.aiBudgetUsd === "number" ? data.aiBudgetUsd : null,
      aiResetsAt: typeof data.aiResetsAt === "number" ? data.aiResetsAt : null,
    };
  }
  return {
    ok: true,
    reply: apiReply(data),
    usage: data.usage as Extract<ChatPostResult, { ok: true }>["usage"],
  };
}

export function chatFailureMessage(result: Extract<ChatPostResult, { ok: false }>) {
  if (result.code === "ai_budget_exceeded") return result.error;
  if (result.code === "pro_required") return "Upgrade to Pro to use the AI assistant.";
  return result.error;
}
