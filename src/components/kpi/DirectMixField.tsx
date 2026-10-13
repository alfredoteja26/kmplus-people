"use client";

import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { hasDirectChildren } from "@/lib/direct";
import type { AppState, DirectMix, KpiItem } from "@/lib/types";

type Props = {
  state: AppState;
  item: KpiItem;
  canEdit: boolean;
  onChange: (directMix: DirectMix) => void;
};

export function DirectMixField({ state, item, canEdit, onChange }: Props) {
  if (!hasDirectChildren(state, item.id)) return null;

  const mix = item.directMix ?? "children-only";

  if (!canEdit) {
    return (
      <p className="text-xs text-muted">
        Actual: {mix === "children-only" ? "sum of Direct child KPIs" : "own KPI Check-In plus Direct child KPIs"}
      </p>
    );
  }

  return (
    <Field label="Actual comes from">
      <Select value={mix} onChange={(event) => onChange(event.target.value as DirectMix)}>
        <option value="children-only">Direct child KPIs only</option>
        <option value="own-plus-children">Own KPI Check-In plus Direct child KPIs</option>
      </Select>
    </Field>
  );
}
