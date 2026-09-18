import { displayedActual, hasDirectChildren } from "@/lib/direct";
import { latestCheckIn } from "@/lib/domain";
import type { AppState, KpiItem } from "@/lib/types";

export function latestActualText(state: AppState, item: KpiItem): string {
  const check = latestCheckIn(state, item.id);
  const rolled = displayedActual(state, item);
  const showRolled = hasDirectChildren(state, item.id);
  if (showRolled && rolled !== null) {
    return `${rolled} rolled${check ? ` (own ${check.actual})` : ""}`;
  }
  if (check) {
    return `${check.actual} (${check.date})`;
  }
  return "—";
}
