"use client";

import { StatusBadge } from "@/components/product/StatusBadge";
import type { Tone } from "@/lib/my-kpi-view";
import { weightFact } from "@/lib/my-kpi-view";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const TEXT: Record<Tone, string> = {
  neutral: "text-ink",
  accent: "text-ink",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  danger: "text-destructive-foreground",
};

const FILL: Record<Tone, string> = {
  neutral: "bg-line-strong",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

/** One fact on the strip: a quiet label over one value, the project page's facts pattern. */
export function Fact({ label, children, detail }: { label: string; children: ReactNode; detail?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="m-0 flex min-h-6 flex-wrap items-center gap-x-2 text-base font-medium tabular-nums">
        {children}
        {detail ? <span className="text-sm font-normal text-muted">{detail}</span> : null}
      </dd>
    </div>
  );
}

export function FactsStrip({ children }: { children: ReactNode }) {
  return (
    <dl className="m-0 flex flex-wrap items-start gap-x-10 gap-y-4 rounded-2xl bg-paper px-5 py-4 shadow-(--shadow)">{children}</dl>
  );
}

export function StatusFact({ status, detail }: { status: string; detail?: string }) {
  return (
    <Fact label="KPI Portfolio" detail={detail}>
      <StatusBadge status={status} />
    </Fact>
  );
}

/** Weights as "N% of 100%" with a meter; success tone only at exactly 100. */
export function WeightFact({ sum }: { sum: number }) {
  const fact = weightFact(sum);
  return (
    <Fact label="Weights">
      <span className="flex items-center gap-2">
        <span
          role="meter"
          aria-label="Weights against 100%"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sum}
          className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_var(--line)]"
        >
          <span className={cn("block h-full rounded-full transition-[width] duration-300 ease-out", FILL[fact.tone])} style={{ width: `${fact.percent}%` }} />
        </span>
        <span className={cn("whitespace-nowrap", TEXT[fact.tone])}>{fact.text}</span>
      </span>
    </Fact>
  );
}

export function ToneFact({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: Tone }) {
  return (
    <Fact label={label} detail={detail}>
      <span className={TEXT[tone]}>{value}</span>
    </Fact>
  );
}

export function ScoreFact({ label, value, detail }: { label: string; value: string | null; detail: string }) {
  return (
    <Fact label={label} detail={value === null ? undefined : detail}>
      {value === null ? <span className="text-sm font-normal text-muted">{detail}</span> : value}
    </Fact>
  );
}
