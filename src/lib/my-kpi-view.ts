import { frequencyLabel, periodDueDate, periodDueIso, periodLabel } from "@/components/kpi/kpi-copy";
import { effectiveCadence, windowFor } from "./cadence";
import { validateParents } from "./cascade";
import { blocksOwnCheckIn, displayedActual, hasDirectChildren, validateAllDirectInSet } from "./direct";
import { itemsForSet, latestCheckIn, weightSum } from "./domain";
import {
  adminIsRemainingApproverForKpiSet,
  effectiveCheckInStatus,
  isPortfolioDualApproved,
  portfolioApprovalGaps,
} from "./domain-query";
import { formatDate, plural } from "./labels";
import { needsCheckInThisWindow, planningDaysLeft, planningItemGap } from "./phase-desk";
import type { AppState, KpiCycle, KpiItem, KpiSet, KpiYearPhase } from "./types";

/**
 * Pure view helpers for My KPI and the read-only KPI Portfolio page. The domain queries decide;
 * these only turn their answers into the words and numbers a row or a fact shows.
 */

/** What the owner can do with this KPI Portfolio right now. */
export type PortfolioStep = "plan" | "waiting" | "approved" | "check-in" | "closed";

export function portfolioStep(state: AppState, phase: KpiYearPhase | null, kpiSet: KpiSet): PortfolioStep {
  if (phase === "closed") return "closed";
  if (kpiSet.status === "draft" || kpiSet.status === "returned") return "plan";
  if (!isPortfolioDualApproved(state, kpiSet.id)) return "waiting";
  return phase === "monitoring" ? "check-in" : "approved";
}

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

/** The words beside the status badge: who the KPI Portfolio is waiting on, or where it stands. */
export function approvalDetail(state: AppState, kpiSet: KpiSet): string {
  if (kpiSet.status === "draft") return "Not submitted yet";
  if (kpiSet.status === "returned") return "Returned for changes";
  if (kpiSet.status === "scored") return "Scored at year close";
  if (kpiSet.status === "pending") {
    const gaps = portfolioApprovalGaps(state, kpiSet.id);
    const names = [gaps.needsLineManager ? "Line Manager" : null, gaps.needsAdmin ? "Admin" : null].filter(Boolean);
    return names.length ? `Waiting for ${names.join(" and ")}` : "Waiting for approval";
  }
  return adminIsRemainingApproverForKpiSet(state, kpiSet.id) ? "Approved by an Admin" : "Line Manager and Admin approved";
}

/** "60% of 100%": success only at exactly 100, warning above it, accent while still short. */
export function weightFact(sum: number): { text: string; tone: Tone; percent: number } {
  const tone: Tone = sum === 100 ? "success" : sum > 100 ? "warning" : "accent";
  return { text: `${sum}% of 100%`, tone, percent: Math.max(0, Math.min(100, sum)) };
}

/**
 * Why Submit for approval is not available yet, in the words the owner acts on. Null when it may be sent.
 * Same order as the submit command: weights, then parents, then Direct links.
 */
export function submitBlocker(state: AppState, kpiSetId: string): string | null {
  const items = itemsForSet(state, kpiSetId);
  if (items.length === 0) return "Add at least one KPI first.";
  const sum = weightSum(items);
  if (sum !== 100) {
    return sum < 100
      ? `Weights add up to ${sum}%. Add ${100 - sum}% more to reach 100%.`
      : `Weights add up to ${sum}%. Take off ${sum - 100}% to reach 100%.`;
  }
  const parent = validateParents(state, kpiSetId);
  if (parent) return plainKpiError(parent);
  const direct = validateAllDirectInSet(state, kpiSetId);
  if (direct) return plainKpiError(direct);
  return null;
}

/** Score fact: the live score in monitoring, the stored KpiScore after close, otherwise a promise. */
export function scoreFact(
  phase: KpiYearPhase | null,
  live: number | null,
  stored: number | undefined,
): { label: string; value: string | null; detail: string } {
  if (phase === "closed") {
    return stored === undefined
      ? { label: "Final score", value: null, detail: "No final score was saved" }
      : { label: "Final score", value: String(stored), detail: "of 100" };
  }
  if (phase === "monitoring" && live !== null) return { label: "Current score", value: String(live), detail: "of 100" };
  return { label: "Score", value: null, detail: "Shown once approved" };
}

