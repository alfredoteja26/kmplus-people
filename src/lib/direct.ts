import { effectiveCadence } from "./cadence";
import { checkInCountsForActuals } from "./domain-query";
import type { AppState, KpiCycle, KpiItem } from "./types";

export type DirectValidation = { ok: true } | { ok: false; reason: string };

export function canBeDirect(child: KpiItem, parent: KpiItem, cycle: KpiCycle): DirectValidation {
  if (child.unit !== parent.unit) {
    return { ok: false, reason: `Direct requires the same unit (“${child.unit}” vs “${parent.unit}”)` };
  }
  const childCadence = effectiveCadence(cycle, child);
  const parentCadence = effectiveCadence(cycle, parent);
  if (childCadence !== parentCadence) {
    return {
      ok: false,
      reason: `Direct requires the same check-in frequency (${childCadence} vs ${parentCadence})`,
    };
  }
  return { ok: true };
}

export function directChildren(state: AppState, parentItemId: string): KpiItem[] {
  return state.kpiItems.filter(
    (row) => row.parentKpiItemId === parentItemId && (row.cascadeMode ?? "indirect") === "direct",
  );
}

export function hasDirectChildren(state: AppState, parentItemId: string): boolean {
  return directChildren(state, parentItemId).length > 0;
}

function sumActualInWindow(state: AppState, kpiItemId: string, window: string): number {
  return state.checkIns
    .filter(
      (row) => row.kpiItemId === kpiItemId && row.window === window && checkInCountsForActuals(state, row),
    )
    .reduce((sum, row) => sum + row.actual, 0);
}

/** Raw sum of Direct children in the window; own CheckIn added when DirectMix is own-plus-children. */
export function rolledActual(state: AppState, parentItem: KpiItem, window: string): number {
  let sum = 0;
  for (const child of directChildren(state, parentItem.id)) {
    sum += sumActualInWindow(state, child.id, window);
  }
  const mix = parentItem.directMix ?? "children-only";
  if (mix === "own-plus-children") {
    sum += sumActualInWindow(state, parentItem.id, window);
  }
  return sum;
}

export function latestRelevantWindow(state: AppState, item: KpiItem): string | null {
  const childIds = directChildren(state, item.id).map((row) => row.id);
  const relevant = state.checkIns
    .filter(
      (row) =>
        (row.kpiItemId === item.id || childIds.includes(row.kpiItemId)) && checkInCountsForActuals(state, row),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return relevant?.window ?? null;
}

/** Actual used for health, display, and KpiScore when DirectMix applies. */
export function displayedActual(state: AppState, item: KpiItem): number | null {
  if (hasDirectChildren(state, item.id)) {
    const window = latestRelevantWindow(state, item);
    if (!window) return null;
    return rolledActual(state, item, window);
  }
  const check = state.checkIns
    .filter((row) => row.kpiItemId === item.id && checkInCountsForActuals(state, row))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return check ? check.actual : null;
}

export function validateDirectCascade(state: AppState, item: KpiItem): string | null {
  if ((item.cascadeMode ?? "indirect") !== "direct") return null;
  if (!item.parentKpiItemId) return "Direct cascade requires a parent KpiItem";
  const parent = state.kpiItems.find((row) => row.id === item.parentKpiItemId);
  if (!parent) return "Direct cascade parent not found";
  const kpiSet = state.kpiSets.find((row) => row.id === item.kpiSetId);
  if (!kpiSet) return null;
  const cycle = state.cycles.find((row) => row.id === kpiSet.cycleId);
  if (!cycle) return null;
  const result = canBeDirect(item, parent, cycle);
  return result.ok ? null : result.reason;
}

export function validateAllDirectInSet(state: AppState, kpiSetId: string): string | null {
  for (const item of state.kpiItems.filter((row) => row.kpiSetId === kpiSetId)) {
    const err = validateDirectCascade(state, item);
    if (err) return err;
  }
  return null;
}

export function blocksOwnCheckIn(state: AppState, item: KpiItem): boolean {
  return hasDirectChildren(state, item.id) && (item.directMix ?? "children-only") === "children-only";
}
