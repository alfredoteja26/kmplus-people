"use client";

import Link from "next/link";
import { Button } from "@/components/coss/button";
import { Callout, Card } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
import { Select } from "@/components/product/Select";
import { Badge } from "@/components/product/Badge";
import { StatusBadge } from "@/components/product/StatusBadge";
import { formatCvFieldValue } from "@/lib/cv-parse";
import { fieldValue } from "@/lib/domain";
import { plural } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { CurriculumVitae, FieldDecision } from "@/lib/types";

export function CvReviewPanel({
  cv,
  hr,
  pendingCount,
  applyMode,
  setApplyMode,
  editingKey,
  editValue,
  setEditingKey,
  setEditValue,
  onDecide,
  onApply,
  onReject,
}: {
  cv: CurriculumVitae;
  hr: boolean;
  pendingCount: number;
  applyMode: string;
  setApplyMode: (value: string) => void;
  editingKey: string | null;
  editValue: string;
  setEditingKey: (value: string | null) => void;
  setEditValue: (value: string) => void;
  onDecide: (key: string, decision: FieldDecision, value?: string) => void;
  onApply: () => void;
  onReject: () => void;
}) {
  const { state } = useStore();
  const locked = cv.state === "applied" || cv.state === "rejected";
  const linkedPerson = cv.personId ? state.people.find((row) => row.id === cv.personId) : null;
  const sparseExtract = !cv.extractedText.trim();

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="m-0 break-words text-h2 font-medium">{cv.fileName}</h2>
          <p className="mt-1 mb-0 text-sm text-muted">
            {linkedPerson ? (
              <>
                Profile:{" "}
                <Link className="font-medium text-accent underline-offset-2 hover:underline" href={`/people/${cv.personId}`}>
                  {linkedPerson.legalName}
                </Link>
              </>
            ) : (
              "Not linked to a profile yet"
            )}
          </p>
        </div>
        <StatusBadge status={cv.state} />
      </div>

      {locked ? (
        <div className="mb-4">
          <Callout tone={cv.state === "rejected" ? "danger" : "accent"} live="status">
            {cv.state === "applied"
              ? "Applied. Accepted and edited details were saved to the profile. This review is now locked."
              : "Rejected. Nothing from this CV was saved. Your decisions stay visible for reference."}
          </Callout>
        </div>
      ) : null}

      {hr && sparseExtract && !locked ? (
        <div className="mb-4">
          <Callout tone="warning">
            We could read little or no text from this file. Check each detail carefully, or reject the CV if the file is unusable.
          </Callout>
        </div>
      ) : null}

      <div className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-base font-medium">Details found in the CV</h3>
          {hr && !locked && pendingCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                for (const field of cv.fields) {
                  if (field.decision === "pending") onDecide(field.key, "accepted");
                }
                setEditingKey(null);
              }}
            >
              Accept all remaining ({pendingCount})
            </Button>
          ) : null}
        </div>
        <ul className="m-0 list-none space-y-3 p-0">
          {cv.fields.map((field) => {
            const display = formatCvFieldValue(field.key, fieldValue(field)) || "—";
            const editing = editingKey === field.key;
            return (
              <li
                key={field.key}
                className="rounded-[12px] border border-line bg-paper p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-medium text-muted">{field.label}</p>
                    <p className="mt-1 mb-0 whitespace-pre-wrap text-sm leading-relaxed">{display}</p>
                  </div>
                  {field.decision === "pending" ? (
                    <Badge>Not reviewed</Badge>
                  ) : (
                    <StatusBadge status={field.decision} />
                  )}
                </div>
                {hr && !locked && !editing ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`Accept ${field.label}`}
                      disabled={field.decision === "accepted"}
                      onClick={() => onDecide(field.key, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      aria-label={`Edit ${field.label}`}
                      onClick={() => {
                        setEditingKey(field.key);
                        setEditValue(fieldValue(field));
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-destructive-foreground"
                      aria-label={`Reject ${field.label}`}
                      disabled={field.decision === "rejected"}
                      onClick={() => onDecide(field.key, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
                {editing ? (
                  <form
                    className="mt-3 flex flex-wrap gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onDecide(field.key, "edited", editValue);
                      setEditingKey(null);
                    }}
                  >
                    <Input
                      value={editValue}
                      aria-label={`Edit ${field.label}`}
                      className="min-w-[min(100%,280px)] flex-1"
                      autoFocus
                      onChange={(event) => setEditValue(event.target.value)}
                    />
                    <Button type="submit">Save change</Button>
                    <Button variant="ghost" type="button" onClick={() => setEditingKey(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <details className="mb-4 rounded-[12px] border border-line bg-paper px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-muted">Show original CV text</summary>
        {cv.extractedText.trim() ? (
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted">
            {cv.extractedText}
          </pre>
        ) : (
          <p className="mt-2 mb-0 text-sm text-muted">No text was read from this file.</p>
        )}
      </details>

      {hr && !locked ? (
        <div className="grid gap-3 border-t border-line pt-4">
          {pendingCount > 0 ? (
            <Callout tone="warning">
              {plural(pendingCount, "detail")} not reviewed yet. Only accepted and edited details will be saved.
            </Callout>
          ) : null}
          <Field label="Save to">
            <Select value={applyMode} onChange={(event) => setApplyMode(event.target.value)}>
              <option value="new-hire">New person (draft hire)</option>
              <optgroup label="Existing person">
                {state.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.legalName}
                  </option>
                ))}
              </optgroup>
            </Select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onApply}>
              Save to profile
            </Button>
            <ConfirmAction
              trigger={
                <Button variant="destructive-outline" type="button">
                  Reject CV
                </Button>
              }
              title={`Reject “${cv.fileName}”?`}
              description="Nothing from this CV will be saved to a profile, and the review locks. Your decisions stay visible for reference."
              confirmLabel="Reject CV"
              onConfirm={onReject}
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}
