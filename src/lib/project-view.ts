import { currentAssignment, positionById } from "@/lib/domain";
import { formatDate } from "@/lib/labels";
import type { AppState, DeliverableStatus, Person, Project, Staffing } from "@/lib/types";
import { hoursBetween, jakartaTodayIso, personLoadSum, staffingCoversDate } from "@/lib/work-delivery-query";

export function personName(person: Person | undefined): string {
  return person?.preferredName || person?.legalName || "Unknown person";
}

/** "Alfredo Teja" → "AT"; one name → its first two letters. */
export function initialsOf(person: Person | undefined): string {
  const name = (person?.legalName || person?.preferredName || "?").trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function clientLabel(project: Project): string {
  return project.clientName?.trim() ? project.clientName : "Internal";
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

function inDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

/**
 * Where the project sits against today, read from its dates. This is not a stored status
 * (Projects have none); it only phrases the calendar: "Starts in 3 weeks", "Ends in 5 days", "Ended 2 Sep 2026".
 */
export function timingPhrase(project: Project, today: string = jakartaTodayIso()): string {
  if (project.startDate > today) return `Starts ${inDays(daysBetween(today, project.startDate))}`;
  if (!project.endDate) return "No end date";
  if (project.endDate < today) return `Ended ${formatDate(project.endDate)}`;
  return `Ends ${inDays(daysBetween(today, project.endDate))}`;
}

export type TeamMember = {
  personId: string;
  person: Person | undefined;
  position: string | null;
  /** Rows on this project for this Person, newest start first. */
  staffings: Staffing[];
  /** The row covering today, else the next upcoming one, else the latest. */
  focus: Staffing;
  when: "current" | "upcoming" | "ended";
  /** Load across every project today, for the overload mark. */
  totalLoad: number;
  hours: number;
};

/** Everyone ever staffed on the project, grouped by Person: on it today, starting later, then finished. */
export function projectTeam(state: AppState, projectId: string, today: string = jakartaTodayIso()): TeamMember[] {
  const rows = state.staffings.filter((row) => row.projectId === projectId);
  const byPerson = new Map<string, Staffing[]>();
  for (const row of rows) byPerson.set(row.personId, [...(byPerson.get(row.personId) ?? []), row]);
  const hours = projectHours(state, projectId);

  const order = { current: 0, upcoming: 1, ended: 2 } as const;
  return [...byPerson.entries()]
    .map(([personId, staffings]) => {
      const sorted = [...staffings].sort((a, b) => b.startDate.localeCompare(a.startDate));
      const current = sorted.find((row) => staffingCoversDate(row, today));
      const upcoming = [...sorted].reverse().find((row) => row.startDate > today);
      const focus = current ?? upcoming ?? sorted[0];
      const assignment = currentAssignment(state, personId);
      return {
        personId,
        person: state.people.find((row) => row.id === personId),
        position: assignment ? (positionById(state, assignment.positionId)?.title ?? null) : null,
        staffings: sorted,
        focus,
        when: current ? ("current" as const) : upcoming ? ("upcoming" as const) : ("ended" as const),
        totalLoad: personLoadSum(state, personId, today),
        hours: hours.byPerson.get(personId) ?? 0,
      };
    })
    .sort((a, b) => order[a.when] - order[b.when] || b.focus.load - a.focus.load || personName(a.person).localeCompare(personName(b.person)));
}

/**
 * Hours logged on the project, the way timesheets count them: each creator's own block,
 * plus the same block once more for every invitee who accepted it.
 */
export function projectHours(state: AppState, projectId: string): { total: number; byPerson: Map<string, number> } {
  const byPerson = new Map<string, number>();
  let total = 0;
  for (const block of state.timeBlocks) {
    if (block.projectId !== projectId) continue;
    const hours = Math.max(0, hoursBetween(block.startAt, block.endAt));
    const people = [
      block.personId,
      ...state.invites.filter((row) => row.timeBlockId === block.id && row.status === "accepted").map((row) => row.personId),
    ];
    for (const personId of people) {
      byPerson.set(personId, (byPerson.get(personId) ?? 0) + hours);
      total += hours;
    }
  }
  return { total, byPerson };
}

/** Badge tone for a configurable Deliverable status: the Accepted label reads done, the default reads draft. */
export function statusTone(status: DeliverableStatus | undefined): "success" | "neutral" | "accent" {
  if (!status) return "neutral";
  if (status.countsAsAccepted) return "success";
  if (status.isDefault) return "neutral";
  return "accent";
}

export function acceptedCount(state: AppState, projectId: string): { accepted: number; total: number } {
  const acceptedIds = new Set(state.deliverableStatuses.filter((row) => row.countsAsAccepted).map((row) => row.id));
  const rows = state.deliverables.filter((row) => row.projectId === projectId);
  return { accepted: rows.filter((row) => acceptedIds.has(row.statusId)).length, total: rows.length };
}
