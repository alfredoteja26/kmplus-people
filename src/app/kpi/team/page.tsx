"use client";

import { TeamKpiDraftReview } from "@/components/kpi/team/TeamKpiDraftReview";
import { Button } from "@/components/ui/Button";
import { Callout, PageHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { HealthBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import {
  currentAssignment,
  isHrLike,
  itemsForSet,
  kpiSetForAssignment,
  openCycle,
  personById,
  positionById,
  setHealth,
  teamPersonIds,
  weightSum,
} from "@/lib/domain";
import { useStore } from "@/lib/store";
import type { AppState, KpiItem } from "@/lib/types";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

function hrRosterPersonIds(state: AppState): string[] {
  const ids = new Set<string>();
  for (const assignment of state.assignments) {
    if (assignment.endDate === null) ids.add(assignment.personId);
  }
  return [...ids].sort((a, b) => {
    const left = personById(state, a)?.legalName ?? "";
    const right = personById(state, b)?.legalName ?? "";
    return left.localeCompare(right);
  });
}

export default function TeamKpiPage() {
  const { state, agreeKpiSet, returnKpiSet, upsertKpiItem } = useStore();
  const cycle = openCycle(state);
  const hr = isHrLike(state.currentRole);
  const personIds = useMemo(
    () => (hr ? hrRosterPersonIds(state) : teamPersonIds(state, state.currentPersonId)),
    [hr, state],
  );
  const [comments, setComments] = useState<Record<string, string>>({});
  const [agreeErrors, setAgreeErrors] = useState<Record<string, string>>({});
  const [expandedSetIds, setExpandedSetIds] = useState<Record<string, boolean>>({});

  if (state.currentRole === "employee") {
    return <Callout tone="warning">Team KPI is for managers and HR.</Callout>;
  }

  if (!cycle) {
    return (
      <div>
        <PageHeader title="Team KPI" />
        <Callout tone="warning">No open cycle.</Callout>
      </div>
    );
  }

  const rows = personIds
    .map((personId) => {
      const person = personById(state, personId);
      const assignment = currentAssignment(state, personId);
      const kpiSet = assignment ? kpiSetForAssignment(state, assignment.id, cycle.id) : undefined;
      const position = assignment ? positionById(state, assignment.positionId) : undefined;
      const items = kpiSet ? itemsForSet(state, kpiSet.id) : [];
      return { person, assignment, kpiSet, position, items };
    })
    .filter((row) => row.person);

  const emptyTeam = !hr && rows.length === 0;

  function toggleReview(kpiSetId: string) {
    setExpandedSetIds((prev) => ({ ...prev, [kpiSetId]: !prev[kpiSetId] }));
  }

  function saveItemForSet(patch: Omit<KpiItem, "tenantId">) {
    upsertKpiItem(patch);
    setAgreeErrors((prev) => {
      const next = { ...prev };
      delete next[patch.kpiSetId];
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        kicker={cycle.name}
        title="Team KPI"
        description="Agree or return each report’s draft. Active sets show health from rolled Direct actuals (same rules as My KPI)."
      />
      {emptyTeam ? (
        <Callout>No one reports into your current position this cycle. When reports appear, their KpiSets show here.</Callout>
      ) : null}
      {!emptyTeam ? (
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Position</Th>
              <Th>KpiSet status</Th>
              <Th>Weights</Th>
              <Th>Health</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const person = row.person!;
              const kpiSet = row.kpiSet;
              const awaiting =
                kpiSet && (kpiSet.status === "draft" || kpiSet.status === "returned");
              const monitoring =
                kpiSet && (kpiSet.status === "active" || kpiSet.status === "agreed");
              const expanded = kpiSet ? Boolean(expandedSetIds[kpiSet.id]) : false;

              return (
                <Fragment key={person.id}>
                  <tr>
                    <Td>
                      <Link href={`/people/${person.id}`}>{person.legalName}</Link>
                    </Td>
                    <Td>{row.position?.title ?? "—"}</Td>
                    <Td>{kpiSet ? <StatusBadge status={kpiSet.status} /> : "No KpiSet"}</Td>
                    <Td>{kpiSet ? `${weightSum(row.items)}%` : "—"}</Td>
                    <Td>{kpiSet ? <HealthBadge health={setHealth(state, kpiSet)} /> : "—"}</Td>
                    <Td>
                      {awaiting ? (
                        <div className="flex min-w-[16rem] flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => toggleReview(kpiSet!.id)}
                              aria-expanded={expanded}
                            >
                              {expanded ? "Hide items" : "Review items"}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                const message = agreeKpiSet(kpiSet!.id);
                                setAgreeErrors((prev) => ({
                                  ...prev,
                                  [kpiSet!.id]: message ?? "",
                                }));
                              }}
                            >
                              Agree
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              className="min-w-[12rem] flex-1"
                              placeholder="Return comment"
                              aria-label={`Return comment for ${person.legalName}`}
                              value={comments[kpiSet!.id] ?? ""}
                              onChange={(event) =>
                                setComments((prev) => ({ ...prev, [kpiSet!.id]: event.target.value }))
                              }
                            />
                            <Button
                              variant="secondary"
                              type="button"
                              onClick={() =>
                                returnKpiSet(kpiSet!.id, comments[kpiSet!.id]?.trim() || "Please revise")
                              }
                            >
                              Return
                            </Button>
                          </div>
                          {agreeErrors[kpiSet!.id] ? (
                            <p className="text-sm text-danger" role="alert">
                              {agreeErrors[kpiSet!.id]}
                            </p>
                          ) : null}
                        </div>
                      ) : monitoring ? (
                        <span className="text-sm text-muted">Active</span>
                      ) : null}
                    </Td>
                  </tr>
                  {awaiting && expanded && kpiSet && row.assignment ? (
                    <tr>
                      <td colSpan={6} className="border-b border-line bg-canvas px-3 py-2.5 text-sm">
                        <TeamKpiDraftReview
                          state={state}
                          cycleId={cycle.id}
                          kpiSet={kpiSet}
                          assignmentId={row.assignment.id}
                          items={row.items}
                          onSaveItem={saveItemForSet}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      ) : null}
    </div>
  );
}
