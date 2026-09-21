"use client";

import { KpiForest } from "@/components/kpi/KpiForest";
import { Callout, PageHeader } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Input";
import {
  buildKpiForest,
  canUseTenantKpiTreeScope,
  defaultKpiTreeScope,
  type KpiTreeScope,
} from "@/lib/kpi-tree";
import { openCycle } from "@/lib/domain";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";

export default function KpiTreePage() {
  const { state } = useStore();
  const cycle = openCycle(state);
  const [scope, setScope] = useState<KpiTreeScope>(() => defaultKpiTreeScope(state));
  const forest = useMemo(() => buildKpiForest(state, scope), [state, scope]);
  const showTenantOption = canUseTenantKpiTreeScope(state);

  if (!cycle) {
    return (
      <div>
        <PageHeader title="KPI tree" />
        <Callout tone="warning">No KpiYear in KpiMonitoring. An Admin starts the year on KPI Admin first.</Callout>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker={cycle.name}
        title="KPI tree"
        description="Cascade forest for the current KpiYear. Roots are KpiItems on RootPositions. Click a node to open that Assignment’s KPI Portfolio."
      />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label="Scope">
          <Select
            value={scope}
            onChange={(event) => setScope(event.target.value as KpiTreeScope)}
            className="min-w-[180px]"
          >
            <option value="team">My team</option>
            {showTenantOption ? <option value="tenant">Whole tenant</option> : null}
          </Select>
        </Field>
        <p className="pb-1 text-sm text-muted" id="kpi-tree-edge-legend">
          Solid sage = Direct · dashed = Indirect · warning badge = unit or cadence mismatch on Direct
        </p>
      </div>
      {forest ? <KpiForest forest={forest} /> : null}
    </div>
  );
}
