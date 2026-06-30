import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { cloudflareEnv, createId, first, json, run } from "@/lib/cloudflare-store";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    return json({ error: "Sign in to save AI history." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    threadId?: unknown;
    kind?: unknown;
    examId?: unknown;
    questionId?: unknown;
    title?: unknown;
    userMessage?: unknown;
    assistantMessage?: unknown;
  } | null;
  const userMessage = typeof body?.userMessage === "string" ? body.userMessage : "";
  const assistantMessage = typeof body?.assistantMessage === "string" ? body.assistantMessage : "";
  if (!assistantMessage) return json({ error: "assistantMessage is required." }, { status: 400 });

  const env = await cloudflareEnv();
  const now = Date.now();
  let threadId = typeof body?.threadId === "string" ? body.threadId : "";
  if (threadId) {
    const thread = await first<{ id: string }>(
      env.DRKARD_DB,
      "select id from ai_threads where id = ? and clerk_user_id = ?",
      threadId,
      session.userId,
    );
    if (!thread) return json({ error: "Thread not found." }, { status: 404 });
    await run(
      env.DRKARD_DB,
      "update ai_threads set message_count = message_count + 2, last_message_at = ? where id = ?",
      now,
      threadId,
    );
  } else {
    threadId = createId("thread");
    await run(
      env.DRKARD_DB,
      "insert into ai_threads (id, clerk_user_id, exam_id, question_id, kind, title, message_count, last_message_at, created_at) values (?, ?, ?, ?, ?, ?, 2, ?, ?)",
      threadId,
      session.userId,
      typeof body?.examId === "string" ? body.examId : null,
      typeof body?.questionId === "string" ? body.questionId : null,
      typeof body?.kind === "string" ? body.kind : "ask",
      typeof body?.title === "string" ? body.title.slice(0, 80) : "AI thread",
      now,
      now,
    );
  }

  await run(
    env.DRKARD_DB,
    "insert into ai_messages (id, thread_id, clerk_user_id, role, content, created_at) values (?, ?, ?, 'user', ?, ?)",
    createId("msg"),
    threadId,
    session.userId,
    userMessage.slice(0, 8000),
    now,
  );
  await run(
    env.DRKARD_DB,
    "insert into ai_messages (id, thread_id, clerk_user_id, role, content, created_at) values (?, ?, ?, 'assistant', ?, ?)",
    createId("msg"),
    threadId,
    session.userId,
    assistantMessage.slice(0, 12000),
    now + 1,
  );

  return json({ threadId });
}
