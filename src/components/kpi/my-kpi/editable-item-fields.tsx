"use client";

import { Input } from "@/components/ui/Input";
import type { KpiItem } from "@/lib/types";

export function EditableItemFields({
  item,
  onPatch,
}: {
  item: KpiItem;
  onPatch: (patch: KpiItem) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Input
        className="font-medium"
        aria-label={`Name for ${item.name}`}
        defaultValue={item.name}
        onBlur={(event) => {
          const name = event.target.value.trim();
          if (name && name !== item.name) onPatch({ ...item, name });
        }}
      />
      <Input
        className="text-muted"
        aria-label={`Definition for ${item.name}`}
        defaultValue={item.definition}
        onBlur={(event) => {
          const definition = event.target.value;
          if (definition !== item.definition) onPatch({ ...item, definition });
        }}
      />
    </div>
  );
}
