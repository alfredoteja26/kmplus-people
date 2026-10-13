import type { AppState, Project } from "@/lib/types";
import { activeHolidays, isWeekendIso } from "@/lib/leave-view";
import { personName } from "@/lib/project-view";
import { addDaysIso, countedTimeBlocksForPerson, hoursBetween, personLoadSum } from "@/lib/work-delivery-query";

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

/** Monday to Friday from `from` to `to`, excluding active public holidays. */
export function reportWorkingDays(state: AppState, from: string, to: string): number {
  const holidays = new Set(activeHolidays(state).map((row) => row.date));
  let count = 0;
  for (let day = from; day <= to; day = addDaysIso(day, 1)) if (!isWeekendIso(day) && !holidays.has(day)) count += 1;
  return count;
}

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
          project: block.projectId ? (state.projects.find((row) => row.id === block.projectId) ?? null) : null,
          hours: Math.max(0, hoursBetween(block.startAt, block.endAt)),
        })),
    );
  const sum = (rows: typeof blocks) => rows.reduce((total, row) => total + row.hours, 0);

  const byProject = new Map<Project | null, typeof blocks>();
  for (const row of blocks) byProject.set(row.project, [...(byProject.get(row.project) ?? []), row]);
  const hoursByProject = [...byProject.entries()]
    .map(([project, rows]) => ({ project, hours: sum(rows) }))
    .sort((a, b) => Number(a.project === null) - Number(b.project === null) || b.hours - a.hours || (a.project?.code ?? "").localeCompare(b.project?.code ?? ""));

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

  const chosenProjects = projectFilter ? state.projects.filter((row) => projectFilter.has(row.id)).sort((a, b) => a.code.localeCompare(b.code)) : [];
  const chosenPeople = personFilter ? state.people.filter((row) => personFilter.has(row.id)).map(personName).sort((a, b) => a.localeCompare(b)) : [];

  return {
    ...config,
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
      // Peak Load counts all of a Person's Staffing, not only the filtered Projects.
      overloaded: people.filter((person) => peakLoad(state, person.id, from, to) > 100).length,
    },
    hoursByProject,
    /** Everyone in the Report with their counted hours, by name; a staffed Person with no hours shows 0. */
    people: people.map((person) => ({ person, hours: sum(blocks.filter((row) => row.personId === person.id)) })),
  };
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
} as const;
