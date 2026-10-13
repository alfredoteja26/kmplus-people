import type { AppState, Project } from "@/lib/types";
import { activeHolidays, isWeekendIso } from "@/lib/leave-view";
import { addDaysIso, countedTimeBlocksForPerson, hoursBetween, personLoadSum } from "@/lib/work-delivery-query";

/** What an Admin chose for one Report. Dates are ISO, `to` on or after `from`. */
export type ReportConfig = { from: string; to: string };

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

/**
 * The Report as figures, with no formatting or layout, so the spreadsheet and the PDF cannot disagree.
 * Hours stay exact; only display rounds them, so rows always add up to their totals. Rules: the Report
 * entry in CONTEXT.md.
 */
export function buildReport(state: AppState, config: ReportConfig, stamp: ReportStamp) {
  const { from, to } = config;
  const days: string[] = [];
  for (let day = from; day <= to; day = addDaysIso(day, 1)) days.push(day);
  const holidays = new Set(activeHolidays(state).map((row) => row.date));
  const workingDays = days.filter((day) => !isWeekendIso(day) && !holidays.has(day)).length;
  const blocks = state.people.flatMap((person) =>
    countedTimeBlocksForPerson(state, person.id)
      .filter((block) => {
        const day = block.startAt.slice(0, 10);
        return day >= from && day <= to;
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

  // A Person is in the Report when they logged hours in it or their Staffing overlaps it.
  const peopleIds = new Set([
    ...blocks.map((row) => row.personId),
    ...state.staffings.filter((row) => overlaps(row.startDate, row.endDate, from, to)).map((row) => row.personId),
  ]);

  return {
    ...config,
    ...stamp,
    summary: {
      totalHours: sum(blocks),
      projectHours: sum(blocks.filter((row) => row.project)),
      noProjectHours: sum(blocks.filter((row) => !row.project)),
      workingDays,
      people: peopleIds.size,
      overloaded: [...peopleIds].filter((personId) => peakLoad(state, personId, from, to) > 100).length,
    },
    hoursByProject,
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

export const REPORT_TITLE = "Project report";

/** "21 Sep 2026 – 20 Oct 2026". */
export function reportRange(report: Pick<Report, "from" | "to">): string {
  return `${reportDate(report.from)} – ${reportDate(report.to)}`;
}

/** "Project report 2026-09-21 to 2026-10-20.pdf". */
export function reportFileName(report: Pick<Report, "from" | "to">, extension: "pdf" | "xlsx"): string {
  return `${REPORT_TITLE} ${report.from} to ${report.to}.${extension}`;
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
  white: "#FFFFFF",
} as const;
