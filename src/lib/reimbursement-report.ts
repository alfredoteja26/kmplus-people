import { personName } from "./project-view";
import {
  REIMBURSEMENT_STATE_LABEL,
  reimbursementState,
  reimbursementTypeName,
  type ReimbursementState,
} from "./reimbursement-view";
import type { AppState, ReimbursementRequest } from "./types";
import type { XlsxSheet } from "./xlsx";

export type ReimbursementReportFilters = {
  personId?: string;
  reimbursementTypeId?: string;
  projectId?: string;
  state?: ReimbursementState;
  /** `YYYY-MM` of the expense date. */
  month?: string;
};

export type ReimbursementSums = { count: number; asked: number; approved: number; paid: number };
export type ReimbursementMonth = { month: string } & ReimbursementSums;

export type ReimbursementReport = {
  rows: ReimbursementRequest[];
  /** One entry per expense month in the rows, newest first. */
  months: ReimbursementMonth[];
  totals: ReimbursementSums;
};

function emptySums(): ReimbursementSums {
  return { count: 0, asked: 0, approved: 0, paid: 0 };
}

/**
 * Adds one request to a month's sums. A withdrawn request was taken back, so it adds nothing. Asked counts every
 * other request; approved counts approved and paid ones at their approved amount; paid counts the paid ones.
 */
function addTo(sums: ReimbursementSums, row: ReimbursementRequest) {
  const status = reimbursementState(row);
  if (status === "withdrawn") return;
  sums.count += 1;
  sums.asked += row.amount;
  if (status === "approved" || status === "paid") sums.approved += row.approvedAmount ?? row.amount;
  if (status === "paid") sums.paid += row.approvedAmount ?? row.amount;
}

/**
 * Admin's read of every reimbursement: filtered rows, newest expense first, with sums per expense month and in
 * total. Months follow the expense date, never the filing or Paid date. The screen and the export both read this.
 */
export function reimbursementReport(state: AppState, filters: ReimbursementReportFilters): ReimbursementReport {
  const rows = state.reimbursementRequests
    .filter(
      (row) =>
        (!filters.personId || row.personId === filters.personId) &&
        (!filters.reimbursementTypeId || row.reimbursementTypeId === filters.reimbursementTypeId) &&
        (!filters.projectId || row.projectId === filters.projectId) &&
        (!filters.state || reimbursementState(row) === filters.state) &&
        (!filters.month || row.expenseDate.startsWith(`${filters.month}-`)),
    )
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.filedOn.localeCompare(a.filedOn) || b.id.localeCompare(a.id));

  const byMonth = new Map<string, ReimbursementMonth>();
  const totals = emptySums();
  for (const row of rows) {
    const month = row.expenseDate.slice(0, 7);
    const sums = byMonth.get(month) ?? { month, ...emptySums() };
    addTo(sums, row);
    addTo(totals, row);
    byMonth.set(month, sums);
  }
  const months = [...byMonth.values()].filter((row) => row.count > 0).sort((a, b) => b.month.localeCompare(a.month));
  return { rows, months, totals };
}

/** The report as a workbook: every row on Requests, and the month sums plus a total on Monthly summary. */
export function reimbursementWorkbook(state: AppState, report: ReimbursementReport): XlsxSheet[] {
  const name = (personId: string | null) => (personId ? personName(state.people.find((row) => row.id === personId)) : "");
  const requests: XlsxSheet = {
    name: "Requests",
    columns: [
      "Person",
      "Expense date",
      "Type",
      "Project",
      "Description",
      "Asked (Rp)",
      "Approved (Rp)",
      "State",
      "Decision note",
      "Decided by",
      "Paid on",
    ],
    rows: report.rows.map((row) => {
      const project = row.projectId ? state.projects.find((item) => item.id === row.projectId) : undefined;
      const status = reimbursementState(row);
      return [
        name(row.personId),
        row.expenseDate,
        reimbursementTypeName(state, row),
        project ? `${project.code} · ${project.name}` : "",
        row.description,
        row.amount,
        status === "approved" || status === "paid" ? (row.approvedAmount ?? row.amount) : "",
        REIMBURSEMENT_STATE_LABEL[status],
        row.decisionNote ?? "",
        name(row.decidedByPersonId),
        row.paidOn ?? "",
      ];
    }),
  };
  const months: XlsxSheet = {
    name: "Monthly summary",
    columns: ["Month", "Requests", "Asked (Rp)", "Approved (Rp)", "Paid (Rp)"],
    rows: [
      ...report.months.map((row) => [row.month, row.count, row.asked, row.approved, row.paid]),
      ["Total", report.totals.count, report.totals.asked, report.totals.approved, report.totals.paid],
    ],
  };
  return [requests, months];
}
