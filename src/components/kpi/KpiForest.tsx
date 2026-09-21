"use client";

import { Badge } from "@/components/ui/Badge";
import { validateDirectCascade } from "@/lib/direct";
import { openCycle } from "@/lib/domain";
import type { KpiForest as KpiForestData, KpiTreeNode } from "@/lib/kpi-tree";
import { canViewKpiSet } from "@/lib/kpi-tree";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useMemo } from "react";

const NODE_W = 232;
const NODE_H = 128;
const GAP_X = 28;
const GAP_Y = 72;

type Point = { x: number; y: number };

function layoutSubtree(
  nodeId: string,
  depth: number,
  children: Map<string, string[]>,
  positions: Map<string, Point>,
  left: number,
): number {
  const kids = children.get(nodeId) ?? [];
  if (kids.length === 0) {
    positions.set(nodeId, { x: left + NODE_W / 2, y: depth * (NODE_H + GAP_Y) });
    return NODE_W;
  }

  let cursor = left;
  const widths: number[] = [];
  for (const kid of kids) {
    const w = layoutSubtree(kid, depth + 1, children, positions, cursor);
    widths.push(w);
    cursor += w + GAP_X;
  }
  const total = widths.reduce((sum, w) => sum + w, 0) + GAP_X * Math.max(0, kids.length - 1);
  const centerX = left + total / 2;
  positions.set(nodeId, { x: centerX, y: depth * (NODE_H + GAP_Y) });
  return Math.max(NODE_W, total);
}

function layoutForest(forest: KpiForestData): Map<string, Point> {
  const children = new Map<string, string[]>();
  for (const edge of forest.edges) {
    const list = children.get(edge.fromKpiItemId) ?? [];
    list.push(edge.toKpiItemId);
    children.set(edge.fromKpiItemId, list);
  }
  for (const [key, list] of children) {
    children.set(
      key,
      [...list].sort((a, b) => a.localeCompare(b)),
    );
  }

  const positions = new Map<string, Point>();
  let xOffset = NODE_W / 2;
  for (const rootId of forest.rootKpiItemIds) {
    const width = layoutSubtree(rootId, 0, children, positions, xOffset);
    xOffset += width + 64;
  }
  return positions;
}

function edgePath(from: Point, to: Point): string {
  const y1 = from.y + NODE_H / 2;
  const y2 = to.y - NODE_H / 2;
  const mid = (y1 + y2) / 2;
  return `M ${from.x} ${y1} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${y2}`;
}

const cardClassName =
  "absolute left-0 top-0 block w-[232px] rounded-[12px] border-[1.5px] border-line bg-paper p-3 text-left text-ink shadow-[var(--shadow)] transition hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function NodeCard({
  node,
  directBreakReason,
  linkable,
}: {
  node: KpiTreeNode;
  directBreakReason: string | null;
  linkable: boolean;
}) {
  const actualLabel = node.actual === null ? "—" : String(node.actual);
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink">{node.name}</div>
        {directBreakReason ? (
          <span className="shrink-0" title={directBreakReason}>
            <Badge tone="warning">Direct break</Badge>
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-[12px] text-muted">
        {actualLabel} / {node.target} {node.unit}
      </div>
      {node.linkMode ? (
        <div className="mt-1 text-[11px] uppercase tracking-wide text-faint">{node.linkMode}</div>
      ) : (
        <div className="mt-1 text-[11px] uppercase tracking-wide text-accent">Root</div>
      )}
      <div className="mt-2 border-t border-line pt-2 text-[12px] text-muted">
        {node.personName} · {node.positionTitle}
      </div>
    </>
  );

  if (!linkable) {
    return <div className={`${cardClassName} cursor-default opacity-80`}>{body}</div>;
  }

  return (
    <Link href={`/kpi/set/${node.kpiSetId}`} className={`${cardClassName} no-underline`} title={directBreakReason ?? undefined}>
      {body}
    </Link>
  );
}

export function KpiForest({ forest }: { forest: KpiForestData }) {
  const { state } = useStore();
  const nodeById = useMemo(() => new Map(forest.nodes.map((row) => [row.kpiItemId, row])), [forest.nodes]);
  const positions = useMemo(() => layoutForest(forest), [forest]);

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

  const bounds = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    for (const [id, pos] of positions) {
      if (!nodeById.has(id)) continue;
      maxX = Math.max(maxX, pos.x + NODE_W / 2);
      maxY = Math.max(maxY, pos.y + NODE_H);
    }
    return { width: Math.max(maxX + 40, 320), height: Math.max(maxY + 40, 240) };
  }, [positions, nodeById]);

  if (forest.nodes.length === 0) {
    return (
      <p className="rounded-[16px] border-[1.5px] border-line bg-bg px-4 py-8 text-sm text-muted">
        No KpiItems in this scope for the current KpiYear. Try Whole tenant if you are HR, or confirm your team has KPI Portfolios for this year.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[16px] border-[1.5px] border-line bg-bg px-4 py-8">
      <div className="relative min-w-min" style={{ width: bounds.width, height: bounds.height }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {forest.edges.map((edge) => {
            const from = positions.get(edge.fromKpiItemId);
            const to = positions.get(edge.toKpiItemId);
            if (!from || !to) return null;
            const dashed = edge.mode === "indirect";
            return (
              <path
                key={`${edge.fromKpiItemId}-${edge.toKpiItemId}`}
                d={edgePath(from, to)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray={dashed ? "6 5" : undefined}
              />
            );
          })}
        </svg>
        {forest.nodes.map((node) => {
          const pos = positions.get(node.kpiItemId);
          if (!pos) return null;
          return (
            <div
              key={node.kpiItemId}
              className="absolute"
              style={{
                left: pos.x - NODE_W / 2,
                top: pos.y,
                width: NODE_W,
                height: NODE_H,
              }}
            >
              <NodeCard
                node={node}
                directBreakReason={directBreakByNodeId.get(node.kpiItemId) ?? null}
                linkable={canViewKpiSet(state, node.kpiSetId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
