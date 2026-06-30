import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { cloudflareEnv, json, run } from "@/lib/cloudflare-store";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    return json({ error: "Sign in to update progress." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    examId?: unknown;
    questionId?: unknown;
    status?: unknown;
    flagged?: unknown;
  } | null;
  const examId = typeof body?.examId === "string" ? body.examId : "";
  const questionId = typeof body?.questionId === "string" ? body.questionId : "";
  if (!examId || !questionId) return json({ error: "Expected examId and questionId." }, { status: 400 });

  const status = typeof body?.status === "string" ? body.status : "unused";
  const flagged = typeof body?.flagged === "boolean" ? body.flagged : false;
  const env = await cloudflareEnv();
  await run(
    env.DRKARD_DB,
    `insert into question_progress (clerk_user_id, exam_id, question_id, status, flagged, last_selected, attempts, updated_at)
     values (?, ?, ?, ?, ?, -1, 0, ?)
     on conflict(clerk_user_id, question_id) do update set
       status = excluded.status,
       flagged = excluded.flagged,
       updated_at = excluded.updated_at`,
    session.userId,
    examId,
    questionId,
    status,
    flagged ? 1 : 0,
    Date.now(),
  );

  return json({ ok: true });
}
