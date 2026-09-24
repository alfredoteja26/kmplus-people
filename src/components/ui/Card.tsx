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

export function Callout({ children, tone = "accent", className }: { children: ReactNode; tone?: "accent" | "warning" | "danger"; className?: string }) {
  const wash =
    tone === "danger"
      ? "bg-[color-mix(in_srgb,var(--danger)_8%,var(--paper))]"
      : tone === "warning"
        ? "bg-[color-mix(in_srgb,var(--warning)_10%,var(--paper))]"
        : "bg-tint";
  return (
    <div role="status" className={cn("rounded-[12px] border-[1.5px] border-line p-4 text-sm", wash, className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {kicker ? <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">{kicker}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-[30px] font-medium leading-[1.2] tracking-[-0.02em]">{title}</h1>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="mt-2 mb-0 max-w-[62ch] text-muted">{description}</p> : null}
    </div>
  );
}

/** Performance pages share one measure so stats and actions do not stretch to the viewport edge. */
export function PageColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6", className)}>{children}</div>;
}
