import { canReadPerson, currentAssignments, employmentFor, kpiSetForAssignment, positionById } from "@/lib/domain";
import { activeKpiYear, hasAdminGrant, lineManagerReportPersonIds } from "@/lib/domain-query";
import type {
  AppState,
  Assignment,
  Employment,
  EmploymentStatus,
  KpiSetStatus,
  OrgUnit,
  Person,
  Position,
  Project,
  Staffing,
  TimeBlock,
} from "@/lib/types";
import { countedTimeBlocksForPerson, hoursBetween, jakartaTodayIso, personMonthHours, staffingCoversDate } from "@/lib/work-delivery-query";

/** One Position a Person holds, with its OrgUnit and Grade names resolved for the screen. */
export type Seat = {
  assignment: Assignment;
  position: Position | undefined;
  orgUnit: OrgUnit | undefined;
  gradeName: string | null;
};

export function seatFor(state: AppState, assignment: Assignment): Seat {
  const position = positionById(state, assignment.positionId);
  return {
    assignment,
    position,
    orgUnit: position ? state.orgUnits.find((row) => row.id === position.orgUnitId) : undefined,
    gradeName: position ? (state.grades.find((row) => row.id === position.gradeId)?.name ?? null) : null,
  };
}

/** Every Position the Person holds today, oldest seat first. */
export function currentSeats(state: AppState, personId: string): Seat[] {
  return currentAssignments(state, personId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((row) => seatFor(state, row));
}

/** "Senior Consultant · Delivery", or the titles of several seats with the first seat's OrgUnit. */
export function seatLine(seats: Seat[]): string {
  if (seats.length === 0) return "";
  const titles = [...new Set(seats.map((seat) => seat.position?.title ?? "Unknown Position"))].join(" · ");
  const units = [...new Set(seats.map((seat) => seat.orgUnit?.name).filter(Boolean))];
  return units.length > 0 ? `${titles} · ${units.join(", ")}` : titles;
}

export type RosterRow = {
  person: Person;
  employment: Employment | undefined;
  seats: Seat[];
  loginEmail: string | null;
};

/** The People the viewer may read, by legal name. Scope comes from `canReadPerson`, never from the page. */
export function rosterRows(state: AppState): RosterRow[] {
  return state.people
    .filter((person) => canReadPerson(state, person.id))
    .map((person) => ({
      person,
      employment: employmentFor(state, person.id),
      seats: currentSeats(state, person.id),
      loginEmail: state.users.find((row) => row.personId === person.id)?.email ?? null,
    }))
    .sort((a, b) => a.person.legalName.localeCompare(b.person.legalName));
}

export type RosterStatusFilter = "all" | EmploymentStatus;

export const ROSTER_STATUSES: EmploymentStatus[] = ["active", "draft-hire", "resigned"];

/** Name, preferred name, contact or login email, and any held Position title, ignoring case. */
export function rosterRowMatches(row: RosterRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    row.person.legalName,
    row.person.preferredName ?? "",
    row.person.email,
    row.loginEmail ?? "",
    ...row.seats.map((seat) => seat.position?.title ?? ""),
  ].some((text) => text.toLowerCase().includes(needle));
}

export function filterRoster(rows: RosterRow[], query: string, status: RosterStatusFilter): RosterRow[] {
  return rows.filter((row) => (status === "all" || row.employment?.status === status) && rosterRowMatches(row, query));
}

export function rosterStatusCounts(rows: RosterRow[]): Record<EmploymentStatus, number> {
  const counts: Record<EmploymentStatus, number> = { active: 0, "draft-hire": 0, resigned: 0 };
  for (const row of rows) if (row.employment) counts[row.employment.status] += 1;
  return counts;
}

export type PortfolioStatus = { assignmentId: string; positionTitle: string; status: KpiSetStatus };

/**
 * KPI Portfolio status per current seat for the active KPI year. Null when there is no active year or the
 * viewer may not read KPI work for this Person: only the Person, their Line Manager, or an Admin may.
 */
