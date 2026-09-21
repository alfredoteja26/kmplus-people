"use client";

import { CycleCard } from "@/components/kpi/cycle/CycleCard";
import { Button } from "@/components/ui/Button";
import { Callout, Card, PageHeader } from "@/components/ui/Card";
import { Table, Td, Th } from "@/components/ui/Table";
import { canAccessKpiAdmin, kpiYearPhase, openCycle } from "@/lib/domain-query";
import { kpiOnTrackCount, personById } from "@/lib/domain";
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
    openKpiAdjustmentWindow,
    closeKpiAdjustmentWindow,
    grantAdmin,
    revokeAdmin,
  } = useStore();
  const [grantError, setGrantError] = useState<string | null>(null);
  const allowed = canAccessKpiAdmin(state);
  const activeYear = openCycle(state);

  if (!allowed) {
    return <Callout tone="warning">KPI Admin requires the Admin grant. HR and tenant admin do not get it by default.</Callout>;
  }

  return (
    <div>
      <PageHeader
        kicker="Tenant-wide KpiPlanning and KpiMonitoring"
        title="KPI Admin"
        description="Start KpiPlanning, then KpiMonitoring, on each KpiYear. Set the default KPI Check-in Frequency while the year is active. Close the year when the firm is done; closed years stay readable."
      />
      {activeYear ? (
        <p className="mb-6 text-sm text-muted">
          On track in {activeYear.name} ({kpiYearPhase(activeYear)}): {kpiOnTrackCount(state)}
        </p>
      ) : null}
      {state.cycles.length === 0 ? (
        <Callout tone="accent">No KpiYears yet. Configure an annual KpiYear in tenant setup when that is available.</Callout>
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
    </div>
  );
}
