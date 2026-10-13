import { describe, expect, it } from "vitest";
import { groupByExpenseMonth } from "./reimbursement-view";
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
