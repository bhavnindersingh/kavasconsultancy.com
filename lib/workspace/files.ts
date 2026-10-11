"use client";

import { supabaseBrowser } from "./supabase-browser";

export type Bucket = "task-files" | "company-documents" | "account-files";

/** Object keys are server-shaped, never built from the user's filename. */
export function objectKey(scope: string, file: File) {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${scope}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
}

export async function uploadObject(bucket: Bucket, key: string, file: File) {
  const { error } = await supabaseBrowser().storage.from(bucket).upload(key, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
}

/**
 * Opens a file through a five-minute signed URL. The tab is opened before the
 * await so popup blockers still see it as the click's own window.
 */
export async function openObject(bucket: Bucket, key: string, downloadName?: string) {
  const tab = window.open("", "_blank");
  const { data, error } = await supabaseBrowser()
    .storage.from(bucket)
    .createSignedUrl(key, 300, downloadName ? { download: downloadName } : undefined);
  if (error) {
    tab?.close();
    throw error;
  }
  if (tab) {
    tab.opener = null;
    tab.location.href = data.signedUrl;
  } else {
    window.location.assign(data.signedUrl);
  }
}

export async function removeObjects(bucket: Bucket, keys: string[]) {
  if (!keys.length) return;
  await supabaseBrowser().storage.from(bucket).remove(keys);
}

export function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function errorText(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong";
}
