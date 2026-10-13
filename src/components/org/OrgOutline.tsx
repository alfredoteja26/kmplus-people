"use client";

import { Button } from "@/components/coss/button";
import { plural } from "@/lib/labels";
import type { OutlineRow } from "@/lib/org-view";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon, PencilIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { gradeUnitLine, Highlight, SeatHolder } from "./OrgTreeNode";

/** Indentation stops growing here so a deep line never pushes the title off a phone. */
const MAX_INDENT = 8;

const COLUMNS = "@3xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,9rem)_minmax(0,9rem)_4.5rem_2rem]";

/** The same seats as the tree, as an indented list: the default on phones, and quicker to scan at any width. */
export function OrgOutline({
  rows,
  query,
  hr,
  toolbar,
  onToggle,
  onEdit,
  onAssign,
  onClearSearch,
}: {
  rows: OutlineRow[];
  query: string;
  hr: boolean;
  toolbar: ReactNode;
  onToggle: (positionId: string) => void;
  onEdit?: (positionId: string) => void;
  onAssign: (positionId: string) => void;
  onClearSearch: () => void;
}) {
  const searching = query.trim().length > 0;
  return (
    <section aria-label="Organization outline" className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
      {searching ? null : (
        <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2">{toolbar}</div>
      )}
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-5 py-8 sm:items-center sm:text-center">
          <p className="m-0 text-sm">No positions or people match &ldquo;{query.trim()}&rdquo;.</p>
          <Button type="button" variant="outline" size="sm" onClick={onClearSearch}>
            Clear search
          </Button>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={cn(
              "hidden gap-4 border-b border-line px-5 py-2.5 text-xs font-medium tracking-[0.06em] text-muted uppercase @3xl:grid",
              COLUMNS,
            )}
          >
            <span>Position</span>
            <span>Held by</span>
            <span>Grade</span>
            <span>Unit</span>
            <span className="text-right">Reports</span>
            <span />
          </div>
          <ul className="m-0 list-none p-0">
            {rows.map(({ seat, fold, match }) => {
              const { position } = seat;
              const reports = seat.reports.length;
              const grade = seat.grade ? `${seat.grade.code} ${seat.grade.name}`.trim() : "";
              const indent = { "--depth": Math.min(seat.depth, MAX_INDENT) } as CSSProperties;
              return (
                <li
                  key={position.id}
                  aria-level={seat.depth + 1}
                  style={indent}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t border-line px-5 py-3 transition-colors duration-150 first:border-t-0 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))]",
                    COLUMNS,
                    match && "bg-[color-mix(in_srgb,var(--tint)_70%,var(--paper))]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1.5 pl-[calc(var(--depth)*0.75rem)] @3xl:pl-[calc(var(--depth)*1.25rem)]">
                    {fold ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 text-muted hover:text-ink"
                        aria-expanded={fold === "open"}
                        aria-label={fold === "folded" ? `Show ${plural(reports, "report")} to ${position.title}` : `Hide reports to ${position.title}`}
                        onClick={() => onToggle(position.id)}
                      >
                        {fold === "folded" ? <ChevronRightIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
                      </Button>
                    ) : (
                      <span aria-hidden="true" className="size-7 shrink-0 sm:size-6" />
                    )}
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-medium text-ink", seat.depth === 0 && "text-base")}>
                        <Highlight text={position.title} query={match ? query : ""} />
                      </span>
                      <span className="block truncate text-label font-normal text-muted @3xl:hidden">
                        {[gradeUnitLine(seat), reports > 0 ? plural(reports, "report") : ""].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </div>
                  {onEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="justify-self-end text-muted hover:text-ink @3xl:order-last"
                      aria-label={`Edit ${position.title}`}
                      title="Edit position"
                      onClick={() => onEdit(position.id)}
                    >
                      <PencilIcon aria-hidden="true" />
                    </Button>
                  ) : (
                    <span className="@3xl:order-last" />
                  )}
                  <SeatHolder
                    seat={seat}
                    query={match ? query : ""}
                    hr={hr}
                    onAssign={onAssign}
                    className="col-span-2 pl-[calc(var(--depth)*0.75rem_+_2.125rem)] sm:pl-[calc(var(--depth)*0.75rem_+_1.875rem)] @3xl:col-span-1 @3xl:pl-0"
                  />
                  <span className="hidden truncate text-sm text-muted @3xl:block">{grade || "No grade"}</span>
                  <span className="hidden truncate text-sm text-muted @3xl:block">{seat.unit?.name ?? "No unit"}</span>
                  <span className={cn("hidden text-right text-sm tabular-nums @3xl:block", reports === 0 ? "text-faint" : "text-ink")}>
                    {reports}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