export function portfolioStatuses(state: AppState, personId: string): { year: string; rows: PortfolioStatus[] } | null {
  const year = activeKpiYear(state);
  if (!year) return null;
  const me = state.currentPersonId;
  const mayRead = personId === me || hasAdminGrant(state) || lineManagerReportPersonIds(state, me).includes(personId);
  if (!mayRead) return null;
  const rows = currentSeats(state, personId).flatMap((seat) => {
    const kpiSet = kpiSetForAssignment(state, seat.assignment.id, year.id);
    return kpiSet
      ? [{ assignmentId: seat.assignment.id, positionTitle: seat.position?.title ?? "Unknown Position", status: kpiSet.status }]
      : [];
  });
  return { year: String(year.year), rows };
}

export type StaffingRow = { staffing: Staffing; project: Project | undefined; when: "current" | "upcoming" | "ended" };

/** The Person's Staffing rows: on it today, then starting later, then finished; newest start first in each. */
export function staffingRows(state: AppState, personId: string, today: string = jakartaTodayIso()): StaffingRow[] {
  const order = { current: 0, upcoming: 1, ended: 2 } as const;
  return state.staffings
    .filter((row) => row.personId === personId)
    .map((staffing) => ({
      staffing,
      project: state.projects.find((row) => row.id === staffing.projectId),
      when: staffingCoversDate(staffing, today)
        ? ("current" as const)
        : staffing.startDate > today
          ? ("upcoming" as const)
          : ("ended" as const),
    }))
    .sort((a, b) => order[a.when] - order[b.when] || b.staffing.startDate.localeCompare(a.staffing.startDate));
}

/** Distinct projects the Person is staffed on today. */
export function projectsToday(state: AppState, personId: string, today: string = jakartaTodayIso()): number {
  return new Set(
    state.staffings.filter((row) => row.personId === personId && staffingCoversDate(row, today)).map((row) => row.projectId),
  ).size;
}

export function profileCounts(state: AppState, personId: string, today: string = jakartaTodayIso()) {
  return { projectsToday: projectsToday(state, personId, today), monthHours: personMonthHours(state, personId, today) };
}

export type TimeRow = {
  block: TimeBlock;
  hours: number;
  project: Project | undefined;
  typeName: string | null;
  /** A meeting someone else logged that this Person accepted. */
  accepted: boolean;
};

/** Time the timesheet counts for the Person (own blocks plus accepted meetings), latest first. */
export function timeRows(state: AppState, personId: string): TimeRow[] {
  return countedTimeBlocksForPerson(state, personId)
    .map((block) => ({
      block,
      hours: Math.max(0, hoursBetween(block.startAt, block.endAt)),
      project: block.projectId ? state.projects.find((row) => row.id === block.projectId) : undefined,
      typeName: state.timeBlockTypes.find((row) => row.id === block.typeId)?.name ?? null,
      accepted: block.personId !== personId,
    }))
    .sort((a, b) => b.block.startAt.localeCompare(a.block.startAt));
}

/** Seats a new Assignment may take: empty Positions, by title. */
export function openSeats(state: AppState): Seat[] {
  const filled = new Set(state.assignments.filter((row) => row.endDate === null).map((row) => row.positionId));
  return state.positions
    .filter((position) => !filled.has(position.id))
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((position) =>
      seatFor(state, { id: "", tenantId: position.tenantId, personId: "", positionId: position.id, startDate: "", endDate: null }),
    );
}

/** "2019 – 2023" from free-text CV dates, which may be partial. */
export function cvDates(start: string | undefined, end: string | undefined): string {
  return [start, end].filter(Boolean).join(" – ") || "Dates not given";
}

const PLAIN: Record<string, string> = {
  "Only HR can change people, positions, and CV reviews": "Only HR can do this.",
  "Only the Person or Admin may edit contact details": "Only this person or an Admin can change these contact details.",
  "Person not found": "This profile no longer exists. Go back to People and open it again.",
  "Grant or revoke Admin requires HR or an existing Admin grant": "Only HR or an Admin can change Admin access.",
  "User not found": "This person has no login yet. Create their login first.",
  "You can only request corrections to your own profile": "You can only ask for corrections to your own profile.",
};

/** People commands refuse in domain terms; the profile says what to do about it. */
export function plainPeopleError(message: string | null | undefined): string {
  if (!message) return "";
  return PLAIN[message] ?? message;
}
