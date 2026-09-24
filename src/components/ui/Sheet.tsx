"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previously = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previously?.focus();
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-[rgba(34,34,34,0.32)] lg:hidden"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-sheet-title"
        className="fixed inset-0 z-50 flex flex-col bg-paper shadow-[-16px_0_32px_-20px_rgba(34,34,34,0.28)] motion-safe:animate-[sheet-in_220ms_cubic-bezier(0.16,1,0.3,1)_both] lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[440px] lg:border-l-[1.5px] lg:border-line"
      >
        <div className="flex items-start justify-between gap-3 border-b-[1.5px] border-line px-5 py-4">
          <h2 id="kpi-sheet-title" className="m-0 text-[22px] font-medium leading-[1.3]">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-[12px] px-3 text-sm font-medium text-muted hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
      </aside>
    </>
  );
}
