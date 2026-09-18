"use client";

import { CycleCard } from "@/components/kpi/cycle/CycleCard";
import { Callout, PageHeader } from "@/components/ui/Card";
import { isHrLike, kpiOnTrackCount, openCycle } from "@/lib/domain";
import { useStore } from "@/lib/store";

export default function CyclePage() {
  const { state, openCycle: openCycleAction, closeCycle, createMissingKpiSets, setCycleCadence } = useStore();
  const hr = isHrLike(state.currentRole);
  const activeCycle = openCycle(state);

  if (!hr) {
    return <Callout tone="warning">Cycle is for HR and tenant admin.</Callout>;
  }

  return (
    <div>
      <PageHeader
        kicker="Annual cycle, monthly or quarterly CheckIn"
        title="Cycle"
        description="Open a cycle so Assignments can hold a KpiSet. Set the default CheckIn cadence while the cycle is open. Close stores a KpiScore from Direct actuals. No bonus math. Per-item cadence override stays on My KPI."
      />
      {activeCycle ? (
        <p className="mb-6 text-sm text-muted">On track in the open cycle: {kpiOnTrackCount(state)}</p>
      ) : null}
      {state.cycles.length === 0 ? (
        <Callout tone="accent">No KPI cycles yet. Configure an annual cycle in tenant setup when that is available.</Callout>
      ) : (
        state.cycles.map((cycle) => (
          <CycleCard
            key={cycle.id}
            cycle={cycle}
            state={state}
            onOpen={() => openCycleAction(cycle.id)}
            onClose={() => closeCycle(cycle.id)}
            onDraftMissing={() => createMissingKpiSets(cycle.id)}
            onCadenceChange={(cadence) => setCycleCadence(cycle.id, cadence)}
          />
        ))
      )}
    </div>
  );
}
