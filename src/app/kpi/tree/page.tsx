"use client";

import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { KpiForest } from "@/components/kpi/KpiForest";
import { kpiYearName } from "@/components/kpi/kpi-copy";
import { PhaseFacts } from "@/components/kpi/PhaseFacts";
import { Callout, PageColumn, PageHeader } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import {
  buildKpiForest,
  canUseTenantKpiTreeScope,
  defaultKpiTreeScope,
  type KpiTreeScope,
} from "@/lib/kpi-tree";
import { openCycle } from "@/lib/domain";
import { validateDirectCascade } from "@/lib/direct";
import { plural } from "@/lib/labels";
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
        <PageHeader title="KPI tree" />
        <Callout tone="warning">No KPI year is in planning or monitoring. An Admin starts one from KPI Admin.</Callout>
      </div>
    );
  }

  return (
    <PageColumn className={sheet ? "lg:pr-[440px]" : undefined}>
      <PageHeader
        className="mb-0"
        title="KPI tree"
        description={`How KPIs connect across ${kpiYearName(cycle)}. Solid lines add up; dashed lines show alignment only.`}
      />
      <PhaseFacts cycle={cycle} />
      {edgeStats.total > 0 ? (
        <p className="m-0 text-sm text-muted tabular-nums">
          {plural(edgeStats.total, "link")} in this view: {edgeStats.direct} Direct, {edgeStats.indirect} Indirect.
        </p>
      ) : null}
      {edgeStats.breaks > 0 ? (
        <Callout tone="warning">
          {edgeStats.breaks === 1 ? "1 Direct link does" : `${edgeStats.breaks} Direct links do`} not add up because the
          child KPI&apos;s unit or KPI Check-in Frequency differs from its parent. Open the KPI marked Blocked to fix it.
        </Callout>
      ) : null}
      <Field label="Scope" className="max-w-sm">
        <Select
          value={scope}
          onChange={(event) => setScope(event.target.value as KpiTreeScope)}
          className="min-w-[180px]"
        >
          <option value="team">My team</option>
          {showTenantOption ? <option value="tenant">Whole company</option> : null}
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
