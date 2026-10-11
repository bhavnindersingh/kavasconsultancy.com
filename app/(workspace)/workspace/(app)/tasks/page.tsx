import type { Metadata } from "next";
import TasksApp from "@/components/workspace/tasks/TasksApp";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return <TasksApp />;
}
