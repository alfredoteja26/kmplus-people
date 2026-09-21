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

/** Negative if `a` is earlier than `b`. Windows must share the same id shape (monthly or quarterly). */
export function compareWindows(a: string, b: string): number {
  const yearA = Number(a.slice(0, 4));
  const yearB = Number(b.slice(0, 4));
  if (yearA !== yearB) return yearA - yearB;
  if (a.includes("-Q") && b.includes("-Q")) {
    return Number(a.slice(-1)) - Number(b.slice(-1));
  }
  if (!a.includes("-Q") && !b.includes("-Q")) {
    return Number(a.slice(5, 7)) - Number(b.slice(5, 7));
  }
  return 0;
}

export function isFutureWindow(window: string, currentWindow: string): boolean {
  return compareWindows(window, currentWindow) > 0;
}

/** Representative date inside a window (for stored Check-In date). */
export function dateInWindow(window: string): string {
  if (window.includes("-Q")) {
    const year = window.slice(0, 4);
    const quarter = Number(window.slice(-1));
    const month = String((quarter - 1) * 3 + 2).padStart(2, "0");
    return `${year}-${month}-15`;
  }
  return `${window}-15`;
}
