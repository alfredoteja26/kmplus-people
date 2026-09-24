"use client";

import { CycleCard } from "@/components/kpi/cycle/CycleCard";
import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { PhaseFacts } from "@/components/kpi/PhaseFacts";
import { Button } from "@/components/ui/Button";
import { Callout, Card, PageColumn, PageHeader } from "@/components/ui/Card";
import { Table, Td, Th } from "@/components/ui/Table";
import { canAccessKpiAdmin, kpiYearPhase, openCycle } from "@/lib/domain-query";
import { kpiOnTrackCount, personById, todayIso } from "@/lib/domain";
import { lateCheckInCount, peopleWithUndonePlanning } from "@/lib/phase-desk";
import { StatGauge } from "@/components/ui/StatGauge";
import { useStore } from "@/lib/store";
import { useState } from "react";

export default function KpiAdminPage() {
  const {
    state,
    startKpiPlanning,
    startKpiMonitoring,
    closeKpiYear,
    createMissingKpiSets,
    setKpiYearCheckInFrequency,
    setKpiPlanningEndDate,
    openKpiAdjustmentWindow,
    closeKpiAdjustmentWindow,
    grantAdmin,
    revokeAdmin,
  } = useStore();
  const [grantError, setGrantError] = useState<string | null>(null);
  const [openSetId, setOpenSetId] = useState<string | null>(null);
  const allowed = canAccessKpiAdmin(state);
  const activeYear = openCycle(state);
  const lateCheckIns = lateCheckInCount(state, todayIso());
  const planningOpen = peopleWithUndonePlanning(state);

  if (!allowed) {
    return <Callout tone="warning">KPI Admin requires the Admin grant. HR and tenant admin do not get it by default.</Callout>;
  }

  return (
    <PageColumn className={openSetId ? "lg:pr-[440px]" : undefined}>
      <PageHeader
        className="mb-0"
        title="KPI Admin"
        description="Start planning, then monitoring, for each KPI year. Set the planning end date and the default check-in frequency while the year is active. Close the year when the firm is done. Closed years stay readable."
      />
      {activeYear ? (
        <PhaseFacts
          cycle={activeYear}
          extra={
            <>
              <StatGauge
                label="Check-ins late"
                value={String(lateCheckIns)}
                percent={lateCheckIns > 0 ? 1 : 0}
                tone={lateCheckIns > 0 ? "danger" : "accent"}
                target={activeYear && kpiYearPhase(activeYear) === "monitoring" ? activeYear.name : "Monitoring"}
                detail={
                  activeYear && kpiYearPhase(activeYear) === "monitoring"
                    ? "KPIs that missed a check-in window earlier in this year. The current window is still due, not late."
                    : "Late check-ins are counted once the year is in monitoring."
                }
              />
              <StatGauge
                label="Planning still open"
                value={String(planningOpen)}
                percent={planningOpen > 0 ? 1 : 0}
                tone={planningOpen > 0 ? "warning" : "accent"}
                target="People"
                detail={
                  activeYear && kpiYearPhase(activeYear) === "planning"
                    ? "People whose portfolio is missing, still a draft, or returned."
                    : "This count is for a KPI year that is in planning."
                }
              />
            </>
          }
        />
      ) : null}
      {activeYear ? (
        <p className="mb-6 text-sm text-muted">
          On track in {activeYear.name} ({kpiYearPhase(activeYear) === "planning" ? "planning" : kpiYearPhase(activeYear) === "monitoring" ? "monitoring" : "closed"}): {kpiOnTrackCount(state)}
        </p>
      ) : null}
      {state.cycles.length === 0 ? (
        <Callout tone="accent">No KPI years yet. Add an annual KPI year in tenant setup when that is available.</Callout>
      ) : (
        state.cycles.map((cycle) => (
          <CycleCard
            key={cycle.id}
            cycle={cycle}
            state={state}
            onStartPlanning={() => startKpiPlanning(cycle.id)}
            onStartMonitoring={() => startKpiMonitoring(cycle.id)}
            onClose={() => closeKpiYear(cycle.id)}
            onDraftMissing={() => createMissingKpiSets(cycle.id)}
            onFrequencyChange={(frequency) => setKpiYearCheckInFrequency(cycle.id, frequency)}
            onPlanningEndDate={(date) => setKpiPlanningEndDate(cycle.id, date)}
            onInspect={setOpenSetId}
            onOpenAdjustmentWindow={() => openKpiAdjustmentWindow(cycle.id)}
            onCloseAdjustmentWindow={() => closeKpiAdjustmentWindow(cycle.id)}
          />
        ))
      )}
      <Card className="mt-6">
        <h2 className="mt-0 mb-2 text-[16px] font-medium">Admin grant</h2>
        <p className="mt-0 mb-4 text-sm text-muted">
          HR or an existing Admin can grant or revoke Admin. The grant stacks with Employee or Manager login.
        </p>
        {grantError ? <Callout tone="danger">{grantError}</Callout> : null}
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Login</Th>
              <Th>Admin</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {state.users.map((user) => {
              const person = personById(state, user.personId);
              return (
                <tr key={user.id}>
                  <Td>{person?.legalName ?? user.personId}</Td>
                  <Td>{user.role}</Td>
                  <Td>{user.adminGrant ? "Yes" : "No"}</Td>
                  <Td>
                    {user.adminGrant ? (
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => setGrantError(revokeAdmin(user.personId))}
                      >
                        Revoke Admin
                      </Button>
                    ) : (
                      <Button type="button" onClick={() => setGrantError(grantAdmin(user.personId))}>
                        Grant Admin
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      {openSetId ? <KpiDetailSheet kpiSetId={openSetId} onClose={() => setOpenSetId(null)} /> : null}
    </PageColumn>
  );
}
