import { Button } from "./Button";
import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(34,34,34,0.35)] p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-[16px] border-[1.5px] border-line bg-paper p-5 shadow-[0_10px_28px_-14px_rgba(34,34,34,0.16)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="m-0 text-[22px] font-medium">{title}</h2>
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
