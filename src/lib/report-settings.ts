import { monthSpan } from "@/lib/project-admin-view";
import { orderSections, REPORT_DEFAULTS, REPORT_TEMPLATES, REPORT_TEXT_MAX, type ReportConfig } from "@/lib/report-model";
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
  const params = new URLSearchParams({ from: config.from, to: config.to });
  if (config.projectIds) params.set("projects", config.projectIds.join(","));
  if (config.personIds) params.set("people", config.personIds.join(","));
  if (!config.projectIds && !config.includeNoProject) params.set("noProject", "0");
  if (config.title !== REPORT_DEFAULTS.title) params.set("title", config.title);
  if (config.preparedFor) params.set("preparedFor", config.preparedFor);
  params.set("sections", orderSections(config.sections).join(","));
  if (config.template !== REPORT_DEFAULTS.template) params.set("template", config.template);
  return params.toString();
}

/** The export page opened on one month; `monthIndex` is 0-based. */
export function reportMonthLink(year: number, monthIndex: number): string {
  return `/project-admin/export?month=${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** The Projects and People that exist, so ids the address names but the tenant lacks are dropped. */
export type KnownIds = { projectIds: string[]; personIds: string[] };

/**
 * A comma list from the address, keeping only known ids. Absent, empty, or naming no known id, it falls back to
 * null (all), so a link never opens on an empty choice.
 */
function idList(value: string | null, known: string[]): string[] | null {
  const ids = new Set((value ?? "").split(",").filter(Boolean));
  const kept = known.filter((id) => ids.has(id));
  return kept.length > 0 ? kept : null;
}

function parseRange(params: URLSearchParams, today: string) {
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (reportRangeError(from, to) === null) return { from, to };
  const month = /^(\d{4})-(\d{2})$/.exec(params.get("month") ?? "");
  if (month && Number(month[2]) >= 1 && Number(month[2]) <= 12) return monthSpan(Number(month[1]), Number(month[2]) - 1);
  return monthSpan(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1);
}

export function parseReportSettings(params: URLSearchParams, today: string, known: KnownIds): ReportConfig {
  const projectIds = idList(params.get("projects"), known.projectIds);
  return {
    ...parseRange(params, today),
    projectIds,
    personIds: idList(params.get("people"), known.personIds),
    // A Project filter forces time with no Project off.
    includeNoProject: !projectIds && params.get("noProject") !== "0",
    title: text(params.get("title"), REPORT_DEFAULTS.title),
    preparedFor: text(params.get("preparedFor"), REPORT_DEFAULTS.preparedFor),
    sections: sectionList(params.get("sections")),
    template: REPORT_TEMPLATES.find((row) => row.key === params.get("template"))?.key ?? REPORT_DEFAULTS.template,
  };
}

/** Known section keys from the address in the fixed order; the defaults when none is known. */
function sectionList(value: string | null): ReportConfig["sections"] {
  const sections = orderSections((value ?? "").split(","));
  return sections.length > 0 ? sections : REPORT_DEFAULTS.sections;
}

/** Free text from the address, or the default when it is missing or longer than a Report holds. */
function text(value: string | null, fallback: string): string {
  return value !== null && value.length <= REPORT_TEXT_MAX ? value : fallback;
}

/** Why the choices cannot make a Report, in the words the page shows, or null when they can. */
export function reportChoiceError(config: Pick<ReportConfig, "projectIds" | "personIds" | "sections">): string | null {
  if (config.projectIds?.length === 0) return "Choose at least one project to download.";
  if (config.personIds?.length === 0) return "Choose at least one person to download.";
  if (config.sections.length === 0) return "Choose at least one section to download.";
  return null;
}
