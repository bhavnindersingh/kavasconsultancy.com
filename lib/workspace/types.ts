// Row shapes for supabase/migrations/ (20261010000000_workspace.sql and later).
// Keep them in step with the migration — the CHECK constraints there are the
// source of truth for every enum below.

export type Role = "partner" | "member";

/** Shortest password the Team and Account pages accept (Supabase allows 6). */
export const MIN_PASSWORD = 8;

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at?: string;
  /** Task emails: assigned to you, comments, ready for sign-off. */
  email_notifications?: boolean;
  /** The morning digest of overdue and due-today work. */
  email_digest?: boolean;
};

// ── Tasks ──────────────────────────────────────────────────────────────────

export const TASK_STATUSES = ["todo", "in_progress", "blocked", "quality_check", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Labels as in the Conscious Cafe manager. `blocked` reads "On Hold": the
// value is kept, the word is gentler and covers "paused" as well as "stuck".
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "On Hold",
  quality_check: "Quality Check",
  done: "Done",
};

/** Display order, most pressing first. */
export const TASK_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PRIORITY_LABEL: Record<TaskPriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };

/** The eight board colours. The first is the default (the DB default too). */
export const BOARD_COLORS = ["#26532b", "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#716d63"] as const;

export type TaskBoard = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  color: string;
  is_archived: boolean;
  sort_order: number;
  created_by: string | null;
  /** Open (not done) tasks, from an embedded count; absent if it didn't load. */
  open_count?: number;
};

export type Task = {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  sort_order: number;
  completed_at: string | null;
  created_by?: string | null;
  created_at: string;
};

export type TaskSubtask = { id: string; task_id: string; title: string; is_done: boolean; sort_order: number };
export type TaskComment = { id: string; task_id: string; author_id: string | null; body: string; created_at: string; edited_at: string | null };

/** "task_id waits on depends_on_task_id". */
export type TaskDependency = { task_id: string; depends_on_task_id: string };

/** One line of a task's activity trail. Values are raw; the drawer labels them. */
export type TaskEvent = {
  id: string;
  seq: number;
  task_id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  field: string | null;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
};

export type StoredFile = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};
export type TaskFile = StoredFile & { task_id: string; uploaded_by: string | null };

// ── Documents ──────────────────────────────────────────────────────────────

export type DocumentFolder = { id: string; parent_id: string | null; name: string };
export type CompanyDocument = StoredFile & { folder_id: string; description: string | null; uploaded_by: string | null };

// ── Accounts ───────────────────────────────────────────────────────────────

export const ACCOUNT_CATEGORIES = ["invoice", "salary", "purchase", "marketing", "subscription", "company", "personal"] as const;
export type AccountCategory = (typeof ACCOUNT_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<AccountCategory, string> = {
  invoice: "Invoicing",
  salary: "Salaries",
  purchase: "Purchases",
  marketing: "Marketing",
  subscription: "Subscriptions",
  company: "Company",
  personal: "Personal",
};

/** A salary or a personal expense is always one person's. */
export const PER_PERSON: AccountCategory[] = ["salary", "personal"];

/**
 * Kavas spends as a company: every expense is the consultancy's, and only a
 * salary names a person. "Personal" is no longer offered; it stays in the
 * schema so any old entries still read and can be re-filed.
 */
export const RETIRED_CATEGORIES: AccountCategory[] = ["personal"];
export const ENTRY_CATEGORIES = ACCOUNT_CATEGORIES.filter((c) => !RETIRED_CATEGORIES.includes(c));

/** Money in: what Kavas invoices its clients. Every other category is spending. */
export const INCOME_CATEGORIES: AccountCategory[] = ["invoice"];
export const isIncome = (c: AccountCategory) => INCOME_CATEGORIES.includes(c);

export const CURRENCIES = ["INR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PAYMENT_METHODS = ["Bank transfer", "UPI", "Card", "Cash", "Cheque", "Other"];
export const GST_RATES = ["0", "5", "12", "18", "28"];
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export type AccountEntry = {
  id: string;
  entry_date: string;
  category: AccountCategory;
  party: string | null;
  description: string;
  amount: string; // NUMERIC arrives as a string-safe number; treat as decimal text
  currency: Currency;
  payment_method: string | null;
  owner_id: string | null;
  salary_month: string | null;
  notes: string | null;
  paid_from: string | null;
  reference_no: string | null;
  payee_account: string | null;
  bank_narration: string | null;
  gst_applicable: boolean;
  vendor_gstin: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  gst_rate: string | null;
  taxable_value: string | null;
  gst_amount: string | null;
  created_at: string;
  account_files?: AccountFile[];
};

export type AccountFile = StoredFile & { entry_id: string };
