import { describe, expect, it } from "vitest";
import { isRootAssignment } from "./cascade";
import { submitKpiSet, upsertKpiItem } from "./commands";
import { itemsForSet } from "./domain";
import { createInitialState } from "./fixtures";
import {
  approvalDetail,
  itemRowView,
  latestActual,
  plainKpiError,
  portfolioStep,
  rowNote,
  scoreFact,
  submitBlocker,
  timeFact,
  weightFact,
} from "./my-kpi-view";
import type { AppState, KpiCycle, KpiItem } from "./types";

function nonRootSet(state: AppState) {
  const kpiSet = state.kpiSets.find(
    (row) => row.cycleId === "cycle-2026" && !isRootAssignment(state, row.assignmentId) && itemsForSet(state, row.id).length > 1,
  );
  if (!kpiSet) throw new Error("fixture needs a non-root KPI Portfolio with items");
  return kpiSet;
}

/** Owner of a portfolio, editing it as a draft. */
function asOwnerDraft(state: AppState, kpiSetId: string): AppState {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId)!;
  const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId)!;
  return {
    ...state,
    currentPersonId: assignment.personId,
    currentRole: "employee",
    kpiSets: state.kpiSets.map((row) =>
      row.id === kpiSetId ? { ...row, status: "draft", lineManagerApprovedBy: undefined, adminApprovedBy: undefined } : row,
    ),
  };
}

const cycle: KpiCycle = {
  id: "cycle",
  tenantId: "kmplus",
  name: "2026",
  year: 2026,
  status: "open",
  phase: "planning",
  planningEndsOn: "2026-10-20",
  adjustmentOpen: false,
  checkInCadence: "quarterly",
  checkInWindows: [],
};

describe("weight fact", () => {
  it("is success only at exactly 100", () => {
    expect(weightFact(100)).toEqual({ text: "100% of 100%", tone: "success", percent: 100 });
    expect(weightFact(60)).toMatchObject({ text: "60% of 100%", tone: "accent", percent: 60 });
    expect(weightFact(120)).toMatchObject({ tone: "warning", percent: 100 });
  });
});

describe("score fact", () => {
  it("shows the live score, the stored score, or a promise", () => {
    expect(scoreFact("planning", null, undefined)).toEqual({ label: "Score", value: null, detail: "Shown once approved" });
    expect(scoreFact("monitoring", null, undefined).value).toBeNull();
    expect(scoreFact("monitoring", 72.5, undefined)).toMatchObject({ label: "Current score", value: "72.5" });
    expect(scoreFact("closed", 81, 81)).toMatchObject({ label: "Final score", value: "81" });
    expect(scoreFact("closed", null, undefined).detail).toBe("No final score was saved");
  });
});

describe("time fact", () => {
  it("counts the planning window down and turns warning in the last three days", () => {
    const state = createInitialState();
    expect(timeFact(state, cycle, "planning", "plan", [], "2026-10-13")).toMatchObject({
      label: "Planning",
      value: "7 days left",
      detail: "Ends 20 Oct 2026",
      tone: "neutral",
    });
    expect(timeFact(state, cycle, "planning", "plan", [], "2026-10-18").tone).toBe("warning");
    expect(timeFact(state, cycle, "planning", "plan", [], "2026-10-21")).toMatchObject({ value: "Overdue", tone: "danger" });
    expect(timeFact(state, { ...cycle, planningEndsOn: null }, "planning", "plan", [], "2026-10-13").value).toBe("No end date set");
  });

  it("names the next KPI Check-In due during monitoring", () => {
    const state = createInitialState();
    const kpiSet = state.kpiSets.find((row) => row.id === "set-digit")!;
    const year = state.cycles.find((row) => row.id === kpiSet.cycleId)!;
    const items = itemsForSet(state, kpiSet.id);
    const fact = timeFact(state, year, "monitoring", "check-in", items, "2026-11-02");
    expect(fact.label).toBe("Next KPI Check-In");
    expect(fact.value === "All checked in" || fact.value.startsWith("Due ")).toBe(true);
    expect(timeFact(state, year, "monitoring", "waiting", items, "2026-11-02").value).toBe("Open once approved");
  });
});

describe("submit blocker", () => {
  it("names the weight gap, then a missing parent, and is null exactly when submit succeeds", () => {
    const fixture = createInitialState();
    const kpiSet = nonRootSet(fixture);
    let state = asOwnerDraft(fixture, kpiSet.id);
    const items = itemsForSet(state, kpiSet.id);
    const [first, ...rest] = items;

    const short = upsertKpiItem(state, { ...first, weight: first.weight - 10 }).state;
    expect(submitBlocker(short, kpiSet.id)).toBe(`Weights add up to 90%. Add 10% more to reach 100%.`);
    expect(submitKpiSet(short, kpiSet.id).error).not.toBeNull();

    const over = upsertKpiItem(state, { ...first, weight: first.weight + 5 }).state;
    expect(submitBlocker(over, kpiSet.id)).toBe(`Weights add up to 105%. Take off 5% to reach 100%.`);

    state = { ...state, kpiItems: state.kpiItems.map((row) => (row.id === first.id ? { ...row, parentKpiItemId: null } : row)) };
    expect(submitBlocker(state, kpiSet.id)).toBe(`“${first.name}” needs a parent KPI. Open it and choose one.`);
    expect(submitKpiSet(state, kpiSet.id).error).not.toBeNull();

    const ready = asOwnerDraft(fixture, kpiSet.id);
    expect(rest.length).toBeGreaterThan(0);
    expect(submitBlocker(ready, kpiSet.id)).toBeNull();
    expect(submitKpiSet(ready, kpiSet.id).error).toBeNull();
  });

  it("asks for a first KPI on an empty portfolio", () => {
    const fixture = createInitialState();
    const kpiSet = nonRootSet(fixture);
    const empty = { ...fixture, kpiItems: fixture.kpiItems.filter((row) => row.kpiSetId !== kpiSet.id) };
    expect(submitBlocker(empty, kpiSet.id)).toBe("Add at least one KPI first.");
  });
});

