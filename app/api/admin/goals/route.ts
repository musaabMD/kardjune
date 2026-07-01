import { NextRequest, NextResponse } from "next/server";
import { cloudflareEnv } from "@/lib/cloudflare-store";
import { HQ_GOAL_CATEGORIES } from "@/lib/hq-goals";
import { isHqOwner } from "@/lib/hq-admin";
import { deleteHqGoal, listD1Tables, listHqGoals, sourceCountForGoal, upsertHqGoal } from "@/lib/hq-goals-store";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function slugifyGoalName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}

async function assertOwner() {
  if (!(await isHqOwner())) return false;
  return true;
}

async function goalsPayload() {
  const env = await cloudflareEnv();
  const tables = await listD1Tables(env.DRKARD_DB);
  const goals = await listHqGoals(env.DRKARD_DB);
  const goalsWithCounts = await Promise.all(
    goals.map(async (goal) => ({
      ...goal,
      sourceCount: (await sourceCountForGoal(env.DRKARD_DB, goal, tables)) ?? undefined,
    })),
  );
  return { goals: goalsWithCounts, tables, categories: HQ_GOAL_CATEGORIES };
}

export async function GET() {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);
  return NextResponse.json(await goalsPayload());
}

export async function POST(req: NextRequest) {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    label?: unknown;
    category?: unknown;
    description?: unknown;
    sourceTable?: unknown;
    sourceColumn?: unknown;
    matchValue?: unknown;
    enabled?: unknown;
  } | null;

  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const name = slugifyGoalName(typeof body?.name === "string" && body.name.trim() ? body.name : label);
  const category = typeof body?.category === "string" ? body.category : "Analytics";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const sourceTable = typeof body?.sourceTable === "string" && body.sourceTable.trim() ? body.sourceTable.trim() : null;
  const sourceColumn = typeof body?.sourceColumn === "string" && body.sourceColumn.trim() ? body.sourceColumn.trim() : null;
  const matchValue = typeof body?.matchValue === "string" && body.matchValue.trim() ? body.matchValue.trim() : null;

  if (!name) return jsonError("Goal name is required.", 400);
  if (!label) return jsonError("Goal label is required.", 400);
  if (!description) return jsonError("Goal description is required.", 400);

  const env = await cloudflareEnv();
  await upsertHqGoal(env.DRKARD_DB, {
    name,
    label,
    category,
    description,
    sourceTable,
    sourceColumn,
    matchValue,
    enabled: body?.enabled !== false,
  });

  return NextResponse.json(await goalsPayload());
}

export async function PATCH(req: NextRequest) {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    label?: unknown;
    category?: unknown;
    description?: unknown;
    sourceTable?: unknown;
    sourceColumn?: unknown;
    matchValue?: unknown;
    enabled?: unknown;
  } | null;

  const name = typeof body?.name === "string" ? slugifyGoalName(body.name) : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const category = typeof body?.category === "string" ? body.category : "Analytics";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!name) return jsonError("Goal name is required.", 400);
  if (!label) return jsonError("Goal label is required.", 400);
  if (!description) return jsonError("Goal description is required.", 400);

  const env = await cloudflareEnv();
  await upsertHqGoal(env.DRKARD_DB, {
    name,
    label,
    category,
    description,
    sourceTable: typeof body?.sourceTable === "string" && body.sourceTable.trim() ? body.sourceTable.trim() : null,
    sourceColumn: typeof body?.sourceColumn === "string" && body.sourceColumn.trim() ? body.sourceColumn.trim() : null,
    matchValue: typeof body?.matchValue === "string" && body.matchValue.trim() ? body.matchValue.trim() : null,
    enabled: body?.enabled !== false,
  });

  return NextResponse.json(await goalsPayload());
}

export async function DELETE(req: NextRequest) {
  if (!(await assertOwner())) return jsonError("Unauthorized.", 401);

  const name = slugifyGoalName(req.nextUrl.searchParams.get("name") ?? "");
  if (!name) return jsonError("Goal name is required.", 400);

  const env = await cloudflareEnv();
  await deleteHqGoal(env.DRKARD_DB, name);
  return NextResponse.json(await goalsPayload());
}
