import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { all, cloudflareEnv, json } from "@/lib/cloudflare-store";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    return json({ sessions: [], progress: [], threads: [], messages: [] });
  }

  const examId = req.nextUrl.searchParams.get("examId");
  if (!examId) return json({ error: "Missing examId." }, { status: 400 });

  const env = await cloudflareEnv();
  const [sessions, progress, threads] = await Promise.all([
    all<{
      id: string;
      _creationTime: number;
      title: string;
      total: number;
      correct: number;
      durationSec: number;
    }>(
      env.DRKARD_DB,
      "select id, created_at as _creationTime, title, total, correct, duration_sec as durationSec from practice_sessions where clerk_user_id = ? and exam_id = ? order by created_at desc limit 20",
      session.userId,
      examId,
    ),
    all<{
      questionId: string;
      status: string;
      flagged: boolean;
      lastSelected: number;
      attempts: number;
    }>(
      env.DRKARD_DB,
      "select question_id as questionId, status, flagged, last_selected as lastSelected, attempts from question_progress where clerk_user_id = ? and exam_id = ? limit 5000",
      session.userId,
      examId,
    ),
    all<{
      _id: string;
      kind: string;
      title: string;
      messageCount: number;
      lastMessageAt: number;
    }>(
      env.DRKARD_DB,
      "select id as _id, kind, title, message_count as messageCount, last_message_at as lastMessageAt from ai_threads where clerk_user_id = ? and exam_id = ? order by last_message_at desc limit 50",
      session.userId,
      examId,
    ),
  ]);

  const threadIds = threads.map((thread: { _id: string }) => thread._id);
  const messages = threadIds.length && env.DRKARD_DB
    ? await all<{
        threadId: string;
        role: string;
        content: string;
      }>(
        env.DRKARD_DB,
        `select thread_id as threadId, role, content from ai_messages where clerk_user_id = ? and thread_id in (${threadIds.map(() => "?").join(",")}) order by created_at asc`,
        session.userId,
        ...threadIds,
      )
    : [];

  return json({
    sessions,
    progress: progress.map((row: { flagged: boolean }) => ({ ...row, flagged: Boolean(row.flagged) })),
    threads,
    messages,
  });
}
