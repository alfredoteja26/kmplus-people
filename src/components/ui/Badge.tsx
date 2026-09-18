import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const styles: Record<Tone, string> = {
    neutral: "bg-tint text-muted",
    accent: "bg-[color-mix(in_srgb,var(--accent)_14%,white)] text-accent",
    success: "bg-[color-mix(in_srgb,var(--success)_16%,white)] text-success",
    warning: "bg-[color-mix(in_srgb,var(--warning)_18%,white)] text-warning",
    danger: "bg-[color-mix(in_srgb,var(--danger)_14%,white)] text-danger",
  };
  return (
    <span className={cn("inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-medium", styles[tone])}>
      {children}
    </span>
  );
}
