"use client";

import { useState } from "react";
import { waitingLabel, type Stub } from "@/lib/workspace/tasks";
import { STATUS_LABEL, type Task } from "@/lib/workspace/types";
import { useWorkspace } from "../WorkspaceContext";
import { Disc, LATE, LinkIcon, PriorityBar, StatusPill, daysUntilDue, dueWords } from "./bits";

// One person's work across every live board — "what is on me", the question
// anyone actually opens the app with. Grouped by WHEN, not by board: what a
// person needs from a combined list is an order to work in, so the board rides
// along as a label. Overdue first; undated last, because an undated task is
// not urgent, it is unplanned. Done is a log, newest first, folded.

const BUCKETS: { key: string; title: string; note?: string; test: (d: number | null) => boolean }[] = [
  { key: "overdue", title: "Overdue", note: "Past its due date. This is the only red on the board.", test: (d) => d !== null && d < 0 },
  { key: "today", title: "Today", test: (d) => d === 0 },
  { key: "week", title: "Next seven days", test: (d) => d !== null && d > 0 && d <= 7 },
  { key: "later", title: "Later", test: (d) => d !== null && d > 7 },
  { key: "undated", title: "No date yet", note: "Not on the timeline until it has one.", test: (d) => d === null },
];
const DONE_VISIBLE = 8;

export default function PersonView({
  tasks,
  awaiting = [],
  showAssignee = false,
  waiting,
  boardNames,
  onOpen,
}: {
  tasks: Task[];
  /** Quality Check work on boards the viewer signs off, whoever it's assigned to. */
  awaiting?: Task[];
  /** Everyone's work: say whose each row is. */
  showAssignee?: boolean;
  waiting: Map<string, Stub[]>;
  boardNames: Map<string, string>;
  onOpen: (task: Task) => void;
}) {
  const [showAllDone, setShowAllDone] = useState(false);
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done").sort((a, b) => (b.completed_at ?? "9999").localeCompare(a.completed_at ?? "9999"));
  const groups = BUCKETS.map((b) => ({ ...b, rows: open.filter((t) => b.test(daysUntilDue(t))) })).filter((g) => g.rows.length);

  return (
    <div className="max-w-4xl">
      {awaiting.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-medium">
            Awaiting your sign-off <span className="font-normal text-mute">{awaiting.length}</span>
            <span className="font-normal text-mute"> · Finished work on boards you own. Open it and move it to Done.</span>
          </h3>
          <Rows rows={awaiting} waiting={waiting} boardNames={boardNames} onOpen={onOpen} showAssignee />
        </section>
      )}
      {groups.map((g) => (
        <section key={g.key} className="mb-6">
          <h3 className="mb-2 text-sm font-medium" style={g.key === "overdue" ? { color: LATE } : undefined}>
            {g.title} <span className="font-normal text-mute">{g.rows.length}</span>
            {g.note && <span className="font-normal text-mute"> · {g.note}</span>}
          </h3>
          <Rows rows={g.rows} waiting={waiting} boardNames={boardNames} onOpen={onOpen} showAssignee={showAssignee} />
        </section>
      ))}
      {done.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-medium">
            Done <span className="font-normal text-mute">{done.length}</span>
          </h3>
          <Rows rows={showAllDone ? done : done.slice(0, DONE_VISIBLE)} waiting={waiting} boardNames={boardNames} onOpen={onOpen} showAssignee={showAssignee} />
          {done.length > DONE_VISIBLE && (
            <button className="mt-2 text-sm text-mute underline underline-offset-2" onClick={() => setShowAllDone((s) => !s)}>
              {showAllDone ? "Show recent only" : `…and ${done.length - DONE_VISIBLE} finished earlier`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function Rows({
  rows,
  waiting,
  boardNames,
  onOpen,
  showAssignee = false,
}: {
  rows: Task[];
  waiting: Map<string, Stub[]>;
  boardNames: Map<string, string>;
  onOpen: (t: Task) => void;
  showAssignee?: boolean;
}) {
  const { nameOf } = useWorkspace();
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
      {rows.map((t) => {
        const due = dueWords(t);
        const blockers = waiting.get(t.id) ?? [];
        return (
          <li key={t.id}>
            <button data-tk-row onClick={() => onOpen(t)} className="flex w-full flex-wrap items-stretch gap-x-3 gap-y-1 px-4 py-2.5 text-left text-sm outline-none hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink">
              <PriorityBar priority={t.priority} />
              <span className="flex min-w-0 flex-1 basis-60 flex-wrap items-center gap-x-2 gap-y-1">
                <span className={t.status === "done" ? "text-mute line-through" : ""}>{t.title}</span>
                {blockers.length > 0 && t.status !== "done" && (
                  <span className="ws-chip gap-1 !bg-[#eef2f7] !text-[#475569]" title={blockers.map((b) => b.title).join(" · ")}>
                    <LinkIcon />
                    {waitingLabel(blockers)}
                  </span>
                )}
              </span>
              {showAssignee && (
                <span className="flex items-center gap-1.5 self-center text-xs text-body">
                  <Disc id={t.assignee_id} name={t.assignee_id ? nameOf(t.assignee_id) : null} size={18} />
                  {t.assignee_id ? nameOf(t.assignee_id).split(" ")[0] : "Nobody"}
                </span>
              )}
              <span className="self-center text-xs text-mute">{boardNames.get(t.board_id) ?? "Board"}</span>
              <span className="self-center"><StatusPill status={t.status} label={STATUS_LABEL[t.status]} /></span>
              <span className="w-24 self-center text-right text-xs whitespace-nowrap">
                {t.status === "done" ? "" : !due ? <span className="text-mute">—</span> : due.late ? <span className="ws-chip" style={{ background: "#fef3f2", color: LATE }}>{due.text}</span> : <span className="text-mute">{due.text}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
