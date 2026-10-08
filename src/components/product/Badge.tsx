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

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <CossBadge variant={variant[tone]}>{children}</CossBadge>;
}
