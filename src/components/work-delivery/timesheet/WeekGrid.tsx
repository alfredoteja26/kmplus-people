"use client";

import { cn } from "@/lib/utils";
import { PlusIcon } from "lucide-react";
import {
  adjustSpan,
  approvedLeaveOnDay,
  clockText,
  draftSpan,
  durationText,
  hoursText,
  jakartaNowMinutes,
  layoutLanes,
  minutesOf,
  type AdjustMode,
} from "@/lib/timesheet-grid";
import type { AppState, PublicHoliday, TimeBlock } from "@/lib/types";
import { hoursBetween } from "@/lib/work-delivery-query";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

const HOUR_PX = 48;
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const DATE_NUMBER = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });

const HOLIDAY_ORIGIN: Record<PublicHoliday["origin"], string> = {
  libur: "Libur Nasional",
  bersama: "Cuti Bersama",
  internal: "Cuti Bersama (Internal)",
};

const LEAVE_LABEL = { cuti: "Cuti", sick: "Sick leave", remote: "Remote" } as const;

function isoDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function isWeekend(day: string): boolean {
  const weekday = isoDate(day).getUTCDay();
  return weekday === 0 || weekday === 6;
}

type Drag = { day: string; anchor: number; current: number };

/** An existing block being moved or resized with the pointer. `moved` stays false until the pointer travels, so a plain click still opens it. */
type Adjust = {
  block: TimeBlock;
  mode: AdjustMode;
  originX: number;
  originY: number;
  day: string;
  start: number;
  end: number;
  moved: boolean;
};

export type GridEntry = {
  block: TimeBlock;
  /** "own" is the Person's block; "accepted" and "pending" are meetings they were invited to. */
  kind: "own" | "accepted" | "pending";
};

