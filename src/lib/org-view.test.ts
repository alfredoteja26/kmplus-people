import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import {
  ancestorsOf,
  buildOrgIndex,
  defaultCollapsed,
  matchIds,
  orgFacts,
  outlineRows,
  parseOrgView,
  pathTo,
  reportsToChoices,
  toggled,
  withExpanded,
} from "./org-view";
import type { AppState, Position } from "./types";

const seat = (id: string, title: string, reportsTo: string | null): Position => ({
  id,
  tenantId: "kmplus",
  title,
  gradeId: "g",
  orgUnitId: "u",
  reportsToPositionId: reportsTo,
});

/**
 * ceo
 * ├─ cto
 * │  └─ lead
 * │     └─ dev
 * └─ cfo
 * chair (a second top position)
 */
function chart(): AppState {
  const base = createInitialState();
  const person = base.people[0];
  return {
    ...base,
    grades: [{ id: "g", tenantId: "kmplus", code: "G7", name: "Senior" }],
    orgUnits: [{ id: "u", tenantId: "kmplus", name: "Delivery", parentId: null }],
    people: [
      { ...person, id: "p-ana", legalName: "Ana Wijaya", preferredName: "Ana" },
      { ...person, id: "p-budi", legalName: "Budi Santoso", preferredName: "" },
    ],
    positions: [
      seat("ceo", "Managing Director", null),
      seat("cto", "Technology Director", "ceo"),
      seat("lead", "Engineering Lead", "cto"),
      seat("dev", "Software Engineer", "lead"),
      seat("cfo", "Finance Director", "ceo"),
      seat("chair", "Board Chair", null),
    ],
    assignments: [
      { id: "a1", tenantId: "kmplus", personId: "p-ana", positionId: "ceo", startDate: "2026-01-01", endDate: null },
      { id: "a2", tenantId: "kmplus", personId: "p-budi", positionId: "dev", startDate: "2026-01-01", endDate: null },
      { id: "a3", tenantId: "kmplus", personId: "p-budi", positionId: "cfo", startDate: "2025-01-01", endDate: "2025-12-31" },
    ],
  };
}

describe("org view", () => {
  it("reads the chart from reports-to, keeps every top position, and counts filled seats from current Assignments", () => {
    const index = buildOrgIndex(chart());
    expect(index.roots).toEqual(["ceo", "chair"]);
    expect(index.order).toEqual(["ceo", "cto", "lead", "dev", "cfo", "chair"]);
    expect(index.seats.get("ceo")!.reports).toEqual(["cto", "cfo"]);
    expect(index.seats.get("dev")!.depth).toBe(3);
    expect(index.seats.get("ceo")!.holder?.id).toBe("p-ana");
    expect(index.seats.get("cfo")!.holder).toBeUndefined();
    expect(index.seats.get("ceo")!.grade?.code).toBe("G7");
    expect(orgFacts(index)).toEqual({ positions: 6, filled: 2, empty: 4 });
  });

  it("never drops a seat whose reports-to is missing or loops", () => {
    const state = chart();
    state.positions.push(seat("orphan", "Orphan", "gone"), seat("x", "X", "y"), seat("y", "Y", "x"));
    const index = buildOrgIndex(state);
    expect(index.roots).toEqual(["ceo", "chair", "orphan", "x"]);
    expect(index.seats.get("x")!.reports).toEqual(["y"]);
    expect(index.seats.size).toBe(9);
  });

  it("folds positions with reports from the third level down for top levels only", () => {
    expect([...defaultCollapsed(buildOrgIndex(chart()))]).toEqual(["lead"]);
  });

  it("matches title or holder name in chart order, ignoring case", () => {
    const index = buildOrgIndex(chart());
    expect(matchIds(index, "director")).toEqual(["ceo", "cto", "cfo"]);
    expect(matchIds(index, "  BUDI ")).toEqual(["dev"]);
    expect(matchIds(index, "ana")).toEqual(["ceo"]);
    expect(matchIds(index, " ")).toEqual([]);
  });

  it("opens the path from the top position to a match without touching the saved fold state", () => {
    const index = buildOrgIndex(chart());
    expect(ancestorsOf(index, "dev")).toEqual(["ceo", "cto", "lead"]);
    const collapsed = new Set(["cto", "lead", "cfo"]);
    const open = withExpanded(collapsed, pathTo(index, ["dev"]));
    expect([...open]).toEqual(["cfo"]);
    expect([...collapsed]).toEqual(["cto", "lead", "cfo"]);
    expect([...toggled(open, "cfo")]).toEqual([]);
  });

  it("flattens the outline by fold state, and under a search keeps matches with their ancestors", () => {
    const index = buildOrgIndex(chart());
    const folded = outlineRows(index, new Set(["cto"]), "");
    expect(folded.map((row) => [row.seat.position.id, row.fold])).toEqual([
      ["ceo", "open"],
      ["cto", "folded"],
      ["cfo", null],
      ["chair", null],
    ]);
    const searched = outlineRows(index, new Set(["cto", "lead"]), "software");
    expect(searched.map((row) => [row.seat.position.id, row.match])).toEqual([
      ["ceo", false],
      ["cto", false],
      ["lead", false],
      ["dev", true],
    ]);
  });

  it("offers every position as reports-to except itself and its own reports", () => {
    const index = buildOrgIndex(chart());
    expect(reportsToChoices(index, "cto").map((row) => row.position.id)).toEqual(["ceo", "cfo", "chair"]);
    expect(reportsToChoices(index).length).toBe(6);
  });

  it("reads a remembered view and ignores anything else", () => {
    expect(parseOrgView("outline")).toBe("outline");
    expect(parseOrgView("grid")).toBeNull();
    expect(parseOrgView(null)).toBeNull();
  });
});