/** Days-left tone for the planning window fact. */
function planningTone(days: number | null): Tone {
  if (days === null) return "neutral";
  if (days < 0) return "danger";
  return days <= 3 ? "warning" : "neutral";
}

/**
 * The time fact: the planning window while planning, the next KPI Check-In due once the
 * KPI Portfolio is approved in monitoring, otherwise the phase in one phrase.
 */
export function timeFact(
  state: AppState,
  cycle: KpiCycle,
  phase: KpiYearPhase | null,
  step: PortfolioStep,
  items: KpiItem[],
  today: string,
): { label: string; value: string; detail?: string; tone: Tone } {
  if (phase === "planning") {
    const days = planningDaysLeft(cycle.planningEndsOn, today);
    const value =
      days === null ? "No end date set" : days < 0 ? "Overdue" : days === 0 ? "Ends today" : `${plural(days, "day")} left`;
    return {
      label: "Planning",
      value,
      detail: days === null ? undefined : `${days < 0 ? "Ended" : "Ends"} ${formatDate(cycle.planningEndsOn)}`,
      tone: planningTone(days),
    };
  }
  if (phase === "closed") return { label: "KPI year", value: "Closed", tone: "neutral" };
  if (step !== "check-in") return { label: "KPI Check-Ins", value: "Open once approved", tone: "neutral" };
  const due = dueItems(state, cycle, items, today);
  if (due.length === 0) {
    const checkable = items.filter((item) => !blocksOwnCheckIn(state, item));
    return { label: "Next KPI Check-In", value: checkable.length ? "All checked in" : "Nothing to enter", tone: "success" };
  }
  const soonest = due
    .map((item) => windowFor(today, effectiveCadence(cycle, item)))
    .sort((left, right) => (periodDueIso(left) ?? left).localeCompare(periodDueIso(right) ?? right))[0];
  return {
    label: "Next KPI Check-In",
    value: `Due ${periodDueDate(soonest)}`,
    detail: plural(due.length, "KPI"),
    tone: "accent",
  };
}

/** KPIs that still need a KPI Check-In for their current period, in row order. */
export function dueItems(state: AppState, cycle: KpiCycle, items: KpiItem[], today: string): KpiItem[] {
  return items.filter((item) => needsCheckInThisWindow(state, cycle, item, today));
}

/** Sort key: the rows that need the owner sit first. */
export function rowRank(step: PortfolioStep, state: AppState, cycle: KpiCycle, item: KpiItem, rootAssignment: boolean, today: string) {
  if (step === "check-in") {
    if (blocksOwnCheckIn(state, item)) return 2;
    return needsCheckInThisWindow(state, cycle, item, today) ? 0 : 1;
  }
  if (step === "plan") return planningItemGap(item, rootAssignment) ? 0 : 1;
  return 0;
}

export function rankItems(step: PortfolioStep, state: AppState, cycle: KpiCycle, items: KpiItem[], rootAssignment: boolean, today: string) {
  return [...items].sort((left, right) => {
    const rank = rowRank(step, state, cycle, left, rootAssignment, today) - rowRank(step, state, cycle, right, rootAssignment, today);
    return rank !== 0 ? rank : left.name.localeCompare(right.name);
  });
}

