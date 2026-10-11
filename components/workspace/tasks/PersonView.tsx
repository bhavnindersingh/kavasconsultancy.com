"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import { STATUS_LABEL, type Task, type TaskBoard } from "@/lib/workspace/types";
import { changed, useLive } from "@/lib/workspace/useLive";
import { useWorkspace } from "../WorkspaceContext";
import { PriorityDot, STATUS_COLOR, daysUntilDue, dueLabel } from "./bits";

// One person's work across every live board — the view that reads along the
// other axis. The board views answer "what is left on this project"; this
// answers "what is on me". Same rows from the same table, sorted differently.
//
// Grouped by WHEN, not by board: what a person needs from a combined list is
// an order to work in, so the board rides along as a label. Overdue first,
// undated last — an undated task is not urgent, it is unplanned. Done work is
// grouped by being done, newest first, and folded.

const BUCKETS: { key: string; title: string; note?: string; test: (d: number | null) => boolean }[] = [
  { key: "overdue", title: "Overdue", test: (d) => d !== null && d < 0 },
  { key: "today", title: "Today", test: (d) => d === 0 },
  { key: "week", title: "Next seven days", test: (d) => d !== null && d > 0 && d <= 7 },
  { key: "later", title: "Later", test: (d) => d !== null && d > 7 },
  { key: "undated", title: "No due date", note: "Not planned yet.", test: (d) => d === null },
];
const DONE_VISIBLE = 8;

export default function PersonView({
  boards,
  nonce,
  onOpen,
}: {
  boards: TaskBoard[];
  /** Bumped by the parent when the drawer saves, so this list refetches. */
  nonce: number;
  onOpen: (taskId: string, boardId: string) => void;
}) {
  const { me, people } = useWorkspace();
  const supabase = supabaseBrowser();
  const [personId, setPersonId] = useState(me.id);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);

  const live = useMemo(() => boards.filter((b) => !b.is_archived), [boards]);
  const boardIds = useMemo(() => live.map((b) => b.id), [live]);
  const boardName = useMemo(() => new Map(live.map((b) => [b.id, b.name])), [live]);

  const load = useCallback(async () => {
    if (!boardIds.length) {
      setTasks([]);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assignee_id", personId)
      .in("board_id", boardIds)
      .order("due_date", { ascending: true, nullsFirst: false });
    setTasks((data ?? []) as Task[]);
    setLoaded(true);
  }, [supabase, personId, boardIds]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on person/board change
    load();
  }, [load, nonce]);

  useLive(
    `person-${personId}`,
    ["tasks"],
    (c) => changed(c, "assignee_id") === personId || tasks.some((t) => t.id === changed(c, "id")),
    load,
  );

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const groups = BUCKETS.map((b) => ({ ...b, rows: open.filter((t) => b.test(daysUntilDue(t))) })).filter((g) => g.rows.length);
  const person = people.find((p) => p.id === personId);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select className="ws-input !w-auto" value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="Person">
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === me.id ? `Me (${p.full_name || p.email})` : p.full_name || p.email}
            </option>
          ))}
        </select>
        {loaded && (
          <p className="text-sm text-mute">
            {open.length} open across {new Set(open.map((t) => t.board_id)).size || "no"} board{new Set(open.map((t) => t.board_id)).size === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {loaded && !tasks.length && (
        <p className="rounded-2xl border border-dashed border-ghost p-8 text-center text-mute">
          Nothing assigned to {personId === me.id ? "you" : person?.full_name || "them"} on a live board.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.key} className="mb-6">
          <h3 className={`text-sm font-medium mb-2 ${g.key === "overdue" ? "text-[#b42318]" : ""}`}>
            {g.title} <span className="text-mute font-normal">{g.rows.length}</span>
            {g.note && <span className="text-mute font-normal"> · {g.note}</span>}
          </h3>
          <Rows rows={g.rows} boardName={boardName} onOpen={onOpen} />
        </section>
      ))}

      {done.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium mb-2">
            Done <span className="text-mute font-normal">{done.length}</span>
          </h3>
          <Rows rows={showAllDone ? done : done.slice(0, DONE_VISIBLE)} boardName={boardName} onOpen={onOpen} />
          {done.length > DONE_VISIBLE && (
            <button className="mt-2 text-sm text-mute underline underline-offset-2" onClick={() => setShowAllDone((s) => !s)}>
              {showAllDone ? "Show fewer" : `Show all ${done.length}`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function Rows({ rows, boardName, onOpen }: { rows: Task[]; boardName: Map<string, string>; onOpen: (id: string, boardId: string) => void }) {
  return (
    <ul className="rounded-2xl border border-line bg-card divide-y divide-line">
      {rows.map((t) => {
        const due = dueLabel(t);
        return (
          <li key={t.id}>
            <button onClick={() => onOpen(t.id, t.board_id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left text-sm hover:bg-paper">
              <span className="flex min-w-0 flex-1 basis-60 items-start gap-2">
                <PriorityDot priority={t.priority} />
                <span className={t.status === "done" ? "line-through text-mute" : ""}>{t.title}</span>
              </span>
              <span className="ws-chip">{boardName.get(t.board_id) ?? "Board"}</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-mute whitespace-nowrap">
                <span className="inline-block size-2 rounded-full" style={{ background: STATUS_COLOR[t.status] }} />
                {STATUS_LABEL[t.status]}
              </span>
              {t.status !== "done" && t.due_date && (
                <span className={`text-xs whitespace-nowrap ${due.late ? "text-[#b42318]" : "text-mute"}`}>{due.text}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
