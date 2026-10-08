"use client";

import { Button } from "@/components/coss/button";
import { currentAssignments } from "@/lib/domain";
import { plural } from "@/lib/labels";
import { needsYou, type NeedsYouItem } from "@/lib/needs-you";
import {
  homeProjectsForPerson,
  jakartaTodayIso,
  latestApprovedCheckInsForPerson,
  personMonthHours,
  personWeekHours,
  upcomingMeetingsForPerson,
  weekTargetHours,
} from "@/lib/work-delivery-query";
import type { AppState } from "@/lib/types";
import Link from "next/link";

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
  };
}

function timeRange(startAt: string, endAt: string): string {
  return `${startAt.slice(11, 16)}–${endAt.slice(11, 16)}`;
}

const HAT_LABEL: Record<NeedsYouItem["hat"], string> = {
  self: "My KPI",
  "line-manager": "As Line Manager",
  admin: "As Admin",
  hr: "As HR",
};

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-paper p-5 shadow-[var(--shadow)] sm:p-6" aria-label={title}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="m-0 text-[22px] font-medium leading-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function NeedsYouList({ items }: { items: NeedsYouItem[] }) {
  if (items.length === 0) {
    return (
      <p className="m-0 flex items-center gap-3 text-muted">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-tint text-accent" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 18 18">
            <path d="M4 9.2 7.2 12.5 14 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        You’re all caught up. Nothing is waiting on you.
      </p>
    );
  }
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item.id} className="border-t border-line first:border-t-0">
          <Link
            href={item.href}
            className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-3.5 text-ink no-underline transition-colors hover:bg-tint"
          >
            <span
              className={
                item.tone === "act"
                  ? "w-12 shrink-0 text-right text-[22px] font-medium leading-none tabular-nums text-accent"
                  : "flex w-12 shrink-0 justify-end"
              }
              aria-hidden
            >
              {item.tone === "act" ? item.count : <span className="size-2.5 rounded-full bg-warning" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-faint">{HAT_LABEL[item.hat]}</span>
              <span className="block font-medium">{item.title}</span>
            </span>
            <span className="shrink-0 text-sm font-medium text-accent max-sm:sr-only group-hover:underline">
              {item.action}
              <span aria-hidden> →</span>
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
  onRespondInvite?: (inviteId: string, status: "accepted" | "declined") => void;
}) {
  const today = jakartaTodayIso();
  const me = state.currentPersonId;
  const person = state.people.find((row) => row.id === me);
  const firstName = (person?.preferredName || person?.legalName || "").trim().split(/\s+/)[0] ?? "";
  const positions = currentAssignments(state, me)
    .map((row) => state.positions.find((position) => position.id === row.positionId)?.title)
    .filter(Boolean)
    .join(" · ");
  const items = needsYou(state, today);
  const actCount = items.filter((row) => row.tone === "act").length;

  const weekHours = Math.round(personWeekHours(state, me, today) * 10) / 10;
  const monthHours = Math.round(personMonthHours(state, me, today) * 10) / 10;
  const target = weekTargetHours();
  const weekShare = Math.min(weekHours / target, 1);
  const meetings = upcomingMeetingsForPerson(state, me, today);
  const projects = homeProjectsForPerson(state, me, today);
  const checkIns = latestApprovedCheckInsForPerson(state, me).slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h1 className="m-0 text-[30px] font-medium leading-[1.2] tracking-[-0.02em]">
          {greeting(new Date())}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 mb-0 text-muted">
          {longDate(today)}
          {positions ? ` · ${positions}` : ""}
        </p>
      </header>

      <Section
        title="Needs you"
        aside={actCount > 0 ? <p className="m-0 text-sm text-muted">{plural(actCount, "thing")} to do</p> : null}
      >
        <NeedsYouList items={items} />
      </Section>

      <Section
        title="This week"
        aside={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" render={<Link href="/timesheet" />}>
              Log time
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/leave/file" />}>
              Request leave
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div>
            <p className="m-0 text-sm text-muted">Hours logged</p>
            <p className="mt-1 mb-0 text-[30px] font-medium leading-none tabular-nums">
              {weekHours}
              <span className="text-base font-normal text-muted"> of {target}h</span>
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-tint"
              role="meter"
              aria-label="Hours logged this week"
              aria-valuemin={0}
              aria-valuemax={target}
              aria-valuenow={weekHours}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${weekShare * 100}%` }} />
            </div>
            <p className="mt-3 mb-0 text-sm text-muted">{monthHours}h this month, including weekends.</p>
          </div>
          <div className="min-w-0">
            <h3 className="m-0 text-sm font-medium text-muted">Coming up</h3>
            {meetings.length === 0 ? (
              <p className="mt-2 mb-0 text-sm text-muted">No meetings scheduled.</p>
            ) : (
              <ul className="m-0 mt-2 list-none p-0">
                {meetings.map(({ block, invite }) => {
                  const day = dayParts(block.startAt.slice(0, 10));
                  const project = block.projectId ? state.projects.find((row) => row.id === block.projectId) : undefined;
                  const pending = invite?.status === "pending";
                  return (
                    <li key={block.id} className="flex gap-3 border-t border-line py-3 first:border-t-0">
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-tint py-1.5" aria-hidden>
                        <span className="text-xs font-medium text-accent">{day.weekday}</span>
                        <span className="text-lg font-medium leading-tight">{day.day}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 font-medium">
                          {block.title || "Meeting"}
                          {pending ? <span className="ml-2 text-xs font-medium text-warning-foreground">Needs your reply</span> : null}
                        </p>
                        <p className="m-0 text-sm text-muted">
                          <span className="sr-only">{`${day.weekday} ${day.day}, `}</span>
                          {timeRange(block.startAt, block.endAt)}
                          {project ? ` · ${project.code}` : ""}
                        </p>
                        {pending && invite && onRespondInvite ? (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" type="button" onClick={() => onRespondInvite(invite.id, "accepted")}>
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" type="button" onClick={() => onRespondInvite(invite.id, "declined")}>
                              Decline
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {projects.length > 0 || checkIns.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.length > 0 ? (
            <Section title="Your projects">
              <ul className="m-0 list-none p-0">
                {projects.map(({ project, progress }) => (
                  <li key={project.id} className="border-t border-line py-3 first:border-t-0 first:pt-0">
                    <Link href={`/projects/${project.id}`} className="font-medium text-ink no-underline hover:underline">
                      {project.name}
                    </Link>
                    <p className="m-0 text-sm text-muted">
                      {project.code}
                      {progress === null ? " · No deliverables yet" : ` · ${Math.round(progress * 100)}% of deliverables accepted`}
                    </p>
                    {progress === null ? null : (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint" aria-hidden>
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {checkIns.length > 0 ? (
            <Section title="Latest KPI Check-Ins" aside={<Link href="/kpi" className="text-sm font-medium">My KPI</Link>}>
              <ul className="m-0 list-none p-0">
                {checkIns.map((row) => (
                  <li key={row.checkIn.id} className="flex items-baseline justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
                    <span className="min-w-0 text-sm">{row.item.name}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {row.actual}
                      <span className="font-normal text-muted"> of {row.target}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
