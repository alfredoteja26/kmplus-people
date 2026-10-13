"use client";

import { CodeChip } from "@/components/work-delivery/project/parts";
import type { ProjectHours } from "@/lib/project-admin-view";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function hoursText(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

/** One paper panel with a title row, the Home panel pattern. */
export function Panel({
  title,
  aside,
  children,
  className,
  id,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("overflow-clip rounded-2xl bg-paper shadow-(--shadow)", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5">
        <h2 className="m-0 text-base font-medium">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A flat bar on a wash track, scaled to the largest value in its list. Overload reads in warning. */
export function Bar({ value, max, tone = "accent", label }: { value: number; max: number; tone?: "accent" | "muted" | "warning"; label: string }) {
  const width = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="block h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_var(--line)]"
    >
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "accent" && "bg-accent",
          tone === "muted" && "bg-line-strong",
          tone === "warning" && "bg-warning",
        )}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}

/** Counted hours per Project this month as a bar list, the devl.dev dashboard band reduced to one honest series. */
export function HoursByProject({ rows, total }: { rows: ProjectHours[]; total: number }) {
  if (rows.length === 0) {
    return <p className="m-0 px-5 py-5 text-sm text-muted">No hours logged this month yet. Hours appear here as people fill in their timesheets.</p>;
  }
  // Bars scale to the top project; time with no project only sets the scale when no project has hours.
  const projectRows = rows.filter((row) => row.project);
  const max = Math.max(...(projectRows.length > 0 ? projectRows : rows).map((row) => row.hours));
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 py-2">
      {rows.map((row) => {
        const share = total > 0 ? Math.round((row.hours / total) * 100) : 0;
        const body = (
          <>
            <span className="flex min-w-0 items-center gap-2 sm:w-64 sm:shrink-0">
              {row.project ? <CodeChip code={row.project.code} className="shrink-0" /> : null}
              <span className={cn("truncate text-sm", row.project ? "text-ink" : "text-muted")}>{row.project ? row.project.name : "No project"}</span>
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <Bar value={row.hours} max={max} tone={row.project ? "accent" : "muted"} label={`${row.project?.code ?? "No project"} hours`} />
              <span className="w-24 shrink-0 text-right text-sm tabular-nums">
                {hoursText(row.hours)}
                <span className="text-muted"> · {share}%</span>
              </span>
            </span>
          </>
        );
        const rowClass = "flex flex-col gap-1.5 px-5 py-2 sm:flex-row sm:items-center sm:gap-4";
        return (
          <li key={row.project?.id ?? "none"}>
            {row.project ? (
              <Link
                href={`/projects/${row.project.id}`}
                className={cn(rowClass, "text-ink no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] focus-visible:outline-offset-[-2px]")}
              >
                {body}
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type AttentionItem = {
  id: string;
  count: number;
  title: string;
  detail: string;
  action: string;
  tone: "act" | "warn";
} & ({ href: string; onSelect?: never } | { onSelect: () => void; href?: never });

/** What needs an Admin, the Home "Needs you" rows: a count tile, one sentence, who it is, and where to go. */
export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="m-0 flex items-center gap-3 px-5 py-5 text-muted">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-tint text-accent" aria-hidden="true">
          <CheckIcon className="size-4" />
        </span>
        Nothing needs you. Leave is decided, no one is over 100%, last week is filled in, and no project ends within 30 days.
      </p>
    );
  }
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => {
        const inner = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-medium tabular-nums",
                item.tone === "act"
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,var(--paper))] text-accent-hover"
                  : "bg-[color-mix(in_srgb,var(--warning)_15%,var(--paper))] text-warning-foreground",
              )}
            >
              {item.count}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block font-medium">{item.title}</span>
              <span className="block truncate text-sm text-muted">{item.detail}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent">
              <span className="max-sm:sr-only">{item.action}</span>
              <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
          </>
        );
        const rowClass =
          "group flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent px-5 py-3.5 text-ink no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] focus-visible:outline-offset-[-2px]";
        return (
          <li key={item.id} className="border-t border-line first:border-t-0">
            {item.href ? (
              <Link href={item.href} className={rowClass}>
                {inner}
              </Link>
            ) : (
              <button type="button" className={cn(rowClass, "font-[inherit] text-base")} onClick={item.onSelect}>
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
