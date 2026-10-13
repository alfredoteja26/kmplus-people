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


function decide(state: AppState, session: { personId: string; role: Role }, id: string, input: Record<string, unknown>) {
  return executeCommand(state, session, { name: "decideReimbursementRequest", args: [id, input] });
}

function filedBy(session: { personId: string; role: Role }, patch: Record<string, unknown> = {}, state = createInitialState()) {
  const outcome = file(state, session, taxi(patch));
  if (outcome.kind !== "applied") throw new Error(outcome.error);
  return { state: outcome.next, id: outcome.result.reimbursementRequestId as string };
}

function withSecondAdmin(state: AppState, personId: string): AppState {
  return { ...state, users: state.users.map((row) => (row.personId === personId ? { ...row, adminGrant: true } : row)) };
}

describe("deciding a reimbursement", () => {
  it("approves at the full amount and shows the outcome to the Person", () => {
    const { state, id } = filedBy(DIGIT);
    const outcome = decide(state, ALFREDO, id, { decision: "approved" });
    expect(outcome.kind).toBe("applied");
    if (outcome.kind !== "applied") return;
    const mine = viewAs(outcome.next, DIGIT).reimbursementRequests[0];
    expect(mine).toMatchObject({
      decision: "approved",
      approvedAmount: 85000,
      decisionNote: null,
      decidedByPersonId: "person-alfredo",
      decidedOn: "2026-10-13",
    });
  });

  it("approves at a lower amount only with a note and an amount below the asked one", () => {
    const { state, id } = filedBy(DIGIT);
    expect(decide(state, ALFREDO, id, { decision: "approved", approvedAmount: 60000 })).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/note/),
    });
    for (const approvedAmount of [0, -1, 90000, 60000.5]) {
      expect(decide(state, ALFREDO, id, { decision: "approved", approvedAmount, note: "Over the limit" })).toMatchObject({
        kind: "refused",
        error: expect.stringMatching(/lower amount/),
      });
    }
    const sameAmount = decide(state, ALFREDO, id, { decision: "approved", approvedAmount: 85000 });
    expect(sameAmount.kind === "applied" && sameAmount.next.reimbursementRequests[0].approvedAmount).toBe(85000);
    const lowered = decide(state, ALFREDO, id, { decision: "approved", approvedAmount: 60000, note: "Meal limit is Rp 60.000" });
    if (lowered.kind !== "applied") throw new Error(lowered.kind === "refused" ? lowered.error : "invalid");
    expect(lowered.next.reimbursementRequests[0]).toMatchObject({
      approvedAmount: 60000,
      decisionNote: "Meal limit is Rp 60.000",
    });
  });

  it("rejects only with a note", () => {
    const { state, id } = filedBy(DIGIT);
    expect(decide(state, ALFREDO, id, { decision: "rejected", note: "  " })).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/note/),
    });
    const rejected = decide(state, ALFREDO, id, { decision: "rejected", note: "Receipt is for a personal trip" });
    if (rejected.kind !== "applied") throw new Error("not applied");
    expect(rejected.next.reimbursementRequests[0]).toMatchObject({ decision: "rejected", approvedAmount: null });
  });

  it("refuses a non-Admin, a second decision, and an unknown request", () => {
    const { state, id } = filedBy(DIGIT);
    expect(decide(state, RAYHAN, id, { decision: "approved" })).toMatchObject({ kind: "refused" });
    expect(decide(state, DIGIT, id, { decision: "approved" })).toMatchObject({ kind: "refused" });
    const once = decide(state, ALFREDO, id, { decision: "approved" });
    if (once.kind !== "applied") throw new Error("not applied");
    expect(decide(once.next, ALFREDO, id, { decision: "rejected", note: "Changed my mind" })).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/already decided/),
    });
    expect(decide(state, ALFREDO, "reimb-nope", { decision: "approved" })).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/not found/),
    });
  });

  it("never lets an Admin decide their own request, so a lone Admin's request waits for a second Admin", () => {
    const { state, id } = filedBy(ALFREDO);
    expect(decide(state, ALFREDO, id, { decision: "approved" })).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/own/),
    });
    const second = withSecondAdmin(state, "person-rayhan");
    expect(decide(second, RAYHAN, id, { decision: "approved" }).kind).toBe("applied");
  });

  it("lets the Admin who filed for another Person decide it", () => {
    const { state, id } = filedBy(ALFREDO, { personId: "person-digit" });
    expect(decide(state, ALFREDO, id, { decision: "approved" }).kind).toBe("applied");
  });
});

