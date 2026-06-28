import { NextRequest } from "next/server";
import { examBySlug, json, readQuestions } from "@/lib/cloudflare-store";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ examSlug: string }> }) {
  const { examSlug } = await params;
  const exam = await examBySlug(examSlug);
  if (!exam) return json({ error: "Exam not found." }, { status: 404 });

  const questions = await readQuestions(exam.slug);
  return json(
    { exam, questions },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
