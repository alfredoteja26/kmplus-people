"use client";

import { Button } from "@/components/coss/button";
import { Fact, FactsStrip } from "@/components/kpi/my-kpi/my-kpi-facts";
import { MonthPager } from "@/components/leave/LeaveMonth";
import { HoursByProject, NeedsAttention, Panel, hoursText, type AttentionItem } from "@/components/project-admin/parts";
import { Reports, type ReportTab } from "@/components/project-admin/Reports";
import { ProjectAdminSubnav } from "@/components/work-delivery/ProjectAdminSubnav";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDay, plural } from "@/lib/labels";
import {
  adminFacts,
  approvedLeaveInSpan,
  hoursByProject,
  missingHoursLastWeek,
  monthSpan,
  projectsEndingSoon,
  staffedToday,
  timesheetByPerson,
} from "@/lib/project-admin-view";
import { personName } from "@/lib/project-view";
import { reportMonthLink } from "@/lib/report-settings";
import { jakartaTodayIso } from "@/lib/work-delivery-query";
import { useStore } from "@/lib/store";
import { FileOutputIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

/** "Rayhan, Eka and 2 more": names first, so the row says who before anyone opens it. */
function names(list: string[], max = 2): string {
  if (list.length <= max) return list.join(" and ");
  return `${list.slice(0, max).join(", ")} and ${list.length - max} more`;
}

function monthOf(iso: string) {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 };
}