function edit(state: AppState, session: { personId: string; role: Role }, id: string, input: Record<string, unknown>) {
  return executeCommand(state, session, { name: "editReimbursementRequest", args: [id, input] });
}

function withdraw(state: AppState, session: { personId: string; role: Role }, id: string) {
  return executeCommand(state, session, { name: "withdrawReimbursementRequest", args: [id] });
}

describe("changing a pending reimbursement", () => {
  it("edits the fields and swaps receipts while it is pending", () => {
    const { state, id } = filedBy(DIGIT, { evidence: [receipt("a.jpg"), receipt("b.jpg")] });
    const outcome = edit(state, DIGIT, id, taxi({ amount: 90000, description: "Taxi, both ways", evidence: [receipt("b.jpg"), receipt("c.pdf")] }));
    if (outcome.kind !== "applied") throw new Error(outcome.kind === "refused" ? outcome.error : "invalid");
    expect(outcome.next.reimbursementRequests[0]).toMatchObject({ amount: 90000, description: "Taxi, both ways", filedOn: "2026-10-13" });
    expect(outcome.next.reimbursementEvidence.map((row) => [row.fileName, row.sortOrder])).toEqual([
      ["b.jpg", 0],
      ["c.pdf", 1],
    ]);
  });

  it("measures the 90 days from the original filing date, not the edit date", () => {
    const { state, id } = filedBy(DIGIT, { expenseDate: "2026-07-20" });
    vi.setSystemTime(new Date("2026-11-30T03:00:00Z"));
    expect(edit(state, DIGIT, id, taxi({ expenseDate: "2026-07-16" })).kind).toBe("applied");
    expect(edit(state, DIGIT, id, taxi({ expenseDate: "2026-07-14" }))).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/90 days/),
    });
  });

  it("reapplies every filing rule on edit", () => {
    const { state, id } = filedBy(DIGIT);
    expect(edit(state, DIGIT, id, taxi({ evidence: [] }))).toMatchObject({ kind: "refused", error: expect.stringMatching(/at least one/) });
    expect(edit(state, DIGIT, id, taxi({ amount: 0 }))).toMatchObject({ kind: "refused" });
    const other = filedBy(RAYHAN, { evidence: [receipt("rayhan.jpg")] }, state);
    expect(edit(other.state, DIGIT, id, taxi({ evidence: [receipt("rayhan.jpg")] }))).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/another request/),
    });
  });

  it("withdraws a pending request and keeps it, with its receipts, as history", () => {
    const { state, id } = filedBy(DIGIT);
    const outcome = withdraw(state, DIGIT, id);
    if (outcome.kind !== "applied") throw new Error("not applied");
    const mine = viewAs(outcome.next, DIGIT);
    expect(mine.reimbursementRequests[0]).toMatchObject({ id, withdrawnOn: "2026-10-13" });
    expect(mine.reimbursementEvidence).toHaveLength(1);
    expect(withdraw(outcome.next, DIGIT, id)).toMatchObject({ kind: "refused", error: expect.stringMatching(/withdrawn/) });
    expect(edit(outcome.next, DIGIT, id, taxi())).toMatchObject({ kind: "refused", error: expect.stringMatching(/withdrawn/) });
    expect(decide(outcome.next, ALFREDO, id, { decision: "approved" })).toMatchObject({ kind: "refused" });
  });

  it("lets only the Person it is for and the Admin who filed it change it", () => {
    const own = filedBy(DIGIT);
    expect(edit(own.state, RAYHAN, own.id, taxi())).toMatchObject({ kind: "refused", error: expect.stringMatching(/Only/) });
    expect(withdraw(own.state, ALFREDO, own.id)).toMatchObject({ kind: "refused", error: expect.stringMatching(/Only/) });

    const forDigit = filedBy(ALFREDO, { personId: "person-digit" });
    expect(edit(forDigit.state, ALFREDO, forDigit.id, taxi({ amount: 70000 })).kind).toBe("applied");
    expect(withdraw(forDigit.state, DIGIT, forDigit.id).kind).toBe("applied");
    const second = withSecondAdmin(forDigit.state, "person-rayhan");
    expect(withdraw(second, RAYHAN, forDigit.id)).toMatchObject({ kind: "refused" });
  });

  it("locks the request once an Admin decides it", () => {
    const { state, id } = filedBy(DIGIT);
    const decided = decide(state, ALFREDO, id, { decision: "approved" });
    if (decided.kind !== "applied") throw new Error("not applied");
    expect(edit(decided.next, DIGIT, id, taxi({ amount: 1 }))).toMatchObject({ kind: "refused", error: expect.stringMatching(/decided/) });
    expect(withdraw(decided.next, DIGIT, id)).toMatchObject({ kind: "refused", error: expect.stringMatching(/decided/) });
  });
});

