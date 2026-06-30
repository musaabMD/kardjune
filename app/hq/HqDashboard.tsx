"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type SelectionChangedEvent,
} from "ag-grid-community";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clock,
  DollarSign,
  FileText,
  Gauge,
  Hexagon,
  LayoutDashboard,
  Repeat,
  Search,
  SlidersHorizontal,
  Star,
  Target as TargetIcon,
  TrendingUp,
  X,
  UserPlus,
} from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

export const myTheme = themeQuartz.withParams({
  browserColorScheme: "light",
});

export type Dir = "up" | "down";
export type Status = "On track" | "At risk" | "Off track";
export type IconKey =
  | "Activity"
  | "TrendingUp"
  | "DollarSign"
  | "Repeat"
  | "Star"
  | "UserPlus"
  | "FileText"
  | "Clock"
  | "TargetIcon"
  | "Gauge"
  | "Hexagon"
  | "LayoutDashboard";

export interface Stat {
  value: string;
  dir: Dir;
  good: boolean;
}

export interface Row {
  [key: string]: string | number | boolean | null | undefined;
  period: string;
  value: string;
  change: string;
  changeDir: Dir;
  changeGood: boolean;
  vsTarget: string;
  status: Status;
  trend?: "Up" | "Down";
  mode?: "Single" | "Multi-select";
  assignee?: Assignee;
}

export type ColumnKind = "text" | "status" | "trend" | "mode" | "assignee";

export interface HqColumn {
  field: string;
  headerName: string;
  minWidth?: number;
  pinned?: "left";
  kind?: ColumnKind;
  editable?: boolean;
}

export interface HqMetric {
  id: string;
  title: string;
  unit: string;
  value: string;
  category: string;
  icon: IconKey;
  owner: { initials: string; color: string };
  stats: { wow: Stat; mom: Stat; yoy: Stat };
  target: { label: string; status: Status; progress: number };
  columns?: HqColumn[];
  rows: Row[];
}

type GridRow = Row & {
  id: number;
  trend: "Up" | "Down";
  assignee: Assignee;
  mode: "Single" | "Multi-select";
};

type Assignee = "Unassigned" | "Mousab" | "Ops" | "Content" | "Support";
type EditableField = string;

const icons = {
  Activity,
  TrendingUp,
  DollarSign,
  Repeat,
  Star,
  UserPlus,
  FileText,
  Clock,
  TargetIcon,
  Gauge,
  Hexagon,
  LayoutDashboard,
};

const statusTone: Record<Status, string> = {
  "On track": "text-blue-600",
  "At risk": "text-amber-600",
  "Off track": "text-rose-600",
};

const statusDot: Record<Status, string> = {
  "On track": "bg-blue-500",
  "At risk": "bg-amber-500",
  "Off track": "bg-rose-500",
};

const statusTagTone: Record<Status, string> = {
  "On track": "bg-blue-200 text-slate-900",
  "At risk": "bg-amber-200 text-slate-900",
  "Off track": "bg-rose-600 text-white",
};

const trendTagTone: Record<GridRow["trend"], string> = {
  Up: "bg-teal-200 text-slate-900",
  Down: "bg-rose-600 text-white",
};

const modeTagTone: Record<GridRow["mode"], string> = {
  Single: "bg-blue-200 text-slate-900",
  "Multi-select": "bg-teal-200 text-slate-900",
};

const assigneeTagTone: Record<Assignee, string> = {
  Unassigned: "bg-slate-200 text-slate-900",
  Mousab: "bg-blue-200 text-slate-900",
  Ops: "bg-teal-200 text-slate-900",
  Content: "bg-amber-200 text-slate-900",
  Support: "bg-rose-600 text-white",
};

const assignees: Assignee[] = ["Mousab", "Ops", "Content", "Support", "Unassigned"];
const defaultColumns: HqColumn[] = [
  { field: "period", headerName: "Period", minWidth: 220, pinned: "left" },
  { field: "value", headerName: "Value", minWidth: 180 },
  { field: "change", headerName: "Change", minWidth: 150 },
  { field: "trend", headerName: "Trend", minWidth: 140, kind: "trend" },
  { field: "vsTarget", headerName: "vs Target", minWidth: 150 },
  { field: "status", headerName: "Status", minWidth: 170, kind: "status" },
  { field: "mode", headerName: "Mode", minWidth: 170, kind: "mode" },
  { field: "assignee", headerName: "Assignee", minWidth: 170, kind: "assignee" },
];

