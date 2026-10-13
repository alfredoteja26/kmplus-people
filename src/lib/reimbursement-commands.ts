import { nid } from "./domain";
import { hasAdminGrant } from "./domain-query";
import type { AppState, ReimbursementDecision, ReimbursementEvidence, ReimbursementRequest } from "./types";
import { TENANT_ID } from "./types";
import {
  EVIDENCE_TYPE_REFUSAL,
  MAX_REIMBURSEMENT_FILES,
  MAX_UPLOAD_BYTES,
  reimbursementEvidenceAllowed,
  storagePathPrefix,
} from "./upload-rules";
import { audit, ensureWorkDeliveryCollections, type CommandResult } from "./work-delivery-commands";
import { addDaysIso, jakartaTodayIso } from "./work-delivery-query";

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
  const refusal = reimbursementFieldsRefusal(state, input, filedOn, null);
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
    projectId: null,
    withdrawnOn: null,
    decision: null,
    approvedAmount: null,
    decisionNote: null,
    decidedByPersonId: null,
    decidedOn: null,
    paidOn: null,
    paidByPersonId: null,
  };
  const evidence: ReimbursementEvidence[] = input.evidence.map((file, sortOrder) => ({
    id: nid("reimb-file"),
    tenantId: TENANT_ID,
    reimbursementRequestId,
    storagePath: file.storagePath,
    fileName: file.fileName,
    contentType: file.contentType,
    size: file.size,
    sortOrder,
  }));
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
