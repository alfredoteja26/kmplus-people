"use client";

import { plainOrgError } from "@/components/org/errors";

import { Button } from "@/components/coss/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/coss/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { AssignSeatSheet } from "@/components/org/AssignSeatSheet";
import { OrgOutline } from "@/components/org/OrgOutline";
import { OrgTree } from "@/components/org/OrgTree";
import type { NodeMark } from "@/components/org/OrgTreeNode";
import { PositionSheet, type PositionInput } from "@/components/org/PositionSheet";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { isHrLike, todayIso } from "@/lib/domain";
import { plural } from "@/lib/labels";
import {
  ancestorsOf,
  buildOrgIndex,
  defaultCollapsed,
  matchIds,
  normalizeQuery,
  ORG_VIEW_KEY,
  orgFacts,
  outlineRows,
  parseOrgView,
  pathTo,
  withExpanded,
  type OrgIndex,
  type OrgView,
} from "@/lib/org-view";
import { useStore } from "@/lib/store";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  ListTreeIcon,
  NetworkIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

type SheetState = { kind: "create" } | { kind: "edit"; positionId: string } | { kind: "assign"; positionId: string } | null;

/** The refusal createPosition gives when the signed-in role may not change positions. */
const HR_ONLY = "Only HR can change people, positions, and CV reviews";

/** The remembered view for this browser; otherwise the tree from the md breakpoint up and the outline on phones. */
function initialView(): OrgView {
  if (typeof window === "undefined") return "tree";
  try {
    const saved = parseOrgView(window.localStorage.getItem(ORG_VIEW_KEY));
    if (saved) return saved;
  } catch {
    /* storage blocked: fall back to the width */
  }
  return window.matchMedia("(min-width: 48rem)").matches ? "tree" : "outline";
}

