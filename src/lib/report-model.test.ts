import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import { buildReport, reportDate, reportFileName, reportHours } from "./report-model";
import type { AppState, Invite, Project, Staffing, TimeBlock } from "./types";

const AT = { generatedBy: "Alvin Soleh", generatedAt: "13 Oct 2026, 10:42" };

function project(id: string, code: string, startDate = "2026-01-01", endDate: string | null = null): Project {
  return { id, tenantId: "kmplus", code, name: `${code} work`, clientName: null, startDate, endDate };
}

function staffing(id: string, personId: string, projectId: string, load: number, startDate = "2026-09-01", endDate: string | null = null): Staffing {
  return { id, tenantId: "kmplus", personId, projectId, load, startDate, endDate };
}

function block(id: string, personId: string, day: string, hours: number, projectId: string | null): TimeBlock {
  const end = String(9 + hours).padStart(2, "0");
  return { id, tenantId: "kmplus", personId, typeId: "type-x", startAt: `${day}T09:00`, endAt: `${day}T${end}:00`, projectId, workItemId: null, title: id };
}

function invite(id: string, timeBlockId: string, personId: string, status: Invite["status"]): Invite {
  return { id, tenantId: "kmplus", timeBlockId, personId, status };
}

function world(): AppState {
  const base = createInitialState();
  return {
    ...base,
    publicHolidays: [],
    invites: [],
    leaveRequests: [],
    projects: [project("p1", "AAA"), project("p2", "BBB")],
    staffings: [staffing("s1", "person-rayhan", "p1", 80), staffing("s2", "person-rayhan", "p2", 40), staffing("s3", "person-eka", "p2", 50)],
    timeBlocks: [],
  };
}

describe("Report model", () => {
  it("counts a Person's own blocks and accepted Meetings inside the range, never pending invites or days outside it", () => {
    const state: AppState = {
      ...world(),
      timeBlocks: [
        block("first-day", "person-rayhan", "2026-10-01", 3, "p1"),
        block("last-day", "person-rayhan", "2026-10-31", 2, "p1"),
        block("day-before", "person-rayhan", "2026-09-30", 5, "p1"),
        block("day-after", "person-rayhan", "2026-11-01", 5, "p1"),
        block("meeting", "person-rayhan", "2026-10-05", 1, "p2"),
      ],
      invites: [invite("i1", "meeting", "person-eka", "accepted"), invite("i2", "meeting", "person-alfredo", "pending")],
    };
    const report = buildReport(state, { from: "2026-10-01", to: "2026-10-31" }, AT);
    // Rayhan 3 + 2 + 1, Eka accepted the 1h meeting, Alfredo's pending invite adds nothing.
    expect(report.summary.totalHours).toBe(7);
  });

  it("splits hours on Projects from time with no Project and lists Projects most first, no Project last", () => {
    const state: AppState = {
      ...world(),
      timeBlocks: [
        block("a1", "person-rayhan", "2026-10-05", 2, "p1"),
        block("b1", "person-rayhan", "2026-10-06", 5, "p2"),
        block("none", "person-eka", "2026-10-06", 6, null),
        block("a2", "person-eka", "2026-10-07", 1, "p1"),
      ],
    };
    const report = buildReport(state, { from: "2026-10-01", to: "2026-10-31" }, AT);
    expect(report.summary).toMatchObject({ totalHours: 14, projectHours: 8, noProjectHours: 6 });
    expect(report.hoursByProject.map((row) => [row.project?.code ?? null, row.hours])).toEqual([
      ["BBB", 5],
      ["AAA", 3],
      [null, 6],
    ]);
  });

  it("counts working days as weekdays that are not an active public holiday", () => {
    const holiday = (id: string, date: string, suppressed: boolean) => ({ id, tenantId: "kmplus", date, name: id, origin: "libur" as const, suppressed, nameLocked: false });
    const state: AppState = { ...world(), publicHolidays: [holiday("h1", "2026-10-02", false), holiday("h2", "2026-10-06", true)] };
    // October 2026 has 22 weekdays; Fri 2 Oct is a holiday, the suppressed Tue 6 Oct still counts.
    expect(buildReport(state, { from: "2026-10-01", to: "2026-10-31" }, AT).summary.workingDays).toBe(21);
  });

  it("includes People who logged hours or whose Staffing overlaps the range, and counts those past 100% Load on any one day", () => {
    const state: AppState = {
      ...world(),
      staffings: [
        // Rayhan reaches 120% from 15 Oct.
        staffing("s1", "person-rayhan", "p1", 80, "2026-09-01"),
        staffing("s2", "person-rayhan", "p2", 40, "2026-10-15"),
        // Eka's two rows never overlap each other, so her peak is 80%, not 140%.
        staffing("s3", "person-eka", "p1", 80, "2026-09-01", "2026-10-10"),
        staffing("s4", "person-eka", "p2", 60, "2026-10-11"),
        // Denny starts in November, after the range.
        staffing("s5", "person-denny", "p1", 50, "2026-11-01"),
      ],
      // Alfredo has no Staffing but logged internal time.
      timeBlocks: [block("x", "person-alfredo", "2026-10-05", 2, null)],
    };
    const report = buildReport(state, { from: "2026-10-01", to: "2026-10-31" }, AT);
    expect(report.summary.people).toBe(3);
    expect(report.summary.overloaded).toBe(1);
  });

  it("writes dates with fixed month names and hours with one decimal and thousands separators", () => {
    expect(reportDate("2026-09-21")).toBe("21 Sep 2026");
    expect(reportDate("2026-01-05")).toBe("5 Jan 2026");
    expect(reportHours(2170)).toBe("2,170.0");
    expect(reportHours(7.25)).toBe("7.3");
  });

  it("names the file after the title and the range", () => {
    const report = buildReport(world(), { from: "2026-09-21", to: "2026-10-20" }, AT);
    expect(reportFileName(report, "pdf")).toBe("Project report 2026-09-21 to 2026-10-20.pdf");
    expect(reportFileName(report, "xlsx")).toBe("Project report 2026-09-21 to 2026-10-20.xlsx");
  });

  it("keeps exact hours so Project rows always add up to the total, even for 15-minute blocks", () => {
    const quarter = (id: string, projectId: string | null): TimeBlock => ({ ...block(id, "person-rayhan", "2026-10-05", 1, projectId), startAt: `2026-10-05T${id}`, endAt: `2026-10-05T${id.slice(0, 3)}${String(Number(id.slice(3)) + 15).padStart(2, "0")}` });
    const state: AppState = { ...world(), timeBlocks: [quarter("09:00", "p1"), quarter("10:00", "p2"), quarter("11:00", null)] };
    const report = buildReport(state, { from: "2026-10-01", to: "2026-10-31" }, AT);
    const rows = report.hoursByProject.reduce((sum, row) => sum + row.hours, 0);
    expect(rows).toBeCloseTo(report.summary.totalHours, 10);
    expect(report.summary.projectHours + report.summary.noProjectHours).toBeCloseTo(report.summary.totalHours, 10);
    expect(report.summary.totalHours).toBeCloseTo(0.75, 10);
  });
});
