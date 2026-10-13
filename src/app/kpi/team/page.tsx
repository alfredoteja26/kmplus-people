"use client";

import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { approvalWaitingText, kpiYearName } from "@/components/kpi/kpi-copy";
import { PhaseFacts } from "@/components/kpi/PhaseFacts";
import { Callout, PageColumn, PageHeader } from "@/components/product/Card";
import { StatusBadge } from "@/components/product/StatusBadge";
import {
  isHrLike,
  itemsForSet,
  kpiSetForAssignment,
  lineManagerReportAssignments,
  openCycle,
  personById,
  positionById,
} from "@/lib/domain";
import {
  canAgreeOrReturnCheckIn,
  canAgreeOrReturnKpiPortfolio,
  checkInApprovalGaps,
  effectiveCheckInStatus,
  hasAdminGrant,
  isLineManagerForKpiSet,
  personIdForCheckIn,
  portfolioApprovalGaps,
} from "@/lib/domain-query";
import { plural, statusLabel } from "@/lib/labels";
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
    return (
      <div>
        <PageHeader title="Team KPIs" />
        <Callout tone="warning">Team KPIs are for Line Managers and HR. Your own KPIs are on My KPI.</Callout>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div>
        <PageHeader title="Team KPIs" />
        <Callout tone="warning">No KPI year is in planning or monitoring. An Admin starts one from KPI Admin.</Callout>
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
    .filter((row) => row.person)
    .sort((left, right) => rank(state, left.kpiSet?.id, left.kpiSet?.status) - rank(state, right.kpiSet?.id, right.kpiSet?.status));

  const emptyTeam = !hr && rows.length === 0;
  const portfoliosToApprove = rows.filter(
    (row) => row.kpiSet?.status === "pending" && portfolioNeedsMe(state, row.kpiSet.id),
  ).length;
  const checkInsToApprove = rows.reduce((count, row) => count + (row.kpiSet ? checkInsWaiting(state, row.kpiSet.id) : 0), 0);
  const queued = [
    portfoliosToApprove > 0 ? plural(portfoliosToApprove, "KPI Portfolio") : null,
    checkInsToApprove > 0 ? plural(checkInsToApprove, "KPI Check-In") : null,
  ].filter(Boolean);
  const description = queued.length
    ? `${kpiYearName(cycle)}. Waiting for your approval: ${queued.join(" and ")}. Open a person to approve or return.`
    : `${kpiYearName(cycle)}. Nothing is waiting for your approval.`;

  return (
    <PageColumn className={openSetId ? "lg:pr-[440px]" : undefined}>
      <PageHeader className="mb-0" title="Team KPIs" description={description} />
      <PhaseFacts cycle={cycle} />
      {emptyTeam ? (
        <Callout>No one reports to your position in {kpiYearName(cycle)}. Their KPI Portfolios will appear here when they do.</Callout>
      ) : (
        <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-paper p-0">
          {rows.map((row) => {
            const person = row.person!;
            const reason = queueReason(state, row.kpiSet?.id, row.kpiSet?.status);
            const waiting =
              row.kpiSet?.status === "pending" && !portfolioNeedsMe(state, row.kpiSet.id)
                ? approvalWaitingText(portfolioApprovalGaps(state, row.kpiSet.id))
                : null;
            if (!row.kpiSet) {
              return (
                <li key={row.assignment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block font-medium">{person.legalName}</span>
                    <span className="block text-sm text-muted">{row.position?.title ?? "—"} · No KPI Portfolio</span>
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

/** True when the viewer may approve this pending KPI Portfolio and has not stamped it yet. */
function portfolioNeedsMe(state: AppState, kpiSetId: string) {
  if (!canAgreeOrReturnKpiPortfolio(state, kpiSetId)) return false;
  const gaps = portfolioApprovalGaps(state, kpiSetId);
  return (hasAdminGrant(state) && gaps.needsAdmin) || (isLineManagerForKpiSet(state, kpiSetId) && gaps.needsLineManager);
}

/** Pending KPI Check-Ins on this KPI Portfolio that still need the viewer's approval. */
function checkInsWaiting(state: AppState, kpiSetId: string) {
  return state.checkIns.filter((row) => {
    if (effectiveCheckInStatus(row) !== "pending" || !canAgreeOrReturnCheckIn(state, row.id)) return false;
    if (!state.kpiItems.some((item) => item.id === row.kpiItemId && item.kpiSetId === kpiSetId)) return false;
    const gaps = checkInApprovalGaps(state, row.id);
    return (hasAdminGrant(state) && gaps.needsAdmin) || (isLineManagerForKpiSet(state, kpiSetId) && gaps.needsLineManager);
  }).length;
}

function queueReason(state: AppState, kpiSetId: string | undefined, status: string | undefined) {
  if (!kpiSetId || !status) return "No KPI Portfolio";
  const waitingCheckIns = checkInsWaiting(state, kpiSetId);
  if (waitingCheckIns > 0) return `${plural(waitingCheckIns, "KPI Check-In")} to approve`;
  if (status === "pending" && portfolioNeedsMe(state, kpiSetId)) return "KPI Portfolio to approve";
  if (status === "returned") return "Returned for changes";
  if (status === "draft") return "Draft, not submitted yet";
  if (status === "approved") return "KPI Portfolio approved";
  if (status === "scored") return "Scored";
  return statusLabel(status);
}
