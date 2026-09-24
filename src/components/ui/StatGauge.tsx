const START = 144;
const SWEEP = 252;

const TONE = {
  accent: "#1E857C",
  warning: "#C9891A",
  danger: "#C4353A",
  muted: "#757575",
} as const;

export type StatGaugeTone = keyof typeof TONE;

function arc(cx: number, cy: number, r: number, start: number, sweep: number) {
  const end = start + sweep;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const sx = cx + r * Math.cos(rad(start));
  const sy = cy + r * Math.sin(rad(start));
  const ex = cx + r * Math.cos(rad(end));
  const ey = cy + r * Math.sin(rad(end));
  const large = sweep > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

export function StatGauge({
  label,
  value,
  unit,
  percent,
  tone,
  target,
  detail,
}: {
  label: string;
  value: string;
  unit?: string;
  /** 0 to 1. The open ring fills clockwise from the lower left, over the top. */
  percent: number;
  tone: StatGaugeTone;
  target: string;
  detail: string;
}) {
  const clamped = Math.max(0, Math.min(1, percent));
  const color = TONE[tone];
  const track = arc(60, 60, 46, START, SWEEP);
  const valuePath = clamped > 0 ? arc(60, 60, 46, START, Math.max(clamped * SWEEP, 4)) : null;

  return (
    <article className="rounded-[16px] border-[1.5px] border-line bg-paper p-5">
      <h2 className="m-0 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">{label}</h2>
      <div className="relative mx-auto mt-1 grid h-40 w-40 place-items-center">
        <svg viewBox="0 0 120 120" className="h-40 w-40" role="img" aria-label={`${label}: ${value}${unit ? ` ${unit}` : ""}. ${detail}`}>
          <path d={track} fill="none" stroke="#DEDEDE" strokeWidth="8" strokeLinecap="round" />
          {valuePath ? (
            <path d={valuePath} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center pb-2">
          <p className="m-0 text-center text-[30px] font-medium leading-none tabular-nums tracking-[-0.02em] text-ink">
            {value}
            {unit ? <span className="ml-1 text-sm font-normal text-muted">{unit}</span> : null}
          </p>
        </div>
      </div>
      <p className="m-0 text-sm text-muted">{target}</p>
      <p className="mt-1 mb-0 text-sm text-ink">{detail}</p>
    </article>
  );
}
