"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Input";
import { HealthBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { kpiSetForAssignment, personById, positionById, setHealth } from "@/lib/domain";
import type { AppState, CheckInCadence, KpiCycle } from "@/lib/types";

function formatCheckInWindows(cycle: KpiCycle) {
  return cycle.checkInWindows
    .map((window) => (window.open ? `Q${window.quarter} open` : `Q${window.quarter}`))
    .join(" · ");
}

function healthOrScore(state: AppState, cycle: KpiCycle, assignmentId: string) {
  const kpiSet = kpiSetForAssignment(state, assignmentId, cycle.id);
  if (!kpiSet) return "—";
  if (cycle.status === "closed") {
    return kpiSet.score !== undefined ? `${kpiSet.score}` : "—";
  }
  return <HealthBadge health={setHealth(state, kpiSet)} />;
}

export function CycleCard({
  cycle,
  state,
  onOpen,
  onClose,
  onDraftMissing,
  onCadenceChange,
}: {
  cycle: KpiCycle;
  state: AppState;
  onOpen: () => void;
  onClose: () => void;
  onDraftMissing: () => void;
  onCadenceChange: (cadence: CheckInCadence) => void;
}) {
  const isOpen = cycle.status === "open";
  const activeAssignments = state.assignments.filter((row) => row.endDate === null);
  const setsForCycle = state.kpiSets.filter((row) => row.cycleId === cycle.id);
  const missingCount = activeAssignments.filter(
    (assignment) => !setsForCycle.some((row) => row.assignmentId === assignment.id),
  ).length;

  const cadenceLabel = cycle.checkInCadence === "monthly" ? "Monthly" : "Quarterly";

  return (
    <Card className="mb-4">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-[16px] font-medium">{cycle.name}</h2>
            <StatusBadge status={cycle.status} />
          </div>
          <p className="mt-1 mb-0 text-sm text-muted">
            {isOpen ? (
              <>CheckIn windows: {formatCheckInWindows(cycle)}</>
            ) : (
              <>
                Default CheckIn cadence: {cadenceLabel} · CheckIn windows: {formatCheckInWindows(cycle)}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {isOpen ? (
            <Field label="Default CheckIn cadence">
              <Select
                className="min-w-[10rem]"
                value={cycle.checkInCadence}
                onChange={(event) => onCadenceChange(event.target.value as CheckInCadence)}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </Select>
            </Field>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {!isOpen ? (
              <Button type="button" onClick={onOpen}>
                Open
              </Button>
            ) : (
              <>
                <Button variant="secondary" type="button" onClick={onClose}>
                  Close and score
                </Button>
                {missingCount > 0 ? (
                  <Button variant="secondary" type="button" onClick={onDraftMissing}>
                    Draft missing KpiSets ({missingCount})
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Position</Th>
              <Th>KpiSet</Th>
              <Th>Health / score</Th>
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
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
