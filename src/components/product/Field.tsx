"use client";

import type { ReactNode } from "react";
import { Field as CossField, FieldDescription, FieldError, FieldLabel } from "@/components/coss/field";

/**
 * A labelled form row. `hint` sits under the control; `error` marks the field invalid and is announced
 * with it (base-ui wires aria-describedby / aria-invalid to the control).
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <CossField className={`w-full ${className ?? ""}`} invalid={Boolean(error)}>
      <FieldLabel className="text-sm font-medium text-ink">{label}</FieldLabel>
      {children}
      {hint && !error ? <FieldDescription className="text-xs text-muted">{hint}</FieldDescription> : null}
      {error ? (
        <FieldError match className="text-sm text-destructive-foreground">
          {error}
        </FieldError>
      ) : null}
    </CossField>
  );
}
