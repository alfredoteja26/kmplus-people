import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeCommand } from "./command-service";
import { readableStoredFile } from "./file-access";
import { createInitialState } from "./fixtures";
import { scopeStateForViewer } from "./scope";
import type { AppState, Role } from "./types";

const ALFREDO = { personId: "person-alfredo", role: "employee" as Role }; // Employee + Admin grant
const DIGIT = { personId: "person-digit", role: "employee" as Role };
const DENNY = { personId: "person-denny", role: "hr" as Role }; // HR without the Admin grant
const RAYHAN = { personId: "person-rayhan", role: "employee" as Role };

const receipt = (name = "taxi.jpg") => ({
  storagePath: `tenants/kmplus/reimbursement-evidence/1791800000000-${name}`,
  fileName: name,
  contentType: name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
  size: 120_000,
});

const taxi = (patch: Record<string, unknown> = {}) => ({
  expenseDate: "2026-10-10",
  amount: 85000,
  reimbursementTypeId: "reimbursement-type-1",
  description: "Taxi to the client office",
  evidence: [receipt()],
  ...patch,
});

function viewAs(state: AppState, session: { personId: string; role: Role }): AppState {
  return scopeStateForViewer({ ...state, currentPersonId: session.personId, currentRole: session.role });
}

function file(state: AppState, session: { personId: string; role: Role }, input: Record<string, unknown>) {
  return executeCommand(state, session, { name: "fileReimbursementRequest", args: [input] });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-13T03:00:00Z")); // 10:00 in Jakarta
});

afterEach(() => {
  vi.useRealTimers();
});

describe("filing a reimbursement", () => {
  it("files a pending request the Person sees in their own view", () => {
    const outcome = file(createInitialState(), DIGIT, taxi());
    expect(outcome.kind).toBe("applied");
    if (outcome.kind !== "applied") return;
    const mine = outcome.view.reimbursementRequests;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      personId: "person-digit",
      filedByPersonId: "person-digit",
      filedOn: "2026-10-13",
      expenseDate: "2026-10-10",
      amount: 85000,
      decision: null,
      withdrawnOn: null,
    });
    expect(outcome.view.reimbursementEvidence.map((row) => row.fileName)).toEqual(["taxi.jpg"]);
  });

  it("lets an Admin file for another Person, and refuses anyone else who tries", () => {
    const byAdmin = file(createInitialState(), ALFREDO, taxi({ personId: "person-digit" }));
    expect(byAdmin.kind).toBe("applied");
    if (byAdmin.kind !== "applied") return;
    expect(byAdmin.next.reimbursementRequests[0]).toMatchObject({
      personId: "person-digit",
      filedByPersonId: "person-alfredo",
    });

    const byColleague = file(createInitialState(), RAYHAN, taxi({ personId: "person-digit" }));
    expect(byColleague).toMatchObject({ kind: "refused", error: expect.stringMatching(/Only Admin/) });
    const byHr = file(createInitialState(), DENNY, taxi({ personId: "person-digit" }));
    expect(byHr).toMatchObject({ kind: "refused", error: expect.stringMatching(/Only Admin/) });
    const nobody = file(createInitialState(), ALFREDO, taxi({ personId: "person-nobody" }));
    expect(nobody).toMatchObject({ kind: "refused", error: expect.stringMatching(/Person not found/) });
  });

  it("shows a request and its receipts to the Person and every Admin, and to no one else", () => {
    const filed = file(createInitialState(), DIGIT, taxi());
    if (filed.kind !== "applied") throw new Error(filed.error);
    const admin = viewAs(filed.next, ALFREDO);
    expect(admin.reimbursementRequests.map((row) => row.personId)).toEqual(["person-digit"]);
    expect(admin.reimbursementEvidence).toHaveLength(1);

    const colleague = viewAs(filed.next, RAYHAN);
    expect(colleague.reimbursementRequests).toEqual([]);
    expect(colleague.reimbursementEvidence).toEqual([]);
  });

  it.each([
    ["a future expense date", { expenseDate: "2026-10-14" }, /future/],
    ["an expense more than 90 days old", { expenseDate: "2026-07-14" }, /90 days/],
    ["a malformed expense date", { expenseDate: "10/10/2026" }, /date/],
    ["an expense date that does not exist", { expenseDate: "2026-09-31" }, /date/],
    ["a zero amount", { amount: 0 }, /amount/i],
    ["a negative amount", { amount: -5000 }, /amount/i],
    ["a fractional amount", { amount: 85000.5 }, /whole rupiah/],
    ["an amount sent as text", { amount: "85000" }, /amount/i],
    ["an amount too large to store", { amount: 2_147_483_648 }, /too large/],
    ["an empty description", { description: "   " }, /description/],
    ["an unknown reimbursement type", { reimbursementTypeId: "nope" }, /type/],
    ["no receipt file", { evidence: [] }, /at least one/],
    ["more than ten files", { evidence: Array.from({ length: 11 }, (_, i) => receipt(`r${i}.jpg`)) }, /ten/],
    [
      "a file type other than an image or PDF",
      { evidence: [{ ...receipt("notes.docx"), contentType: "application/msword" }] },
      /JPG, PNG, HEIC, or PDF/,
    ],
    ["a file over 20 MB", { evidence: [{ ...receipt(), size: 21 * 1024 * 1024 }] }, /20 MB/],
    [
      "a file that was not uploaded as a receipt",
      { evidence: [{ ...receipt(), storagePath: "tenants/kmplus/leave-letters/1791800000000-scan.pdf" }] },
      /uploaded/,
    ],
    ["the same file twice", { evidence: [receipt(), receipt()] }, /twice/],
  ])("refuses %s", (_label, patch, message) => {
    const outcome = file(createInitialState(), DIGIT, taxi(patch));
    expect(outcome).toMatchObject({ kind: "refused", error: expect.stringMatching(message) });
  });

  it("accepts an expense exactly 90 days old, a PDF, and ten files", () => {
    const tenFiles = Array.from({ length: 10 }, (_, i) => receipt(i === 0 ? "invoice.pdf" : `r${i}.png`));
    const outcome = file(createInitialState(), DIGIT, taxi({ expenseDate: "2026-07-15", evidence: tenFiles }));
    expect(outcome.kind).toBe("applied");
  });
});

describe("opening a receipt", () => {
  it("opens for the Person and an Admin, and for no one else", () => {
    const filed = file(createInitialState(), DIGIT, taxi());
    if (filed.kind !== "applied") throw new Error(filed.error);
    const path = receipt().storagePath;

    expect(readableStoredFile(viewAs(filed.next, DIGIT), path)).toEqual({ fileName: "taxi.jpg" });
    expect(readableStoredFile(viewAs(filed.next, ALFREDO), path)).toEqual({ fileName: "taxi.jpg" });
    expect(readableStoredFile(viewAs(filed.next, RAYHAN), path)).toBeNull();
  });
});

describe("receipt files stay with one request", () => {
  it("refuses a receipt path another request already holds", () => {
    const first = file(createInitialState(), DIGIT, taxi());
    if (first.kind !== "applied") throw new Error(first.error);
    const copy = file(first.next, RAYHAN, taxi());
    expect(copy).toMatchObject({ kind: "refused", error: expect.stringMatching(/another request/) });
    expect(readableStoredFile(viewAs(first.next, RAYHAN), receipt().storagePath)).toBeNull();
  });
});

