import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-accent text-on-accent border-transparent",
    secondary: "bg-paper text-ink border-line",
    ghost: "bg-transparent text-muted border-transparent",
    danger: "bg-danger text-on-accent border-transparent",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-[12px] border-[1.5px] px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
