import { describe, expect, it } from "vitest";
import { groupByExpenseMonth, parseRupiahInput, reimbursementsToDecide } from "./reimbursement-view";
import { createInitialState } from "./fixtures";
import type { ReimbursementRequest } from "./types";

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

describe("monthly sums", () => {
  it("groups by the month of the expense date, newest month first, even when filed later", () => {
    const groups = groupByExpenseMonth([
      request("sep-late", { expenseDate: "2026-09-28", filedOn: "2026-10-12", amount: 50000 }),
      request("oct", { expenseDate: "2026-10-05", amount: 85000 }),
      request("sep", { expenseDate: "2026-09-03", amount: 20000 }),
    ]);
    expect(groups.map((group) => [group.month, group.total, group.rows.map((row) => row.id)])).toEqual([
      ["2026-10", 85000, ["oct"]],
      ["2026-09", 70000, ["sep-late", "sep"]],
    ]);
  });

  it("counts the approved amount once approved, and nothing for withdrawn or rejected requests", () => {
    const [october] = groupByExpenseMonth([
      request("pending", { amount: 100000 }),
      request("lowered", { amount: 300000, decision: "approved", approvedAmount: 250000 }),
      request("paid", { amount: 40000, decision: "approved", approvedAmount: 40000, paidOn: "2026-10-20" }),
      request("rejected", { amount: 999000, decision: "rejected", decisionNote: "No receipt match" }),
      request("withdrawn", { amount: 777000, withdrawnOn: "2026-10-14" }),
    ]);
    expect(october.total).toBe(390000);
    expect(october.rows).toHaveLength(5);
  });
});

describe("typing a rupiah amount", () => {
  it("reads whole rupiah, with or without dots between thousands", () => {
    expect(parseRupiahInput("85000")).toBe(85000);
    expect(parseRupiahInput("1.250.000")).toBe(1250000);
    expect(parseRupiahInput(" 85.000 ")).toBe(85000);
  });

  it("refuses decimals, commas, misplaced dots, and anything that is not a number", () => {
    for (const text of ["85000.5", "85.00", "1.2500.000", "85,000", "85000,50", ".85000", "85000.", "", "abc", "0", "-5000"]) {
      expect(parseRupiahInput(text)).toBeNull();
    }
  });
});

describe("reimbursements waiting on an Admin", () => {
  it("lists pending requests the viewer may decide, leaving out their own, withdrawn, and decided ones", () => {
    const state = {
      ...createInitialState(),
      currentPersonId: "person-alfredo",
      reimbursementRequests: [
        request("digit", { personId: "person-digit" }),
        request("own", { personId: "person-alfredo" }),
        request("withdrawn", { personId: "person-eka", withdrawnOn: "2026-10-12" }),
        request("decided", { personId: "person-eka", decision: "rejected", decisionNote: "No" }),
      ],
    };
    expect(reimbursementsToDecide(state).map((row) => row.id)).toEqual(["digit"]);
  });
});

