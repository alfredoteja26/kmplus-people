"use client";

import { HealthBadge } from "@/components/product/StatusBadge";
import { itemHealth } from "@/lib/domain";
import { hasDirectChildren } from "@/lib/direct";
import { itemRowView, type ItemRowView } from "@/lib/my-kpi-view";
import type { AppState, KpiCycle, KpiItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

const WASH = "hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))]";
// One row, two widths: stacked under a 56rem panel, the full register above it (DESIGN.md: container, not viewport).
const GRID = "grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 @4xl:grid-cols-[minmax(0,1fr)_7rem_8.5rem_9rem_7.5rem_1rem] @4xl:items-center";

/** One paper panel: a header row, the KPI register, and an optional footer for the panel's actions. */
export function KpiItemsPanel({
  title,
  count,
  action,
  footer,
  children,
}: {
  title: string;
  count: number;
  action?: ReactNode;
  footer?: ReactNode;
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
      {children}
      {footer ? <div className="border-t border-line px-5 py-3.5">{footer}</div> : null}
    </section>
  );
}

export type RowNote = { text: string; attention: boolean } | null;

/**
 * KPI register rows. Pass `onOpen` to make each row open the KPI in the side sheet; leave it out for a
 * read-only register (the KPI Portfolio view opened from the KPI tree).
 */
export function KpiItemRows({
  state,
  cycle,
  items,
  rootAssignment,
  noteFor,
  openItemId,
  onOpen,
}: {
  state: AppState;
  cycle: KpiCycle;
  items: KpiItem[];
  rootAssignment: boolean;
  noteFor?: (item: KpiItem) => RowNote;
  openItemId?: string | null;
  onOpen?: (itemId: string) => void;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(GRID, "hidden items-center border-b border-line px-5 py-2.5 text-xs font-medium tracking-[0.06em] text-muted uppercase @4xl:grid")}
      >
        <span>KPI</span>
        <span>Weight</span>
        <span>Target</span>
        <span>Latest actual</span>
        <span>Health</span>
        <span />
      </div>
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <KpiItemRow
            key={item.id}
            state={state}
            item={item}
            view={itemRowView(state, cycle, item, rootAssignment)}
            note={noteFor?.(item) ?? null}
            open={openItemId === item.id}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </>
  );
}

function KpiItemRow({
  state,
  item,
  view,
  note,
  open,
  onOpen,
}: {
  state: AppState;
  item: KpiItem;
  view: ItemRowView;
  note: RowNote;
  open: boolean;
  onOpen?: (itemId: string) => void;
}) {
  const name = <span className="block font-medium text-pretty">{item.name}</span>;
  const rollsUp = hasDirectChildren(state, item.id);
  return (
    <li className="relative border-t border-line first:border-t-0">
      <div
        className={cn(
          "grid px-5 py-3.5",
          GRID,
          onOpen && cn("transition-colors duration-150", WASH),
          open && "bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))]",
        )}
      >
        <div className="col-start-1 row-start-1 min-w-0">
          {onOpen ? (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => onOpen(item.id)}
              className="block min-w-0 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[8px] focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent"
            >
              {name}
            </button>
          ) : (
            name
          )}
          {item.definition ? <span className="mt-0.5 block truncate text-sm text-muted">{item.definition}</span> : null}
          <ParentLine parent={view.parent} />
          {rollsUp ? (
            <span className="mt-0.5 block text-sm text-muted">
              Actual {item.directMix === "own-plus-children" ? "is its own KPI Check-In plus" : "adds up from"} Direct child KPIs
            </span>
          ) : null}
          {note ? (
            <span className={cn("mt-1 block text-sm", note.attention ? "font-medium text-warning-foreground" : "text-muted")}>{note.text}</span>
          ) : null}
        </div>

        {/* Under 56rem these three cells share one wrapped meta line; above it they become register columns. */}
        <div className="col-span-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm @4xl:contents">
          <WeightCell weight={item.weight} />
          <span className="flex min-w-0 flex-col tabular-nums">
            <span>
              <span className="text-muted @4xl:hidden">Target </span>
              {view.target || "—"}
            </span>
            <span className="text-xs text-muted">
              {view.cadence}
              {view.cadenceOverride ? " (own)" : ""}
              {view.polarity ? ` · ${view.polarity}` : ""}
            </span>
          </span>
          <span className="flex min-w-0 flex-col tabular-nums">
            {view.actual ? (
              <>
                <span>
                  <span className="text-muted @4xl:hidden">Latest </span>
                  {view.actual.value}
                  <span className="text-muted"> of {item.target}</span>
                </span>
                <span className="truncate text-xs text-muted">{view.actual.detail}</span>
              </>
            ) : (
              <span className="text-faint">No actual yet</span>
            )}
          </span>
        </div>

        <span className="col-start-2 row-start-1 justify-self-end @4xl:col-start-auto @4xl:row-start-auto @4xl:justify-self-start">
          <HealthBadge health={itemHealth(state, item)} />
        </span>
        {onOpen ? (
          <ChevronRightIcon aria-hidden="true" className="hidden size-4 text-faint @4xl:block" />
        ) : (
          <span className="hidden @4xl:block" />
        )}
      </div>
    </li>
  );
}

function WeightCell({ weight }: { weight: number }) {
  return (
    <span className="flex items-center gap-2 tabular-nums">
      <span className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_var(--line)]" aria-hidden="true">
        <span className="block h-full rounded-full bg-accent-2" style={{ width: `${Math.max(0, Math.min(100, weight))}%` }} />
      </span>
      <span>
        {weight}%<span className="sr-only"> weight</span>
      </span>
    </span>
  );
}

function ParentLine({ parent }: { parent: ItemRowView["parent"] }) {
  if (parent === "root") return <span className="mt-0.5 block text-sm text-muted">Top position, no parent KPI</span>;
  if (parent === "missing") return <span className="mt-0.5 block text-sm font-medium text-warning-foreground">No parent KPI yet</span>;
  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted">
      <span className="shrink-0">Parent</span>
      <span className="truncate text-ink">{parent.name}</span>
      <span className="shrink-0">· {parent.mode}</span>
    </span>
  );
}
