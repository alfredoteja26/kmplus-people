import type { AppState, CheckInRecord, KpiCycle, KpiSet, KpiYearPhase } from "./types";

function currentAssignmentForPerson(state: AppState, personId: string) {
  return state.assignments.find((row) => row.personId === personId && row.endDate === null);
}

function assignmentForPosition(state: AppState, positionId: string) {
  return state.assignments.find((row) => row.positionId === positionId && row.endDate === null);
}

function positionById(state: AppState, id: string) {
  return state.positions.find((row) => row.id === id);
}

export function assignmentForKpiSet(state: AppState, kpiSetId: string) {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet) return undefined;
  return state.assignments.find((row) => row.id === kpiSet.assignmentId);
}

/** Person on the nearest filled ancestor of this Assignment’s Position. */
export function lineManagerPersonIdForAssignment(state: AppState, assignmentId: string): string | null {
  const seat = state.assignments.find((row) => row.id === assignmentId);
  if (!seat) return null;
  let positionId = positionById(state, seat.positionId)?.reportsToPositionId ?? null;
  while (positionId) {
    const filled = assignmentForPosition(state, positionId);
    if (filled) return filled.personId;
    positionId = positionById(state, positionId)?.reportsToPositionId ?? null;
  }
  return null;
}

export function lineManagerPersonIdForKpiSet(state: AppState, kpiSetId: string): string | null {
  const assignment = assignmentForKpiSet(state, kpiSetId);
  if (!assignment) return null;
  return lineManagerPersonIdForAssignment(state, assignment.id);
}

/** Person on the nearest filled ancestor Position of the first current Assignment. */
export function lineManagerPersonId(state: AppState, personId: string): string | null {
  const seat = currentAssignmentForPerson(state, personId);
  if (!seat) return null;
  return lineManagerPersonIdForAssignment(state, seat.id);
}

export function adminIsRemainingApproverForAssignment(state: AppState, assignmentId: string): boolean {
  return lineManagerPersonIdForAssignment(state, assignmentId) === null;
}

export function adminIsRemainingApproverForKpiSet(state: AppState, kpiSetId: string): boolean {
  const assignment = assignmentForKpiSet(state, kpiSetId);
  if (!assignment) return true;
  return adminIsRemainingApproverForAssignment(state, assignment.id);
}

export function adminIsRemainingPortfolioApprover(state: AppState, personId: string | null): boolean {
  if (!personId) return true;
  return lineManagerPersonId(state, personId) === null;
}

export function lineManagerReportAssignments(state: AppState, managerPersonId: string) {
  return state.assignments.filter(
    (row) =>
      row.endDate === null &&
      row.personId !== managerPersonId &&
      lineManagerPersonIdForAssignment(state, row.id) === managerPersonId,
  );
}

/** People whose LineManager is the given manager (includes skip-level through vacant seats). */
export function lineManagerReportPersonIds(state: AppState, managerPersonId: string): string[] {
  return [...new Set(lineManagerReportAssignments(state, managerPersonId).map((row) => row.personId))];
}

export function personIdForKpiSet(state: AppState, kpiSetId: string): string | null {
  return assignmentForKpiSet(state, kpiSetId)?.personId ?? null;
}

export function isLineManagerForPerson(state: AppState, reportPersonId: string, actorPersonId: string = state.currentPersonId) {
  const managerId = lineManagerPersonId(state, reportPersonId);
  return managerId !== null && managerId === actorPersonId;
}

export function isLineManagerForKpiSet(state: AppState, kpiSetId: string, actorPersonId: string = state.currentPersonId) {
  const managerId = lineManagerPersonIdForKpiSet(state, kpiSetId);
  return managerId !== null && managerId === actorPersonId;
}

export function canDraftKpiPortfolio(state: AppState, kpiSetId: string): boolean {
  const ownerId = personIdForKpiSet(state, kpiSetId);
  if (!ownerId) return false;
  if (ownerId === state.currentPersonId) return true;
  if (hasAdminGrant(state)) return true;
  return isLineManagerForKpiSet(state, kpiSetId);
}

