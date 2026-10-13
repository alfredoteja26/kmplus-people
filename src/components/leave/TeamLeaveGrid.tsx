"use client";

import { formatDate } from "@/lib/labels";
import { KIND_LABEL, activeHolidays, isWeekendIso, leaveKindLabel, leaveWhen } from "@/lib/leave-view";
import { personName } from "@/lib/project-view";
import type { AppState, LeaveRequest } from "@/lib/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { AwayMark, CHIP_TONE } from "./LeaveMonth";

const WAITING_BORDER: Record<LeaveRequest["kind"], string> = {
  cuti: "border-[color-mix(in_srgb,var(--accent)_70%,transparent)] text-accent-hover",
  sick: "border-warning text-warning-foreground",
  remote: "border-line-strong text-muted",
};

const DAY_PX = 28;
const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];
const HOLIDAY_ORIGIN = { libur: "Libur Nasional", bersama: "Cuti Bersama", internal: "Cuti Bersama (Internal)" } as const;

/**
 * The devl.dev Holidays grid for one month: a public-holiday strip kept apart from each person's own leave,
 * one row per person who has leave that month, and a mark over any day when two or more people are away.
 * Approved leave is solid, waiting leave dashed, declined leave never drawn. Remote is drawn but never counts as away.
 */
export function TeamLeaveGrid({ state, dates, today }: { state: AppState; dates: string[]; today: string }) {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const holidays = activeHolidays(state).filter((row) => row.date >= first && row.date <= last);
  const holidayByDate = new Map(holidays.map((row) => [row.date, row]));
  const inMonth = state.leaveRequests.filter(
    (row) => row.decision !== "refused" && row.startDate <= last && (row.endDate || row.startDate) >= first,
  );
  const personIds = [...new Set(inMonth.map((row) => row.personId))];
  const people = personIds
    .map((id) => state.people.find((row) => row.id === id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => personName(a).localeCompare(personName(b)));

  const awayCount = (day: string) =>
    new Set(
      inMonth
        .filter((row) => row.kind !== "remote" && row.startDate <= day && (row.endDate || row.startDate) >= day)
        .map((row) => row.personId),
    ).size;

  const phone = useMediaQuery("max-sm");
  const columns = `${phone ? "6.5rem" : "11rem"} repeat(${dates.length}, ${DAY_PX}px)`;
  const scroller = useRef<HTMLDivElement>(null);
  // Open on today, or on the month's first leave when today is elsewhere, with two days of context before it.
  const focusDay = dates.includes(today) ? today : inMonth.map((row) => (row.startDate < first ? first : row.startDate)).sort()[0] ?? first;
  const focusIndex = dates.indexOf(focusDay);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = Math.max(0, (focusIndex - 2) * DAY_PX);
  }, [first, focusIndex]);
  const column = (day: string) => dates.indexOf(day) + 2;

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto overscroll-x-contain">
        <div role="table" aria-label="Who is out" className="grid min-w-max" style={{ gridTemplateColumns: columns }}>
          <div role="row" className="contents">
            <div role="columnheader" className="sticky left-0 z-10 border-b border-line bg-paper px-5 py-2 text-xs font-medium tracking-[0.06em] text-muted uppercase">
              Person
            </div>
            {dates.map((day) => {
              const away = awayCount(day);
              const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
              return (
                <div
                  key={day}
                  role="columnheader"
                  aria-label={`${formatDate(day)}${away >= 2 ? `, ${away} people away` : ""}`}
                  className={cn(
                    "relative flex flex-col items-center justify-end border-b border-line pt-6 pb-1.5 text-xs tabular-nums",
                    isWeekendIso(day) && "bg-[color-mix(in_srgb,var(--wash)_70%,var(--paper))] text-faint",
                    day === today && "text-accent",
                  )}
                >
                  {away >= 2 ? <AwayMark count={away} className="absolute top-0.5" /> : null}
                  <span className="text-micro leading-none text-faint">{WEEKDAY_LETTER[weekday]}</span>
                  <span className={cn("mt-0.5 leading-none", day === today && "rounded-full bg-accent px-1 py-0.5 font-medium text-on-accent")}>
                    {Number(day.slice(8, 10))}
                  </span>
                </div>
              );
            })}
          </div>

          <div role="row" className="contents">
            <div role="rowheader" className="sticky left-0 z-10 border-b border-line bg-paper px-5 py-2 text-sm text-muted">
              Public holidays
            </div>
            {dates.map((day) => {
              const holiday = holidayByDate.get(day);
              return (
                <div
                  key={day}
                  role="cell"
                  className={cn("flex items-center justify-center border-b border-line py-2", isWeekendIso(day) && "bg-[color-mix(in_srgb,var(--wash)_70%,var(--paper))]")}
                >
                  {holiday ? (
                    <span
                      title={`${holiday.name} · ${HOLIDAY_ORIGIN[holiday.origin]}`}
                      aria-label={`${formatDate(day)}: ${holiday.name}`}
                      className="block h-5 w-[22px] rounded-[4px] bg-tint shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-2)_35%,transparent)]"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {people.length === 0 ? (
            <div role="row" className="contents">
              <div role="cell" className="sticky left-0 z-10 col-span-full bg-paper px-5 py-6 text-sm text-muted">
                No one has leave this month.
              </div>
            </div>
          ) : (
            people.map((person) => {
              const rows = inMonth.filter((row) => row.personId === person.id);
              return (
                <div key={person.id} role="row" className="contents">
                  <div role="rowheader" className="sticky left-0 z-10 truncate border-b border-line bg-paper px-5 py-2.5 text-sm font-medium">
                    {personName(person)}
                  </div>
                  {/* One track per person: weekend shading underneath, each request drawn once across its days. */}
                  <div
                    className="relative grid border-b border-line"
                    style={{ gridColumn: `2 / span ${dates.length}`, gridTemplateColumns: `repeat(${dates.length}, ${DAY_PX}px)` }}
                  >
                    {dates.map((day, index) =>
                      isWeekendIso(day) ? (
                        <span key={day} aria-hidden="true" className="bg-[color-mix(in_srgb,var(--wash)_70%,var(--paper))]" style={{ gridColumn: index + 1, gridRow: 1 }} />
                      ) : null,
                    )}
                    {rows.map((row) => (
                      <LeaveBar key={row.id} state={state} row={row} first={first} last={last} column={column} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {holidays.length > 0 ? (
        <p className="m-0 border-t border-line px-5 py-2.5 text-xs text-muted">
          Holidays: {holidays.map((row) => `${formatDate(row.date)} ${row.name} (${HOLIDAY_ORIGIN[row.origin]})`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function LeaveBar({
  state,
  row,
  first,
  last,
  column,
}: {
  state: AppState;
  row: LeaveRequest;
  first: string;
  last: string;
  column: (day: string) => number;
}) {
  const start = row.startDate < first ? first : row.startDate;
  const endDay = row.endDate || row.startDate;
  const end = endDay > last ? last : endDay;
  const span = column(end) - column(start) + 1;
  const pending = row.decision === null;
  const partDay = row.spanMode === "hours";
  return (
    <span
      title={`${leaveKindLabel(state, row)} · ${leaveWhen(row)}${pending ? " · waiting for a decision" : ""}`}
      aria-label={`${personName(state.people.find((item) => item.id === row.personId))}: ${leaveKindLabel(state, row)}, ${leaveWhen(row)}${pending ? ", waiting" : ""}`}
      className={cn(
        "z-[1] mx-0.5 flex items-center self-center overflow-hidden rounded-[5px] px-1.5 text-xs leading-none font-medium whitespace-nowrap",
        partDay ? "h-3" : "h-6",
        pending ? cn("border border-dashed bg-paper", WAITING_BORDER[row.kind]) : CHIP_TONE[row.kind].solid,
      )}
      style={{ gridColumn: `${column(start) - 1} / span ${span}`, gridRow: 1 }}
    >
      {span >= 3 && !partDay ? (
        KIND_LABEL[row.kind]
      ) : (
        // Short and part-day bars carry a dot in the kind's hue instead of a word.
        <span aria-hidden="true" className={cn("mx-auto size-1.5 shrink-0 rounded-full", CHIP_TONE[row.kind].dot)} />
      )}
    </span>
  );
}
