import {
  effectiveCheckInStatus,
  hasAdminGrant,
  isCheckInDualApproved,
  isLineManagerForKpiSet,
  isPortfolioDualApproved,
  lineManagerPersonIdForAssignment,
  normalizeKpiYearPhase,
} from "./domain-query";
import { windowFor } from "./cadence";
import { todayIso } from "./domain";
import type {
  AppState,
  Invite,
  LeaveRequest,
  Project,
  Staffing,
  TimeBlock,
} from "./types";

const WEEK_TARGET_HOURS = 40;

export function jakartaTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseJakartaDateTime(value: string): number {
  // `YYYY-MM-DDTHH:mm` interpreted as Asia/Jakarta (+07:00).
  const normalized = value.length === 16 ? `${value}:00` : value;
  return Date.parse(`${normalized}+07:00`);
}

export function hoursBetween(startAt: string, endAt: string): number {
  return (parseJakartaDateTime(endAt) - parseJakartaDateTime(startAt)) / (1000 * 60 * 60);
}

export function staffingCoversDate(row: Staffing, date: string): boolean {
  if (row.startDate > date) return false;
  if (row.endDate !== null && row.endDate < date) return false;
  return true;
}

export function isStaffedOnProject(
  state: AppState,
  personId: string,
  projectId: string,
  date: string = jakartaTodayIso(),
): boolean {
  return state.staffings.some(
    (row) => row.personId === personId && row.projectId === projectId && staffingCoversDate(row, date),
  );
}

export function hasAnyStaffingOnProject(state: AppState, personId: string, projectId: string): boolean {
  return state.staffings.some((row) => row.personId === personId && row.projectId === projectId);
}

export function canEditProjectWork(state: AppState, projectId: string, date: string = jakartaTodayIso()): boolean {
  if (hasAdminGrant(state)) return true;
  return isStaffedOnProject(state, state.currentPersonId, projectId, date);
}

export function personLoadSum(
  state: AppState,
  personId: string,
  date: string = jakartaTodayIso(),
): number {
  return state.staffings
    .filter((row) => row.personId === personId && staffingCoversDate(row, date))
    .reduce((sum, row) => sum + row.load, 0);
}

export function personLoadOverload(
  state: AppState,
  personId: string,
  date: string = jakartaTodayIso(),
): number {
  return Math.max(0, personLoadSum(state, personId, date) - 100);
}

export function projectById(state: AppState, projectId: string): Project | undefined {
  return state.projects.find((row) => row.id === projectId);
}

export function projectCodeTaken(state: AppState, code: string, exceptId?: string): boolean {
  const needle = code.toLowerCase();
  return state.projects.some((row) => row.id !== exceptId && row.code.toLowerCase() === needle);
}

export function rangesOverlap(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null,
): boolean {
  const aRight = aEnd ?? "9999-12-31";
  const bRight = bEnd ?? "9999-12-31";
  return aStart <= bRight && bStart <= aRight;
}

export function defaultDeliverableStatusId(state: AppState): string | null {
  const preferred = state.deliverableStatuses.find((row) => row.isDefault);
  if (preferred) return preferred.id;
  return state.deliverableStatuses[0]?.id ?? null;
}

export function projectProgressPercent(state: AppState, projectId: string): number | null {
  const rows = state.deliverables.filter((row) => row.projectId === projectId);
  if (rows.length === 0) return null;
  const acceptedIds = new Set(
    state.deliverableStatuses.filter((row) => row.countsAsAccepted).map((row) => row.id),
  );
  const accepted = rows.filter((row) => acceptedIds.has(row.statusId)).length;
  return accepted / rows.length;
}

export function leaveIsApproved(row: LeaveRequest): boolean {
  return row.decision === "paid" || row.decision === "unpaid";
}

export function leaveBlocksWork(row: LeaveRequest): boolean {
  return leaveIsApproved(row) && (row.kind === "cuti" || row.kind === "sick");
}

