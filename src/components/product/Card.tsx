import type { ReactNode } from "react";
import { Card as CossCard } from "@/components/coss/card";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <CossCard className={cn("p-4 sm:p-5", className)}>{children}</CossCard>;
}

export function Callout({
  children,
  tone = "accent",
  live,
  className,
}: {
  children: ReactNode;
  tone?: "accent" | "warning" | "danger";
  /** Announce changes to assistive tech. Danger callouts are alerts by default; static help is not live. */
  live?: "status" | "alert";
  className?: string;
}) {
  const role = live ?? (tone === "danger" ? "alert" : undefined);
  const wash =
    tone === "danger"
      ? "bg-[color-mix(in_srgb,var(--danger)_8%,var(--paper))]"
      : tone === "warning"
        ? "bg-[color-mix(in_srgb,var(--warning)_10%,var(--paper))]"
        : "bg-tint";
  return (
    <div role={role} className={cn("rounded-md border border-border p-4 text-sm", wash, className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-heading text-h1 font-medium">{title}</h1>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="mt-2 mb-0 max-w-[65ch] text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function PageColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6", className)}>{children}</div>;
}
