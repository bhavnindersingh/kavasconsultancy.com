import type { Metadata } from "next";
import TasksApp from "@/components/workspace/tasks/TasksApp";

export const metadata: Metadata = { title: "Tasks" };

// ?task=<id> is the link every task email carries: open that task on its board.
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const { task } = await searchParams;
  return <TasksApp initialTaskId={typeof task === "string" ? task : null} />;
}
