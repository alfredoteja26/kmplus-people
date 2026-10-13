"use client";

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/coss/select";

export type Choice = { value: string; label: string };

// The select primitive reads an empty value as "nothing chosen" and shows the placeholder, which hid
// real options such as "No project". Empty values travel under a sentinel inside this component only.
const EMPTY = "\u0000empty";
const encode = (value: string) => (value === "" ? EMPTY : value);
const decode = (value: string) => (value === EMPTY ? "" : value);

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
  const choices = items.map((item) => ({ ...item, value: encode(item.value) }));
  const selected = choices.find((item) => item.value === encode(value)) ?? null;
  return (
    <Select
      items={choices}
      value={selected}
      disabled={disabled}
      isItemEqualToValue={(item, current) => item.value === current.value}
      onValueChange={(next) => {
        if (next) onValueChange(decode(next.value));
      }}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectPopup>
        {choices.map((item) => (
          <SelectItem key={item.value} value={item}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
