import type { CheckInCadence, KpiCycle, KpiItem } from "./types";

export function effectiveCadence(cycle: KpiCycle, item: KpiItem): CheckInCadence {
  return item.checkInCadence ?? cycle.checkInCadence;
}

/** Month window `YYYY-MM` or quarter window `YYYY-QN`. */
export function windowFor(date: string, cadence: CheckInCadence): string {
  if (cadence === "monthly") {
    return date.slice(0, 7);
  }
  const month = Number(date.slice(5, 7));
  const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
  return `${date.slice(0, 4)}-Q${quarter}`;
}
