import { describe, expect, it } from "vitest";
import { agreeKpiSet, addCheckIn, submitKpiSet } from "./commands";
import { latestCheckIn } from "./domain";
import { createInitialState } from "./fixtures";
import { isRootAssignment, parentCandidates, validateParents } from "./cascade";

describe("cascade", () => {
  it("treats CEO assignment as RootPosition (no parent required)", () => {
    const state = createInitialState();
    expect(isRootAssignment(state, "asg-alvin")).toBe(true);
    expect(validateParents(state, "set-alvin")).toBeNull();
  });

  it("requires a parent on non-root KpiSets", () => {
    const state = createInitialState();
    const items = state.kpiItems.map((row) =>
      row.id === "ki-alfredo-1" ? { ...row, parentKpiItemId: null } : row,
    );
    const broken = { ...state, kpiItems: items };
    expect(validateParents(broken, "set-alfredo")).toMatch(/needs a parent/);

    const submit = submitKpiSet(broken, "set-alfredo");
    expect(submit.error).toMatch(/needs a parent/);
    expect(submit.state.kpiSets.find((row) => row.id === "set-alfredo")?.status).toBe("draft");

    const agree = agreeKpiSet(broken, "set-alfredo");
    expect(agree.error).toMatch(/needs a parent/);
    expect(agree.state.kpiSets.find((row) => row.id === "set-alfredo")?.status).toBe("draft");
  });

  it("lists parent candidates from any filled Assignment in the cycle, not only the manager", () => {
    const state = createInitialState();
    const cycleId = "cycle-2026";
    const ids = parentCandidates(state, cycleId, { excludeKpiItemId: "ki-alfredo-1" }).map((row) => row.kpiItemId);
    expect(ids).toContain("ki-alvin-1");
    expect(ids).toContain("ki-rayhan-1");
    expect(ids).toContain("ki-digit-1");
  });

  it("does not offer parents on empty seats (no current Assignment / KpiSet)", () => {
    const state = createInitialState();
    const orphanSet = {
      id: "set-ghost",
      tenantId: state.tenantId,
      assignmentId: "asg-ended",
      cycleId: "cycle-2026",
      status: "draft" as const,
    };
    const endedAssignment = {
      id: "asg-ended",
      tenantId: state.tenantId,
      personId: "person-eka",
      positionId: "pos-head-eng",
      startDate: "2024-01-01",
      endDate: "2026-01-01",
    };
    const ghostItem = {
      id: "ki-ghost",
      tenantId: state.tenantId,
      kpiSetId: "set-ghost",
      name: "Ghost KPI",
      definition: "Should not appear",
      target: 100,
      unit: "%",
      weight: 100,
      polarity: "higher-better" as const,
      parentKpiItemId: null,
      cascadeMode: "indirect" as const,
    };
    const withGhost = {
      ...state,
      assignments: [...state.assignments, endedAssignment],
      kpiSets: [...state.kpiSets, orphanSet],
      kpiItems: [...state.kpiItems, ghostItem],
    };
    expect(parentCandidates(withGhost, "cycle-2026").some((row) => row.kpiItemId === "ki-ghost")).toBe(false);
  });

  it("Indirect cascade: child CheckIn does not change parent actual", () => {
    const state = createInitialState();
    const parentBefore = latestCheckIn(state, "ki-rayhan-1")?.actual;
    const { state: next } = addCheckIn(state, "ki-digit-1", 99, "Spike should stay on child only");
    expect(latestCheckIn(next, "ki-digit-1")?.actual).toBe(99);
    expect(latestCheckIn(next, "ki-rayhan-1")?.actual).toBe(parentBefore);
  });
});
