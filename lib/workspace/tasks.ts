// Task-board rules that aren't drawing: pure functions, no React, no clock
// except where `today` is passed in. Ported from the Conscious Cafe manager's
// taskService / boardOrder so the two boards behave the same.

import type { Task, TaskDependency, TaskStatus } from "./types";

type Editable = Pick<Task, "status" | "progress">;

/**
 * Dragging progress to 100 finishes the task. Only on the transition (it
 * wasn't already 100), never for a task already done or in Quality Check —
 * that would skip the owner's sign-off — and never when the same save is
 * setting the status by hand, which wins.
 */
export function progressCompletes(prev: Editable | null, next: Editable): boolean {
  if (next.progress !== 100) return false;
  if (!prev) return next.status === "todo";
  if (prev.progress === 100) return false;
  if (prev.status === "done" || prev.status === "quality_check") return false;
  return next.status === prev.status;
}

/**
 * Every task needs a deadline, or it can never be late and nobody is told to
 * chase it. Done is exempt, and so is a save that will finish the task.
 */
export function needsDueDate(prev: Editable | null, next: Editable & Pick<Task, "due_date">) {
  if (next.due_date) return false;
  if (next.status === "done") return false;
  return !progressCompletes(prev, next);
}

// ── Filters ────────────────────────────────────────────────────────────────

export type TaskFilters = {
  search: string;
  /** "" everyone · "none" nobody yet · a profile id */
  owner: string;
  overdueOnly: boolean;
  noDeadline: boolean;
  showDone: boolean;
};

export const NO_FILTERS: TaskFilters = { search: "", owner: "", overdueOnly: false, noDeadline: false, showDone: true };

export function filtersActive(f: TaskFilters) {
  return !!f.search.trim() || !!f.owner || f.overdueOnly || f.noDeadline || !f.showDone;
}

export function applyFilters(tasks: Task[], f: TaskFilters, today: string) {
  const q = f.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) return false;
    if (f.owner === "none" ? !!t.assignee_id : f.owner && t.assignee_id !== f.owner) return false;
    if (f.overdueOnly && !(t.status !== "done" && t.due_date && t.due_date < today)) return false;
    if (f.noDeadline && !(t.status !== "done" && !t.due_date)) return false;
    if (!f.showDone && t.status === "done") return false;
    return true;
  });
}

// ── Dependencies ───────────────────────────────────────────────────────────

export type Stub = Pick<Task, "id" | "title" | "status">;

/** For each task, the unfinished tasks it still waits on. */
export function waitingOn(deps: TaskDependency[], lookup: Map<string, Stub>) {
  const out = new Map<string, Stub[]>();
  for (const d of deps) {
    const blocker = lookup.get(d.depends_on_task_id);
    if (blocker && blocker.status === "done") continue;
    const list = out.get(d.task_id) ?? [];
    list.push(blocker ?? { id: d.depends_on_task_id, title: "another task", status: "todo" as TaskStatus });
    out.set(d.task_id, list);
  }
  return out;
}

export function waitingLabel(blockers: Stub[]) {
  return blockers.length === 1 ? `Waiting on ${blockers[0].title}` : `Waiting on ${blockers.length} tasks`;
}

// ── Board order ────────────────────────────────────────────────────────────

/** The rail after moving one board up or down; null at the ends. */
export function moveInOrder<T extends { id: string }>(list: T[], id: string, dir: -1 | 1): T[] | null {
  const i = list.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return null;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
