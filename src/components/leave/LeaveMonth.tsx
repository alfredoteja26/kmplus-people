"use client";

import { Button } from "@/components/coss/button";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type MonthChip = {
  key: string;
  label: string;
  /** Hue by meaning: cuti sage, sick amber, remote neutral, holiday tint. */
  tone: "cuti" | "sick" | "remote" | "holiday";
  pending?: boolean;
  title?: string;
};

export const CHIP_TONE: Record<MonthChip["tone"], { solid: string; dot: string }> = {
  cuti: {
    solid: "bg-[color-mix(in_srgb,var(--accent)_20%,var(--paper))] text-accent-hover shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_30%,transparent)]",
    dot: "bg-accent",
  },
  sick: {
    solid: "bg-[color-mix(in_srgb,var(--warning)_22%,var(--paper))] text-warning-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warning)_35%,transparent)]",
    dot: "bg-warning",
  },
  remote: { solid: "bg-wash text-muted shadow-[inset_0_0_0_1px_var(--line-strong)]", dot: "bg-line-strong" },
  holiday: { solid: "bg-tint text-accent-hover shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-2)_30%,transparent)]", dot: "bg-accent-2" },
};

export function monthTitle(year: number, monthIndex: number): string {
  return MONTH.format(new Date(Date.UTC(year, monthIndex, 1)));
}

export function MonthPager({
  year,
  monthIndex,
  onMove,
  onToday,
  isCurrent,
  children,
}: {
  year: number;
  monthIndex: number;
  onMove: (delta: number) => void;
  onToday: () => void;
  isCurrent: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <h2 className="m-0 text-base font-medium" aria-live="polite">
        {monthTitle(year, monthIndex)}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <div className="flex items-center gap-1" role="group" aria-label="Month">
          <Button type="button" variant="outline" size="icon" aria-label="Previous month" onClick={() => onMove(-1)}>
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9 sm:h-8" disabled={isCurrent} onClick={onToday}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Next month" onClick={() => onMove(1)}>
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The devl.dev Month grid: weekday header, day number, up to three chips, then "+N more".
 * On a phone the chips shrink to dots so seven columns still fit.
 */
export function LeaveMonth({
  weeks,
  today,
  chipsFor,
  onPickDay,
}: {
  weeks: (string | null)[][];
  today: string;
  chipsFor: (day: string) => MonthChip[];
  onPickDay?: (day: string) => void;
}) {
  return (
    <div className="grid">
      <div aria-hidden="true" className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((label, index) => (
          <div
            key={label}
            className={cn("px-2 py-2 text-xs font-medium tracking-[0.06em] uppercase", index >= 5 ? "text-faint" : "text-muted")}
          >
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 border-b border-line last:border-b-0">
          {week.map((day, dayIndex) => {
            if (!day) return <div key={dayIndex} aria-hidden="true" className="min-h-14 border-l border-line bg-[color-mix(in_srgb,var(--wash)_60%,var(--paper))] first:border-l-0 sm:min-h-24" />;
            const chips = chipsFor(day);
            const shown = chips.slice(0, 3);
            const isToday = day === today;
            const weekend = dayIndex >= 5;
            const label = `${new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}${chips.length ? `: ${chips.map((chip) => chip.label + (chip.pending ? " (waiting)" : "")).join(", ")}` : ""}`;
            const content = (
              <>
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-sm tabular-nums",
                    isToday ? "bg-accent font-medium text-on-accent" : weekend ? "text-faint" : "text-ink",
                  )}
                >
                  {Number(day.slice(8, 10))}
                </span>
                <span className="mt-1 hidden min-w-0 flex-col gap-1 sm:flex">
                  {shown.map((chip) => (
                    <span
                      key={chip.key}
                      title={chip.title ?? chip.label}
                      className={cn(
                        "block truncate rounded-[4px] px-1.5 py-0.5 text-xs leading-tight",
                        chip.pending ? "border border-dashed border-line-strong bg-paper text-muted" : CHIP_TONE[chip.tone].solid,
                      )}
                    >
                      {chip.label}
                    </span>
                  ))}
                  {chips.length > 3 ? <span className="px-1.5 text-xs text-muted">+{chips.length - 3} more</span> : null}
                </span>
                {chips.length > 0 ? (
                  <span className="mt-1 flex gap-0.5 sm:hidden" aria-hidden="true">
                    {chips.slice(0, 4).map((chip) => (
                      <span
                        key={chip.key}
                        className={cn("size-1.5 rounded-full", chip.pending ? "border border-line-strong bg-paper" : CHIP_TONE[chip.tone].dot)}
                      />
                    ))}
                  </span>
                ) : null}
              </>
            );
            const cellClass = cn(
              "flex min-h-14 min-w-0 flex-col items-start border-l border-line p-1.5 text-left first:border-l-0 sm:min-h-24 sm:p-2",
              weekend && "bg-[color-mix(in_srgb,var(--wash)_45%,var(--paper))]",
            );
            return onPickDay ? (
              <button
                key={day}
                type="button"
                aria-label={label}
                aria-current={isToday ? "date" : undefined}
                onClick={() => onPickDay(day)}
                className={cn(cellClass, "transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_55%,var(--paper))] focus-visible:outline-offset-[-2px]")}
              >
                {content}
              </button>
            ) : (
              <div key={day} aria-label={label} className={cellClass}>
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** One key for every leave picture, shown on all widths so phone dots and grid bars still explain themselves. */
export function LeaveLegend({ awayMark = false, holiday = true }: { awayMark?: boolean; holiday?: boolean }) {
  const swatch = "h-2.5 w-4 shrink-0 rounded-[3px]";
  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line px-5 py-2.5 text-xs text-muted" aria-label="Legend">
      {(["cuti", "sick", "remote"] as const).map((kind) => (
        <li key={kind} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn(swatch, CHIP_TONE[kind].solid)} />
          {kind === "cuti" ? "Cuti" : kind === "sick" ? "Sick" : "Remote"}
        </li>
      ))}
      {holiday ? (
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn(swatch, CHIP_TONE.holiday.solid)} />
          Public holiday
        </li>
      ) : null}
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className={cn(swatch, "border border-dashed border-line-strong bg-paper")} />
        Waiting for a decision
      </li>
      {awayMark ? (
        <li className="flex items-center gap-1.5">
          <AwayMark count={2} />
          Two or more away
        </li>
      ) : null}
    </ul>
  );
}

/** Count of people away on a day. Dark amber text on an amber wash keeps 11px digits above 4.5:1. */
export function AwayMark({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4 min-w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--warning)_24%,var(--paper))] px-1 text-micro leading-none font-medium text-warning-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warning)_45%,transparent)]",
        className,
      )}
    >
      {count}
    </span>
  );
}
