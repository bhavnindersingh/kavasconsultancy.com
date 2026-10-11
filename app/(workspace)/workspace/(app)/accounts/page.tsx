import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AccountsApp from "@/components/workspace/accounts/AccountsApp";
import { currentProfile } from "@/lib/workspace/supabase-server";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  if ((await currentProfile())?.role !== "partner") notFound();
  return <AccountsApp />;
}
