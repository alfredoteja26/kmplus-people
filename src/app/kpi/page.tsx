"use client";

import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { PhaseFacts } from "@/components/kpi/PhaseFacts";
import { Button } from "@/components/ui/Button";
import { Callout, Card, PageColumn, PageHeader } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Input";
import { HealthBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { isRootAssignment } from "@/lib/cascade";
import { blocksOwnCheckIn } from "@/lib/direct";
import {
  currentAssignments,
  itemHealth,
  itemsForSet,
  kpiSetForAssignment,
  portfolioApprovalWaitingCopy,
  positionById,
  readableKpiYear,
  todayIso,
  weightSum,
} from "@/lib/domain";
import { kpiYearPhase } from "@/lib/domain-query";
import { liveMonitoringScore, needsCheckInThisWindow, planningItemGap } from "@/lib/phase-desk";
import { useStore } from "@/lib/store";
import { useState } from "react";

export default function MyKpiPage() {
  const { state, submitKpiSet } = useStore();
  const cycle = readableKpiYear(state);
  const yearClosed = Boolean(cycle && kpiYearPhase(cycle) === "closed");
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
  const canEdit = Boolean(!yearClosed && kpiSet && (kpiSet.status === "draft" || kpiSet.status === "returned"));
  const rootAssignment = assignment ? isRootAssignment(state, assignment.id) : false;
  const today = todayIso();

  if (!cycle) {
    return (
      <div>
        <PageHeader title="My KPI" description="Weighted KPIs and check-ins for the current KPI year." />
        <Callout tone="warning">No KPI year to show. An admin starts planning on KPI Admin first.</Callout>
      </div>
    );
  }

  if (!assignment || !kpiSet) {
    return (
      <div>
        <PageHeader title="My KPI" description={cycle.name} />
        <Callout tone="warning">
          No KPI portfolio on your current seat for {cycle.name}. An admin can draft missing portfolios from KPI Admin.
        </Callout>
      </div>
    );
  }

  const approvalWaiting = portfolioApprovalWaitingCopy(state, kpiSet.id);
  const score =
    phase === "monitoring" ? liveMonitoringScore(state, kpiSet.id) : phase === "closed" ? (kpiSet.score ?? null) : undefined;

  const ranked = [...items].sort((left, right) => {
    const leftRank = rowRank(phase, state, cycle, left, rootAssignment, today);
    const rightRank = rowRank(phase, state, cycle, right, rootAssignment, today);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.name.localeCompare(right.name);
  });

  const title = phase === "planning" ? "Submit portfolio" : phase === "monitoring" ? "Check in" : "My KPI";
  const description =
    phase === "planning"
      ? `${cycle.name}. Finish each KPI, then submit the portfolio for your line manager and an Admin.`
      : phase === "monitoring"
        ? `${cycle.name}. Record the actual against the target for this window.`
        : `${cycle.name}. This KPI year is closed.`;

  const canSubmit = sum === 100;

  return (
    <PageColumn className={sheet ? "lg:pr-[440px]" : undefined}>
      <PageHeader
        className="mb-0"
        title={title}
        description={description}
        actions={<StatusBadge status={kpiSet.status} />}
      />
      <PhaseFacts cycle={cycle} score={score} weight={sum} />
      <Card>
        {assignments.length > 1 ? (
          <Field label="KPI Portfolio seat" className="mb-4 max-w-sm">
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
        {kpiSet.returnComment ? (
          <Callout tone="warning" className="mb-4">
            <span className="font-medium">Returned for revision.</span> {kpiSet.returnComment}
          </Callout>
        ) : null}
        {approvalWaiting ? (
          <Callout tone="accent" className="mb-4">
            <span className="font-medium">KPI Portfolio in review.</span> {approvalWaiting}
          </Callout>
        ) : null}
        {error ? (
          <Callout tone="danger" className="mb-4">
            {error}
          </Callout>
        ) : null}

        {items.length === 0 ? (
          <p className="m-0 text-sm text-muted">No KPIs yet. Add the first one, then bring the weights to 100%.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-[12px] border-[1.5px] border-line p-0">
            {ranked.map((item) => {
              const reason = rowReason(phase, state, cycle, item, rootAssignment, today);
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
            <Button variant="secondary" type="button" onClick={() => setSheet({ add: true })}>
              Add KPI
            </Button>
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                setError(submitKpiSet(kpiSet.id));
              }}
            >
              Submit portfolio
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

function rowRank(
  phase: ReturnType<typeof kpiYearPhase>,
  state: Parameters<typeof needsCheckInThisWindow>[0],
  cycle: Parameters<typeof needsCheckInThisWindow>[1],
  item: Parameters<typeof planningItemGap>[0],
  rootAssignment: boolean,
  today: string,
) {
  if (phase === "monitoring") {
    if (blocksOwnCheckIn(state, item)) return 2;
    return needsCheckInThisWindow(state, cycle, item, today) ? 0 : 1;
  }
  return planningItemGap(item, rootAssignment) ? 0 : 1;
}

function rowReason(
  phase: ReturnType<typeof kpiYearPhase>,
  state: Parameters<typeof needsCheckInThisWindow>[0],
  cycle: Parameters<typeof needsCheckInThisWindow>[1],
  item: Parameters<typeof planningItemGap>[0],
  rootAssignment: boolean,
  today: string,
) {
  if (phase === "monitoring") {
    if (blocksOwnCheckIn(state, item)) return "Rolls up from direct child KPIs";
    return needsCheckInThisWindow(state, cycle, item, today) ? "Check in this window" : "Checked in";
  }
  if (phase === "closed") return "Read only";
  return planningItemGap(item, rootAssignment) ?? "Ready";
}
