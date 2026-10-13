"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/coss/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/coss/tabs";
import { Badge } from "@/components/product/Badge";
import { CodeChip, EmptyBlock, PersonAvatar } from "@/components/work-delivery/project/parts";
import { formatDate, formatDateRange, plural } from "@/lib/labels";
import { CHIP_TONE } from "@/components/leave/LeaveMonth";
import type { LeaveInSpan, PersonMonth } from "@/lib/project-admin-view";
import { clientLabel, personName, projectHours, timingPhrase } from "@/lib/project-view";
import type { AppState } from "@/lib/types";
import { jakartaTodayIso, personLoadSum, staffingCoversDate } from "@/lib/work-delivery-query";
import { cn } from "@/lib/utils";
import { CalendarOffIcon, ClockIcon, FolderIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bar, hoursText } from "./parts";

export type ReportTab = "projects" | "staffing" | "timesheet" | "leave";

/** `short` is the phone label, so all four tabs fit one row. */
export const REPORT_TABS: { value: ReportTab; label: string; short?: string }[] = [
  { value: "projects", label: "Projects" },
  { value: "staffing", label: "Staffing" },
  { value: "timesheet", label: "Timesheet by person", short: "Timesheet" },
  { value: "leave", label: "Approved leave", short: "Leave" },
];

const HEAD = "first:ps-5 last:pe-5 text-xs font-medium tracking-[0.06em] text-faint uppercase";
const CELL = "first:ps-5 last:pe-5";

