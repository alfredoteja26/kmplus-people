import type { AppState, LeaveRequest, TimeBlock } from "@/lib/types";
import { addDaysIso, countedTimeBlocksForPerson, hoursBetween, leaveIsApproved } from "@/lib/work-delivery-query";

/** A TimeBlock may not be shorter than this. Drafts on the grid never go below it. */
export const MIN_BLOCK_MINUTES = 60;
export const SNAP_MINUTES = 15;
const DAY_MINUTES = 24 * 60;
const DEFAULT_FIRST_HOUR = 7;
const DEFAULT_LAST_HOUR = 19;

/** "2026-10-12T09:30" → 570. */
export function minutesOf(stamp: string): number {
  const hours = Number(stamp.slice(11, 13));
  const minutes = Number(stamp.slice(14, 16));
  return hours * 60 + minutes;
}

/** 570 → "09:30". 1440 → "24:00" is never produced: the end of day clamps to 23:59. */
export function clockText(minutes: number): string {
  const clamped = Math.max(0, Math.min(DAY_MINUTES - 1, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** 150 → "2h 30m", 60 → "1h", 45 → "45m". */
export function durationText(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

/** Hours as the timesheet prints them: 18.5 → "18.5h", 18 → "18h". */
export function hoursText(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`;
}

export function snapMinutes(minutes: number, step: number = SNAP_MINUTES): number {
  return Math.max(0, Math.min(DAY_MINUTES, Math.round(minutes / step) * step));
}

/**
 * The span a drag draws between where the pointer went down and where it is now.
 * Either direction works. A span under one hour grows to one hour, downward unless that would pass midnight.
 */
export function draftSpan(anchor: number, current: number): { start: number; end: number } {
  let start = snapMinutes(Math.min(anchor, current));
  let end = snapMinutes(Math.max(anchor, current));
  if (end - start < MIN_BLOCK_MINUTES) {
    end = start + MIN_BLOCK_MINUTES;
    if (end > DAY_MINUTES - 1) {
      end = DAY_MINUTES - SNAP_MINUTES;
      start = end - MIN_BLOCK_MINUTES;
    }
  }
  return { start, end: Math.min(end, DAY_MINUTES - SNAP_MINUTES) };
}

/** Latest end the grid can draft or adjust to; "24:00" is not a wall-clock time the store accepts. */
const LAST_END = DAY_MINUTES - SNAP_MINUTES;

export type AdjustMode = "move" | "start" | "end";

/**
 * Where an existing block lands when it is dragged by `delta` minutes.
 * Move keeps the duration; a resize keeps the other edge. Every result snaps to 15 minutes and stays at least one hour.
 */
export function adjustSpan(mode: AdjustMode, start: number, end: number, delta: number): { start: number; end: number } {
  if (mode === "move") {
    const duration = end - start;
    const next = Math.max(0, Math.min(LAST_END - duration, snapMinutes(start + delta)));
    return { start: next, end: next + duration };
  }
  if (mode === "end") {
    return { start, end: Math.max(start + MIN_BLOCK_MINUTES, Math.min(LAST_END, snapMinutes(end + delta))) };
  }
  return { start: Math.max(0, Math.min(end - MIN_BLOCK_MINUTES, snapMinutes(start + delta))), end };
}

/** Hours the grid draws: 07:00–19:00, widened to the whole hour around any block that falls outside. */
export function visibleHourRange(blocks: Pick<TimeBlock, "startAt" | "endAt">[]): { first: number; last: number } {
  let first = DEFAULT_FIRST_HOUR;
  let last = DEFAULT_LAST_HOUR;
  for (const block of blocks) {
    first = Math.min(first, Math.floor(minutesOf(block.startAt) / 60));
    last = Math.max(last, Math.ceil(minutesOf(block.endAt) / 60));
  }
  return { first: Math.max(0, first), last: Math.min(24, last) };
}

/**
 * Side-by-side lanes for spans that overlap on one day. Spans that touch end-to-start share a lane.
 * Each span learns its lane and how many lanes its overlapping cluster needs.
 */
export function layoutLanes(spans: { id: string; start: number; end: number }[]): Map<string, { lane: number; lanes: number }> {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const result = new Map<string, { lane: number; lanes: number }>();
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  function closeCluster() {
    for (const item of cluster) result.set(item.id, { lane: item.lane, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  }

  for (const span of sorted) {
    if (span.start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= span.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.end);
    } else {
      laneEnds[lane] = span.end;
    }
    cluster.push({ id: span.id, lane });
    clusterEnd = Math.max(clusterEnd, span.end);
  }
  closeCluster();
  return result;
}

export type WeekBreakdownRow = { key: string; label: string; detail?: string; hours: number };

/**
 * What a Person counted Monday through Sunday: the total, the weekend share, and hours per Project and per type.
 * Counts their own blocks plus invites they accepted, the same set the week total uses.
 */
export function weekBreakdown(state: AppState, personId: string, monday: string) {
  const sunday = addDaysIso(monday, 6);
  const saturday = addDaysIso(monday, 5);
  const counted = countedTimeBlocksForPerson(state, personId).filter((row) => {
    const day = row.startAt.slice(0, 10);
    return day >= monday && day <= sunday;
  });

  const byProject = new Map<string, WeekBreakdownRow>();
  const byType = new Map<string, WeekBreakdownRow>();
  let total = 0;
  let weekend = 0;

  for (const block of counted) {
    const hours = Math.max(0, hoursBetween(block.startAt, block.endAt));
    total += hours;
    if (block.startAt.slice(0, 10) >= saturday) weekend += hours;

    const project = block.projectId ? state.projects.find((row) => row.id === block.projectId) : undefined;
    const projectKey = project?.id ?? "none";
    const projectRow = byProject.get(projectKey) ?? {
      key: projectKey,
      label: project?.code ?? "No project",
      detail: project?.name,
      hours: 0,
    };
    projectRow.hours += hours;
    byProject.set(projectKey, projectRow);

    const type = state.timeBlockTypes.find((row) => row.id === block.typeId);
    const typeKey = type?.id ?? "unknown";
    const typeRow = byType.get(typeKey) ?? { key: typeKey, label: type?.name ?? "Other", hours: 0 };
    typeRow.hours += hours;
    byType.set(typeKey, typeRow);
  }

  const descending = (a: WeekBreakdownRow, b: WeekBreakdownRow) => b.hours - a.hours || a.label.localeCompare(b.label);
  return {
    total,
    weekend,
    byProject: [...byProject.values()].sort((a, b) => {
      // "No project" always closes the list.
      if (a.key === "none") return 1;
      if (b.key === "none") return -1;
      return descending(a, b);
    }),
    byType: [...byType.values()].sort(descending),
  };
}

export type LeaveOnDay = {
  id: string;
  kind: LeaveRequest["kind"];
  /** Null when the leave covers the whole day. */
  start: number | null;
  end: number | null;
};

/** Approved cuti, sick, or remote that touches this date for this Person. Pending and refused leave stay off the grid. */
export function approvedLeaveOnDay(state: AppState, personId: string, day: string): LeaveOnDay[] {
  return state.leaveRequests
    .filter((row) => row.personId === personId && leaveIsApproved(row) && row.startDate <= day && row.endDate >= day)
    .map((row) => {
      const hours = row.spanMode !== "days" && row.startTime && row.endTime;
      return {
        id: row.id,
        kind: row.kind,
        start: hours ? minutesOf(`${day}T${row.startTime}`) : null,
        end: hours ? minutesOf(`${day}T${row.endTime}`) : null,
      };
    });
}

/** Minutes past midnight on the Jakarta wall clock right now. */
export function jakartaNowMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