function bulkOptionsFor(field: EditableField): string[] | null {
  if (field === "trend") return ["Up", "Down"];
  if (field === "status") return ["On track", "At risk", "Off track"];
  if (field === "mode") return ["Single", "Multi-select"];
  if (field === "assignee") return assignees;
  return null;
}

function defaultBulkValue(field: EditableField) {
  return bulkOptionsFor(field)?.[0] ?? "";
}

const multiFilterParams = {
  buttons: ["reset", "apply"],
  closeOnApply: true,
  defaultJoinOperator: "AND",
  maxNumConditions: 4,
};

const gridHeaderHeight = 52;
const gridFloatingFilterHeight = 52;
const minGridRowHeight = 44;

function Tag({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-flex h-8 min-w-24 items-center justify-center rounded-full px-4 text-sm font-bold ${tone}`}>
      {label}
    </span>
  );
}

function StatusRenderer(params: ICellRendererParams<GridRow, Status>) {
  const value = params.value ?? "On track";
  return <Tag label={value} tone={statusTagTone[value]} />;
}

function TrendRenderer(params: ICellRendererParams<GridRow, GridRow["trend"]>) {
  const value = params.value ?? "Up";
  return <Tag label={value} tone={trendTagTone[value]} />;
}

function ModeRenderer(params: ICellRendererParams<GridRow, GridRow["mode"]>) {
  const value = params.value ?? "Single";
  return <Tag label={value} tone={modeTagTone[value]} />;
}

function AssigneeRenderer(params: ICellRendererParams<GridRow, Assignee>) {
  const value = params.value ?? "Unassigned";
  return <Tag label={value} tone={assigneeTagTone[value]} />;
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${color}`}>
      {initials}
    </div>
  );
}

