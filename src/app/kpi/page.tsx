"use client";

import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { kpiYearName, periodDueDate, periodLabel, remainingApprovers } from "@/components/kpi/kpi-copy";
import { PhaseFacts } from "@/components/kpi/PhaseFacts";
import { Button } from "@/components/coss/button";
import { Callout, Card, PageColumn, PageHeader } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { HealthBadge, StatusBadge } from "@/components/product/StatusBadge";
import { effectiveCadence, windowFor } from "@/lib/cadence";
import { isRootAssignment } from "@/lib/cascade";
import { blocksOwnCheckIn } from "@/lib/direct";
import {
  currentAssignments,
  itemHealth,
  itemsForSet,
  kpiSetForAssignment,
  positionById,
  readableKpiYear,
  todayIso,
  weightSum,
} from "@/lib/domain";
import { effectiveCheckInStatus, isPortfolioDualApproved, kpiYearPhase, portfolioApprovalGaps } from "@/lib/domain-query";
import { liveMonitoringScore, needsCheckInThisWindow, planningItemGap } from "@/lib/phase-desk";
import { useStore } from "@/lib/store";
import type { AppState, KpiCycle, KpiItem, KpiSet, KpiYearPhase } from "@/lib/types";
import { useState } from "react";

/**
 * What the owner can do with this KPI Portfolio right now. Copy only: the same domain queries
 * that gate editing and KPI Check-Ins decide which one applies.
 */
type PortfolioStep = "plan" | "waiting" | "approved" | "check-in" | "closed";

function portfolioStep(state: AppState, phase: KpiYearPhase | null, kpiSet: KpiSet): PortfolioStep {
  if (phase === "closed") return "closed";
  if (kpiSet.status === "draft" || kpiSet.status === "returned") return "plan";
  if (!isPortfolioDualApproved(state, kpiSet.id)) return "waiting";
  return phase === "monitoring" ? "check-in" : "approved";
}

