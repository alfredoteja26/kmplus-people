"use client";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { validateDirectCascade } from "@/lib/direct";
import { openCycle } from "@/lib/domain";
import type { KpiForest as KpiForestData, KpiTreeNode } from "@/lib/kpi-tree";
import { canViewKpiSet } from "@/lib/kpi-tree";
import { useStore } from "@/lib/store";
import type { CascadeMode } from "@/lib/types";
import { useMemo } from "react";

export function KpiTreeLegend() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm text-ink" aria-label="Cascade legend">
      <li className="flex items-center gap-2">
        <span className="h-0.5 w-8 bg-accent" aria-hidden />
        Direct
      </li>
      <li className="flex items-center gap-2">
        <span className="h-0 w-8 border-t-2 border-dashed border-accent" aria-hidden />
        Indirect
      </li>
      <li className="flex items-center gap-2">
        <span className="h-0 w-8 border-t-2 border-dashed border-warning" aria-hidden />
        Direct break
      </li>
    </ul>
  );
}

export function KpiForest({
  forest,
  onOpen,
}: {
  forest: KpiForestData;
  onOpen?: (kpiSetId: string, kpiItemId: string) => void;
}) {
  const { state } = useStore();
  const nodeById = useMemo(() => new Map(forest.nodes.map((row) => [row.kpiItemId, row])), [forest.nodes]);

  const children = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const edge of forest.edges) {
      const list = map.get(edge.fromKpiItemId) ?? [];
      list.push(edge.toKpiItemId);
      map.set(edge.fromKpiItemId, list);
    }
    for (const [key, list] of map) {
      map.set(
        key,
        [...list].sort((left, right) => (nodeById.get(left)?.name ?? left).localeCompare(nodeById.get(right)?.name ?? right)),
      );
    }
    return map;
  }, [forest.edges, nodeById]);

  const edgeByChild = useMemo(() => {
    const map = new Map<string, CascadeMode>();
    for (const edge of forest.edges) map.set(edge.toKpiItemId, edge.mode);
    return map;
  }, [forest.edges]);

  const directBreakByNodeId = useMemo(() => {
    const map = new Map<string, string>();
    if (!openCycle(state)) return map;
    for (const node of forest.nodes) {
      if (node.linkMode !== "direct") continue;
      const item = state.kpiItems.find((row) => row.id === node.kpiItemId);
      if (!item) continue;
      const reason = validateDirectCascade(state, item);
      if (reason) map.set(node.kpiItemId, reason);
    }
    return map;
  }, [state, forest.nodes]);

  const roots = useMemo(() => {
    const childIds = new Set(forest.edges.map((edge) => edge.toKpiItemId));
    return forest.nodes
      .filter((node) => !childIds.has(node.kpiItemId))
      .map((node) => node.kpiItemId)
      .sort((left, right) => (nodeById.get(left)?.name ?? left).localeCompare(nodeById.get(right)?.name ?? right));
  }, [forest.edges, forest.nodes, nodeById]);

  if (forest.nodes.length === 0) {
    return (
      <div className="space-y-4">
        <KpiTreeLegend />
        <p className="rounded-[16px] border-[1.5px] border-line bg-paper px-4 py-8 text-sm text-muted">
          No KPIs in this scope for the current KPI year. Add KPIs and a parent on My KPI, or widen the scope.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KpiTreeLegend />
      <div className="overflow-x-auto rounded-[16px] border-[1.5px] border-line bg-bg px-6 py-8">
        <div className="flex min-w-min items-start justify-center gap-10">
          {roots.map((rootId) => (
            <OrgBranch
              key={rootId}
              nodeId={rootId}
              nodeById={nodeById}
              childrenByParent={children}
              edgeByChild={edgeByChild}
              directBreakByNodeId={directBreakByNodeId}
              canOpen={(kpiSetId) => canViewKpiSet(state, kpiSetId)}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrgBranch({
  nodeId,
  nodeById,
  childrenByParent,
  edgeByChild,
  directBreakByNodeId,
  canOpen,
  onOpen,
}: {
  nodeId: string;
  nodeById: Map<string, KpiTreeNode>;
  childrenByParent: Map<string, string[]>;
  edgeByChild: Map<string, CascadeMode>;
  directBreakByNodeId: Map<string, string>;
  canOpen: (kpiSetId: string) => boolean;
  onOpen?: (kpiSetId: string, kpiItemId: string) => void;
}) {
  const node = nodeById.get(nodeId);
  if (!node) return null;
  const kids = childrenByParent.get(nodeId) ?? [];
  const breakReason = directBreakByNodeId.get(nodeId) ?? null;

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        node={node}
        directBreakReason={breakReason}
        linkable={canOpen(node.kpiSetId)}
        onOpen={onOpen}
      />
      {kids.length > 0 ? (
        <>
          <div className="h-6 w-px bg-line" aria-hidden />
          <div className="flex items-start">
            {kids.map((kid, index) => (
              <div key={kid} className="flex flex-col items-center px-3">
                <ChildLink
                  mode={edgeByChild.get(kid) ?? "indirect"}
                  broken={directBreakByNodeId.has(kid)}
                  first={index === 0}
                  last={index === kids.length - 1}
                  only={kids.length === 1}
                />
                <OrgBranch
                  nodeId={kid}
                  nodeById={nodeById}
                  childrenByParent={childrenByParent}
                  edgeByChild={edgeByChild}
                  directBreakByNodeId={directBreakByNodeId}
                  canOpen={canOpen}
                  onOpen={onOpen}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ChildLink({
  mode,
  broken,
  first,
  last,
  only,
}: {
  mode: CascadeMode;
  broken: boolean;
  first: boolean;
  last: boolean;
  only: boolean;
}) {
  const drop = broken
    ? "h-6 border-l-2 border-dashed border-warning"
    : mode === "direct"
      ? "h-6 w-0.5 bg-accent"
      : "h-6 border-l-2 border-dashed border-accent";
  return (
    <div className="relative flex w-full min-w-56 justify-center">
      {only ? null : (
        <span
          className={cn(
            "absolute top-0 h-px bg-line",
            first ? "left-1/2 right-0" : last ? "left-0 right-1/2" : "inset-x-0",
          )}
          aria-hidden
        />
      )}
      <span className={drop} aria-hidden />
    </div>
  );
}

function NodeCard({
  node,
  directBreakReason,
  linkable,
  onOpen,
}: {
  node: KpiTreeNode;
  directBreakReason: string | null;
  linkable: boolean;
  onOpen?: (kpiSetId: string, kpiItemId: string) => void;
}) {
  const actualLabel = node.actual === null ? "—" : String(node.actual);
  const relation = directBreakReason ? "Direct break" : node.linkMode === "direct" ? "Direct" : node.linkMode === "indirect" ? "Indirect" : "Root";
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{node.name}</div>
          <div className="truncate text-xs text-muted">
            {node.personName} · {node.positionTitle}
          </div>
        </div>
        {directBreakReason ? (
          <span title={directBreakReason}>
            <Badge tone="warning">Break</Badge>
          </span>
        ) : (
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] text-faint">{relation}</span>
        )}
      </div>
      <div className="mt-2 text-xs tabular-nums text-muted">
        {actualLabel} / {node.target} {node.unit}
      </div>
    </>
  );

  const className =
    "w-56 rounded-[12px] border-[1.5px] border-line bg-paper px-3 py-2.5 text-left shadow-[var(--shadow)] transition hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  if (!linkable || !onOpen) {
    return <div className={cn(className, "cursor-default opacity-80")}>{body}</div>;
  }

  return (
    <button type="button" className={className} title={directBreakReason ?? `Open ${node.name}`} onClick={() => onOpen(node.kpiSetId, node.kpiItemId)}>
      {body}
    </button>
  );
}
