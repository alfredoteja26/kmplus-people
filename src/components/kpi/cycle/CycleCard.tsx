"use client";

import { Button } from "@/components/ui/Button";
import { Card, Callout } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { HealthBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { kpiYearPhase } from "@/lib/domain-query";
import { liveMonitoringScore } from "@/lib/phase-desk";
import { kpiSetForAssignment, personById, positionById, setHealth } from "@/lib/domain";
import type { AppState, CheckInFrequency, KpiCycle } from "@/lib/types";
import { useState } from "react";

function phaseLabel(phase: ReturnType<typeof kpiYearPhase>) {
  if (phase === "planning") return "Planning";
  if (phase === "monitoring") return "Monitoring";
  if (phase === "closed") return "Closed";
  return "Not started";
}

function healthOrScore(state: AppState, cycle: KpiCycle, assignmentId: string) {
  const kpiSet = kpiSetForAssignment(state, assignmentId, cycle.id);
  if (!kpiSet) return "—";
  if (kpiYearPhase(cycle) === "closed") {
    return kpiSet.score !== undefined ? `${kpiSet.score}` : "—";
  }
  if (kpiYearPhase(cycle) === "monitoring") {
    const live = liveMonitoringScore(state, kpiSet.id);
    if (live !== null) return live;
  }
  return <HealthBadge health={setHealth(state, kpiSet)} />;
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

  const frequencyLabel = cycle.checkInCadence === "monthly" ? "Monthly" : "Quarterly";
  const [dateError, setDateError] = useState<string | null>(null);

  return (
    <Card className="mb-4">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-[16px] font-medium">{cycle.name}</h2>
            <StatusBadge status={phaseLabel(phase)} />
          </div>
          <p className="mt-1 mb-0 text-sm text-muted">
            Default KPI Check-in Frequency: {frequencyLabel}
            {cycle.adjustmentOpen ? " · Adjustment window open" : null}
            {cycle.planningEndsOn && phase !== "planning" ? ` · Planning ended ${cycle.planningEndsOn}` : null}
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
              <Button type="button" onClick={() => onStartPlanning()}>
                Start planning
              </Button>
            ) : null}
            {phase === "planning" ? (
              <Button type="button" onClick={() => onStartMonitoring()}>
                Start monitoring
              </Button>
            ) : null}
            {phase === "monitoring" ? (
              cycle.adjustmentOpen ? (
                <Button variant="secondary" type="button" onClick={() => onCloseAdjustmentWindow()}>
                  Close adjustment window
                </Button>
              ) : (
                <Button variant="secondary" type="button" onClick={() => onOpenAdjustmentWindow()}>
                  Open adjustment window
                </Button>
              )
            ) : null}
            {isActive ? (
              <>
                <Button variant="secondary" type="button" onClick={() => onClose()}>
                  Close KPI year
                </Button>
                {missingCount > 0 ? (
                  <Button variant="secondary" type="button" onClick={() => onDraftMissing()}>
                    Draft missing KPI portfolios ({missingCount})
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
      {phase === "planning" && !cycle.planningEndsOn ? (
        <Callout className="mb-4">Set a planning end date. Performance pages count down to that date. Starting monitoring stays a separate action.</Callout>
      ) : null}
      {dateError ? (
        <Callout tone="danger" className="mb-4">
          {dateError}
        </Callout>
      ) : null}
      <div className="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Position</Th>
              <Th>KPI Portfolio</Th>
              <Th>Health / score</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {activeAssignments.map((assignment) => {
              const person = personById(state, assignment.personId);
              const position = positionById(state, assignment.positionId);
              const kpiSet = kpiSetForAssignment(state, assignment.id, cycle.id);
              return (
                <tr key={assignment.id}>
                  <Td>{person?.legalName ?? "—"}</Td>
                  <Td>{position?.title ?? "—"}</Td>
                  <Td>{kpiSet ? <StatusBadge status={kpiSet.status} /> : "Missing"}</Td>
                  <Td>{healthOrScore(state, cycle, assignment.id)}</Td>
                  <Td>
                    {kpiSet ? (
                      <Button variant="ghost" type="button" onClick={() => onInspect(kpiSet.id)}>
                        Open portfolio
                      </Button>
                    ) : (
                      "—"
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
