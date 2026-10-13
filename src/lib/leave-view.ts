import { formatDate, formatDateRange } from "@/lib/labels";
import type { AppState, LeaveKind, LeaveRequest, PublicHoliday } from "@/lib/types";
import { addDaysIso, jakartaTodayIso } from "@/lib/work-delivery-query";

export const KIND_LABEL: Record<LeaveKind, string> = { cuti: "Cuti", sick: "Sick", remote: "Remote" };

export type LeaveState = "pending" | "paid" | "unpaid" | "refused";

export function leaveState(row: LeaveRequest): LeaveState {
  return row.decision ?? "pending";
}

export const LEAVE_STATE_LABEL: Record<LeaveState, string> = {
  pending: "Waiting for a decision",
  paid: "Approved · paid",
  unpaid: "Approved · unpaid",
  refused: "Declined",
};

export function leaveStateTone(state: LeaveState): "accent" | "success" | "danger" {
  if (state === "pending") return "accent";
  if (state === "refused") return "danger";
  return "success";
}

/** "Cuti · Tahunan", "Sick", "Remote". */
export function leaveKindLabel(state: AppState, row: LeaveRequest): string {
  const type = row.leaveTypeId ? state.leaveTypes.find((item) => item.id === row.leaveTypeId) : undefined;
  return type ? `${KIND_LABEL[row.kind]} · ${type.name}` : KIND_LABEL[row.kind];
}

/** "12 Oct 2026 – 14 Oct 2026", or "12 Oct 2026, 09:00–12:00" for part of a day. */
export function leaveWhen(row: LeaveRequest): string {
  if (row.spanMode === "hours" && row.startTime && row.endTime) return `${formatDate(row.startDate)}, ${row.startTime}–${row.endTime}`;
  return formatDateRange(row.startDate, row.endDate || row.startDate);
}

/** Every calendar date the request touches, first to last. */
export function leaveDates(row: Pick<LeaveRequest, "startDate" | "endDate">): string[] {
  const dates: string[] = [];
  const last = row.endDate || row.startDate;
  for (let day = row.startDate; day <= last && dates.length < 400; day = addDaysIso(day, 1)) dates.push(day);
  return dates;
}

export function isWeekendIso(day: string): boolean {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function activeHolidays(state: AppState): PublicHoliday[] {
  return state.publicHolidays.filter((row) => !row.suppressed).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * How a span of days reads before filing: calendar days, working days (Monday to Friday, not a public holiday),
 * and the holidays it crosses. This is information, not a balance; the product keeps no day balance.
 */
export function spanSummary(state: AppState, startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) return null;
  const dates = leaveDates({ startDate, endDate });
  const holidays = activeHolidays(state).filter((row) => row.date >= startDate && row.date <= endDate);
  const holidayDates = new Set(holidays.map((row) => row.date));
  const working = dates.filter((day) => !isWeekendIso(day) && !holidayDates.has(day)).length;
  return { days: dates.length, working, holidays };
}

/** Other people's approved or pending leave that shares at least one date with this request. Declined leave is ignored. */
export function alsoOut(state: AppState, row: Pick<LeaveRequest, "id" | "personId" | "startDate" | "endDate">) {
  const last = row.endDate || row.startDate;
  return state.leaveRequests.filter(
    (other) =>
      other.id !== row.id &&
      other.personId !== row.personId &&
      other.decision !== "refused" &&
      other.startDate <= last &&
      (other.endDate || other.startDate) >= row.startDate,
  );
}

/** The viewer's own requests that overlap a draft span, so the sheet can warn before a duplicate is filed. */
export function ownOverlaps(state: AppState, personId: string, startDate: string, endDate: string): LeaveRequest[] {
  if (!startDate || !endDate) return [];
  return state.leaveRequests.filter(
    (row) => row.personId === personId && row.decision !== "refused" && row.startDate <= endDate && (row.endDate || row.startDate) >= startDate,
  );
}

/** Monday-first weeks covering a month: each cell is an ISO date, or null outside the month. */
export function monthWeeks(year: number, monthIndex: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export function monthDates(year: number, monthIndex: number): string[] {
  return monthWeeks(year, monthIndex).flat().filter((day): day is string => day !== null);
}

/** Group a Person's own requests the way they read them: waiting, then coming up or under way, then past. */
export function groupMine(rows: LeaveRequest[], today: string = jakartaTodayIso()) {
  const waiting = rows.filter((row) => row.decision === null).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const decided = rows.filter((row) => row.decision !== null);
  const upcoming = decided
    .filter((row) => (row.endDate || row.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = decided
    .filter((row) => (row.endDate || row.startDate) < today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  return { waiting, upcoming, past };
}