function markPaid(state: AppState, session: { personId: string; role: Role }, id: string, paidOn: string) {
  return executeCommand(state, session, { name: "markReimbursementPaid", args: [id, paidOn] });
}

function clearPaid(state: AppState, session: { personId: string; role: Role }, id: string) {
  return executeCommand(state, session, { name: "clearReimbursementPaid", args: [id] });
}

function approved(session = DIGIT, decider = ALFREDO) {
  const { state, id } = filedBy(session);
  const outcome = decide(state, decider, id, { decision: "approved" });
  if (outcome.kind !== "applied") throw new Error("not applied");
  return { state: outcome.next, id };
}

describe("marking a reimbursement paid", () => {
  it("marks an approved request Paid, corrects the date, and clears it again", () => {
    const { state, id } = approved();
    const paid = markPaid(state, ALFREDO, id, "2026-10-12");
    if (paid.kind !== "applied") throw new Error(paid.kind === "refused" ? paid.error : "invalid");
    expect(viewAs(paid.next, DIGIT).reimbursementRequests[0]).toMatchObject({
      paidOn: "2026-10-12",
      paidByPersonId: "person-alfredo",
    });

    const corrected = markPaid(paid.next, ALFREDO, id, "2026-10-13");
    if (corrected.kind !== "applied") throw new Error("not applied");
    expect(corrected.next.reimbursementRequests[0].paidOn).toBe("2026-10-13");

    const cleared = clearPaid(corrected.next, ALFREDO, id);
    if (cleared.kind !== "applied") throw new Error("not applied");
    expect(cleared.next.reimbursementRequests[0]).toMatchObject({ paidOn: null, paidByPersonId: null, decision: "approved" });
    expect(cleared.next.audit.slice(0, 3).map((row) => row.detail)).toEqual([
      "Paid date cleared",
      "Paid on 2026-10-13",
      "Paid on 2026-10-12",
    ]);
  });

  it("refuses a Paid date in the future or not a real date", () => {
    const { state, id } = approved();
    expect(markPaid(state, ALFREDO, id, "2026-10-14")).toMatchObject({ kind: "refused", error: expect.stringMatching(/future/) });
    expect(markPaid(state, ALFREDO, id, "2026-02-30")).toMatchObject({ kind: "refused", error: expect.stringMatching(/date/) });
  });

  it("only pays approved requests", () => {
    const pending = filedBy(DIGIT);
    expect(markPaid(pending.state, ALFREDO, pending.id, "2026-10-13")).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/approved/),
    });
    const rejected = decide(pending.state, ALFREDO, pending.id, { decision: "rejected", note: "Personal trip" });
    if (rejected.kind !== "applied") throw new Error("not applied");
    expect(markPaid(rejected.next, ALFREDO, pending.id, "2026-10-13")).toMatchObject({ kind: "refused" });
    const withdrawn = withdraw(pending.state, DIGIT, pending.id);
    if (withdrawn.kind !== "applied") throw new Error("not applied");
    expect(markPaid(withdrawn.next, ALFREDO, pending.id, "2026-10-13")).toMatchObject({ kind: "refused" });
    expect(clearPaid(pending.state, ALFREDO, pending.id)).toMatchObject({ kind: "refused", error: expect.stringMatching(/approved/) });
    const unpaid = approved();
    expect(clearPaid(unpaid.state, ALFREDO, unpaid.id)).toMatchObject({ kind: "refused", error: expect.stringMatching(/not marked Paid/) });
  });

  it("refuses non-Admins and an Admin paying their own request", () => {
    const { state, id } = approved();
    expect(markPaid(state, DIGIT, id, "2026-10-13")).toMatchObject({ kind: "refused" });
    expect(markPaid(state, RAYHAN, id, "2026-10-13")).toMatchObject({ kind: "refused" });

    const own = filedBy(ALFREDO);
    const second = withSecondAdmin(own.state, "person-rayhan");
    const decided = decide(second, RAYHAN, own.id, { decision: "approved" });
    if (decided.kind !== "applied") throw new Error("not applied");
    expect(markPaid(decided.next, ALFREDO, own.id, "2026-10-13")).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/own/),
    });
    const paidBySecond = markPaid(decided.next, RAYHAN, own.id, "2026-10-13");
    if (paidBySecond.kind !== "applied") throw new Error("not applied");
    expect(clearPaid(paidBySecond.next, ALFREDO, own.id)).toMatchObject({ kind: "refused", error: expect.stringMatching(/own/) });
  });
});

