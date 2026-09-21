import { isRootAssignment } from "./cascade";
import { displayedActual } from "./direct";
import {
  canReadPerson,
  isHrLike,
  itemsForSet,
  kpiSetForAssignment,
  openCycle,
  personById,
  positionById,
  descendantReportPersonIds,
} from "./domain";
import type { AppState, CascadeMode, KpiItem } from "./types";

export type KpiTreeScope = "team" | "tenant";

export type KpiTreeNode = {
  kpiItemId: string;
  kpiSetId: string;
  assignmentId: string;
  name: string;
  unit: string;
  target: number;
  actual: number | null;
  /** Direct or Indirect link from parent; null on RootPosition root items. */
  linkMode: CascadeMode | null;
  personId: string;
  personName: string;
  positionId: string;
  positionTitle: string;
  parentKpiItemId: string | null;
  isForestRoot: boolean;
};

export type KpiTreeEdge = {
  fromKpiItemId: string;
  toKpiItemId: string;
  mode: CascadeMode;
};

export type KpiForest = {
  cycleId: string;
  nodes: KpiTreeNode[];
  edges: KpiTreeEdge[];
  /** KpiItem ids that are roots (RootPosition items with no parent). */
  rootKpiItemIds: string[];
};

export function defaultKpiTreeScope(state: AppState): KpiTreeScope {
  return isHrLike(state.currentRole) ? "tenant" : "team";
}

export function canUseTenantKpiTreeScope(state: AppState): boolean {
  return isHrLike(state.currentRole);
}

/** Person ids included for the given scope filter. */
export function kpiTreeScopePersonIds(state: AppState, scope: KpiTreeScope): string[] {
  if (scope === "tenant" && canUseTenantKpiTreeScope(state)) {
    return state.people.map((row) => row.id);
  }
  if (state.currentRole === "manager") {
    return [state.currentPersonId, ...descendantReportPersonIds(state, state.currentPersonId)];
  }
  return [state.currentPersonId];
}

function itemOwner(state: AppState, item: KpiItem) {
  const kpiSet = state.kpiSets.find((row) => row.id === item.kpiSetId);
  if (!kpiSet) return null;
  const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId);
  if (!assignment || assignment.endDate !== null) return null;
  const person = personById(state, assignment.personId);
  const position = positionById(state, assignment.positionId);
  if (!person || !position) return null;
  return { kpiSet, assignment, person, position };
}

function isRootKpiItem(state: AppState, item: KpiItem): boolean {
  if (item.parentKpiItemId) return false;
  const kpiSet = state.kpiSets.find((row) => row.id === item.kpiSetId);
  if (!kpiSet) return false;
  return isRootAssignment(state, kpiSet.assignmentId);
}

function toNode(state: AppState, item: KpiItem): KpiTreeNode | null {
  const owner = itemOwner(state, item);
  if (!owner) return null;
  const forestRoot = isRootKpiItem(state, item);
  return {
    kpiItemId: item.id,
    kpiSetId: item.kpiSetId,
    assignmentId: owner.assignment.id,
    name: item.name,
    unit: item.unit,
    target: item.target,
    actual: displayedActual(state, item),
    linkMode: item.parentKpiItemId ? (item.cascadeMode ?? "indirect") : null,
    personId: owner.person.id,
    personName: owner.person.preferredName ?? owner.person.legalName,
    positionId: owner.position.id,
    positionTitle: owner.position.title,
    parentKpiItemId: item.parentKpiItemId ?? null,
    isForestRoot: forestRoot,
  };
}

function itemsInOpenCycle(state: AppState, cycleId: string): KpiItem[] {
  const setIds = new Set(state.kpiSets.filter((row) => row.cycleId === cycleId).map((row) => row.id));
  return state.kpiItems.filter((row) => setIds.has(row.kpiSetId));
}

function collectWithAncestors(state: AppState, seedItems: KpiItem[], allInCycle: KpiItem[]): KpiItem[] {
  const byId = new Map(allInCycle.map((row) => [row.id, row]));
  const included = new Map<string, KpiItem>();
  const visit = (item: KpiItem) => {
    if (included.has(item.id)) return;
    included.set(item.id, item);
    if (item.parentKpiItemId) {
      const parent = byId.get(item.parentKpiItemId);
      if (parent) visit(parent);
    }
  };
  for (const item of seedItems) visit(item);
  return [...included.values()];
}

export function buildKpiForest(state: AppState, scope: KpiTreeScope): KpiForest | null {
  const cycle = openCycle(state);
  if (!cycle) return null;

  const scopePersonIds = new Set(kpiTreeScopePersonIds(state, scope));
  const allInCycle = itemsInOpenCycle(state, cycle.id);

  const seed = allInCycle.filter((item) => {
    const owner = itemOwner(state, item);
    if (!owner) return false;
    if (!scopePersonIds.has(owner.person.id)) return false;
    return canReadPerson(state, owner.person.id);
  });

  const visibleItems = collectWithAncestors(state, seed, allInCycle);
  const nodes = visibleItems.map((item) => toNode(state, item)).filter((row): row is KpiTreeNode => row !== null);
  const nodeIds = new Set(nodes.map((row) => row.kpiItemId));

  const edges: KpiTreeEdge[] = [];
  for (const node of nodes) {
    if (!node.parentKpiItemId || !nodeIds.has(node.parentKpiItemId)) continue;
    edges.push({
      fromKpiItemId: node.parentKpiItemId,
      toKpiItemId: node.kpiItemId,
      mode: node.linkMode ?? "indirect",
    });
  }

  const rootKpiItemIds = nodes.filter((row) => row.isForestRoot).map((row) => row.kpiItemId);

  return {
    cycleId: cycle.id,
    nodes,
    edges,
    rootKpiItemIds,
  };
}

export function canViewKpiSet(state: AppState, kpiSetId: string): boolean {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet) return false;
  const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId);
  if (!assignment) return false;
  return canReadPerson(state, assignment.personId);
}

export function kpiSetSummary(state: AppState, kpiSetId: string) {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet) return null;
  const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId);
  if (!assignment) return null;
  const person = personById(state, assignment.personId);
  const position = positionById(state, assignment.positionId);
  const cycle = state.cycles.find((row) => row.id === kpiSet.cycleId);
  const items = itemsForSet(state, kpiSetId);
  return { kpiSet, assignment, person, position, cycle, items };
}

/** Resolve open-cycle KpiSet for an assignment if the viewer may read it. */
export function openCycleKpiSetForAssignment(state: AppState, assignmentId: string) {
  const cycle = openCycle(state);
  if (!cycle) return null;
  const kpiSet = kpiSetForAssignment(state, assignmentId, cycle.id);
  if (!kpiSet || !canViewKpiSet(state, kpiSet.id)) return null;
  return kpiSet;
}
