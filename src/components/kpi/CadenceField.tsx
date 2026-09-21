"use client";

import { Field, Select } from "@/components/ui/Input";
import type { CheckInCadence, KpiItem } from "@/lib/types";

type CadenceFieldProps = {
  item: KpiItem;
  cycleCadence: CheckInCadence;
  onChange: (checkInCadence: CheckInCadence | undefined) => void;
  compact?: boolean;
};

export function CadenceField({ item, cycleCadence, onChange, compact }: CadenceFieldProps) {
  return (
    <Field label="KPI Check-in Frequency">
      <Select
        className={compact ? "min-w-[11rem]" : undefined}
        value={item.checkInCadence ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onChange(value === "" ? undefined : (value as CheckInCadence));
        }}
      >
        <option value="">KPI year default ({cycleCadence})</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
      </Select>
    </Field>
  );
}
