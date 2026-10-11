import { PRIORITY_LABEL, STATUS_LABEL, type TaskEvent, type TaskPriority, type TaskStatus } from "@/lib/workspace/types";
import { shortDate } from "./bits";

// The log stores raw values ('in_progress', '2026-10-20', '40'); the words
// live here. A field or action this file has never heard of is shown
// verbatim rather than dropped — awkward wording beats a silent gap.

const FIELD: Record<string, string> = {
  title: "the title",
  status: "status",
  priority: "priority",
  assignee: "the owner",
  start_date: "the start date",
  due_date: "the due date",
  progress: "progress",
  board: "the board",
};

function value(field: string | null, v: string | null) {
  if (v === null || v === "") return "none";
  if (field === "status") return STATUS_LABEL[v as TaskStatus] ?? v;
  if (field === "priority") return PRIORITY_LABEL[v as TaskPriority] ?? v;
  if (field === "start_date" || field === "due_date") return /^\d{4}-\d{2}-\d{2}$/.test(v) ? shortDate(v) : v;
  if (field === "progress") return `${v}%`;
  if (field === "title") return `“${v}”`;
  return v;
}

/** One line of the trail, after the actor's name: "changed status from To Do to In Progress". */
export function describeEvent(e: TaskEvent) {
  if (e.action === "created") return "created this task";
  if (e.action === "linked" || e.action === "unlinked") {
    const on = e.action === "linked";
    const t = `“${e.to_value}”`;
    if (e.field === "waits_on") return on ? `made this wait on ${t}` : `stopped this waiting on ${t}`;
    if (e.field === "blocks") return on ? `made this a prerequisite of ${t}` : `removed ${t} from waiting on this`;
    return [e.action, e.field, e.to_value].filter(Boolean).join(" ");
  }
  if (e.action === "updated") {
    const f = e.field ?? "";
    if (f === "description") return "edited the notes";
    const label = FIELD[f] ?? f ?? "something";
    const from = e.from_value;
    const to = e.to_value;
    if (f === "title") return `renamed this from ${value(f, from)} to ${value(f, to)}`;
    if (f === "assignee") {
      if (!from) return `assigned this to ${to}`;
      if (!to) return `cleared the owner (was ${from})`;
      return `changed the owner from ${from} to ${to}`;
    }
    if (!from) return `set ${label} to ${value(f, to)}`;
    if (!to) return `cleared ${label} (was ${value(f, from)})`;
    return `changed ${label} from ${value(f, from)} to ${value(f, to)}`;
  }
  return [e.action, e.field, e.to_value].filter(Boolean).join(" ");
}
