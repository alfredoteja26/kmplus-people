import type { AppState, LeaveKind } from "@/lib/types";
import { activeHolidays, isWeekendIso, KIND_LABEL, leaveDates } from "@/lib/leave-view";
import { personName } from "@/lib/project-view";
import { addDaysIso, countedTimeBlocksForPerson, hoursBetween, leaveIsApproved, personLoadSum } from "@/lib/work-delivery-query";

/** Every section a Report can hold, in the fixed order both files follow. */
export const SECTION_KEYS = ["cover", "summary", "hoursByProject", "timesheetByPerson", "dailyGrid", "timesheetDetail", "staffing", "projects", "leave"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABEL: Record<SectionKey, string> = {
  cover: "Cover",
  summary: "Summary",
  hoursByProject: "Hours by project",
  timesheetByPerson: "Timesheet by person",
  dailyGrid: "Daily grid",
  timesheetDetail: "Timesheet detail",
  staffing: "Staffing",
  projects: "Projects",
  leave: "Approved leave",
};

/** On by default: serves management, billing, and payroll at once. */
export const DEFAULT_SECTIONS: SectionKey[] = ["cover", "summary", "timesheetByPerson", "dailyGrid", "leave"];

/** The sections both files can draw so far; the page offers only these until the rest are built. */
export const READY_SECTIONS: readonly SectionKey[] = ["cover", "summary", "hoursByProject", "timesheetByPerson", "dailyGrid", "staffing", "projects", "leave"];

/** `keys` without repeats or unknown keys, in the fixed order. */
export function orderSections(keys: readonly string[]): SectionKey[] {
  return SECTION_KEYS.filter((key) => keys.includes(key));
}

/**
 * What an Admin chose for one Report. Dates are ISO, `to` on or after `from`. A null id list means every
 * Project or everyone. `includeNoProject` is ignored while Projects are chosen: a client file carries no
 * internal time.
 */
export type ReportConfig = {
  from: string;
  to: string;
  projectIds: string[] | null;
  personIds: string[] | null;
  includeNoProject: boolean;
  /** Typed by the Admin; the Report trims it, caps it, and falls back to "Project report" when empty. */
  title: string;
  /** Optional client name, typed by hand. */
  preparedFor: string;
  sections: SectionKey[];
};

export const REPORT_TITLE = "Project report";
/** The longest title or Prepared for a Report holds, so it fits the cover and the page header. */
export const REPORT_TEXT_MAX = 80;

/** Every setting except the range at its default: every Project, everyone, time with no Project included. */
export const REPORT_DEFAULTS = {
  projectIds: null,
  personIds: null,
  includeNoProject: true,
  title: REPORT_TITLE,
  preparedFor: "",
  sections: DEFAULT_SECTIONS,
} satisfies Omit<ReportConfig, "from" | "to">;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, REPORT_TEXT_MAX).trim();
}

/** The title a Report carries: trimmed, at most 80 characters, and "Project report" when left empty. */
export function reportTitle(value: string): string {
  return cleanText(value) || REPORT_TITLE;
}

/**
 * What Prepared for starts with: the client of the one chosen Project, or nothing. The Admin may still edit it,
 * and an edited value is never replaced.
 */
export function suggestedPreparedFor(state: AppState, projectIds: string[] | null): string {
  if (projectIds?.length !== 1) return "";
  return cleanText(state.projects.find((row) => row.id === projectIds[0])?.clientName ?? "");
}

/** Who generated the Report and when, in Asia/Jakarta wall time ("13 Oct 2026, 10:42"). */
export type ReportStamp = { generatedBy: string; generatedAt: string };

function overlaps(startDate: string, endDate: string | null, from: string, to: string) {
  return startDate <= to && (!endDate || endDate >= from);
}

/**
 * The highest summed Load on any one day of the range, across all of the Person's Staffing. A sum only rises
 * where a row starts, so checking the range start and each start inside it is enough.
 */
function peakLoad(state: AppState, personId: string, from: string, to: string) {
  const starts = state.staffings
    .filter((row) => row.personId === personId && row.startDate > from && row.startDate <= to)
    .map((row) => row.startDate);
  return Math.max(...[from, ...starts].map((day) => personLoadSum(state, personId, day)));
}

