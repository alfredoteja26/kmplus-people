import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

function firebaseStorageConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}

function ensureFirebaseApp(): void {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!raw || !projectId) throw new Error("Firebase is not configured");
  initializeApp({
    credential: cert(JSON.parse(raw) as ServiceAccount),
    projectId,
  });
}

export function storagePathForUpload(
  folder: "deliverables" | "leave-letters",
  fileName: string,
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  return `tenants/kmplus/${folder}/${Date.now()}-${safe}`;
}

/** Stores bytes in Firebase Storage when configured; otherwise returns the path only (local dev). */
export async function uploadTenantFile(
  buffer: Buffer,
  storagePath: string,
  contentType?: string,
): Promise<string> {
  if (!firebaseStorageConfigured()) {
    return storagePath;
  }
  ensureFirebaseApp();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName ? getStorage().bucket(bucketName) : getStorage().bucket();
  const file = bucket.file(storagePath);
  await file.save(buffer, contentType ? { contentType } : undefined);
  return storagePath;
}
