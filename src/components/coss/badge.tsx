"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  // Status, not a control: flat wash plus a 1px inset ring in the tone's own hue. No shadow, no pill, so it never reads as a button.
  "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] font-medium leading-none tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-3.5 sm:[&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [button&,a&]:cursor-pointer [button&,a&]:pointer-coarse:after:absolute [button&,a&]:pointer-coarse:after:size-full [button&,a&]:pointer-coarse:after:min-h-11 [button&,a&]:pointer-coarse:after:min-w-11",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-6 min-w-6 px-2 text-label",
        lg: "h-7 min-w-7 px-2.5 text-sm",
        sm: "h-5 min-w-5 rounded-[4px] px-1.5 text-xs",
      },
      variant: {
        default:
          "bg-primary text-primary-foreground [button&,a&]:hover:bg-primary/90",
        destructive:
          "bg-destructive text-white [button&,a&]:hover:bg-destructive/90",
        error:
          "bg-[color-mix(in_srgb,var(--danger)_8%,white)] text-destructive-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--danger)_22%,transparent)] [--badge-dot:var(--danger)]",
        info: "bg-[color-mix(in_srgb,var(--info)_8%,white)] text-info-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--info)_22%,transparent)] [--badge-dot:var(--info)]",
        outline:
          "bg-wash text-muted shadow-[inset_0_0_0_1px_var(--line)] [--badge-dot:var(--line-strong)] [button&,a&]:hover:bg-tint",
        secondary:
          "bg-[color-mix(in_srgb,var(--accent)_9%,white)] text-accent-hover shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_24%,transparent)] [--badge-dot:var(--accent)] [button&,a&]:hover:bg-[color-mix(in_srgb,var(--accent)_14%,white)]",
        success:
          "bg-[color-mix(in_srgb,var(--success)_9%,white)] text-success-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--success)_24%,transparent)] [--badge-dot:var(--success)]",
        warning:
          "bg-[color-mix(in_srgb,var(--warning)_11%,white)] text-warning-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warning)_30%,transparent)] [--badge-dot:var(--warning)]",
      },
    },
  },
);

export interface BadgeProps extends useRender.ComponentProps<"span"> {
  variant?: VariantProps<typeof badgeVariants>["variant"];
  size?: VariantProps<typeof badgeVariants>["size"];
}

export function Badge({
  className,
  variant,
  size,
  render,
  ...props
}: BadgeProps): React.ReactElement {
  const defaultProps = {
    className: cn(badgeVariants({ className, size, variant })),
    "data-slot": "badge",
  };

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(defaultProps, props),
    render,
  });
}