/** Whether a date is Monday to Friday and not an active public holiday. */
function workingDayTest(state: AppState) {
  const holidays = new Set(activeHolidays(state).map((row) => row.date));
  return (day: string) => !isWeekendIso(day) && !holidays.has(day);
}

/** Monday to Friday from `from` to `to`, excluding active public holidays. */
export function reportWorkingDays(state: AppState, from: string, to: string): number {
  const isWorkingDay = workingDayTest(state);
  let count = 0;
  for (let day = from; day <= to; day = addDaysIso(day, 1)) if (isWorkingDay(day)) count += 1;
  return count;
}

const LEAVE_KINDS: LeaveKind[] = ["cuti", "sick", "remote"];

/** `rows` grouped by `key` in one pass, keeping their order. */
function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const group = groups.get(key(row));
    if (group) group.push(row);
    else groups.set(key(row), [row]);
  }
  return groups;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** One Daily grid cell: counted hours, and the leave on that day, if any. */
export type GridCell = { hours: number; leave: LeaveKind | null; partial: boolean };

/**
 * The Report as figures, with no formatting or layout, so the spreadsheet and the PDF cannot disagree.
 * Hours stay exact; only display rounds them, so rows always add up to their totals. Rules: the Report
 * entry in CONTEXT.md.
 */
