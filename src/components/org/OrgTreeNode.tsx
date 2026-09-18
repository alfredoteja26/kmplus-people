"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { assignmentForPosition, childPositions, personById } from "@/lib/domain";
import { useStore } from "@/lib/store";
import type { Position } from "@/lib/types";
import Link from "next/link";
import { cn } from "@/lib/cn";

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
        "relative w-[min(220px,42vw)] rounded-[12px] border-[1.5px] bg-paper px-3 py-2.5 text-left shadow-[var(--shadow)]",
        highlighted ? "border-accent bg-tint" : "border-line",
      )}
    >
      <div className="flex items-start gap-1">
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand branch" : "Collapse branch"}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border-0 bg-transparent text-muted hover:bg-tint hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={onToggleCollapse}
          >
            <span className="text-[11px] leading-none">{collapsed ? "▸" : "▾"}</span>
          </button>
        ) : (
          <span className="inline-block w-6 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[14px] font-medium leading-snug text-ink">
            <MatchHighlight text={position.title} query={highlighted ? searchQuery : ""} />
          </p>
          <p className="mt-0.5 mb-0 text-[12px] text-muted">
            {grade?.code} {grade?.name}
          </p>
          <p className="mt-0.5 mb-0 text-[12px] text-faint">{unit?.name}</p>
          <div className="mt-2">
            {person ? (
              <Link
                href={`/people/${person.id}`}
                className="rounded-[4px] text-[13px] font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <MatchHighlight text={person.legalName} query={highlighted ? searchQuery : ""} />
              </Link>
            ) : hr ? (
              <button
                type="button"
                className="inline-flex cursor-pointer rounded-[4px] border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => onAssignEmpty(position.id)}
              >
                <Badge tone="warning">Empty seat</Badge>
              </button>
            ) : (
              <Badge tone="warning">Empty seat</Badge>
            )}
          </div>
        </div>
      </div>
      {onEdit ? (
        <div className="mt-2 border-t border-line pt-2">
          <Button variant="ghost" type="button" className="h-7 px-2 text-[12px]" onClick={() => onEdit(position)}>
            Edit position
          </Button>
        </div>
      ) : null}
    </div>
  );
}