function StatCell({
  label,
  stat,
  highlight,
}: {
  label: string;
  stat: Stat;
  highlight?: boolean;
}) {
  const Arrow = stat.dir === "up" ? ArrowUp : ArrowDown;
  const tone = stat.good ? "text-emerald-600" : "text-rose-600";
  return (
    <div className={`flex flex-col items-center justify-center gap-1 py-3 ${highlight ? "rounded-xl border border-slate-200 bg-white shadow-sm" : ""}`}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className={`flex items-center gap-0.5 text-sm font-semibold ${tone}`}>
        <Arrow className="h-3.5 w-3.5" strokeWidth={2.5} />
        {stat.value}
      </span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

function MetricCard({
  metric,
  onClick,
}: {
  metric: HqMetric;
  onClick: () => void;
}) {
  const Icon = icons[metric.icon];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
          <h3 className="text-base font-semibold leading-tight text-slate-900">{metric.title}</h3>
        </div>
        <Avatar initials={metric.owner.initials} color={metric.owner.color} />
      </div>

      <div className="mt-5 flex flex-col items-center">
        <span className="text-5xl font-extrabold tracking-tight text-slate-900">{metric.value}</span>
        <span className="mt-1 text-sm font-medium text-slate-400">{metric.unit}</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-slate-50 p-1.5">
        <StatCell label="WoW" stat={metric.stats.wow} highlight />
        <StatCell label="MoM" stat={metric.stats.mom} />
        <StatCell label="YoY" stat={metric.stats.yoy} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800">{metric.target.label}</span>
          <span className={`flex items-center gap-1.5 text-sm font-semibold ${statusTone[metric.target.status]}`}>
            <span className={`h-2 w-2 rounded-full ${statusDot[metric.target.status]}`} />
            {metric.target.status}
          </span>
        </div>
        <ProgressBar value={metric.target.progress} />
      </div>
    </button>
  );
}

function DetailView({
  metric,
  onBack,
}: {
  metric: HqMetric;
  onBack: () => void;
}) {
  const Icon = icons[metric.icon];
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "All">("All");
  const [selectedCount, setSelectedCount] = useState(0);
  const [gridApi, setGridApi] = useState<GridApi<GridRow> | null>(null);
  const [gridHeight, setGridHeight] = useState(0);
  const [assignedRows, setAssignedRows] = useState<Record<number, Assignee>>({});
  const [actionAssignee, setActionAssignee] = useState<Assignee>("Mousab");
  const [editedRows, setEditedRows] = useState<Record<number, Partial<GridRow>>>({});
  const [bulkColumn, setBulkColumn] = useState<EditableField>("status");
  const [bulkValue, setBulkValue] = useState(defaultBulkValue("status"));
  const bulkOptions = useMemo(() => bulkOptionsFor(bulkColumn), [bulkColumn]);
  const tableColumns = useMemo(() => metric.columns?.length ? metric.columns : defaultColumns, [metric.columns]);
  const editableFields = useMemo(
    () => tableColumns.filter((column) => column.editable !== false).map((column) => ({ field: column.field, label: column.headerName })),
    [tableColumns],
  );

  useEffect(() => {
    if (!gridContainerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setGridHeight(entry.contentRect.height);
    });
    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const gridColumns = useMemo<ColDef<GridRow>[]>(
    () =>
      tableColumns.map((column, index) => {
        const definition: ColDef<GridRow> = {
          field: column.field,
          headerName: column.headerName,
          minWidth: column.minWidth ?? 160,
          pinned: column.pinned ?? (index === 0 ? "left" : undefined),
          editable: column.editable ?? true,
        };
        if (column.kind === "trend") {
          definition.cellEditor = "agSelectCellEditor";
          definition.cellEditorParams = { values: ["Up", "Down"] };
          definition.cellRenderer = TrendRenderer;
        }
        if (column.kind === "status") {
          definition.cellEditor = "agSelectCellEditor";
          definition.cellEditorParams = { values: ["On track", "At risk", "Off track"] };
          definition.cellRenderer = StatusRenderer;
        }
        if (column.kind === "mode") {
          definition.cellEditor = "agSelectCellEditor";
          definition.cellEditorParams = { values: ["Single", "Multi-select"] };
          definition.cellRenderer = ModeRenderer;
        }
        if (column.kind === "assignee") {
          definition.cellEditor = "agSelectCellEditor";
          definition.cellEditorParams = { values: assignees };
          definition.cellRenderer = AssigneeRenderer;
        }
        return definition;
      }),
    [tableColumns],
  );

  const defaultColDef = useMemo<ColDef<GridRow>>(
    () => ({
      flex: 1,
      editable: true,
      filter: "agTextColumnFilter",
      filterParams: multiFilterParams,
      floatingFilter: true,
      resizable: true,
      sortable: true,
    }),
    [],
  );

  const gridSource = useMemo<GridRow[]>(() => {
    const q = query.trim().toLowerCase();
    return metric.rows
      .map((row, index) => {
        const id = index + 1;
        const base: GridRow = {
          ...row,
          id,
          trend: row.trend === "Down" || row.changeDir === "down" ? "Down" : "Up",
          mode: row.mode === "Single" ? "Single" : "Multi-select",
          assignee: assignedRows[id] ?? row.assignee ?? "Unassigned",
          status: row.status ?? "On track",
        };
        return { ...base, ...editedRows[id] };
      })
      .filter((row) => {
        const statusOk = status === "All" || row.status === status;
        const queryOk = q === "" || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(q));
        return statusOk && queryOk;
      });
  }, [assignedRows, editedRows, metric.rows, query, status]);

  const statusCounts = useMemo(() => {
    return gridSource.reduce(
      (acc, row) => {
        acc[row.status] += 1;
        return acc;
      },
      { "On track": 0, "At risk": 0, "Off track": 0 } as Record<Status, number>,
    );
  }, [gridSource]);

  const rowHeight = useMemo(() => {
    if (!gridSource.length || !gridHeight) return minGridRowHeight;
    const rowsArea = gridHeight - gridHeaderHeight - gridFloatingFilterHeight;
    return Math.max(minGridRowHeight, Math.floor(rowsArea / gridSource.length));
  }, [gridHeight, gridSource.length]);

  useEffect(() => {
    gridApi?.resetRowHeights();
  }, [gridApi, rowHeight]);

  const updateRows = (rows: GridRow[], field: EditableField, value: string) => {
    if (!rows.length) return;
    setEditedRows((current) => {
      const next = { ...current };
      rows.forEach((row) => {
        next[row.id] = { ...next[row.id], [field]: value } as Partial<GridRow>;
      });
      return next;
    });
    if (field === "assignee") {
      setAssignedRows((current) => {
        const next = { ...current };
        rows.forEach((row) => {
          next[row.id] = value as Assignee;
        });
        return next;
      });
    }
  };

  const assignSelectedRows = () => {
    const selectedRows = gridApi?.getSelectedRows() ?? [];
    updateRows(selectedRows, "assignee", actionAssignee);
  };

  const applyBulkEdit = () => {
    const selectedRows = gridApi?.getSelectedRows() ?? [];
    updateRows(selectedRows, bulkColumn, bulkValue);
  };

  const onCellValueChanged = (event: CellValueChangedEvent<GridRow>) => {
    const field = event.colDef.field as EditableField | undefined;
    if (!field || !event.data || event.newValue === event.oldValue) return;
    updateRows([event.data], field, String(event.newValue ?? ""));
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-100">
      <div className="z-30 flex-none border-b border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <Brand />
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold tracking-tight text-slate-950">{metric.title}</h2>
                <p className="truncate text-sm font-medium text-slate-500">{metric.value} · {metric.unit}</p>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
              {[
                { label: "Rows", value: gridSource.length, tone: "text-blue-600" },
                { label: "On track", value: statusCounts["On track"], tone: "text-blue-600" },
                { label: "At risk", value: statusCounts["At risk"], tone: "text-amber-500" },
                { label: "Off track", value: statusCounts["Off track"], tone: "text-rose-600" },
                { label: "Selected", value: selectedCount, tone: "text-emerald-600" },
              ].map((item) => (
                <div key={item.label} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
                  <span className="text-xs font-bold uppercase text-slate-500">{item.label}</span>
                  <span className={`text-lg font-extrabold leading-none ${item.tone}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="relative min-w-0 xl:w-[22rem]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search table"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-slate-300 bg-white px-4 py-2 shadow-sm sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => gridApi?.selectAll("filtered")}
          className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Select visible
        </button>
        <button
          type="button"
          onClick={() => gridApi?.deselectAll("filtered")}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Clear
        </button>
        <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm">
          <SlidersHorizontal className="h-4 w-4" />
          View
        </span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as Status | "All")}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          aria-label="Status view filter"
        >
          <option value="All">All rows</option>
          <option value="On track">On track</option>
          <option value="At risk">At risk</option>
          <option value="Off track">Off track</option>
        </select>
        <span className="mx-1 hidden h-6 w-px bg-slate-200 md:block" />
        <select
          value={actionAssignee}
          onChange={(event) => setActionAssignee(event.target.value as Assignee)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {assignees.map((assignee) => (
            <option key={assignee} value={assignee}>{assignee}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={assignSelectedRows}
          disabled={!selectedCount}
          className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Assign selected
        </button>
        <select
          value={bulkColumn}
          onChange={(event) => {
            const nextField = event.target.value as EditableField;
            setBulkColumn(nextField);
            setBulkValue(defaultBulkValue(nextField));
          }}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          aria-label="Bulk edit column"
        >
          {editableFields.map((field) => (
            <option key={field.field} value={field.field}>{field.label}</option>
          ))}
        </select>
        {bulkOptions ? (
          <select
            value={bulkValue}
            onChange={(event) => setBulkValue(event.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            aria-label="Bulk edit value"
          >
            {bulkOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input
            value={bulkValue}
            onChange={(event) => setBulkValue(event.target.value)}
            placeholder="New value"
            className="h-9 w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            aria-label="Bulk edit value"
          />
        )}
        <button
          type="button"
          onClick={applyBulkEdit}
          disabled={!selectedCount}
          className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          Apply edit
        </button>
        <button
          type="button"
          onClick={() => {
            setEditedRows({});
            setAssignedRows({});
          }}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Reset edits
        </button>
      </div>

      <div className="min-h-0 flex-1 bg-white">
        <div ref={gridContainerRef} className="hq-ag-grid h-full min-h-full w-full">
          <AgGridReact<GridRow>
            theme={myTheme}
            rowData={gridSource}
            columnDefs={gridColumns}
            defaultColDef={defaultColDef}
            headerHeight={gridHeaderHeight}
            floatingFiltersHeight={gridFloatingFilterHeight}
            rowHeight={rowHeight}
            rowSelection={{
              mode: "multiRow",
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
              selectAll: "filtered",
            }}
            selectionColumnDef={{
              pinned: "left",
              width: 58,
              maxWidth: 58,
              suppressHeaderMenuButton: true,
            }}
            getRowId={(params) => String(params.data.id)}
            quickFilterText={query}
            animateRows
            singleClickEdit
            undoRedoCellEditing
            stopEditingWhenCellsLoseFocus
            onGridReady={(event) => setGridApi(event.api)}
            onCellValueChanged={onCellValueChanged}
            onSelectionChanged={(event: SelectionChangedEvent<GridRow>) => setSelectedCount(event.api.getSelectedRows().length)}
          />
        </div>
      </div>
    </div>
  );
}

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

export default function HqDashboard({ metrics }: { metrics: HqMetric[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [query, setQuery] = useState("");

  const tabs = useMemo(() => ["All", ...Array.from(new Set(metrics.map((metric) => metric.category)))], [metrics]);
  const selected = metrics.find((metric) => metric.id === selectedId) || null;

  const filtered = useMemo(() => {
    return metrics.filter((metric) => {
      const tabOk = activeTab === "All" || metric.category === activeTab;
      const q = query.trim().toLowerCase();
      const queryOk =
        q === "" ||
        metric.title.toLowerCase().includes(q) ||
        metric.unit.toLowerCase().includes(q) ||
        metric.category.toLowerCase().includes(q) ||
        metric.owner.initials.toLowerCase().includes(q);
      return tabOk && queryOk;
    });
  }, [activeTab, metrics, query]);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(rgba(15,23,42,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.055)_1px,transparent_1px),linear-gradient(180deg,#e8edf4_0%,#dde9e6_48%,#e8edf4_100%)] bg-[size:36px_36px,36px_36px,auto] font-sans text-slate-900">
      <style jsx global>{`
        .hq-ag-grid {
          --ag-font-family: inherit;
          --ag-font-size: 14px;
          --ag-background-color: #ffffff;
          --ag-foreground-color: #0f172a;
          --ag-header-background-color: #dbe4ef;
          --ag-header-foreground-color: #1e293b;
          --ag-border-color: #cbd5e1;
          --ag-row-hover-color: #f8fafc;
          --ag-selected-row-background-color: #eff6ff;
          --ag-wrapper-border-radius: 0;
          --ag-header-height: 52px;
          --ag-row-height: 44px;
        }
        .hq-ag-grid .ag-root-wrapper {
          height: 100%;
          border: 0;
        }
        .hq-ag-grid .ag-header,
        .hq-ag-grid .ag-header-row,
        .hq-ag-grid .ag-header-cell,
        .hq-ag-grid .ag-header-cell-label,
        .hq-ag-grid .ag-floating-filter {
          background: #dbe4ef;
        }
        .hq-ag-grid .ag-header-cell-text {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0;
        }
        .hq-ag-grid .ag-floating-filter {
          border-top: 1px solid #cbd5e1;
        }
        .hq-ag-grid .ag-header-cell,
        .hq-ag-grid .ag-cell {
          border-right: 1px solid #cbd5e1;
        }
        .hq-ag-grid .ag-row {
          border-bottom-color: #d7dee8;
        }
        .hq-ag-grid .ag-center-cols-viewport,
        .hq-ag-grid .ag-body-viewport {
          min-height: 100% !important;
        }
        .hq-ag-grid .ag-pinned-left-header,
        .hq-ag-grid .ag-cell.ag-cell-last-left-pinned {
          border-right: 2px solid #94a3b8;
        }
      `}</style>
      {!selected && (
      <div className="sticky top-0 z-20 border-b border-slate-300/70 bg-slate-100/85 shadow-sm backdrop-blur-xl">
        <div className="flex w-full flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Brand />
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search metrics, owners, categories"
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {tabs.map((tab) => {
                const active = tab === activeTab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}

      <div className={selected ? "w-full" : "w-full px-4 py-5 sm:px-6 lg:px-8"}>
        {selected ? (
          <DetailView metric={selected} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filtered.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} onClick={() => setSelectedId(metric.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Search className="h-6 w-6" />
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900">No metrics found</p>
                <p className="mt-1 text-sm text-slate-400">Try a different search or filter.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
