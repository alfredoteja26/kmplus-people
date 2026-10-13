"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { Button } from "@/components/coss/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/coss/alert-dialog";

/**
 * A destructive or hard-to-undo action that asks once before it runs.
 * Name the action and the object in `title` and `confirmLabel` ("Remove leave type", not "OK").
 *
 *   <ConfirmAction
 *     trigger={<Button variant="ghost" size="sm">Remove</Button>}
 *     title="Remove “Cuti Besar”?"
 *     description="People can no longer choose it. Requests that already use it keep it."
 *     confirmLabel="Remove leave type"
 *     onConfirm={() => removeLeaveType(id)}
 *   />
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
}: {
  trigger: ReactElement;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>{cancelLabel}</AlertDialogClose>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
