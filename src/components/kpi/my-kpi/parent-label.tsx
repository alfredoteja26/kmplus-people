import type { AppState, KpiItem } from "@/lib/types";

export function parentLabel(state: AppState, item: KpiItem): string {
  if (!item.parentKpiItemId) return "—";
  const parent = state.kpiItems.find((row) => row.id === item.parentKpiItemId);
  if (!parent) return item.parentKpiItemId;
  const mode = item.cascadeMode ?? "indirect";
  return `${parent.name} (${mode})`;
}
