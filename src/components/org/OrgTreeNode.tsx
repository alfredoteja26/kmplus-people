"use client";

import { Button } from "@/components/coss/button";
import { Badge } from "@/components/product/Badge";
import { PersonAvatar } from "@/components/work-delivery/project/parts";
import { plural } from "@/lib/labels";
import type { OrgSeat } from "@/lib/org-view";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon, PencilIcon } from "lucide-react";
import Link from "next/link";

/** Marks the first case-insensitive occurrence of the search in a title or a name. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[4px] bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] px-0.5 text-inherit">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  );
}

export function gradeUnitLine(seat: OrgSeat): string {
  const grade = seat.grade ? `${seat.grade.code} ${seat.grade.name}`.trim() : "";
  return [grade, seat.unit?.name].filter(Boolean).join(" · ");
}

/** The holder links to their profile. An empty seat carries the warning badge, and HR gets an Assign action beside it. */
export function SeatHolder({
  seat,
  query,
  hr,
  onAssign,
  className,
}: {
  seat: OrgSeat;
  query: string;
  hr: boolean;
  onAssign: (positionId: string) => void;
  className?: string;
}) {
  const { holder, position } = seat;
  if (holder) {
    return (
      <span className={cn("flex min-w-0 items-center gap-2", className)}>
        <PersonAvatar person={holder} size="sm" className="shrink-0" />
        <Link
          href={`/people/${holder.id}`}
          className="min-w-0 truncate rounded-[4px] text-sm font-medium text-accent underline-offset-2 hover:text-accent-hover hover:underline"
        >
          <Highlight text={holder.legalName} query={query} />
        </Link>
      </span>
    );
  }
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      <Badge tone="warning">Empty position</Badge>
      {hr ? (
        <Button type="button" variant="outline" size="xs" aria-label={`Assign someone to ${position.title}`} onClick={() => onAssign(position.id)}>
          Assign
        </Button>
      ) : null}
    </span>
  );
}

export type NodeMark = "current" | "match" | "path" | "dim" | null;

/** One seat on the tree: a 12px card, never a circle. Top positions carry a stronger border. */
export function OrgTreeNode({
  seat,
  top,
  folded,
  onToggle,
  mark,
  query,
  hr,
  onEdit,
  onAssign,
}: {
  seat: OrgSeat;
  top: boolean;
  folded: boolean;
  onToggle: () => void;
  mark: NodeMark;
  query: string;
  hr: boolean;
  onEdit?: (positionId: string) => void;
  onAssign: (positionId: string) => void;
}) {
  const { position } = seat;
  const reports = seat.reports.length;
  const matched = mark === "match" || mark === "current";
  const meta = gradeUnitLine(seat);

  return (
    <article
      data-org-node={position.id}
      aria-label={position.title}
      aria-current={mark === "current" ? "true" : undefined}
      className={cn(
        "relative w-56 scroll-m-6 rounded-[12px] bg-paper text-left shadow-(--shadow) transition-[opacity,background-color] duration-200",
        top && "border-[1.5px] border-line-strong",
        matched && "bg-[color-mix(in_srgb,var(--tint)_70%,var(--paper))] outline-2 outline-offset-2 outline-[color-mix(in_srgb,var(--accent)_45%,transparent)]",
        mark === "current" && "outline-accent",
        mark === "dim" && "opacity-45 hover:opacity-100 focus-within:opacity-100",
      )}
    >
      <div className="px-3 pt-3 pb-3">
        <h3 className="m-0 text-sm leading-snug font-medium text-ink">
          <Highlight text={position.title} query={matched ? query : ""} />
        </h3>
        {meta ? <p className="mt-0.5 mb-0 truncate text-label font-normal text-muted">{meta}</p> : null}
        <SeatHolder seat={seat} query={matched ? query : ""} hr={hr} onAssign={onAssign} className="mt-2.5" />
      </div>
      {reports > 0 || onEdit ? (
        <div className="flex min-h-9 items-center justify-between gap-1 border-t border-line px-1.5 py-1">
          {reports > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-muted hover:text-ink"
              aria-expanded={!folded}
              aria-label={folded ? `Show ${plural(reports, "report")} to ${position.title}` : `Hide reports to ${position.title}`}
              onClick={onToggle}
            >
              {folded ? <ChevronRightIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
              {folded ? `Show ${plural(reports, "report")}` : "Hide reports"}
              {folded ? null : <span className="text-faint tabular-nums">{reports}</span>}
            </Button>
          ) : (
            <span />
          )}
          {onEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted hover:text-ink"
              aria-label={`Edit ${position.title}`}
              title="Edit position"
              onClick={() => onEdit(position.id)}
            >
              <PencilIcon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
