"use client";

import { Button } from "@/components/coss/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/coss/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { AvatarStack, CodeChip, EmptyBlock, ProgressMeter } from "@/components/work-delivery/project/parts";
import { ProjectSheet } from "@/components/work-delivery/project/ProjectSheet";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDateRange, plural } from "@/lib/labels";
import { acceptedCount, clientLabel, projectTeam, timingPhrase } from "@/lib/project-view";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { jakartaTodayIso } from "@/lib/work-delivery-query";
import { ChevronRightIcon, FolderKanbanIcon, PlusIcon, SearchIcon, UserCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Scope = "mine" | "all";

export default function ProjectsPage() {
  const { state, openProject } = useStore();
  const router = useRouter();
  const admin = hasAdminGrant(state);
  const today = jakartaTodayIso();
  const me = state.currentPersonId;
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    // Running now first, then starting later, then finished; each group by start date, newest first.
    const rank = (project: Project) => (project.startDate > today ? 1 : project.endDate && project.endDate < today ? 2 : 0);
    return [...state.projects]
      .sort((a, b) => rank(a) - rank(b) || b.startDate.localeCompare(a.startDate))
      .map((project) => {
        const team = projectTeam(state, project.id, today);
        const current = team.filter((member) => member.when !== "ended");
        return {
          project,
          team: current,
          mine: current.some((member) => member.personId === me),
          progress: acceptedCount(state, project.id),
        };
      });
  }, [state, today, me]);

  const mineCount = rows.filter((row) => row.mine).length;
  const [scope, setScope] = useState<Scope>(() => (mineCount > 0 ? "mine" : "all"));
  const needle = query.trim().toLowerCase();
  const shown = rows.filter(
    (row) =>
      (scope === "all" || row.mine) &&
      (!needle || [row.project.code, row.project.name, clientLabel(row.project)].some((text) => text.toLowerCase().includes(needle))),
  );

  const newProject = admin ? (
    <Button type="button" onClick={() => setCreating(true)}>
      <PlusIcon aria-hidden="true" />
      New project
    </Button>
  ) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium">Projects</h1>
          <p className="mt-1 mb-0 text-muted">
            {state.projects.length === 0 ? "Client and internal projects." : `${plural(state.projects.length, "project")}, client and internal.`}
          </p>
        </div>
        {state.projects.length > 0 ? newProject : null}
      </header>

      {state.projects.length === 0 ? (
        <div className="rounded-2xl bg-paper shadow-(--shadow)">
          <EmptyBlock
            icon={<FolderKanbanIcon aria-hidden="true" />}
            title="No projects yet"
            description="A project holds who is staffed on it, its work items, and what it delivers."
            action={newProject}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <InputGroup className="min-w-0 basis-full sm:max-w-80 sm:flex-1 sm:basis-auto">
              <InputGroupInput
                type="search"
                aria-label="Search projects"
                placeholder="Search projects"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            <ToggleGroup
              variant="outline"
              aria-label="Which projects"
              value={[scope]}
              onValueChange={(value) => {
                const next = value[0] as Scope | undefined;
                if (next) setScope(next);
              }}
            >
              <ToggleGroupItem value="mine">
                Mine <span className="text-muted tabular-nums">{mineCount}</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="all">
                All <span className="text-muted tabular-nums">{rows.length}</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
            {shown.length === 0 ? (
              <div className="flex flex-col items-start gap-3 px-5 py-8 sm:items-center sm:text-center">
                <p className="m-0 text-sm">
                  {needle ? `No projects match “${query.trim()}”.` : "You aren't on any project right now."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setScope("all");
                  }}
                >
                  Show all projects
                </Button>
              </div>
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="hidden grid-cols-[6.5rem_minmax(0,1fr)_7rem_10rem_12rem_1rem] gap-4 border-b border-line px-5 py-2.5 text-xs font-medium tracking-[0.06em] text-muted uppercase @5xl:grid"
                >
                  <span>Code</span>
                  <span>Project</span>
                  <span>Team</span>
                  <span>Deliverables</span>
                  <span>Dates</span>
                  <span />
                </div>
                <ul className="m-0 list-none p-0">
                  {shown.map(({ project, team, mine, progress }) => (
                    <li key={project.id} className="border-t border-line first:border-t-0">
                      <Link
                        href={`/projects/${project.id}`}
                        className={cn(
                          // Three widths of one row: stacked on a phone, three columns in a mid panel, the full register at 64rem.
                          "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 text-ink no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] focus-visible:outline-offset-[-2px]",
                          "@2xl:grid-cols-[minmax(0,1fr)_7rem_10rem_1rem]",
                          "@5xl:grid-cols-[6.5rem_minmax(0,1fr)_7rem_10rem_12rem_1rem]",
                          // Under All, the viewer's own projects carry the light "yours" wash. Under Mine every row is theirs, so no wash.
                          mine && scope === "all" && "bg-[color-mix(in_srgb,var(--tint)_35%,var(--paper))]",
                        )}
                      >
                        <CodeChip code={project.code} className="hidden justify-self-start @5xl:inline-flex" />
                        <span className="min-w-0 @max-2xl:col-span-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <CodeChip code={project.code} className="shrink-0 @5xl:hidden" />
                            <span className="truncate text-base font-medium">{project.name}</span>
                            {mine ? (
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent-hover">
                                <UserCheckIcon aria-hidden="true" className="size-3.5" />
                                <span className="@max-md:sr-only">You&apos;re on this</span>
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-sm text-muted">
                            {clientLabel(project)} · {timingPhrase(project, today)}
                          </span>
                          {/* Without a dates column the full range gets its own line, so it never truncates. */}
                          <span className="mt-0.5 block text-sm text-muted tabular-nums @5xl:hidden">
                            {formatDateRange(project.startDate, project.endDate)}
                          </span>
                        </span>
                        <AvatarStack people={team.map((member) => member.person)} />
                        <ProgressMeter accepted={progress.accepted} total={progress.total} className="@max-2xl:justify-self-end" />
                        <span className="hidden text-sm text-muted tabular-nums @5xl:block">{formatDateRange(project.startDate, project.endDate)}</span>
                        <ChevronRightIcon
                          aria-hidden="true"
                          className="hidden size-4 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent @2xl:block"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}

      {admin && creating ? (
        <ProjectSheet
          onClose={() => setCreating(false)}
          onSave={(input) => {
            const result = openProject(input);
            if (!result.error && result.projectId) router.push(`/projects/${result.projectId}`);
            return result.error;
          }}
        />
      ) : null}
    </div>
  );
}
