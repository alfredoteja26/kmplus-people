"use client";

import { Button } from "@/components/coss/button";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/coss/sheet";
import type { ReactNode } from "react";
import { useId } from "react";

/**
 * A right-hand sheet holding one form: title and one-line context on top, fields in the panel,
 * Cancel and the primary action in the footer, an optional destructive action on the footer's left.
 * Leave `submitLabel` out for a read-only sheet; the footer then offers Close only.
 */
export function FormSheet({
  title,
  description,
  onClose,
  onSubmit,
  submitLabel,
  submitDisabled,
  secondary,
  children,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  secondary?: ReactNode;
  children: ReactNode;
}) {
  const formId = useId();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetPopup className="sm:max-w-[460px]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <SheetPanel>
          <form
            id={formId}
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit?.();
            }}
          >
            {children}
          </form>
        </SheetPanel>
        <SheetFooter className="sm:justify-between">
          {secondary ?? <span className="max-sm:hidden" />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              {submitLabel ? "Cancel" : "Close"}
            </Button>
            {submitLabel ? (
              <Button type="submit" form={formId} disabled={submitDisabled}>
                {submitLabel}
              </Button>
            ) : null}
          </div>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
