"use client";

import { CvDocumentQueue } from "@/components/cv/CvDocumentQueue";
import { CvReviewPanel } from "@/components/cv/CvReviewPanel";
import { CvUploadStrip } from "@/components/cv/CvUploadStrip";
import { Callout, PageHeader } from "@/components/product/Card";
import { isHrLike } from "@/lib/domain";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";

export default function CvPage() {
  const { state, addCv, decideCvField, applyCv, rejectCv } = useStore();
  const hr = isHrLike(state.currentRole);
  const cvs = hr ? state.cvs : state.cvs.filter((row) => row.personId === state.currentPersonId && row.state === "applied");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<"new-hire" | string>("new-hire");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const effectiveSelectedId = useMemo(() => {
    if (selectedId && cvs.some((row) => row.id === selectedId)) return selectedId;
    return cvs.find((row) => row.state === "in-review")?.id ?? cvs[0]?.id ?? "";
  }, [cvs, selectedId]);

  const selected = cvs.find((row) => row.id === effectiveSelectedId);

  const pendingCount = useMemo(
    () => selected?.fields.filter((field) => field.decision === "pending").length ?? 0,
    [selected],
  );

  async function onUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/cv/parse", { method: "POST", body: form });
      const payload = (await response.json()) as {
        error?: string;
        fileName?: string;
        extractedText?: string;
        fields?: { key: string; label: string; value: string }[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "We couldn't read that file");
      }
      const id = addCv({
        personId: null,
        fileName: payload.fileName ?? file.name,
        uploadedAt: new Date().toISOString(),
        state: "in-review",
        extractedText: payload.extractedText ?? "",
        fields: (payload.fields ?? []).map((field) => ({
          ...field,
          decision: "pending" as const,
        })),
      });
      setSelectedId(id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't read that file");
    } finally {
      setBusy(false);
    }
  }

  if (!hr && cvs.length === 0) {
    return (
      <div>
        <PageHeader
          title="CV"
          description="Your CV appears here after HR reviews it and saves it to your profile."
        />
        <Callout>No CV on your profile yet. Once HR saves a reviewed CV, you can view it here.</Callout>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="CV review"
        description={
          hr
            ? "Check each detail we read from the CV. Nothing changes on a profile until you accept it."
            : "Your CV as saved to your profile by HR."
        }
      />

      {hr ? <CvUploadStrip busy={busy} error={error} onFile={(file) => void onUpload(file)} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <CvDocumentQueue
          cvs={cvs}
          selectedId={effectiveSelectedId}
          onSelect={setSelectedId}
          emptyMessage={
            hr
              ? "No CVs to review yet. Upload a CV above to start."
              : "No CV on your profile yet."
          }
        />
        <div>
          {selected ? (
            <CvReviewPanel
              cv={selected}
              hr={hr}
              pendingCount={pendingCount}
              applyMode={applyMode}
              setApplyMode={setApplyMode}
              editingKey={editingKey}
              editValue={editValue}
              setEditingKey={setEditingKey}
              setEditValue={setEditValue}
              onDecide={(key, decision, value) => decideCvField(selected.id, key, decision, value)}
              onApply={() => {
                if (applyMode === "new-hire") applyCv(selected.id, { type: "new-hire" });
                else applyCv(selected.id, { type: "existing", personId: applyMode });
              }}
              onReject={() => rejectCv(selected.id)}
            />
          ) : (
            <Callout>{hr ? "Select a CV from the list, or upload one to start." : "Select a CV from the list."}</Callout>
          )}
        </div>
      </div>
    </div>
  );
}
