import { StorageClient } from "@supabase/storage-js";

// Deliverable and doctor's-letter bytes live in a private Supabase Storage bucket (ADR-0012).
// The browser uploads straight to a signed URL, so files skip Vercel's 4.5 MB request limit.
export const TENANT_FILES_BUCKET = "tenant-files";
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function storageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function bucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase Storage is not configured");
  return new StorageClient(`${url}/storage/v1`, { apikey: key, Authorization: `Bearer ${key}` }).from(
    TENANT_FILES_BUCKET,
  );
}

export function storagePathForUpload(folder: "deliverables" | "leave-letters", fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  return `tenants/kmplus/${folder}/${Date.now()}-${safe}`;
}

/** A link that downloads the file under its original name and expires after a minute. */
export async function createDownloadUrl(storagePath: string, fileName: string): Promise<string> {
  const { data, error } = await bucket().createSignedUrl(storagePath, 60, { download: fileName });
  if (error) throw error;
  return data.signedUrl;
}

/** A one-time URL the browser PUTs the file to; it cannot overwrite an existing path. */
export async function createUploadUrl(storagePath: string): Promise<string> {
  const { data, error } = await bucket().createSignedUploadUrl(storagePath);
  if (error) throw error;
  return data.signedUrl;
}
