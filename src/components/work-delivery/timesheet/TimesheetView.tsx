"use client";

import { Button } from "@/components/coss/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { formatDateRange, formatDay } from "@/lib/labels";
import { clockText, hoursText, jakartaNowMinutes, visibleHourRange, weekBreakdown, type WeekBreakdownRow } from "@/lib/timesheet-grid";
import type { AppState, TimeBlock, WeekGridMode } from "@/lib/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { addDaysIso, hoursBetween, jakartaTodayIso, mondayOfWeek, timeBlocksForPerson, weekTargetHours } from "@/lib/work-delivery-query";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { TimeEntrySheet, plainTimesheetError, type TimeEntryDraft, type UpsertTimeBlockInput } from "./TimeEntrySheet";
import { WeekGrid, type GridEntry } from "./WeekGrid";

const WEEKDAY_SHORT = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const DATE_NUMBER = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });

export function TimesheetView({
  state,
  personId,
  onSetWeekGrid,
  onUpsert,
  onDelete,
  onRespondInvite,
}: {
  state: AppState;
  personId: string;
  onSetWeekGrid: (mode: WeekGridMode) => string | null;
  onUpsert: (input: UpsertTimeBlockInput) => string | null;
  onDelete: (id: string) => string | null;
  onRespondInvite: (inviteId: string, status: "accepted" | "declined") => string | null;
}) {
  const today = jakartaTodayIso();
  const phone = useMediaQuery("max-md");
  const person = state.people.find((row) => row.id === personId);
  const weekGrid: WeekGridMode = person?.weekGrid ?? "weekdays";

  const [monday, setMonday] = useState(() => mondayOfWeek(today));
  const [pickedDay, setPickedDay] = useState(today);
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const [error, setError] = useState("");
  /** The last drag or keyboard adjustment, kept for one Undo. */
  const [moved, setMoved] = useState<{ block: TimeBlock; message: string } | null>(null);

  useEffect(() => {
    if (!moved) return;
    const timer = window.setTimeout(() => setMoved(null), 8000);
    return () => window.clearTimeout(timer);
  }, [moved]);

  const days = useMemo(
    () => Array.from({ length: weekGrid === "full" ? 7 : 5 }, (_, index) => addDaysIso(monday, index)),
    [monday, weekGrid],
  );
  const sunday = addDaysIso(monday, 6);
  const thisWeek = monday === mondayOfWeek(today);
  // The phone shows one day: the picked day while it is in this week's grid, else the first day shown.
  const phoneDay = days.includes(pickedDay) ? pickedDay : days.includes(today) ? today : days[0];

  const entries: GridEntry[] = useMemo(
    () =>
      timeBlocksForPerson(state, personId)
        .filter((block) => {
          const day = block.startAt.slice(0, 10);
          return day >= monday && day <= sunday;
        })
        .map((block) => {
          if (block.personId === personId) return { block, kind: "own" as const };
          const invite = state.invites.find((row) => row.timeBlockId === block.id && row.personId === personId);
          return { block, kind: invite?.status === "accepted" ? ("accepted" as const) : ("pending" as const) };
        }),
    [state, personId, monday, sunday],
  );

  const shownDays = phone ? [phoneDay] : days;
  const range = visibleHourRange(entries.filter((entry) => shownDays.includes(entry.block.startAt.slice(0, 10))).map((entry) => entry.block));
  const week = weekBreakdown(state, personId, monday);
  const target = weekTargetHours();
  const pendingInvites = entries.filter((entry) => entry.kind === "pending").length;

  function openNew(date: string, start: number, end: number) {
    setError("");
    setDraft({ mode: "new", date, start, end });
  }

  function openLogTime() {
    const date = phone ? phoneDay : days.includes(today) ? today : days[0];
    // Next whole hour today, 09:00 on any other day.
    const nextHour = date === today ? Math.min(22, Math.max(7, Math.ceil(jakartaNowMinutes() / 60))) * 60 : 9 * 60;
    openNew(date, nextHour, nextHour + 60);
  }

  // Re-saves the block with only its day and time changed. Invitees are passed back as they are, so a moved
  // meeting keeps its invites and their answers.
  const saveTimes = useCallback(
    (block: TimeBlock, startAt: string, endAt: string): string | null => {
      const type = state.timeBlockTypes.find((row) => row.id === block.typeId);
      return onUpsert({
        id: block.id,
        typeId: block.typeId,
        startAt,
        endAt,
        title: block.title,
        projectId: block.projectId,
        workItemId: block.workItemId,
        inviteePersonIds: type?.allowsInvites
          ? state.invites.filter((row) => row.timeBlockId === block.id).map((row) => row.personId)
          : undefined,
      });
    },
    [state.timeBlockTypes, state.invites, onUpsert],
  );

  const adjustBlock = useCallback(
    (block: TimeBlock, date: string, start: number, end: number) => {
      const resized = end - start !== hoursBetween(block.startAt, block.endAt) * 60;
      const message = saveTimes(block, `${date}T${clockText(start)}`, `${date}T${clockText(end)}`);
      if (message) {
        setMoved(null);
        setError(`Couldn't ${resized ? "change" : "move"} “${block.title || "this entry"}”. ${plainTimesheetError(message)}`);
        return;
      }
      setError("");
      setMoved({
        block,
        message: `${resized ? "Changed" : "Moved"} to ${formatDay(date)}, ${clockText(start)}–${clockText(end)}.`,
      });
    },
    [saveTimes],
  );

  function undoMove() {
    if (!moved) return;
    const message = saveTimes(moved.block, moved.block.startAt, moved.block.endAt);
    setMoved(null);
    setError(message ? plainTimesheetError(message) : "");
  }

  function openBlock(block: TimeBlock) {
    setError("");
    setDraft({ mode: "edit", block });
  }

  function moveWeek(weeks: number) {
    const next = addDaysIso(monday, weeks * 7);
    setMonday(next);
    setPickedDay(next);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="m-0 font-heading text-h1 font-medium">Timesheet</h1>
          <p className="mt-1 mb-0 text-muted tabular-nums" aria-live="polite">
            {formatDateRange(monday, sunday)}
            {thisWeek ? " · this week" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Week">
            <Button type="button" variant="outline" size="icon" aria-label="Previous week" onClick={() => moveWeek(-1)}>
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 sm:h-8"
              disabled={thisWeek}
              onClick={() => {
                setMonday(mondayOfWeek(today));
                setPickedDay(today);
              }}
            >
              Today
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Next week" onClick={() => moveWeek(1)}>
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
          <ToggleGroup
            variant="outline"
            aria-label="Days shown"
            value={[weekGrid]}
            onValueChange={(value) => {
              const next = value[0] as WeekGridMode | undefined;
              if (next && next !== weekGrid) setError(plainTimesheetError(onSetWeekGrid(next)));
            }}
          >
            <ToggleGroupItem value="weekdays">Mon–Fri</ToggleGroupItem>
            <ToggleGroupItem value="full">Full week</ToggleGroupItem>
          </ToggleGroup>
          <Button type="button" onClick={openLogTime} className="max-sm:w-full sm:h-8 sm:min-h-8 sm:px-3 sm:text-sm">
            <PlusIcon aria-hidden="true" />
            Log time
          </Button>
        </div>
      </header>

      <div className={cn("flex flex-col gap-3", phone && "sticky top-[-1.5rem] z-30 -mx-4 bg-bg sm:top-[-2rem] px-4 pt-2 pb-3 sm:-mx-6 sm:px-6 shadow-[0_1px_0_var(--line)]")}>
      <WeekMeter
        total={week.total}
        target={target}
        weekend={weekGrid === "weekdays" ? week.weekend : 0}
        pendingInvites={pendingInvites}
        empty={entries.length === 0}
        phone={phone}
        undo={
          <p role="status" className={cn("m-0 flex items-center gap-1 text-sm sm:ml-auto", !moved && "sr-only")}>
            {moved ? (
              <>
                <span className="tabular-nums">{moved.message}</span>
                <Button type="button" variant="ghost" size="sm" className="-my-1 h-7 text-accent" onClick={undoMove}>
                  Undo
                </Button>
              </>
            ) : null}
          </p>
        }
      />

      {error ? (
        <p role="alert" className="m-0 text-sm text-destructive-foreground">
          {error}
        </p>
      ) : null}

      {phone ? (
        <DayStrip
          days={days}
          selected={phoneDay}
          today={today}
          hoursFor={(day) =>
            entries
              .filter((entry) => entry.kind !== "pending" && entry.block.startAt.slice(0, 10) === day)
              .reduce((sum, entry) => sum + Math.max(0, hoursBetween(entry.block.startAt, entry.block.endAt)), 0)
          }
          onSelect={setPickedDay}
        />
      ) : null}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <WeekGrid
          state={state}
          personId={personId}
          days={shownDays}
          entries={entries}
          range={range}
          today={today}
          weekTotal={week.total}
          weekTarget={target}
          onDraft={openNew}
          onOpen={openBlock}
          onAdjust={adjustBlock}
        />
        <WeekSummary total={week.total} byProject={week.byProject} byType={week.byType} />
      </div>

      {draft ? (
        <TimeEntrySheet
          key={draft.mode === "edit" ? draft.block.id : `${draft.date}-${draft.start}-${draft.end}`}
          state={state}
          personId={personId}
          draft={draft}
          onClose={() => setDraft(null)}
          onUpsert={onUpsert}
          onDelete={onDelete}
          onRespondInvite={onRespondInvite}
        />
      ) : null}
    </div>
  );
}

function WeekMeter({
  total,
  target,
  weekend,
  pendingInvites,
  empty,
  phone,
  undo,
}: {
  total: number;
  target: number;
  weekend: number;
  pendingInvites: number;
  empty: boolean;
  phone: boolean;
  /** The Undo line after a move; it sits at the end of this row so the grid never shifts. */
  undo: ReactNode;
}) {
  const percent = Math.min(100, (total / target) * 100);
  const remaining = target - total;
  const status =
    remaining > 0.05 ? `${hoursText(remaining)} to go` : remaining < -0.05 ? `${hoursText(-remaining)} over ${target}h` : "Week complete";
  const notes = [
    weekend > 0 ? `includes ${hoursText(weekend)} on the weekend` : "",
    pendingInvites > 0 ? `${pendingInvites} meeting ${pendingInvites === 1 ? "invite" : "invites"} to answer` : "",
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="m-0 flex items-baseline gap-1.5 tabular-nums">
        <span className="text-h2 font-medium">{hoursText(total)}</span>
        <span className="text-sm text-muted">of {target}h</span>
      </p>
      <div
        role="meter"
        aria-label="Hours this week"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.round(total * 10) / 10}
        className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_var(--line)] sm:max-w-80"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", remaining < -0.05 ? "bg-warning" : "bg-accent")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="m-0 text-sm text-muted">
        {status}
        {notes.length ? ` · ${notes.join(" · ")}` : ""}
        {empty ? ` · ${phone ? "Tap an hour" : "Drag across a day"} to log time` : ""}
        {" · Jakarta time (WIB)"}
      </p>
      {undo}
    </div>
  );
}

