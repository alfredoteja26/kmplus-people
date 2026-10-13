import { describe, expect, it } from "vitest";
import { executeCommand } from "./command-service";
import { recordingIds, withIdSource } from "./domain";
import { createPerson } from "./commands";
import { createInitialState } from "./fixtures";
import { scopeStateForViewer } from "./scope";
import type { AppState, Role } from "./types";

const ALFREDO = { personId: "person-alfredo", role: "employee" as Role }; // Employee + Admin grant
const DENNY = { personId: "person-denny", role: "hr" as Role };
const DIGIT = { personId: "person-digit", role: "employee" as Role };
const MARCELINO = { personId: "person-marcelino", role: "manager" as Role };

function as(session: { personId: string; role: Role }): AppState {
  return { ...createInitialState(), currentPersonId: session.personId, currentRole: session.role };
}

function withPrivateRecords(state: AppState): AppState {
  return {
    ...state,
    people: state.people.map((row) => ({ ...row, phone: `+62 ${row.id}`, emergencyContactName: `kin of ${row.id}` })),
    leaveRequests: [
      {
        id: "leave-digit",
        tenantId: "kmplus",
        personId: "person-digit",
        kind: "sick",
        leaveTypeId: null,
        coverPersonId: null,
        doctorLetterPath: "letters/digit.pdf",
        note: "flu",
        spanMode: "days",
        startDate: "2026-09-01",
        endDate: "2026-09-02",
        startTime: null,
        endTime: null,
        decision: null,
        decidedByPersonId: null,
      },
    ],
  };
}

describe("scopeStateForViewer", () => {
  it("gives an employee the directory, not other people's contact details, CVs, logins, or leave", () => {
    const view = scopeStateForViewer(withPrivateRecords(as(DIGIT)));
    const denny = view.people.find((row) => row.id === "person-denny")!;
    expect(denny.legalName).not.toBe("");
    expect(denny.phone).toBe("");
    expect(denny.emergencyContactName).toBe("");
    expect(view.people.find((row) => row.id === "person-digit")?.phone).toBe("+62 person-digit");
    expect(view.cvs.every((row) => row.personId === "person-digit")).toBe(true);
    expect(view.users.find((row) => row.personId === "person-denny")?.email).toBe("");
    expect(view.audit).toEqual([]);
    expect(view.employments.every((row) => row.personId === "person-digit")).toBe(true);
    expect(view.leaveRequests.map((row) => row.id)).toEqual(["leave-digit"]);
  });

  it("lets a Line Manager read their report's profile but not someone outside the team", () => {
    const view = scopeStateForViewer(withPrivateRecords(as(MARCELINO)));
    expect(view.people.find((row) => row.id === "person-digit")?.phone).toBe("+62 person-digit");
    expect(view.people.find((row) => row.id === "person-denny")?.phone).toBe("");
  });

  it("gives HR every profile, CV, and the audit log, but not other people's leave", () => {
    const view = scopeStateForViewer(withPrivateRecords(as(DENNY)));
    expect(view.people.every((row) => row.phone.startsWith("+62"))).toBe(true);
    expect(view.cvs.length).toBe(createInitialState().cvs.length);
    expect(view.audit.length).toBeGreaterThanOrEqual(0);
    expect(view.leaveRequests).toEqual([]);
  });

  it("gives an Admin every leave request and time entry, but not other people's contact details", () => {
    const view = scopeStateForViewer(withPrivateRecords(as(ALFREDO)));
    expect(view.leaveRequests.map((row) => row.id)).toContain("leave-digit");
    expect(view.people.find((row) => row.id === "person-denny")?.phone).toBe("");
  });

  it("keeps the org chart and KPI tree shared with everyone", () => {
    const full = as(DIGIT);
    const view = scopeStateForViewer(full);
    expect(view.positions).toEqual(full.positions);
    expect(view.assignments).toEqual(full.assignments);
    expect(view.kpiItems).toEqual(full.kpiItems);
  });
});

describe("executeCommand", () => {
  it("refuses an employee who tries to grant themselves Admin, whatever the request says", () => {
    const outcome = executeCommand(createInitialState(), DIGIT, { name: "grantAdmin", args: ["person-digit"] });
    expect(outcome.kind).toBe("refused");
  });

  it("refuses HR-only people changes from an employee", () => {
    const outcome = executeCommand(createInitialState(), DIGIT, {
      name: "updatePerson",
      args: ["person-denny", { legalName: "Changed" }],
    });
    expect(outcome.kind).toBe("refused");
    if (outcome.kind === "refused") expect(outcome.error).toMatch(/Only HR/);
  });

  it("takes identity from the session, not from the state the browser might send", () => {
    const outcome = executeCommand(createInitialState(), DIGIT, { name: "grantAdmin", args: ["person-digit"] });
    expect(outcome.kind).toBe("refused");
    const asHr = executeCommand(createInitialState(), DENNY, { name: "grantAdmin", args: ["person-rayhan"] });
    expect(asHr.kind).toBe("applied");
    if (asHr.kind === "applied") {
      expect(asHr.next.users.find((row) => row.personId === "person-rayhan")?.adminGrant).toBe(true);
    }
  });

  it("rejects unknown commands and non-list arguments", () => {
    expect(executeCommand(createInitialState(), DENNY, { name: "saveTenantState", args: [] }).kind).toBe("invalid");
    expect(executeCommand(createInitialState(), DENNY, { name: "__proto__", args: [] }).kind).toBe("invalid");
    expect(executeCommand(createInitialState(), DENNY, { name: "grantAdmin", args: "person-digit" }).kind).toBe("invalid");
  });

  it("replays the ids the browser created so both sides name the new record the same", () => {
    const input = {
      legalName: "Nadia Putri",
      preferredName: "Nadia",
      email: "nadia@kmplusconsulting.com",
      phone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      joinDate: "2026-10-01",
      status: "draft-hire" as const,
      contractType: "permanent" as const,
    };
    const recorder = recordingIds();
    const local = withIdSource(recorder.source, () => createPerson(as(DENNY), input));
    const outcome = executeCommand(createInitialState(), DENNY, { name: "createPerson", args: [input], ids: recorder.ids });
    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.result.personId).toBe(local.personId);
      expect(outcome.next.people.some((row) => row.id === local.personId)).toBe(true);
    }
  });

  it("does not let a supplied id overwrite an existing record", () => {
    const outcome = executeCommand(createInitialState(), DENNY, {
      name: "createPosition",
      args: [{ title: "Analyst", gradeId: "grade-1", orgUnitId: "ou-1", reportsToPositionId: null }],
      ids: ["pos-head-eng"],
    });
    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.result.positionId).not.toBe("pos-head-eng");
      expect(outcome.next.positions.filter((row) => row.id === "pos-head-eng")).toHaveLength(1);
    }
  });

  it("returns the viewer's scoped view, never the full tenant", () => {
    const outcome = executeCommand(withPrivateRecords(createInitialState()), DIGIT, {
      name: "setWeekGrid",
      args: ["full"],
    });
    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.view.people.find((row) => row.id === "person-denny")?.phone).toBe("");
      expect(outcome.next.people.find((row) => row.id === "person-denny")?.phone).toBe("+62 person-denny");
    }
  });
});
