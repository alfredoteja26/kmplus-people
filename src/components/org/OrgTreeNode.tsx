"use client";

import { Badge } from "@/components/product/Badge";
import { Button } from "@/components/coss/button";
import { assignmentForPosition, childPositions, personById } from "@/lib/domain";
import { useStore } from "@/lib/store";
import type { Position } from "@/lib/types";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ChevronDown, ChevronRight } from "lucide-react";

function MatchHighlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[4px] bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] px-0.5 text-inherit">
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

export function OrgTreeNode({
  position,
  collapsed,
  onToggleCollapse,
  highlighted,
  searchQuery,
  onEdit,
  onAssignEmpty,
  hr,
}: {
  position: Position;
  collapsed: boolean;
  onToggleCollapse: () => void;
  highlighted: boolean;
  searchQuery: string;
  onEdit?: (position: Position) => void;
  onAssignEmpty: (positionId: string) => void;
  hr: boolean;
}) {
  const { state } = useStore();
  const assignment = assignmentForPosition(state, position.id);
  const person = assignment ? personById(state, assignment.personId) : undefined;
  const grade = state.grades.find((row) => row.id === position.gradeId);
  const unit = state.orgUnits.find((row) => row.id === position.orgUnitId);
  const hasChildren = childPositions(state, position.id).length > 0;

  return (
    <div
      className={cn(
        "relative w-[min(220px,42vw)] rounded-[12px] bg-paper px-3 py-2.5 text-left shadow-[var(--shadow)]",
        highlighted && "bg-tint outline outline-2 outline-accent",
      )}
    >
      <div className="flex items-start gap-1">
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${position.title}`}
            className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-[8px] border-0 bg-transparent text-muted hover:bg-tint hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={onToggleCollapse}
          >
            {collapsed ? <ChevronRight className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
          </button>
        ) : (
          <span className="inline-block w-7 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-medium leading-snug text-ink">
            <MatchHighlight text={position.title} query={highlighted ? searchQuery : ""} />
          </p>
          <p className="mt-0.5 mb-0 text-xs text-muted">
            {grade?.code} {grade?.name}
          </p>
          <p className="mt-0.5 mb-0 text-xs text-faint">{unit?.name}</p>
          <div className="mt-2">
            {person ? (
              <Link
                href={`/people/${person.id}`}
                className="rounded-[4px] text-sm font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <MatchHighlight text={person.legalName} query={highlighted ? searchQuery : ""} />
              </Link>
            ) : hr ? (
              <button
                type="button"
                className="inline-flex cursor-pointer rounded-[4px] border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => onAssignEmpty(position.id)}
                aria-label={`Empty position. Assign someone to ${position.title}`}
              >
                <Badge tone="warning">Empty position</Badge>
              </button>
            ) : (
              <Badge tone="warning">Empty position</Badge>
            )}
          </div>
        </div>
      </div>
      {onEdit ? (
        <div className="mt-2 border-t border-line pt-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            aria-label={`Edit ${position.title}`}
            onClick={() => onEdit(position)}
          >
            Edit position
          </Button>
        </div>
      ) : null}
    </div>
  );
}
