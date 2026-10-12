import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import { readableStoredFile, storedFileHref } from "./file-access";
import { scopeStateForViewer } from "./scope";
import type { AppState, Deliverable, LeaveRequest } from "./types";

const deck = "tenants/kmplus/deliverables/1791542076725-Deck_v2.pdf";
const letter = "tenants/kmplus/leave-letters/1791542076725-scan.jpg";

function withFiles(): AppState {
  const state = createInitialState();
  const deliverable = {
    id: "dlv-1",
    tenantId: "kmplus",
    projectId: "prj-1",
    kind: "file",
    name: "Deck",
    statusId: "dstatus-draft",
    categoryId: "dcat-deliverables",
    url: null,
    versions: [{ id: "v1", storagePath: deck, fileName: "Deck v2.pdf", uploadedAt: "2026-10-01T00:00:00.000Z" }],
    workItemIds: [],
  } as Deliverable;
  const leave = { id: "leave-1", tenantId: "kmplus", personId: "person-digit", doctorLetterPath: letter } as LeaveRequest;
  return { ...state, deliverables: [deliverable], leaveRequests: [leave] };
}

const as = (state: AppState, personId: string, role: AppState["currentRole"]) =>
  scopeStateForViewer({ ...state, currentPersonId: personId, currentRole: role });

describe("readableStoredFile", () => {
  it("opens a Deliverable file for any signed-in viewer, under its original name", () => {
    expect(readableStoredFile(as(withFiles(), "person-rayhan", "manager"), deck)).toEqual({ fileName: "Deck v2.pdf" });
  });

  it("opens a doctor's letter only for its Person and the Admin grant", () => {
    const state = withFiles();
    expect(readableStoredFile(as(state, "person-digit", "employee"), letter)).toEqual({ fileName: "scan.jpg" });
    expect(readableStoredFile(as(state, "person-alfredo", "employee"), letter)).not.toBeNull();
    expect(readableStoredFile(as(state, "person-rayhan", "manager"), letter)).toBeNull();
  });

  it("refuses a path no visible record points at", () => {
    expect(readableStoredFile(as(withFiles(), "person-alfredo", "employee"), "tenants/kmplus/deliverables/other.pdf")).toBeNull();
    expect(readableStoredFile(as(withFiles(), "person-alfredo", "employee"), "")).toBeNull();
  });

  it("builds an encoded link to the download route", () => {
    expect(storedFileHref("a b/c.pdf")).toBe("/api/storage/file?path=a%20b%2Fc.pdf");
  });
});