function leaveDaySet(row: LeaveRequest): Set<string> {
  const days = new Set<string>();
  let cursor = row.startDate;
  while (cursor <= row.endDate) {
    days.add(cursor);
    const next = new Date(`${cursor}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = next.toISOString().slice(0, 10);
  }
  return days;
}

export function leaveOverlapsSpan(
  row: LeaveRequest,
  startAt: string,
  endAt: string,
): boolean {
  if (!leaveBlocksWork(row)) return false;
  const startDate = startAt.slice(0, 10);
  const endDate = endAt.slice(0, 10);
  if (row.spanMode === "days") {
    const days = leaveDaySet(row);
    let cursor = startDate;
    while (cursor <= endDate) {
      if (days.has(cursor)) return true;
      const next = new Date(`${cursor}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      cursor = next.toISOString().slice(0, 10);
    }
    return false;
  }
  if (!row.startTime || !row.endTime) return false;
  if (row.startDate !== startDate && row.startDate !== endDate) {
    // Hours leave is one date; only that date can collide.
    if (startDate > row.startDate || endDate < row.startDate) return false;
  }
  const leaveStart = parseJakartaDateTime(`${row.startDate}T${row.startTime}`);
  const leaveEnd = parseJakartaDateTime(`${row.startDate}T${row.endTime}`);
  const blockStart = parseJakartaDateTime(startAt);
  const blockEnd = parseJakartaDateTime(endAt);
  return blockStart < leaveEnd && leaveStart < blockEnd;
}

export function personHasBlockingLeave(
  state: AppState,
  personId: string,
  startAt: string,
  endAt: string,
): boolean {
  return state.leaveRequests.some(
    (row) => row.personId === personId && leaveOverlapsSpan(row, startAt, endAt),
  );
}

export function timeBlocksForPerson(state: AppState, personId: string): TimeBlock[] {
  const owned = state.timeBlocks.filter((row) => row.personId === personId);
  const invitedIds = new Set(
    state.invites
      .filter((row) => row.personId === personId && row.status !== "declined")
      .map((row) => row.timeBlockId),
  );
  const invited = state.timeBlocks.filter(
    (row) => invitedIds.has(row.id) && row.personId !== personId,
  );
  return [...owned, ...invited];
}

export function countedTimeBlocksForPerson(state: AppState, personId: string): TimeBlock[] {
  const owned = state.timeBlocks.filter((row) => row.personId === personId);
  const acceptedIds = new Set(
    state.invites
      .filter((row) => row.personId === personId && row.status === "accepted")
      .map((row) => row.timeBlockId),
  );
  const accepted = state.timeBlocks.filter(
    (row) => acceptedIds.has(row.id) && row.personId !== personId,
  );
  return [...owned, ...accepted];
}

export function blocksOverlap(a: { startAt: string; endAt: string }, b: { startAt: string; endAt: string }): boolean {
  return parseJakartaDateTime(a.startAt) < parseJakartaDateTime(b.endAt)
    && parseJakartaDateTime(b.startAt) < parseJakartaDateTime(a.endAt);
}

export function personHasOverlappingBlock(
  state: AppState,
  personId: string,
  startAt: string,
  endAt: string,
  exceptBlockId?: string,
): boolean {
  return timeBlocksForPerson(state, personId).some((row) => {
    if (row.id === exceptBlockId) return false;
    const invite = state.invites.find((item) => item.timeBlockId === row.id && item.personId === personId);
    if (invite?.status === "declined") return false;
    // Pending invite still occupies the invitee's calendar for overlap refusal? Spec: two blocks may not overlap.
    // Pending shows on calendar; treat as occupying the slot for that person.
    return blocksOverlap(row, { startAt, endAt });
  });
}