/** One line under a row's name about what that KPI needs now. `attention` marks it in the warning hue. */
export function rowNote(
  step: PortfolioStep,
  state: AppState,
  cycle: KpiCycle,
  item: KpiItem,
  rootAssignment: boolean,
  today: string,
): { text: string; attention: boolean } | null {
  if (step === "plan") {
    // A missing parent already shows on the row's parent line in the warning hue.
    const gap = planningItemGap(item, rootAssignment);
    return gap && gap !== "Needs a parent" ? { text: gap, attention: true } : null;
  }
  if (step !== "check-in") return null;
  if (blocksOwnCheckIn(state, item)) return { text: "Adds up from its Direct child KPIs", attention: false };
  const windowId = windowFor(today, effectiveCadence(cycle, item));
  if (needsCheckInThisWindow(state, cycle, item, today)) {
    return { text: `KPI Check-In for ${periodLabel(windowId)} due by ${periodDueDate(windowId)}`, attention: true };
  }
  const pending = state.checkIns.some(
    (row) => row.kpiItemId === item.id && row.window === windowId && effectiveCheckInStatus(row) === "pending",
  );
  return {
    text: pending ? `KPI Check-In for ${periodLabel(windowId)} waiting for approval` : `Checked in for ${periodLabel(windowId)}`,
    attention: false,
  };
}

export type ItemRowView = {
  target: string;
  polarity: string | null;
  cadence: string;
  /** True when the KPI overrides the KPI year's default frequency. */
  cadenceOverride: boolean;
  actual: { value: string; detail: string } | null;
  parent: { name: string; mode: "Direct" | "Indirect" } | "root" | "missing";
};

/** Everything a register row prints about one KPI, apart from its name, weight, and health. */
export function itemRowView(state: AppState, cycle: KpiCycle, item: KpiItem, rootAssignment: boolean): ItemRowView {
  const parentItem = item.parentKpiItemId ? state.kpiItems.find((row) => row.id === item.parentKpiItemId) : undefined;
  const parent: ItemRowView["parent"] = rootAssignment
    ? "root"
    : parentItem
      ? { name: parentItem.name, mode: item.cascadeMode === "direct" ? "Direct" : "Indirect" }
      : "missing";
  return {
    target: `${item.target} ${item.unit}`.trim(),
    polarity: item.polarity === "lower-better" ? "Lower is better" : null,
    cadence: frequencyLabel(effectiveCadence(cycle, item)),
    cadenceOverride: Boolean(item.checkInCadence && item.checkInCadence !== cycle.checkInCadence),
    actual: latestActual(state, item),
    parent,
  };
}

/**
 * The latest actual a row shows. A parent with Direct children shows the rolled sum of approved
 * KPI Check-Ins; any other KPI shows its newest KPI Check-In and says when it is not approved yet.
 */
export function latestActual(state: AppState, item: KpiItem): { value: string; detail: string } | null {
  const check = latestCheckIn(state, item.id);
  if (hasDirectChildren(state, item.id)) {
    const rolled = displayedActual(state, item);
    if (rolled === null) return null;
    return { value: String(rolled), detail: check ? `From child KPIs, own ${check.actual}` : "From child KPIs" };
  }
  if (!check) return null;
  const status = effectiveCheckInStatus(check);
  const when = periodLabel(check.window);
  const detail = status === "pending" ? `${when} · waiting` : status === "returned" ? `${when} · returned` : when;
  return { value: String(check.actual), detail };
}

/**
 * KPI commands refuse in domain terms; screens say what to do about it. Unknown messages lose
 * their camelCase nouns so a glossary identifier never reaches the screen.
 */
