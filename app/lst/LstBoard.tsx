"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  LayoutDashboard,
  Link as LinkIcon,
  ListChecks,
  ListTodo,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { LST_STATUSES, LST_TYPES, type LstStatus, type LstTask, type LstType } from "@/lib/lst-tasks";

type FilterTab = "All" | LstType;
type SaveState = "idle" | "saving" | "saved" | "error";

const statusTone: Record<LstStatus, string> = {
  Backlog: "border-slate-300 bg-slate-100 text-slate-700",
  Todo: "border-sky-300 bg-sky-100 text-sky-800",
  "In Progress": "border-amber-300 bg-amber-100 text-amber-800",
  Testing: "border-violet-300 bg-violet-100 text-violet-800",
  Done: "border-emerald-300 bg-emerald-100 text-emerald-800",
};

const typeTone: Record<LstType, string> = {
  Marketing: "bg-pink-100 text-pink-700",
  Content: "bg-cyan-100 text-cyan-700",
  Coding: "bg-blue-100 text-blue-700",
  Cloudflare: "bg-orange-100 text-orange-700",
  Admin: "bg-slate-200 text-slate-700",
  Growth: "bg-emerald-100 text-emerald-700",
  Automation: "bg-violet-100 text-violet-700",
};

function sharePercent(count: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
        <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900">DrKard</span>
    </div>
  );
}

function emptyTask(): LstTask {
  return {
    id: "",
    title: "",
    type: "Coding",
    status: "Backlog",
    description: "",
    subtasks: [],
    tags: ["coding"],
    doneAt: null,
    cloudflareUrl: "",
    publicUrl: "https://lst.drkard.com",
    locationUrl: "/lst",
    notes: "",
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
  };
}

function taskDoneCount(task: LstTask) {
  return task.subtasks.filter((item) => item.done).length;
}

