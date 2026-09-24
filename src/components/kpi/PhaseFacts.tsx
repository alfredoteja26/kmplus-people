"use client";

import { StatGauge, type StatGaugeTone } from "@/components/ui/StatGauge";
import { todayIso } from "@/lib/domain";
import { kpiYearPhase } from "@/lib/domain-query";
import { planningCountdownCopy, planningDaysLeft } from "@/lib/phase-desk";
import type { KpiCycle } from "@/lib/types";
import type { ReactNode } from "react";

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
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
      target: "No end date",
      detail: "Set the planning end date on KPI Admin.",
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
      label: stored ? "Stored score" : "Monitoring score",
      value: "—",
      unit: undefined,
      percent: 0,
      tone: "muted" as StatGaugeTone,
      target: "Target 100",
      detail: stored ? "This KPI year is closed." : "The score appears after this portfolio is approved.",
    };
  }
  const tone: StatGaugeTone = score >= 80 ? "accent" : score >= 50 ? "warning" : "danger";
  return {
    label: stored ? "Stored score" : "Monitoring score",
    value: String(score),
    unit: undefined,
    percent: Math.min(1, score / 100),
    tone,
    target: "Target 100",
    detail: stored ? "Saved when the KPI year closed." : "From the latest check-ins. Not saved until the year closes.",
  };
}

export function PhaseFacts({
  cycle,
  score,
  weight,
  extra,
}: {
  cycle: KpiCycle;
  /** Pass a number or null when this page owns one portfolio. Omit on Team, KPI Admin, and KPI tree. */
  score?: number | null;
  /** Portfolio weight total, when this page is editing one portfolio. */
  weight?: number;
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
      <StatGauge
        key="monitoring"
        label="Monitoring"
        value="Open"
        percent={1}
        tone="accent"
        target={cycle.name}
        detail="Open a KPI portfolio to see its latest monitoring score."
      />,
    );
  } else if (phase === "closed") {
    const stored = scoreGauge(score ?? null, true);
    gauges.push(<StatGauge key="stored" {...stored} />);
  }

  if (weight !== undefined) {
    const ready = weight === 100;
    gauges.push(
      <StatGauge
        key="weight"
        label="Weight"
        value={String(weight)}
        unit="%"
        percent={Math.min(1, weight / 100)}
        tone={ready ? "accent" : "warning"}
        target="Target 100%"
        detail={ready ? "Ready to submit." : "Must total 100% before you submit."}
      />,
    );
  }

  if (gauges.length === 0 && !extra) return null;

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {gauges}
      {extra}
    </div>
  );
}
