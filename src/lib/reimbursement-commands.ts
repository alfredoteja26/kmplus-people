import { nid } from "./domain";
import { hasAdminGrant } from "./domain-query";
import type { AppState, ReimbursementDecision, ReimbursementEvidence, ReimbursementRequest, ReimbursementType } from "./types";
import { TENANT_ID } from "./types";
import {
  EVIDENCE_TYPE_REFUSAL,
  MAX_REIMBURSEMENT_FILES,
  MAX_UPLOAD_BYTES,
  reimbursementEvidenceAllowed,
  storagePathPrefix,
} from "./upload-rules";
import { audit, ensureWorkDeliveryCollections, reorderLabels, type CommandResult } from "./work-delivery-commands";
import { addDaysIso, isStaffedOnProject, jakartaTodayIso } from "./work-delivery-query";

export type ReimbursementEvidenceInput = {
  storagePath: string;
  fileName: string;
  contentType: string;
  size: number;
};

export type FileReimbursementInput = {
  /** Who the expense is for; defaults to the signed-in Person. Only Admin may name someone else. */
  personId?: string;
  expenseDate: string;
  amount: number;
  reimbursementTypeId: string;
  description: string;
  /** Optional; only a Project where the Person has Staffing on the expense date. */
  projectId?: string | null;
  evidence: ReimbursementEvidenceInput[];
};

/** How far back an expense date may reach from the day the request was filed (CONTEXT: ReimbursementRequest). */
export const REIMBURSEMENT_WINDOW_DAYS = 90;

/** The largest amount the database stores in a whole-rupiah column (Postgres `integer`). */
const MAX_AMOUNT = 2_147_483_647;

const EVIDENCE_PREFIX = storagePathPrefix("reimbursement-evidence");

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * The rules a request's own fields must meet on filing and on every edit; null when they hold. `requestId` is the
 * request being edited, whose own evidence paths are not "held by another request".
 */
function reimbursementFieldsRefusal(
  state: AppState,
  personId: string,
  input: FileReimbursementInput,
  filedOn: string,
  requestId: string | null,
): string | null {
  const expenseDate = String(input.expenseDate ?? "");
  if (!isCalendarDate(expenseDate)) return "Expense date is required";
  if (expenseDate > jakartaTodayIso()) return "Expense date cannot be in the future";
  if (expenseDate < addDaysIso(filedOn, -REIMBURSEMENT_WINDOW_DAYS)) {
    return `Expense date must be within ${REIMBURSEMENT_WINDOW_DAYS} days of filing`;
  }
  const amount = input.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return "Amount must be more than zero";
  if (!Number.isInteger(amount)) return "Amount must be whole rupiah";
  if (amount > MAX_AMOUNT) return "Amount is too large";
  if (!String(input.description ?? "").trim()) return "A description is required";
  if (!state.reimbursementTypes.some((row) => row.id === input.reimbursementTypeId)) {
    return "Choose a reimbursement type";
  }
  const projectId = input.projectId ?? null;
  if (projectId !== null) {
    if (!state.projects.some((row) => row.id === projectId)) return "Project not found";
    if (!isStaffedOnProject(state, personId, projectId, expenseDate)) {
      return "The Person is not staffed on that Project on the expense date";
    }
  }
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  if (evidence.length === 0) return "Attach at least one receipt";
  if (evidence.length > MAX_REIMBURSEMENT_FILES) return "Attach no more than ten receipts";
  // A path must be one uploaded as reimbursement evidence and not already on another request; otherwise a
  // request could point at someone else's file and the file-access check would open it (see file-access.ts).
  const heldElsewhere = new Set(
    state.reimbursementEvidence.filter((row) => row.reimbursementRequestId !== requestId).map((row) => row.storagePath),
  );
  const paths = new Set<string>();
  for (const file of evidence) {
    const storagePath = String(file?.storagePath ?? "");
    if (!storagePath.startsWith(EVIDENCE_PREFIX)) return "Every receipt must be uploaded first";
    if (paths.has(storagePath)) return "The same receipt is attached twice";
    if (heldElsewhere.has(storagePath)) return "A receipt is already on another request";
    paths.add(storagePath);
    if (!reimbursementEvidenceAllowed(String(file.contentType ?? ""), String(file.fileName ?? ""))) {
      return EVIDENCE_TYPE_REFUSAL;
    }
    const size = Number(file.size);
    if (!Number.isInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) return "Each receipt must be at most 20 MB";
  }
  return null;
}

