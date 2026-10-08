"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Card } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { useState } from "react";

type LabelRow = { id: string; name: string };

export function LabelListSection({
  title,
  description,
  labels,
  onAdd,
  onRename,
  onRemove,
}: {
  title: string;
  description?: string;
  labels: LabelRow[];
  onAdd: (name: string) => string | null;
  onRename: (id: string, name: string) => string | null;
  onRemove: (id: string) => string | null;
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [addError, setAddError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const noun = title.toLowerCase();

  return (
    <Card>
      <section>
        <h2 className="mt-0 mb-1 text-h2 font-medium">{title}</h2>
        {description ? <p className="m-0 mb-4 max-w-[65ch] text-sm text-muted">{description}</p> : null}
        {labels.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nothing on this list yet. Add the first {noun} below.</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {labels.map((row) => {
              const draft = drafts[row.id] ?? row.name;
              const changed = draft.trim() !== row.name;
              return (
                <li key={row.id}>
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setError(onRename(row.id, draft.trim()) ?? "");
                    }}
                  >
                    <Input
                      className="min-w-0 flex-1 sm:max-w-xs"
                      aria-label={`Name for ${row.name}`}
                      value={draft}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}
                    />
                    <Button type="submit" variant="outline" size="sm" disabled={!changed}>
                      Save
                    </Button>
                    <ConfirmAction
                      trigger={
                        <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${row.name}`}>
                          Remove
                        </Button>
                      }
                      title={`Remove “${row.name}”?`}
                      description={`It will no longer be offered as a ${noun}. A label that is already in use can't be removed.`}
                      confirmLabel={`Remove ${noun}`}
                      onConfirm={() => setError(onRemove(row.id) ?? "")}
                    />
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        {error ? (
          <p role="alert" className="m-0 mt-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <form
          className="mt-4 flex flex-wrap items-start gap-3 border-t border-line pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const err = onAdd(newName.trim());
            if (!err) setNewName("");
            setAddError(err ?? "");
          }}
        >
          <Field label={`New ${noun}`} error={addError || null} className="min-w-[12rem] flex-1">
            <Input
              value={newName}
              onChange={(event) => {
                setNewName(event.target.value);
                setAddError("");
              }}
            />
          </Field>
          <Button type="submit" className="mt-7">
            Add
          </Button>
        </form>
      </section>
    </Card>
  );
}