export function WeekGrid({
  state,
  personId,
  days,
  entries,
  range,
  today,
  weekTotal,
  weekTarget,
  onDraft,
  onOpen,
  onAdjust,
}: {
  state: AppState;
  personId: string;
  days: string[];
  entries: GridEntry[];
  range: { first: number; last: number };
  today: string;
  /** Repeated in the sticky corner so the week total stays in view while the grid scrolls. */
  weekTotal: number;
  weekTarget: number;
  onDraft: (date: string, start: number, end: number) => void;
  onOpen: (block: TimeBlock) => void;
  /** Save a block at a new day and time. The caller reports a refusal and the block snaps back. */
  onAdjust: (block: TimeBlock, date: string, start: number, end: number) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<{ day: string; minute: number } | null>(null);
  const [now, setNow] = useState(() => jakartaNowMinutes());
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [adjust, setAdjust] = useState<Adjust | null>(null);
  const adjustRef = useRef<Adjust | null>(null);
  const suppressClick = useRef(false);
  const columnRefs = useRef(new Map<string, HTMLElement>());

  function updateAdjust(next: Adjust | null) {
    adjustRef.current = next;
    setAdjust(next);
  }

  // Window listeners, not pointer capture: a block moved to another day re-mounts in that day's column.
  const adjusting = adjust !== null;
  useEffect(() => {
    if (!adjusting) return;
    function move(event: PointerEvent) {
      const current = adjustRef.current;
      if (!current) return;
      const dx = event.clientX - current.originX;
      const dy = event.clientY - current.originY;
      if (!current.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      const delta = (dy / HOUR_PX) * 60;
      const span = adjustSpan(current.mode, minutesOf(current.block.startAt), minutesOf(current.block.endAt), delta);
      let day = current.day;
      if (current.mode === "move") {
        for (const [columnDay, element] of columnRefs.current) {
          const rect = element.getBoundingClientRect();
          if (event.clientX >= rect.left && event.clientX < rect.right) day = columnDay;
        }
      }
      updateAdjust({ ...current, day, start: span.start, end: span.end, moved: true });
    }
    function up() {
      const current = adjustRef.current;
      updateAdjust(null);
      if (!current?.moved) return;
      suppressClick.current = true;
      const unchanged =
        current.day === current.block.startAt.slice(0, 10) &&
        current.start === minutesOf(current.block.startAt) &&
        current.end === minutesOf(current.block.endAt);
      if (!unchanged) onAdjust(current.block, current.day, current.start, current.end);
    }
    function cancel(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (adjustRef.current?.moved) suppressClick.current = true;
      updateAdjust(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", cancel);
    };
  }, [adjusting, onAdjust]);

  // While a block is dragged, every count and lane on the grid reads its preview position.
  const shown: GridEntry[] = adjust?.moved
    ? entries.map((entry) =>
        entry.block.id === adjust.block.id
          ? {
              ...entry,
              block: { ...entry.block, startAt: `${adjust.day}T${clockText(adjust.start)}`, endAt: `${adjust.day}T${clockText(adjust.end)}` },
            }
          : entry,
      )
    : entries;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(jakartaNowMinutes()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!drag) return;
    function cancel(event: KeyboardEvent) {
      if (event.key === "Escape") setDrag(null);
    }
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [drag]);

  const hours = Array.from({ length: range.last - range.first }, (_, index) => range.first + index);
  const height = hours.length * HOUR_PX;
  const offset = range.first * 60;
  const holidays = state.publicHolidays.filter((row) => !row.suppressed);

  function minuteAt(event: ReactPointerEvent<HTMLElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    return offset + (y / HOUR_PX) * 60;
  }

  function fromBlock(event: ReactPointerEvent<HTMLElement>): boolean {
    return Boolean((event.target as HTMLElement).closest("[data-time-block]"));
  }

  function pointerDown(day: string, event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || fromBlock(event)) return;
    if (event.pointerType === "touch") {
      // Touch keeps the page scrolling; a tap (not a swipe) drafts the hour under the finger.
      touchStart.current = { x: event.clientX, y: event.clientY };
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const minute = minuteAt(event);
    setDrag({ day, anchor: minute, current: minute });
  }

  function pointerMove(day: string, event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const minute = minuteAt(event);
    if (drag) {
      if (drag.day === day) setDrag({ ...drag, current: minute });
      return;
    }
    if (adjustRef.current || fromBlock(event)) setHover(null);
    else setHover({ day, minute: Math.floor(minute / 60) * 60 });
  }

  function pointerUp(day: string, event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || fromBlock(event)) return;
      if (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8) return;
      const hour = Math.floor(minuteAt(event) / 60) * 60;
      onDraft(day, hour, hour + 60);
      return;
    }
    if (!drag || drag.day !== day) return;
    const span = draftSpan(drag.anchor, minuteAt(event));
    setDrag(null);
    setHover(null);
    onDraft(day, span.start, span.end);
  }

  const columns = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;
  // A single day (the phone view) already has its date in the day strip above; keep only holiday and leave labels.
  const singleDay = days.length === 1;
  const singleDayLabels =
    singleDay && (holidays.some((row) => row.date === days[0]) || approvedLeaveOnDay(state, personId, days[0]).length > 0);

  return (
    <div className="overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
      <div
        className={cn("sticky top-[-1.5rem] z-20 grid border-b border-line bg-paper sm:top-[-2rem]", singleDay && !singleDayLabels && "hidden")}
        style={{ gridTemplateColumns: columns }}
      >
        <div className="flex flex-col items-end justify-end px-2 pb-2 tabular-nums" aria-hidden="true">
          <span className="text-label font-medium text-ink">{hoursText(weekTotal)}</span>
          <span className="text-micro text-faint">of {weekTarget}h</span>
        </div>
        {days.map((day) => {
          const holiday = holidays.find((row) => row.date === day);
          const leave = approvedLeaveOnDay(state, personId, day);
          const dayHours = shown
            .filter((entry) => entry.kind !== "pending" && entry.block.startAt.slice(0, 10) === day)
            .reduce((sum, entry) => sum + Math.max(0, hoursBetween(entry.block.startAt, entry.block.endAt)), 0);
          const isToday = day === today;
          return (
            <div key={day} className="min-w-0 border-l border-line px-2 pt-3 pb-2 sm:px-3">
              <div className={cn("flex items-baseline justify-between gap-2", singleDay && "hidden")}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("text-xs font-medium tracking-[0.06em] uppercase", isToday ? "text-accent" : "text-muted")}>
                    {WEEKDAY.format(isoDate(day))}
                  </span>
                  <span
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-full text-base font-medium tabular-nums",
                      isToday ? "bg-accent text-on-accent" : "text-ink",
                    )}
                    aria-current={isToday ? "date" : undefined}
                  >
                    {DATE_NUMBER.format(isoDate(day))}
                  </span>
                </div>
                <span className={cn("text-xs tabular-nums", dayHours > 0 ? "text-ink" : "text-faint")}>
                  {dayHours > 0 ? hoursText(dayHours) : "0h"}
                </span>
              </div>
              <div className="mt-1 flex min-h-5 flex-wrap gap-1">
                {holiday ? (
                  <span className="flex max-w-full min-w-0 flex-col rounded-[4px] bg-tint px-1.5 py-0.5 text-micro leading-tight text-accent-hover" title={`${holiday.name} · ${HOLIDAY_ORIGIN[holiday.origin]}`}>
                    <span className="truncate font-medium">{holiday.name}</span>
                    <span className="truncate">{HOLIDAY_ORIGIN[holiday.origin]}</span>
                  </span>
                ) : null}
                {leave.map((row) => (
                  <span
                    key={row.id}
                    className={cn(
                      "rounded-[4px] px-1.5 py-0.5 text-micro leading-tight",
                      row.kind === "remote" ? "bg-wash text-muted" : "bg-[color-mix(in_srgb,var(--warning)_14%,var(--paper))] text-warning-foreground",
                    )}
                  >
                    {LEAVE_LABEL[row.kind]}
                    {row.start != null && row.end != null ? ` ${clockText(row.start)}–${clockText(row.end)}` : ""}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: columns }}>
        <div className="relative" style={{ height }} aria-hidden="true">
          {hours.map((hour, index) => (
            <span
              key={hour}
              className={cn(
                "absolute right-2 text-micro text-faint tabular-nums",
                index === 0 ? "top-1" : "-translate-y-1/2",
              )}
              style={index === 0 ? undefined : { top: index * HOUR_PX }}
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {days.map((day) => {
          const dayEntries = shown.filter((entry) => entry.block.startAt.slice(0, 10) === day);
          const lanes = layoutLanes(
            dayEntries.map((entry) => ({
              id: entry.block.id,
              start: minutesOf(entry.block.startAt),
              end: minutesOf(entry.block.endAt),
            })),
          );
          const holiday = holidays.some((row) => row.date === day);
          const blockingLeave = approvedLeaveOnDay(state, personId, day).filter((row) => row.kind !== "remote");
          const ghost = drag?.day === day ? draftSpan(drag.anchor, drag.current) : null;
          // Warn during the drag, not after Save, when the draft lands on an entry or approved cuti/sick.
          const ghostConflict = ghost
            ? dayEntries.some((entry) => minutesOf(entry.block.startAt) < ghost.end && ghost.start < minutesOf(entry.block.endAt)) ||
              blockingLeave.some((row) => (row.start ?? 0) < ghost.end && ghost.start < (row.end ?? 24 * 60))
            : false;
          const showNow = day === today && now >= offset && now <= range.last * 60;
          const columnStyle: CSSProperties = {
            height,
            backgroundImage: `linear-gradient(to bottom, var(--line) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--line) 45%, transparent) 1px, transparent 1px)`,
            backgroundSize: `100% ${HOUR_PX}px, 100% ${HOUR_PX}px`,
            backgroundPosition: `0 0, 0 ${HOUR_PX / 2}px`,
          };

          return (
            <section
              key={day}
              ref={(element) => {
                if (element) columnRefs.current.set(day, element);
                else columnRefs.current.delete(day);
              }}
              aria-label={`${WEEKDAY.format(isoDate(day))} ${DATE_NUMBER.format(isoDate(day))}`}
              className={cn(
                "relative min-w-0 cursor-crosshair touch-pan-y border-l border-line select-none",
                isWeekend(day) && "bg-[color-mix(in_srgb,var(--wash)_70%,var(--paper))]",
                holiday && "bg-[color-mix(in_srgb,var(--tint)_70%,var(--paper))]",
              )}
              style={columnStyle}
              onPointerDown={(event) => pointerDown(day, event)}
              onPointerMove={(event) => pointerMove(day, event)}
              onPointerUp={(event) => pointerUp(day, event)}
              onPointerLeave={() => setHover(null)}
              onPointerCancel={() => {
                setDrag(null);
                touchStart.current = null;
              }}
            >
              {blockingLeave.map((row) => {
                const start = row.start ?? offset;
                const end = row.end ?? range.last * 60;
                return (
                  <div
                    key={row.id}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0"
                    style={{
                      top: ((Math.max(start, offset) - offset) / 60) * HOUR_PX,
                      height: ((Math.min(end, range.last * 60) - Math.max(start, offset)) / 60) * HOUR_PX,
                      backgroundImage:
                        "repeating-linear-gradient(135deg, color-mix(in srgb, var(--warning) 16%, transparent) 0 6px, transparent 6px 12px)",
                    }}
                  />
                );
              })}

              {hover && !drag && hover.day === day ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-1 flex items-start rounded-[6px] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] px-2 pt-1 text-micro text-accent"
                  style={{ top: ((hover.minute - offset) / 60) * HOUR_PX + 1, height: HOUR_PX - 2 }}
                >
                  <PlusIcon aria-hidden="true" className="mt-px mr-0.5 size-3" />
                  {clockText(hover.minute)}
                </div>
              ) : null}

              {dayEntries.map((entry) => {
                const start = minutesOf(entry.block.startAt);
                const end = minutesOf(entry.block.endAt);
                const lane = lanes.get(entry.block.id) ?? { lane: 0, lanes: 1 };
                const width = 100 / lane.lanes;
                const top = ((start - offset) / 60) * HOUR_PX;
                const blockHeight = Math.max(24, ((end - start) / 60) * HOUR_PX - 2);
                const type = state.timeBlockTypes.find((row) => row.id === entry.block.typeId);
                const project = entry.block.projectId ? state.projects.find((row) => row.id === entry.block.projectId) : undefined;
                const label = entry.block.title || type?.name || "Time entry";
                const when = `${clockText(start)}–${clockText(end)}`;
                const pending = entry.kind === "pending";
                const own = entry.kind === "own";
                const lifted = adjust?.moved && adjust.block.id === entry.block.id;
                const liftedConflict =
                  lifted &&
                  (dayEntries.some(
                    (other) =>
                      other.block.id !== entry.block.id &&
                      minutesOf(other.block.startAt) < end &&
                      start < minutesOf(other.block.endAt),
                  ) ||
                    blockingLeave.some((row) => (row.start ?? 0) < end && start < (row.end ?? 24 * 60)));
                return (
                  <button
                    key={entry.block.id}
                    type="button"
                    data-time-block
                    onPointerDown={(event) => {
                      if (!own || event.button !== 0 || event.pointerType === "touch") return;
                      event.preventDefault();
                      const handle = (event.target as HTMLElement).closest<HTMLElement>("[data-handle]")?.dataset.handle;
                      updateAdjust({
                        block: entry.block,
                        mode: handle === "start" || handle === "end" ? handle : "move",
                        originX: event.clientX,
                        originY: event.clientY,
                        day,
                        start,
                        end,
                        moved: false,
                      });
                    }}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      onOpen(entry.block);
                    }}
                    onKeyDown={(event) => {
                      if (!own || !event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                      event.preventDefault();
                      const span = adjustSpan(event.shiftKey ? "end" : "move", start, end, event.key === "ArrowUp" ? -15 : 15);
                      if (span.start !== start || span.end !== end) onAdjust(entry.block, day, span.start, span.end);
                    }}
                    aria-keyshortcuts={own ? "Alt+ArrowUp Alt+ArrowDown Alt+Shift+ArrowUp Alt+Shift+ArrowDown" : undefined}
                    aria-label={`${label}, ${when}${project ? `, ${project.code}` : ""}${pending ? ", invite not answered" : ""}${own ? ". Alt and arrow keys move it; add Shift to change the end." : ""}`}
                    className={cn(
                      "group absolute flex flex-col items-start gap-0.5 overflow-hidden rounded-[8px] px-2 py-1.5 text-left transition-[box-shadow,background-color] duration-150 ease-out focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                      own ? "cursor-grab" : "cursor-pointer",
                      lifted && "z-20 cursor-grabbing shadow-[0_12px_28px_-12px_color-mix(in_srgb,var(--ink)_45%,transparent)]",
                      liftedConflict
                        ? "bg-[color-mix(in_srgb,var(--warning)_14%,var(--paper))] text-warning-foreground shadow-[inset_0_0_0_1px_var(--warning),0_12px_28px_-12px_color-mix(in_srgb,var(--ink)_45%,transparent)]"
                        : pending
                        ? "border border-dashed border-line-strong bg-paper text-muted hover:bg-wash"
                        : project
                          ? "bg-[color-mix(in_srgb,var(--accent)_11%,var(--paper))] text-accent-hover shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_26%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_16%,var(--paper))]"
                          : "bg-wash text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-[color-mix(in_srgb,var(--line)_55%,var(--paper))]",
                    )}
                    style={{
                      top: top + 1,
                      height: blockHeight,
                      left: `calc(${lane.lane * width}% + 3px)`,
                      width: `calc(${width}% - 6px)`,
                    }}
                  >
                    <span className="w-full truncate text-label leading-tight font-medium">{label}</span>
                    <span className="w-full truncate text-micro leading-tight tabular-nums opacity-80">
                      {when} · {durationText(end - start)}
                      {liftedConflict ? " · overlaps" : ""}
                    </span>
                    {blockHeight >= 64 ? (
                      <span className="w-full truncate text-micro leading-tight opacity-80">
                        {pending ? "Invite · not answered" : entry.kind === "accepted" ? "Meeting invite" : project ? project.code : type?.name}
                      </span>
                    ) : null}
                    {own ? (
                      <>
                        <span
                          data-handle="start"
                          aria-hidden="true"
                          className="absolute inset-x-0 top-0 h-2 cursor-ns-resize after:absolute after:top-0.5 after:left-1/2 after:h-[3px] after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-current after:opacity-0 after:transition-opacity group-hover:after:opacity-40"
                        />
                        <span
                          data-handle="end"
                          aria-hidden="true"
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize after:absolute after:bottom-0.5 after:left-1/2 after:h-[3px] after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-current after:opacity-0 after:transition-opacity group-hover:after:opacity-40"
                        />
                      </>
                    ) : null}
                  </button>
                );
              })}

              {ghost ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-x-1 z-10 flex origin-top flex-col rounded-[8px] border px-2 py-1.5 motion-safe:animate-[ghost-in_120ms_cubic-bezier(0.16,1,0.3,1)]",
                    ghostConflict
                      ? "border-warning bg-[color-mix(in_srgb,var(--warning)_12%,var(--paper))] text-warning-foreground shadow-[0_8px_20px_-12px_color-mix(in_srgb,var(--warning)_60%,transparent)]"
                      : "border-accent bg-[color-mix(in_srgb,var(--accent)_10%,var(--paper))] text-accent-hover shadow-[0_8px_20px_-12px_color-mix(in_srgb,var(--accent)_60%,transparent)]",
                  )}
                  style={{ top: ((ghost.start - offset) / 60) * HOUR_PX + 1, height: ((ghost.end - ghost.start) / 60) * HOUR_PX - 2 }}
                >
                  <span className="text-label leading-tight font-medium tabular-nums">
                    {clockText(ghost.start)}–{clockText(ghost.end)}
                  </span>
                  <span className="text-micro leading-tight tabular-nums">
                    {durationText(ghost.end - ghost.start)}
                    {ghostConflict ? " · overlaps" : ""}
                  </span>
                </div>
              ) : null}

              {showNow ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 z-[5] flex items-center"
                  style={{ top: ((now - offset) / 60) * HOUR_PX }}
                >
                  <span className="-ml-1 size-2 rounded-full bg-accent-2" />
                  <span className="h-[2px] flex-1 bg-accent-2" />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
