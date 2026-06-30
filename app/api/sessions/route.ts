import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import {
  assertQuestionQuota,
  cloudflareEnv,
  createId,
  incrementQuestionUsage,
  json,
  recordEvent,
  run,
} from "@/lib/cloudflare-store";

type Answer = { questionId: string; selected: number; correct: boolean };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    return json({ error: "Sign in to save practice sessions." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    examId?: unknown;
    title?: unknown;
    durationSec?: unknown;
    answers?: unknown;
  } | null;
  const answers = Array.isArray(body?.answers)
    ? body.answers.filter((answer): answer is Answer => {
        const row = answer as Partial<Answer>;
        return typeof row.questionId === "string" && typeof row.selected === "number" && typeof row.correct === "boolean";
      })
    : [];
  const examId = typeof body?.examId === "string" ? body.examId : "";
  if (!examId || !answers.length) return json({ error: "Expected examId and answers." }, { status: 400 });

  const quotaError = await assertQuestionQuota(session.userId, answers.length);
  if (quotaError) return json({ error: quotaError, code: "question_limit" }, { status: 403 });

  const env = await cloudflareEnv();
  const now = Date.now();
  const sessionId = createId("sess");
  const correct = answers.filter((answer) => answer.correct).length;
  const title = typeof body?.title === "string" ? body.title.slice(0, 120) : "Practice session";
  const durationSec = typeof body?.durationSec === "number" ? body.durationSec : 0;

  await run(
    env.DRKARD_DB,
    "insert into practice_sessions (id, clerk_user_id, exam_id, title, total, correct, duration_sec, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    sessionId,
    session.userId,
    examId,
    title,
    answers.length,
    correct,
    durationSec,
    now,
  );

  for (let position = 0; position < answers.length; position++) {
    const answer = answers[position];
    await run(
      env.DRKARD_DB,
      "insert into session_answers (id, clerk_user_id, session_id, exam_id, question_id, position, selected, correct) values (?, ?, ?, ?, ?, ?, ?, ?)",
      createId("ans"),
      session.userId,
      sessionId,
      examId,
      answer.questionId,
      position,
      answer.selected,
      answer.correct ? 1 : 0,
    );
    const status = answer.selected < 0 ? "used" : answer.correct ? "correct" : "incorrect";
    await run(
      env.DRKARD_DB,
      `insert into question_progress (clerk_user_id, exam_id, question_id, status, flagged, last_selected, attempts, updated_at)
       values (?, ?, ?, ?, 0, ?, 1, ?)
       on conflict(clerk_user_id, question_id) do update set
         status = excluded.status,
         last_selected = excluded.last_selected,
         attempts = question_progress.attempts + 1,
         updated_at = excluded.updated_at`,
      session.userId,
      examId,
      answer.questionId,
      status,
      answer.selected,
      now,
    );
  }

  await incrementQuestionUsage(session.userId, answers.length);
  await recordEvent({
    name: "practice_session_completed",
    clerkUserId: session.userId,
    path: "/api/sessions",
    metadata: { examId, total: answers.length, correct },
  });
  return json({ id: sessionId });
}
