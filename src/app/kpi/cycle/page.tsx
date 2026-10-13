"use client";

import { CycleCard } from "@/components/kpi/cycle/CycleCard";
import { kpiYearName } from "@/components/kpi/kpi-copy";
import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { PhaseFacts } from "@/components/kpi/PhaseFacts";
import { Button } from "@/components/coss/button";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Callout, Card, PageColumn, PageHeader } from "@/components/product/Card";
import { Table, Td, Th } from "@/components/product/Table";
import { canAccessKpiAdmin, kpiYearPhase, openCycle } from "@/lib/domain-query";
import { kpiOnTrackCount, personById, todayIso } from "@/lib/domain";
import { lateCheckInCount, peopleWithUndonePlanning } from "@/lib/phase-desk";
import { StatGauge } from "@/components/product/StatGauge";
import { accessLabel, plural } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { KpiCycle } from "@/lib/types";
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
  const activePhase = activeYear ? kpiYearPhase(activeYear) : null;
  const years = [...state.cycles].sort(byAdminOrder);

  if (!allowed) {
    return (
      <div>
        <PageHeader title="KPI Admin" />
        <Callout tone="warning">KPI Admin needs Admin access. HR or an existing Admin can give it to you.</Callout>
      </div>
    );
  }

  return (
    <PageColumn className={openSetId ? "lg:pr-[440px]" : undefined}>
      <PageHeader
        className="mb-0"
        title="KPI Admin"
        description="Run each KPI year: start planning, start monitoring, then close and score. Closed years stay available to view."
      />
      {activeYear ? (
        <PhaseFacts
          cycle={activeYear}
          extra={
            activePhase === "monitoring" ? (
              <StatGauge
                label="Late KPI Check-Ins"
                value={String(lateCheckIns)}
                percent={lateCheckIns > 0 ? 1 : 0}
                tone={lateCheckIns > 0 ? "danger" : "accent"}
                target={kpiYearName(activeYear)}
                detail="KPIs with no KPI Check-In for an earlier period this year. The current period is not late yet."
              />
            ) : activePhase === "planning" ? (
              <StatGauge
                label="Planning not done"
                value={String(planningOpen)}
                unit={planningOpen === 1 ? "person" : "people"}
                percent={planningOpen > 0 ? 1 : 0}
                tone={planningOpen > 0 ? "warning" : "accent"}
                target={kpiYearName(activeYear)}
                detail="No KPI Portfolio yet, still a draft, or returned for changes."
              />
            ) : null
          }
        />
      ) : null}
      {activeYear && activePhase === "monitoring" ? (
        <p className="m-0 text-sm text-muted">
          {plural(kpiOnTrackCount(state), "KPI Portfolio")} on track in {kpiYearName(activeYear)}.
        </p>
      ) : null}
      {state.cycles.length === 0 ? (
        <Callout tone="accent">No KPI years have been set up yet.</Callout>
      ) : (
        years.map((cycle) => (
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
        <h2 className="mt-0 mb-2 text-base font-medium">Admin access</h2>
        <p className="mt-0 mb-4 text-sm text-muted">
          HR or an Admin can give or remove Admin access. It adds to the person&apos;s usual role.
        </p>
        {grantError ? <Callout tone="danger">{grantError}</Callout> : null}
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Access</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {state.users.map((user) => {
              const person = personById(state, user.personId);
              return (
                <tr key={user.id}>
                  <Td>{person?.legalName ?? user.personId}</Td>
                  <Td>{accessLabel(user.role, Boolean(user.adminGrant))}</Td>
                  <Td>
                    {user.adminGrant ? (
                      <ConfirmAction
                        trigger={
                          <Button variant="ghost" size="sm" type="button">
                            Remove Admin access
                          </Button>
                        }
                        title={`Remove Admin access from ${person?.legalName ?? "this person"}?`}
                        description="They keep their usual role but can no longer run KPI Admin, open every KPI Portfolio, or manage Admin settings."
                        confirmLabel="Remove Admin access"
                        onConfirm={() => setGrantError(revokeAdmin(user.personId))}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setGrantError(grantAdmin(user.personId))}
                      >
                        Give Admin access
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

/** Active year first, then years not started (soonest first), then closed years (latest first). */
function byAdminOrder(left: KpiCycle, right: KpiCycle) {
  const group = (cycle: KpiCycle) => {
    const phase = kpiYearPhase(cycle);
    if (phase === "planning" || phase === "monitoring") return 0;
    if (phase === null) return 1;
    return 2;
  };
  const diff = group(left) - group(right);
  if (diff !== 0) return diff;
  return group(left) === 2 ? right.year - left.year : left.year - right.year;
}