function PersonCell({ person }: { person: AppState["people"][number] | undefined }) {
  return (
    <span className="flex items-center gap-2.5">
      <PersonAvatar person={person} size="sm" />
      <span className="font-medium">{personName(person)}</span>
    </span>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <Table className="[&_td]:h-12">{children}</Table>;
}

function ProjectsReport({ state, today }: { state: AppState; today: string }) {
  if (state.projects.length === 0) {
    return (
      <EmptyBlock
        icon={<FolderIcon aria-hidden="true" />}
        title="No projects yet"
        description="Projects opened from the Projects page show here with their dates, team, and hours."
        action={
          <Link href="/projects" className="text-sm font-medium text-accent underline-offset-2 hover:underline">
            Open Projects
          </Link>
        }
      />
    );
  }
  const rows = [...state.projects].sort((a, b) => a.code.localeCompare(b.code));
  return (
    <Frame>
      <TableHeader>
        <TableRow>
          <TableHead className={HEAD}>Project</TableHead>
          <TableHead className={HEAD}>Client</TableHead>
          <TableHead className={HEAD}>Dates</TableHead>
          <TableHead className={HEAD}>Timing</TableHead>
          <TableHead className={cn(HEAD, "text-right")}>On it today</TableHead>
          <TableHead className={cn(HEAD, "text-right")}>Hours logged</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((project) => {
          const team = new Set(state.staffings.filter((row) => row.projectId === project.id && staffingCoversDate(row, today)).map((row) => row.personId));
          return (
            <TableRow key={project.id}>
              <TableCell className={CELL}>
                <Link href={`/projects/${project.id}`} className="group flex items-center gap-2.5 text-ink no-underline">
                  <CodeChip code={project.code} />
                  <span className="font-medium group-hover:text-accent group-hover:underline underline-offset-2">{project.name}</span>
                </Link>
              </TableCell>
              <TableCell className={cn(CELL, !project.clientName && "text-muted")}>{clientLabel(project)}</TableCell>
              <TableCell className={cn(CELL, "tabular-nums")}>{formatDateRange(project.startDate, project.endDate) || formatDate(project.startDate)}</TableCell>
              <TableCell className={cn(CELL, "text-muted")}>{timingPhrase(project, today)}</TableCell>
              <TableCell className={cn(CELL, "text-right tabular-nums")}>{team.size}</TableCell>
              <TableCell className={cn(CELL, "text-right tabular-nums")}>{hoursText(projectHours(state, project.id).total)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Frame>
  );
}

function StaffingReport({ state, today }: { state: AppState; today: string }) {
  if (state.staffings.length === 0) {
    return (
      <EmptyBlock
        icon={<UsersIcon aria-hidden="true" />}
        title="No one is staffed yet"
        description="Staff people from a project's page. Each row shows the Load on that project and the person's total today."
      />
    );
  }
  const order = (row: AppState["staffings"][number]) => (staffingCoversDate(row, today) ? 0 : row.startDate > today ? 1 : 2);
  const rows = [...state.staffings].sort(
    (a, b) =>
      order(a) - order(b) ||
      personName(state.people.find((p) => p.id === a.personId)).localeCompare(personName(state.people.find((p) => p.id === b.personId))) ||
      b.load - a.load,
  );
  return (
    <Frame>
      <TableHeader>
        <TableRow>
          <TableHead className={HEAD}>Person</TableHead>
          <TableHead className={HEAD}>Project</TableHead>
          <TableHead className={HEAD}>Dates</TableHead>
          <TableHead className={HEAD}>Load</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const person = state.people.find((item) => item.id === row.personId);
          const project = state.projects.find((item) => item.id === row.projectId);
          const current = staffingCoversDate(row, today);
          const total = current ? personLoadSum(state, row.personId, today) : 0;
          return (
            <TableRow key={row.id} className={cn(!current && "text-muted")}>
              <TableCell className={CELL}>
                <PersonCell person={person} />
              </TableCell>
              <TableCell className={CELL}>
                {project ? (
                  <Link href={`/projects/${project.id}`} className="flex items-center gap-2 text-ink no-underline hover:text-accent">
                    <CodeChip code={project.code} />
                    <span className="max-w-56 truncate">{project.name}</span>
                  </Link>
                ) : (
                  "Unknown project"
                )}
              </TableCell>
              <TableCell className={cn(CELL, "tabular-nums")}>
                {formatDate(row.startDate)} – {row.endDate ? formatDate(row.endDate) : "open"}
                {!current ? <span className="ms-2 text-xs">{row.startDate > today ? "Upcoming" : "Ended"}</span> : null}
              </TableCell>
              <TableCell className={CELL}>
                <span className="flex items-center gap-3">
                  <span className="w-24">
                    <Bar value={row.load} max={100} tone={total > 100 ? "warning" : current ? "accent" : "muted"} label={`Load on ${project?.code ?? "project"}`} />
                  </span>
                  <span className={cn("tabular-nums", total > 100 && "text-warning-foreground")}>
                    {row.load}%{total > 100 ? ` · ${total}% total` : ""}
                  </span>
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Frame>
  );
}

function TimesheetReport({ rows }: { rows: PersonMonth[] }) {
  if (rows.length === 0) {
    return (
      <EmptyBlock
        icon={<ClockIcon aria-hidden="true" />}
        title="No hours this month"
        description="People who log time or are staffed this month show here with their hours by project."
      />
    );
  }
  const max = Math.max(...rows.map((row) => row.hours));
  return (
    <Frame>
      <TableHeader>
        <TableRow>
          <TableHead className={HEAD}>Person</TableHead>
          <TableHead className={HEAD}>Hours</TableHead>
          <TableHead className={cn(HEAD, "text-right")}>Days logged</TableHead>
          <TableHead className={HEAD}>By project</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.person.id}>
            <TableCell className={CELL}>
              <PersonCell person={row.person} />
            </TableCell>
            <TableCell className={CELL}>
              <span className="flex w-48 items-center gap-3">
                <Bar value={row.hours} max={max} label={`${personName(row.person)} hours`} />
                <span className={cn("w-12 shrink-0 text-right tabular-nums", row.hours === 0 && "text-warning-foreground")}>{hoursText(row.hours)}</span>
              </span>
            </TableCell>
            <TableCell className={cn(CELL, "text-right tabular-nums")}>{row.daysLogged}</TableCell>
            <TableCell className={CELL}>
              {row.byProject.length === 0 ? (
                <span className="text-warning-foreground">Nothing logged</span>
              ) : (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {row.byProject.map((part) => (
                    <span key={part.project?.id ?? "none"} className="flex items-center gap-1.5 tabular-nums">
                      {part.project ? <CodeChip code={part.project.code} /> : <span className="text-muted">No project</span>}
                      {hoursText(part.hours)}
                    </span>
                  ))}
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Frame>
  );
}

const KIND_DOT: Record<string, string> = { cuti: CHIP_TONE.cuti.dot, sick: CHIP_TONE.sick.dot, remote: CHIP_TONE.remote.dot };

function LeaveReport({ rows }: { rows: LeaveInSpan[] }) {
  if (rows.length === 0) {
    return (
      <EmptyBlock
        icon={<CalendarOffIcon aria-hidden="true" />}
        title="No approved leave this month"
        description="Approved cuti, sick, and remote days show here. Requests still waiting are in Leave requests."
        action={
          <Link href="/leave/decide" className="text-sm font-medium text-accent underline-offset-2 hover:underline">
            Open Leave requests
          </Link>
        }
      />
    );
  }
  return (
    <Frame>
      <TableHeader>
        <TableRow>
          <TableHead className={HEAD}>Person</TableHead>
          <TableHead className={HEAD}>Leave</TableHead>
          <TableHead className={HEAD}>Dates</TableHead>
          <TableHead className={cn(HEAD, "text-right")}>Working days</TableHead>
          <TableHead className={HEAD}>Pay</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ row, person, label, workingDays }) => (
          <TableRow key={row.id}>
            <TableCell className={CELL}>
              <PersonCell person={person} />
            </TableCell>
            <TableCell className={CELL}>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", KIND_DOT[row.kind])} />
                {label}
              </span>
            </TableCell>
            <TableCell className={cn(CELL, "tabular-nums")}>
              {row.spanMode === "hours" && row.startTime && row.endTime
                ? `${formatDate(row.startDate)}, ${row.startTime}–${row.endTime}`
                : formatDateRange(row.startDate, row.endDate || row.startDate)}
            </TableCell>
            <TableCell className={cn(CELL, "text-right tabular-nums")}>{row.spanMode === "hours" ? "Part day" : workingDays}</TableCell>
            <TableCell className={CELL}>
              <Badge tone={row.decision === "paid" ? "success" : "neutral"}>{row.decision === "paid" ? "Paid" : "Unpaid"}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Frame>
  );
}

/** One paper panel holding the four read-only reports behind tabs, with the month pager for the two that read by month. */
export function Reports({
  state,
  tab,
  onTab,
  pager,
  download,
  timesheet,
  leave,
  today = jakartaTodayIso(),
}: {
  state: AppState;
  tab: ReportTab;
  onTab: (tab: ReportTab) => void;
  pager: ReactNode;
  download: ReactNode;
  timesheet: PersonMonth[];
  leave: LeaveInSpan[];
  today?: string;
}) {
  const counts: Record<ReportTab, number> = {
    projects: state.projects.length,
    staffing: state.staffings.length,
    timesheet: timesheet.length,
    leave: leave.length,
  };
  return (
    <section id="reports" aria-label="Reports" className="scroll-mt-6 overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
      <Tabs value={tab} onValueChange={(value) => onTab(value as ReportTab)} className="gap-0">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line px-2 pt-2 sm:px-3">
          <TabsList variant="underline" aria-label="Reports" className="max-w-full">
            {REPORT_TABS.map((item) => (
              <TabsTab key={item.value} value={item.value} className="gap-1 px-1.5 text-sm sm:gap-1.5 sm:px-2.5">
                {item.short ? (
                  <>
                    <span className="sm:hidden">{item.short}</span>
                    <span className="max-sm:hidden">{item.label}</span>
                  </>
                ) : (
                  item.label
                )}
                <span className="text-xs font-normal text-muted tabular-nums">{counts[item.value]}</span>
              </TabsTab>
            ))}
          </TabsList>
          <div className="flex items-center gap-2 pb-2">{download}</div>
        </div>
        {tab === "timesheet" || tab === "leave" ? pager : null}
        <TabsPanel value="projects">
          <ProjectsReport state={state} today={today} />
        </TabsPanel>
        <TabsPanel value="staffing">
          <StaffingReport state={state} today={today} />
        </TabsPanel>
        <TabsPanel value="timesheet">
          <TimesheetReport rows={timesheet} />
        </TabsPanel>
        <TabsPanel value="leave">
          <LeaveReport rows={leave} />
        </TabsPanel>
      </Tabs>
      <p className="m-0 border-t border-line px-5 py-3 text-sm text-muted">
        {plural(counts.projects, "project")}, {plural(counts.staffing, "staffing row")} and every logged hour go into the workbook.
      </p>
    </section>
  );
}
