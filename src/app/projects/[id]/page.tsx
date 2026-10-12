"use client";

import { Button } from "@/components/coss/button";
import { Badge } from "@/components/product/Badge";
import { Callout } from "@/components/product/Card";
import { Select } from "@/components/product/Select";
import { DeliverableOpen, DeliverableSheet } from "@/components/work-delivery/project/DeliverableSheet";
import { CodeChip, EmptyBlock, PersonAvatar, ProgressMeter } from "@/components/work-delivery/project/parts";
import { ProjectSheet } from "@/components/work-delivery/project/ProjectSheet";
import { StaffingSheet } from "@/components/work-delivery/project/StaffingSheet";
import { WorkItemSheet } from "@/components/work-delivery/project/WorkItemSheet";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDate, formatDateRange, plural } from "@/lib/labels";
import { acceptedCount, clientLabel, personName, projectHours, projectTeam, statusTone, timingPhrase, type TeamMember } from "@/lib/project-view";
import { hoursText } from "@/lib/timesheet-grid";
import { useStore } from "@/lib/store";
import type { Deliverable, Staffing, WorkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { canEditProjectWork, jakartaTodayIso } from "@/lib/work-delivery-query";
import { ArrowLeftIcon, FileIcon, LinkIcon, ListChecksIcon, PackageIcon, PencilIcon, PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";

type Open =
  | { kind: "project" }
  | { kind: "staffing"; staffing?: Staffing }
  | { kind: "workItem"; workItem?: WorkItem }
  | { kind: "deliverable"; deliverable?: Deliverable; presetWorkItemId?: string }
  | null;

const NOT_ATTACHED = "__none";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useStore();
  const { state } = store;
  const project = state.projects.find((row) => row.id === params.id);
  const admin = hasAdminGrant(state);
  const today = jakartaTodayIso();
  const [open, setOpen] = useState<Open>(null);
  const [filter, setFilter] = useState("");

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <h1 className="m-0 font-heading text-h1 font-medium">Project not found</h1>
        <Callout tone="warning">
          This project doesn&apos;t exist or was removed.{" "}
          <Link href="/projects" className="font-medium text-accent underline-offset-2 hover:underline">
            Go back to Projects
          </Link>{" "}
          to pick another.
        </Callout>
      </div>
    );
  }

  const canEdit = canEditProjectWork(state, project.id);
  const team = projectTeam(state, project.id, today);
  // A work item needs a person in charge, and only people staffed on the project qualify.
  const canAddWorkItem = canEdit && team.length > 0;
  const onNow = team.filter((member) => member.when === "current");
  const workItems = state.workItems
    .filter((row) => row.projectId === project.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
  const deliverables = state.deliverables.filter((row) => row.projectId === project.id);
  const progress = acceptedCount(state, project.id);
  const hours = projectHours(state, project.id);
  const shownDeliverables = deliverables.filter((row) =>
    !filter ? true : filter === NOT_ATTACHED ? row.workItemIds.length === 0 : row.workItemIds.includes(filter),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link href="/projects" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted no-underline hover:text-accent">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Projects
        </Link>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <CodeChip code={project.code} />
              <h1 className="m-0 font-heading text-h1 font-medium text-balance">{project.name}</h1>
            </div>
            <p className="mt-2 mb-0 text-muted tabular-nums">
              {clientLabel(project)} · {formatDateRange(project.startDate, project.endDate)} · {timingPhrase(project, today)}
            </p>
          </div>
          {admin ? (
            <Button type="button" variant="outline" onClick={() => setOpen({ kind: "project" })}>
              <PencilIcon aria-hidden="true" />
              Edit project
            </Button>
          ) : null}
        </header>

        <dl className="m-0 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl bg-paper px-5 py-4 shadow-(--shadow)">
          <Fact label="On it today">{plural(onNow.length, "person", "people")}</Fact>
          <Fact label="Work items">{workItems.length}</Fact>
          <Fact label="Deliverables">
            <ProgressMeter accepted={progress.accepted} total={progress.total} />
          </Fact>
          <Fact label="Hours logged">{hoursText(hours.total)}</Fact>
        </dl>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            title="Work items"
            count={workItems.length}
            action={
              canEdit ? (
                <Button type="button" variant="outline" size="sm" disabled={!canAddWorkItem} onClick={() => setOpen({ kind: "workItem" })}>
                  <PlusIcon aria-hidden="true" />
                  Add work item
                </Button>
              ) : null
            }
          >
            {workItems.length === 0 ? (
              <EmptyBlock
                className="py-8"
                icon={<ListChecksIcon aria-hidden="true" />}
                title="No work items yet"
                description="A work item is a piece of the project with one person in charge and its own dates. Time and deliverables attach to it."
                action={
                  canAddWorkItem ? (
                    <Button type="button" onClick={() => setOpen({ kind: "workItem" })}>
                      Add the first work item
                    </Button>
                  ) : undefined
                }
                note={canEdit && team.length === 0 ? "Add someone to the team first; only people on the project can be in charge." : undefined}
              />
            ) : (
              <ul className="m-0 list-none p-0">
                {workItems.map((item) => {
                  const pic = state.people.find((row) => row.id === item.picPersonId);
                  const attached = deliverables.filter((row) => row.workItemIds.includes(item.id)).length;
                  return (
                    <li key={item.id} className="relative border-t border-line first:border-t-0">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] @2xl:grid-cols-[minmax(0,1fr)_10rem_12.5rem_auto]">
                        <button
                          type="button"
                          onClick={() => setOpen({ kind: "workItem", workItem: item })}
                          className="min-w-0 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[8px] focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent @max-2xl:col-span-2"
                        >
                          <span className="block truncate font-medium">{item.name}</span>
                          {item.description ? <span className="block truncate text-sm text-muted">{item.description}</span> : null}
                        </button>
                        <span className="flex min-w-0 items-center gap-2 text-sm">
                          <PersonAvatar person={pic} size="sm" />
                          <span className="truncate">{personName(pic)}</span>
                        </span>
                        <span className="text-sm text-muted tabular-nums @max-2xl:justify-self-end">{formatDateRange(item.startDate, item.endDate)}</span>
                        <button
                          type="button"
                          onClick={() => setFilter(attached > 0 ? item.id : "")}
                          className={cn(
                            "relative z-10 justify-self-end rounded-[6px] px-2 py-1 text-sm tabular-nums @max-2xl:hidden",
                            attached > 0 ? "text-accent hover:bg-tint" : "cursor-default text-faint",
                          )}
                          aria-label={attached > 0 ? `Show ${plural(attached, "deliverable")} for ${item.name}` : `No deliverables for ${item.name}`}
                          disabled={attached === 0}
                        >
                          {plural(attached, "deliverable")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title="Deliverables"
            count={deliverables.length}
            toolbar={
              deliverables.length > 0 && workItems.length > 0 ? (
                <label className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
                  Work item
                  <Select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-full sm:w-56">
                    <option value="">All work items</option>
                    {workItems.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                    <option value={NOT_ATTACHED}>Not attached</option>
                  </Select>
                </label>
              ) : undefined
            }
            action={
              <div className="flex flex-wrap items-center gap-2">
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen({ kind: "deliverable", presetWorkItemId: filter && filter !== NOT_ATTACHED ? filter : undefined })}
                  >
                    <PlusIcon aria-hidden="true" />
                    Add deliverable
                  </Button>
                ) : null}
              </div>
            }
          >
            {deliverables.length === 0 ? (
              <EmptyBlock
                className="py-8"
                icon={<PackageIcon aria-hidden="true" />}
                title="Nothing delivered yet"
                description="A deliverable is a link or a file. Its status moves from Draft to Accepted, and accepted ones fill the project's progress."
                action={
                  canEdit ? (
                    <Button type="button" onClick={() => setOpen({ kind: "deliverable" })}>
                      Add the first deliverable
                    </Button>
                  ) : undefined
                }
              />
            ) : shownDeliverables.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3 px-5 py-6 text-sm">
                <span>No deliverables here.</span>
                <Button type="button" variant="ghost" size="sm" className="text-accent" onClick={() => setFilter("")}>
                  Show all
                </Button>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {shownDeliverables.map((row) => {
                  const status = state.deliverableStatuses.find((item) => item.id === row.statusId);
                  const category = state.deliverableCategories.find((item) => item.id === row.categoryId);
                  const attachedNames = row.workItemIds
                    .map((id) => workItems.find((item) => item.id === id)?.name)
                    .filter(Boolean)
                    .join(", ");
                  const Icon = row.kind === "link" ? LinkIcon : FileIcon;
                  return (
                    <li key={row.id} className="relative border-t border-line first:border-t-0">
                      <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] sm:grid-cols-[2rem_minmax(0,1fr)_auto_auto]">
                        <span className="flex size-8 items-center justify-center rounded-[8px] bg-wash text-muted" aria-hidden="true">
                          <Icon className="size-4" />
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpen({ kind: "deliverable", deliverable: row })}
                          className="min-w-0 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[8px] focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent"
                        >
                          <span className="block truncate font-medium">{row.name}</span>
                          <span className="block truncate text-sm text-muted">
                            {category?.name ?? "No category"}
                            {row.kind === "file" && row.versions.length > 1 ? ` · ${plural(row.versions.length, "version")}` : ""}
                            {attachedNames ? ` · ${attachedNames}` : ""}
                          </span>
                        </button>
                        <Badge tone={statusTone(status)}>{status?.name ?? "No status"}</Badge>
                        <span className="relative z-10 max-sm:hidden">
                          <DeliverableOpen deliverable={row} compact />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <TeamRail
          team={team}
          admin={admin}
          totalHours={hours.total}
          onAdd={() => setOpen({ kind: "staffing" })}
          onOpen={(staffing) => setOpen({ kind: "staffing", staffing })}
        />
      </div>

      {open?.kind === "project" && admin ? (
        <ProjectSheet project={project} onClose={() => setOpen(null)} onSave={(input) => store.updateProject(project.id, input).error} />
      ) : null}
      {open?.kind === "staffing" && admin ? (
        <StaffingSheet
          key={open.staffing?.id ?? "new"}
          state={state}
          project={project}
          staffing={open.staffing}
          onClose={() => setOpen(null)}
          onAdd={(input) => store.addStaffing({ ...input, projectId: project.id }).error}
          onUpdate={(id, patch) => store.updateStaffing(id, patch).error}
          onDelete={(id) => store.deleteStaffing(id).error}
        />
      ) : null}
      {open?.kind === "workItem" ? (
        <WorkItemSheet
          key={open.workItem?.id ?? "new"}
          state={state}
          project={project}
          workItem={open.workItem}
          canEdit={canEdit}
          onClose={() => setOpen(null)}
          onSave={(input) => store.upsertWorkItem({ ...input, projectId: project.id }).error}
          onDelete={(id) => store.deleteWorkItem(id).error}
        />
      ) : null}
      {open?.kind === "deliverable" ? (
        <DeliverableSheet
          key={open.deliverable?.id ?? "new"}
          state={state}
          project={project}
          deliverable={open.deliverable}
          canEdit={canEdit}
          presetWorkItemId={open.presetWorkItemId}
          onClose={() => setOpen(null)}
          onAdd={(input) => store.addDeliverable({ ...input, projectId: project.id }).error}
          onUpdate={(id, patch) => store.updateDeliverable(id, patch).error}
          onDelete={(id) => store.deleteDeliverable(id).error}
        />
      ) : null}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium tracking-[0.06em] text-muted uppercase">{label}</dt>
      <dd className="m-0 flex min-h-6 items-center text-base font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function Panel({
  title,
  count,
  action,
  toolbar,
  children,
}: {
  title: string;
  count: number;
  action?: ReactNode;
  /** A filter row under the header, kept off the title line so the header never stacks on a phone. */
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="m-0 flex items-baseline gap-2 text-base font-medium">
          {title}
          <span className="text-sm font-normal text-muted tabular-nums">{count}</span>
        </h2>
        {action}
      </div>
      {toolbar ? <div className="border-b border-line bg-[color-mix(in_srgb,var(--wash)_50%,var(--paper))] px-5 py-2.5">{toolbar}</div> : null}
      {children}
    </section>
  );
}

function TeamRail({
  team,
  admin,
  totalHours,
  onAdd,
  onOpen,
}: {
  team: TeamMember[];
  admin: boolean;
  totalHours: number;
  onAdd: () => void;
  onOpen: (staffing: Staffing) => void;
}) {
  const active = team.filter((member) => member.when !== "ended");
  const ended = team.filter((member) => member.when === "ended");
  return (
    <aside aria-labelledby="team-heading" className="overflow-clip rounded-2xl bg-paper shadow-(--shadow) lg:sticky lg:top-0">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 id="team-heading" className="m-0 flex items-baseline gap-2 text-base font-medium">
          Team
          <span className="text-sm font-normal text-muted tabular-nums">{active.length}</span>
        </h2>
        {admin ? (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon aria-hidden="true" />
            Add person
          </Button>
        ) : null}
      </div>
      {team.length === 0 ? (
        <EmptyBlock
          className="py-8"
          icon={<UsersIcon aria-hidden="true" />}
          title="No one on it yet"
          description="People on the project can log time to it and be in charge of work items."
          action={
            admin ? (
              <Button type="button" onClick={onAdd}>
                Add the first person
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="m-0 list-none p-0">
            {active.map((member) => (
              <TeamRow key={member.personId} member={member} admin={admin} onOpen={onOpen} />
            ))}
          </ul>
          {ended.length > 0 ? (
            <details className="group border-t border-line">
              <summary className="cursor-pointer list-none px-5 py-3 text-sm text-muted hover:text-ink">
                Earlier on this project <span className="tabular-nums">{ended.length}</span>
              </summary>
              <ul className="m-0 list-none p-0">
                {ended.map((member) => (
                  <TeamRow key={member.personId} member={member} admin={admin} onOpen={onOpen} />
                ))}
              </ul>
            </details>
          ) : null}
          {admin && totalHours > 0 ? (
            <p className="m-0 border-t border-line px-5 py-3 text-xs text-muted">Hours per person show for Admin only.</p>
          ) : null}
        </>
      )}
    </aside>
  );
}

function TeamRow({
  member,
  admin,
  onOpen,
}: {
  member: TeamMember;
  admin: boolean;
  onOpen: (staffing: Staffing) => void;
}) {
  const over = member.when === "current" && member.totalLoad > 100;
  const detail =
    member.when === "upcoming"
      ? `From ${formatDate(member.focus.startDate)}`
      : member.when === "ended"
        ? `Until ${formatDate(member.focus.endDate)}`
        : member.focus.endDate
          ? `Until ${formatDate(member.focus.endDate)}`
          : member.position ?? "On the project";
  const body = (
    <>
      <PersonAvatar person={member.person} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{personName(member.person)}</span>
          {admin ? (
            <span className="shrink-0 text-sm text-muted tabular-nums" title="Hours logged on this project">
              {hoursText(member.hours)}
            </span>
          ) : null}
        </span>
        <span className="block truncate text-sm text-muted">{detail}</span>
        <span className="mt-1.5 flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-wash" aria-hidden="true">
            <span className={cn("block h-full rounded-full", member.when === "current" ? "bg-accent-2" : "bg-line-strong")} style={{ width: `${member.focus.load}%` }} />
          </span>
          <span className={cn("text-xs tabular-nums", over ? "font-medium text-warning-foreground" : "text-muted")}>
            {member.focus.load}%{over ? ` · ${member.totalLoad}% total` : ""}
          </span>
        </span>
      </span>
    </>
  );
  return (
    <li className="border-t border-line first:border-t-0">
      {admin ? (
        <button
          type="button"
          onClick={() => onOpen(member.focus)}
          aria-label={`${personName(member.person)}, ${member.focus.load}% load. Edit staffing`}
          className={cn(
            "flex w-full items-start gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))]",
            member.when === "ended" && "opacity-70",
          )}
        >
          {body}
        </button>
      ) : (
        <div className={cn("flex items-start gap-3 px-5 py-3", member.when === "ended" && "opacity-70")}>{body}</div>
      )}
    </li>
  );
}
