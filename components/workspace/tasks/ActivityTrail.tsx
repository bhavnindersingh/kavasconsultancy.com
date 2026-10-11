"use client";

import { useState } from "react";
import { STATUS_LABEL, type TaskEvent, type TaskStatus } from "@/lib/workspace/types";
import { formatDate } from "./bits";

// The log stores raw values ('in_progress', '2026-10-20', '40'); labels live
// here. A field or action this file has never heard of is shown verbatim
// rather than dropped — awkward wording beats a silent gap in a history.

const FIELD: Record<string, string> = {
  title: "title",
  status: "status",
  priority: "priority",
  assignee: "assignee",
  start_date: "start date",
  due_date: "due date",
  progress: "progress",
  board: "board",
};

function value(field: string | null, v: string | null) {
  if (v === null || v === "") return field === "assignee" ? "nobody" : "none";
  if (field === "status") return STATUS_LABEL[v as TaskStatus] ?? v;
  if (field === "priority") return v[0].toUpperCase() + v.slice(1);
  if (field === "start_date" || field === "due_date") return /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v) : v;
  if (field === "progress") return `${v}%`;
  if (field === "title") return `“${v}”`;
  return v;
}

function sentence(e: TaskEvent) {
  if (e.action === "created") return "created the task";
  if (e.action === "linked" || e.action === "unlinked") {
    const on = e.action === "linked";
    if (e.field === "waits_on") return on ? `made this wait on “${e.to_value}”` : `stopped this waiting on “${e.to_value}”`;
    if (e.field === "blocks") return on ? `made “${e.to_value}” wait on this` : `stopped “${e.to_value}” waiting on this`;
    return `${e.action} ${e.field ?? ""} ${e.to_value ?? ""}`.trim();
  }
  if (e.action === "updated") {
    if (e.field === "description") return "edited the description";
    const label = FIELD[e.field ?? ""] ?? e.field ?? "something";
    if (e.field === "title") return `renamed it from ${value("title", e.from_value)} to ${value("title", e.to_value)}`;
    return `changed ${label} from ${value(e.field, e.from_value)} to ${value(e.field, e.to_value)}`;
  }
  return [e.action, e.field, e.to_value].filter(Boolean).join(" ");
}

const VISIBLE = 8;

export default function ActivityTrail({ events }: { events: TaskEvent[] }) {
  const [all, setAll] = useState(false);
  if (!events.length) return null;
  const shown = all ? events : events.slice(0, VISIBLE);
  return (
    <section>
      <h3 className="text-sm font-medium mb-2">Activity</h3>
      <ol className="space-y-1.5 border-l border-line pl-3 text-[13px]">
        {shown.map((e) => (
          <li key={e.id}>
            <span className="font-medium">{e.actor_name}</span> <span className="text-body">{sentence(e)}</span>
            <span className="block text-xs text-mute">
              {new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </li>
        ))}
      </ol>
      {events.length > VISIBLE && (
        <button className="mt-2 text-xs text-mute underline underline-offset-2" onClick={() => setAll((a) => !a)}>
          {all ? "Show recent only" : `Show all ${events.length}`}
        </button>
      )}
    </section>
  );
}