function tagsText(tags: string[]) {
  return tags.join(", ");
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function parseDoneAt(value: string) {
  if (!value) return null;
  const timestamp = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function doneDateValue(value: number | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function TaskItem({
  task,
  onSelect,
}: {
  task: LstTask;
  onSelect: () => void;
}) {
  const done = taskDoneCount(task);
  const total = task.subtasks.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 whitespace-normal break-words text-sm font-extrabold leading-snug text-slate-950">{task.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${typeTone[task.type]}`}>{task.type}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {task.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs font-extrabold text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          {total > 0 ? `${done}/${total}` : "0"}
        </span>
        {task.doneAt && <span>{dateFormatter.format(new Date(task.doneAt))}</span>}
      </div>
    </button>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-extrabold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
}

function textareaClass() {
  return "min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
}

export default function LstBoard({ initialTasks }: { initialTasks: LstTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeType, setActiveType] = useState<FilterTab>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialTasks[0]?.id ?? "");
  const [draft, setDraft] = useState<LstTask>(initialTasks[0] ?? emptyTask());
  const [newTitle, setNewTitle] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const tabs: FilterTab[] = useMemo(() => ["All", ...LST_TYPES], []);

  const typeCounts = useMemo(() => {
    const counts = Object.fromEntries(LST_TYPES.map((type) => [type, 0])) as Record<LstType, number>;
    for (const task of tasks) counts[task.type] += 1;
    return counts;
  }, [tasks]);

  const tabLabel = (tab: FilterTab) => {
    if (tab === "All") return `All ${sharePercent(tasks.length, tasks.length || 1)}`;
    return `${tab} ${sharePercent(typeCounts[tab], tasks.length)}`;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const typeOk = activeType === "All" || task.type === activeType;
      const queryOk =
        !q ||
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.tags.some((tag) => tag.includes(q)) ||
        task.subtasks.some((item) => item.label.toLowerCase().includes(q));
      return typeOk && queryOk;
    });
  }, [activeType, query, tasks]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      testing: tasks.filter((task) => task.status === "Testing").length,
      done: tasks.filter((task) => task.status === "Done").length,
    };
  }, [tasks]);

  const replaceFromPayload = (payload: { tasks?: LstTask[] }, preferredId?: string) => {
    const nextTasks = payload.tasks ?? [];
    setTasks(nextTasks);
    const nextSelected = preferredId ? nextTasks.find((task) => task.id === preferredId) : null;
    const fallback = nextSelected ?? nextTasks.find((task) => task.id === selectedId) ?? nextTasks[0] ?? emptyTask();
    setSelectedId(fallback.id);
    setDraft(fallback);
  };

  const saveTask = async (task: LstTask, method: "POST" | "PATCH" = task.id ? "PATCH" : "POST") => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/lst-tasks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      const payload = (await res.json().catch(() => ({}))) as { tasks?: LstTask[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Save failed.");
      replaceFromPayload(payload, task.id);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1400);
    } catch {
      setSaveState("error");
    }
  };

  const selectTask = (task: LstTask) => {
    setSelectedId(task.id);
    setDraft(task);
    setSaveState("idle");
    setIsDetailsOpen(true);
  };

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const task = {
      ...emptyTask(),
      id: `lst_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
      title,
      type: activeType === "All" ? "Coding" : activeType,
      status: "Backlog" as LstStatus,
      tags: activeType === "Coding" || activeType === "All" ? ["coding"] : [activeType.toLowerCase()],
    };
    setNewTitle("");
    setSelectedId(task.id);
    setDraft(task);
    setIsDetailsOpen(true);
    await saveTask(task, "POST");
  };

  const saveDraft = async () => {
    if (!draft.title.trim()) return;
    await saveTask(draft, draft.id ? "PATCH" : "POST");
  };

  const updateStatus = async (task: LstTask, status: LstStatus) => {
    const next = { ...task, status };
    setTasks((current) => current.map((item) => (item.id === task.id ? next : item)));
    if (draft.id === task.id) setDraft(next);
    await saveTask(next, "PATCH");
  };

  const toggleSubtask = (id: string) => {
    setDraft((current) => ({
      ...current,
      subtasks: current.subtasks.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    }));
  };

  const addSubtask = () => {
    const label = newSubtask.trim();
    if (!label) return;
    setDraft((current) => ({
      ...current,
      subtasks: [...current.subtasks, { id: `subtask-${current.subtasks.length + 1}`, label, done: false }],
    }));
    setNewSubtask("");
  };

  const removeSubtask = (id: string) => {
    setDraft((current) => ({
      ...current,
      subtasks: current.subtasks.filter((item) => item.id !== id),
    }));
  };

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(rgba(15,23,42,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.055)_1px,transparent_1px),linear-gradient(180deg,#e8edf4_0%,#dde9e6_48%,#e8edf4_100%)] bg-[size:36px_36px,36px_36px,auto] font-sans text-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-300/70 bg-slate-100/85 shadow-sm backdrop-blur-xl">
        <div className="flex w-full flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Brand />
              <Link
                href="/hq"
                className="hidden shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 sm:inline-flex"
              >
                HQ
              </Link>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <ListTodo className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950">Admin Center IT</h1>
                <p className="truncate text-sm font-medium text-slate-500">
                  Task board at{" "}
                  <a href="https://lst.drkard.com" className="font-bold text-blue-700 hover:text-blue-900">
                    lst.drkard.com
                  </a>
                </p>
              </div>
            </div>

            <div className="relative min-w-0 xl:w-[24rem]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tasks, tags, details"
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-10 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <form
              className="grid min-w-0 gap-2 sm:grid-cols-[1fr_auto] xl:w-[24rem]"
              onSubmit={(event) => {
                event.preventDefault();
                void addTask();
              }}
            >
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Add one task"
                className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex shrink-0 flex-wrap gap-2">
              {tabs.map((tab) => {
                const active = tab === activeType;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveType(tab)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {tabLabel(tab)}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Tasks", value: stats.total, tone: "text-blue-600" },
                { label: "Testing", value: stats.testing, tone: "text-violet-600" },
                { label: "Done", value: stats.done, tone: "text-emerald-600" },
                {
                  label: activeType === "All" ? "Active tab" : activeType,
                  value: sharePercent(activeType === "All" ? stats.total : typeCounts[activeType], stats.total),
                  tone: "text-slate-700",
                },
              ].map((item) => (
                <div key={item.label} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
                  <span className="text-xs font-bold uppercase text-slate-500">{item.label}</span>
                  <span className={`text-lg font-extrabold leading-none ${item.tone}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {LST_STATUSES.map((status) => {
            const statusTasks = filtered.filter((task) => task.status === status);
            return (
              <section key={status} className="min-h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100/80 shadow-sm">
                <div className={`flex items-center justify-between border-b px-3 py-3 ${statusTone[status]}`}>
                  <h2 className="text-sm font-extrabold">{status}</h2>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-extrabold">{statusTasks.length}</span>
                </div>
                <div className="min-h-[24rem] space-y-2 p-2">
                  {statusTasks.length ? (
                    statusTasks.map((task) => (
                      <TaskItem key={task.id} task={task} onSelect={() => selectTask(task)} />
                    ))
                  ) : (
                    <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 text-center">
                      <ListChecks className="h-7 w-7 text-slate-300" />
                      <p className="mt-2 text-sm font-bold text-slate-400">No tasks</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {isDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:py-10">
          <div role="dialog" aria-modal="true" aria-label="Task details" className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${typeTone[draft.type]}`}>{draft.type}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone[draft.status]}`}>{draft.status}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700">Saved in Cloudflare D1</span>
                  </div>
                  <h2 className="break-words text-2xl font-extrabold leading-tight text-slate-950">{draft.title || "Untitled task"}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Close task details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="grid gap-3">
                <DetailField label="Title">
                  <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={inputClass()} />
                </DetailField>

                <DetailField label="Description">
                  <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                </DetailField>

                <DetailField label="Subtasks">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-extrabold text-slate-500">
                        {taskDoneCount(draft)}/{draft.subtasks.length} complete
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {draft.subtasks.map((subtask) => {
                        const Icon = subtask.done ? CheckCircle2 : Circle;
                        return (
                          <div key={subtask.id} className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg bg-white px-2 py-2 shadow-sm">
                            <button type="button" onClick={() => toggleSubtask(subtask.id)} className="flex min-w-0 items-start gap-2 text-left">
                              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${subtask.done ? "text-emerald-600" : "text-slate-300"}`} />
                              <span className={`break-words text-sm font-bold leading-snug ${subtask.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{subtask.label}</span>
                            </button>
                            <button type="button" onClick={() => removeSubtask(subtask.id)} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-rose-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <form
                      className="mt-2 grid grid-cols-[1fr_auto] gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addSubtask();
                      }}
                    >
                      <input value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} placeholder="New subtask" className={inputClass()} />
                      <button type="submit" className="h-10 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-700">
                        Add
                      </button>
                    </form>
                  </div>
                </DetailField>

                <DetailField label="Notes">
                  <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className={textareaClass()} />
                </DetailField>
              </div>

              <div className="grid content-start gap-3">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                  <DetailField label="Type">
                    <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as LstType })} className={inputClass()}>
                      {LST_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </DetailField>
                  <DetailField label="Status">
                    <select
                      value={draft.status}
                      onChange={(event) => {
                        const status = event.target.value as LstStatus;
                        setDraft({ ...draft, status });
                      }}
                      className={inputClass()}
                    >
                      {LST_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </DetailField>
                </div>

                <DetailField label="Tags">
                  <input value={tagsText(draft.tags)} onChange={(event) => setDraft({ ...draft, tags: parseTags(event.target.value) })} className={inputClass()} />
                </DetailField>

                <DetailField label="Done date">
                  <input
                    type="date"
                    value={doneDateValue(draft.doneAt)}
                    onChange={(event) => setDraft({ ...draft, doneAt: parseDoneAt(event.target.value) })}
                    className={inputClass()}
                  />
                </DetailField>

                <DetailField label="Cloudflare link">
                  <input value={draft.cloudflareUrl} onChange={(event) => setDraft({ ...draft, cloudflareUrl: event.target.value })} className={inputClass()} />
                </DetailField>

                <DetailField label="Public where">
                  <input value={draft.publicUrl} onChange={(event) => setDraft({ ...draft, publicUrl: event.target.value })} className={inputClass()} />
                </DetailField>

                <DetailField label="Located at">
                  <input value={draft.locationUrl} onChange={(event) => setDraft({ ...draft, locationUrl: event.target.value })} className={inputClass()} />
                </DetailField>

                {(draft.publicUrl || draft.cloudflareUrl || draft.locationUrl || draft.doneAt) && (
                  <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    {draft.publicUrl && (
                      <a href={draft.publicUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-sm font-bold text-blue-700 hover:text-blue-900">
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        Public
                      </a>
                    )}
                    {draft.cloudflareUrl && (
                      <a href={draft.cloudflareUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-sm font-bold text-orange-700 hover:text-orange-900">
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        Cloudflare
                      </a>
                    )}
                    {draft.locationUrl && (
                      <span className="flex items-start gap-2 break-all text-sm font-bold text-slate-600">
                        <LinkIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        {draft.locationUrl}
                      </span>
                    )}
                    {draft.doneAt && <span className="text-sm font-bold text-emerald-700">Done {dateFormatter.format(new Date(draft.doneAt))}</span>}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void saveDraft()}
                  disabled={!draft.title.trim() || saveState === "saving"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  Save details
                </button>

                <span
                  className={`rounded-full px-3 py-2 text-center text-xs font-extrabold ${
                    saveState === "saving"
                      ? "bg-amber-100 text-amber-700"
                      : saveState === "saved"
                        ? "bg-emerald-100 text-emerald-700"
                        : saveState === "error"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {saveState === "idle" ? "Ready" : saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Save failed"}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {LST_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => draft.id && void updateStatus(draft, status)}
                      disabled={!draft.id || draft.status === status || saveState === "saving"}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
