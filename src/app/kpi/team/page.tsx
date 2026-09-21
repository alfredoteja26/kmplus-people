"use client";

import { TeamKpiDraftReview } from "@/components/kpi/team/TeamKpiDraftReview";
import { Button } from "@/components/ui/Button";
import { Callout, PageHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { HealthBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import {
  isHrLike,
  itemsForSet,
  kpiSetForAssignment,
  lineManagerReportAssignments,
  openCycle,
  personById,
  positionById,
  setHealth,
  portfolioApprovalWaitingCopy,
  weightSum,
} from "@/lib/domain";
import { canAgreeOrReturnCheckIn, effectiveCheckInStatus, personIdForCheckIn } from "@/lib/domain-query";
import { useStore } from "@/lib/store";
import type { AppState, KpiItem } from "@/lib/types";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

function hrRosterAssignments(state: AppState) {
  return state.assignments
    .filter((row) => row.endDate === null)
    .sort((left, right) => {
      const leftName = personById(state, left.personId)?.legalName ?? "";
      const rightName = personById(state, right.personId)?.legalName ?? "";
      return leftName.localeCompare(rightName);
    });
}

export default function TeamKpiPage() {
  const { state, agreeKpiSet, returnKpiSet, upsertKpiItem, agreeCheckIn, returnCheckIn } = useStore();
  const cycle = openCycle(state);
  const hr = isHrLike(state.currentRole);
  const rosterAssignments = useMemo(
    () => (hr ? hrRosterAssignments(state) : lineManagerReportAssignments(state, state.currentPersonId)),
    [hr, state],
  );
  const [comments, setComments] = useState<Record<string, string>>({});
  const [checkInComments, setCheckInComments] = useState<Record<string, string>>({});
  const [agreeErrors, setAgreeErrors] = useState<Record<string, string>>({});
  const [expandedSetIds, setExpandedSetIds] = useState<Record<string, boolean>>({});

  if (state.currentRole === "employee") {
    return <Callout tone="warning">Team KPI is for managers and HR.</Callout>;
  }

  if (!cycle) {
    return (
      <div>
        <PageHeader title="Team KPI" />
        <Callout tone="warning">No KpiYear in KpiPlanning or KpiMonitoring.</Callout>
      </div>
    );
  }

  const rows = rosterAssignments
    .map((assignment) => {
      const person = personById(state, assignment.personId);
      const kpiSet = kpiSetForAssignment(state, assignment.id, cycle.id);
      const position = positionById(state, assignment.positionId);
      const items = kpiSet ? itemsForSet(state, kpiSet.id) : [];
      return { person, assignment, kpiSet, position, items };
    })
    .filter((row) => row.person);

  const emptyTeam = !hr && rows.length === 0;
  const actionableCheckIns = state.checkIns.filter(
    (row) => effectiveCheckInStatus(row) === "pending" && canAgreeOrReturnCheckIn(state, row.id),
  );

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
        <Callout>No one reports into your current position this KpiYear. When reports appear, their KPI Portfolios show here.</Callout>
      ) : null}
      {actionableCheckIns.length > 0 ? (
        <Callout tone="accent" className="mb-4">
          <p className="m-0 mb-2 font-medium">Pending KPI Check-Ins</p>
          <ul className="m-0 list-none space-y-3 p-0">
            {actionableCheckIns.map((checkIn) => {
              const item = state.kpiItems.find((row) => row.id === checkIn.kpiItemId);
              const ownerPersonId = personIdForCheckIn(state, checkIn.id);
              const owner = ownerPersonId ? personById(state, ownerPersonId) : undefined;
              return (
                <li key={checkIn.id} className="border-t border-line pt-2 first:border-0 first:pt-0">
                  <p className="m-0 text-sm">
                    {owner?.legalName ?? "Person"} · {item?.name ?? "KpiItem"} · {checkIn.window}: actual {checkIn.actual}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={() => agreeCheckIn(checkIn.id)}>
                      Agree Check-In
                    </Button>
                    <Input
                      className="min-w-[12rem] flex-1"
                      placeholder="Return comment"
                      aria-label={`Return comment for Check-In ${checkIn.id}`}
                      value={checkInComments[checkIn.id] ?? ""}
                      onChange={(event) =>
                        setCheckInComments((prev) => ({ ...prev, [checkIn.id]: event.target.value }))
                      }
                    />
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() =>
                        returnCheckIn(checkIn.id, checkInComments[checkIn.id]?.trim() || "Please revise")
                      }
                    >
                      Return
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Callout>
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
              const draftReview =
                kpiSet && (kpiSet.status === "draft" || kpiSet.status === "returned");
              const awaitingApproval = kpiSet && kpiSet.status === "pending";
              const monitoring = kpiSet && kpiSet.status === "approved";
              const approvalWaiting = kpiSet ? portfolioApprovalWaitingCopy(state, kpiSet.id) : null;
              const expanded = kpiSet ? Boolean(expandedSetIds[kpiSet.id]) : false;

              return (
                <Fragment key={row.assignment.id}>
                  <tr>
                    <Td>
                      <Link href={`/people/${person.id}`}>{person.legalName}</Link>
                    </Td>
                    <Td>{row.position?.title ?? "—"}</Td>
                    <Td>
                      {kpiSet ? (
                        <div className="space-y-1">
                          <StatusBadge status={kpiSet.status} />
                          {approvalWaiting ? (
                            <p className="m-0 text-xs text-muted">{approvalWaiting}</p>
                          ) : null}
                        </div>
                      ) : (
                        "No KpiSet"
                      )}
                    </Td>
                    <Td>{kpiSet ? `${weightSum(row.items)}%` : "—"}</Td>
                    <Td>{kpiSet ? <HealthBadge health={setHealth(state, kpiSet)} /> : "—"}</Td>
                    <Td>
                      {awaitingApproval || draftReview ? (
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
                            {awaitingApproval ? (
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
                            ) : null}
                          </div>
                          {awaitingApproval ? (
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
                          ) : null}
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
                  {(awaitingApproval || draftReview) && expanded && kpiSet && row.assignment ? (
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
