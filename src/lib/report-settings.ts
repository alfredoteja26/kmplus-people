import { monthSpan } from "@/lib/project-admin-view";
import type { ReportConfig } from "@/lib/report-model";
import { addDaysIso } from "@/lib/work-delivery-query";

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** `iso` moved by whole months, UTC calendar. */
export function addMonthsIso(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** The last day a range starting on `from` may end on: twelve months later, less one day. */
function lastAllowedDay(from: string): string {
  return addDaysIso(addMonthsIso(from, 12), -1);
}

/** Why a range cannot make a Report, in the words the page shows, or null when it can. */
export function reportRangeError(from: string, to: string): string | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return "Choose a start and an end date.";
  if (to < from) return "The end date is before the start date.";
  if (to > lastAllowedDay(from)) return "A report covers at most 12 months.";
  return null;
}

/**
 * A Report's settings as a query string, so a bookmark or a link to another Admin reopens the same setup.
 * Parsing never fails: a missing or invalid field falls back to its default.
 */
export function serializeReportSettings(config: ReportConfig): string {
  return new URLSearchParams({ from: config.from, to: config.to }).toString();
}

/** The export page opened on one month; `monthIndex` is 0-based. */
export function reportMonthLink(year: number, monthIndex: number): string {
  return `/project-admin/export?month=${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function parseReportSettings(params: URLSearchParams, today: string): ReportConfig {
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (reportRangeError(from, to) === null) return { from, to };
  const month = /^(\d{4})-(\d{2})$/.exec(params.get("month") ?? "");
  if (month && Number(month[2]) >= 1 && Number(month[2]) <= 12) return monthSpan(Number(month[1]), Number(month[2]) - 1);
  return monthSpan(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1);
}