export function canAgreeOrReturnKpiPortfolio(state: AppState, kpiSetId: string): boolean {
  const ownerId = personIdForKpiSet(state, kpiSetId);
  if (!ownerId) return false;
  if (hasAdminGrant(state)) return true;
  if (ownerId === state.currentPersonId) return false;
  return isLineManagerForKpiSet(state, kpiSetId);
}

export function hasAdminGrant(state: AppState, personId: string = state.currentPersonId) {
  return Boolean(state.users.find((row) => row.personId === personId)?.adminGrant);
}

export function canAccessKpiAdmin(state: AppState) {
  return hasAdminGrant(state);
}

export function normalizeKpiYearPhase(cycle: KpiCycle): KpiYearPhase | null {
  if (cycle.phase) return cycle.phase;
  if (cycle.status === "closed") return "closed";
  if (cycle.status === "open") return "monitoring";
  return null;
}

export function kpiYearPhase(cycle: KpiCycle): KpiYearPhase | null {
  return normalizeKpiYearPhase(cycle);
}

export function activeKpiYear(state: AppState) {
  return state.cycles.find((row) => {
    const phase = normalizeKpiYearPhase(row);
    return phase === "planning" || phase === "monitoring";
  });
}

export function latestClosedKpiYear(state: AppState) {
  return [...state.cycles]
    .filter((row) => normalizeKpiYearPhase(row) === "closed")
    .sort((left, right) => right.year - left.year)[0];
}

/** Active year, or the latest closed year so My KPI can show stored scores. */
export function readableKpiYear(state: AppState) {
  return activeKpiYear(state) ?? latestClosedKpiYear(state);
}

/** KpiYear currently in KpiPlanning or KpiMonitoring (product: the operable year). */
export function openCycle(state: AppState) {
  return activeKpiYear(state);
}

export function allPriorYearsClosed(state: AppState, year: number) {
  return state.cycles.filter((row) => row.year < year).every((row) => normalizeKpiYearPhase(row) === "closed");
}

export function kpiSetById(state: AppState, kpiSetId: string): KpiSet | undefined {
  return state.kpiSets.find((row) => row.id === kpiSetId);
}

/** LineManager and Admin stamps both present, or Admin-only when no LineManager exists. */
export function isPortfolioDualApproved(state: AppState, kpiSetId: string): boolean {
  const kpiSet = kpiSetById(state, kpiSetId);
  if (!kpiSet) return false;
  const ownerId = personIdForKpiSet(state, kpiSetId);
  if (!ownerId) return false;
  if (adminIsRemainingApproverForKpiSet(state, kpiSetId)) {
    return Boolean(kpiSet.adminApprovedBy);
  }
  return Boolean(kpiSet.lineManagerApprovedBy && kpiSet.adminApprovedBy);
}

export function portfolioApprovalGaps(state: AppState, kpiSetId: string) {
  const kpiSet = kpiSetById(state, kpiSetId);
  const ownerId = personIdForKpiSet(state, kpiSetId);
  const vacantRoot = adminIsRemainingApproverForKpiSet(state, kpiSetId);
  return {
    needsLineManager: Boolean(kpiSet && ownerId && !vacantRoot && !kpiSet.lineManagerApprovedBy),
    needsAdmin: Boolean(kpiSet && !kpiSet.adminApprovedBy),
  };
}

export function portfolioApprovalWaitingCopy(state: AppState, kpiSetId: string): string | null {
  const kpiSet = kpiSetById(state, kpiSetId);
  if (!kpiSet || kpiSet.status !== "pending") return null;
  const gaps = portfolioApprovalGaps(state, kpiSetId);
  const waiting: string[] = [];
  if (gaps.needsLineManager) waiting.push("line manager");
  if (gaps.needsAdmin) waiting.push("Admin");
  if (waiting.length === 0) return null;
  return `Waiting on ${waiting.join(" and ")} approval`;
}

