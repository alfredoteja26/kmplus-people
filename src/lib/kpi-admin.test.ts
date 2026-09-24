import { describe, expect, it } from "vitest";
import { navGroupsForRole } from "@/components/shell/nav";
import {
  addCheckIn,
  closeKpiAdjustmentWindow,
  closeKpiYear,
  openKpiAdjustmentWindow,
  setKpiPlanningEndDate,
  setKpiYearCheckInFrequency,
  startKpiMonitoring,
  startKpiPlanning,
  upsertKpiItem,
} from "./commands";
import { isKpiAdmin, userForPerson } from "./domain";
import { activeKpiYear, kpiYearPhase } from "./domain-query";
import { createInitialState } from "./fixtures";
import type { AppState } from "./types";

function asAlfredo(state: AppState): AppState {
  return { ...state, currentPersonId: "person-alfredo", currentRole: "employee" };
}

function asDenny(state: AppState): AppState {
  return { ...state, currentPersonId: "person-denny", currentRole: "hr" };
}

describe("Admin grant", () => {
  it("seeds Alfredo as Employee with Admin, and Denny HR without Admin", () => {
    const state = createInitialState();
    const alfredo = userForPerson(state, "person-alfredo");
    const denny = userForPerson(state, "person-denny");
    const alvin = userForPerson(state, "person-alvin");

    expect(alfredo?.role).toBe("employee");
    expect(alfredo?.adminGrant).toBe(true);
    expect(denny?.role).toBe("hr");
    expect(denny?.adminGrant).toBe(false);
    expect(alvin?.role).toBe("admin");
    expect(alvin?.adminGrant).toBe(false);
    expect(isKpiAdmin(asAlfredo(state))).toBe(true);
    expect(isKpiAdmin(asDenny(state))).toBe(false);
  });
});

describe("KPI Admin nav", () => {
  it("labels the Performance item KPI Admin and shows it only with the Admin grant", () => {
    const alfredo = navGroupsForRole("employee", true)
      .flatMap((group) => group.items)
      .map((item) => item.label);
    const denny = navGroupsForRole("hr", false)
      .flatMap((group) => group.items)
      .map((item) => item.label);

    expect(alfredo).toContain("KPI Admin");
    expect(alfredo).toContain("Organization");
    expect(alfredo).not.toContain("CV");
    expect(alfredo.some((label) => label === "Org")).toBe(false);
    expect(alfredo).not.toContain("Cycle");
    expect(denny).not.toContain("KPI Admin");
    expect(denny).not.toContain("Cycle");
  });
});

describe("KpiYear Admin commands", () => {
  it("refuses KpiPlanning, KpiMonitoring, CheckInFrequency, and close when the actor has no Admin grant", () => {
    const started = asDenny(createInitialState());

    expect(startKpiPlanning(started, "cycle-2027").error).toMatch(/Admin grant/);
    expect(startKpiMonitoring(started, "cycle-2026").error).toMatch(/Admin grant/);
    expect(setKpiYearCheckInFrequency(started, "cycle-2026", "monthly").error).toMatch(/Admin grant/);
    expect(setKpiPlanningEndDate(started, "cycle-2026", "2026-12-31").error).toMatch(/Admin grant/);
    expect(closeKpiYear(started, "cycle-2026").error).toMatch(/Admin grant/);
    expect(openKpiAdjustmentWindow(started, "cycle-2026").error).toMatch(/Admin grant/);
    expect(closeKpiAdjustmentWindow(started, "cycle-2026").error).toMatch(/Admin grant/);
    expect(kpiYearPhase(started.cycles.find((row) => row.id === "cycle-2026")!)).toBe("monitoring");
  });

  it("lets Admin start KpiPlanning on the next year after closing the current one", () => {
    const started = asAlfredo(createInitialState());
    expect(kpiYearPhase(started.cycles.find((row) => row.id === "cycle-2026")!)).toBe("monitoring");
    expect(activeKpiYear(started)?.id).toBe("cycle-2026");

    const blocked = startKpiPlanning(started, "cycle-2027");
    expect(blocked.error).toMatch(/at most one/i);

    const closed = closeKpiYear(started, "cycle-2026");
    expect(closed.error).toBeNull();
    expect(kpiYearPhase(closed.state.cycles.find((row) => row.id === "cycle-2026")!)).toBe("closed");

    const planned = startKpiPlanning(closed.state, "cycle-2027");
    expect(planned.error).toBeNull();
    expect(kpiYearPhase(planned.state.cycles.find((row) => row.id === "cycle-2027")!)).toBe("planning");
    expect(activeKpiYear(planned.state)?.id).toBe("cycle-2027");
  });

  it("lets Admin start KpiMonitoring and set default CheckInFrequency", () => {
    let state = asAlfredo(createInitialState());
    state = closeKpiYear(state, "cycle-2026").state;
    state = startKpiPlanning(state, "cycle-2027").state;

    const frequency = setKpiYearCheckInFrequency(state, "cycle-2027", "monthly");
    expect(frequency.error).toBeNull();
    expect(frequency.state.cycles.find((row) => row.id === "cycle-2027")?.checkInCadence).toBe("monthly");

    const monitoring = startKpiMonitoring(frequency.state, "cycle-2027");
    expect(monitoring.error).toBeNull();
    expect(kpiYearPhase(monitoring.state.cycles.find((row) => row.id === "cycle-2027")!)).toBe("monitoring");
  });

  it("keeps closed KpiYears visible and blocks draft and KpiCheckIn on that year", () => {
    const started = asAlfredo(createInitialState());
    const closed = closeKpiYear(started, "cycle-2026");
    expect(closed.error).toBeNull();
    expect(closed.state.cycles.some((row) => row.id === "cycle-2026" && kpiYearPhase(row) === "closed")).toBe(true);

    const item = closed.state.kpiItems.find((row) => row.id === "ki-digit-1");
    if (!item) throw new Error("missing ki-digit-1");

    const draft = upsertKpiItem(closed.state, { ...item, name: "Should not save" });
    expect(draft.error).toMatch(/closed/i);
    expect(draft.state.kpiItems.find((row) => row.id === "ki-digit-1")?.name).toBe(item.name);

    const checkIn = addCheckIn(
      { ...closed.state, currentPersonId: "person-digit", currentRole: "employee" },
      "ki-digit-1",
      9,
      "too late",
    );
    expect(checkIn.error).toMatch(/closed/i);
    expect(checkIn.state.checkIns.some((row) => row.kpiItemId === "ki-digit-1" && row.actual === 9)).toBe(false);
  });
});
