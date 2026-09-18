import { describe, expect, it } from "vitest";
import { isRootAssignment } from "./cascade";
import { rootPositions } from "./domain";
import { createInitialState } from "./fixtures";
import { buildKpiForest, kpiTreeScopePersonIds } from "./kpi-tree";

describe("kpi-tree", () => {
  it("forest roots are RootPosition KpiItems only", () => {
    const state = createInitialState();
    const forest = buildKpiForest(state, "tenant");
    expect(forest).not.toBeNull();

    const rootPositionIds = new Set(rootPositions(state).map((row) => row.id));
    const rootAssignments = state.assignments.filter(
      (row) => row.endDate === null && rootPositionIds.has(row.positionId),
    );
    const expectedRootItemIds = state.kpiItems
      .filter((item) => {
        const set = state.kpiSets.find((row) => row.id === item.kpiSetId);
        if (!set || set.cycleId !== forest!.cycleId) return false;
        if (!rootAssignments.some((asg) => asg.id === set.assignmentId)) return false;
        return !item.parentKpiItemId;
      })
      .map((row) => row.id);

    expect(forest!.rootKpiItemIds.sort()).toEqual(expectedRootItemIds.sort());
    expect(forest!.rootKpiItemIds).toContain("ki-alvin-1");
    expect(forest!.rootKpiItemIds).toContain("ki-alvin-2");
    expect(forest!.rootKpiItemIds).not.toContain("ki-rayhan-1");

    for (const node of forest!.nodes.filter((row) => row.isForestRoot)) {
      expect(isRootAssignment(state, node.assignmentId)).toBe(true);
      expect(node.parentKpiItemId).toBeNull();
    }
  });

  it("manager team scope includes reports and ancestors to root", () => {
    const state = {
      ...createInitialState(),
      currentRole: "manager" as const,
      currentPersonId: "person-rayhan",
    };
    const ids = kpiTreeScopePersonIds(state, "team");
    expect(ids).toContain("person-rayhan");
    expect(ids).toContain("person-digit");
    expect(ids).not.toContain("person-denny");

    const forest = buildKpiForest(state, "team");
    expect(forest!.rootKpiItemIds.length).toBeGreaterThan(0);
    expect(forest!.nodes.some((row) => row.kpiItemId === "ki-digit-1")).toBe(true);
    expect(forest!.nodes.some((row) => row.kpiItemId === "ki-alvin-1")).toBe(true);
  });

  it("edges use cascade mode from child items", () => {
    const state = createInitialState();
    const forest = buildKpiForest(state, "tenant");
    const indirectEdge = forest!.edges.find((row) => row.toKpiItemId === "ki-rayhan-1");
    expect(indirectEdge?.mode).toBe("indirect");
  });

  it("node actual uses rolled DirectMix, not raw own CheckIn", () => {
    const started = createInitialState();
    const items = started.kpiItems.map((row) =>
      row.id === "ki-alfredo-1" ? { ...row, cascadeMode: "direct" as const } : row,
    );
    const state = { ...started, kpiItems: items, checkIns: [
      ...started.checkIns,
      {
        id: "ci-alfredo-util",
        tenantId: started.tenantId,
        kpiItemId: "ki-alfredo-1",
        date: "2026-07-15",
        window: "2026-Q3",
        actual: 12,
        note: "Direct child for tree",
      },
    ] };
    const forest = buildKpiForest(state, "tenant");
    const parent = forest!.nodes.find((row) => row.kpiItemId === "ki-rayhan-2");
    expect(parent?.actual).toBe(12);
  });
});
