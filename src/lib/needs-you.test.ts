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
});
