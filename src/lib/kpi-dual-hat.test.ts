import { describe, expect, it } from "vitest";
import { addAssignment, agreeKpiSet, assignPosition, createMissingKpiSets, submitKpiSet, upsertKpiItem } from "./commands";
import { currentAssignments, kpiSetForAssignment } from "./domain";
import {
  lineManagerPersonIdForAssignment,
  personIdForKpiSet,
} from "./domain-query";
import { createInitialState } from "./fixtures";
import type { AppState } from "./types";

function asAlfredo(state: AppState): AppState {
  return { ...state, currentPersonId: "person-alfredo", currentRole: "employee" };
}

function packsForDigit(state: AppState) {
  const cycleId = "cycle-2026";
  return currentAssignments(state, "person-digit").map((assignment) => ({
    assignment,
    kpiSet: kpiSetForAssignment(state, assignment.id, cycleId),
    lineManagerId: lineManagerPersonIdForAssignment(state, assignment.id),
  }));
}

describe("dual-hat KpiPortfolios", () => {
  it("gives two current Assignments two KpiPortfolios with their own LineManager chains", () => {
    const started = asAlfredo(createInitialState());
    const added = addAssignment(started, "person-digit", "pos-sales-trainee", "2026-09-01");

    const packs = packsForDigit(added.state);
    expect(packs).toHaveLength(2);
    expect(packs.every((row) => row.kpiSet)).toBe(true);
    expect(new Set(packs.map((row) => row.kpiSet?.id)).size).toBe(2);

    const engineer = packs.find((row) => row.assignment.positionId === "pos-se-digit");
    const trainee = packs.find((row) => row.assignment.positionId === "pos-sales-trainee");
    expect(engineer?.lineManagerId).toBe("person-marcelino");
    expect(trainee?.lineManagerId).toBe("person-puti");
    expect(engineer?.kpiSet?.id).toBe("set-digit");
    expect(trainee?.kpiSet?.status).toBe("draft");
  });

  it("lets createMissingKpiSets draft the second pack when the second Assignment already exists", () => {
    let state = createInitialState();
    state = {
      ...state,
      assignments: [
        ...state.assignments,
        {
          id: "asg-digit-sales",
          tenantId: state.assignments[0]!.tenantId,
          personId: "person-digit",
          positionId: "pos-sales-trainee",
          startDate: "2026-09-01",
          endDate: null,
        },
      ],
    };

    const drafted = createMissingKpiSets(asAlfredo(state), "cycle-2026");
    expect(drafted.created).toBeGreaterThanOrEqual(1);
    expect(kpiSetForAssignment(drafted.state, "asg-digit-sales", "cycle-2026")?.status).toBe("draft");
    expect(kpiSetForAssignment(drafted.state, "asg-digit", "cycle-2026")?.id).toBe("set-digit");
  });
});

describe("mid-year mutation KpiPortfolios", () => {
  it("keeps the old pack on the old Assignment and drafts a new pack on the new seat", () => {
    const started = asAlfredo(createInitialState());
    const oldAssignment = started.assignments.find((row) => row.id === "asg-digit");
    const mutated = assignPosition(started, "person-digit", "pos-head-eng", "2026-09-14");

    const newAssignment = currentAssignments(mutated.state, "person-digit");
    expect(newAssignment).toHaveLength(1);
    expect(newAssignment[0]?.positionId).toBe("pos-head-eng");
    expect(mutated.state.assignments.find((row) => row.id === "asg-digit")?.endDate).toBe("2026-09-14");

    const oldPack = mutated.state.kpiSets.find((row) => row.id === "set-digit");
    expect(oldPack?.assignmentId).toBe("asg-digit");
    expect(personIdForKpiSet(mutated.state, "set-digit")).toBe("person-digit");

    const newPack = kpiSetForAssignment(mutated.state, newAssignment[0]!.id, "cycle-2026");
    expect(newPack).toBeDefined();
    expect(newPack?.id).not.toBe("set-digit");
    expect(newPack?.status).toBe("draft");
    expect(lineManagerPersonIdForAssignment(mutated.state, newAssignment[0]!.id)).toBe("person-rayhan");

    const vacantEngineer = mutated.state.assignments.filter(
      (row) => row.positionId === "pos-se-digit" && row.endDate === null,
    );
    expect(vacantEngineer).toHaveLength(0);
    expect(oldAssignment?.id).toBe("asg-digit");
  });

  it("dual-approves the new pack without rewriting the old Assignment pack", () => {
    let state = asAlfredo(createInitialState());
    state = assignPosition(state, "person-digit", "pos-head-eng", "2026-09-14").state;
    const newAssignment = currentAssignments(state, "person-digit")[0]!;
    const newPack = kpiSetForAssignment(state, newAssignment.id, "cycle-2026")!;

    state = {
      ...state,
      currentPersonId: "person-digit",
      currentRole: "employee",
    };
    state = upsertKpiItem(state, {
      kpiSetId: newPack.id,
      name: "Engineering delivery",
      definition: "Head-of-engineering outcomes",
      target: 100,
      unit: "%",
      weight: 100,
      polarity: "higher-better",
      parentKpiItemId: "ki-rayhan-1",
      cascadeMode: "indirect",
    }).state;
    state = submitKpiSet(state, newPack.id).state;
    state = agreeKpiSet({ ...state, currentPersonId: "person-rayhan", currentRole: "manager" }, newPack.id).state;
    state = agreeKpiSet({ ...state, currentPersonId: "person-alfredo", currentRole: "employee" }, newPack.id).state;

    const approved = kpiSetForAssignment(state, newAssignment.id, "cycle-2026");
    expect(approved?.status).toBe("approved");
    expect(approved?.lineManagerApprovedBy).toBe("person-rayhan");
    expect(approved?.adminApprovedBy).toBe("person-alfredo");

    const oldPack = state.kpiSets.find((row) => row.id === "set-digit");
    expect(oldPack?.assignmentId).toBe("asg-digit");
    expect(oldPack?.status).toBe("approved");
    expect(oldPack?.lineManagerApprovedBy).toBe("person-marcelino");
  });
});