/** An Admin opens a Project and staffs Digit on it from Sept 1 to Oct 10. */
function withProject(): { state: AppState; projectId: string } {
  const opened = executeCommand(createInitialState(), ALFREDO, {
    name: "openProject",
    args: [{ code: "PLN-01", name: "PLN audit", startDate: "2026-09-01" }],
  });
  if (opened.kind !== "applied") throw new Error("project not opened");
  const projectId = opened.result.projectId as string;
  const staffed = executeCommand(opened.next, ALFREDO, {
    name: "addStaffing",
    args: [{ personId: "person-digit", projectId, startDate: "2026-09-01", endDate: "2026-10-10", load: 50 }],
  });
  if (staffed.kind !== "applied") throw new Error(staffed.kind === "refused" ? staffed.error : "invalid");
  return { state: staffed.next, projectId };
}

describe("linking a Project", () => {
  it("files with a Project the Person is staffed on that date, and without one", () => {
    const { state, projectId } = withProject();
    const linked = file(state, DIGIT, taxi({ projectId, expenseDate: "2026-10-10" }));
    expect(linked.kind === "applied" && linked.next.reimbursementRequests[0].projectId).toBe(projectId);
    expect(file(state, DIGIT, taxi()).kind).toBe("applied");
  });

  it("refuses a Project not covered by the Person's Staffing on the expense date", () => {
    const { state, projectId } = withProject();
    expect(file(state, DIGIT, taxi({ projectId, expenseDate: "2026-10-11" }))).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/staffed/),
    });
    expect(file(state, RAYHAN, taxi({ projectId, expenseDate: "2026-10-01" }))).toMatchObject({ kind: "refused" });
    expect(file(state, DIGIT, taxi({ projectId: "prj-nope" }))).toMatchObject({ kind: "refused" });
  });

  it("checks the Person's Staffing, not the Admin's, when an Admin files for them", () => {
    const { state, projectId } = withProject();
    expect(file(state, ALFREDO, taxi({ personId: "person-digit", projectId, expenseDate: "2026-10-01" })).kind).toBe("applied");
    expect(file(state, ALFREDO, taxi({ projectId, expenseDate: "2026-10-01" }))).toMatchObject({ kind: "refused" });
  });

  it("rechecks the Project when an edit moves the expense date", () => {
    const { state, projectId } = withProject();
    const filed = filedBy(DIGIT, { projectId, expenseDate: "2026-10-05" }, state);
    expect(edit(filed.state, DIGIT, filed.id, taxi({ projectId, expenseDate: "2026-10-12" }))).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/staffed/),
    });
    const unlinked = edit(filed.state, DIGIT, filed.id, taxi({ projectId: null, expenseDate: "2026-10-12" }));
    expect(unlinked.kind === "applied" && unlinked.next.reimbursementRequests.at(-1)?.projectId).toBeNull();
  });
});

const MARCELINO = { personId: "person-marcelino", role: "manager" as Role }; // Digit's Line Manager
const PUTI = { personId: "person-puti", role: "manager" as Role }; // Line Manager of the Sales seats
const EKA = { personId: "person-eka", role: "employee" as Role }; // Digit's teammate under Marcelino

/** Digit also holds a Sales seat, so Puti becomes a second Line Manager. */
function withSecondAssignment(state: AppState): AppState {
  const digit = state.assignments.find((row) => row.personId === "person-digit" && row.endDate === null)!;
  return { ...state, assignments: [...state.assignments, { ...digit, id: "asg-digit-sales", positionId: "pos-sales-spec" }] };
}

