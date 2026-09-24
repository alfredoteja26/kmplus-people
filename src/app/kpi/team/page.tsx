"use client";

import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { PhaseFacts } from "@/components/kpi/PhaseFacts";
import { Callout, PageColumn, PageHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  isHrLike,
  itemsForSet,
  kpiSetForAssignment,
  lineManagerReportAssignments,
  openCycle,
  personById,
  portfolioApprovalWaitingCopy,
  positionById,
} from "@/lib/domain";
import { canAgreeOrReturnCheckIn, effectiveCheckInStatus, kpiYearPhase, personIdForCheckIn } from "@/lib/domain-query";
import { useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { useMemo, useState } from "react";

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
  const { state } = useStore();
  const cycle = openCycle(state);
  const hr = isHrLike(state.currentRole);
  const rosterAssignments = useMemo(
    () => (hr ? hrRosterAssignments(state) : lineManagerReportAssignments(state, state.currentPersonId)),
    [hr, state],
  );
  const [openSetId, setOpenSetId] = useState<string | null>(null);

  if (state.currentRole === "employee") {
    return <Callout tone="warning">Team KPI is for managers and HR.</Callout>;
  }

  if (!cycle) {
    return (
      <div>
        <PageHeader title="Team" description="No KPI year is in planning or monitoring." />
        <Callout tone="warning">No KPI year is in planning or monitoring.</Callout>
      </div>
    );
  }

  const phase = kpiYearPhase(cycle);
  const rows = rosterAssignments
    .map((assignment) => {
      const person = personById(state, assignment.personId);
      const kpiSet = kpiSetForAssignment(state, assignment.id, cycle.id);
      const position = positionById(state, assignment.positionId);
      const items = kpiSet ? itemsForSet(state, kpiSet.id) : [];
      return { person, assignment, kpiSet, position, items };
    })
    .filter((row) => row.person)
    .sort((left, right) => rank(state, left.kpiSet?.id, left.kpiSet?.status) - rank(state, right.kpiSet?.id, right.kpiSet?.status));

  const emptyTeam = !hr && rows.length === 0;
  const title = phase === "planning" ? "Agree portfolios" : phase === "monitoring" ? "Review check-ins" : "Team";
  const description =
    phase === "planning"
      ? `${cycle.name}. Open a person to agree or return their KPI portfolio.`
      : phase === "monitoring"
        ? `${cycle.name}. Open a person to agree or return a check-in.`
        : cycle.name;

  return (
    <PageColumn className={openSetId ? "lg:pr-[440px]" : undefined}>
      <PageHeader className="mb-0" title={title} description={description} />
      <PhaseFacts cycle={cycle} />
      {emptyTeam ? (
        <Callout>No one reports into your current position this KPI year. When reports appear, their KPI portfolios show here.</Callout>
      ) : (
        <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-[16px] border-[1.5px] border-line bg-paper p-0">
          {rows.map((row) => {
            const person = row.person!;
            const reason = queueReason(state, row.kpiSet?.id, row.kpiSet?.status);
            const waiting = row.kpiSet ? portfolioApprovalWaitingCopy(state, row.kpiSet.id) : null;
            if (!row.kpiSet) {
              return (
                <li key={row.assignment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block font-medium">{person.legalName}</span>
                    <span className="block text-sm text-muted">{row.position?.title ?? "—"} · No KPI portfolio</span>
                  </span>
                </li>
              );
            }
            return (
              <li key={row.assignment.id}>
                <button
                  type="button"
                  aria-expanded={openSetId === row.kpiSet.id}
                  aria-haspopup="dialog"
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  onClick={() => setOpenSetId(row.kpiSet!.id)}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{person.legalName}</span>
                    <span className="block text-sm text-muted">
                      {row.position?.title ?? "—"} · {waiting ?? reason}
                    </span>
                  </span>
                  <StatusBadge status={row.kpiSet.status} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {openSetId ? <KpiDetailSheet kpiSetId={openSetId} onClose={() => setOpenSetId(null)} /> : null}
    </PageColumn>
  );
}

function rank(state: AppState, kpiSetId: string | undefined, status: string | undefined) {
  if (!kpiSetId || !status) return 5;
  const waitingCheckIn = state.checkIns.some(
    (row) =>
      effectiveCheckInStatus(row) === "pending" &&
      canAgreeOrReturnCheckIn(state, row.id) &&
      personIdForCheckIn(state, row.id) &&
      state.kpiItems.some((item) => item.id === row.kpiItemId && item.kpiSetId === kpiSetId),
  );
  if (waitingCheckIn || status === "pending") return 0;
  if (status === "returned") return 1;
  if (status === "draft") return 2;
  return 3;
}

function queueReason(state: AppState, kpiSetId: string | undefined, status: string | undefined) {
  if (!status) return "No KPI portfolio";
  const waitingCheckIn =
    kpiSetId &&
    state.checkIns.some(
      (row) =>
        effectiveCheckInStatus(row) === "pending" &&
        canAgreeOrReturnCheckIn(state, row.id) &&
        state.kpiItems.some((item) => item.id === row.kpiItemId && item.kpiSetId === kpiSetId),
    );
  if (waitingCheckIn) return "Check-in waiting";
  if (status === "pending") return "Waiting for agree or return";
  if (status === "returned") return "Returned";
  if (status === "draft") return "Draft";
  if (status === "approved") return "Approved";
  if (status === "scored") return "Scored";
  return status;
}