describe("portfolio step and approval detail", () => {
  it("reads draft as plan and says who an approval waits on", () => {
    const fixture = createInitialState();
    const kpiSet = nonRootSet(fixture);
    const state = asOwnerDraft(fixture, kpiSet.id);
    const draft = state.kpiSets.find((row) => row.id === kpiSet.id)!;
    expect(portfolioStep(state, "monitoring", draft)).toBe("plan");
    expect(portfolioStep(state, "closed", draft)).toBe("closed");
    expect(approvalDetail(state, draft)).toBe("Not submitted yet");

    const submitted = submitKpiSet(state, kpiSet.id).state;
    const pending = submitted.kpiSets.find((row) => row.id === kpiSet.id)!;
    expect(portfolioStep(submitted, "monitoring", pending)).toBe("waiting");
    expect(approvalDetail(submitted, pending)).toMatch(/^Waiting for (Line Manager and Admin|Admin)$/);
  });
});

describe("item row view", () => {
  const base: KpiItem = {
    id: "ki-child",
    tenantId: "kmplus",
    kpiSetId: "set-x",
    name: "Utilization",
    definition: "Billable share",
    target: 80,
    unit: "%",
    weight: 20,
    polarity: "higher-better",
    parentKpiItemId: "ki-parent",
    cascadeMode: "direct",
  };
  const parent: KpiItem = { ...base, id: "ki-parent", kpiSetId: "set-y", name: "Company utilization", parentKpiItemId: null };

  it("names the parent and its link, or says why there is none", () => {
    const state = { ...createInitialState(), kpiItems: [base, parent], checkIns: [] };
    expect(itemRowView(state, cycle, base, false)).toMatchObject({
      target: "80 %",
      polarity: null,
      cadence: "Quarterly",
      cadenceOverride: false,
      actual: null,
      parent: { name: "Company utilization", mode: "Direct" },
    });
    expect(itemRowView(state, cycle, base, true).parent).toBe("root");
    expect(itemRowView(state, cycle, { ...base, parentKpiItemId: null }, false).parent).toBe("missing");
    const lower = itemRowView(state, cycle, { ...base, polarity: "lower-better", checkInCadence: "monthly", cascadeMode: "indirect" }, false);
    expect(lower).toMatchObject({ polarity: "Lower is better", cadence: "Monthly", cadenceOverride: true, parent: { mode: "Indirect" } });
  });

  it("marks a latest actual that is still waiting for approval", () => {
    const state: AppState = {
      ...createInitialState(),
      kpiItems: [{ ...base, parentKpiItemId: null }],
      checkIns: [{ id: "ci", tenantId: "kmplus", kpiItemId: base.id, date: "2026-10-05", window: "2026-Q4", actual: 72, note: "", status: "pending" }],
    };
    expect(latestActual(state, state.kpiItems[0])).toEqual({ value: "72", detail: "Q4 2026 · waiting" });
  });

  it("leaves the missing parent to the parent line instead of repeating it", () => {
    const state = { ...createInitialState(), kpiItems: [base], checkIns: [] };
    expect(rowNote("plan", state, cycle, { ...base, parentKpiItemId: null }, false, "2026-10-13")).toBeNull();
    expect(rowNote("plan", state, cycle, { ...base, weight: 0 }, false, "2026-10-13")).toEqual({ text: "Needs a weight", attention: true });
    expect(rowNote("waiting", state, cycle, base, false, "2026-10-13")).toBeNull();
  });
});

describe("plain KPI errors", () => {
  it("rewrites command refusals into what to do next", () => {
    expect(plainKpiError(null)).toBe("");
    expect(plainKpiError("Weights must sum to 100% (now 85%)")).toBe("Weights add up to 85%. Make them add up to 100%, then submit.");
    expect(plainKpiError("Direct requires the same unit (“%” vs “hours”)")).toContain("“%” here, “hours” on the parent");
    expect(plainKpiError("Direct requires the same check-in frequency (monthly vs quarterly)")).toContain("monthly here, quarterly on the parent");
    expect(plainKpiError("A KPI check-in is already pending for this window")).toBe(
      "A KPI Check-In for this period is already waiting for approval.",
    );
    expect(plainKpiError("Something about a KpiItem in this KpiYear")).toBe("Something about a KPI in this KPI year");
  });
});
