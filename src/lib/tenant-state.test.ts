import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import {
  addCheckIn,
  agreeKpiSet,
  applyCv,
  assignPosition,
  createPerson,
  currentAssignment,
  decideCvField,
  employmentFor,
  latestCheckIn,
  openCycle,
  personById,
  setHealth,
} from "./tenant-state";

function acceptAllCvFields(state: ReturnType<typeof createInitialState>, cvId: string) {
  const cv = state.cvs.find((row) => row.id === cvId);
  if (!cv) throw new Error(`Missing CurriculumVitae ${cvId}`);
  return cv.fields.reduce((next, field) => decideCvField(next, cvId, field.key, "accepted").state, state);
}

describe("tenant-state commands", () => {
  it("creates a Person and Employment without a page", () => {
    const started = createInitialState();
    const { state, personId } = createPerson(started, {
      legalName: "Dewi Lestari",
      preferredName: "Dewi",
      email: "dewi.lestari@kmplusconsulting.com",
      phone: "+62 811 000 9001",
      emergencyContactName: "Arif Lestari",
      emergencyContactPhone: "+62 811 000 9002",
      joinDate: "2026-09-14",
      contractType: "permanent",
      status: "active",
    });

    const person = personById(state, personId);
    expect(person?.legalName).toBe("Dewi Lestari");
    expect(employmentFor(state, personId)?.status).toBe("active");
    expect(currentAssignment(state, personId)).toBeUndefined();
  });

  it("assigns a Person to an empty Position and ends the previous Assignment", () => {
    const started = createInitialState();
    const previous = currentAssignment(started, "person-digit");
    expect(previous?.positionId).toBe("pos-se-digit");

    const { state } = assignPosition(started, "person-digit", "pos-head-eng", "2026-09-14");

    expect(currentAssignment(state, "person-digit")?.positionId).toBe("pos-head-eng");
    expect(state.assignments.find((row) => row.id === previous?.id)?.endDate).toBe("2026-09-14");
    expect(currentAssignment(state, "person-digit")?.id).not.toBe(previous?.id);
  });

  it("applies a reviewed CurriculumVitae as a new-hire draft Employment", () => {
    const started = acceptAllCvFields(createInitialState(), "cv-fajar");
    const { state, personId } = applyCv(started, "cv-fajar", { type: "new-hire" });

    expect(personId).toBeTruthy();
    const person = personById(state, personId!);
    expect(person?.legalName).toBe("Fajar Nugroho");
    expect(employmentFor(state, personId!)?.status).toBe("draft-hire");
    expect(state.cvs.find((row) => row.id === "cv-fajar")?.state).toBe("applied");
  });

  it("merges a CurriculumVitae into an existing Person without overwriting legal name", () => {
    const started = acceptAllCvFields(createInitialState(), "cv-fajar");
    const { state } = applyCv(started, "cv-fajar", { type: "existing", personId: "person-alfredo" });

    expect(personById(state, "person-alfredo")?.legalName).toBe("Alfredo Teja");
    expect(personById(state, "person-alfredo")?.skills).toEqual(
      expect.arrayContaining(["Consulting", "Delivery", "Excel", "Facilitation"]),
    );
    expect(personById(state, "person-alfredo")?.educations).toHaveLength(1);
    expect(personById(state, "person-alfredo")?.skillRows.length).toBeGreaterThanOrEqual(3);
  });

  it("applies the Dzaky fixture CurriculumVitae as a new-hire with structured evidence", () => {
    const started = acceptAllCvFields(createInitialState(), "cv-dzaky");
    const { state, personId } = applyCv(started, "cv-dzaky", { type: "new-hire" });

    expect(personId).toBeTruthy();
    const person = personById(state, personId!);
    expect(person?.legalName).toBe("Dzaky Iman Ajiputro");
    expect(person?.linkedIn).toContain("linkedin.com/in/dzaky-iman-ajiputro");
    expect(person?.educations[0]?.institution).toBe("University of Indonesia");
    expect(person?.experiences.some((row) => row.kind === "organization")).toBe(true);
    expect(person?.experiences.some((row) => row.kind === "volunteer")).toBe(true);
    expect(person?.certificationRows.length).toBe(3);
    expect(person?.skillRows.some((row) => row.kind === "language")).toBe(true);
    expect(employmentFor(state, personId!)?.status).toBe("draft-hire");
  });

  it("merges the Dzaky fixture into an existing Person without overwriting legal name", () => {
    const started = acceptAllCvFields(createInitialState(), "cv-dzaky");
    const { state } = applyCv(started, "cv-dzaky", { type: "existing", personId: "person-digit" });

    const person = personById(state, "person-digit");
    expect(person?.legalName).toBe("Digit Prakitka");
    expect(person?.educations[0]?.institution).toBe("University of Indonesia");
    expect(person?.experiences.some((row) => row.organization === "Bank Danamon Indonesia")).toBe(true);
  });

  it("agrees a KpiSet and leaves the open cycle unchanged", () => {
    const started = createInitialState();
    expect(openCycle(started)?.id).toBe("cycle-2026");
    expect(started.kpiSets.find((row) => row.id === "set-alfredo")?.status).toBe("draft");

    const { state } = agreeKpiSet(started, "set-alfredo");

    expect(state.kpiSets.find((row) => row.id === "set-alfredo")?.status).toBe("active");
    expect(openCycle(state)?.id).toBe("cycle-2026");
  });

  it("logs a CheckIn and reads KpiSet health without mounting a page", () => {
    const started = createInitialState();
    const kpiSet = started.kpiSets.find((row) => row.id === "set-digit");
    if (!kpiSet) throw new Error("Missing KpiSet set-digit");
    expect(latestCheckIn(started, "ki-digit-1")?.actual).toBe(4);

    const { state } = addCheckIn(started, "ki-digit-1", 6, "Caught up on shipped slices");

    expect(latestCheckIn(state, "ki-digit-1")?.actual).toBe(6);
    expect(setHealth(state, kpiSet)).toBe("at-risk");
    expect(openCycle(state)?.id).toBe("cycle-2026");
  });
});
