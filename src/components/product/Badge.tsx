import type { ReactNode } from "react";
import { Badge as CossBadge } from "@/components/coss/badge";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const variant = {
  neutral: "outline",
  accent: "secondary",
  success: "success",
  warning: "warning",
  danger: "error",
} as const;

// The dot lets a status column scan by hue; the label still carries the meaning.
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <CossBadge variant={variant[tone]}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-(--badge-dot)" />
      {children}
    </CossBadge>
  );
}
