import type { Metadata } from "next";
import AccountSettings from "@/components/workspace/AccountSettings";

export const metadata: Metadata = { title: "My account" };

export default function AccountPage() {
  return <AccountSettings />;
}
