"use client";

import { Button } from "@/components/coss/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/coss/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { peopleListDescription } from "@/components/people/copy";
import { PeopleSubnav } from "@/components/people/PeopleSubnav";
import { CreatePersonSheet } from "@/components/people/PersonSheets";
import { StatusBadge } from "@/components/product/StatusBadge";
import { EmptyBlock, PersonAvatar } from "@/components/work-delivery/project/parts";
import { isHrLike } from "@/lib/domain";
import { statusLabel } from "@/lib/labels";
import {
  filterRoster,
  ROSTER_STATUSES,
  rosterRows,
  rosterStatusCounts,
  type RosterStatusFilter,
} from "@/lib/people-view";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function PeoplePage() {
  const { state, createPerson } = useStore();
  const router = useRouter();
  const hr = isHrLike(state.currentRole);
  const me = state.currentPersonId;
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RosterStatusFilter>("all");

  const rows = useMemo(() => rosterRows(state), [state]);
  const counts = rosterStatusCounts(rows);
  const statuses = ROSTER_STATUSES.filter((value) => counts[value] > 0);
  const shown = filterRoster(rows, query, status);
  const needle = query.trim();
  // One row (an employee's own profile) needs neither search nor filter.
  const showToolbar = rows.length > 1;

  const addPerson = hr ? (
    <Button type="button" onClick={() => setCreating(true)}>
      <PlusIcon aria-hidden="true" />
      Add person
    </Button>
  ) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 font-heading text-h1 font-medium">People</h1>
          <p className="mt-1 mb-0 max-w-[65ch] text-muted">{peopleListDescription(state.currentRole, hr)}</p>
        </div>
        {rows.length > 0 ? addPerson : null}
      </header>
      <PeopleSubnav className="mb-0" />

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-paper shadow-(--shadow)">
          <EmptyBlock
            icon={<UsersIcon aria-hidden="true" />}
            title="No people yet"
            description={
              hr
                ? "Add a person to start their employment record, then assign a Position from their profile."
                : "No profiles are available to you yet. Ask HR to set up your employment record."
            }
            action={addPerson}
          />
        </div>
      ) : (
        <>
          {showToolbar ? (
            <div className="flex flex-wrap items-center gap-3">
              <InputGroup className="min-w-0 basis-full sm:max-w-80 sm:flex-1 sm:basis-auto">
                <InputGroupInput
                  type="search"
                  aria-label="Search people"
                  placeholder="Name, email, or Position"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <InputGroupAddon>
                  <SearchIcon aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
              {statuses.length > 1 ? (
                <ToggleGroup
                  variant="outline"
                  aria-label="Employment status"
                  className="max-w-full overflow-x-auto"
                  value={[status]}
                  onValueChange={(value) => {
                    const next = value[0] as RosterStatusFilter | undefined;
                    if (next) setStatus(next);
                  }}
                >
                  <ToggleGroupItem value="all">
                    All <span className="text-muted tabular-nums">{rows.length}</span>
                  </ToggleGroupItem>
                  {statuses.map((value) => (
                    <ToggleGroupItem key={value} value={value}>
                      {statusLabel(value)} <span className="text-muted tabular-nums">{counts[value]}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              ) : null}
            </div>
          ) : null}

          <div className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
            {shown.length === 0 ? (
              <div className="flex flex-col items-start gap-3 px-5 py-8 sm:items-center sm:text-center">
                <p className="m-0 text-sm">
                  {needle ? `No one matches “${needle}”. Try part of a name, an email, or a Position.` : "No one has this employment status."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                  }}
                >
                  Show everyone
                </Button>
              </div>
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="hidden grid-cols-[minmax(0,1fr)_16rem_8.5rem_1rem] gap-4 border-b border-line px-5 py-2.5 text-xs font-medium tracking-[0.06em] text-muted uppercase @3xl:grid"
                >
                  <span>Person</span>
                  <span>Position</span>
                  <span>Employment</span>
                  <span />
                </div>
                <ul className="m-0 list-none p-0">
                  {shown.map(({ person, employment, seats, loginEmail }) => {
                    const [first, ...more] = seats;
                    const self = person.id === me;
                    return (
                      <li key={person.id} className="border-t border-line first:border-t-0">
                        <Link
                          href={`/people/${person.id}`}
                          className={cn(
                            // Stacked on a phone; the register's columns turn on at the panel's own 48rem.
                            "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 text-ink no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] focus-visible:outline-offset-[-2px]",
                            "@3xl:grid-cols-[minmax(0,1fr)_16rem_8.5rem_1rem]",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <PersonAvatar person={person} className="size-9" />
                            <span className="min-w-0">
                              <span className="flex min-w-0 items-baseline gap-2">
                                <span className="truncate font-medium">{person.legalName}</span>
                                {self ? <span className="shrink-0 text-xs font-medium text-accent-hover">You</span> : null}
                              </span>
                              <span className="block truncate text-sm text-muted">
                                {person.preferredName && person.preferredName !== person.legalName ? `${person.preferredName} · ` : ""}
                                {loginEmail ?? person.email}
                              </span>
                            </span>
                          </span>
                          {/* The seat sits under the name on a phone, in its own column at width. */}
                          <span className="min-w-0 @max-3xl:col-span-2 @max-3xl:row-start-2 @max-3xl:pl-12">
                            {first ? (
                              <>
                                <span className="block truncate text-sm">
                                  {first.position?.title ?? "Unknown Position"}
                                  {more.length > 0 ? <span className="text-muted"> +{more.length}</span> : null}
                                </span>
                                <span className="block truncate text-sm text-muted">{first.orgUnit?.name ?? "No OrgUnit"}</span>
                              </>
                            ) : (
                              <span className="text-sm text-faint">No Position yet</span>
                            )}
                          </span>
                          <span className="@max-3xl:col-start-2 @max-3xl:row-start-1 @max-3xl:justify-self-end">
                            {employment ? <StatusBadge status={employment.status} /> : <span className="text-sm text-faint">No employment</span>}
                          </span>
                          <ChevronRightIcon
                            aria-hidden="true"
                            className="hidden size-4 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent @3xl:block"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          {needle || status !== "all" ? (
            <p className="m-0 text-sm text-muted tabular-nums" aria-live="polite">
              {shown.length} of {rows.length} people
            </p>
          ) : null}
        </>
      )}

      {hr && creating ? (
        <CreatePersonSheet
          onClose={() => setCreating(false)}
          onCreate={(input) => {
            const personId = createPerson(input);
            if (!personId) return "Only HR can change people, positions, and CV reviews";
            setCreating(false);
            router.push(`/people/${personId}`);
            return null;
          }}
        />
      ) : null}
    </div>
  );
}
