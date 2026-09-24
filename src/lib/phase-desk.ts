import { effectiveCadence, windowFor } from "./cadence";
import { blocksOwnCheckIn, displayedActual } from "./direct";
import { itemsForSet, kpiSetForAssignment } from "./domain";
import { effectiveCheckInStatus, isPortfolioDualApproved, kpiYearPhase, openCycle } from "./domain-query";
import type { AppState, KpiCycle, KpiItem } from "./types";

/** Whole calendar days from `today` until `endsOn`. Negative means the date has passed. */
export function planningDaysLeft(endsOn: string | null | undefined, today: string): number | null {
  if (!endsOn || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return null;
  const todayDate = today.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayDate)) return null;
  const end = Date.parse(`${endsOn}T00:00:00Z`);
  const now = Date.parse(`${todayDate}T00:00:00Z`);
  if (Number.isNaN(end) || Number.isNaN(now)) return null;
  return Math.round((end - now) / 86_400_000);
}

export function planningCountdownCopy(endsOn: string | null | undefined, today: string): string {
  const days = planningDaysLeft(endsOn, today);
  if (days === null) return "Planning end date is not set";
  if (days < 0) return "KPI planning is overdue";
  if (days === 0) return "KPI planning ends today";
  if (days === 1) return "1 day left for KPI planning";
  return `${days} days left for KPI planning`;
}

/** First gap that blocks a planning row. Null when the KPI can stay in the ready part of the queue. */
export function planningItemGap(item: KpiItem, rootAssignment: boolean): string | null {
  if (!rootAssignment && !item.parentKpiItemId) return "Needs a parent";
  if (!(item.weight > 0)) return "Needs a weight";
  if (!Number.isFinite(item.target)) return "Needs a target";
  return null;
}

export function needsCheckInThisWindow(state: AppState, cycle: KpiCycle, item: KpiItem, today: string): boolean {
  if (blocksOwnCheckIn(state, item)) return false;
  const windowId = windowFor(today, effectiveCadence(cycle, item));
  const rows = state.checkIns.filter((row) => row.kpiItemId === item.id && row.window === windowId);
  return !rows.some((row) => {
    const status = effectiveCheckInStatus(row);
    return status === "pending" || status === "approved";
  });
}

/**
 * Display-only portfolio score during monitoring.
 * Same math as year close: latest actual / target, capped at 1.2, times weight.
 * Not written onto the portfolio.
 */
export function liveMonitoringScore(state: AppState, kpiSetId: string): number | null {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet) return null;
  const cycle = state.cycles.find((row) => row.id === kpiSet.cycleId);
  if (!cycle || kpiYearPhase(cycle) !== "monitoring") return null;
  if (!isPortfolioDualApproved(state, kpiSetId)) return null;
  const items = itemsForSet(state, kpiSetId);
  let score = 0;
  for (const item of items) {
    const actual = displayedActual(state, item);
    const ratio = actual === null || item.target === 0 ? 0 : Math.min(actual / item.target, 1.2);
    score += (item.weight / 100) * ratio * 100;
  }
  return Math.round(score * 10) / 10;
}

/** Windows in `year` that are strictly before `current`. */
export function priorWindowsInYear(current: string, year: number): string[] {
  if (current.includes("-Q")) {
    const windowYear = Number(current.slice(0, 4));
    if (windowYear !== year) return [];
    const quarter = Number(current.slice(-1));
    const windows: string[] = [];
    for (let index = 1; index < quarter; index += 1) windows.push(`${year}-Q${index}`);
    return windows;
  }
  const windowYear = Number(current.slice(0, 4));
  if (windowYear !== year) return [];
  const month = Number(current.slice(5, 7));
  const windows: string[] = [];
  for (let index = 1; index < month; index += 1) {
    windows.push(`${year}-${String(index).padStart(2, "0")}`);
  }
  return windows;
}

function windowIsCovered(state: AppState, kpiItemId: string, windowId: string) {
  return state.checkIns.some((row) => {
    if (row.kpiItemId !== kpiItemId || row.window !== windowId) return false;
    const status = effectiveCheckInStatus(row);
    return status === "pending" || status === "approved";
  });
}

/** Missing check-ins for windows earlier in the KPI year. Current window is due, not late. */
export function lateCheckInCount(state: AppState, today = ""): number {
  const cycle = openCycle(state);
  if (!cycle || kpiYearPhase(cycle) !== "monitoring") return 0;
  const asOf = today || new Date().toISOString().slice(0, 10);
  let late = 0;
  for (const kpiSet of state.kpiSets) {
    if (kpiSet.cycleId !== cycle.id) continue;
    for (const item of itemsForSet(state, kpiSet.id)) {
      if (blocksOwnCheckIn(state, item)) continue;
      const cadence = effectiveCadence(cycle, item);
      const current = windowFor(asOf, cadence);
      for (const windowId of priorWindowsInYear(current, cycle.year)) {
        if (!windowIsCovered(state, item.id, windowId)) late += 1;
      }
    }
  }
  return late;
}

/** People with a current seat whose portfolio is missing, still a draft, or returned. */
export function peopleWithUndonePlanning(state: AppState): number {
  const cycle = openCycle(state);
  if (!cycle || kpiYearPhase(cycle) !== "planning") return 0;
  const people = new Set<string>();
  for (const assignment of state.assignments) {
    if (assignment.endDate !== null) continue;
    const kpiSet = kpiSetForAssignment(state, assignment.id, cycle.id);
    const undone = !kpiSet || kpiSet.status === "draft" || kpiSet.status === "returned";
    if (undone) people.add(assignment.personId);
  }
  return people.size;
}
