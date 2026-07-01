export const LST_STATUSES = ["Backlog", "Todo", "In Progress", "Testing", "Done"] as const;
export const LST_TYPES = ["Marketing", "Content", "Coding", "Cloudflare", "Admin", "Growth", "Automation"] as const;

export type LstStatus = (typeof LST_STATUSES)[number];
export type LstType = (typeof LST_TYPES)[number];

export type LstSubtask = {
  id: string;
  label: string;
  done: boolean;
};

export type LstTask = {
  id: string;
  title: string;
  type: LstType;
  status: LstStatus;
  description: string;
  subtasks: LstSubtask[];
  tags: string[];
  doneAt: number | null;
  cloudflareUrl: string;
  publicUrl: string;
  locationUrl: string;
  notes: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

type LstTaskRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  subtasks: string | null;
  tags: string | null;
  doneAt: number | null;
  cloudflareUrl: string | null;
  publicUrl: string | null;
  locationUrl: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type LstTaskInput = {
  id?: string;
  title: string;
  type?: string;
  status?: string;
  description?: string;
  subtasks?: LstSubtask[];
  tags?: string[];
  doneAt?: number | null;
  cloudflareUrl?: string;
  publicUrl?: string;
  locationUrl?: string;
  notes?: string;
  sortOrder?: number;
};

const now = Date.now();

const seedTasks: LstTask[] = [
  {
    id: "lst-board-simple-lists",
    title: "Simplify LST board into task lists",
    type: "Coding",
    status: "Testing",
    description: "Replace detailed Kanban cards with one-line task items, type tabs, fixed status columns, and a details panel.",
    subtasks: [
      { id: "columns", label: "Use Backlog, Todo, In Progress, Testing, Done columns", done: true },
      { id: "tabs", label: "Filter by task type tabs", done: true },
      { id: "details", label: "Move descriptions, links, tags, and subtasks into the selected-task panel", done: true },
    ],
    tags: ["coding", "lst", "admin"],
    doneAt: null,
    cloudflareUrl: "",
    publicUrl: "https://lst.drkard.com",
    locationUrl: "/lst",
    notes: "Every future DrKard task should be recorded here with a type and tags.",
    sortOrder: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lst-cloudflare-domain",
    title: "Route lst.drkard.com to LST",
    type: "Cloudflare",
    status: "Done",
    description: "Add the Cloudflare custom domain route and host rewrite so lst.drkard.com opens the private LST board.",
    subtasks: [
      { id: "wrangler", label: "Add lst.drkard.com to wrangler routes", done: true },
      { id: "middleware", label: "Rewrite lst.drkard.com root to /lst", done: true },
    ],
    tags: ["cloudflare", "routing", "private"],
    doneAt: Date.UTC(2026, 6, 1),
    cloudflareUrl: "https://dash.cloudflare.com",
    publicUrl: "https://lst.drkard.com",
    locationUrl: "wrangler.jsonc",
    notes: "Access remains limited to mousab.r@gmail.com.",
    sortOrder: 20,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lst-growth-tracking",
    title: "Track signup and activation growth weekly",
    type: "Growth",
    status: "Backlog",
    description: "Review HQ Growth metrics and add one LST task for any funnel change or experiment.",
    subtasks: [
      { id: "hq", label: "Check Users and Goal Events in HQ", done: false },
      { id: "lst", label: "Log follow-up tasks here when growth work is needed", done: false },
    ],
    tags: ["growth", "hq"],
    doneAt: null,
    cloudflareUrl: "https://hq.drkard.com",
    publicUrl: "https://lst.drkard.com",
    locationUrl: "/hq",
    notes: "Growth tab on LST is for acquisition, activation, and retention experiments.",
    sortOrder: 25,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lst-automation-hooks",
    title: "Document automation triggers for DrKard",
    type: "Automation",
    status: "Backlog",
    description: "List webhooks, cron jobs, and agent workflows that should run without manual steps.",
    subtasks: [
      { id: "stripe", label: "Stripe webhook flows", done: false },
      { id: "clerk", label: "Clerk user sync", done: false },
    ],
    tags: ["automation", "ops"],
    doneAt: null,
    cloudflareUrl: "",
    publicUrl: "https://lst.drkard.com",
    locationUrl: "/lst",
    notes: "Automation tab is for recurring jobs and integrations.",
    sortOrder: 28,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lst-operating-note",
    title: "Keep LST task rules in markdown",
    type: "Admin",
    status: "Todo",
    description: "Document how agents should use the LST board before future DrKard work.",
    subtasks: [
      { id: "readme", label: "Create docs/lst-task-board.md", done: true },
      { id: "future", label: "Read the markdown before adding or changing LST features", done: false },
    ],
    tags: ["process", "docs"],
    doneAt: null,
    cloudflareUrl: "",
    publicUrl: "https://lst.drkard.com",
    locationUrl: "docs/lst-task-board.md",
    notes: "This keeps the board's purpose clear for future implementation work.",
    sortOrder: 30,
    createdAt: now,
    updatedAt: now,
  },
];

let ensurePromise: Promise<void> | null = null;

function statusOrDefault(value: string | null | undefined): LstStatus {
  return LST_STATUSES.includes(value as LstStatus) ? (value as LstStatus) : "Backlog";
}

function typeOrDefault(value: string | null | undefined): LstType {
  return LST_TYPES.includes(value as LstType) ? (value as LstType) : "Admin";
}

function parseJsonArray<T>(value: string | null | undefined, fallback: T[]) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function cleanSubtasks(value: unknown): LstSubtask[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const object = item && typeof item === "object" ? (item as Partial<LstSubtask>) : {};
      const label = typeof object.label === "string" ? object.label.trim() : "";
      if (!label) return null;
      return {
        id: typeof object.id === "string" && object.id ? object.id : `subtask-${index + 1}`,
        label,
        done: Boolean(object.done),
      };
    })
    .filter((item): item is LstSubtask => Boolean(item));
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function toTask(row: LstTaskRow): LstTask {
  return {
    id: row.id,
    title: row.title,
    type: typeOrDefault(row.type),
    status: statusOrDefault(row.status),
    description: row.description ?? "",
    subtasks: cleanSubtasks(parseJsonArray<LstSubtask>(row.subtasks, [])),
    tags: cleanTags(parseJsonArray<string>(row.tags, [])),
    doneAt: row.doneAt ?? null,
    cloudflareUrl: row.cloudflareUrl ?? "",
    publicUrl: row.publicUrl ?? "",
    locationUrl: row.locationUrl ?? "",
    notes: row.notes ?? "",
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
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

export async function ensureLstTasksTable(db: D1Database | undefined) {
  if (!db) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await run(
        db,
        `create table if not exists lst_tasks (
          id text primary key,
          title text not null,
          type text not null,
          status text not null,
          description text not null default '',
          subtasks text not null default '[]',
          tags text not null default '[]',
          done_at integer,
          cloudflare_url text not null default '',
          public_url text not null default '',
          location_url text not null default '',
          notes text not null default '',
          sort_order integer not null default 0,
          created_at integer not null default (unixepoch() * 1000),
          updated_at integer not null default (unixepoch() * 1000)
        )`,
      );
      await run(db, "create index if not exists lst_tasks_by_type_status on lst_tasks (type, status, sort_order)");
      await run(db, "create index if not exists lst_tasks_by_status on lst_tasks (status, sort_order)");

      const statement = db.prepare(
        `insert or ignore into lst_tasks
          (id, title, type, status, description, subtasks, tags, done_at, cloudflare_url, public_url, location_url, notes, sort_order, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      await db.batch(
        seedTasks.map((task) =>
          statement.bind(
            task.id,
            task.title,
            task.type,
            task.status,
            task.description,
            JSON.stringify(task.subtasks),
            JSON.stringify(task.tags),
            task.doneAt,
            task.cloudflareUrl,
            task.publicUrl,
            task.locationUrl,
            task.notes,
            task.sortOrder,
            task.createdAt,
            task.updatedAt,
          ),
        ),
      );
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
}

export async function listLstTasks(db: D1Database | undefined) {
  if (!db) return seedTasks;
  await ensureLstTasksTable(db);
  const rows = await all<LstTaskRow>(
    db,
    `select id, title, type, status, description, subtasks, tags, done_at as doneAt,
      cloudflare_url as cloudflareUrl, public_url as publicUrl, location_url as locationUrl,
      notes, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
     from lst_tasks
     order by sort_order asc, updated_at desc`,
  );
  return rows.map(toTask);
}

export async function getLstTask(db: D1Database | undefined, id: string) {
  if (!db) return seedTasks.find((task) => task.id === id) ?? null;
  await ensureLstTasksTable(db);
  const row = await first<LstTaskRow>(
    db,
    `select id, title, type, status, description, subtasks, tags, done_at as doneAt,
      cloudflare_url as cloudflareUrl, public_url as publicUrl, location_url as locationUrl,
      notes, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
     from lst_tasks
     where id = ?`,
    id,
  );
  return row ? toTask(row) : null;
}

export async function upsertLstTask(db: D1Database | undefined, input: LstTaskInput) {
  if (!db) throw new Error("DRKARD_DB binding is not configured.");
  await ensureLstTasksTable(db);

  const existing = input.id ? await getLstTask(db, input.id) : null;
  const timestamp = Date.now();
  const id = input.id || `lst_${timestamp.toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const title = input.title.trim();
  if (!title) throw new Error("Task title is required.");

  const task: LstTask = {
    id,
    title,
    type: typeOrDefault(input.type ?? existing?.type),
    status: statusOrDefault(input.status ?? existing?.status),
    description: input.description ?? existing?.description ?? "",
    subtasks: cleanSubtasks(input.subtasks ?? existing?.subtasks ?? []),
    tags: cleanTags(input.tags ?? existing?.tags ?? []),
    doneAt: input.doneAt === undefined ? existing?.doneAt ?? null : input.doneAt,
    cloudflareUrl: input.cloudflareUrl ?? existing?.cloudflareUrl ?? "",
    publicUrl: input.publicUrl ?? existing?.publicUrl ?? "",
    locationUrl: input.locationUrl ?? existing?.locationUrl ?? "",
    notes: input.notes ?? existing?.notes ?? "",
    sortOrder: Number(input.sortOrder ?? existing?.sortOrder ?? timestamp),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await run(
    db,
    `insert into lst_tasks
      (id, title, type, status, description, subtasks, tags, done_at, cloudflare_url, public_url, location_url, notes, sort_order, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(id) do update set
       title = excluded.title,
       type = excluded.type,
       status = excluded.status,
       description = excluded.description,
       subtasks = excluded.subtasks,
       tags = excluded.tags,
       done_at = excluded.done_at,
       cloudflare_url = excluded.cloudflare_url,
       public_url = excluded.public_url,
       location_url = excluded.location_url,
       notes = excluded.notes,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
    task.id,
    task.title,
    task.type,
    task.status,
    task.description,
    JSON.stringify(task.subtasks),
    JSON.stringify(task.tags),
    task.doneAt,
    task.cloudflareUrl,
    task.publicUrl,
    task.locationUrl,
    task.notes,
    task.sortOrder,
    task.createdAt,
    task.updatedAt,
  );

  return task;
}

export async function deleteLstTask(db: D1Database | undefined, id: string) {
  if (!db) throw new Error("DRKARD_DB binding is not configured.");
  await ensureLstTasksTable(db);
  await run(db, "delete from lst_tasks where id = ?", id);
}