export default function ProjectAdminPage() {
  const { state } = useStore();
  const today = jakartaTodayIso();
  const [tab, setTab] = useState<ReportTab>("projects");
  const [cursor, setCursor] = useState(() => monthOf(today));

  const admin = hasAdminGrant(state);
  const thisMonth = monthSpan(monthOf(today).year, monthOf(today).month);
  const span = monthSpan(cursor.year, cursor.month);

  const facts = useMemo(() => adminFacts(state, today), [state, today]);
  const byProject = useMemo(() => hoursByProject(state, thisMonth.from, thisMonth.to), [state, thisMonth.from, thisMonth.to]);
  const timesheet = useMemo(() => timesheetByPerson(state, span.from, span.to), [state, span.from, span.to]);
  const leave = useMemo(() => approvedLeaveInSpan(state, span.from, span.to), [state, span.from, span.to]);

  if (!admin) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <h1 className="m-0 font-heading text-h1 font-medium">Admin</h1>
        <p className="m-0 text-sm">
          Only an Admin can open the Admin area.{" "}
          <Link href="/projects" className="font-medium text-accent underline-offset-2 hover:underline">
            See your projects
          </Link>
          .
        </p>
      </div>
    );
  }

  function openReport(next: ReportTab, month?: { year: number; month: number }) {
    setTab(next);
    if (month) setCursor(month);
    requestAnimationFrame(() => document.getElementById("reports")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const overloaded = staffedToday(state, today).filter((row) => row.load > 100);
  const gaps = missingHoursLastWeek(state, today);
  const ending = projectsEndingSoon(state, today);
  const waiting = state.leaveRequests.filter((row) => row.decision === null);
  const lastWeekMonth = gaps.length > 0 ? monthOf(gaps[0].days[0]) : undefined;

  const attention: AttentionItem[] = [
    ...(waiting.length > 0
      ? [{
          id: "leave",
          count: waiting.length,
          tone: "act" as const,
          title: waiting.length === 1 ? "1 leave request to decide" : `${waiting.length} leave requests to decide`,
          detail: names([...new Set(waiting.map((row) => personName(state.people.find((p) => p.id === row.personId))))]),
          action: "Decide",
          href: "/leave/decide",
        }]
      : []),
    ...(overloaded.length > 0
      ? [{
          id: "overload",
          count: overloaded.length,
          tone: "warn" as const,
          title: overloaded.length === 1 ? "1 person is staffed past 100%" : `${overloaded.length} people are staffed past 100%`,
          detail: names(overloaded.map((row) => `${personName(row.person)} ${row.load}%`)),
          action: "See staffing",
          onSelect: () => openReport("staffing"),
        }]
      : []),
    ...(gaps.length > 0
      ? [{
          id: "gaps",
          count: gaps.length,
          tone: "warn" as const,
          title: gaps.length === 1 ? "1 person has days with no hours last week" : `${gaps.length} people have days with no hours last week`,
          detail: names(gaps.map((row) => `${personName(row.person)} (${row.days.length === 1 ? formatDay(row.days[0]) : `${row.days.length} days`})`)),
          action: "See timesheet",
          onSelect: () => openReport("timesheet", lastWeekMonth),
        }]
      : []),
    ...(ending.length > 0
      ? [{
          id: "ending",
          count: ending.length,
          tone: "act" as const,
          title: ending.length === 1 ? "1 project ends within 30 days" : `${ending.length} projects end within 30 days`,
          detail: names(ending.map((row) => `${row.code} ${formatDay(row.endDate ?? "")}`)),
          action: ending.length === 1 ? "Open project" : "See projects",
          ...(ending.length === 1 ? { href: `/projects/${ending[0].id}` } : { onSelect: () => openReport("projects") }),
        } as AttentionItem]
      : []),
  ];

  const monthName = MONTH.format(new Date(Date.UTC(monthOf(today).year, monthOf(today).month, 1)));
  const approvedThisMonth = approvedLeaveInSpan(state, thisMonth.from, thisMonth.to).length;
  const projectHoursThisMonth = byProject.filter((row) => row.project).reduce((sum, row) => sum + row.hours, 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium">Admin</h1>
          <p className="mt-1 mb-0 text-muted">Where project hours, people, and leave stand in {monthName}. Everything here is read-only.</p>
        </div>
        <ProjectAdminSubnav />
      </header>

      <FactsStrip className="max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-4">
        <Fact label="Active projects" detail={facts.projects > facts.activeProjects ? `of ${facts.projects}` : undefined}>
          {facts.activeProjects}
        </Fact>
        <Fact label="People staffed today">
          {facts.staffed}
          {facts.overloaded > 0 ? <span className="text-sm font-normal text-warning-foreground">{facts.overloaded} over 100%</span> : null}
        </Fact>
        <Fact label={`Hours in ${monthName}`} detail={`to ${formatDay(today)}`}>
          {hoursText(facts.monthHours)}
        </Fact>
        <Fact label="Leave to decide">
          {facts.leaveToDecide > 0 ? (
            <Link href="/leave/decide" className="text-accent underline-offset-2 hover:underline">
              {facts.leaveToDecide}
            </Link>
          ) : (
            <span className="text-muted">None</span>
          )}
          {approvedThisMonth > 0 ? (
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-sm font-normal text-muted underline-offset-2 hover:text-accent hover:underline"
              onClick={() => openReport("leave", monthOf(today))}
            >
              {approvedThisMonth} approved in {monthName}
            </button>
          ) : null}
        </Fact>
      </FactsStrip>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title={`Hours by project in ${monthName}`}
          aside={<span className="text-sm text-muted tabular-nums">{hoursText(projectHoursThisMonth)} on projects</span>}
        >
          <HoursByProject rows={byProject} total={byProject.reduce((sum, row) => sum + row.hours, 0)} />
        </Panel>
        <Panel className="max-lg:order-first" title="Needs attention" aside={attention.length > 0 ? <span className="text-sm text-muted tabular-nums">{plural(attention.length, "item")}</span> : null}>
          <NeedsAttention items={attention} />
        </Panel>
      </div>

      <Reports
        state={state}
        today={today}
        tab={tab}
        onTab={setTab}
        timesheet={timesheet}
        leave={leave}
        download={
          <Button variant="outline" size="sm" render={<Link href={reportMonthLink(cursor.year, cursor.month)} />}>
            <FileOutputIcon aria-hidden="true" />
            Export report
          </Button>
        }
        pager={
          <MonthPager
            year={cursor.year}
            monthIndex={cursor.month}
            isCurrent={cursor.year === monthOf(today).year && cursor.month === monthOf(today).month}
            onToday={() => setCursor(monthOf(today))}
            onMove={(delta) =>
              setCursor(({ year, month }) => {
                const next = month + delta;
                return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
              })
            }
          />
        }
      />
    </div>
  );
}
