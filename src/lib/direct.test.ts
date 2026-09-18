import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addCheckIn, closeCycle, upsertKpiItem } from "./commands";
import { canBeDirect, displayedActual, rolledActual } from "./direct";
import { itemHealth } from "./domain";
import { createInitialState } from "./fixtures";
import type { KpiCycle, KpiItem } from "./types";

const cycle: KpiCycle = {
  id: "cycle-2026",
  tenantId: "kmplus",
  name: "2026",
  year: 2026,
  status: "open",
  checkInCadence: "quarterly",
  checkInWindows: [
    { quarter: 1, open: false },
    { quarter: 2, open: false },
    { quarter: 3, open: true },
    { quarter: 4, open: false },
  ],
};

function parentItem(): KpiItem {
  const state = createInitialState();
  const item = state.kpiItems.find((row) => row.id === "ki-rayhan-1");
  if (!item) throw new Error("missing parent");
  return item;
}

function childItem(overrides: Partial<KpiItem> = {}): KpiItem {
  const state = createInitialState();
  const item = state.kpiItems.find((row) => row.id === "ki-digit-1");
  if (!item) throw new Error("missing child");
  return { ...item, ...overrides };
}

describe("canBeDirect", () => {
  it("rejects different units", () => {
    const parent = parentItem();
    const child = childItem({ unit: "hours" });
    const result = canBeDirect(child, parent, cycle);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unit/i);
  });

  it("rejects different CheckInCadence", () => {
    const parent = parentItem();
    const child = childItem({ unit: "count", checkInCadence: "monthly" });
    const result = canBeDirect(child, { ...parent, unit: "count" }, cycle);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/CheckInCadence/i);
  });

  it("accepts matching unit and cadence", () => {
    const parent = parentItem();
    const child = childItem({ unit: parent.unit });
    expect(canBeDirect(child, parent, cycle).ok).toBe(true);
  });
});

describe("upsertKpiItem Direct validation", () => {
  it("rejects Direct when units differ", () => {
    const state = createInitialState();
    const child = state.kpiItems.find((row) => row.id === "ki-digit-1");
    if (!child) throw new Error("missing child");
    const { state: next, error } = upsertKpiItem(state, {
      ...child,
      cascadeMode: "direct",
      unit: "hours",
    });
    expect(error).toMatch(/unit/i);
    expect(next.kpiItems.find((row) => row.id === child.id)?.cascadeMode).toBe("indirect");
  });

  it("rejects Direct when cadence differs", () => {
    const state = createInitialState();
    const child = state.kpiItems.find((row) => row.id === "ki-digit-1");
    const parent = state.kpiItems.find((row) => row.id === "ki-rayhan-1");
    if (!child || !parent) throw new Error("missing fixtures");
    const { error } = upsertKpiItem(state, {
      ...child,
      cascadeMode: "direct",
      unit: parent.unit,
      checkInCadence: "monthly",
    });
    expect(error).toMatch(/CheckInCadence/i);
  });
});

describe("DirectMix rolled actual", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function withDirectChild() {
    let state = createInitialState();
    state = {
      ...state,
      checkIns: state.checkIns.filter((row) => !row.kpiItemId.startsWith("ki-digit-")),
    };
    const child = state.kpiItems.find((row) => row.id === "ki-digit-1");
    const parent = state.kpiItems.find((row) => row.id === "ki-rayhan-1");
    if (!child || !parent) throw new Error("missing fixtures");
    state = upsertKpiItem(state, {
      ...child,
      cascadeMode: "direct",
      unit: parent.unit,
    }).state;
    const parentRow = state.kpiItems.find((row) => row.id === "ki-rayhan-1");
    if (!parentRow) throw new Error("missing parent after upsert");
    return { state, parent: parentRow, child };
  }

  it("children-only sums Direct children in the window", () => {
    const { state, parent } = withDirectChild();
    let next = addCheckIn(state, "ki-digit-1", 10, "child").state;
    next = addCheckIn(next, "ki-digit-2", 5, "other child indirect").state;
    expect(rolledActual(next, parent, "2026-Q3")).toBe(10);
    expect(displayedActual(next, parent)).toBe(10);
  });

  it("own-plus-children adds parent CheckIn to the sum", () => {
    let { state, parent } = withDirectChild();
    state = upsertKpiItem(state, { ...parent, directMix: "own-plus-children" }).state;
    parent = state.kpiItems.find((row) => row.id === parent.id)!;
    state = addCheckIn(state, "ki-digit-1", 10, "child").state;
    state = addCheckIn(state, parent.id, 30, "parent own").state;
    expect(rolledActual(state, parent, "2026-Q3")).toBe(40);
    expect(displayedActual(state, parent)).toBe(40);
  });

  it("Indirect children do not enter the sum", () => {
    const { state, parent } = withDirectChild();
    const next = addCheckIn(state, "ki-digit-2", 99, "indirect").state;
    expect(rolledActual(next, parent, "2026-Q3")).toBe(0);
  });

  it("itemHealth uses rolled actual for DirectMix parent", () => {
    const { state, parent } = withDirectChild();
    const next = addCheckIn(state, "ki-digit-1", 6, "at target").state;
    expect(displayedActual(next, parent)).toBe(6);
    expect(itemHealth(next, parent)).toBe("off");
  });
});

describe("closeCycle KpiScore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scores parent from rolled Direct children", () => {
    let state = createInitialState();
    state = {
      ...state,
      checkIns: state.checkIns.filter((row) => !row.kpiItemId.startsWith("ki-digit-")),
    };
    const child = state.kpiItems.find((row) => row.id === "ki-digit-1");
    if (!child) throw new Error("missing child");
    state = upsertKpiItem(state, { ...child, cascadeMode: "direct", unit: "%" }).state;
    state = addCheckIn(state, "ki-digit-1", 50, "half of target").state;
    state = closeCycle(state, "cycle-2026").state;
    const rayhanSet = state.kpiSets.find((row) => row.id === "set-rayhan");
    expect(rayhanSet?.score).toBeDefined();
    const practiceItem = state.kpiItems.find((row) => row.id === "ki-rayhan-1");
    if (!practiceItem) throw new Error("missing practice item");
    const rolled = displayedActual(state, practiceItem);
    expect(rolled).toBe(50);
  });
});