function rememberView(view: OrgView) {
  try {
    window.localStorage.setItem(ORG_VIEW_KEY, view);
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}

/** Positions that must be open for a seat reporting to `parentId` to show. */
function lineAbove(index: OrgIndex, parentId: string | null): string[] {
  return parentId && index.seats.has(parentId) ? [...ancestorsOf(index, parentId), parentId] : [];
}

export default function OrgPage() {
  const { state, createPosition, updatePosition, assignPosition } = useStore();
  const hr = isHrLike(state.currentRole);
  const index = useMemo(() => buildOrgIndex(state), [state]);
  const facts = orgFacts(index);

  const [view, setView] = useState<OrgView>(initialView);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => defaultCollapsed(index));
  // Folds changed while a search is open; they win over the opened search path until the query changes.
  const [searchFolds, setSearchFolds] = useState<Map<string, boolean>>(() => new Map());
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  const needle = normalizeQuery(query);
  const matches = useMemo(() => matchIds(index, query), [index, query]);
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const path = useMemo(() => pathTo(index, matches), [index, matches]);
  const current = matches.length > 0 ? matches[Math.min(cursor, matches.length - 1)] : null;

  // The tree opens the path to every match without losing the folds the reader chose.
  const folded = useMemo(() => {
    if (!needle) return collapsed;
    const next = withExpanded(collapsed, path);
    for (const [id, isFolded] of searchFolds) {
      if (isFolded) next.add(id);
      else next.delete(id);
    }
    return next;
  }, [needle, collapsed, path, searchFolds]);

  const rows = useMemo(() => outlineRows(index, collapsed, query), [index, collapsed, query]);

  const markOf = (id: string): NodeMark => {
    if (matches.length === 0) return null;
    if (id === current) return "current";
    if (matchSet.has(id)) return "match";
    if (path.has(id)) return "path";
    return "dim";
  };

  function changeQuery(next: string) {
    setQuery(next);
    setCursor(0);
    setSearchFolds(new Map());
  }

  function step(by: number) {
    if (matches.length === 0) return;
    const at = matches.indexOf(current ?? "");
    setCursor((at + by + matches.length) % matches.length);
  }

  function toggle(id: string) {
    const nowFolded = !folded.has(id);
    if (needle) setSearchFolds((before) => new Map(before).set(id, nowFolded));
    setCollapsed((before) => {
      const next = new Set(before);
      if (nowFolded) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function foldTo(next: Set<string>) {
    setCollapsed(next);
    setSearchFolds(new Map());
  }

  /** After a save, open the line above the seat and bring it into view, so it never lands inside a folded branch. */
  function reveal(positionId: string, parentId: string | null) {
    setCollapsed((before) => withExpanded(before, lineAbove(index, parentId)));
    setRevealId(positionId);
  }

  const editing = sheet?.kind === "edit" ? index.seats.get(sheet.positionId)?.position : undefined;

  const createButton = hr ? (
    <Button type="button" onClick={() => setSheet({ kind: "create" })}>
      <PlusIcon aria-hidden="true" />
      Create position
    </Button>
  ) : null;

  const foldControls = (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => foldTo(new Set())}>
        <ChevronsUpDownIcon aria-hidden="true" />
        Expand all
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => foldTo(defaultCollapsed(index))}>
        <ChevronsDownUpIcon aria-hidden="true" />
        Top levels only
      </Button>
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium">Organization</h1>
          <p className="mt-1 mb-0 text-muted tabular-nums">
            {facts.positions === 0
              ? "Positions and who holds them."
              : `${plural(facts.positions, "position")} · ${facts.filled} filled · ${facts.empty} empty`}
          </p>
        </div>
        {facts.positions > 0 ? createButton : null}
      </header>

      {facts.positions === 0 ? (
        <div className="rounded-2xl bg-paper shadow-(--shadow)">
          <EmptyBlock
            icon={<NetworkIcon aria-hidden="true" />}
            title="No positions yet"
            description="The chart shows each position, who holds it, and who it reports to. It starts with the top position."
            action={createButton}
            note={hr ? undefined : "HR adds positions here."}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <InputGroup className="min-w-0 basis-full sm:max-w-80 sm:flex-1 sm:basis-auto">
              <InputGroupInput
                type="search"
                aria-label="Search positions or people"
                placeholder="Search positions or people"
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    step(event.shiftKey ? -1 : 1);
                  }
                }}
              />
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            {needle ? (
              <div className="flex items-center gap-1">
                <span role="status" className="text-sm text-muted tabular-nums">
                  {matches.length === 0
                    ? "No matches"
                    : view === "tree" && matches.length > 1
                      ? `${matches.indexOf(current ?? "") + 1} of ${plural(matches.length, "match", "matches")}`
                      : plural(matches.length, "match", "matches")}
                </span>
                {view === "tree" && matches.length > 1 ? (
                  <>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous match" title="Previous match (Shift+Enter)" onClick={() => step(-1)}>
                      <ChevronLeftIcon aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Next match" title="Next match (Enter)" onClick={() => step(1)}>
                      <ChevronRightIcon aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
            <ToggleGroup
              variant="outline"
              aria-label="Show the chart as"
              className="ms-auto"
              value={[view]}
              onValueChange={(value) => {
                const next = parseOrgView(value[0]);
                if (!next) return;
                setView(next);
                rememberView(next);
              }}
            >
              <ToggleGroupItem value="tree">
                <NetworkIcon aria-hidden="true" />
                Tree
              </ToggleGroupItem>
              <ToggleGroupItem value="outline">
                <ListTreeIcon aria-hidden="true" />
                Outline
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {view === "tree" ? (
            <OrgTree
              index={index}
              collapsed={folded}
              markOf={markOf}
              query={query}
              hr={hr}
              toolbar={foldControls}
              focusId={needle ? current : revealId}
              onToggle={toggle}
              onEdit={hr ? (positionId) => setSheet({ kind: "edit", positionId }) : undefined}
              onAssign={(positionId) => setSheet({ kind: "assign", positionId })}
            />
          ) : (
            <OrgOutline
              rows={rows}
              query={query}
              hr={hr}
              toolbar={foldControls}
              onToggle={toggle}
              onEdit={hr ? (positionId) => setSheet({ kind: "edit", positionId }) : undefined}
              onAssign={(positionId) => setSheet({ kind: "assign", positionId })}
              onClearSearch={() => changeQuery("")}
            />
          )}
        </>
      )}

      {hr && sheet?.kind === "create" ? (
        <PositionSheet
          state={state}
          index={index}
          onClose={() => setSheet(null)}
          onSave={(input: PositionInput) => {
            const positionId = createPosition(input);
            if (!positionId) return HR_ONLY;
            reveal(positionId, input.reportsToPositionId);
            return null;
          }}
        />
      ) : null}
      {hr && editing ? (
        <PositionSheet
          key={editing.id}
          state={state}
          index={index}
          position={editing}
          onClose={() => setSheet(null)}
          onSave={(input) => {
            const message = updatePosition(editing.id, input);
            if (message) return plainOrgError(message);
            reveal(editing.id, input.reportsToPositionId);
            return null;
          }}
        />
      ) : null}
      {hr && sheet?.kind === "assign" ? (
        <AssignSeatSheet
          key={sheet.positionId}
          state={state}
          index={index}
          positionId={sheet.positionId}
          onClose={() => setSheet(null)}
          onAssign={(personId) => {
            return plainOrgError(assignPosition(personId, sheet.positionId, todayIso())) || null;
          }}
        />
      ) : null}
    </div>
  );
}
