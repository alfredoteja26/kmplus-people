import { NextResponse } from "next/server";
import { readableStoredFile } from "@/lib/file-access";
import { scopeStateForViewer } from "@/lib/scope";
import { currentSessionUser } from "@/lib/server/current-user";
import { loadTenantState } from "@/lib/server/persist";
import { createDownloadUrl, storageConfigured } from "@/lib/server/supabase-storage";
import { overlaySessionIdentity } from "@/lib/session-identity";

export const runtime = "nodejs";

/** Opens a stored file the viewer may read, through a signed link that expires after a minute. */
export async function GET(request: Request) {
  const sessionUser = await currentSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storagePath = new URL(request.url).searchParams.get("path") ?? "";
  try {
    const view = scopeStateForViewer(
      overlaySessionIdentity(await loadTenantState(), { personId: sessionUser.personId, role: sessionUser.role }),
    );
    const file = readableStoredFile(view, storagePath);
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
    if (!storageConfigured()) {
      return NextResponse.json({ error: "File storage is not configured here" }, { status: 503 });
    }
    return NextResponse.redirect(await createDownloadUrl(storagePath, file.fileName), 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open the file";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
