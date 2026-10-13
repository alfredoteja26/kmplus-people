import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import { reimbursementReport, reimbursementWorkbook } from "./reimbursement-report";
import type { AppState, ReimbursementRequest } from "./types";

function request(id: string, patch: Partial<ReimbursementRequest>): ReimbursementRequest {
  return {
    id,
    tenantId: "kmplus",
    personId: "person-digit",
    filedByPersonId: "person-digit",
    filedOn: "2026-10-13",
    expenseDate: "2026-10-01",
    amount: 100000,
    reimbursementTypeId: "reimbursement-type-1",
    description: "Taxi",
    projectId: null,
    withdrawnOn: null,
    decision: null,
    approvedAmount: null,
    decisionNote: null,
    decidedByPersonId: null,
    decidedOn: null,
    paidOn: null,
    paidByPersonId: null,
    ...patch,
  };
}

const approved = { decision: "approved" as const, decidedByPersonId: "person-alfredo", decidedOn: "2026-10-12" };

function sample(): AppState {
  const state = createInitialState();
  return {
    ...state,
    projects: [{ id: "prj-pln", tenantId: "kmplus", code: "PLN-01", name: "PLN audit", clientName: "PLN", startDate: "2026-01-01", endDate: null }],
    reimbursementRequests: [
      // October: pending 100k, approved-lower 250k of 300k, paid 40k
      request("oct-pending", { expenseDate: "2026-10-05" }),
      request("oct-lower", { expenseDate: "2026-10-02", amount: 300000, approvedAmount: 250000, decisionNote: "Hotel cap", reimbursementTypeId: "reimbursement-type-3", ...approved }),
      request("oct-paid", { personId: "person-rayhan", expenseDate: "2026-10-03", amount: 40000, approvedAmount: 40000, paidOn: "2026-10-12", projectId: "prj-pln", ...approved }),
      // September, filed in October: rejected 90k, withdrawn 70k, paid 60k
      request("sep-rejected", { expenseDate: "2026-09-29", amount: 90000, decision: "rejected", decisionNote: "Personal", decidedByPersonId: "person-alfredo", decidedOn: "2026-10-12" }),
      request("sep-withdrawn", { expenseDate: "2026-09-20", amount: 70000, withdrawnOn: "2026-10-01" }),
      request("sep-paid", { personId: "person-rayhan", expenseDate: "2026-09-15", amount: 60000, approvedAmount: 60000, paidOn: "2026-10-01", ...approved }),
    ],
  } as AppState;
}

describe("reimbursement report", () => {
  it("sums each expense month: count and asked leave out withdrawn, approved counts approved and paid, paid counts paid", () => {
    const report = reimbursementReport(sample(), {});
    expect(report.months).toEqual([
      { month: "2026-10", count: 3, asked: 440000, approved: 290000, paid: 40000 },
      { month: "2026-09", count: 2, asked: 150000, approved: 60000, paid: 60000 },
    ]);
    expect(report.totals).toEqual({ count: 5, asked: 590000, approved: 350000, paid: 100000 });
    expect(report.rows).toHaveLength(6);
  });

  it("narrows by Person, type, Project, state, and month, and the filters combine", () => {
    const ids = (filters: Parameters<typeof reimbursementReport>[1]) => reimbursementReport(sample(), filters).rows.map((row) => row.id).sort();
    expect(ids({ personId: "person-rayhan" })).toEqual(["oct-paid", "sep-paid"]);
    expect(ids({ reimbursementTypeId: "reimbursement-type-3" })).toEqual(["oct-lower"]);
    expect(ids({ projectId: "prj-pln" })).toEqual(["oct-paid"]);
    expect(ids({ state: "paid" })).toEqual(["oct-paid", "sep-paid"]);
    expect(ids({ month: "2026-09" })).toEqual(["sep-paid", "sep-rejected", "sep-withdrawn"]);
    expect(ids({ month: "2026-09", state: "paid", personId: "person-rayhan" })).toEqual(["sep-paid"]);
    expect(reimbursementReport(sample(), { month: "2026-09" }).totals).toEqual({ count: 2, asked: 150000, approved: 60000, paid: 60000 });
  });

  it("lists rows newest expense first and builds a workbook with the same rows and a monthly sheet", () => {
    const state = sample();
    const report = reimbursementReport(state, { month: "2026-10" });
    expect(report.rows.map((row) => row.id)).toEqual(["oct-pending", "oct-paid", "oct-lower"]);

    const [requests, months] = reimbursementWorkbook(state, report);
    expect(requests.columns).toEqual([
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
    ]);
    expect(requests.rows).toHaveLength(3);
    const lower = requests.rows[2];
    expect(lower.slice(1, 8)).toEqual(["2026-10-02", "Accommodation", "", "Taxi", 300000, 250000, "Approved"]);
    expect(requests.rows[1][3]).toBe("PLN-01 · PLN audit");
    expect(requests.rows[0][6]).toBe("");

    expect(months.columns).toEqual(["Month", "Requests", "Asked (Rp)", "Approved (Rp)", "Paid (Rp)"]);
    expect(months.rows).toEqual([
      ["2026-10", 3, 440000, 290000, 40000],
      ["Total", 3, 440000, 290000, 40000],
    ]);
  });
});
