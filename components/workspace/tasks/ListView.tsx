"use client";

import { useState } from "react";
import { waitingLabel, type Stub } from "@/lib/workspace/tasks";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_PRIORITIES, TASK_STATUSES, type Task } from "@/lib/workspace/types";
import { useWorkspace } from "../WorkspaceContext";
import { LATE, LinkIcon, PriorityBar, StatusPill, isOverdue, personColor, shortDate } from "./bits";

// The board as a table. Every column sorts; undated and unowned rows always
// sort last, whichever way. Done rows keep their date here — this is a record.

type Key = "title" | "status" | "priority" | "owner" | "due" | "progress";
const COLUMNS: { key: Key; label: string; align?: "right" }[] = [
  { key: "title", label: "Task" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "owner", label: "Assigned" },
  { key: "due", label: "Due" },
  { key: "progress", label: "Progress", align: "right" },
];

export default function ListView({ tasks, waiting, onOpen }: { tasks: Task[]; waiting: Map<string, Stub[]>; onOpen: (id: string) => void }) {
  const { nameOf } = useWorkspace();
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "due", dir: 1 });

  const value = (t: Task, k: Key): string | number | null => {
    if (k === "title") return t.title.toLowerCase();
    if (k === "status") return TASK_STATUSES.indexOf(t.status);
    if (k === "priority") return TASK_PRIORITIES.indexOf(t.priority);
    if (k === "owner") return t.assignee_id ? nameOf(t.assignee_id).toLowerCase() : null;
    if (k === "due") return t.due_date;
    return t.progress;
  };
  const rows = [...tasks].sort((a, b) => {
    const va = value(a, sort.key);
    const vb = value(b, sort.key);
    if (va === null && vb === null) return a.sort_order - b.sort_order;
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir || a.sort_order - b.sort_order;
  });

  if (!rows.length) return <p className="text-mute">Nothing on this board yet.</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-mute">
          <tr className="border-b border-line">
            {COLUMNS.map((c) => {
              const on = sort.key === c.key;
              return (
                <th key={c.key} className={`px-4 py-2.5 font-normal ${c.align === "right" ? "text-right" : ""}`} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
                    {c.label}
                    <span className="text-[10px]">{on ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const late = isOverdue(t);
            const blockers = waiting.get(t.id) ?? [];
            return (
              <tr
                key={t.id}
                tabIndex={0}
                onClick={() => onOpen(t.id)}
                data-tk-row
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(t.id);
                  }
                }}
                className={`cursor-pointer border-b border-line outline-none last:border-0 hover:bg-paper focus-visible:bg-paper ${late ? "bg-[#fffafa]" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <span className="flex items-stretch gap-2.5">
                    <PriorityBar priority={t.priority} />
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={t.status === "done" ? "text-mute line-through" : ""}>{t.title}</span>
                      {blockers.length > 0 && t.status !== "done" && (
                        <span className="ws-chip gap-1 !bg-[#eef2f7] !text-[#475569]" title={blockers.map((b) => b.title).join(" · ")}>
                          <LinkIcon />
                          {waitingLabel(blockers)}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5"><StatusPill status={t.status} label={STATUS_LABEL[t.status]} /></td>
                <td className="whitespace-nowrap px-4 py-2.5">{PRIORITY_LABEL[t.priority]}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {t.assignee_id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: personColor(t.assignee_id) }} />
                      {nameOf(t.assignee_id)}
                    </span>
                  ) : (
                    <span className="text-mute">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {!t.due_date ? (
                    <span className="text-mute">—</span>
                  ) : late ? (
                    <span className="ws-chip gap-1" style={{ background: "#fef3f2", color: LATE }}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 5v3.2l2 1.3" strokeLinecap="round" />
                      </svg>
                      {shortDate(t.due_date)}
                    </span>
                  ) : (
                    shortDate(t.due_date)
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1 w-14 overflow-hidden rounded-full bg-paper">
                      <span className="block h-full rounded-full bg-[#3b6ea8]" style={{ width: `${t.status === "done" ? 100 : t.progress}%` }} />
                    </span>
                    {t.status === "done" ? 100 : t.progress}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
