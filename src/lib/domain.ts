import { displayedActual } from "./direct";
import type { AppState, Assignment, Health, KpiItem, KpiSet, Person, Position, Role } from "./types";

export function nid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentAssignment(state: AppState, personId: string): Assignment | undefined {
  return state.assignments.find((row) => row.personId === personId && row.endDate === null);
}

export function assignmentForPosition(state: AppState, positionId: string): Assignment | undefined {
  return state.assignments.find((row) => row.positionId === positionId && row.endDate === null);
}

export function personById(state: AppState, id: string) {
  return state.people.find((row) => row.id === id);
}

export function userForPerson(state: AppState, personId: string) {
  return state.users.find((row) => row.personId === personId);
}

export function positionById(state: AppState, id: string) {
  return state.positions.find((row) => row.id === id);
}

export function employmentFor(state: AppState, personId: string) {
  return state.employments.find((row) => row.personId === personId);
}

export function openCycle(state: AppState) {
  return state.cycles.find((row) => row.status === "open");
}

export function kpiSetForAssignment(state: AppState, assignmentId: string, cycleId: string) {
  return state.kpiSets.find((row) => row.assignmentId === assignmentId && row.cycleId === cycleId);
}

export function itemsForSet(state: AppState, kpiSetId: string) {
  return state.kpiItems.filter((row) => row.kpiSetId === kpiSetId);
}

export function weightSum(items: KpiItem[]) {
  return items.reduce((sum, item) => sum + item.weight, 0);
}

export function latestCheckIn(state: AppState, kpiItemId: string) {
  return state.checkIns
    .filter((row) => row.kpiItemId === kpiItemId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function itemHealth(state: AppState, item: KpiItem): Health {
  const actual = displayedActual(state, item);
  if (actual === null) return "none";
  const ratio = item.target === 0 ? 1 : actual / item.target;
  const score = item.polarity === "lower-better" ? (item.target === 0 ? 1 : item.target / Math.max(actual, 0.0001)) : ratio;
  if (score >= 0.8) return "on-track";
  if (score >= 0.5) return "at-risk";
  return "off";
}

export function setHealth(state: AppState, kpiSet: KpiSet): Health {
  if (kpiSet.status === "draft" || kpiSet.status === "returned") return "none";
  const items = itemsForSet(state, kpiSet.id);
  if (items.length === 0) return "none";
  const ranks = { off: 0, "at-risk": 1, "on-track": 2, none: 1 };
  let worst: Health = "on-track";
  for (const item of items) {
    const health = itemHealth(state, item);
    if (ranks[health] < ranks[worst]) worst = health;
  }
  return worst;
}

export function descendantPositionIds(state: AppState, rootPositionId: string): string[] {
  const ids: string[] = [];
  const walk = (parentId: string) => {
    for (const position of state.positions) {
      if (position.reportsToPositionId === parentId) {
        ids.push(position.id);
        walk(position.id);
      }
    }
  };
  walk(rootPositionId);
  return ids;
}

export function teamPersonIds(state: AppState, managerPersonId: string): string[] {
  const seat = currentAssignment(state, managerPersonId);
  if (!seat) return [];
  const positionIds = descendantPositionIds(state, seat.positionId);
  return state.assignments
    .filter((row) => row.endDate === null && positionIds.includes(row.positionId))
    .map((row) => row.personId);
}

export function canReadPerson(state: AppState, personId: string) {
  const { currentRole, currentPersonId } = state;
  if (currentRole === "hr" || currentRole === "admin") return true;
  if (personId === currentPersonId) return true;
  if (currentRole === "manager") return teamPersonIds(state, currentPersonId).includes(personId);
  return false;
}

export function isHrLike(role: Role) {
  return role === "hr" || role === "admin";
}

export function roleLabel(role: Role) {
  if (role === "hr") return "HR";
  if (role === "admin") return "Tenant admin";
  if (role === "manager") return "Manager";
  return "Employee";
}

export function emptySeats(state: AppState): Position[] {
  return state.positions.filter((position) => !assignmentForPosition(state, position.id));
}

export function visiblePeople(state: AppState): Person[] {
  return state.people.filter((person) => canReadPerson(state, person.id));
}

export function activePeopleCount(state: AppState) {
  return state.employments.filter((row) => row.status === "active").length;
}

export function cvsInReviewCount(state: AppState) {
  return state.cvs.filter((row) => row.state === "in-review" || row.state === "parsed").length;
}

export function kpiOnTrackCount(state: AppState) {
  const cycle = openCycle(state);
  if (!cycle) return 0;
  return state.kpiSets.filter((row) => row.cycleId === cycle.id && setHealth(state, row) === "on-track").length;
}

export function fieldValue(field: { value: string; editedValue?: string; decision: string }) {
  if (field.decision === "edited" && field.editedValue !== undefined) return field.editedValue;
  return field.value;
}

export function rootPositions(state: AppState) {
  return state.positions.filter((row) => row.reportsToPositionId === null);
}

export function childPositions(state: AppState, parentId: string) {
  return state.positions.filter((row) => row.reportsToPositionId === parentId);
}
