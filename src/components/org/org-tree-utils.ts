import {
  assignmentForPosition,
  childPositions,
  personById,
  positionById,
} from "@/lib/domain";
import type { AppState, Position } from "@/lib/types";

export function positionDepth(state: AppState, positionId: string): number {
  let depth = 0;
  let current = positionById(state, positionId);
  while (current?.reportsToPositionId) {
    depth += 1;
    current = positionById(state, current.reportsToPositionId);
  }
  return depth;
}

export function positionSearchBlob(state: AppState, position: Position): string {
  const assignment = assignmentForPosition(state, position.id);
  const person = assignment ? personById(state, assignment.personId) : undefined;
  return [position.title, person?.legalName].filter(Boolean).join(" ").toLowerCase();
}

/** When query is empty, returns null (show full tree). Otherwise ids to keep visible (matches + ancestors). */
export function visiblePositionIds(state: AppState, query: string): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const matches = new Set<string>();
  for (const position of state.positions) {
    if (positionSearchBlob(state, position).includes(q)) {
      matches.add(position.id);
    }
  }

  const visible = new Set<string>();
  for (const id of matches) {
    let current: string | null = id;
    while (current) {
      visible.add(current);
      const pos = positionById(state, current);
      current = pos?.reportsToPositionId ?? null;
    }
  }
  return visible;
}

/** Positions with children at depth >= 2 — sensible default collapse for deep branches. */
export function defaultCollapsedIds(state: AppState): Set<string> {
  const collapsed = new Set<string>();
  for (const position of state.positions) {
    if (childPositions(state, position.id).length === 0) continue;
    if (positionDepth(state, position.id) >= 2) {
      collapsed.add(position.id);
    }
  }
  return collapsed;
}
