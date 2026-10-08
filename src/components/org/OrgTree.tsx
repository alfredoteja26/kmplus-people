"use client";

import { Button } from "@/components/coss/button";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
import { childPositions, rootPositions } from "@/lib/domain";
import { useStore } from "@/lib/store";
import type { Position } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { AssignSeatModal } from "./AssignSeatModal";
import { OrgTreeNode } from "./OrgTreeNode";
import {
  defaultCollapsedIds,
  positionSearchBlob,
  visiblePositionIds,
} from "./org-tree-utils";

function OrgTreeBranch({
  position,
  collapsedIds,
  searchQuery,
  visibleFilter,
  onToggleCollapse,
  onEdit,
  onAssignEmpty,
  hr,
}: {
  position: Position;
  collapsedIds: Set<string>;
  searchQuery: string;
  visibleFilter: Set<string> | null;
  onToggleCollapse: (id: string) => void;
  onEdit?: (position: Position) => void;
  onAssignEmpty: (positionId: string) => void;
  hr: boolean;
}) {
  const { state } = useStore();
  const children = childPositions(state, position.id).filter(
    (child) => !visibleFilter || visibleFilter.has(child.id),
  );
  const searchActive = visibleFilter !== null;
  const collapsed = searchActive ? false : collapsedIds.has(position.id);
  const showChildren = children.length > 0 && !collapsed;
  const highlighted =
    searchQuery.trim().length > 0 && positionSearchBlob(state, position).includes(searchQuery.trim().toLowerCase());

  if (visibleFilter && !visibleFilter.has(position.id)) {
    return null;
  }

  return (
    <div className="inline-flex flex-col items-center">
      <OrgTreeNode
        position={position}
        collapsed={collapsed}
        onToggleCollapse={() => onToggleCollapse(position.id)}
        highlighted={highlighted}
        searchQuery={searchQuery}
        onEdit={onEdit}
        onAssignEmpty={onAssignEmpty}
        hr={hr}
      />
      {showChildren ? (
        <>
          <div className="h-5 w-[1.5px] shrink-0 bg-line-strong" aria-hidden />
          <div
            className="relative flex flex-wrap items-start justify-center gap-x-6 gap-y-8 pt-0"
            role="group"
            aria-label={`Reports to ${position.title}`}
          >
            {children.length > 1 ? (
              <div
                className="pointer-events-none absolute top-0 h-[1.5px] bg-line-strong"
                style={{
                  left: `${50 / children.length}%`,
                  right: `${50 / children.length}%`,
                }}
                aria-hidden
              />
            ) : null}
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="h-5 w-[1.5px] shrink-0 bg-line-strong" aria-hidden />
                <OrgTreeBranch
                  position={child}
                  collapsedIds={collapsedIds}
                  searchQuery={searchQuery}
                  visibleFilter={visibleFilter}
                  onToggleCollapse={onToggleCollapse}
                  onEdit={onEdit}
                  onAssignEmpty={onAssignEmpty}
                  hr={hr}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function OrgTree({
  hr,
  onEdit,
  onCreatePosition,
}: {
  hr: boolean;
  onEdit?: (position: Position) => void;
  onCreatePosition?: () => void;
}) {
  const { state } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [assignPositionId, setAssignPositionId] = useState<string | null>(null);
  const [initializedCollapse, setInitializedCollapse] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const centeredRef = useRef(false);

  useEffect(() => {
    if (initializedCollapse) return;
    setCollapsedIds(defaultCollapsedIds(state));
    setInitializedCollapse(true);
  }, [state, initializedCollapse]);

  // On narrow screens the chart is wider than the viewport; start scrolled so the top position is in view.
  useEffect(() => {
    if (!initializedCollapse || centeredRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    centeredRef.current = true;
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
  }, [initializedCollapse]);

  const visibleFilter = useMemo(() => visiblePositionIds(state, searchQuery), [state, searchQuery]);

  const roots = useMemo(() => {
    return rootPositions(state).filter((root) => !visibleFilter || visibleFilter.has(root.id));
  }, [state, visibleFilter]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseDeep = () => setCollapsedIds(defaultCollapsedIds(state));
  const catalogEmpty = state.positions.length === 0;

  if (catalogEmpty) {
    return (
      <div className="mt-6">
        <div
          className="rounded-[16px] bg-paper px-6 py-14 text-center shadow-[var(--shadow)]"
          role="region"
          aria-label="Organization chart"
        >
          <p className="m-0 text-base font-medium text-ink">No positions yet</p>
          <p className="mx-auto mt-2 mb-0 max-w-md text-sm text-muted">
            The chart shows positions and who holds them. Start with the top position, then add the positions that
            report to it.
          </p>
          {hr && onCreatePosition ? (
            <Button type="button" className="mt-6" onClick={onCreatePosition}>
              Add first position
            </Button>
          ) : (
            <p className="mt-6 mb-0 text-sm text-muted">HR adds positions here. Ask HR if you expected to see the chart.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 max-w-md">
          <Field label="Search positions or people">
            <Input
              type="search"
              placeholder="Position title or person name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Field>
        </div>
        <div className="flex gap-2 pb-0.5">
          <Button type="button" variant="ghost" size="sm" onClick={expandAll}>
            Expand all
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={collapseDeep}>
            Show top levels only
          </Button>
        </div>
      </div>

      {searchQuery.trim() && roots.length === 0 ? (
        <p className="text-sm text-muted">No positions or people match &ldquo;{searchQuery.trim()}&rdquo;.</p>
      ) : (
        <div
          ref={scrollerRef}
          className="overflow-x-auto rounded-[16px] border border-line bg-bg px-4 py-8"
          role="region"
          aria-label="Organization chart"
        >
          <div className="flex min-w-max justify-center gap-10">
            {roots.map((root) => (
              <div key={root.id} className="shrink-0">
                <OrgTreeBranch
                  position={root}
                  collapsedIds={collapsedIds}
                  searchQuery={searchQuery}
                  visibleFilter={visibleFilter}
                  onToggleCollapse={toggleCollapse}
                  onEdit={onEdit}
                  onAssignEmpty={setAssignPositionId}
                  hr={hr}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {assignPositionId && hr ? (
        <AssignSeatModal positionId={assignPositionId} onClose={() => setAssignPositionId(null)} />
      ) : null}
    </div>
  );
}