const PLAIN: Record<string, string> = {
  "KPI year is closed": "This KPI year is closed, so nothing on it can change.",
  "KPI year not found": "This KPI year no longer exists.",
  "KPI portfolio not found": "This KPI Portfolio no longer exists.",
  "KPI not found": "This KPI no longer exists.",
  "Open the adjustment window to change a KPI portfolio that is already approved":
    "This KPI Portfolio is approved. It can change only while an Admin has the adjustment window open.",
  "Only the person, their line manager, or an admin may draft this KPI portfolio":
    "Only the owner, their Line Manager, or an Admin can change this KPI Portfolio.",
  "Only the person, their line manager, or an admin may submit this KPI portfolio":
    "Only the owner, their Line Manager, or an Admin can submit this KPI Portfolio.",
  "RootPosition KpiItems cannot have a parent KpiItem": "KPIs on a top position have no parent KPI. Remove the parent.",
  "A KpiItem cannot be its own parent": "A KPI can't be its own parent. Choose another parent KPI.",
  "Direct cascade requires a parent KpiItem": "Choose a parent KPI before linking it as Direct.",
  "Direct cascade parent not found": "The parent KPI no longer exists. Choose another parent KPI.",
  "Only the line manager or an admin may agree this KPI portfolio":
    "Only the Line Manager or an Admin can approve this KPI Portfolio.",
  "Only the line manager or an admin may return this KPI portfolio":
    "Only the Line Manager or an Admin can return this KPI Portfolio.",
  "Only a pending KPI Portfolio can be approved": "Only a KPI Portfolio that is waiting for approval can be approved.",
  "Line manager approval must come from a different person": "Your Line Manager approves your own KPI Portfolio, not you.",
  "No further approval is available for you on this KPI Portfolio": "You have already approved this. It is waiting for the other approver.",
  "Only the person on this seat may submit a KPI check-in": "Only the person in this position can submit a KPI Check-In.",
  "A KPI check-in is only allowed during monitoring": "KPI Check-Ins open when an Admin starts monitoring.",
  "A KPI check-in requires a KPI portfolio that both approvers have agreed":
    "KPI Check-Ins open once the Line Manager and an Admin have both approved the KPI Portfolio.",
  "A KPI check-in is blocked for this KPI": "This KPI adds up from its Direct child KPIs, so there is no actual to enter.",
  "This check-in window must belong to this KPI year": "Check in only for a period in this KPI year.",
  "Future check-in windows are not allowed": "You can't check in for a period that hasn't started.",
  "An approved KPI check-in already exists for this window": "This period already has an approved KPI Check-In.",
  "A KPI check-in is already pending for this window": "A KPI Check-In for this period is already waiting for approval.",
  "Only the line manager or an admin may agree this KPI check-in": "Only the Line Manager or an Admin can approve this KPI Check-In.",
  "Only the line manager or an admin may return this KPI check-in": "Only the Line Manager or an Admin can return this KPI Check-In.",
  "Only a pending KPI check-in can be approved": "Only a KPI Check-In that is waiting for approval can be approved.",
  "No further approval is available for you on this KPI check-in": "You have already approved this. It is waiting for the other approver.",
  "KPI check-in not found": "This KPI Check-In no longer exists.",
};

const PATTERNS: [RegExp, (...groups: string[]) => string][] = [
  [/^Weights must sum to 100% \(now (-?[\d.]+)%\)$/, (sum) => `Weights add up to ${sum}%. Make them add up to 100%, then submit.`],
  [/^“(.+)” needs a parent KpiItem from this KpiYear$/, (name) => `“${name}” needs a parent KPI. Open it and choose one.`],
  [
    /^“(.+)” has an invalid parent \(empty seat or wrong KpiYear\)$/,
    (name) => `The parent KPI of “${name}” is no longer available. Open it and choose another.`,
  ],
  [
    /^Direct requires the same unit \(“(.*)” vs “(.*)”\)$/,
    (own, parent) => `Direct needs the same unit as the parent KPI (“${own}” here, “${parent}” on the parent). Match the unit or link it as Indirect.`,
  ],
  [
    /^Direct requires the same check-in frequency \((\w+) vs (\w+)\)$/,
    (own, parent) =>
      `Direct needs the same KPI Check-in Frequency as the parent KPI (${own} here, ${parent} on the parent). Match it or link it as Indirect.`,
  ],
];

export function plainKpiError(message: string | null | undefined): string {
  if (!message) return "";
  const known = PLAIN[message];
  if (known) return known;
  for (const [pattern, write] of PATTERNS) {
    const match = pattern.exec(message);
    if (match) return write(...match.slice(1));
  }
  return message
    .replace(/KpiItems?/g, (word) => (word.endsWith("s") ? "KPIs" : "KPI"))
    .replace(/KpiYear/g, "KPI year")
    .replace(/KpiSet|KpiPortfolio|KPI portfolio/g, "KPI Portfolio")
    .replace(/KPI check-in/g, "KPI Check-In")
    .replace(/RootPosition/g, "top position");
}
