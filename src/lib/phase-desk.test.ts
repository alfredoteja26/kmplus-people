import { describe, expect, it } from "vitest";
import { setKpiPlanningEndDate, startKpiMonitoring, startKpiPlanning, closeKpiYear } from "./commands";
import { displayedActual } from "./direct";
import { itemsForSet } from "./domain";
import { createInitialState } from "./fixtures";
import {
  liveMonitoringScore,
  lateCheckInCount,
  peopleWithUndonePlanning,
  planningCountdownCopy,
  planningDaysLeft,
  planningItemGap,
  priorWindowsInYear,
} from "./phase-desk";
import type { AppState, KpiItem } from "./types";

function asAlfredo(state: AppState): AppState {
  return { ...state, currentPersonId: "person-alfredo", currentRole: "employee" };
}

function asDenny(state: AppState): AppState {
  return { ...state, currentPersonId: "person-denny", currentRole: "hr" };
}

describe("planning countdown", () => {
  it("counts whole days and names overdue, today, and a missing date", () => {
    expect(planningDaysLeft("2026-09-30", "2026-09-24")).toBe(6);
    expect(planningDaysLeft("2026-09-24", "2026-09-24")).toBe(0);
    expect(planningDaysLeft("2026-09-23", "2026-09-24")).toBe(-1);
    expect(planningDaysLeft(null, "2026-09-24")).toBeNull();
    expect(planningCountdownCopy("2026-09-30", "2026-09-24")).toBe("6 days left for KPI planning");
    expect(planningCountdownCopy("2026-09-25", "2026-09-24")).toBe("1 day left for KPI planning");
    expect(planningCountdownCopy("2026-09-24", "2026-09-24")).toBe("KPI planning ends today");
    expect(planningCountdownCopy("2026-09-20", "2026-09-24")).toBe("KPI planning is overdue");
    expect(planningCountdownCopy(undefined, "2026-09-24")).toBe("Planning end date is not set");
  });
});

describe("planning item gap", () => {
  const item = {
    id: "ki",
    tenantId: "kmplus",
    kpiSetId: "set",
    name: "Utilization",
    definition: "Billable share",
    target: 80,
    unit: "%",
    weight: 20,
    polarity: "higher-better",
  } satisfies KpiItem;

  it("asks for a parent, then a weight", () => {
    expect(planningItemGap({ ...item, parentKpiItemId: null }, false)).toBe("Needs a parent");
    expect(planningItemGap({ ...item, parentKpiItemId: "parent", weight: 0 }, false)).toBe("Needs a weight");
    expect(planningItemGap(item, true)).toBeNull();
  });
});

describe("live monitoring score", () => {
  it("matches year-close math for an approved portfolio and does not store the number", () => {
    const state = createInitialState();
    expect(liveMonitoringScore(state, "set-alfredo")).toBeNull();

    const items = itemsForSet(state, "set-digit");
    let expected = 0;
    for (const row of items) {
      const actual = displayedActual(state, row);
      const ratio = actual === null || row.target === 0 ? 0 : Math.min(actual / row.target, 1.2);
      expected += (row.weight / 100) * ratio * 100;
    }
    expect(liveMonitoringScore(state, "set-digit")).toBe(Math.round(expected * 10) / 10);
    expect(state.kpiSets.find((row) => row.id === "set-digit")?.score).toBeUndefined();
  });
});

describe("admin attention counts", () => {
  it("counts earlier windows with no check-in as late, and ignores the current window", () => {
    const state = createInitialState();
    expect(priorWindowsInYear("2026-Q3", 2026)).toEqual(["2026-Q1", "2026-Q2"]);
    expect(priorWindowsInYear("2026-03", 2026)).toEqual(["2026-01", "2026-02"]);
    const late = lateCheckInCount(state, "2026-09-24");
    expect(late).toBeGreaterThan(0);
    expect(peopleWithUndonePlanning(state)).toBe(0);
  });

  it("counts people still drafting during planning", () => {
    let state = asAlfredo(createInitialState());
    state = closeKpiYear(state, "cycle-2026").state;
    state = startKpiPlanning(state, "cycle-2027").state;
    expect(lateCheckInCount(state, "2027-02-01")).toBe(0);
    expect(peopleWithUndonePlanning(state)).toBeGreaterThan(0);
  });
});

describe("setKpiPlanningEndDate", () => {
  it("lets Admin set the date only during planning", () => {
    const denied = setKpiPlanningEndDate(asDenny(createInitialState()), "cycle-2027", "2027-01-31");
    expect(denied.error).toMatch(/Admin grant/);

    let state = asAlfredo(createInitialState());
    expect(setKpiPlanningEndDate(state, "cycle-2027", "2027-01-31").error).toMatch(/planning/);

    state = closeKpiYear(state, "cycle-2026").state;
    state = startKpiPlanning(state, "cycle-2027").state;
    const dated = setKpiPlanningEndDate(state, "cycle-2027", "2027-02-15");
    expect(dated.error).toBeNull();
    expect(dated.state.cycles.find((row) => row.id === "cycle-2027")?.planningEndsOn).toBe("2027-02-15");

    expect(setKpiPlanningEndDate(dated.state, "cycle-2027", "15 Feb 2027").error).toMatch(/calendar date/);

    const monitoring = startKpiMonitoring(dated.state, "cycle-2027");
    expect(setKpiPlanningEndDate(monitoring.state, "cycle-2027", "2027-03-01").error).toMatch(/planning/);
    expect(monitoring.state.cycles.find((row) => row.id === "cycle-2027")?.planningEndsOn).toBe("2027-02-15");
  });
});