export function fileReimbursementRequest(
  state: AppState,
  input: FileReimbursementInput,
): CommandResult<{ reimbursementRequestId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const personId = input.personId ?? state.currentPersonId;
  if (personId !== state.currentPersonId && !hasAdminGrant(state)) {
    return { state, reimbursementRequestId: null, error: "Only Admin may file a reimbursement for another Person" };
  }
  if (!state.people.some((row) => row.id === personId)) {
    return { state, reimbursementRequestId: null, error: "Person not found" };
  }
  const filedOn = jakartaTodayIso();
  const refusal = reimbursementFieldsRefusal(state, personId, input, filedOn, null);
  if (refusal) return { state, reimbursementRequestId: null, error: refusal };

  const reimbursementRequestId = nid("reimb");
  const row: ReimbursementRequest = {
    id: reimbursementRequestId,
    tenantId: TENANT_ID,
    personId,
    filedByPersonId: state.currentPersonId,
    filedOn,
    expenseDate: input.expenseDate,
    amount: input.amount,
    reimbursementTypeId: input.reimbursementTypeId,
    description: input.description.trim(),
    projectId: input.projectId ?? null,
    withdrawnOn: null,
    decision: null,
    approvedAmount: null,
    decisionNote: null,
    decidedByPersonId: null,
    decidedOn: null,
    paidOn: null,
    paidByPersonId: null,
  };
  const evidence = evidenceRows(reimbursementRequestId, input.evidence, []);
  const next = {
    ...state,
    reimbursementRequests: [...state.reimbursementRequests, row],
    reimbursementEvidence: [...state.reimbursementEvidence, ...evidence],
  };
  return {
    state: audit(next, "create", "ReimbursementRequest", reimbursementRequestId, `Filed ${input.amount}`),
    reimbursementRequestId,
    error: null,
  };
}

/** Evidence rows in the order given; a file already on the request keeps its row id. */
function evidenceRows(
  reimbursementRequestId: string,
  files: ReimbursementEvidenceInput[],
  existing: ReimbursementEvidence[],
): ReimbursementEvidence[] {
  return files.map((file, sortOrder) => ({
    id: existing.find((row) => row.storagePath === file.storagePath)?.id ?? nid("reimb-file"),
    tenantId: TENANT_ID,
    reimbursementRequestId,
    storagePath: file.storagePath,
    fileName: file.fileName,
    contentType: file.contentType,
    size: file.size,
    sortOrder,
  }));
}

/**
 * Who may still change a request: the Person it is for or the Admin who filed it, and only while it waits for a
 * decision. Null when the change may go ahead.
 */
function pendingChangeRefusal(state: AppState, row: ReimbursementRequest | undefined): string | null {
  if (!row) return "Reimbursement not found";
  if (state.currentPersonId !== row.personId && state.currentPersonId !== row.filedByPersonId) {
    return "Only the Person or the Admin who filed it may change a reimbursement";
  }
  if (row.withdrawnOn) return "This reimbursement is withdrawn";
  if (row.decision) return "This reimbursement is already decided";
  return null;
}

export type EditReimbursementInput = Omit<FileReimbursementInput, "personId">;

/** The filer corrects a pending request; every filing rule applies again, the 90 days counted from filedOn. */
export function editReimbursementRequest(
  state: AppState,
  reimbursementRequestId: string,
  input: EditReimbursementInput,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const row = state.reimbursementRequests.find((item) => item.id === reimbursementRequestId);
  const denied = pendingChangeRefusal(state, row);
  if (denied || !row) return { state, error: denied };
  const refusal = reimbursementFieldsRefusal(state, row.personId, input, row.filedOn, row.id);
  if (refusal) return { state, error: refusal };

  const edited: ReimbursementRequest = {
    ...row,
    expenseDate: input.expenseDate,
    amount: input.amount,
    reimbursementTypeId: input.reimbursementTypeId,
    description: input.description.trim(),
    projectId: input.projectId ?? null,
  };
  const kept = state.reimbursementEvidence.filter((item) => item.reimbursementRequestId !== row.id);
  const current = state.reimbursementEvidence.filter((item) => item.reimbursementRequestId === row.id);
  const next = {
    ...state,
    reimbursementRequests: state.reimbursementRequests.map((item) => (item.id === row.id ? edited : item)),
    reimbursementEvidence: [...kept, ...evidenceRows(row.id, input.evidence, current)],
  };
  return { state: audit(next, "update", "ReimbursementRequest", row.id, `Edited ${input.amount}`), error: null };
}

