import { isHrLike, itemsForSet, personById, positionById } from "./domain";
import type { AppState, Assignment, KpiItem } from "./types";

export type ParentCandidate = {
  kpiItemId: string;
  label: string;
};

export function isRootAssignment(state: AppState, assignmentId: string): boolean {
  const assignment = state.assignments.find((row) => row.id === assignmentId);
  if (!assignment) return false;
  const position = positionById(state, assignment.positionId);
  return position?.reportsToPositionId === null;
}

function isOpenAssignment(assignment: Assignment): boolean {
  return assignment.endDate === null;
}

function parentLabel(state: AppState, item: KpiItem, assignment: Assignment): string {
  const person = personById(state, assignment.personId);
  const position = positionById(state, assignment.positionId);
  const who = person?.preferredName ?? person?.legalName ?? "Unknown";
  const seat = position?.title ?? "Position";
  return `${who} · ${seat} · ${item.name}`;
}

/** Parent KpiItems on any current Assignment with a KpiSet in this cycle (excluding empty seats). */
export function parentCandidates(
  state: AppState,
  cycleId: string,
  options?: { excludeKpiItemId?: string },
): ParentCandidate[] {
  const exclude = options?.excludeKpiItemId;
  const setsInCycle = state.kpiSets.filter((row) => row.cycleId === cycleId);
  const out: ParentCandidate[] = [];

  for (const kpiSet of setsInCycle) {
    const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId);
    if (!assignment || !isOpenAssignment(assignment)) continue;

    for (const item of itemsForSet(state, kpiSet.id)) {
      if (exclude && item.id === exclude) continue;
      out.push({
        kpiItemId: item.id,
        label: parentLabel(state, item, assignment),
      });
    }
  }

  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function validateParents(state: AppState, kpiSetId: string): string | null {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet) return null;

  const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId);
  if (!assignment) return null;

  const items = itemsForSet(state, kpiSetId);
  const root = isRootAssignment(state, assignment.id);
  const allowed = new Set(parentCandidates(state, kpiSet.cycleId).map((row) => row.kpiItemId));

  if (root) {
    for (const item of items) {
      if (item.parentKpiItemId) {
        return "RootPosition KpiItems cannot have a parent KpiItem";
      }
    }
    return null;
  }

  for (const item of items) {
    if (!item.parentKpiItemId) {
      return `“${item.name}” needs a parent KpiItem from this cycle`;
    }
    if (item.parentKpiItemId === item.id) {
      return "A KpiItem cannot be its own parent";
    }
    if (!allowed.has(item.parentKpiItemId)) {
      return `“${item.name}” has an invalid parent (empty seat or wrong cycle)`;
    }
  }

  return null;
}

export function normalizeKpiItemParent(
  state: AppState,
  kpiSetId: string,
  item: Omit<KpiItem, "tenantId" | "id"> & { id?: string },
  existing?: KpiItem,
): KpiItem["parentKpiItemId"] {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet) return item.parentKpiItemId ?? null;

  const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId);
  if (assignment && isRootAssignment(state, assignment.id)) {
    return null;
  }

  const locked =
    kpiSet.status === "active" || kpiSet.status === "agreed" || kpiSet.status === "scored";
  if (locked && existing && !isHrLike(state.currentRole)) {
    return existing.parentKpiItemId ?? null;
  }

  return item.parentKpiItemId ?? null;
}