export function mondayOfWeek(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00+07:00`);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "short" }).format(date);
  const offset = { Sun: -6, Mon: 0, Tue: -1, Wed: -2, Thu: -3, Fri: -4, Sat: -5 }[day] ?? 0;
  date.setUTCDate(date.getUTCDate() + offset);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function personHoursInRange(
  state: AppState,
  personId: string,
  fromDate: string,
  toDate: string,
): number {
  return countedTimeBlocksForPerson(state, personId).reduce((sum, row) => {
    const day = row.startAt.slice(0, 10);
    if (day < fromDate || day > toDate) return sum;
    return sum + Math.max(0, hoursBetween(row.startAt, row.endAt));
  }, 0);
}

export function personWeekHours(state: AppState, personId: string, today: string = jakartaTodayIso()): number {
  const monday = mondayOfWeek(today);
  const sunday = addDaysIso(monday, 6);
  return personHoursInRange(state, personId, monday, sunday);
}

export function personMonthHours(state: AppState, personId: string, today: string = jakartaTodayIso()): number {
  const from = `${today.slice(0, 7)}-01`;
  const nextMonth = addDaysIso(`${today.slice(0, 7)}-28`, 5).slice(0, 7);
  const to = addDaysIso(`${nextMonth}-01`, -1);
  return personHoursInRange(state, personId, from, to);
}

export function weekTargetHours(): number {
  return WEEK_TARGET_HOURS;
}

export function upcomingMeetingsForPerson(
  state: AppState,
  personId: string,
  fromDate: string = jakartaTodayIso(),
): Array<{ block: TimeBlock; invite: Invite | null }> {
  const meetingTypeIds = new Set(
    state.timeBlockTypes.filter((row) => row.allowsInvites).map((row) => row.id),
  );
  const results: Array<{ block: TimeBlock; invite: Invite | null }> = [];
  for (const block of state.timeBlocks) {
    if (!meetingTypeIds.has(block.typeId)) continue;
    if (block.startAt.slice(0, 10) < fromDate) continue;
    if (block.personId === personId) {
      results.push({ block, invite: null });
      continue;
    }
    const invite = state.invites.find((row) => row.timeBlockId === block.id && row.personId === personId);
    if (!invite || invite.status === "declined") continue;
    results.push({ block, invite });
  }
  return results.sort((a, b) => a.block.startAt.localeCompare(b.block.startAt));
}

export function homeProjectsForPerson(state: AppState, personId: string, today: string = jakartaTodayIso()) {
  return state.projects
    .filter((project) => isStaffedOnProject(state, personId, project.id, today))
    .map((project) => ({
      project,
      progress: projectProgressPercent(state, project.id),
    }));
}

export function latestApprovedCheckInsForPerson(state: AppState, personId: string) {
  const assignmentIds = new Set(
    state.assignments.filter((row) => row.personId === personId).map((row) => row.id),
  );
  const setIds = new Set(
    state.kpiSets.filter((row) => assignmentIds.has(row.assignmentId)).map((row) => row.id),
  );
  const items = state.kpiItems.filter((row) => setIds.has(row.kpiSetId));
  return items
    .map((item) => {
      const approved = state.checkIns
        .filter((row) => row.kpiItemId === item.id && isCheckInDualApproved(state, row.id))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!approved) return null;
      return { item, checkIn: approved, actual: approved.actual, target: item.target };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.checkIn.date.localeCompare(a.checkIn.date));
}

export function menuVisibility(state: AppState) {
  return {
    projects: true,
    projectAdmin: hasAdminGrant(state),
  };
}

export type KpiReminder = {
  kind: "planning" | "check-in" | "meeting";
  personId: string;
  label: string;
  dueDate: string;
  inviteId?: string;
};

function daysUntil(dueDate: string, today: string): number {
  const due = Date.parse(`${dueDate}T12:00:00Z`);
  const now = Date.parse(`${today}T12:00:00Z`);
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

function isReminderWindow(dueDate: string, today: string): boolean {
  const delta = daysUntil(dueDate, today);
  return delta === 0 || delta === 1 || delta === 3;
}

function lastDayOfMonth(yearMonth: string): string {
  const next = addDaysIso(`${yearMonth}-28`, 5).slice(0, 7);
  return addDaysIso(`${next}-01`, -1);
}

function lastDayOfQuarter(dateIso: string): string {
  const month = Number(dateIso.slice(5, 7));
  const year = dateIso.slice(0, 4);
  const endMonth = month <= 3 ? "03" : month <= 6 ? "06" : month <= 9 ? "09" : "12";
  return lastDayOfMonth(`${year}-${endMonth}`);
}

export function kpiRemindersForPerson(
  state: AppState,
  personId: string,
  today: string = jakartaTodayIso(),
): KpiReminder[] {
  const reminders: KpiReminder[] = [];
  const isAdmin = hasAdminGrant(state, personId);

  for (const cycle of state.cycles) {
    const phase = normalizeKpiYearPhase(cycle);
    if (phase !== "planning") continue;
    const due = cycle.planningEndsOn;
    if (!due) continue;
    if (!isReminderWindow(due, today)) continue;

    for (const set of state.kpiSets.filter((row) => row.cycleId === cycle.id)) {
      if (isPortfolioDualApproved(state, set.id)) continue;
      const ownerId = state.assignments.find((row) => row.id === set.assignmentId)?.personId;
      if (!ownerId) continue;
      if (ownerId === personId) {
        reminders.push({
          kind: "planning",
          personId,
          label: `Planning ends ${due}`,
          dueDate: due,
        });
      }
      const lineManagerId = lineManagerPersonIdForAssignment(state, set.assignmentId);
      if (lineManagerId === personId && !set.lineManagerApprovedBy) {
        reminders.push({
          kind: "planning",
          personId,
          label: `Approve planning by ${due}`,
          dueDate: due,
        });
      }
      if (isAdmin && !set.adminApprovedBy) {
        reminders.push({
          kind: "planning",
          personId,
          label: `Admin planning approval by ${due}`,
          dueDate: due,
        });
      }
    }
  }

  for (const set of state.kpiSets) {
    const cycle = state.cycles.find((row) => row.id === set.cycleId);
    if (!cycle || normalizeKpiYearPhase(cycle) !== "monitoring") continue;
    const ownerId = state.assignments.find((row) => row.id === set.assignmentId)?.personId;
    if (!ownerId) continue;
    const items = state.kpiItems.filter((row) => row.kpiSetId === set.id);
    for (const item of items) {
      const cadence = item.checkInCadence ?? cycle.checkInCadence;
      const due = cadence === "monthly" ? lastDayOfMonth(today.slice(0, 7)) : lastDayOfQuarter(today);
      if (!isReminderWindow(due, today)) continue;
      const currentWindow = windowFor(today, cadence);
      const inWindow = state.checkIns.filter(
        (row) => row.kpiItemId === item.id && row.window === currentWindow,
      );
      const latest = [...inWindow].sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!latest) {
        if (ownerId === personId) {
          reminders.push({
            kind: "check-in",
            personId,
            label: `Submit check-in by ${due}`,
            dueDate: due,
          });
        }
        continue;
      }
      if (!isCheckInDualApproved(state, latest.id)) {
        if (ownerId === personId && effectiveCheckInStatus(latest) === "returned") {
          reminders.push({
            kind: "check-in",
            personId,
            label: `Resubmit check-in by ${due}`,
            dueDate: due,
          });
        }
        const waiting = effectiveCheckInStatus(latest) === "pending";
        if (waiting && isLineManagerForKpiSet({ ...state, currentPersonId: personId }, set.id) && !latest.lineManagerApprovedBy) {
          reminders.push({
            kind: "check-in",
            personId,
            label: `Approve check-in`,
            dueDate: due,
          });
        }
        if (waiting && isAdmin && !latest.adminApprovedBy) {
          reminders.push({
            kind: "check-in",
            personId,
            label: `Admin check-in approval`,
            dueDate: due,
          });
        }
      }
    }
  }

  for (const meeting of upcomingMeetingsForPerson(state, personId, today)) {
    if (!meeting.invite || meeting.invite.status !== "pending") continue;
    reminders.push({
      kind: "meeting",
      personId,
      label: meeting.block.title || "Meeting invite",
      dueDate: meeting.block.startAt.slice(0, 10),
      inviteId: meeting.invite.id,
    });
  }

  return reminders;
}

/** @deprecated kept for tests that import todayIso from domain */
export { todayIso };
