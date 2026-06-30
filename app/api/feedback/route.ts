import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { cloudflareEnv, createId, json, recordEvent, run } from "@/lib/cloudflare-store";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = (await req.json().catch(() => null)) as {
    examId?: unknown;
    questionId?: unknown;
    issueType?: unknown;
    note?: unknown;
    selectedAnswer?: unknown;
  } | null;
  const examId = typeof body?.examId === "string" ? body.examId : "";
  const questionId = typeof body?.questionId === "string" ? body.questionId : "";
  const issueType = typeof body?.issueType === "string" ? body.issueType.slice(0, 40) : "other";
  const note = typeof body?.note === "string" ? body.note.slice(0, 1200) : issueType;
  if (!examId || !questionId) return json({ error: "Expected examId and questionId." }, { status: 400 });

  const env = await cloudflareEnv();
  await run(
    env.DRKARD_DB,
    "insert into question_feedback (id, clerk_user_id, exam_id, question_id, issue_type, note, selected_answer, status, created_at) values (?, ?, ?, ?, ?, ?, ?, 'open', ?)",
    createId("feedback"),
    session.userId ?? "anonymous",
    examId,
    questionId,
    issueType,
    note,
    typeof body?.selectedAnswer === "number" ? body.selectedAnswer : null,
    Date.now(),
  );
  await recordEvent({
    name: "question_reported",
    clerkUserId: session.userId,
    path: "/api/feedback",
    metadata: { examId, questionId, issueType },
  });
  return json({ ok: true });
}
