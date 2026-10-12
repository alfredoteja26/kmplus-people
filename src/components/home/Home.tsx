"use client";

import { Button } from "@/components/coss/button";
import { Badge } from "@/components/product/Badge";
import { HealthBadge } from "@/components/product/StatusBadge";
import { CodeChip, EmptyBlock, ProgressMeter } from "@/components/work-delivery/project/parts";
import { currentAssignments, itemHealth } from "@/lib/domain";
import { agendaForDay, homeShortcuts, nextLeave, weekByDay } from "@/lib/home-view";
import { plural } from "@/lib/labels";
import { LEAVE_STATE_LABEL, leaveKindLabel, leaveState, leaveWhen } from "@/lib/leave-view";
import { plainLeaveError } from "@/components/leave/LeaveRequestSheet";
import { plainTimesheetError } from "@/components/work-delivery/timesheet/TimeEntrySheet";
import { needsYou, type NeedsYouItem } from "@/lib/needs-you";
import { acceptedCount } from "@/lib/project-view";
import { clockText, hoursText, jakartaNowMinutes, minutesOf } from "@/lib/timesheet-grid";
import type { AppState } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  homeProjectsForPerson,
  jakartaTodayIso,
  latestApprovedCheckInsForPerson,
  personMonthHours,
  upcomingMeetingsForPerson,
  weekTargetHours,
} from "@/lib/work-delivery-query";
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CheckIcon,
  ClockIcon,
  FolderKanbanIcon,
  GaugeIcon,
  InboxIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const JAKARTA = "Asia/Jakarta";

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: JAKARTA, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 11) return "Good morning";
  if (hour < 15) return "Good afternoon";
  return "Good evening";
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: JAKARTA, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${iso}T12:00:00+07:00`),
  );
}

function dayParts(iso: string) {
  const date = new Date(`${iso}T12:00:00+07:00`);
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { timeZone: JAKARTA, weekday: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-GB", { timeZone: JAKARTA, day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en-GB", { timeZone: JAKARTA, month: "short" }).format(date),
  };
}

const HAT_LABEL: Record<NeedsYouItem["hat"], string> = {
  self: "My KPI",
  "line-manager": "As Line Manager",
  admin: "As Admin",
  hr: "As HR",
};

const SHORTCUT_ICON: Record<string, LucideIcon> = {
  "/timesheet": ClockIcon,
  "/leave/file": CalendarPlusIcon,
  "/kpi": GaugeIcon,
  "/kpi/team": UsersIcon,
  "/leave/decide": InboxIcon,
  "/project-admin": FolderKanbanIcon,
};

function Panel({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("overflow-clip rounded-2xl bg-paper shadow-(--shadow)", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5">
        <h2 className="m-0 text-base font-medium">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function NeedsYouList({ items }: { items: NeedsYouItem[] }) {
  if (items.length === 0) {
    return (
      <p className="m-0 flex items-center gap-3 px-5 py-5 text-muted">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-tint text-accent" aria-hidden="true">
          <CheckIcon className="size-4" />
        </span>
        You&apos;re all caught up. Nothing is waiting on you.
      </p>
    );
  }
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item.id} className="border-t border-line first:border-t-0">
          <Link
            href={item.href}
            className="group flex items-center gap-4 px-5 py-3.5 text-ink no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] focus-visible:outline-offset-[-2px]"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-medium tabular-nums",
                item.tone === "act"
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,var(--paper))] text-accent-hover"
                  : "bg-[color-mix(in_srgb,var(--warning)_15%,var(--paper))] text-warning-foreground",
              )}
            >
              {item.tone === "act" ? item.count : <ClockIcon className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{item.title}</span>
              <span className="block text-sm text-muted">{HAT_LABEL[item.hat]}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent">
              <span className="max-sm:sr-only">{item.action}</span>
              <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Home({
  state,
  onRespondInvite,
}: {
  state: AppState;
  onRespondInvite?: (inviteId: string, status: "accepted" | "declined") => string | null;
}) {
  const today = jakartaTodayIso();
  const [replying, setReplying] = useState<string | null>(null);
  const [replyError, setReplyError] = useState("");
  const respond = onRespondInvite
    ? (inviteId: string, status: "accepted" | "declined") => {
        setReplying(inviteId);
        const message = onRespondInvite(inviteId, status);
        setReplying(null);
        setReplyError(message ? plainTimesheetError(plainLeaveError(message)) : "");
      }
    : undefined;
  const me = state.currentPersonId;
  const person = state.people.find((row) => row.id === me);
  const firstName = (person?.preferredName || person?.legalName || "").trim().split(/\s+/)[0] ?? "";
  const positions = currentAssignments(state, me)
    .map((row) => state.positions.find((position) => position.id === row.positionId)?.title)
    .filter(Boolean)
    .join(" · ");
  const items = needsYou(state, today);
  const actCount = items.filter((row) => row.tone === "act").length;
  const shortcuts = homeShortcuts(state);

  const [now, setNow] = useState(() => jakartaNowMinutes());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(jakartaNowMinutes()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const agenda = agendaForDay(state, me, today);
  const coming = upcomingMeetingsForPerson(state, me, today)
    .filter(({ block }) => block.startAt.slice(0, 10) > today)
    .slice(0, 4);

  const target = weekTargetHours();
  const showWeekend = person?.weekGrid === "full";
  const week = weekByDay(state, me, today);
  const weekTotal = week.reduce((sum, day) => sum + day.hours, 0);
  const weekendHours = week.slice(5).reduce((sum, day) => sum + day.hours, 0);
  const shownDays = showWeekend ? week : week.slice(0, 5);
  const barMax = Math.max(8, ...shownDays.map((day) => day.hours));
  const monthHours = personMonthHours(state, me, today);
  const leave = nextLeave(state, me, today);

  const projects = homeProjectsForPerson(state, me, today);
  const checkIns = latestApprovedCheckInsForPerson(state, me).slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium text-balance">
            {greeting(new Date())}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 mb-0 text-muted">
            {longDate(today)}
            {positions ? ` · ${positions}` : ""}
          </p>
          <p className="mt-2 mb-0">
            {actCount > 0
              ? `${plural(actCount, "thing")} need${actCount === 1 ? "s" : ""} you. Start with the first one.`
              : "Nothing needs you right now."}
          </p>
        </div>
        {shortcuts.length > 0 ? (
          <nav
            aria-label="Shortcuts"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          >
            {shortcuts.map((shortcut) => {
              const Icon = SHORTCUT_ICON[shortcut.href] ?? ArrowRightIcon;
              return (
                <Button key={shortcut.href} variant="outline" size="sm" className="h-9 shrink-0 sm:h-8" render={<Link href={shortcut.href} />}>
                  <Icon aria-hidden="true" />
                  {shortcut.label}
                </Button>
              );
            })}
          </nav>
        ) : null}
      </header>

      {/* One grid, three panels: phones read Needs you, Today, This week; wide screens put Today in its own column. */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Panel
            className="min-w-0 lg:col-start-1 lg:row-start-1"
            title="Needs you"
            aside={actCount > 0 ? <span className="text-sm text-muted tabular-nums">{plural(actCount, "thing")} to do</span> : null}
          >
            <NeedsYouList items={items} />
          </Panel>

          <Panel
            className="min-w-0 lg:col-start-1 lg:row-start-2"
            title="This week"
            aside={
              <Link href="/timesheet" className="text-sm font-medium text-accent no-underline hover:underline">
                Open Timesheet
              </Link>
            }
          >
            <div className="flex flex-col gap-5 px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="m-0 flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-h2 font-medium">{hoursText(weekTotal)}</span>
                  <span className="text-sm text-muted">of {target}h</span>
                </p>
                <div
                  role="meter"
                  aria-label="Hours logged this week"
                  aria-valuemin={0}
                  aria-valuemax={target}
                  aria-valuenow={Math.round(weekTotal * 10) / 10}
                  className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_var(--line)]"
                >
                  <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, (weekTotal / target) * 100)}%` }} />
                </div>
                <p className="m-0 text-sm text-muted">
                  {hoursText(monthHours)} this month
                  {!showWeekend && weekendHours > 0 ? ` · ${hoursText(weekendHours)} on the weekend` : ""}
                </p>
              </div>

              <ol className="m-0 grid list-none gap-2 p-0" style={{ gridTemplateColumns: `repeat(${shownDays.length}, minmax(0, 1fr))` }} aria-label="Hours by day">
                {shownDays.map((day) => {
                  const parts = dayParts(day.date);
                  const empty = day.past && day.hours === 0 && !isWeekendDay(day.date);
                  return (
                    <li key={day.date}>
                      <Link
                        href="/timesheet"
                        aria-label={`${parts.weekday} ${parts.day}: ${hoursText(day.hours)}${empty ? ", nothing logged" : ""}. Open Timesheet`}
                        className="group flex flex-col items-center gap-1.5 rounded-[10px] px-1 py-2 text-ink no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))]"
                      >
                        <span className="relative flex h-16 w-full max-w-10 items-end overflow-hidden rounded-[6px] bg-wash">
                          <span
                            className={cn("w-full rounded-[6px] transition-[height] duration-500 ease-out", day.isToday ? "bg-accent" : "bg-accent-2")}
                            style={{ height: `${(day.hours / barMax) * 100}%` }}
                          />
                          {empty ? <span className="absolute inset-x-1 bottom-1 h-0.5 rounded-full bg-warning" aria-hidden="true" /> : null}
                        </span>
                        <span className={cn("text-xs tabular-nums", empty ? "font-medium text-warning-foreground" : "text-ink")}>{hoursText(day.hours)}</span>
                        <span className={cn("text-xs", day.isToday ? "font-medium text-accent" : "text-muted")}>{parts.weekday}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>

              <Link
                href="/leave/file"
                className="flex items-center gap-3 rounded-[10px] bg-[color-mix(in_srgb,var(--wash)_60%,var(--paper))] px-3 py-2.5 text-sm text-ink no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))]"
              >
                <CalendarClockIcon aria-hidden="true" className="size-4 shrink-0 text-muted" />
                {leave ? (
                  <span className="min-w-0 flex-1">
                    <span className="text-muted">Next leave: </span>
                    <span className="font-medium">{leaveKindLabel(state, leave)}</span>
                    <span className="text-muted">
                      , {leaveWhen(leave)} · {LEAVE_STATE_LABEL[leaveState(leave)].toLowerCase()}
                    </span>
                  </span>
                ) : (
                  <span className="min-w-0 flex-1 text-muted">No leave planned. Request leave</span>
                )}
                <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 text-faint" />
              </Link>
            </div>
          </Panel>

        <Panel
          className="min-w-0 max-lg:row-start-2 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          title="Today"
          aside={<span className="text-sm text-muted tabular-nums">{agenda.length ? plural(agenda.length, "entry", "entries") : "Nothing yet"}</span>}
        >
          {replyError ? (
            <p role="alert" className="m-0 border-b border-line px-5 py-2.5 text-sm text-destructive-foreground">
              {replyError}
            </p>
          ) : null}
          <TodayAgenda state={state} agenda={agenda} now={now} replying={replying} onRespond={respond} />
          <div className="border-t border-line">
            <h3 className="m-0 px-5 pt-3.5 pb-1 text-sm font-medium text-muted">Coming up</h3>
            {coming.length === 0 ? (
              <p className="m-0 px-5 pt-1 pb-4 text-sm text-muted">No meetings after today.</p>
            ) : (
              <ul className="m-0 list-none px-0 pb-2">
                {coming.map(({ block, invite }) => {
                  const parts = dayParts(block.startAt.slice(0, 10));
                  const project = block.projectId ? state.projects.find((row) => row.id === block.projectId) : undefined;
                  const pending = invite?.status === "pending";
                  return (
                    <li key={block.id} className="px-3 py-1">
                      <div className={cn("flex gap-3 rounded-[10px] px-2 py-1.5", pending && "border border-dashed border-line-strong")}>
                      <span
                        className={cn("flex w-11 shrink-0 flex-col items-center self-start rounded-[10px] py-1", pending ? "border border-dashed border-line-strong bg-paper" : "bg-tint")}
                        aria-hidden="true"
                      >
                        <span className="text-xs font-medium text-accent">{parts.weekday}</span>
                        <span className="text-base leading-tight font-medium tabular-nums">{parts.day}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate font-medium">{block.title || "Meeting"}</p>
                        <p className="m-0 text-sm text-muted tabular-nums">
                          <span className="sr-only">{`${parts.weekday} ${parts.day} ${parts.month}, `}</span>
                          {clockText(minutesOf(block.startAt))}–{clockText(minutesOf(block.endAt))}
                          {project ? ` · ${project.code}` : ""}
                        </p>
                        {pending && invite && respond ? (
                          <InviteReply inviteId={invite.id} busy={replying === invite.id} onRespond={respond} />
                        ) : null}
                      </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <Panel
          title="Your projects"
          aside={
            <Link href="/projects" className="text-sm font-medium text-accent no-underline hover:underline">
              All projects
            </Link>
          }
        >
          {projects.length === 0 ? (
            <EmptyBlock
              className="py-6"
              icon={<FolderKanbanIcon aria-hidden="true" />}
              title="Not on a project today"
              description="Projects you're staffed on show here with their deliverable progress."
            />
          ) : (
            <ul className="m-0 list-none p-0">
              {projects.map(({ project }) => {
                const progress = acceptedCount(state, project.id);
                return (
                  <li key={project.id} className="border-t border-line first:border-t-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5 text-ink no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CodeChip code={project.code} className="shrink-0" />
                        <span className="truncate font-medium">{project.name}</span>
                      </span>
                      <ProgressMeter accepted={progress.accepted} total={progress.total} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Latest KPI Check-Ins"
          aside={
            <Link href="/kpi" className="text-sm font-medium text-accent no-underline hover:underline">
              My KPI
            </Link>
          }
        >
          {checkIns.length === 0 ? (
            <EmptyBlock
              className="py-6"
              icon={<GaugeIcon aria-hidden="true" />}
              title="No approved Check-Ins yet"
              description="Once your Line Manager approves a Check-In, its actual against target shows here."
            />
          ) : (
            <ul className="m-0 list-none p-0">
              {checkIns.map((row) => (
                <li key={row.checkIn.id} className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 first:border-t-0">
                  <span className="min-w-0 truncate text-sm">{row.item.name}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">
                      {row.actual}
                      <span className="font-normal text-muted"> of {row.target}</span>
                    </span>
                    <HealthBadge health={itemHealth(state, row.item)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function isWeekendDay(iso: string): boolean {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/** Today's entries in time order, with a now marker slotted between the entry before and the entry after it. */
function TodayAgenda({
  state,
  agenda,
  now,
  replying,
  onRespond,
}: {
  state: AppState;
  agenda: ReturnType<typeof agendaForDay>;
  now: number;
  replying: string | null;
  onRespond?: (inviteId: string, status: "accepted" | "declined") => void;
}) {
  if (agenda.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 px-5 py-5">
        <p className="m-0 text-sm text-muted">Nothing on your calendar today.</p>
        <Button variant="outline" size="sm" render={<Link href="/timesheet" />}>
          <ClockIcon aria-hidden="true" />
          Log time
        </Button>
      </div>
    );
  }
  const nowIndex = agenda.findIndex((entry) => minutesOf(entry.block.startAt) > now);
  const marker = (
    <li key="now" aria-label={`Now, ${clockText(now)}`} className="flex items-center gap-2 px-5 py-1">
      <span className="text-xs font-medium text-accent tabular-nums">{clockText(now)}</span>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-2" />
      <span aria-hidden="true" className="h-0.5 flex-1 bg-accent-2" />
    </li>
  );
  const rows = agenda.map((entry) => {
    const start = minutesOf(entry.block.startAt);
    const end = minutesOf(entry.block.endAt);
    const type = state.timeBlockTypes.find((row) => row.id === entry.block.typeId);
    const project = entry.block.projectId ? state.projects.find((row) => row.id === entry.block.projectId) : undefined;
    const happening = start <= now && now < end;
    const done = end <= now;
    const pending = entry.kind === "pending";
    return (
      <li key={entry.block.id} className="px-3 py-0.5">
        <div className={cn("flex gap-3 rounded-[10px] px-2 py-2", pending && "border border-dashed border-line-strong")}>
        <span className={cn("w-11 shrink-0 pt-0.5 text-right text-sm tabular-nums", done ? "text-faint" : "text-ink")}>{clockText(start)}</span>
        <span
          aria-hidden="true"
          className={cn(
            "mt-2 size-2 shrink-0 rounded-full",
            // Own time in sage, accepted meetings in teal, a pending invite hollow until answered.
            pending ? "border border-dashed border-line-strong bg-paper" : entry.kind === "own" ? "bg-accent" : "bg-accent-2",
            done && "opacity-50",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("m-0 truncate font-medium", done && "text-muted")}>
            {entry.block.title || type?.name || "Time entry"}
            {happening ? <span className="ml-2 text-xs font-medium text-accent">Now</span> : null}
          </p>
          <p className="m-0 text-sm text-muted tabular-nums">
            {clockText(start)}–{clockText(end)}
            {project ? ` · ${project.code}` : ""}
            {entry.kind !== "own" ? " · Meeting invite" : ""}
          </p>
          {pending && entry.invite && onRespond ? (
            <InviteReply inviteId={entry.invite.id} busy={replying === entry.invite.id} onRespond={onRespond} />
          ) : null}
        </div>
        </div>
      </li>
    );
  });
  const withMarker = nowIndex === -1 ? [...rows, marker] : [...rows.slice(0, nowIndex), marker, ...rows.slice(nowIndex)];
  return <ol className="m-0 list-none py-2 pl-0">{withMarker}</ol>;
}

/** "Needs your reply" as a status badge, then Accept and Decline, disabled while the answer is being saved. */
function InviteReply({
  inviteId,
  busy,
  onRespond,
}: {
  inviteId: string;
  busy: boolean;
  onRespond: (inviteId: string, status: "accepted" | "declined") => void;
}) {
  return (
    <div className="mt-1.5 flex flex-col items-start gap-2">
      <Badge tone="warning">Needs your reply</Badge>
      <div className="flex gap-2">
        <Button size="sm" type="button" disabled={busy} onClick={() => onRespond(inviteId, "accepted")}>
          Accept
        </Button>
        <Button size="sm" variant="outline" type="button" disabled={busy} onClick={() => onRespond(inviteId, "declined")}>
          Decline
        </Button>
      </div>
    </div>
  );
}
