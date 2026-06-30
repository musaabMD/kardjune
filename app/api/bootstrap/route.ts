import { auth } from "@clerk/nextjs/server";
import { getEntitlements, json, listExams } from "@/lib/cloudflare-store";

export async function GET() {
  const session = await auth();
  const [exams, entitlements] = await Promise.all([
    listExams(),
    getEntitlements(session.userId),
  ]);

  return json({ exams, entitlements });
}
