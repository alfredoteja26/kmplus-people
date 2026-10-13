import { NextResponse } from "next/server";
import { currentSessionUser } from "@/lib/server/current-user";
import {
  MAX_UPLOAD_BYTES,
  createUploadUrl,
  storageConfigured,
  storagePathForUpload,
} from "@/lib/server/supabase-storage";
import { EVIDENCE_TYPE_REFUSAL, reimbursementEvidenceAllowed, uploadFolderFor } from "@/lib/upload-rules";

export const runtime = "nodejs";

type UploadBody = { purpose?: string; fileName?: string; size?: number; contentType?: string };

/**
 * Hands out a storage path and a signed upload URL; the browser sends the bytes to Supabase itself.
 * Without Supabase (local dev) it returns the path only, and no bytes are stored.
 */
export async function POST(request: Request) {
  const sessionUser = await currentSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UploadBody;
  try {
    body = (await request.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { purpose } = body;
  const fileName = String(body.fileName ?? "").trim() || "upload";
  const size = Number(body.size);
  const folder = uploadFolderFor(purpose);
  if (!folder) {
    return NextResponse.json({ error: "Invalid upload purpose" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large" }, { status: 400 });
  }

  if (purpose === "reimbursement-evidence" && !reimbursementEvidenceAllowed(String(body.contentType ?? ""), fileName)) {
    return NextResponse.json({ error: EVIDENCE_TYPE_REFUSAL }, { status: 400 });
  }

  const storagePath = storagePathForUpload(folder, fileName);
  if (!storageConfigured()) {
    return NextResponse.json({ storagePath, fileName });
  }

  try {
    const uploadUrl = await createUploadUrl(storagePath);
    return NextResponse.json({ storagePath, fileName, uploadUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
