import { NextResponse } from "next/server";
import { currentSessionUser } from "@/lib/server/current-user";
import { storagePathForUpload, uploadTenantFile } from "@/lib/server/firebase-storage";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const sessionUser = await currentSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const purpose = form.get("purpose");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (purpose !== "deliverable" && purpose !== "doctor-letter") {
    return NextResponse.json({ error: "Invalid upload purpose" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large" }, { status: 400 });
  }

  const folder = purpose === "doctor-letter" ? "leave-letters" : "deliverables";
  const storagePath = storagePathForUpload(folder, file.name || "upload");
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadTenantFile(buffer, storagePath, file.type || undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  return NextResponse.json({
    storagePath,
    fileName: file.name || "upload",
  });
}
