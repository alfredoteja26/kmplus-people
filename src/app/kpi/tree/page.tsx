"use client";

import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { KpiForest } from "@/components/kpi/KpiForest";
import { PhaseFacts } from "@/components/kpi/PhaseFacts";
import { Callout, PageColumn, PageHeader } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Input";
import { StatGauge } from "@/components/ui/StatGauge";
import {
  buildKpiForest,
  canUseTenantKpiTreeScope,
  defaultKpiTreeScope,
  type KpiTreeScope,
} from "@/lib/kpi-tree";
import { openCycle } from "@/lib/domain";
import { validateDirectCascade } from "@/lib/direct";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";

export default function KpiTreePage() {
  const { state } = useStore();
  const cycle = openCycle(state);
  const [scope, setScope] = useState<KpiTreeScope>(() => defaultKpiTreeScope(state));
  const [sheet, setSheet] = useState<{ kpiSetId: string; kpiItemId: string } | null>(null);
  const forest = useMemo(() => buildKpiForest(state, scope), [state, scope]);
  const showTenantOption = canUseTenantKpiTreeScope(state);

  const edgeStats = useMemo(() => {
    if (!forest) return { direct: 0, indirect: 0, breaks: 0, total: 0 };
    let breaks = 0;
    for (const edge of forest.edges) {
      if (edge.mode !== "direct") continue;
      const item = state.kpiItems.find((row) => row.id === edge.toKpiItemId);
      if (item && validateDirectCascade(state, item)) breaks += 1;
    }
    const direct = forest.edges.filter((edge) => edge.mode === "direct").length;
    const indirect = forest.edges.filter((edge) => edge.mode === "indirect").length;
    return { direct, indirect, breaks, total: forest.edges.length };
  }, [forest, state]);

  if (!cycle) {
    return (
      <div>
        <PageHeader title="KPI tree" description="No KPI year is in planning or monitoring." />
        <Callout tone="warning">No KPI year is in planning or monitoring. An admin starts the year on KPI Admin first.</Callout>
      </div>
    );
  }

  return (
    <PageColumn className={sheet ? "lg:pr-[440px]" : undefined}>
      <PageHeader
        className="mb-0"
        title="KPI tree"
        description={`${cycle.name}. How KPIs connect. A solid line is Direct. A dashed line is Indirect. Open a card to see that KPI.`}
      />
      <PhaseFacts
        cycle={cycle}
        extra={
          <>
            <StatGauge
              label="Direct"
              value={String(edgeStats.direct)}
              percent={edgeStats.total === 0 ? 0 : edgeStats.direct / edgeStats.total}
              tone="accent"
              target="Solid line"
              detail="The child uses the same unit and check-in frequency. Its actual adds into the parent."
            />
            <StatGauge
              label="Indirect"
              value={String(edgeStats.indirect)}
              percent={edgeStats.total === 0 ? 0 : edgeStats.indirect / edgeStats.total}
              tone="muted"
              target="Dashed line"
              detail="The child is aligned to the parent. Its actual stays on its own KPI."
            />
            <StatGauge
              label="Direct breaks"
              value={String(edgeStats.breaks)}
              percent={edgeStats.direct === 0 ? 0 : edgeStats.breaks / edgeStats.direct}
              tone={edgeStats.breaks > 0 ? "warning" : "accent"}
              target="Unit or frequency"
              detail={
                edgeStats.breaks > 0
                  ? "A Direct link is blocked because the unit or check-in frequency does not match."
                  : "Every Direct link matches unit and check-in frequency."
              }
            />
          </>
        }
      />
      <Field label="Scope" className="max-w-sm">
        <Select
          value={scope}
          onChange={(event) => setScope(event.target.value as KpiTreeScope)}
          className="min-w-[180px]"
        >
          <option value="team">My team</option>
          {showTenantOption ? <option value="tenant">Whole tenant</option> : null}
        </Select>
      </Field>
      {forest ? (
        <KpiForest
          forest={forest}
          onOpen={(kpiSetId, kpiItemId) => setSheet({ kpiSetId, kpiItemId })}
        />
      ) : null}
      {sheet ? (
        <KpiDetailSheet
          kpiSetId={sheet.kpiSetId}
          initialItemId={sheet.kpiItemId}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </PageColumn>
  );
}
