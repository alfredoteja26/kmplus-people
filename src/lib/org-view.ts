import type { AppState, Grade, OrgUnit, Person, Position } from "./types";

/** One seat on the chart with everything a node or an outline row reads. */
export type OrgSeat = {
  position: Position;
  /** 0 for a top position. */
  depth: number;
  /** Direct reports, in catalogue order. */
  reports: string[];
  parentId: string | null;
  holder?: Person;
  grade?: Grade;
  unit?: OrgUnit;
};

export type OrgIndex = {
  seats: Map<string, OrgSeat>;
  /** Top positions, in catalogue order. */
  roots: string[];
  /** Every position, depth first from the roots: the order a reader meets them on the chart. */
  order: string[];
};

/**
 * Reads the chart once from Position reports-to and current Assignments. A position whose reports-to is
 * missing, or that sits in a loop, still appears as a top position so no seat drops off the chart.
 */
export function buildOrgIndex(state: AppState): OrgIndex {
  const byId = new Map(state.positions.map((position) => [position.id, position]));
  const children = new Map<string, string[]>();
  const tops: string[] = [];
  for (const position of state.positions) {
    const parent = position.reportsToPositionId;
    if (parent && parent !== position.id && byId.has(parent)) {
      const list = children.get(parent) ?? [];
      list.push(position.id);
      children.set(parent, list);
    } else {
      tops.push(position.id);
    }
  }

  const holders = new Map<string, Person>();
  const people = new Map(state.people.map((person) => [person.id, person]));
  for (const assignment of state.assignments) {
    if (assignment.endDate !== null || holders.has(assignment.positionId)) continue;
    const person = people.get(assignment.personId);
    if (person) holders.set(assignment.positionId, person);
  }
  const grades = new Map(state.grades.map((grade) => [grade.id, grade]));
  const units = new Map(state.orgUnits.map((unit) => [unit.id, unit]));

  const seats = new Map<string, OrgSeat>();
  const order: string[] = [];
  const roots: string[] = [];
  const walk = (id: string, depth: number, parentId: string | null) => {
    if (seats.has(id)) return;
    const position = byId.get(id)!;
    seats.set(id, {
      position,
      depth,
      parentId,
      reports: [],
      holder: holders.get(id),
      grade: grades.get(position.gradeId),
      unit: units.get(position.orgUnitId),
    });
    order.push(id);
    for (const child of children.get(id) ?? []) {
      if (seats.has(child)) continue;
      seats.get(id)!.reports.push(child);
      walk(child, depth + 1, id);
    }
  };
  for (const id of tops) {
    roots.push(id);
    walk(id, 0, null);
  }
  // Positions caught in a reports-to loop are never reached from a top position; show each loop from its first member.
  for (const position of state.positions) {
    if (seats.has(position.id)) continue;
    roots.push(position.id);
    walk(position.id, 0, null);
  }
  return { seats, roots, order };
}

export function orgFacts(index: OrgIndex): { positions: number; filled: number; empty: number } {
  let filled = 0;
  for (const seat of index.seats.values()) if (seat.holder) filled += 1;
  return { positions: index.seats.size, filled, empty: index.seats.size - filled };
}

/** "Top levels only": every position with reports from `depth` down starts folded. */
export function defaultCollapsed(index: OrgIndex, depth = 2): Set<string> {
  const collapsed = new Set<string>();
  for (const seat of index.seats.values()) {
    if (seat.reports.length > 0 && seat.depth >= depth) collapsed.add(seat.position.id);
  }
  return collapsed;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** A seat matches on its title or on its holder's legal or preferred name, ignoring case. */
export function seatMatches(seat: OrgSeat, needle: string): boolean {
  if (!needle) return false;
  return [seat.position.title, seat.holder?.legalName, seat.holder?.preferredName].some(
    (text) => text && text.toLowerCase().includes(needle),
  );
}

/** Matching position ids in chart order, so next and previous walk the chart the way it reads. */
export function matchIds(index: OrgIndex, query: string): string[] {
  const needle = normalizeQuery(query);
  if (!needle) return [];
  return index.order.filter((id) => seatMatches(index.seats.get(id)!, needle));
}

/** Ancestors from the top position down to the direct parent. */
export function ancestorsOf(index: OrgIndex, id: string): string[] {
  const chain: string[] = [];
  let parent = index.seats.get(id)?.parentId ?? null;
  while (parent && !chain.includes(parent)) {
    chain.unshift(parent);
    parent = index.seats.get(parent)?.parentId ?? null;
  }
  return chain;
}

/** Every ancestor of the given positions: what must be open for them to show. */
export function pathTo(index: OrgIndex, ids: Iterable<string>): Set<string> {
  const path = new Set<string>();
  for (const id of ids) for (const ancestor of ancestorsOf(index, id)) path.add(ancestor);
  return path;
}

/** The fold state with the given positions opened. The original set is left alone, so clearing a search restores it. */
export function withExpanded(collapsed: ReadonlySet<string>, open: Iterable<string>): Set<string> {
  const next = new Set(collapsed);
  for (const id of open) next.delete(id);
  return next;
}

export function toggled(collapsed: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(collapsed);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export type OutlineRow = {
  seat: OrgSeat;
  /** Null when the row has no reports, or while a search decides what shows. */
  fold: "open" | "folded" | null;
  match: boolean;
};

/**
 * The outline as flat rows in chart order. Without a query it follows the fold state. With one it keeps
 * only matches and their ancestors, ancestors open, so each match is read with its reporting line.
 */
export function outlineRows(index: OrgIndex, collapsed: ReadonlySet<string>, query: string): OutlineRow[] {
  const needle = normalizeQuery(query);
  if (needle) {
    const matches = new Set(matchIds(index, query));
    const keep = pathTo(index, matches);
    for (const id of matches) keep.add(id);
    return index.order
      .filter((id) => keep.has(id))
      .map((id) => ({ seat: index.seats.get(id)!, fold: null, match: matches.has(id) }));
  }
  const rows: OutlineRow[] = [];
  const walk = (id: string) => {
    const seat = index.seats.get(id)!;
    const folded = collapsed.has(id);
    rows.push({ seat, fold: seat.reports.length === 0 ? null : folded ? "folded" : "open", match: false });
    if (!folded) for (const child of seat.reports) walk(child);
  };
  for (const root of index.roots) walk(root);
  return rows;
}

/** Positions a position may report to: never itself or one of its own reports, so the chart cannot loop. */
export function reportsToChoices(index: OrgIndex, positionId?: string): OrgSeat[] {
  const excluded = new Set<string>();
  if (positionId) {
    const stack = [positionId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (excluded.has(id)) continue;
      excluded.add(id);
      stack.push(...(index.seats.get(id)?.reports ?? []));
    }
  }
  return index.order.filter((id) => !excluded.has(id)).map((id) => index.seats.get(id)!);
}

export type OrgView = "tree" | "outline";

export const ORG_VIEW_KEY = "kmplus.org.view";

export function parseOrgView(value: string | null | undefined): OrgView | null {
  return value === "tree" || value === "outline" ? value : null;
}
