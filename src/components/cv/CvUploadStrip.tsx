"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/coss/button";
import { Card } from "@/components/product/Card";

export function CvUploadStrip({
  busy,
  error,
  onFile,
}: {
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <Card className="mb-4 !p-3 sm:!p-3">
      <div
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-dashed px-4 py-3 transition-colors ${
          dragging ? "border-accent bg-tint" : "border-line-strong"
        }`}
        onDragOver={(event) => {
          if (busy) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (busy) return;
          const file = event.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.docx"
          className="sr-only"
          disabled={busy}
          aria-describedby={hintId}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
        <Button type="button" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
          Upload a CV
        </Button>
        <p id={hintId} className="m-0 min-w-0 flex-1 text-sm text-muted" aria-live="polite">
          {busy ? "Reading CV…" : "PDF or Word (.docx). Choose a file or drop it here."}
        </p>
      </div>
      {error ? (
        <p className="mb-0 mt-2 text-sm text-destructive-foreground" role="alert">
          {error.replace(/\.$/, "")}. Choose another file or try again.
        </p>
      ) : null}
    </Card>
  );
}
