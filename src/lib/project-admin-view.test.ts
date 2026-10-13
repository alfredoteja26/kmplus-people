import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import {
  adminFacts,
  approvedLeaveInSpan,
  hoursByProject,
  missingHoursLastWeek,
  monthSpan,
  projectsEndingSoon,
  timesheetByPerson,
} from "./project-admin-view";
import type { AppState, LeaveRequest, Project, Staffing, TimeBlock } from "./types";

const TODAY = "2026-10-14"; // a Wednesday; last week is 5–9 Oct

function project(id: string, code: string, startDate: string, endDate: string | null): Project {
  return { id, tenantId: "kmplus", code, name: `${code} work`, clientName: null, startDate, endDate };
}

function staffing(id: string, personId: string, projectId: string, load: number, startDate = "2026-09-01", endDate: string | null = null): Staffing {
  return { id, tenantId: "kmplus", personId, projectId, load, startDate, endDate };
}

function block(id: string, personId: string, day: string, hours: number, projectId: string | null): TimeBlock {
  const end = String(9 + hours).padStart(2, "0");
  return { id, tenantId: "kmplus", personId, typeId: "type-x", startAt: `${day}T09:00`, endAt: `${day}T${end}:00`, projectId, workItemId: null, title: id };
}

function leave(id: string, personId: string, kind: LeaveRequest["kind"], startDate: string, endDate: string, decision: LeaveRequest["decision"]): LeaveRequest {
  return {
    id, tenantId: "kmplus", personId, kind, leaveTypeId: null, coverPersonId: null, doctorLetterPath: null, note: "x",
    spanMode: "days", startDate, endDate, startTime: null, endTime: null, decision, decidedByPersonId: null,
  };
}

function world(): AppState {
  const base = createInitialState();
  return {
    ...base,
    publicHolidays: [],
    invites: [],
    projects: [project("p1", "AAA", "2026-01-01", "2026-11-01"), project("p2", "BBB", "2026-01-01", null), project("p3", "CCC", "2027-01-01", null)],
    staffings: [
      staffing("s1", "person-rayhan", "p1", 80),
      staffing("s2", "person-rayhan", "p2", 40),
      staffing("s3", "person-eka", "p2", 50),
    ],
    timeBlocks: [
      block("b1", "person-rayhan", "2026-10-05", 6, "p1"),
      block("b2", "person-rayhan", "2026-10-06", 2, "p2"),
      block("b3", "person-eka", "2026-10-05", 4, null),
      block("b4", "person-eka", "2026-09-30", 3, "p2"),
    ],
    leaveRequests: [
      leave("l1", "person-eka", "cuti", "2026-10-07", "2026-10-08", "paid"),
      leave("l2", "person-rayhan", "remote", "2026-10-09", "2026-10-09", "paid"),
      leave("l3", "person-eka", "sick", "2026-10-20", "2026-10-20", null),
      leave("l4", "person-eka", "cuti", "2026-09-28", "2026-10-02", "unpaid"),
    ],
  };
}

describe("project admin view", () => {
  it("spans a month from its first to its last day", () => {
    expect(monthSpan(2026, 1)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthSpan(2026, 11)).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("counts active projects, staffed and overloaded people, month hours to today, and leave to decide", () => {
    expect(adminFacts(world(), TODAY)).toEqual({
      activeProjects: 2,
      projects: 3,
      staffed: 2,
      overloaded: 1,
      monthHours: 12,
      leaveToDecide: 1,
    });
  });

  it("orders hours by project most first and keeps time with no project last", () => {
    const rows = hoursByProject(world(), "2026-10-01", "2026-10-31");
    expect(rows.map((row) => [row.project?.code ?? null, row.hours])).toEqual([
      ["AAA", 6],
      ["BBB", 2],
      [null, 4],
    ]);
  });

  it("lists people by hours in the month with days logged and the project split", () => {
    const rows = timesheetByPerson(world(), "2026-10-01", "2026-10-31");
    expect(rows.map((row) => [row.person.id, row.hours, row.daysLogged])).toEqual([
      ["person-rayhan", 8, 2],
      ["person-eka", 4, 1],
    ]);
    expect(rows[0].byProject.map((part) => part.project?.code)).toEqual(["AAA", "BBB"]);
  });

  it("finds last week's unlogged working days, skipping cuti and sick but not remote", () => {
    const gaps = missingHoursLastWeek(world(), TODAY);
    const byPerson = Object.fromEntries(gaps.map((row) => [row.personId, row.days]));
    expect(byPerson["person-rayhan"]).toEqual(["2026-10-07", "2026-10-08", "2026-10-09"]);
    expect(byPerson["person-eka"]).toEqual(["2026-10-06", "2026-10-09"]);
  });

  it("skips public holidays when looking for missing hours", () => {
    const state = { ...world(), publicHolidays: [{ id: "h1", tenantId: "kmplus", date: "2026-10-09", name: "Holiday", origin: "libur" as const, suppressed: false, nameLocked: false }] };
    const eka = missingHoursLastWeek(state, TODAY).find((row) => row.personId === "person-eka");
    expect(eka?.days).toEqual(["2026-10-06"]);
  });

  it("shows approved leave touching the month with the working days inside it", () => {
    const rows = approvedLeaveInSpan(world(), "2026-10-01", "2026-10-31");
    expect(rows.map((row) => [row.row.id, row.workingDays])).toEqual([
      ["l4", 2],
      ["l1", 2],
      ["l2", 1],
    ]);
  });

  it("names running projects that end within 30 days", () => {
    expect(projectsEndingSoon(world(), TODAY).map((row) => row.code)).toEqual(["AAA"]);
    expect(projectsEndingSoon(world(), "2026-09-01").map((row) => row.code)).toEqual([]);
  });
});
