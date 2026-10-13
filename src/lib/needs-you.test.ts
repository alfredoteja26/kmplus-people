import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import { needsYou } from "./needs-you";
import type { AppState } from "./types";

const TODAY = "2026-09-14";

function as(personId: string, role: AppState["currentRole"]): AppState {
  return { ...createInitialState(), currentPersonId: personId, currentRole: role };
}

describe("needsYou", () => {
  it("tells an Admin about approvals, missing portfolios, and late check-ins, linking to KPI Admin", () => {
    const items = needsYou(as("person-alfredo", "employee"), TODAY);
    const ids = items.map((row) => row.id);
    expect(ids).toContain("admin-approvals");
    expect(ids).toContain("admin-missing");
    expect(items.find((row) => row.id === "admin-missing")?.href).toBe("/kpi/cycle");
  });

  it("shows the Line Manager the portfolio waiting on their stamp", () => {
    const state = as("person-marcelino", "manager");
    const pending: AppState = {
      ...state,
      kpiSets: state.kpiSets.map((row) =>
        row.id === "set-digit" ? { ...row, status: "pending" as const, lineManagerApprovedBy: undefined, adminApprovedBy: undefined } : row,
      ),
    };
    const lm = needsYou(pending, TODAY).find((row) => row.id === "lm-portfolios");
    expect(lm?.count).toBe(1);
    expect(lm?.href).toBe("/kpi/team");
  });

  it("gives HR the CV queue but no Admin items without the grant", () => {
    const items = needsYou(as("person-denny", "hr"), TODAY);
    expect(items.some((row) => row.hat === "admin")).toBe(false);
    expect(items.find((row) => row.id === "hr-cvs")?.href).toBe("/cv");
  });

  it("tells an employee their own pending pack is waiting, without asking them to act", () => {
    const own = needsYou(as("person-alfredo", "employee"), TODAY).filter((row) => row.hat === "self");
    expect(own.some((row) => row.tone === "wait" && row.title.includes("waiting for approval"))).toBe(true);
  });

  it("tells an Admin how many reimbursements they may decide, leaving out their own", () => {
    const pending = (id: string, personId: string, patch = {}) => ({
      id,
      tenantId: "kmplus",
      personId,
      filedByPersonId: personId,
      filedOn: "2026-09-10",
      expenseDate: "2026-09-08",
      amount: 50000,
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
    });
    const state: AppState = {
      ...as("person-alfredo", "employee"),
      reimbursementRequests: [
        pending("r1", "person-digit"),
        pending("r2", "person-eka"),
        pending("r3", "person-alfredo"),
        pending("r4", "person-setyo", { withdrawnOn: "2026-09-11" }),
        pending("r5", "person-puti", { decision: "approved", approvedAmount: 50000 }),
      ],
    };
    const item = needsYou(state, TODAY).find((row) => row.id === "admin-reimbursements");
    expect(item).toMatchObject({ count: 2, title: "2 reimbursement requests to decide", href: "/project-admin/reimbursements" });

    const onlyOwn = { ...state, reimbursementRequests: [pending("r3", "person-alfredo")] };
    expect(needsYou(onlyOwn, TODAY).some((row) => row.id === "admin-reimbursements")).toBe(false);
    expect(needsYou({ ...state, currentPersonId: "person-digit" }, TODAY).some((row) => row.id === "admin-reimbursements")).toBe(false);
  });
});