export default function MyKpiPage() {
  const { state, submitKpiSet } = useStore();
  const cycle = readableKpiYear(state);
  const phase = cycle ? kpiYearPhase(cycle) : null;
  const assignments = currentAssignments(state, state.currentPersonId);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ itemId: string } | { add: true } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignment =
    assignments.find((row) => row.id === selectedAssignmentId) ??
    assignments.find((row) => (cycle ? kpiSetForAssignment(state, row.id, cycle.id) : undefined)) ??
    assignments[0];
  const kpiSet = cycle && assignment ? kpiSetForAssignment(state, assignment.id, cycle.id) : undefined;
  const items = kpiSet ? itemsForSet(state, kpiSet.id) : [];
  const sum = weightSum(items);
  const rootAssignment = assignment ? isRootAssignment(state, assignment.id) : false;
  const today = todayIso();

  if (!cycle) {
    return (
      <div>
        <PageHeader title="My KPI" />
        <Callout tone="warning">No KPI year is open yet. An Admin starts planning from KPI Admin.</Callout>
      </div>
    );
  }

  const yearName = kpiYearName(cycle);

  if (!assignment || !kpiSet) {
    return (
      <div>
        <PageHeader title="My KPI" description={yearName} />
        <Callout tone="warning">
          You don&apos;t have a KPI Portfolio for {yearName} yet. An Admin can create it from KPI Admin.
        </Callout>
      </div>
    );
  }

  const step = portfolioStep(state, phase, kpiSet);
  const canEdit = step === "plan";
  const score =
    phase === "monitoring" ? liveMonitoringScore(state, kpiSet.id) : phase === "closed" ? (kpiSet.score ?? null) : undefined;

  const ranked = [...items].sort((left, right) => {
    const leftRank = rowRank(step, state, cycle, left, rootAssignment, today);
    const rightRank = rowRank(step, state, cycle, right, rootAssignment, today);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.name.localeCompare(right.name);
  });

  const approvers = remainingApprovers(portfolioApprovalGaps(state, kpiSet.id), "you");
  const header: Record<PortfolioStep, { title: string; description: string }> = {
    plan: {
      title: "Plan your KPI Portfolio",
      description:
        kpiSet.status === "returned"
          ? `${yearName}. Your KPI Portfolio was returned. Make the changes, then submit it for approval again.`
          : `${yearName}. Add your KPIs, make the weights add up to 100%, then submit for approval.`,
    },
    waiting: {
      title: "Waiting for approval",
      description: approvers
        ? `${yearName}. You submitted your KPI Portfolio. It still needs approval from ${approvers}.`
        : `${yearName}. You submitted your KPI Portfolio. It is waiting for approval.`,
    },
    approved: {
      title: "KPI Portfolio approved",
      description: `${yearName}. KPI Check-Ins open when an Admin starts monitoring.`,
    },
    "check-in": {
      title: "KPI Check-In",
      description: `${yearName}. Enter your actual result for each KPI by the end of its period.`,
    },
    closed: {
      title: "KPI year closed",
      description: `${yearName} is closed. Your KPI Portfolio is view only.`,
    },
  };
  const { title, description } = header[step];

  return (
    <PageColumn className={sheet ? "lg:pr-[440px]" : undefined}>
      <PageHeader
        className="mb-0"
        title={title}
        description={description}
        actions={<StatusBadge status={kpiSet.status} />}
      />
      <PhaseFacts cycle={cycle} score={score} weight={canEdit ? sum : undefined} />
      <Card>
        {assignments.length > 1 ? (
          <Field label="Position" className="mb-4 max-w-sm">
            <Select
              value={assignment.id}
              onChange={(event) => {
                setSelectedAssignmentId(event.target.value);
                setSheet(null);
              }}
            >
              {assignments.map((row) => (
                <option key={row.id} value={row.id}>
                  {positionById(state, row.positionId)?.title ?? row.positionId}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {canEdit && kpiSet.returnComment ? (
          <Callout tone="warning" className="mb-4">
            <span className="font-medium">Comment from your approver:</span> {kpiSet.returnComment}
          </Callout>
        ) : null}
        {error ? (
          <Callout tone="danger" className="mb-4">
            {error}
          </Callout>
        ) : null}

        {items.length === 0 ? (
          <p className="m-0 text-sm text-muted">
            {canEdit ? "No KPIs yet. Add your first KPI, then set weights that add up to 100%." : "No KPIs on this KPI Portfolio."}
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-[12px] border border-line p-0">
            {ranked.map((item) => {
              const reason = rowReason(step, state, cycle, item, rootAssignment, today);
              const open = sheet !== null && "itemId" in sheet && sheet.itemId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-haspopup="dialog"
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                    onClick={() => setSheet({ itemId: item.id })}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{item.name}</span>
                      <span className="block text-sm text-muted">{reason}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums text-muted">{item.weight}%</span>
                      <HealthBadge health={itemHealth(state, item)} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {canEdit ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button variant="outline" type="button" onClick={() => setSheet({ add: true })}>
              Add KPI
            </Button>
            <Button
              type="button"
              disabled={sum !== 100}
              onClick={() => {
                setError(submitKpiSet(kpiSet.id));
              }}
            >
              Submit for approval
            </Button>
          </div>
        ) : null}
      </Card>

      {sheet ? (
        <KpiDetailSheet
          kpiSetId={kpiSet.id}
          initialItemId={"itemId" in sheet ? sheet.itemId : null}
          adding={"add" in sheet}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </PageColumn>
  );
}

function rowRank(step: PortfolioStep, state: AppState, cycle: KpiCycle, item: KpiItem, rootAssignment: boolean, today: string) {
  if (step === "check-in") {
    if (blocksOwnCheckIn(state, item)) return 2;
    return needsCheckInThisWindow(state, cycle, item, today) ? 0 : 1;
  }
  if (step === "plan") return planningItemGap(item, rootAssignment) ? 0 : 1;
  return 0;
}

function rowReason(step: PortfolioStep, state: AppState, cycle: KpiCycle, item: KpiItem, rootAssignment: boolean, today: string) {
  const target = `Target ${item.target} ${item.unit}`.trim();
  if (step === "plan") return planningItemGap(item, rootAssignment) ?? target;
  if (step !== "check-in") return target;
  if (blocksOwnCheckIn(state, item)) return "Adds up from its Direct child KPIs";
  const windowId = windowFor(today, effectiveCadence(cycle, item));
  if (needsCheckInThisWindow(state, cycle, item, today)) return `KPI Check-In due by ${periodDueDate(windowId)}`;
  const pending = state.checkIns.some(
    (row) => row.kpiItemId === item.id && row.window === windowId && effectiveCheckInStatus(row) === "pending",
  );
  return pending
    ? `KPI Check-In for ${periodLabel(windowId)} waiting for approval`
    : `Checked in for ${periodLabel(windowId)}`;
}