export function personIdForCheckIn(state: AppState, checkInId: string): string | null {
  const checkIn = state.checkIns.find((row) => row.id === checkInId);
  if (!checkIn) return null;
  const item = state.kpiItems.find((row) => row.id === checkIn.kpiItemId);
  if (!item) return null;
  return personIdForKpiSet(state, item.kpiSetId);
}

export function checkInById(state: AppState, checkInId: string): CheckInRecord | undefined {
  return state.checkIns.find((row) => row.id === checkInId);
}

export function effectiveCheckInStatus(checkIn: CheckInRecord): NonNullable<CheckInRecord["status"]> {
  return checkIn.status ?? "approved";
}

/** LineManager and Admin stamps both present, or Admin-only when no LineManager exists. */
export function isCheckInDualApproved(state: AppState, checkInId: string): boolean {
  const checkIn = checkInById(state, checkInId);
  if (!checkIn) return false;
  if (effectiveCheckInStatus(checkIn) === "approved") return true;
  if (effectiveCheckInStatus(checkIn) !== "pending") return false;
  const ownerId = personIdForCheckIn(state, checkInId);
  if (!ownerId) return false;
  const item = state.kpiItems.find((row) => row.id === checkIn.kpiItemId);
  if (item && adminIsRemainingApproverForKpiSet(state, item.kpiSetId)) {
    return Boolean(checkIn.adminApprovedBy);
  }
  return Boolean(checkIn.lineManagerApprovedBy && checkIn.adminApprovedBy);
}

export function checkInCountsForActuals(state: AppState, checkIn: CheckInRecord): boolean {
  return isCheckInDualApproved(state, checkIn.id);
}

export function canAgreeOrReturnCheckIn(state: AppState, checkInId: string): boolean {
  const ownerId = personIdForCheckIn(state, checkInId);
  if (!ownerId) return false;
  if (hasAdminGrant(state)) return true;
  if (ownerId === state.currentPersonId) return false;
  const item = checkInById(state, checkInId)
    ? state.kpiItems.find((row) => row.id === checkInById(state, checkInId)!.kpiItemId)
    : undefined;
  if (!item) return false;
  return isLineManagerForKpiSet(state, item.kpiSetId);
}

export function checkInApprovalGaps(state: AppState, checkInId: string) {
  const checkIn = checkInById(state, checkInId);
  const ownerId = personIdForCheckIn(state, checkInId);
  const item = checkIn ? state.kpiItems.find((row) => row.id === checkIn.kpiItemId) : undefined;
  const vacantRoot = item ? adminIsRemainingApproverForKpiSet(state, item.kpiSetId) : false;
  return {
    needsLineManager: Boolean(checkIn && ownerId && !vacantRoot && !checkIn.lineManagerApprovedBy),
    needsAdmin: Boolean(checkIn && !checkIn.adminApprovedBy),
  };
}

export function checkInApprovalWaitingCopy(state: AppState, checkInId: string): string | null {
  const checkIn = checkInById(state, checkInId);
  if (!checkIn || effectiveCheckInStatus(checkIn) !== "pending") return null;
  const gaps = checkInApprovalGaps(state, checkInId);
  const waiting: string[] = [];
  if (gaps.needsLineManager) waiting.push("line manager");
  if (gaps.needsAdmin) waiting.push("Admin");
  if (waiting.length === 0) return null;
  return `Waiting on ${waiting.join(" and ")} approval`;
}

export function pendingCheckInsForOwner(state: AppState, ownerPersonId: string): CheckInRecord[] {
  return state.checkIns.filter((row) => {
    const owner = personIdForCheckIn(state, row.id);
    return owner === ownerPersonId && effectiveCheckInStatus(row) === "pending";
  });
}

export function pendingCheckInsForLineManager(state: AppState, managerPersonId: string): CheckInRecord[] {
  return state.checkIns.filter((row) => {
    if (effectiveCheckInStatus(row) !== "pending") return false;
    const item = state.kpiItems.find((entry) => entry.id === row.kpiItemId);
    if (!item) return false;
    return lineManagerPersonIdForKpiSet(state, item.kpiSetId) === managerPersonId;
  });
}
