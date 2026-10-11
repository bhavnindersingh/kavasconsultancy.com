import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocumentsApp from "@/components/workspace/documents/DocumentsApp";
import { currentProfile } from "@/lib/workspace/supabase-server";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  // RLS is the real gate; this just spares members an empty screen.
  if ((await currentProfile())?.role !== "partner") notFound();
  return <DocumentsApp />;
}