describe("a Line Manager reading the team's reimbursements", () => {
  it("shows a report's requests and receipts to their Line Manager, and not a teammate's or HR's view", () => {
    const { state } = filedBy(DIGIT);
    const path = receipt().storagePath;
    const manager = viewAs(state, MARCELINO);
    expect(manager.reimbursementRequests.map((row) => row.personId)).toEqual(["person-digit"]);
    expect(readableStoredFile(manager, path)).toEqual({ fileName: "taxi.jpg" });

    for (const session of [EKA, DENNY, PUTI]) {
      expect(viewAs(state, session).reimbursementRequests).toEqual([]);
      expect(readableStoredFile(viewAs(state, session), path)).toBeNull();
    }
  });

  it("does not show the Line Manager anyone outside their reports", () => {
    const { state } = filedBy(ALFREDO);
    expect(viewAs(state, MARCELINO).reimbursementRequests).toEqual([]);
  });

  it("shows a Person with two current Assignments to both Line Managers", () => {
    const { state } = filedBy(DIGIT, {}, withSecondAssignment(createInitialState()));
    expect(viewAs(state, MARCELINO).reimbursementRequests).toHaveLength(1);
    expect(viewAs(state, PUTI).reimbursementRequests).toHaveLength(1);
  });

  it("refuses every change from the Line Manager", () => {
    const { state, id } = filedBy(DIGIT);
    expect(edit(state, MARCELINO, id, taxi({ amount: 1 }))).toMatchObject({ kind: "refused" });
    expect(withdraw(state, MARCELINO, id)).toMatchObject({ kind: "refused" });
    expect(decide(state, MARCELINO, id, { decision: "approved" })).toMatchObject({ kind: "refused" });
    const { state: paidReady, id: approvedId } = approved();
    expect(markPaid(paidReady, MARCELINO, approvedId, "2026-10-13")).toMatchObject({ kind: "refused" });
  });
});

function run(state: AppState, session: { personId: string; role: Role }, name: string, args: unknown[]) {
  return executeCommand(state, session, { name, args });
}

describe("configuring reimbursement types", () => {
  it("lets an Admin add, rename, and reorder types, and refuses everyone else", () => {
    const added = run(createInitialState(), ALFREDO, "addReimbursementType", ["Parking"]);
    if (added.kind !== "applied") throw new Error("not applied");
    const parkingId = added.result.reimbursementTypeId as string;
    expect(added.next.reimbursementTypes.at(-1)).toMatchObject({ name: "Parking", sortOrder: 5 });

    const renamed = run(added.next, ALFREDO, "renameReimbursementType", [parkingId, "Parking & tolls"]);
    if (renamed.kind !== "applied") throw new Error("not applied");
    const order = [parkingId, ...renamed.next.reimbursementTypes.filter((row) => row.id !== parkingId).map((row) => row.id)];
    const reordered = run(renamed.next, ALFREDO, "reorderReimbursementTypes", [order]);
    if (reordered.kind !== "applied") throw new Error("not applied");
    const first = [...reordered.next.reimbursementTypes].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    expect(first).toMatchObject({ id: parkingId, name: "Parking & tolls" });
    expect(reordered.next.audit[0]).toMatchObject({ entity: "ReimbursementType" });

    expect(run(createInitialState(), DIGIT, "addReimbursementType", ["Parking"])).toMatchObject({ kind: "refused" });
    expect(run(createInitialState(), ALFREDO, "addReimbursementType", ["  "])).toMatchObject({ kind: "refused" });
    expect(run(createInitialState(), ALFREDO, "reorderReimbursementTypes", [["reimbursement-type-1"]])).toMatchObject({ kind: "refused" });
  });

  it("refuses removing a type any request uses, even a withdrawn one, or the last type", () => {
    const { state, id } = filedBy(DIGIT);
    const gone = withdraw(state, DIGIT, id);
    if (gone.kind !== "applied") throw new Error("not applied");
    expect(run(gone.next, ALFREDO, "removeReimbursementType", ["reimbursement-type-1"])).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/in use/),
    });
    expect(run(gone.next, ALFREDO, "removeReimbursementType", ["reimbursement-type-5"]).kind).toBe("applied");

    const onlyOne = { ...createInitialState(), reimbursementTypes: createInitialState().reimbursementTypes.slice(0, 1) };
    expect(run(onlyOne, ALFREDO, "removeReimbursementType", ["reimbursement-type-1"])).toMatchObject({
      kind: "refused",
      error: expect.stringMatching(/At least one/),
    });
  });
});

describe("refusal messages name the action", () => {
  it("tells a non-Admin which Admin-only action they tried", () => {
    const { state, id } = approved();
    expect(markPaid(state, DIGIT, id, "2026-10-13")).toMatchObject({ error: expect.stringMatching(/mark a reimbursement Paid/) });
    expect(clearPaid(state, DIGIT, id)).toMatchObject({ error: expect.stringMatching(/mark a reimbursement Paid/) });
    expect(decide(filedBy(DIGIT).state, DIGIT, filedBy(DIGIT).id, { decision: "approved" })).toMatchObject({
      error: expect.stringMatching(/decide a reimbursement/),
    });
    expect(run(createInitialState(), DIGIT, "addReimbursementType", ["Parking"])).toMatchObject({
      error: expect.stringMatching(/reimbursement types/),
    });
  });
});

