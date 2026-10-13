"use client";

import { frequencyLabel, kpiYearName } from "@/components/kpi/kpi-copy";
import { StatGauge, type StatGaugeTone } from "@/components/product/StatGauge";
import { todayIso } from "@/lib/domain";
import { kpiYearPhase } from "@/lib/domain-query";
import { formatDate } from "@/lib/labels";
import { planningCountdownCopy, planningDaysLeft } from "@/lib/phase-desk";
import type { KpiCycle } from "@/lib/types";
import type { ReactNode } from "react";

/** Plain fact card for words and counts that are not progress toward a target. Same surface as StatGauge, no ring. */
export function FactTile({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <article className="rounded-2xl bg-card p-5 shadow-[var(--shadow)]">
      <h2 className="m-0 text-xs font-medium uppercase tracking-[0.06em] text-faint">{label}</h2>
      <p className="mt-3 mb-0 text-h2 font-medium tabular-nums text-foreground">{value}</p>
      {detail ? <p className="mt-2 mb-0 text-sm text-muted-foreground">{detail}</p> : null}
    </article>
  );
}

function planningGauge(cycle: KpiCycle) {
  const days = planningDaysLeft(cycle.planningEndsOn, todayIso());
  const ended = cycle.planningEndsOn ? formatDate(cycle.planningEndsOn) : null;
  if (days === null) {
    return {
      value: "—",
      unit: undefined,
      percent: 0,
      tone: "muted" as StatGaugeTone,
      target: "No end date set",
      detail: "An Admin sets the planning end date on KPI Admin.",
    };
  }
  if (days < 0) {
    return {
      value: String(Math.abs(days)),
      unit: Math.abs(days) === 1 ? "day" : "days",
      percent: 1,
      tone: "danger" as StatGaugeTone,
      target: ended ? `Ended ${ended}` : "Planning ended",
      detail: planningCountdownCopy(cycle.planningEndsOn, todayIso()),
    };
  }
  const tone: StatGaugeTone = days <= 3 ? "warning" : "accent";
  return {
    value: String(days),
    unit: days === 1 ? "day" : "days",
    percent: days === 0 ? 0.04 : Math.min(1, days / 14),
    tone,
    target: ended ? `Ends ${ended}` : "Planning",
    detail: planningCountdownCopy(cycle.planningEndsOn, todayIso()),
  };
}

function scoreGauge(score: number | null, stored: boolean) {
  if (score === null) {
    return {
      label: stored ? "Final score" : "Current score",
      value: "—",
      unit: undefined,
      percent: 0,
      tone: "muted" as StatGaugeTone,
      target: "Target 100",
      detail: stored ? "No final score was saved for this KPI Portfolio." : "Shown once your KPI Portfolio is approved.",
    };
  }
  const tone: StatGaugeTone = score >= 80 ? "accent" : score >= 50 ? "warning" : "danger";
  return {
    label: stored ? "Final score" : "Current score",
    value: String(score),
    unit: undefined,
    percent: Math.min(1, score / 100),
    tone,
    target: "Target 100",
    detail: stored ? "Saved when the KPI year closed." : "Based on your latest approved KPI Check-Ins. Final when the KPI year closes.",
  };
}

export function PhaseFacts({
  cycle,
  score,
  extra,
}: {
  cycle: KpiCycle;
  /** Team, KPI Admin, and KPI tree omit it. My KPI shows its own facts strip instead (my-kpi/my-kpi-facts.tsx). */
  score?: number | null;
  extra?: ReactNode;
}) {
  const phase = kpiYearPhase(cycle);
  const gauges = [];

  if (phase === "planning") {
    const planning = planningGauge(cycle);
    gauges.push(
      <StatGauge key="planning" label="Planning time" {...planning} />,
    );
  } else if (phase === "monitoring" && score !== undefined) {
    const monitoring = scoreGauge(score, false);
    gauges.push(<StatGauge key="score" {...monitoring} />);
  } else if (phase === "monitoring") {
    gauges.push(
      <FactTile
        key="monitoring"
        label={kpiYearName(cycle)}
        value="Monitoring"
        detail={`KPI Check-Ins are open. Default frequency: ${frequencyLabel(cycle.checkInCadence).toLowerCase()}.`}
      />,
    );
  } else if (phase === "closed") {
    const stored = scoreGauge(score ?? null, true);
    gauges.push(<StatGauge key="stored" {...stored} />);
  }

  if (gauges.length === 0 && !extra) return null;

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {gauges}
      {extra}
    </div>
  );
}