/** The filer takes back a pending request. It stays, with its evidence, as withdrawn history. */
export function withdrawReimbursementRequest(
  state: AppState,
  reimbursementRequestId: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const row = state.reimbursementRequests.find((item) => item.id === reimbursementRequestId);
  const denied = pendingChangeRefusal(state, row);
  if (denied || !row) return { state, error: denied };
  const next = {
    ...state,
    reimbursementRequests: state.reimbursementRequests.map((item) =>
      item.id === row.id ? { ...item, withdrawnOn: jakartaTodayIso() } : item,
    ),
  };
  return { state: audit(next, "update", "ReimbursementRequest", row.id, "Withdrawn"), error: null };
}

export type DecideReimbursementInput = {
  decision: ReimbursementDecision;
  /** Only on an approval below the asked amount; a full approval leaves it out. */
  approvedAmount?: number;
  /** Required on a rejection and on an approval at a lower amount. */
  note?: string;
};

/**
 * Any Admin other than the Person the request is for decides it, once, while it is pending (ADR-0013). An
 * approval may lower the amount; a lower amount or a rejection carries a note the Person reads.
 */
export function decideReimbursementRequest(
  state: AppState,
  reimbursementRequestId: string,
  input: DecideReimbursementInput,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  if (!hasAdminGrant(state)) return { state, error: "Admin grant required" };
  const row = state.reimbursementRequests.find((item) => item.id === reimbursementRequestId);
  if (!row) return { state, error: "Reimbursement not found" };
  if (row.personId === state.currentPersonId) return { state, error: "An Admin cannot decide their own reimbursement" };
  if (row.withdrawnOn) return { state, error: "A withdrawn reimbursement cannot be decided" };
  if (row.decision) return { state, error: "This reimbursement is already decided" };

  const note = String(input?.note ?? "").trim();
  let approvedAmount: number | null = null;
  if (input?.decision === "approved") {
    approvedAmount = row.amount;
    if (input.approvedAmount !== undefined && input.approvedAmount !== row.amount) {
      const lower = input.approvedAmount;
      if (typeof lower !== "number" || !Number.isInteger(lower) || lower < 1 || lower >= row.amount) {
        return { state, error: "A lower amount must be at least Rp 1 and below the asked amount" };
      }
      if (!note) return { state, error: "A lower amount needs a note" };
      approvedAmount = lower;
    }
  } else if (input?.decision === "rejected") {
    if (!note) return { state, error: "A rejection needs a note" };
  } else {
    return { state, error: "Decision must be approved or rejected" };
  }

  const decided: ReimbursementRequest = {
    ...row,
    decision: input.decision,
    approvedAmount,
    decisionNote: note || null,
    decidedByPersonId: state.currentPersonId,
    decidedOn: jakartaTodayIso(),
  };
  const next = {
    ...state,
    reimbursementRequests: state.reimbursementRequests.map((item) => (item.id === row.id ? decided : item)),
  };
  const detail =
    input.decision === "rejected"
      ? "Rejected"
      : approvedAmount === row.amount
        ? "Approved"
        : `Approved ${approvedAmount} of ${row.amount}`;
  return { state: audit(next, "update", "ReimbursementRequest", row.id, detail), error: null };
}

/** Paid changes are Admin work, never on one's own request, and only on an approved one (ADR-0013). */
function paidChangeRefusal(state: AppState, row: ReimbursementRequest | undefined): string | null {
  if (!hasAdminGrant(state)) return "Admin grant required";
  if (!row) return "Reimbursement not found";
  if (row.personId === state.currentPersonId) return "An Admin cannot mark their own reimbursement Paid";
  if (row.withdrawnOn || row.decision !== "approved") return "Only an approved reimbursement can be Paid";
  return null;
}