export function buildReport(state: AppState, config: ReportConfig, stamp: ReportStamp) {
  const { from, to } = config;
  const projectFilter = config.projectIds ? new Set(config.projectIds) : null;
  const personFilter = config.personIds ? new Set(config.personIds) : null;
  const includeNoProject = projectFilter ? false : config.includeNoProject;
  const workingDays = reportWorkingDays(state, from, to);
  const projectById = new Map(state.projects.map((row) => [row.id, row]));
  const workItemById = new Map(state.workItems.map((row) => [row.id, row]));
  const blocks = state.people
    .filter((person) => !personFilter || personFilter.has(person.id))
    .flatMap((person) =>
      countedTimeBlocksForPerson(state, person.id)
        .filter((block) => {
          const day = block.startAt.slice(0, 10);
          if (day < from || day > to) return false;
          if (projectFilter) return block.projectId !== null && projectFilter.has(block.projectId);
          return block.projectId !== null || includeNoProject;
        })
        .map((block) => ({
          personId: person.id,
          day: block.startAt.slice(0, 10),
          project: block.projectId ? (projectById.get(block.projectId) ?? null) : null,
          workItem: block.workItemId ? (workItemById.get(block.workItemId) ?? null) : null,
          hours: Math.max(0, hoursBetween(block.startAt, block.endAt)),
        })),
    );
  const sum = (rows: typeof blocks) => rows.reduce((total, row) => total + row.hours, 0);

  /** Hours per Project, most first, with time that names no Project last. */
  function splitByProject(rows: typeof blocks) {
    return [...groupBy(rows, (row) => row.project).entries()]
      .map(([project, mine]) => ({ project, hours: sum(mine) }))
      .sort((a, b) => Number(a.project === null) - Number(b.project === null) || b.hours - a.hours || (a.project?.code ?? "").localeCompare(b.project?.code ?? ""));
  }
  /** Hours per key, most first; `key` must give the same object for the same thing. */
  function splitBy<K>(rows: typeof blocks, key: (row: (typeof blocks)[number]) => K) {
    return [...groupBy(rows, key).entries()].map(([value, mine]) => ({ value, hours: sum(mine) })).sort((a, b) => b.hours - a.hours);
  }

  // A Person is in the Report when they logged hours in it or their Staffing overlaps it; with filters, only
  // counted hours and Staffing on the chosen Projects, and only the chosen People.
  const staffings = state.staffings.filter(
    (row) =>
      overlaps(row.startDate, row.endDate, from, to) &&
      (!projectFilter || projectFilter.has(row.projectId)) &&
      (!personFilter || personFilter.has(row.personId)),
  );
  const peopleIds = new Set([...blocks.map((row) => row.personId), ...staffings.map((row) => row.personId)]);
  const people = state.people.filter((row) => peopleIds.has(row.id)).sort((a, b) => personName(a).localeCompare(personName(b)));
  const personById = new Map(people.map((row) => [row.id, row]));
  // Peak Load counts all of a Person's Staffing, not only the filtered Projects.
  const peakByPerson = new Map(people.map((row) => [row.id, peakLoad(state, row.id, from, to)]));

  // Each Project's hours, with what the time went to: by Person (by name on ties) and by WorkItem.
  const blocksByProject = groupBy(blocks, (row) => row.project);
  const hoursByProject = splitByProject(blocks).map((row) => {
    const mine = blocksByProject.get(row.project) ?? [];
    return {
      ...row,
      people: splitBy(mine, (block) => personById.get(block.personId)!)
        .map(({ value, hours }) => ({ person: value, hours }))
        .sort((a, b) => b.hours - a.hours || personName(a.person).localeCompare(personName(b.person))),
      workItems: splitBy(mine, (block) => block.workItem).map(({ value, hours }) => ({ workItem: value, hours })),
    };
  });

  /** Staffing rows overlapping the range that pass the filters, by Person then Project code. */
  const staffing = staffings
    .map((row) => ({
      person: personById.get(row.personId)!,
      project: projectById.get(row.projectId) ?? null,
      load: row.load,
      startDate: row.startDate,
      endDate: row.endDate,
      peakLoad: peakByPerson.get(row.personId) ?? 0,
    }))
    .sort((a, b) => personName(a.person).localeCompare(personName(b.person)) || (a.project?.code ?? "").localeCompare(b.project?.code ?? "") || a.startDate.localeCompare(b.startDate));

  /** Projects overlapping the range that pass the Project filter, with hours in range and the People on them. */
  const projects = state.projects
    .filter((row) => overlaps(row.startDate, row.endDate, from, to) && (!projectFilter || projectFilter.has(row.id)))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((project) => {
      const mine = blocksByProject.get(project) ?? [];
      const on = new Set([...mine.map((row) => row.personId), ...staffings.filter((row) => row.projectId === project.id).map((row) => row.personId)]);
      return { project, hours: sum(mine), people: on.size };
    });

  const blocksByPerson = groupBy(blocks, (row) => row.personId);

  // May-be-taken leave of the People in the Report that overlaps the range. Full days count as working days
  // inside the range; part of a day carries its hours and counts as no day.
  const isWorkingDay = workingDayTest(state);
  const leave = state.leaveRequests
    .filter((row) => leaveIsApproved(row) && peopleIds.has(row.personId) && overlaps(row.startDate, row.endDate || row.startDate, from, to))
    .map((row) => {
      const partOfDay = row.spanMode === "hours" && row.startTime && row.endTime ? { start: row.startTime, end: row.endTime } : null;
      return {
        person: state.people.find((item) => item.id === row.personId)!,
        kind: row.kind,
        leaveType: row.leaveTypeId ? (state.leaveTypes.find((item) => item.id === row.leaveTypeId)?.name ?? null) : null,
        startDate: row.startDate,
        endDate: row.endDate || row.startDate,
        partOfDay,
        hours: partOfDay ? Math.max(0, hoursBetween(`${row.startDate}T${partOfDay.start}`, `${row.startDate}T${partOfDay.end}`)) : 0,
        workingDays: partOfDay ? 0 : leaveDates(row).filter((day) => day >= from && day <= to && isWorkingDay(day)).length,
        paid: row.decision === "paid",
      };
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || personName(a.person).localeCompare(personName(b.person)));
  const dailyGrid = buildDailyGrid(state, from, to, people, blocks, leave);
  const leaveDays = (kind: LeaveKind, paid: boolean) => leave.filter((row) => row.kind === kind && row.paid === paid).reduce((total, row) => total + row.workingDays, 0);
  const leaveByKind = LEAVE_KINDS.map((kind) => ({ kind, label: KIND_LABEL[kind], paid: leaveDays(kind, true), unpaid: leaveDays(kind, false) }));

  const chosenProjects = projectFilter ? state.projects.filter((row) => projectFilter.has(row.id)).sort((a, b) => a.code.localeCompare(b.code)) : [];
  const chosenPeople = personFilter ? state.people.filter((row) => personFilter.has(row.id)).map(personName).sort((a, b) => a.localeCompare(b)) : [];

  return {
    ...config,
    sections: orderSections(config.sections),
    includeNoProject,
    title: reportTitle(config.title),
    preparedFor: cleanText(config.preparedFor),
    ...stamp,
    /** The filters in plain words, for the Cover table and the section context lines. */
    filters: [
      { label: "Projects", value: projectFilter ? chosenProjects.map((row) => row.code).join(", ") || "None" : "All projects" },
      { label: "People", value: personFilter ? chosenPeople.join(", ") || "None" : "Everyone" },
      { label: "Time with no project", value: includeNoProject ? "Included" : "Left out" },
    ],
    summary: {
      totalHours: sum(blocks),
      projectHours: sum(blocks.filter((row) => row.project)),
      noProjectHours: sum(blocks.filter((row) => !row.project)),
      workingDays,
      people: people.length,
      overloaded: people.filter((person) => (peakByPerson.get(person.id) ?? 0) > 100).length,
      /** Working days of leave by kind, split into paid and unpaid. */
      leaveByKind,
      /** Working days of cuti and sick; remote is listed but is not time away. */
      daysAway: leaveByKind.filter((row) => row.kind !== "remote").reduce((total, row) => total + row.paid + row.unpaid, 0),
    },
    hoursByProject,
    /**
     * Everyone in the Report by name, with counted hours, distinct days with hours, and the split across
     * Projects. A staffed Person with no hours shows 0.
     */
    people: people.map((person) => {
      const mine = blocksByPerson.get(person.id) ?? [];
      return { person, hours: sum(mine), daysLogged: new Set(mine.map((row) => row.day)).size, byProject: splitByProject(mine) };
    }),
    staffing,
    projects,
    leave,
    dailyGrid,
  };
}

/**
 * The Daily grid as calendar months cut at the range edges, each with one row per Person and one cell per day,
 * plus each row's total, each day's total, and the month's total. Hours are indexed per Person and day once.
 * Full-day cuti and sick mark working days only, as leave is counted; part-day leave marks its one date and
 * keeps the hours worked.
 */
function buildDailyGrid(
  state: AppState,
  from: string,
  to: string,
  people: AppState["people"],
  blocks: { personId: string; day: string; hours: number }[],
  leave: { person: { id: string }; kind: LeaveKind; startDate: string; endDate: string; partOfDay: unknown }[],
) {
  const hours = new Map<string, number>();
  for (const row of blocks) hours.set(`${row.personId}|${row.day}`, (hours.get(`${row.personId}|${row.day}`) ?? 0) + row.hours);

  const isWorkingDay = workingDayTest(state);
  // A full day of cuti or sick outranks part of a day, which outranks remote.
  const rank = (mark: { leave: LeaveKind; partial: boolean }) => (mark.leave === "remote" ? 0 : mark.partial ? 1 : 2);
  const marks = new Map<string, { leave: LeaveKind; partial: boolean }>();
  for (const row of leave) {
    const partial = row.partOfDay !== null;
    for (const day of leaveDates(row)) {
      if (day < from || day > to || (!partial && row.kind !== "remote" && !isWorkingDay(day))) continue;
      const key = `${row.person.id}|${day}`;
      const mark = { leave: row.kind, partial };
      const held = marks.get(key);
      if (!held || rank(mark) > rank(held)) marks.set(key, mark);
    }
  }

  const holidayNames = new Map(activeHolidays(state).map((row) => [row.date, row.name]));
  type GridDay = { date: string; day: number; weekday: string; weekend: boolean; holiday: string | null };
  const months: {
    label: string;
    from: string;
    to: string;
    days: GridDay[];
    rows: { person: AppState["people"][number]; cells: GridCell[]; total: number }[];
    dayTotals: number[];
    total: number;
  }[] = [];
  for (let first = from; first <= to; ) {
    const monthEnd = addDaysIso(`${nextMonth(first.slice(0, 7))}-01`, -1);
    const last = monthEnd < to ? monthEnd : to;
    const days: GridDay[] = [];
    for (let day = first; day <= last; day = addDaysIso(day, 1)) {
      days.push({ date: day, day: Number(day.slice(8, 10)), weekday: WEEKDAY_LETTERS[new Date(`${day}T00:00:00Z`).getUTCDay()], weekend: isWeekendIso(day), holiday: holidayNames.get(day) ?? null });
    }
    const rows = people.map((person) => {
      const cells = days.map(({ date }): GridCell => {
        const mark = marks.get(`${person.id}|${date}`);
        return { hours: hours.get(`${person.id}|${date}`) ?? 0, leave: mark?.leave ?? null, partial: mark?.partial ?? false };
      });
      return { person, cells, total: cells.reduce((total, cell) => total + cell.hours, 0) };
    });
    const dayTotals = days.map((_, index) => rows.reduce((total, row) => total + row.cells[index].hours, 0));
    months.push({
      label: `${MONTH_NAMES[Number(first.slice(5, 7)) - 1]} ${first.slice(0, 4)}`,
      from: first,
      to: last,
      days,
      rows,
      dayTotals,
      total: dayTotals.reduce((total, value) => total + value, 0),
    });
    first = addDaysIso(last, 1);
  }
  return { months };
}

/** "2026-09" → "2026-10": the month after, as "YYYY-MM". */
function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  return index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, "0")}`;
}

export type Report = ReturnType<typeof buildReport>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-21" → "21 Sep 2026". Fixed month names: en-GB Intl writes "Sept". */
export function reportDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

const HOURS = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 2170 → "2,170.0". */
export function reportHours(hours: number): string {
  return HOURS.format(hours);
}

/** "21 Sep and 20 Oct 2026", or "21 Dec 2026 and 20 Jan 2027" across a year. */
function reportBetween(report: Pick<Report, "from" | "to">): string {
  const from = reportDate(report.from);
  return `${report.from.slice(0, 4) === report.to.slice(0, 4) ? from.slice(0, -5) : from} and ${reportDate(report.to)}`;
}

/** The one line an empty section prints: "No approved leave between 21 Sep and 20 Oct 2026." */
export function reportEmptyLine(report: Pick<Report, "from" | "to">, what: string): string {
  return `No ${what} between ${reportBetween(report)}.`;
}

/** "Cuti · Tahunan", "Sick", "Remote". */
export function reportLeaveLabel(row: Pick<Report["leave"][number], "kind" | "leaveType">): string {
  return row.leaveType ? `${KIND_LABEL[row.kind]} · ${row.leaveType}` : KIND_LABEL[row.kind];
}

/** "21 Sep 2026 – 20 Oct 2026". */
export function reportRange(report: Pick<Report, "from" | "to">): string {
  return `${reportDate(report.from)} – ${reportDate(report.to)}`;
}

/** "Projects: AAA, BBB · People: Everyone · Time with no project: Left out". */
export function reportFilterLine(report: Pick<Report, "filters">): string {
  return report.filters.map((row) => `${row.label}: ${row.value}`).join(" · ");
}

/**
 * "Samudra Energi, October hours 2026-10-01 to 2026-10-31.pdf": the title, less the characters a file name
 * cannot hold, with spaces collapsed.
 */
export function reportFileName(report: Pick<Report, "title" | "from" | "to">, extension: "pdf" | "xlsx"): string {
  const safe = report.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim() || REPORT_TITLE;
  return `${safe} ${report.from} to ${report.to}.${extension}`;
}

/** KMPlus colours both renderers draw with (DESIGN.md tokens). */
export const REPORT_COLORS = {
  ink: "#222222",
  muted: "#5E5E5E",
  faint: "#6A6A6A",
  line: "#DEDEDE",
  tint: "#EDFFFE",
  accent: "#1A7870",
  warning: "#8A5E10",
  accentHover: "#145F59",
  white: "#FFFFFF",
  /** Leave washes on white (DESIGN.md leave colours): cuti sage 20%, sick amber 22%, remote neutral. */
  cuti: "#D1E4E2",
  sick: "#F3E5CD",
  wash: "#F4F4F4",
  weekend: "#FAFAFA",
} as const;
