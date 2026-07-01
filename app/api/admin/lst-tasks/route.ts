import { NextRequest, NextResponse } from "next/server";
import { cloudflareEnv } from "@/lib/cloudflare-store";
import { isHqOwner } from "@/lib/hq-admin";
import { deleteLstTask, listLstTasks, LST_STATUSES, LST_TYPES, upsertLstTask, type LstTaskInput } from "@/lib/lst-tasks";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function assertOwner() {
  return await isHqOwner();
}

async function payload() {
  const env = await cloudflareEnv();
  return {
    tasks: await listLstTasks(env.DRKARD_DB),
    statuses: LST_STATUSES,
    types: LST_TYPES,
  };
}

function parseInput(body: unknown): LstTaskInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Partial<LstTaskInput>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!title) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : undefined,
    title,
    type: typeof value.type === "string" ? value.type : undefined,
    status: typeof value.status === "string" ? value.status : undefined,
    description: typeof value.description === "string" ? value.description : undefined,
    subtasks: Array.isArray(value.subtasks) ? value.subtasks : undefined,
    tags: Array.isArray(value.tags) ? value.tags : undefined,
    doneAt: typeof value.doneAt === "number" || value.doneAt === null ? value.doneAt : undefined,
    cloudflareUrl: typeof value.cloudflareUrl === "string" ? value.cloudflareUrl : undefined,
    publicUrl: typeof value.publicUrl === "string" ? value.publicUrl : undefined,
    locationUrl: typeof value.locationUrl === "string" ? value.locationUrl : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined,
    sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : undefined,
  };
}

export async function GET() {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);
  return NextResponse.json(await payload());
}

export async function POST(req: NextRequest) {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);
  const input = parseInput(await req.json().catch(() => null));
  if (!input) return jsonError("Task title is required.", 400);
  const env = await cloudflareEnv();
  await upsertLstTask(env.DRKARD_DB, input);
  return NextResponse.json(await payload());
}

export async function PATCH(req: NextRequest) {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);
  const input = parseInput(await req.json().catch(() => null));
  if (!input?.id) return jsonError("Task id and title are required.", 400);
  const env = await cloudflareEnv();
  await upsertLstTask(env.DRKARD_DB, input);
  return NextResponse.json(await payload());
}

export async function DELETE(req: NextRequest) {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return jsonError("Task id is required.", 400);
  const env = await cloudflareEnv();
  await deleteLstTask(env.DRKARD_DB, id);
  return NextResponse.json(await payload());
}
