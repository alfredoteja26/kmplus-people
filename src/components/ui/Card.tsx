import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border-[1.5px] border-line bg-paper p-4 shadow-[var(--shadow)] sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Callout({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "warning" | "danger" }) {
  const wash =
    tone === "danger"
      ? "bg-[color-mix(in_srgb,var(--danger)_8%,var(--paper))]"
      : tone === "warning"
        ? "bg-[color-mix(in_srgb,var(--warning)_10%,var(--paper))]"
        : "bg-tint";
  return (
    <div role="status" className={cn("rounded-[12px] border-[1.5px] border-line p-4 text-sm", wash)}>
      {children}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {kicker ? <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">{kicker}</p> : null}
        <h1 className="m-0 text-[30px] font-medium leading-[1.2] tracking-[-0.02em]">{title}</h1>
        {description ? <p className="mt-1 mb-0 max-w-[62ch] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
