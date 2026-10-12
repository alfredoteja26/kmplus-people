"use client";

import { Input } from "@/components/coss/input";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import type { Project } from "@/lib/types";
import { useState } from "react";
import { plainProjectError } from "./errors";

export type ProjectInput = {
  code: string;
  name: string;
  clientName: string | null;
  startDate: string;
  endDate: string | null;
};

/** Open a project, or edit one. Editing keeps the same record, so a new code relabels it rather than creating a second project. */
export function ProjectSheet({
  project,
  onClose,
  onSave,
}: {
  project?: Project;
  onClose: () => void;
  onSave: (input: ProjectInput) => string | null;
}) {
  const [code, setCode] = useState(project?.code ?? "");
  const [name, setName] = useState(project?.name ?? "");
  const [clientName, setClientName] = useState(project?.clientName ?? "");
  const [startDate, setStartDate] = useState(project?.startDate ?? "");
  const [endDate, setEndDate] = useState(project?.endDate ?? "");
  const [error, setError] = useState("");

  return (
    <FormSheet
      title={project ? "Edit project" : "New project"}
      description={project ? "Changes apply to this project, a new code included. No second project is created." : "Leave the client blank for internal work. Code, client, and dates can change later."}
      onClose={onClose}
      submitLabel={project ? "Save changes" : "Create project"}
      submitDisabled={!code.trim() || !name.trim() || !startDate}
      onSubmit={() => {
        const message = onSave({
          code: code.trim(),
          name: name.trim(),
          clientName: clientName.trim() || null,
          startDate,
          endDate: endDate || null,
        });
        if (message) setError(plainProjectError(message));
        else onClose();
      }}
    >
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
        <Field label="Code">
          <Input value={code} autoCapitalize="characters" onChange={(event) => setCode(event.target.value)} />
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
      </div>
      <Field label="Client" hint="Blank means internal work.">
        <Input value={clientName} placeholder="Internal" onChange={(event) => setClientName(event.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </Field>
        <Field label="End" hint="Optional.">
          <Input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
      </div>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
