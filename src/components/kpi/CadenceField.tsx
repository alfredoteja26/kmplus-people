"use client";

import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import type { CheckInCadence, KpiItem } from "@/lib/types";
import { frequencyLabel } from "./kpi-copy";

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
        <option value="">Same as KPI year ({frequencyLabel(cycleCadence)})</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
      </Select>
    </Field>
  );
}
