import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { examBySlug, json, readQuestions, recordEvent } from "@/lib/cloudflare-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ examSlug: string }> }) {
  const { examSlug } = await params;
  const exam = await examBySlug(examSlug);
  if (!exam) return json({ error: "Exam not found." }, { status: 404 });

  const questions = await readQuestions(exam.slug);
  const session = await auth();
  await recordEvent({
    name: "question_bank_loaded",
    clerkUserId: session.userId,
    path: `/api/banks/${exam.slug}`,
    metadata: { examId: exam.id, examSlug: exam.slug, count: questions.length },
  });
  return json(
    { exam, questions },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
