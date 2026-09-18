"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Callout, Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCvFieldValue } from "@/lib/cv-parse";
import { fieldValue } from "@/lib/domain";
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
          <h2 className="m-0 text-lg font-medium leading-snug">{cv.fileName}</h2>
          <p className="mt-1 mb-0 text-[13px] text-muted">
            {linkedPerson ? (
              <>
                Linked Person:{" "}
                <Link className="font-medium text-accent underline-offset-2 hover:underline" href={`/people/${cv.personId}`}>
                  {linkedPerson.legalName}
                </Link>
              </>
            ) : (
              "Not linked to a Person yet"
            )}
          </p>
        </div>
        <StatusBadge status={cv.state} />
      </div>

      {locked ? (
        <div className="mb-4">
        <Callout tone={cv.state === "rejected" ? "danger" : "accent"}>
          {cv.state === "applied"
            ? "This document is applied. Field decisions are locked; only accepted or edited values were written to Person."
            : "This document was rejected. Decisions stay visible for audit; no further changes."}
        </Callout>
        </div>
      ) : null}

      {hr && sparseExtract && !locked ? (
        <div className="mb-4">
        <Callout tone="warning">
          Parser returned little or no text. Review each field carefully, or reject the document if the file is unusable.
        </Callout>
        </div>
      ) : null}

      <div className="mb-4">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Proposed fields</p>
        <ul className="m-0 list-none space-y-3 p-0">
          {cv.fields.map((field) => {
            const display = formatCvFieldValue(field.key, fieldValue(field)) || "—";
            const editing = editingKey === field.key;
            return (
              <li
                key={field.key}
                className="rounded-[12px] border-[1.5px] border-line bg-[color-mix(in_srgb,var(--tint)_35%,var(--paper))] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">{field.label}</p>
                    <p className="mt-1 mb-0 whitespace-pre-wrap text-sm leading-relaxed">{display}</p>
                  </div>
                  <StatusBadge status={field.decision} />
                </div>
                {hr && !locked ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => onDecide(field.key, "accepted")}>
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        setEditingKey(field.key);
                        setEditValue(fieldValue(field));
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" type="button" onClick={() => onDecide(field.key, "rejected")}>
                      Reject
                    </Button>
                  </div>
                ) : null}
                {editing ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      value={editValue}
                      aria-label={`Edit ${field.label}`}
                      className="min-w-[min(100%,280px)] flex-1"
                      onChange={(event) => setEditValue(event.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        onDecide(field.key, "edited", editValue);
                        setEditingKey(null);
                      }}
                    >
                      Save edit
                    </Button>
                    <Button variant="ghost" type="button" onClick={() => setEditingKey(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <details className="mb-4 rounded-[12px] border border-line bg-paper px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-muted">Extracted text (audit)</summary>
        {cv.extractedText.trim() ? (
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted">
            {cv.extractedText}
          </pre>
        ) : (
          <p className="mt-2 mb-0 text-sm text-muted">No extracted text stored for this document.</p>
        )}
      </details>

      {hr && !locked ? (
        <div className="grid gap-3 border-t border-line pt-4">
          {pendingCount > 0 ? (
            <Callout tone="warning">
              {pendingCount} {pendingCount === 1 ? "field is" : "fields are"} still pending. Apply writes only accepted and
              edited fields; pending fields are skipped.
            </Callout>
          ) : null}
          <Field label="Apply to">
            <Select value={applyMode} onChange={(event) => setApplyMode(event.target.value)}>
              <option value="new-hire">New Person (Employment draft-hire)</option>
              {state.people.map((person) => (
                <option key={person.id} value={person.id}>
                  Existing: {person.legalName}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onApply}>
              Apply reviewed fields
            </Button>
            <Button variant="danger" type="button" onClick={onReject}>
              Reject document
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
