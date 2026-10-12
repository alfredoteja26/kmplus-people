import type { AppState } from "./types";

/**
 * A stored file the viewer may open: one that a Deliverable version or a LeaveRequest in their scoped view
 * points at. Reading follows the same rules as seeing the record (see scope.ts), so a doctor's letter reaches
 * only its Person and the Admin grant.
 */
export function readableStoredFile(view: AppState, storagePath: string): { fileName: string } | null {
  if (!storagePath) return null;
  for (const deliverable of view.deliverables ?? []) {
    const version = deliverable.versions.find((row) => row.storagePath === storagePath);
    if (version) return { fileName: version.fileName };
  }
  if ((view.leaveRequests ?? []).some((row) => row.doctorLetterPath === storagePath)) {
    const stored = storagePath.split("/").pop() ?? "";
    return { fileName: stored.replace(/^\d+-/, "") || "doctor-letter" };
  }
  return null;
}

/** Where the browser opens a stored file; the server checks access, then redirects to a short-lived link. */
export function storedFileHref(storagePath: string): string {
  return `/api/storage/file?path=${encodeURIComponent(storagePath)}`;
}
