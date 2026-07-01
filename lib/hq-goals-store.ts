import { DRKARD_GOALS, HQ_GOAL_CATEGORIES, type HqGoalCategory } from "@/lib/hq-goals";

export type HqGoalRecord = {
  name: string;
  label: string;
  category: HqGoalCategory;
  description: string;
  sourceTable: string | null;
  sourceColumn: string | null;
  matchValue: string | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  sourceCount?: number;
};

export type HqTableColumn = {
  name: string;
  type: string;
};

export type HqTableInfo = {
  name: string;
  rowCount: number;
  columns: HqTableColumn[];
};

type HqGoalDbRow = {
  name: string;
  label: string;
  category: string;
  description: string;
  sourceTable: string | null;
  sourceColumn: string | null;
  matchValue: string | null;
  enabled: number;
  createdAt: number;
  updatedAt: number;
};

type TableNameRow = {
  name: string;
};

type CountRow = {
  value: number;
};

type ColumnRow = {
  name: string;
  type: string | null;
};

let ensurePromise: Promise<void> | null = null;

function categoryOrDefault(value: string | null | undefined): HqGoalCategory {
  return HQ_GOAL_CATEGORIES.includes(value as HqGoalCategory) ? (value as HqGoalCategory) : "Analytics";
}

function toGoal(row: HqGoalDbRow): HqGoalRecord {
  return {
    name: row.name,
    label: row.label,
    category: categoryOrDefault(row.category),
    description: row.description,
    sourceTable: row.sourceTable,
    sourceColumn: row.sourceColumn,
    matchValue: row.matchValue,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function isInternalTable(name: string) {
  return name.startsWith("sqlite_") || name.startsWith("_cf_") || name === "d1_migrations" || name === "hq_goals";
}

async function all<T>(db: D1Database | undefined, sql: string, ...binds: unknown[]) {
  if (!db) return [];
  const result = await db.prepare(sql).bind(...binds).all<T>();
  return result.results ?? [];
}

async function first<T>(db: D1Database | undefined, sql: string, ...binds: unknown[]) {
  if (!db) return null;
  return await db.prepare(sql).bind(...binds).first<T>();
}

async function run(db: D1Database | undefined, sql: string, ...binds: unknown[]) {
  if (!db) return null;
  return await db.prepare(sql).bind(...binds).run();
}

export async function ensureHqGoalsTable(db: D1Database | undefined) {
  if (!db) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await run(
        db,
        `create table if not exists hq_goals (
          name text primary key,
          label text not null,
          category text not null,
          description text not null,
          source_table text,
          source_column text,
          match_value text,
          enabled integer not null default 1,
          created_at integer not null default (unixepoch() * 1000),
          updated_at integer not null default (unixepoch() * 1000)
        )`,
      );
      await run(db, "create index if not exists hq_goals_by_enabled on hq_goals (enabled, category)");
      const now = Date.now();
      const statement = db.prepare(
        `insert or ignore into hq_goals
          (name, label, category, description, source_table, source_column, match_value, enabled, created_at, updated_at)
         values (?, ?, ?, ?, null, null, null, 1, ?, ?)`,
      );
      await db.batch(DRKARD_GOALS.map((goal) => statement.bind(goal.name, goal.label, goal.category, goal.description, now, now)));
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
}

export async function listHqGoals(db: D1Database | undefined) {
  if (!db) return DRKARD_GOALS.map((goal) => ({ ...goal, sourceTable: null, sourceColumn: null, matchValue: null, enabled: true, createdAt: 0, updatedAt: 0 }));
  await ensureHqGoalsTable(db);
  const rows = await all<HqGoalDbRow>(
    db,
    `select name, label, category, description,
      source_table as sourceTable, source_column as sourceColumn, match_value as matchValue,
      enabled, created_at as createdAt, updated_at as updatedAt
     from hq_goals
     order by enabled desc, category, label`,
  );
  return rows.map(toGoal);
}

export async function getActiveGoalNames(db: D1Database | undefined) {
  if (!db) return new Set(DRKARD_GOALS.map((goal) => goal.name));
  await ensureHqGoalsTable(db);
  const rows = await all<{ name: string }>(db, "select name from hq_goals where enabled = 1");
  return new Set(rows.map((row) => row.name));
}

export async function listD1Tables(db: D1Database | undefined): Promise<HqTableInfo[]> {
  if (!db) return [];
  const tableRows = await all<TableNameRow>(
    db,
    `select name
     from sqlite_schema
     where type = 'table'
     order by name`,
  );
  const tableNames = tableRows.map((row) => row.name).filter((name) => !isInternalTable(name));

  return Promise.all(
    tableNames.map(async (name) => {
      const quotedTable = quoteIdentifier(name);
      const [countRow, columnRows] = await Promise.all([
        first<CountRow>(db, `select count(*) as value from ${quotedTable}`),
        all<ColumnRow>(db, `select name, type from pragma_table_info(${quoteString(name)}) order by cid`),
      ]);
      return {
        name,
        rowCount: Number(countRow?.value ?? 0),
        columns: columnRows.map((column) => ({ name: column.name, type: column.type ?? "" })),
      };
    }),
  );
}

export async function sourceCountForGoal(db: D1Database | undefined, goal: HqGoalRecord, tables: HqTableInfo[]) {
  if (!db || !goal.sourceTable) return null;
  const table = tables.find((item) => item.name === goal.sourceTable);
  if (!table) return null;
  const quotedTable = quoteIdentifier(table.name);
  if (goal.sourceColumn && goal.matchValue) {
    const column = table.columns.find((item) => item.name === goal.sourceColumn);
    if (!column) return null;
    const row = await first<CountRow>(db, `select count(*) as value from ${quotedTable} where ${quoteIdentifier(column.name)} = ?`, goal.matchValue);
    return Number(row?.value ?? 0);
  }
  const row = await first<CountRow>(db, `select count(*) as value from ${quotedTable}`);
  return Number(row?.value ?? 0);
}

export async function upsertHqGoal(
  db: D1Database | undefined,
  input: {
    name: string;
    label: string;
    category: string;
    description: string;
    sourceTable?: string | null;
    sourceColumn?: string | null;
    matchValue?: string | null;
    enabled: boolean;
  },
) {
  if (!db) throw new Error("DRKARD_DB binding is not configured.");
  await ensureHqGoalsTable(db);
  const tables = await listD1Tables(db);
  const sourceTable = input.sourceTable && tables.some((table) => table.name === input.sourceTable) ? input.sourceTable : null;
  const table = sourceTable ? tables.find((item) => item.name === sourceTable) : null;
  const sourceColumn =
    table && input.sourceColumn && table.columns.some((column) => column.name === input.sourceColumn) ? input.sourceColumn : null;
  const now = Date.now();
  await run(
    db,
    `insert into hq_goals
      (name, label, category, description, source_table, source_column, match_value, enabled, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(name) do update set
       label = excluded.label,
       category = excluded.category,
       description = excluded.description,
       source_table = excluded.source_table,
       source_column = excluded.source_column,
       match_value = excluded.match_value,
       enabled = excluded.enabled,
       updated_at = excluded.updated_at`,
    input.name,
    input.label,
    categoryOrDefault(input.category),
    input.description,
    sourceTable,
    sourceColumn,
    input.matchValue || null,
    input.enabled ? 1 : 0,
    now,
    now,
  );
}

export async function deleteHqGoal(db: D1Database | undefined, name: string) {
  if (!db) throw new Error("DRKARD_DB binding is not configured.");
  await ensureHqGoalsTable(db);
  await run(db, "delete from hq_goals where name = ?", name);
}
