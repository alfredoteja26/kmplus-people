import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import { buildReport, REPORT_DEFAULTS, reportDate, reportFileName, reportHours, suggestedPreparedFor } from "./report-model";
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
    const report = buildReport(state, { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" }, AT);
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
    const report = buildReport(state, { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" }, AT);
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
    expect(buildReport(state, { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" }, AT).summary.workingDays).toBe(21);
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
    const report = buildReport(state, { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" }, AT);
    expect(report.summary.people).toBe(3);
    expect(report.summary.overloaded).toBe(1);
  });

  describe("filters", () => {
    const OCT = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" };
    function filtered(): AppState {
      return {
        ...world(),
        projects: [project("p1", "AAA"), project("p2", "BBB"), project("p3", "CCC")],
        staffings: [
          // Rayhan is staffed on AAA and BBB, 120% together; Eka on BBB; Denny on CCC with no hours.
          staffing("s1", "person-rayhan", "p1", 80),
          staffing("s2", "person-rayhan", "p2", 40),
          staffing("s3", "person-eka", "p2", 50),
          staffing("s4", "person-denny", "p3", 50),
        ],
        timeBlocks: [
          block("a", "person-rayhan", "2026-10-05", 2, "p1"),
          block("b", "person-rayhan", "2026-10-06", 3, "p2"),
          block("e", "person-eka", "2026-10-06", 4, "p2"),
          block("internal", "person-eka", "2026-10-07", 5, null),
          // Alfredo has no Staffing but logged hours on AAA.
          block("guest", "person-alfredo", "2026-10-08", 1, "p1"),
        ],
      };
    }
    const names = (report: ReturnType<typeof buildReport>) => report.people.map((row) => [row.person.id, row.hours]);

    it("counts only the chosen Projects' hours, leaves out time with no Project, and narrows People to those staffed or logged on them", () => {
      const report = buildReport(filtered(), { ...OCT, projectIds: ["p1"], includeNoProject: true }, AT);
      expect(report.summary).toMatchObject({ totalHours: 3, projectHours: 3, noProjectHours: 0, people: 2 });
      expect(report.hoursByProject.map((row) => row.project?.code ?? null)).toEqual(["AAA"]);
      expect(names(report)).toEqual([
        ["person-alfredo", 1],
        ["person-rayhan", 2],
      ]);
      expect(report.includeNoProject).toBe(false);
    });

    it("leaves out time with no Project when the switch is off, with all Projects included", () => {
      const report = buildReport(filtered(), { ...OCT, includeNoProject: false }, AT);
      expect(report.summary).toMatchObject({ totalHours: 10, noProjectHours: 0 });
      expect(report.hoursByProject.some((row) => row.project === null)).toBe(false);
    });

    it("narrows People and every figure to the chosen People", () => {
      const report = buildReport(filtered(), { ...OCT, personIds: ["person-eka"] }, AT);
      expect(report.summary).toMatchObject({ totalHours: 9, projectHours: 4, noProjectHours: 5, people: 1, overloaded: 0 });
      expect(names(report)).toEqual([["person-eka", 9]]);
    });

    it("shows a staffed Person with no hours in the range at 0", () => {
      const report = buildReport(filtered(), OCT, AT);
      expect(names(report)).toContainEqual(["person-denny", 0]);
      expect(buildReport(filtered(), { ...OCT, projectIds: ["p3"] }, AT).people.map((row) => [row.person.id, row.hours])).toEqual([["person-denny", 0]]);
    });

    it("counts peak Load across all of a Person's Staffing, not only the filtered Projects", () => {
      // Only AAA is chosen (80%), but Rayhan's BBB row takes him to 120%.
      expect(buildReport(filtered(), { ...OCT, projectIds: ["p1"] }, AT).summary.overloaded).toBe(1);
    });

    it("names the filters in plain words", () => {
      const words = (report: ReturnType<typeof buildReport>) => report.filters.map((row) => `${row.label}: ${row.value}`);
      expect(words(buildReport(filtered(), OCT, AT))).toEqual(["Projects: All projects", "People: Everyone", "Time with no project: Included"]);
      const narrowed = buildReport(filtered(), { ...OCT, projectIds: ["p2", "p1"], personIds: ["person-rayhan", "person-eka"] }, AT);
      expect(words(narrowed)).toEqual(["Projects: AAA, BBB", "People: Eka, Rayhan", "Time with no project: Left out"]);
    });
  });

  it("writes dates with fixed month names and hours with one decimal and thousands separators", () => {
    expect(reportDate("2026-09-21")).toBe("21 Sep 2026");
    expect(reportDate("2026-01-05")).toBe("5 Jan 2026");
    expect(reportHours(2170)).toBe("2,170.0");
    expect(reportHours(7.25)).toBe("7.3");
  });

  it("names the file after the title and the range, without characters a file name cannot hold", () => {
    const range = { ...REPORT_DEFAULTS, from: "2026-09-21", to: "2026-10-20" };
    const report = buildReport(world(), range, AT);
    expect(reportFileName(report, "pdf")).toBe("Project report 2026-09-21 to 2026-10-20.pdf");
    expect(reportFileName(report, "xlsx")).toBe("Project report 2026-09-21 to 2026-10-20.xlsx");
    const client = buildReport(world(), { ...range, title: 'Samudra Energi,  Q3/Q4: "final"?' }, AT);
    expect(reportFileName(client, "pdf")).toBe("Samudra Energi, Q3Q4 final 2026-09-21 to 2026-10-20.pdf");
  });

  it("falls back to the default title when it is empty and caps the title and Prepared for at 80 characters", () => {
    const range = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" };
    expect(buildReport(world(), { ...range, title: "   " }, AT).title).toBe("Project report");
    const long = "x".repeat(100);
    const report = buildReport(world(), { ...range, title: `  ${long}`, preparedFor: long }, AT);
    expect(report.title).toHaveLength(80);
    expect(report.preparedFor).toHaveLength(80);
    expect(buildReport(world(), { ...range, preparedFor: "  PT Samudra  Energi " }, AT).preparedFor).toBe("PT Samudra Energi");
  });

  it("starts Prepared for with the client of exactly one chosen Project", () => {
    const state: AppState = { ...world(), projects: [{ ...project("p1", "AAA"), clientName: "PT Samudra Energi" }, project("p2", "BBB")] };
    expect(suggestedPreparedFor(state, ["p1"])).toBe("PT Samudra Energi");
    // An internal Project has no client, and two Projects or none name no single client.
    expect(suggestedPreparedFor(state, ["p2"])).toBe("");
    expect(suggestedPreparedFor(state, ["p1", "p2"])).toBe("");
    expect(suggestedPreparedFor(state, null)).toBe("");
  });

  it("keeps exact hours so Project rows always add up to the total, even for 15-minute blocks", () => {
    const quarter = (id: string, projectId: string | null): TimeBlock => ({ ...block(id, "person-rayhan", "2026-10-05", 1, projectId), startAt: `2026-10-05T${id}`, endAt: `2026-10-05T${id.slice(0, 3)}${String(Number(id.slice(3)) + 15).padStart(2, "0")}` });
    const state: AppState = { ...world(), timeBlocks: [quarter("09:00", "p1"), quarter("10:00", "p2"), quarter("11:00", null)] };
    const report = buildReport(state, { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" }, AT);
    const rows = report.hoursByProject.reduce((sum, row) => sum + row.hours, 0);
    expect(rows).toBeCloseTo(report.summary.totalHours, 10);
    expect(report.summary.projectHours + report.summary.noProjectHours).toBeCloseTo(report.summary.totalHours, 10);
    expect(report.summary.totalHours).toBeCloseTo(0.75, 10);
  });
});
