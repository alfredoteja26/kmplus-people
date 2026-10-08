"use client";

import { frequencyLabel, kpiYearName } from "@/components/kpi/kpi-copy";
import { Button } from "@/components/coss/button";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Card, Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
import { Select } from "@/components/product/Select";
import { StatusBadge } from "@/components/product/StatusBadge";
import { Table, Td, Th } from "@/components/product/Table";
import { kpiYearPhase } from "@/lib/domain-query";
import { liveMonitoringScore } from "@/lib/phase-desk";
import { kpiSetForAssignment, personById, positionById } from "@/lib/domain";
import { formatDate, plural } from "@/lib/labels";
import type { AppState, CheckInFrequency, KpiCycle } from "@/lib/types";
import { useState } from "react";

/** Final score on a closed year, current score in monitoring, nothing before KPI Check-Ins start. */
function scoreText(state: AppState, cycle: KpiCycle, assignmentId: string) {
  const kpiSet = kpiSetForAssignment(state, assignmentId, cycle.id);
  if (!kpiSet) return "—";
  const phase = kpiYearPhase(cycle);
  if (phase === "closed") return kpiSet.score !== undefined ? String(kpiSet.score) : "—";
  if (phase === "monitoring") {
    const live = liveMonitoringScore(state, kpiSet.id);
    if (live !== null) return String(live);
  }
  return "—";
}

export function CycleCard({
  cycle,
  state,
  onStartPlanning,
  onStartMonitoring,
  onClose,
  onDraftMissing,
  onFrequencyChange,
  onPlanningEndDate,
  onInspect,
  onOpenAdjustmentWindow,
  onCloseAdjustmentWindow,
}: {
  cycle: KpiCycle;
  state: AppState;
  onStartPlanning: () => string | null;
  onStartMonitoring: () => string | null;
  onClose: () => string | null;
  onDraftMissing: () => number;
  onFrequencyChange: (frequency: CheckInFrequency) => string | null;
  onPlanningEndDate: (date: string) => string | null;
  onInspect: (kpiSetId: string) => void;
  onOpenAdjustmentWindow: () => string | null;
  onCloseAdjustmentWindow: () => string | null;
}) {
  const phase = kpiYearPhase(cycle);
  const isActive = phase === "planning" || phase === "monitoring";
  const activeAssignments = state.assignments.filter((row) => row.endDate === null);
  const setsForCycle = state.kpiSets.filter((row) => row.cycleId === cycle.id);
  const missingCount = activeAssignments.filter(
    (assignment) => !setsForCycle.some((row) => row.assignmentId === assignment.id),
  ).length;

  const [dateError, setDateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const withPortfolio = activeAssignments.filter((assignment) => kpiSetForAssignment(state, assignment.id, cycle.id));
  const rosterRows = isActive ? activeAssignments : withPortfolio;
  const summary =
    phase === null
      ? `${plural(activeAssignments.length, "person", "people")} will need a KPI Portfolio when planning starts.`
      : phase === "closed"
        ? withPortfolio.length === 0
          ? "No current staff had a KPI Portfolio in this year."
          : `${plural(withPortfolio.length, "KPI Portfolio")} for current staff. ${plural(missingCount, "person", "people")} had no KPI Portfolio.`
        : null;

  return (
    <Card className="mb-4">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-base font-medium">{kpiYearName(cycle)}</h2>
            <StatusBadge status={phase ?? "not-started"} />
          </div>
          <p className="mt-1 mb-0 text-sm text-muted">
            Default KPI Check-in Frequency: {frequencyLabel(cycle.checkInCadence)}
            {cycle.adjustmentOpen ? " · Adjustment window open" : null}
            {cycle.planningEndsOn && phase !== "planning"
              ? ` · Planning ended ${formatDate(cycle.planningEndsOn)}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {phase === "planning" ? (
            <Field label="Planning ends">
              <Input
                type="date"
                value={cycle.planningEndsOn ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  setDateError(onPlanningEndDate(value));
                }}
              />
            </Field>
          ) : null}
          {isActive ? (
            <Field label="Default KPI Check-in Frequency">
              <Select
                className="min-w-[10rem]"
                value={cycle.checkInCadence}
                onChange={(event) => onFrequencyChange(event.target.value as CheckInFrequency)}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </Select>
            </Field>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {phase === null ? (
              <Button type="button" onClick={() => setActionError(onStartPlanning())}>
                Start planning
              </Button>
            ) : null}
            {phase === "planning" ? (
              <Button type="button" onClick={() => setActionError(onStartMonitoring())}>
                Start monitoring
              </Button>
            ) : null}
            {phase === "monitoring" ? (
              cycle.adjustmentOpen ? (
                <Button variant="outline" type="button" onClick={() => setActionError(onCloseAdjustmentWindow())}>
                  Close adjustment window
                </Button>
              ) : (
                <Button variant="outline" type="button" onClick={() => setActionError(onOpenAdjustmentWindow())}>
                  Open adjustment window
                </Button>
              )
            ) : null}
            {isActive ? (
              <>
                <ConfirmAction
                  trigger={
                    <Button variant="outline" type="button">
                      Close KPI year
                    </Button>
                  }
                  title={`Close ${kpiYearName(cycle)}?`}
                  description={
                    <>
                      Scores are calculated and stored for every approved KPI Portfolio. Portfolios still in draft or
                      waiting for approval get no score. After closing, {kpiYearName(cycle)} is view-only and can&apos;t
                      be reopened.
                    </>
                  }
                  confirmLabel={`Close ${kpiYearName(cycle)}`}
                  onConfirm={() => setActionError(onClose())}
                />
                {missingCount > 0 ? (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      onDraftMissing();
                    }}
                  >
                    Create {plural(missingCount, "missing KPI Portfolio")}
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
      {phase === "planning" && !cycle.planningEndsOn ? (
        <Callout className="mb-4">
          Set a planning end date so everyone can see how much planning time is left. Monitoring still starts only when
          you choose Start monitoring.
        </Callout>
      ) : null}
      {dateError ? (
        <Callout tone="danger" className="mb-4">
          {dateError}
        </Callout>
      ) : null}
      {actionError ? (
        <Callout tone="danger" className="mb-4">
          {actionError}
        </Callout>
      ) : null}
      {summary ? <p className="mt-0 mb-4 text-sm text-muted">{summary}</p> : null}
      {rosterRows.length === 0 ? null : (
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Position</Th>
                <Th>KPI Portfolio</Th>
                <Th>Score</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rosterRows.map((assignment) => {
                const person = personById(state, assignment.personId);
                const position = positionById(state, assignment.positionId);
                const kpiSet = kpiSetForAssignment(state, assignment.id, cycle.id);
                return (
                  <tr key={assignment.id}>
                    <Td>{person?.legalName ?? "—"}</Td>
                    <Td>{position?.title ?? "—"}</Td>
                    <Td>{kpiSet ? <StatusBadge status={kpiSet.status} /> : "No KPI Portfolio"}</Td>
                    <Td className="tabular-nums">{scoreText(state, cycle, assignment.id)}</Td>
                    <Td>
                      {kpiSet ? (
                        <Button variant="ghost" size="sm" type="button" onClick={() => onInspect(kpiSet.id)}>
                          Open KPI Portfolio
                        </Button>
                      ) : null}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
