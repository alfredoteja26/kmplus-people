"use client";

import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";

export function CvUploadStrip({
  busy,
  error,
  onFile,
}: {
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
}) {
  return (
    <Card className="mb-4 !p-3 sm:!p-3">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-[min(100%,220px)] flex-1">
          <Field label="Upload .pdf or .docx">
            <Input
              type="file"
              accept=".pdf,.docx"
              disabled={busy}
              className="h-9 py-1 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-accent"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.target.value = "";
              }}
            />
          </Field>
        </div>
        {busy ? <p className="mb-2 text-sm text-muted">Parsing document…</p> : null}
      </div>
      {error ? (
        <p className="mb-0 mt-2 text-sm text-danger" role="alert">
          {error}. Choose another file or try again.
        </p>
      ) : null}
    </Card>
  );
}
