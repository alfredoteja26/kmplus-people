"use client";

import { Field, Select } from "@/components/ui/Input";
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
        Direct mix: {mix === "children-only" ? "sum of direct child KPIs" : "own check-in plus child KPIs"}
      </p>
    );
  }

  return (
    <Field label="How this parent combines child KPIs">
      <Select value={mix} onChange={(event) => onChange(event.target.value as DirectMix)}>
        <option value="children-only">From child KPIs only</option>
        <option value="own-plus-children">Own check-in plus child KPIs</option>
      </Select>
    </Field>
  );
}