/** Records the day the money went out; marking again corrects the date. Payment itself happens outside the app. */
export function markReimbursementPaid(
  state: AppState,
  reimbursementRequestId: string,
  paidOn: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const row = state.reimbursementRequests.find((item) => item.id === reimbursementRequestId);
  const denied = paidChangeRefusal(state, row);
  if (denied || !row) return { state, error: denied };
  const date = String(paidOn ?? "");
  if (!isCalendarDate(date)) return { state, error: "Paid date is required" };
  if (date > jakartaTodayIso()) return { state, error: "Paid date cannot be in the future" };
  const next = {
    ...state,
    reimbursementRequests: state.reimbursementRequests.map((item) =>
      item.id === row.id ? { ...item, paidOn: date, paidByPersonId: state.currentPersonId } : item,
    ),
  };
  return { state: audit(next, "update", "ReimbursementRequest", row.id, `Paid on ${date}`), error: null };
}

/** Takes back a Paid date set by mistake; the request is approved again. */
export function clearReimbursementPaid(
  state: AppState,
  reimbursementRequestId: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const row = state.reimbursementRequests.find((item) => item.id === reimbursementRequestId);
  const denied = paidChangeRefusal(state, row);
  if (denied || !row) return { state, error: denied };
  if (!row.paidOn) return { state, error: "This reimbursement is not marked Paid" };
  const next = {
    ...state,
    reimbursementRequests: state.reimbursementRequests.map((item) =>
      item.id === row.id ? { ...item, paidOn: null, paidByPersonId: null } : item,
    ),
  };
  return { state: audit(next, "update", "ReimbursementRequest", row.id, "Paid date cleared"), error: null };
}

// ReimbursementType labels follow the LeaveType pattern: Admin adds, renames, and reorders; a label in use or the
// last label stays.

export function addReimbursementType(
  state: AppState,
  name: string,
): CommandResult<{ reimbursementTypeId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  if (!hasAdminGrant(state)) return { state, reimbursementTypeId: null, error: "Admin grant required" };
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return { state, reimbursementTypeId: null, error: "Reimbursement type name is required" };
  const reimbursementTypeId = nid("reimbursement-type");
  const row: ReimbursementType = {
    id: reimbursementTypeId,
    tenantId: TENANT_ID,
    name: trimmed,
    sortOrder: state.reimbursementTypes.length,
  };
  const next = { ...state, reimbursementTypes: [...state.reimbursementTypes, row] };
  return {
    state: audit(next, "create", "ReimbursementType", reimbursementTypeId, trimmed),
    reimbursementTypeId,
    error: null,
  };
}

export function renameReimbursementType(
  state: AppState,
  reimbursementTypeId: string,
  name: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  if (!hasAdminGrant(state)) return { state, error: "Admin grant required" };
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return { state, error: "Reimbursement type name is required" };
  if (!state.reimbursementTypes.some((row) => row.id === reimbursementTypeId)) {
    return { state, error: "Reimbursement type not found" };
  }
  const next = {
    ...state,
    reimbursementTypes: state.reimbursementTypes.map((row) =>
      row.id === reimbursementTypeId ? { ...row, name: trimmed } : row,
    ),
  };
  return { state: audit(next, "update", "ReimbursementType", reimbursementTypeId, trimmed), error: null };
}

export function reorderReimbursementTypes(state: AppState, orderedIds: string[]): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  if (!hasAdminGrant(state)) return { state, error: "Admin grant required" };
  const reordered = reorderLabels(state.reimbursementTypes, Array.isArray(orderedIds) ? orderedIds : []);
  if (!reordered) return { state, error: "Reimbursement type order must include every label once" };
  return {
    state: audit({ ...state, reimbursementTypes: reordered }, "update", "ReimbursementType", "order", "Reordered"),
    error: null,
  };
}

export function removeReimbursementType(
  state: AppState,
  reimbursementTypeId: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  if (!hasAdminGrant(state)) return { state, error: "Admin grant required" };
  if (state.reimbursementTypes.length <= 1) return { state, error: "At least one reimbursement type is required" };
  if (state.reimbursementRequests.some((row) => row.reimbursementTypeId === reimbursementTypeId)) {
    return { state, error: "A label still in use cannot be removed" };
  }
  const next = {
    ...state,
    reimbursementTypes: state.reimbursementTypes.filter((row) => row.id !== reimbursementTypeId),
  };
  return { state: audit(next, "delete", "ReimbursementType", reimbursementTypeId, "Removed"), error: null };
}
