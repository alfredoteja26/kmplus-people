import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCheckIn,
  agreeKpiSet,
  openKpiAdjustmentWindow,
  setCycleCadence,
  submitKpiSet,
  upsertKpiItem,
} from "./commands";
import { effectiveCadence, windowFor } from "./cadence";
import { createInitialState } from "./fixtures";
import type { AppState, KpiCycle, KpiItem } from "./types";

const cycle: KpiCycle = {
  id: "cycle-test",
  tenantId: "kmplus",
  name: "Test",
  year: 2026,
  status: "open",
  phase: "monitoring",
  adjustmentOpen: false,
  checkInCadence: "quarterly",
  checkInWindows: [
    { quarter: 1, open: false },
    { quarter: 2, open: false },
    { quarter: 3, open: true },
    { quarter: 4, open: false },
  ],
};

const item: KpiItem = {
  id: "ki-test",
  tenantId: "kmplus",
  kpiSetId: "set-test",
  name: "Utilization",
  definition: "",
  target: 80,
  unit: "%",
  weight: 100,
  polarity: "higher-better",
};

describe("cadence helpers", () => {
  it("uses cycle default when item has no override", () => {
    expect(effectiveCadence(cycle, item)).toBe("quarterly");
  });

  it("uses item override when set", () => {
    expect(effectiveCadence(cycle, { ...item, checkInCadence: "monthly" })).toBe("monthly");
  });

  it("maps dates to month or quarter window ids", () => {
    expect(windowFor("2026-09-14", "monthly")).toBe("2026-09");
    expect(windowFor("2026-09-14", "quarterly")).toBe("2026-Q3");
    expect(windowFor("2026-01-02", "quarterly")).toBe("2026-Q1");
    expect(windowFor("2026-12-31", "quarterly")).toBe("2026-Q4");
  });
});

describe("addCheckIn window identity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores quarterly window from cycle default", () => {
    const base = createInitialState();
    const started = {
      ...base,
      currentPersonId: "person-digit",
      currentRole: "employee" as const,
      checkIns: base.checkIns.filter((row) => !(row.kpiItemId === "ki-digit-1" && row.window === "2026-Q3")),
    };
    const { state } = addCheckIn(started, "ki-digit-1", 5, "note");
    const created = state.checkIns.find((row) => row.kpiItemId === "ki-digit-1" && row.actual === 5);
    expect(created?.window).toBe("2026-Q3");
  });

  it("stores monthly window when cycle default is monthly", () => {
    let started: AppState = { ...createInitialState(), currentRole: "employee", currentPersonId: "person-alfredo" };
    started = {
      ...started,
      checkIns: started.checkIns.filter((row) => !(row.kpiItemId === "ki-digit-1" && row.window === "2026-Q3")),
    };
    started = setCycleCadence(started, "cycle-2026", "monthly").state;
    const { state } = addCheckIn(
      { ...started, currentPersonId: "person-digit", currentRole: "employee" },
      "ki-digit-1",
      5,
      "note",
    );
    const created = state.checkIns.find((row) => row.kpiItemId === "ki-digit-1" && row.actual === 5);
    expect(created?.window).toBe("2026-09");
  });

  it("stores monthly window when item overrides quarterly cycle", () => {
    let started: AppState = { ...createInitialState(), currentPersonId: "person-digit", currentRole: "employee" };
    const existing = started.kpiItems.find((row) => row.id === "ki-digit-1");
    if (!existing) throw new Error("missing ki-digit-1");
    started = openKpiAdjustmentWindow(
      { ...started, currentPersonId: "person-alfredo", currentRole: "employee" },
      "cycle-2026",
    ).state;
    started = { ...started, currentPersonId: "person-digit", currentRole: "employee" };
    started = upsertKpiItem(started, { ...existing, checkInCadence: "monthly" }).state;
    started = submitKpiSet(started, "set-digit").state;
    started = agreeKpiSet({ ...started, currentPersonId: "person-marcelino", currentRole: "manager" }, "set-digit").state;
    started = agreeKpiSet({ ...started, currentPersonId: "person-alfredo", currentRole: "employee" }, "set-digit").state;
    started = {
      ...started,
      currentPersonId: "person-digit",
      checkIns: started.checkIns.filter((row) => row.kpiItemId !== "ki-digit-1"),
    };
    const { state } = addCheckIn(started, "ki-digit-1", 7, "monthly rhythm");
    const created = state.checkIns.find((row) => row.kpiItemId === "ki-digit-1" && row.actual === 7);
    expect(created?.window).toBe("2026-09");
  });
});

describe("setCycleCadence", () => {
  it("updates the cycle default CheckInCadence", () => {
    const started = { ...createInitialState(), currentRole: "employee" as const, currentPersonId: "person-alfredo" };
    const { state } = setCycleCadence(started, "cycle-2026", "monthly");
    expect(state.cycles.find((row) => row.id === "cycle-2026")?.checkInCadence).toBe("monthly");
  });
});
