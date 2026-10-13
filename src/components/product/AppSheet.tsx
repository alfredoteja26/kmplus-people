"use client";

import type { ReactNode } from "react";
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/coss/sheet";

export function AppSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetPopup className="sm:max-w-[440px]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <SheetPanel>{children}</SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
