import { formatDate } from "@/lib/labels";
import type { CheckInCadence, KpiCycle } from "@/lib/types";

/** Screen name for a KPI year, independent of the stored `name`. */
export function kpiYearName(cycle: Pick<KpiCycle, "year">): string {
  return `KPI year ${cycle.year}`;
}

export function frequencyLabel(cadence: CheckInCadence): string {
  return cadence === "monthly" ? "Monthly" : "Quarterly";
}

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** Window id `2026-10` → "Oct 2026"; `2026-Q4` → "Q4 2026". */
export function periodLabel(windowId: string): string {
  const quarter = /^(\d{4})-Q([1-4])$/.exec(windowId);
  if (quarter) return `Q${quarter[2]} ${quarter[1]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(windowId);
  if (month) return MONTH.format(new Date(Date.UTC(Number(month[1]), Number(month[2]) - 1, 1)));
  return windowId;
}

/** Last day of a month or quarter window, as an ISO date. */
export function periodDueIso(windowId: string): string | null {
  const quarter = /^(\d{4})-Q([1-4])$/.exec(windowId);
  const month = /^(\d{4})-(\d{2})$/.exec(windowId);
  const year = Number((quarter ?? month)?.[1]);
  if (!quarter && !month) return null;
  const endMonth = quarter ? Number(quarter[2]) * 3 : Number(month![2]);
  const last = new Date(Date.UTC(year, endMonth, 0));
  return last.toISOString().slice(0, 10);
}

/** "31 Oct 2026" for a window id. */
export function periodDueDate(windowId: string): string {
  const iso = periodDueIso(windowId);
  return iso ? formatDate(iso) : periodLabel(windowId);
}

type Gaps = { needsLineManager: boolean; needsAdmin: boolean };

/** Who still has to approve, e.g. "your Line Manager and an Admin". Null when nobody. */
export function remainingApprovers(gaps: Gaps, owner: "you" | "them" = "them"): string | null {
  const names: string[] = [];
  if (gaps.needsLineManager) names.push(owner === "you" ? "your Line Manager" : "their Line Manager");
  if (gaps.needsAdmin) names.push("an Admin");
  return names.length ? names.join(" and ") : null;
}

/** Row and panel text: "Waiting for Line Manager and Admin approval". Null when nobody is missing. */
export function approvalWaitingText(gaps: Gaps): string | null {
  const names: string[] = [];
  if (gaps.needsLineManager) names.push("Line Manager");
  if (gaps.needsAdmin) names.push("Admin");
  return names.length ? `Waiting for ${names.join(" and ")} approval` : null;
}
