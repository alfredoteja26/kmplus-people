import type { AppState, ReimbursementEvidence, ReimbursementRequest } from "@/lib/types";

export type ReimbursementState = "pending" | "withdrawn" | "approved" | "rejected" | "paid";

/** A request's state is derived from its fields, never stored (CONTEXT: ReimbursementRequest). */
export function reimbursementState(row: ReimbursementRequest): ReimbursementState {
  if (row.withdrawnOn) return "withdrawn";
  if (row.decision === "rejected") return "rejected";
  if (row.decision === "approved") return row.paidOn ? "paid" : "approved";
  return "pending";
}

export const REIMBURSEMENT_STATE_LABEL: Record<ReimbursementState, string> = {
  pending: "Waiting for a decision",
  withdrawn: "Withdrawn",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

export function reimbursementStateTone(state: ReimbursementState): "accent" | "success" | "danger" | "neutral" {
  if (state === "pending") return "accent";
  if (state === "rejected") return "danger";
  if (state === "withdrawn") return "neutral";
  return "success";
}

const RUPIAH = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 1250000 → "Rp 1.250.000". */
export function formatRupiah(amount: number): string {
  return `Rp ${RUPIAH.format(amount)}`;
}

export function reimbursementTypeName(state: AppState, row: ReimbursementRequest): string {
  return state.reimbursementTypes.find((type) => type.id === row.reimbursementTypeId)?.name ?? "Reimbursement";
}

/** The requests that are for this Person, newest expense first, then newest filing first. */
export function reimbursementsFor(state: AppState, personId: string): ReimbursementRequest[] {
  return state.reimbursementRequests
    .filter((row) => row.personId === personId)
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.filedOn.localeCompare(a.filedOn) || b.id.localeCompare(a.id));
}

export function evidenceFor(state: AppState, reimbursementRequestId: string): ReimbursementEvidence[] {
  return state.reimbursementEvidence
    .filter((row) => row.reimbursementRequestId === reimbursementRequestId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** What a request is expected to pay: the approved amount once approved, the asked amount while pending, else 0. */
export function expectedAmount(row: ReimbursementRequest): number {
  const status = reimbursementState(row);
  if (status === "withdrawn" || status === "rejected") return 0;
  if (status === "pending") return row.amount;
  return row.approvedAmount ?? row.amount;
}

export type ExpenseMonth = { month: string; total: number; rows: ReimbursementRequest[] };

/**
 * Requests grouped by the calendar month of their expense date (`YYYY-MM`), newest month first, each with its
 * expected total. Reimbursements are reported monthly by when the money was spent, not when it was filed or paid.
 * Rows keep the order they arrive in.
 */
export function groupByExpenseMonth(rows: ReimbursementRequest[]): ExpenseMonth[] {
  const months = new Map<string, ExpenseMonth>();
  for (const row of rows) {
    const month = row.expenseDate.slice(0, 7);
    const group = months.get(month) ?? { month, total: 0, rows: [] };
    group.total += expectedAmount(row);
    group.rows.push(row);
    months.set(month, group);
  }
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-10" → "October 2026". */
export function formatExpenseMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return year && monthNumber ? MONTH.format(new Date(Date.UTC(year, monthNumber - 1, 1))) : month;
}

/**
 * What someone typed in a rupiah field, as whole rupiah: digits, optionally with a dot between every three
 * ("1.250.000"). Anything else, including a decimal like "85000.5" or a comma, is null rather than guessed at.
 */
export function parseRupiahInput(text: string): number | null {
  const trimmed = text.trim();
  if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(trimmed)) return null;
  const amount = Number(trimmed.replace(/\./g, ""));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

/** Pending requests the signed-in Admin may decide: never their own (ADR-0013). Home and the queue both count these. */
export function reimbursementsToDecide(state: AppState): ReimbursementRequest[] {
  return state.reimbursementRequests.filter(
    (row) => reimbursementState(row) === "pending" && row.personId !== state.currentPersonId,
  );
}