function DayStrip({
  days,
  selected,
  today,
  hoursFor,
  onSelect,
}: {
  days: string[];
  selected: string;
  today: string;
  hoursFor: (day: string) => number;
  onSelect: (day: string) => void;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} role="group" aria-label="Day">
      {days.map((day) => {
        const hours = hoursFor(day);
        const active = day === selected;
        const date = new Date(`${day}T00:00:00Z`);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={active}
            aria-label={`${formatDay(day)}, ${hoursText(hours)} logged`}
            onClick={() => onSelect(day)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 transition-colors duration-150",
              active ? "bg-accent text-on-accent" : "bg-paper text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-tint",
            )}
          >
            <span className={cn("text-micro font-medium tracking-[0.06em] uppercase", active ? "text-on-accent/85" : day === today ? "text-accent" : "text-muted")}>
              {WEEKDAY_SHORT.format(date)}
            </span>
            <span
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-full text-base font-medium tabular-nums",
                day === today && !active && "shadow-[inset_0_0_0_1.5px_var(--accent)] text-accent",
              )}
            >
              {DATE_NUMBER.format(date)}
            </span>
            <span className={cn("text-micro tabular-nums", active ? "text-on-accent/85" : hours > 0 ? "text-ink" : "text-faint")}>
              {hoursText(hours)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WeekSummary({ total, byProject, byType }: { total: number; byProject: WeekBreakdownRow[]; byType: WeekBreakdownRow[] }) {
  return (
    <aside aria-labelledby="week-summary-heading" className="rounded-2xl bg-paper p-5 shadow-(--shadow) max-xl:grid max-xl:gap-6 sm:max-xl:grid-cols-2">
      <h2 id="week-summary-heading" className="m-0 text-base font-medium sm:max-xl:col-span-2">
        This week
      </h2>
      {total === 0 ? (
        <p className="mt-2 mb-0 text-sm text-muted sm:max-xl:col-span-2">Nothing logged yet. Hours by project and by type show here as you log.</p>
      ) : (
        <>
          <BreakdownList title="By project" rows={byProject} total={total} />
          <BreakdownList title="By type" rows={byType} total={total} />
        </>
      )}
    </aside>
  );
}

function BreakdownList({ title, rows, total }: { title: string; rows: WeekBreakdownRow[]; total: number }) {
  return (
    <section className="mt-4 first-of-type:mt-3 max-xl:mt-0">
      <h3 className="m-0 mb-2 text-xs font-medium tracking-[0.06em] text-muted uppercase">{title}</h3>
      <ul className="m-0 grid list-none gap-2.5 p-0">
        {rows.map((row) => (
          <li key={row.key} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate" title={row.detail ? `${row.label} · ${row.detail}` : row.label}>
                <span className={cn("font-medium", row.key === "none" && "font-normal text-muted")}>{row.label}</span>
                {row.detail ? <span className="text-muted"> · {row.detail}</span> : null}
              </span>
              <span className="shrink-0 tabular-nums">{hoursText(row.hours)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-wash" aria-hidden="true">
              <div
                className={cn("h-full rounded-full", row.key === "none" ? "bg-line-strong" : "bg-accent-2")}
                style={{ width: `${Math.max(4, (row.hours / total) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
