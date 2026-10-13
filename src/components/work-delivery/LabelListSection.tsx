"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { plainAdminError } from "@/components/work-delivery/admin/errors";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { plural } from "@/lib/labels";
import { ListIcon, PlusIcon } from "lucide-react";
import { useId, useState } from "react";

export type LabelRow = {
  id: string;
  name: string;
  /** How many records carry this label today. */
  uses: number;
  /** A fact about the label itself, e.g. "New deliverables start here". */
  note?: string;
  /** Why this label can never be removed, whatever its use. */
  locked?: string;
};

type SheetState = { kind: "add" } | { kind: "rename"; row: LabelRow } | null;

/**
 * One company list as a paper panel: header with title, count, and Add; one row per label with its use,
 * Rename (a form sheet), and Remove behind a confirm. Remove is disabled, with the reason on the row,
 * when the label is in use, is the last one, or is locked.
 */
export function LabelListSection({
  title,
  noun,
  description,
  context,
  usedBy,
  labels,
  onAdd,
  onRename,
  onRemove,
}: {
  title: string;
  /** Lower-case singular noun for buttons and confirms ("leave type"). */
  noun: string;
  description?: string;
  /** One line on where people meet this list; the Add sheet's context. */
  context: string;
  /** Singular and plural of what carries the label ("deliverable", "deliverables"). */
  usedBy: [string, string];
  labels: LabelRow[];
  onAdd: (name: string) => string | null;
  onRename: (id: string, name: string) => string | null;
  onRemove: (id: string) => string | null;
}) {
  const headingId = useId();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [draft, setDraft] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const usage = (row: LabelRow) => (row.uses > 0 ? `Used by ${plural(row.uses, usedBy[0], usedBy[1])}` : "Not used");
  const last = labels.length <= 1;

  function open(next: SheetState) {
    setDraft(next?.kind === "rename" ? next.row.name : "");
    setSheetError("");
    setNotice("");
    setError("");
    setSheet(next);
  }

  function submit() {
    if (!sheet) return;
    const name = draft.trim();
    const message = sheet.kind === "add" ? onAdd(name) : onRename(sheet.row.id, name);
    if (message) {
      setSheetError(plainAdminError(message));
      return;
    }
    setNotice(sheet.kind === "add" ? `Added “${name}”.` : `Renamed “${sheet.row.name}” to “${name}”.`);
    setSheet(null);
  }

  function remove(row: LabelRow) {
    const message = onRemove(row.id);
    if (message) {
      setNotice("");
      setError(plainAdminError(message));
      return;
    }
    setError("");
    setNotice(`Removed “${row.name}”.`);
  }

  /** Why Remove is off for this row beyond its use, or null. In-use rows say so on their usage line. */
  function blocked(row: LabelRow): string | null {
    if (row.locked) return row.locked;
    if (row.uses === 0 && last) return `The last ${noun} can't be removed.`;
    return null;
  }

  const unchanged = sheet?.kind === "rename" && draft.trim() === sheet.row.name;

  return (
    <section aria-labelledby={headingId} className="min-w-0 self-start overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <h2 id={headingId} className="m-0 flex items-baseline gap-2 text-base font-medium">
            {title}
            <span className="text-sm font-normal text-muted tabular-nums">{labels.length}</span>
          </h2>
          {description ? <p className="mt-0.5 mb-0 max-w-[60ch] text-sm text-muted">{description}</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => open({ kind: "add" })}>
          <PlusIcon aria-hidden="true" />
          Add
        </Button>
      </div>

      {notice ? (
        <p role="status" className="m-0 border-b border-line px-5 py-2.5 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 border-b border-line px-5 py-2.5 text-sm text-destructive-foreground">
          {error}
        </p>
      ) : null}

      {labels.length === 0 ? (
        <EmptyBlock
          className="py-8"
          icon={<ListIcon aria-hidden="true" />}
          title="Nothing on this list yet"
          description={context}
          action={
            <Button type="button" onClick={() => open({ kind: "add" })}>
              <PlusIcon aria-hidden="true" />
              Add the first {noun}
            </Button>
          }
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {labels.map((row) => {
            const reason = blocked(row);
            const inUse = row.uses > 0 && !row.locked;
            const metaId = `${headingId}-${row.id}-use`;
            const reasonId = `${headingId}-${row.id}-reason`;
            return (
              <li
                key={row.id}
                className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line px-5 py-2.5 first:border-t-0"
              >
                <div className="min-w-0 flex-1 basis-48">
                  <p className="m-0 text-sm font-medium break-words text-ink">{row.name}</p>
                  <p id={metaId} className="m-0 text-sm text-muted">
                    {usage(row)}
                    {inUse ? ", so it can't be removed" : null}
                    {row.note ? ` · ${row.note}` : null}
                  </p>
                  {reason ? (
                    <p id={reasonId} className="m-0 text-sm text-faint">
                      {reason}
                    </p>
                  ) : null}
                </div>
                <div className="-mx-2 flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Rename ${row.name}`}
                    onClick={() => open({ kind: "rename", row })}
                  >
                    Rename
                  </Button>
                  {reason || inUse ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled
                      aria-label={`Remove ${row.name}`}
                      aria-describedby={reason ? reasonId : metaId}
                    >
                      Remove
                    </Button>
                  ) : (
                    <ConfirmAction
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted hover:text-destructive-foreground"
                          aria-label={`Remove ${row.name}`}
                        >
                          Remove
                        </Button>
                      }
                      title={`Remove “${row.name}”?`}
                      description={`It is no longer offered as a ${noun}. Nothing uses it today.`}
                      confirmLabel={`Remove ${noun}`}
                      onConfirm={() => remove(row)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {sheet ? (
        <FormSheet
          title={sheet.kind === "add" ? `Add ${noun}` : `Rename ${noun}`}
          description={
            sheet.kind === "add"
              ? context
              : sheet.row.uses > 0
                ? `${usage(sheet.row)}. ${sheet.row.uses === 1 ? "It shows" : "They show"} the new name.`
                : "Not used yet."
          }
          onClose={() => setSheet(null)}
          onSubmit={submit}
          submitLabel={sheet.kind === "add" ? `Add ${noun}` : "Save name"}
          submitDisabled={!draft.trim() || unchanged}
        >
          <Field label="Name" error={sheetError || null}>
            <Input
              autoFocus
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setSheetError("");
              }}
            />
          </Field>
        </FormSheet>
      ) : null}
    </section>
  );
}
