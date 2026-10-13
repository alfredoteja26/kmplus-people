import { leaveDates, activeHolidays, isWeekendIso, leaveKindLabel } from "@/lib/leave-view";
import { personName } from "@/lib/project-view";
import type { AppState, LeaveRequest, Person, Project } from "@/lib/types";
import {
  addDaysIso,
  countedTimeBlocksForPerson,
  hoursBetween,
  jakartaTodayIso,
  leaveBlocksWork,
  leaveIsApproved,
  mondayOfWeek,
  personLoadSum,
  staffingCoversDate,
} from "@/lib/work-delivery-query";

/** First and last date of a month; `monthIndex` is 0-based. */
export function monthSpan(year: number, monthIndex: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

function isActiveProject(project: Project, today: string): boolean {
  return project.startDate <= today && (!project.endDate || project.endDate >= today);
}

function round1(hours: number): number {
  return Math.round(hours * 10) / 10;
}

/** Every counted hour in the span, one entry per Person per block: their own blocks plus Meetings they accepted. */
function countedHours(state: AppState, from: string, to: string) {
  return state.people.flatMap((person) =>
    countedTimeBlocksForPerson(state, person.id)
      .filter((block) => {
        const day = block.startAt.slice(0, 10);
        return day >= from && day <= to;
      })
      .map((block) => ({ person, block, day: block.startAt.slice(0, 10), hours: Math.max(0, hoursBetween(block.startAt, block.endAt)) })),
  );
}

export type StaffedPerson = { person: Person | undefined; personId: string; load: number };

/** People on at least one Project today with their summed Load; the overload stays visible, never capped. */
export function staffedToday(state: AppState, today: string = jakartaTodayIso()): StaffedPerson[] {
  const ids = [...new Set(state.staffings.filter((row) => staffingCoversDate(row, today)).map((row) => row.personId))];
  return ids
    .map((personId) => ({ personId, person: state.people.find((row) => row.id === personId), load: personLoadSum(state, personId, today) }))
    .sort((a, b) => b.load - a.load || personName(a.person).localeCompare(personName(b.person)));
}

export function adminFacts(state: AppState, today: string = jakartaTodayIso()) {
  const span = monthSpan(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1);
  const staffed = staffedToday(state, today);
  return {
    activeProjects: state.projects.filter((row) => isActiveProject(row, today)).length,
    projects: state.projects.length,
    staffed: staffed.length,
    overloaded: staffed.filter((row) => row.load > 100).length,
    monthHours: round1(countedHours(state, span.from, today < span.to ? today : span.to).reduce((sum, row) => sum + row.hours, 0)),
    leaveToDecide: state.leaveRequests.filter((row) => row.decision === null).length,
  };
}

export type ProjectHours = { project: Project | null; hours: number };

/** Counted hours per Project in the span, most first; time with no Project is one last row when there is any. */
export function hoursByProject(state: AppState, from: string, to: string): ProjectHours[] {
  const byProject = new Map<string | null, number>();
  for (const row of countedHours(state, from, to)) {
    const key = row.block.projectId && state.projects.some((item) => item.id === row.block.projectId) ? row.block.projectId : null;
    byProject.set(key, (byProject.get(key) ?? 0) + row.hours);
  }
  const projects = [...byProject.entries()]
    .filter(([key]) => key !== null)
    .map(([key, hours]) => ({ project: state.projects.find((item) => item.id === key) ?? null, hours: round1(hours) }))
    .sort((a, b) => b.hours - a.hours || (a.project?.code ?? "").localeCompare(b.project?.code ?? ""));
  const none = byProject.get(null);
  return none ? [...projects, { project: null, hours: round1(none) }] : projects;
}

export type PersonMonth = {
  person: Person;
  hours: number;
  daysLogged: number;
  byProject: { project: Project | null; hours: number }[];
};

/** Hours per Person in the span, most first. People with no hours appear only while they are staffed in the span. */
export function timesheetByPerson(state: AppState, from: string, to: string): PersonMonth[] {
  const rows = countedHours(state, from, to);
  const staffedIds = new Set(
    state.staffings.filter((row) => row.startDate <= to && (!row.endDate || row.endDate >= from)).map((row) => row.personId),
  );
  return state.people
    .map((person) => {
      const mine = rows.filter((row) => row.person.id === person.id);
      const byProject = new Map<string | null, number>();
      for (const row of mine) byProject.set(row.block.projectId ?? null, (byProject.get(row.block.projectId ?? null) ?? 0) + row.hours);
      return {
        person,
        hours: round1(mine.reduce((sum, row) => sum + row.hours, 0)),
        daysLogged: new Set(mine.map((row) => row.day)).size,
        byProject: [...byProject.entries()]
          .map(([key, hours]) => ({ project: key ? (state.projects.find((item) => item.id === key) ?? null) : null, hours: round1(hours) }))
          .sort((a, b) => b.hours - a.hours),
      };
    })
    .filter((row) => row.hours > 0 || staffedIds.has(row.person.id))
    .sort((a, b) => b.hours - a.hours || personName(a.person).localeCompare(personName(b.person)));
}

export type LeaveInSpan = { row: LeaveRequest; person: Person | undefined; label: string; workingDays: number };

/** Approved leave that touches the span, earliest first, with the working days it takes inside the span. */
export function approvedLeaveInSpan(state: AppState, from: string, to: string): LeaveInSpan[] {
  const holidays = new Set(activeHolidays(state).map((row) => row.date));
  return state.leaveRequests
    .filter((row) => leaveIsApproved(row) && row.startDate <= to && (row.endDate || row.startDate) >= from)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((row) => ({
      row,
      person: state.people.find((item) => item.id === row.personId),
      label: leaveKindLabel(state, row),
      workingDays: leaveDates(row).filter((day) => day >= from && day <= to && !isWeekendIso(day) && !holidays.has(day)).length,
    }));
}

export type GapPerson = { person: Person | undefined; personId: string; days: string[] };

/**
 * Last week's working days (Monday to Friday, not a public holiday) on which a Person staffed that day logged no
 * hours and had no approved cuti or sick leave. Remote leave is still a working day.
 */
export function missingHoursLastWeek(state: AppState, today: string = jakartaTodayIso()): GapPerson[] {
  const monday = addDaysIso(mondayOfWeek(today), -7);
  const holidays = new Set(activeHolidays(state).map((row) => row.date));
  const days = Array.from({ length: 5 }, (_, index) => addDaysIso(monday, index)).filter((day) => !holidays.has(day));
  const people = [...new Set(state.staffings.map((row) => row.personId))];
  return people
    .map((personId) => {
      const logged = new Set(countedTimeBlocksForPerson(state, personId).map((block) => block.startAt.slice(0, 10)));
      const away = new Set(
        state.leaveRequests
          .filter((row) => row.personId === personId && leaveBlocksWork(row) && row.spanMode === "days")
          .flatMap((row) => leaveDates(row)),
      );
      const gaps = days.filter(
        (day) =>
          !logged.has(day) &&
          !away.has(day) &&
          state.staffings.some((row) => row.personId === personId && staffingCoversDate(row, day)),
      );
      return { personId, person: state.people.find((row) => row.id === personId), days: gaps };
    })
    .filter((row) => row.days.length > 0)
    .sort((a, b) => b.days.length - a.days.length || personName(a.person).localeCompare(personName(b.person)));
}

/** Projects running today whose end date falls within the next `withinDays` days, soonest first. */
export function projectsEndingSoon(state: AppState, today: string = jakartaTodayIso(), withinDays = 30): Project[] {
  const until = addDaysIso(today, withinDays);
  return state.projects
    .filter((row) => row.endDate && row.endDate >= today && row.endDate <= until && row.startDate <= today)
    .sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));
}
