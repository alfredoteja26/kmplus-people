/**
 * The brand kit's "image direction": a fine-line mesh ribbon. Each line blends between two sine
 * curves with different phase, so the band twists as it crosses the panel. Drawn once at module load.
 */
const WIDTH = 800;
const HEIGHT = 600;
const LINES = 34;
const STEP = 8;

function edgeA(x: number) {
  return HEIGHT * 0.62 + HEIGHT * 0.2 * Math.sin((x / WIDTH) * Math.PI * 1.7 + 0.2);
}

function edgeB(x: number) {
  return HEIGHT * 0.86 + HEIGHT * 0.09 * Math.sin((x / WIDTH) * Math.PI * 1.3 + 2.8);
}

const OPACITY: string[] = Array.from({ length: LINES }, (_, index) =>
  (0.16 + 0.34 * Math.sin((index / (LINES - 1)) * Math.PI)).toFixed(3),
);

const PATHS: string[] = Array.from({ length: LINES }, (_, index) => {
  const t = index / (LINES - 1);
  const points: string[] = [];
  for (let x = -STEP; x <= WIDTH + STEP; x += STEP) {
    const y = (1 - t) * edgeA(x) + t * edgeB(x);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${points.join("L")}`;
});

export function BrandWave({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <g className="brand-wave" stroke="var(--brand-wave)" strokeWidth={0.7} vectorEffect="non-scaling-stroke">
        {PATHS.map((d, index) => (
          <path key={index} d={d} opacity={OPACITY[index]} />
        ))}
      </g>
    </svg>
  );
}
