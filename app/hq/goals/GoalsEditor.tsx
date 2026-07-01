"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database, Plus, Save, Search, Trash2 } from "lucide-react";
import type { HqGoalCategory } from "@/lib/hq-goals";
import type { HqGoalRecord, HqTableInfo } from "@/lib/hq-goals-store";

type GoalsPayload = {
  goals: HqGoalRecord[];
  tables: HqTableInfo[];
  categories: readonly HqGoalCategory[];
};

type Draft = {
  name: string;
  label: string;
  category: HqGoalCategory;
  description: string;
  sourceTable: string;
  sourceColumn: string;
  matchValue: string;
  enabled: boolean;
};

const emptyDraft: Draft = {
  name: "",
  label: "",
  category: "Analytics",
  description: "",
  sourceTable: "",
  sourceColumn: "",
  matchValue: "",
  enabled: true,
};

function titleFromTable(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function goalNameFromTable(value: string) {
  return `${value}_goal`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inputClass(extra = "") {
  return `h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${extra}`;
}

export default function GoalsEditor({ initialGoals, tables, categories }: { initialGoals: HqGoalRecord[]; tables: HqTableInfo[]; categories: readonly HqGoalCategory[] }) {
  const [payload, setPayload] = useState<GoalsPayload>({ goals: initialGoals, tables, categories });
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedTable = payload.tables.find((table) => table.name === draft.sourceTable) ?? null;
  const filteredGoals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payload.goals;
    return payload.goals.filter((goal) =>
      [goal.name, goal.label, goal.category, goal.description, goal.sourceTable ?? ""].some((value) => value.toLowerCase().includes(q)),
    );
  }, [payload.goals, query]);

  function updateDraft(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function selectTable(tableName: string) {
    const table = payload.tables.find((item) => item.name === tableName);
    if (!table) {
      updateDraft({ sourceTable: "", sourceColumn: "", matchValue: "" });
      return;
    }
    const label = titleFromTable(table.name);
    updateDraft({
      sourceTable: table.name,
      sourceColumn: "",
      matchValue: "",
      name: draft.name || goalNameFromTable(table.name),
      label: draft.label || label,
      description: draft.description || `Track progress from the ${label} table.`,
    });
  }

  async function submit(method: "POST" | "PATCH", goal?: HqGoalRecord) {
    const source = goal
      ? {
          name: goal.name,
          label: goal.label,
          category: goal.category,
          description: goal.description,
          sourceTable: goal.sourceTable ?? "",
          sourceColumn: goal.sourceColumn ?? "",
          matchValue: goal.matchValue ?? "",
          enabled: goal.enabled,
        }
      : draft;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/goals", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      });
      const data = (await res.json()) as GoalsPayload | { error?: string };
      if (!res.ok) throw new Error("error" in data && data.error ? data.error : "Could not save goal.");
      setPayload(data as GoalsPayload);
      if (!goal) setDraft(emptyDraft);
      setMessage("Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save goal.");
    } finally {
      setSaving(false);
    }
  }

  async function removeGoal(name: string) {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/goals?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = (await res.json()) as GoalsPayload | { error?: string };
      if (!res.ok) throw new Error("error" in data && data.error ? data.error : "Could not delete goal.");
      setPayload(data as GoalsPayload);
      setMessage("Deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete goal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="sticky top-0 z-10 border-b border-slate-300/80 bg-slate-100/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link href="/hq" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">Goal editor</h1>
                <p className="text-sm font-semibold text-slate-500">Create active goals from Cloudflare D1 tables.</p>
              </div>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass("pl-9")} placeholder="Search goals" />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase text-slate-900">Add goal</h2>
              <p className="text-xs font-semibold text-slate-500">Select a source table to autofill.</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Source table</span>
              <select value={draft.sourceTable} onChange={(event) => selectTable(event.target.value)} className={inputClass()}>
                <option value="">No table</option>
                {payload.tables.map((table) => (
                  <option key={table.name} value={table.name}>
                    {table.name} ({table.rowCount})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Filter column</span>
              <select
                value={draft.sourceColumn}
                onChange={(event) => updateDraft({ sourceColumn: event.target.value, matchValue: "" })}
                className={inputClass()}
                disabled={!selectedTable}
              >
                <option value="">Whole table</option>
                {selectedTable?.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name}
                    {column.type ? ` (${column.type})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Match value</span>
              <input
                value={draft.matchValue}
                onChange={(event) => updateDraft({ matchValue: event.target.value })}
                className={inputClass()}
                placeholder="Optional exact value"
                disabled={!draft.sourceColumn}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Goal name</span>
              <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} className={inputClass()} placeholder="signup_started" />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Label</span>
              <input value={draft.label} onChange={(event) => updateDraft({ label: event.target.value })} className={inputClass()} placeholder="Signup started" />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Category</span>
              <select value={draft.category} onChange={(event) => updateDraft({ category: event.target.value as HqGoalCategory })} className={inputClass()}>
                {payload.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Description</span>
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })}
                className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="What this goal means"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft({ enabled: event.target.checked })} className="h-4 w-4" />
              Active
            </label>

            <button
              type="button"
              disabled={saving}
              onClick={() => void submit("POST")}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save goal
            </button>
            {message ? <p className="text-sm font-bold text-slate-600">{message}</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.1fr_.8fr_120px_120px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase text-slate-500">
            <span>Goal</span>
            <span>Source</span>
            <span>Count</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-slate-200">
            {filteredGoals.map((goal) => (
              <GoalRow
                key={goal.name}
                goal={goal}
                tables={payload.tables}
                categories={payload.categories}
                disabled={saving}
                onSave={(next) => void submit("PATCH", next)}
                onDelete={() => void removeGoal(goal.name)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function GoalRow({
  goal,
  tables,
  categories,
  disabled,
  onSave,
  onDelete,
}: {
  goal: HqGoalRecord;
  tables: HqTableInfo[];
  categories: readonly HqGoalCategory[];
  disabled: boolean;
  onSave: (goal: HqGoalRecord) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal);
  const selectedTable = tables.find((table) => table.name === draft.sourceTable) ?? null;

  if (editing) {
    return (
      <div className="grid grid-cols-1 gap-3 px-4 py-4 xl:grid-cols-[1.1fr_.8fr_120px_120px]">
        <div className="space-y-2">
          <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} className={inputClass()} />
          <input value={draft.name} readOnly className={inputClass("bg-slate-100 text-slate-500")} />
          <textarea
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="space-y-2">
          <select
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value as HqGoalCategory })}
            className={inputClass()}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={draft.sourceTable ?? ""}
            onChange={(event) => setDraft({ ...draft, sourceTable: event.target.value || null, sourceColumn: null, matchValue: null })}
            className={inputClass()}
          >
            <option value="">No table</option>
            {tables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
          <select
            value={draft.sourceColumn ?? ""}
            onChange={(event) => setDraft({ ...draft, sourceColumn: event.target.value || null, matchValue: null })}
            className={inputClass()}
            disabled={!selectedTable}
          >
            <option value="">Whole table</option>
            {selectedTable?.columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
          <input
            value={draft.matchValue ?? ""}
            onChange={(event) => setDraft({ ...draft, matchValue: event.target.value })}
            className={inputClass()}
            placeholder="Match value"
            disabled={!draft.sourceColumn}
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
          Active
        </label>
        <div className="flex items-start justify-end gap-2">
          <button type="button" disabled={disabled} onClick={() => onSave(draft)} className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white">
            <Save className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-600">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-4 xl:grid-cols-[1.1fr_.8fr_120px_120px] xl:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold text-slate-900">{goal.label}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${goal.enabled ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
            {goal.enabled ? "Active" : "Paused"}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{goal.category}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-500">{goal.name}</p>
        <p className="mt-1 text-sm text-slate-600">{goal.description}</p>
      </div>
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
        <Database className="h-4 w-4 text-slate-400" />
        {goal.sourceTable ? (
          <span>
            {goal.sourceTable}
            {goal.sourceColumn && goal.matchValue ? ` where ${goal.sourceColumn} = ${goal.matchValue}` : ""}
          </span>
        ) : (
          <span>Event only</span>
        )}
      </div>
      <div className="text-sm font-extrabold text-slate-900">{goal.sourceCount == null ? "-" : goal.sourceCount.toLocaleString("en-US")}</div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700">
          Edit
        </button>
        <button type="button" disabled={disabled} onClick={onDelete} className="grid h-10 w-10 place-items-center rounded-lg border border-rose-200 text-rose-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
