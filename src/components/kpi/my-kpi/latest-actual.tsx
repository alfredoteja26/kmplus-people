import { displayedActual, hasDirectChildren } from "@/lib/direct";
import { latestCheckIn } from "@/lib/domain";
import { formatDate } from "@/lib/labels";
import type { AppState, KpiItem } from "@/lib/types";

export function latestActualText(state: AppState, item: KpiItem): string {
  const check = latestCheckIn(state, item.id);
  const rolled = displayedActual(state, item);
  const showRolled = hasDirectChildren(state, item.id);
  if (showRolled && rolled !== null) {
    return `${rolled} from child KPIs${check ? ` (own ${check.actual})` : ""}`;
  }
  if (check) {
    return `${check.actual} on ${formatDate(check.date)}`;
  }
  return "—";
}
