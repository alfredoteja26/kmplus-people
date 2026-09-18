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
        DirectMix: {mix === "children-only" ? "children-only (sum of Direct children)" : "own-plus-children"}
      </p>
    );
  }

  return (
    <Field label="DirectMix (parent)">
      <Select value={mix} onChange={(event) => onChange(event.target.value as DirectMix)}>
        <option value="children-only">children-only — actual is sum of Direct children</option>
        <option value="own-plus-children">own-plus-children — parent CheckIn plus sum</option>
      </Select>
    </Field>
  );
}
