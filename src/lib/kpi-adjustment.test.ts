import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCheckIn,
  agreeKpiSet,
  closeKpiAdjustmentWindow,
  openKpiAdjustmentWindow,
  submitKpiSet,
  upsertKpiItem,
} from "./commands";
import { isCheckInDualApproved, isPortfolioDualApproved, kpiYearPhase } from "./domain-query";
import { createInitialState } from "./fixtures";
import type { AppState } from "./types";

function as(state: AppState, personId: string, role: AppState["currentRole"] = "employee"): AppState {
  return { ...state, currentPersonId: personId, currentRole: role };
}

function openWindow(state: AppState): AppState {
  const opened = openKpiAdjustmentWindow(as(state, "person-alfredo"), "cycle-2026");
  if (opened.error) throw new Error(opened.error);
  return opened.state;
}

function renameDigitItem(state: AppState, name: string) {
  const item = state.kpiItems.find((row) => row.id === "ki-digit-1")!;
  return upsertKpiItem(as(state, "person-digit"), { ...item, name });
}

describe("KpiAdjustmentWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is opened and closed by Admin only during KpiMonitoring", () => {
    const base = createInitialState();
    expect(openKpiAdjustmentWindow(as(base, "person-denny", "hr"), "cycle-2026").error).toMatch(/Admin grant/);

    const opened = openWindow(base);
    expect(opened.cycles.find((row) => row.id === "cycle-2026")?.adjustmentOpen).toBe(true);
    expect(openKpiAdjustmentWindow(as(opened, "person-alfredo"), "cycle-2026").error).toMatch(/already open/);

    const closed = closeKpiAdjustmentWindow(as(opened, "person-alfredo"), "cycle-2026");
    expect(closed.error).toBeNull();
    expect(closed.state.cycles.find((row) => row.id === "cycle-2026")?.adjustmentOpen).toBe(false);

    const planning: AppState = {
      ...base,
      cycles: base.cycles.map((row) => (row.id === "cycle-2026" ? { ...row, phase: "planning" as const } : row)),
    };
    expect(openKpiAdjustmentWindow(as(planning, "person-alfredo"), "cycle-2026").error).toMatch(/only available during monitoring/);
  });

  it("refuses changes to a dual-approved KpiPortfolio while the window is closed", () => {
    const result = renameDigitItem(createInitialState(), "Locked");
    expect(result.error).toMatch(/adjustment window/);
  });

  it("does not lock a dual-approved pack during KpiPlanning; a change just clears both stamps", () => {
    const base = createInitialState();
    const planning: AppState = {
      ...base,
      cycles: base.cycles.map((row) => (row.id === "cycle-2026" ? { ...row, phase: "planning" as const } : row)),
    };
    const result = renameDigitItem(planning, "Replanned");
    expect(result.error).toBeNull();
    expect(result.state.kpiSets.find((row) => row.id === "set-digit")?.status).toBe("pending");
  });

  it("sends an adjusted pack back to pending with both stamps cleared, without flipping the phase", () => {
    const adjusted = renameDigitItem(openWindow(createInitialState()), "Adjusted");
    expect(adjusted.error).toBeNull();

    const digitSet = adjusted.state.kpiSets.find((row) => row.id === "set-digit");
    expect(digitSet?.status).toBe("pending");
    expect(digitSet?.lineManagerApprovedBy).toBeUndefined();
    expect(digitSet?.adminApprovedBy).toBeUndefined();
    expect(kpiYearPhase(adjusted.state.cycles.find((row) => row.id === "cycle-2026")!)).toBe("monitoring");
  });

  it("pauses new KpiCheckIns on that Assignment only, and keeps already-approved Check-Ins", () => {
    const adjusted = renameDigitItem(openWindow(createInitialState()), "Adjusted").state;

    expect(isCheckInDualApproved(adjusted, "ci-digit-1")).toBe(true);

    const paused = addCheckIn(as(adjusted, "person-digit"), "ki-digit-1", 3, "late Q2", { window: "2026-Q2" });
    expect(paused.error).toMatch(/both approvers/);

    const teammate = addCheckIn(as(adjusted, "person-denny", "hr"), "ki-denny-1", 80, "Q2", { window: "2026-Q2" });
    expect(teammate.error).toBeNull();
  });

  it("resumes KpiCheckIns once LineManager and Admin approve the adjusted pack again", () => {
    let state = renameDigitItem(openWindow(createInitialState()), "Adjusted").state;
    state = submitKpiSet(as(state, "person-digit"), "set-digit").state;
    state = agreeKpiSet(as(state, "person-marcelino", "manager"), "set-digit").state;
    expect(isPortfolioDualApproved(state, "set-digit")).toBe(false);
    state = agreeKpiSet(as(state, "person-alfredo"), "set-digit").state;
    expect(isPortfolioDualApproved(state, "set-digit")).toBe(true);

    const resumed = addCheckIn(as(state, "person-digit"), "ki-digit-1", 3, "late Q2", { window: "2026-Q2" });
    expect(resumed.error).toBeNull();
  });

  it("refuses drafting by someone who is not the Person, LineManager, or Admin", () => {
    const opened = openWindow(createInitialState());
    const item = opened.kpiItems.find((row) => row.id === "ki-digit-1")!;
    const result = upsertKpiItem(as(opened, "person-denny", "hr"), { ...item, name: "Not mine" });
    expect(result.error).toMatch(/Only the person, their line manager, or an admin/);
  });
});
