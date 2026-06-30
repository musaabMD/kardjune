import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { cloudflareEnv, createId, run } from "@/lib/cloudflare-store";

export const runtime = "edge";

const HQ_OWNER_EMAIL = "mousab.r@gmail.com";

type QuestionPayload = {
  questions?: unknown;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function assertOwner() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  return email === HQ_OWNER_EMAIL;
}

export async function POST(req: NextRequest) {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);

  const body = (await req.json().catch(() => null)) as {
    slug?: unknown;
    title?: unknown;
    role?: unknown;
    questions?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const role = typeof body?.role === "string" && body.role.trim() ? body.role.trim() : "Exam";
  const slug = slugify(typeof body?.slug === "string" && body.slug.trim() ? body.slug : title);
  const questions = (body as QuestionPayload | null)?.questions;

  if (!title) return jsonError("Exam title is required.", 400);
  if (!slug) return jsonError("Exam slug is required.", 400);
  if (!Array.isArray(questions)) return jsonError("Questions must be a JSON array.", 400);

  const env = await cloudflareEnv();
  if (!env.DRKARD_DB) return jsonError("DRKARD_DB binding is not configured.", 500);
  if (!env.DRKARD_QBANKS) return jsonError("DRKARD_QBANKS R2 binding is not configured.", 500);

  const id = createId("exam");
  await run(
    env.DRKARD_DB,
    `insert into exams (id, slug, title, role)
     values (?, ?, ?, ?)
     on conflict(slug) do update set title = excluded.title, role = excluded.role`,
    id,
    slug,
    title,
    role,
  );

  const key = `qbanks/v1/${slug}/all.json`;
  const payload = JSON.stringify({ questions }, null, 2);
  await env.DRKARD_QBANKS.put(key, payload, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: {
      title,
      role,
      slug,
      updatedBy: HQ_OWNER_EMAIL,
      questionCount: String(questions.length),
    },
  });

  return NextResponse.json({
    slug,
    title,
    role,
    key,
    questionCount: questions.length,
  });
}
