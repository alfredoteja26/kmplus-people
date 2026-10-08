"use client";

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/coss/select";

export type Choice = { value: string; label: string };

export function ChoiceSelect({
  value,
  onValueChange,
  items,
  placeholder = "Choose",
  disabled,
  id,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: Choice[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const selected = items.find((item) => item.value === value) ?? null;
  return (
    <Select
      items={items}
      value={selected}
      disabled={disabled}
      isItemEqualToValue={(item, current) => item.value === current.value}
      onValueChange={(next) => {
        if (next) onValueChange(next.value);
      }}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectPopup>
        {items.map((item) => (
          <SelectItem key={item.value} value={item}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
