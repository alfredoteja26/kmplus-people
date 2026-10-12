import { navGroupsForRole } from "@/components/shell/nav";
import { hasAdminGrant } from "@/lib/domain-query";
import type { AppState, Invite, LeaveRequest, TimeBlock } from "@/lib/types";
import {
  addDaysIso,
  countedTimeBlocksForPerson,
  hoursBetween,
  jakartaTodayIso,
  mondayOfWeek,
  timeBlocksForPerson,
} from "@/lib/work-delivery-query";

export type AgendaEntry = {
  block: TimeBlock;
  /** "own" the Person's block; "accepted" or "pending" a meeting they were invited to. */
  kind: "own" | "accepted" | "pending";
  invite: Invite | null;
};

/** Everything on the Person's calendar for one date, in time order. Declined invites are gone already. */
export function agendaForDay(state: AppState, personId: string, day: string = jakartaTodayIso()): AgendaEntry[] {
  return timeBlocksForPerson(state, personId)
    .filter((block) => block.startAt.slice(0, 10) === day)
    .map((block) => {
      if (block.personId === personId) return { block, kind: "own" as const, invite: null };
      const invite = state.invites.find((row) => row.timeBlockId === block.id && row.personId === personId) ?? null;
      return { block, kind: invite?.status === "accepted" ? ("accepted" as const) : ("pending" as const), invite };
    })
    .sort((a, b) => a.block.startAt.localeCompare(b.block.startAt));
}

/**
 * Hours counted per day this week, Monday first. Seven days always; the caller hides the weekend when the
 * Person's grid does, but the week total still includes it.
 */
export function weekByDay(state: AppState, personId: string, today: string = jakartaTodayIso()) {
  const monday = mondayOfWeek(today);
  const counted = countedTimeBlocksForPerson(state, personId);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysIso(monday, index);
    const hours = counted
      .filter((block) => block.startAt.slice(0, 10) === date)
      .reduce((sum, block) => sum + Math.max(0, hoursBetween(block.startAt, block.endAt)), 0);
    return { date, hours, past: date < today, isToday: date === today };
  });
}

/** The Person's next leave that is approved or still waiting and has not ended. Declined leave is ignored. */
export function nextLeave(state: AppState, personId: string, today: string = jakartaTodayIso()): LeaveRequest | null {
  return (
    state.leaveRequests
      .filter((row) => row.personId === personId && row.decision !== "refused" && (row.endDate || row.startDate) >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null
  );
}

export type Shortcut = { href: string; label: string };

/**
 * A short row of the pages this viewer reaches for most, filtered by the same rule as the sidebar so Home
 * never offers a page the menu hides.
 */
export function homeShortcuts(state: AppState): Shortcut[] {
  const visible = new Set(navGroupsForRole(state.currentRole, hasAdminGrant(state)).flatMap((group) => group.items.map((item) => item.href)));
  const wanted: Shortcut[] = [
    { href: "/timesheet", label: "Log time" },
    { href: "/leave/file", label: "Request leave" },
    { href: "/kpi", label: "My KPI" },
    { href: "/kpi/team", label: "Team KPIs" },
    { href: "/leave/decide", label: "Leave requests" },
    { href: "/project-admin", label: "Project Admin" },
  ];
  return wanted.filter((row) => visible.has(row.href));
}
