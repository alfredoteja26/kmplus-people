import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import { buildReport, gridCellLook, REPORT_DEFAULTS, reportEmptyLine, reportFileName, reportHours, reportRange, suggestedPreparedFor } from "./report-model";
import type { AppState, Invite, LeaveRequest, Project, PublicHoliday, Staffing, TimeBlock } from "./types";

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

function leave(id: string, personId: string, kind: LeaveRequest["kind"], startDate: string, endDate: string, decision: LeaveRequest["decision"], part?: [string, string]): LeaveRequest {
  return {
    id,
    tenantId: "kmplus",
    personId,
    kind,
    leaveTypeId: kind === "cuti" ? "lt-tahunan" : null,
    coverPersonId: null,
    doctorLetterPath: null,
    note: id,
    spanMode: part ? "hours" : "days",
    startDate,
    endDate,
    startTime: part?.[0] ?? null,
    endTime: part?.[1] ?? null,
    decision,
    decidedByPersonId: decision ? "person-alfredo" : null,
  };
}

function holiday(id: string, date: string, suppressed = false): PublicHoliday {
  return { id, tenantId: "kmplus", date, name: id, origin: "libur", suppressed, nameLocked: false };
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

  describe("timesheet by person", () => {
    it("gives each Person their hours, distinct days with hours, and the split across Projects, no Project last", () => {
      const state: AppState = {
        ...world(),
        timeBlocks: [
          block("a1", "person-rayhan", "2026-10-05", 2, "p1"),
          block("a2", "person-rayhan", "2026-10-05", 1, null),
          block("b1", "person-rayhan", "2026-10-06", 4, "p2"),
        ],
      };
      const report = buildReport(state, { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" }, AT);
      const rayhan = report.people.find((row) => row.person.id === "person-rayhan")!;
      expect(rayhan).toMatchObject({ hours: 7, daysLogged: 2 });
      expect(rayhan.byProject.map((row) => [row.project?.code ?? null, row.hours])).toEqual([
        ["BBB", 4],
        ["AAA", 2],
        [null, 1],
      ]);
      // Eka is staffed on BBB and logged nothing.
      expect(report.people.find((row) => row.person.id === "person-eka")).toMatchObject({ hours: 0, daysLogged: 0, byProject: [] });
    });
  });

  describe("approved leave", () => {
    const OCT = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" };
    function withLeave(leaveRequests: LeaveRequest[], publicHolidays: PublicHoliday[] = []): AppState {
      return { ...world(), leaveTypes: [{ id: "lt-tahunan", tenantId: "kmplus", name: "Tahunan", sortOrder: 0 }], leaveRequests, publicHolidays };
    }

    it("counts working days inside the range only, skipping the weekend and an active public holiday", () => {
      // Thu 8 Oct to Wed 14 Oct is 5 weekdays; Fri 9 Oct is a holiday, and the suppressed Tue 13 Oct still counts.
      const state = withLeave([leave("l1", "person-rayhan", "cuti", "2026-10-08", "2026-10-14", "paid")], [holiday("h1", "2026-10-09"), holiday("h2", "2026-10-13", true)]);
      expect(buildReport(state, OCT, AT).leave.map((row) => [row.leaveType, row.workingDays])).toEqual([["Tahunan", 4]]);
      // Mon 28 Sep to Fri 2 Oct crosses the range start: only 1 and 2 Oct count, and the row keeps its own dates.
      const across = withLeave([leave("l2", "person-rayhan", "sick", "2026-09-28", "2026-10-02", "unpaid")]);
      expect(buildReport(across, OCT, AT).leave[0]).toMatchObject({ startDate: "2026-09-28", endDate: "2026-10-02", workingDays: 2 });
    });

    it("lists only may-be-taken leave of People in the Report, split into paid and unpaid by kind", () => {
      const state = withLeave([
        leave("paid-cuti", "person-rayhan", "cuti", "2026-10-05", "2026-10-06", "paid"),
        leave("unpaid-cuti", "person-eka", "cuti", "2026-10-07", "2026-10-07", "unpaid"),
        leave("sick", "person-eka", "sick", "2026-10-12", "2026-10-14", "paid"),
        leave("pending", "person-rayhan", "cuti", "2026-10-20", "2026-10-20", null),
        leave("refused", "person-rayhan", "cuti", "2026-10-21", "2026-10-21", "refused"),
        // Denny has no Staffing and no hours, so he is not in the Report.
        leave("outsider", "person-denny", "cuti", "2026-10-05", "2026-10-05", "paid"),
      ]);
      const report = buildReport(state, OCT, AT);
      expect(report.leave.map((row) => row.person.id)).toEqual(["person-rayhan", "person-eka", "person-eka"]);
      expect(report.summary.leaveByKind).toEqual([
        { kind: "cuti", label: "Cuti", paid: 2, unpaid: 1 },
        { kind: "sick", label: "Sick", paid: 3, unpaid: 0 },
        { kind: "remote", label: "Remote", paid: 0, unpaid: 0 },
      ]);
      expect(report.summary.daysAway).toBe(6);
    });

    it("lists remote leave without counting it as days away", () => {
      const state = withLeave([leave("remote", "person-rayhan", "remote", "2026-10-05", "2026-10-09", "paid"), leave("cuti", "person-rayhan", "cuti", "2026-10-12", "2026-10-12", "paid")]);
      const report = buildReport(state, OCT, AT);
      expect(report.leave.map((row) => [row.kind, row.workingDays])).toEqual([
        ["remote", 5],
        ["cuti", 1],
      ]);
      expect(report.summary.daysAway).toBe(1);
    });

    it("gives part-day leave its hours and no working day", () => {
      const state = withLeave([leave("half", "person-rayhan", "cuti", "2026-10-05", "2026-10-05", "unpaid", ["09:00", "12:30"])]);
      const report = buildReport(state, OCT, AT);
      expect(report.leave[0]).toMatchObject({ partOfDay: { start: "09:00", end: "12:30" }, hours: 3.5, workingDays: 0 });
      expect(report.summary.daysAway).toBe(0);
    });

    it("prints one line for an empty section, naming the range", () => {
      expect(buildReport(withLeave([]), OCT, AT).leave).toEqual([]);
      expect(reportEmptyLine({ from: "2026-09-21", to: "2026-10-20" }, "approved leave")).toBe("No approved leave between 21 Sep and 20 Oct 2026.");
      expect(reportEmptyLine({ from: "2026-12-21", to: "2027-01-20" }, "approved leave")).toBe("No approved leave between 21 Dec 2026 and 20 Jan 2027.");
    });
  });

  describe("daily grid", () => {
    function gridState(): AppState {
      return {
        ...world(),
        leaveTypes: [{ id: "lt-tahunan", tenantId: "kmplus", name: "Tahunan", sortOrder: 0 }],
        publicHolidays: [holiday("Maulid", "2026-09-25")],
        timeBlocks: [
          block("work", "person-rayhan", "2026-09-22", 8, "p1"),
          block("remote-work", "person-rayhan", "2026-09-23", 6, "p1"),
          block("half-day", "person-eka", "2026-09-22", 4, "p2"),
          block("october", "person-eka", "2026-10-02", 3, null),
        ],
        leaveRequests: [
          leave("remote", "person-rayhan", "remote", "2026-09-23", "2026-09-23", "paid"),
          // Thu 24 to Mon 28 Sep: the Friday holiday and the weekend are not marked.
          leave("cuti", "person-rayhan", "cuti", "2026-09-24", "2026-09-28", "paid"),
          leave("sick", "person-eka", "sick", "2026-09-29", "2026-09-30", "unpaid"),
          leave("part", "person-eka", "cuti", "2026-09-22", "2026-09-22", "paid", ["13:00", "17:00"]),
        ],
      };
    }
    const RANGE = { ...REPORT_DEFAULTS, from: "2026-09-21", to: "2026-10-20" };

    it("cuts month blocks at the range edges", () => {
      const { months } = buildReport(gridState(), RANGE, AT).dailyGrid;
      expect(months.map((month) => [month.label, month.from, month.to, month.days.length])).toEqual([
        ["September 2026", "2026-09-21", "2026-09-30", 10],
        ["October 2026", "2026-10-01", "2026-10-20", 20],
      ]);
      expect(months[0].days[0]).toEqual({ date: "2026-09-21", day: 21, weekday: "M", weekend: false, holiday: null });
    });

    it("gives each cell its hours and leave: cuti, sick, remote with hours, and part-day leave with the hours worked", () => {
      const september = buildReport(gridState(), RANGE, AT).dailyGrid.months[0];
      const cell = (personId: string, date: string) => september.rows.find((row) => row.person.id === personId)!.cells[september.days.findIndex((day) => day.date === date)];
      expect(cell("person-rayhan", "2026-09-22")).toEqual({ hours: 8, leave: null, partial: false });
      expect(cell("person-rayhan", "2026-09-23")).toEqual({ hours: 6, leave: "remote", partial: false });
      expect(cell("person-rayhan", "2026-09-24")).toEqual({ hours: 0, leave: "cuti", partial: false });
      expect(cell("person-rayhan", "2026-09-28")).toEqual({ hours: 0, leave: "cuti", partial: false });
      expect(cell("person-eka", "2026-09-30")).toEqual({ hours: 0, leave: "sick", partial: false });
      expect(cell("person-eka", "2026-09-22")).toEqual({ hours: 4, leave: "cuti", partial: true });
    });

    it("names the holiday on its column and leaves it and the weekend unmarked by full-day leave", () => {
      const september = buildReport(gridState(), RANGE, AT).dailyGrid.months[0];
      const index = (date: string) => september.days.findIndex((day) => day.date === date);
      expect(september.days[index("2026-09-25")]).toMatchObject({ holiday: "Maulid", weekend: false });
      expect(september.days[index("2026-09-26")]).toMatchObject({ weekday: "S", weekend: true });
      const rayhan = september.rows.find((row) => row.person.id === "person-rayhan")!;
      expect([rayhan.cells[index("2026-09-25")].leave, rayhan.cells[index("2026-09-26")].leave]).toEqual([null, null]);
    });

    it("totals each row, each day, and each month to the sum of its cells", () => {
      const report = buildReport(gridState(), RANGE, AT);
      for (const month of report.dailyGrid.months) {
        for (const row of month.rows) expect(row.total).toBe(row.cells.reduce((total, cell) => total + cell.hours, 0));
        month.days.forEach((_, index) => expect(month.dayTotals[index]).toBe(month.rows.reduce((total, row) => total + row.cells[index].hours, 0)));
        expect(month.total).toBe(month.rows.reduce((total, row) => total + row.total, 0));
      }
      expect(report.dailyGrid.months.reduce((total, month) => total + month.total, 0)).toBe(report.summary.totalHours);
    });

    it("builds 12 months for 16 people and about 8,000 blocks well under a second", () => {
      const base = world();
      const people = Array.from({ length: 16 }, (_, index) => ({ ...base.people[0], id: `p-${index}`, preferredName: `Person ${index}` }));
      const timeBlocks: TimeBlock[] = [];
      for (let day = "2025-11-01"; day <= "2026-10-31"; day = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) {
        if ([0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay())) continue;
        for (const person of people) timeBlocks.push(block(`${person.id}-${day}-a`, person.id, day, 4, "p1"), block(`${person.id}-${day}-b`, person.id, day, 3, null));
      }
      const state: AppState = { ...base, people, timeBlocks, staffings: [] };
      const started = performance.now();
      const report = buildReport(state, { ...REPORT_DEFAULTS, from: "2025-11-01", to: "2026-10-31" }, AT);
      expect(performance.now() - started).toBeLessThan(1000);
      expect(timeBlocks.length).toBeGreaterThan(8000);
      expect(report.dailyGrid.months).toHaveLength(12);
    });
  });

  describe("hours by project, staffing, and projects", () => {
    const OCT = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" };
    function portfolio(): AppState {
      const item = (id: string, projectId: string, name: string) => ({ id, tenantId: "kmplus", projectId, name, description: "", picPersonId: "person-rayhan", startDate: "2026-01-01", endDate: "2026-12-31" });
      return {
        ...world(),
        projects: [
          { ...project("p1", "AAA"), clientName: "PT Samudra Energi" },
          project("p2", "BBB"),
          // Ended before October, and starts after it.
          project("p3", "OLD", "2026-01-01", "2026-09-30"),
          project("p4", "NEW", "2026-11-01"),
        ],
        workItems: [item("w1", "p1", "Design"), item("w2", "p1", "Build")],
        staffings: [
          staffing("s1", "person-rayhan", "p1", 80, "2026-09-01"),
          // Rayhan reaches 120% from 15 Oct.
          staffing("s2", "person-rayhan", "p2", 40, "2026-10-15"),
          staffing("s3", "person-eka", "p1", 50, "2026-10-01", "2026-10-31"),
          // Ended in September: not in October's Staffing.
          staffing("s4", "person-eka", "p2", 50, "2026-08-01", "2026-09-30"),
        ],
        timeBlocks: [
          { ...block("a", "person-rayhan", "2026-10-05", 3, "p1"), workItemId: "w1" },
          { ...block("b", "person-rayhan", "2026-10-06", 2, "p1"), workItemId: "w2" },
          { ...block("c", "person-eka", "2026-10-06", 4, "p1"), workItemId: "w2" },
          block("d", "person-eka", "2026-10-07", 1, "p1"),
          block("e", "person-rayhan", "2026-10-20", 2, "p2"),
          block("f", "person-eka", "2026-10-21", 6, null),
        ],
      };
    }

    it("breaks each Project's hours down by Person and by WorkItem, most first, with no Project last", () => {
      const report = buildReport(portfolio(), OCT, AT);
      expect(report.hoursByProject.map((row) => [row.project?.code ?? null, row.hours])).toEqual([
        ["AAA", 10],
        ["BBB", 2],
        // 6 hours, more than BBB, but time with no Project always comes last.
        [null, 6],
      ]);
      const aaa = report.hoursByProject[0];
      expect(aaa.people.map((row) => [row.person.id, row.hours])).toEqual([
        ["person-eka", 5],
        ["person-rayhan", 5],
      ]);
      expect(aaa.workItems.map((row) => [row.workItem?.name ?? null, row.hours])).toEqual([
        ["Build", 6],
        ["Design", 3],
        [null, 1],
      ]);
      // With time that names no Project left out, its row disappears.
      expect(buildReport(portfolio(), { ...OCT, includeNoProject: false }, AT).hoursByProject.some((row) => row.project === null)).toBe(false);
    });

    it("lists Staffing rows overlapping the range with each Person's peak Load across all their Staffing", () => {
      const report = buildReport(portfolio(), OCT, AT);
      expect(report.staffing.map((row) => [row.person.id, row.project?.code, row.load, row.peakLoad])).toEqual([
        ["person-eka", "AAA", 50, 50],
        ["person-rayhan", "AAA", 80, 120],
        ["person-rayhan", "BBB", 40, 120],
      ]);
      // Filtered to AAA, Rayhan's BBB row leaves the list but still counts toward his peak.
      const aaa = buildReport(portfolio(), { ...OCT, projectIds: ["p1"] }, AT);
      expect(aaa.staffing.map((row) => [row.person.id, row.project?.code, row.peakLoad])).toEqual([
        ["person-eka", "AAA", 50],
        ["person-rayhan", "AAA", 120],
      ]);
    });

    it("lists Projects overlapping the range that pass the filter, with hours in range and the People on them", () => {
      const report = buildReport(portfolio(), OCT, AT);
      expect(report.projects.map((row) => [row.project.code, row.hours, row.people])).toEqual([
        ["AAA", 10, 2],
        ["BBB", 2, 1],
      ]);
      expect(buildReport(portfolio(), { ...OCT, projectIds: ["p2"] }, AT).projects.map((row) => row.project.code)).toEqual(["BBB"]);
    });

    it("leaves all three empty for a range with no Projects running", () => {
      const report = buildReport({ ...portfolio(), staffings: [] }, { ...REPORT_DEFAULTS, from: "2025-01-01", to: "2025-01-31" }, AT);
      expect([report.hoursByProject, report.staffing, report.projects]).toEqual([[], [], []]);
      expect(reportEmptyLine(report, "projects running")).toBe("No projects running between 1 Jan and 31 Jan 2025.");
    });
  });

  describe("timesheet detail", () => {
    const OCT = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" };
    function detailState(): AppState {
      return {
        ...world(),
        timeBlockTypes: [{ id: "type-x", tenantId: "kmplus", name: "Meeting", sortOrder: 0, allowsInvites: true }],
        timeBlocks: [
          { ...block("late", "person-rayhan", "2026-10-05", 2, "p1"), startAt: "2026-10-05T14:00", endAt: "2026-10-05T16:00" },
          block("early", "person-rayhan", "2026-10-05", 1, "p2"),
          block("before", "person-eka", "2026-10-02", 3, null),
          block("outside", "person-eka", "2026-11-02", 3, "p1"),
        ],
        invites: [invite("i1", "late", "person-eka", "accepted"), invite("i2", "late", "person-alfredo", "pending")],
      };
    }
    const rows = (report: ReturnType<typeof buildReport>) => report.timesheetDetail.map((row) => [row.day, row.start, row.person.id, row.project?.code ?? null, row.hours]);

    it("lists every counted block by date then start, with accepted Meetings for the invitee and never pending ones", () => {
      expect(rows(buildReport(detailState(), OCT, AT))).toEqual([
        ["2026-10-02", "09:00", "person-eka", null, 3],
        ["2026-10-05", "09:00", "person-rayhan", "BBB", 1],
        ["2026-10-05", "14:00", "person-eka", "AAA", 2],
        ["2026-10-05", "14:00", "person-rayhan", "AAA", 2],
      ]);
      const first = buildReport(detailState(), OCT, AT).timesheetDetail[0];
      expect([first.end, first.type?.name, first.title, first.workItem]).toEqual(["12:00", "Meeting", "before", null]);
    });

    it("follows the Project, People, and no-project filters", () => {
      expect(rows(buildReport(detailState(), { ...OCT, projectIds: ["p1"] }, AT)).map((row) => row[3])).toEqual(["AAA", "AAA"]);
      expect(rows(buildReport(detailState(), { ...OCT, personIds: ["person-eka"] }, AT)).map((row) => row[2])).toEqual(["person-eka", "person-eka"]);
      expect(rows(buildReport(detailState(), { ...OCT, includeNoProject: false }, AT)).some((row) => row[3] === null)).toBe(false);
    });
  });

  it("reads a grid cell the same way for both files: the leave word on a free day off, otherwise hours with a mark", () => {
    expect(gridCellLook({ hours: 0, leave: "cuti", partial: false })).toEqual({ word: "Cuti", mark: null, tint: "cuti" });
    expect(gridCellLook({ hours: 0, leave: "sick", partial: false })).toEqual({ word: "Sick", mark: null, tint: "sick" });
    // Hours logged on a leave day before it was approved still show, so no hour drops out of a total.
    expect(gridCellLook({ hours: 3, leave: "cuti", partial: false })).toEqual({ word: null, mark: "C", tint: "cuti" });
    expect(gridCellLook({ hours: 4, leave: "sick", partial: true })).toEqual({ word: null, mark: "S", tint: "sick" });
    expect(gridCellLook({ hours: 6, leave: "remote", partial: false })).toEqual({ word: null, mark: "R", tint: "remote" });
    expect(gridCellLook({ hours: 8, leave: null, partial: false })).toEqual({ word: null, mark: null, tint: null });
  });

  it("returns the file names for both formats", () => {
    const report = buildReport(world(), { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", title: "Samudra: October" }, AT);
    expect(report.fileNames).toEqual({ pdf: "Samudra October 2026-10-01 to 2026-10-31.pdf", xlsx: "Samudra October 2026-10-01 to 2026-10-31.xlsx" });
  });

  it("keeps the chosen sections in the fixed order", () => {
    const report = buildReport(world(), { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", sections: ["leave", "cover", "summary"] }, AT);
    expect(report.sections).toEqual(["cover", "summary", "leave"]);
  });

  it("writes dates with fixed month names and hours with one decimal and thousands separators", () => {
    expect(reportRange({ from: "2026-09-21", to: "2026-10-05" })).toBe("21 Sep 2026 – 5 Oct 2026");
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
