"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Textarea } from "@/components/coss/textarea";
import { Callout } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { Select } from "@/components/product/Select";
import { formatDateRange, plural } from "@/lib/labels";
import { personName } from "@/lib/project-view";
import type { AppState, Project, WorkItem } from "@/lib/types";
import { useState } from "react";
import { plainProjectError } from "./errors";

export type WorkItemInput = {
  id?: string;
  name: string;
  description: string;
  picPersonId: string;
  startDate: string;
  endDate: string;
};

export function WorkItemSheet({
  state,
  project,
  workItem,
  canEdit,
  onClose,
  onSave,
  onDelete,
}: {
  state: AppState;
  project: Project;
  workItem?: WorkItem;
  canEdit: boolean;
  onClose: () => void;
  onSave: (input: WorkItemInput) => string | null;
  onDelete: (id: string) => string | null;
}) {
  // The person in charge must have some Staffing on the project, past or present.
  const picIds = new Set(state.staffings.filter((row) => row.projectId === project.id).map((row) => row.personId));
  const picOptions = state.people.filter((row) => picIds.has(row.id)).sort((a, b) => personName(a).localeCompare(personName(b)));

  const [name, setName] = useState(workItem?.name ?? "");
  const [description, setDescription] = useState(workItem?.description ?? "");
  const [picPersonId, setPicPersonId] = useState(workItem?.picPersonId ?? (picIds.has(state.currentPersonId) ? state.currentPersonId : picOptions[0]?.id ?? ""));
  const [startDate, setStartDate] = useState(workItem?.startDate ?? project.startDate);
  const [endDate, setEndDate] = useState(workItem?.endDate ?? project.endDate ?? "");
  const [error, setError] = useState("");

  const attached = workItem ? state.deliverables.filter((row) => row.workItemIds.includes(workItem.id)).length : 0;
  const pic = state.people.find((row) => row.id === workItem?.picPersonId);

  if (!canEdit && workItem) {
    return (
      <FormSheet title={workItem.name} description={formatDateRange(workItem.startDate, workItem.endDate)} onClose={onClose}>
        <dl className="m-0 grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted">Person in charge</dt>
          <dd className="m-0">{personName(pic)}</dd>
          <dt className="text-muted">Deliverables</dt>
          <dd className="m-0">{attached === 0 ? "None attached" : plural(attached, "deliverable")}</dd>
        </dl>
        {workItem.description ? <p className="m-0 text-sm whitespace-pre-line">{workItem.description}</p> : null}
        <p className="m-0 text-sm text-muted">Only an Admin or someone on this project today can change work items.</p>
      </FormSheet>
    );
  }

  return (
    <FormSheet
      title={workItem ? "Edit work item" : "New work item"}
      description={`${project.code} runs ${formatDateRange(project.startDate, project.endDate)}. Work item dates stay inside it.`}
      onClose={onClose}
      submitLabel={workItem ? "Save changes" : "Add work item"}
      submitDisabled={!name.trim() || !picPersonId || !startDate || !endDate}
      onSubmit={() => {
        const message = onSave({ id: workItem?.id, name: name.trim(), description: description.trim(), picPersonId, startDate, endDate });
        if (message) setError(plainProjectError(message));
        else onClose();
      }}
      secondary={
        workItem ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="ghost" className="text-destructive-foreground">
                Delete
              </Button>
            }
            title={`Delete “${workItem.name}”?`}
            description={
              attached > 0
                ? `${plural(attached, "deliverable")} stay on the project and lose only this attachment.`
                : "Nothing else on the project changes."
            }
            confirmLabel="Delete work item"
            onConfirm={() => {
              const message = onDelete(workItem.id);
              if (message) setError(plainProjectError(message));
              else onClose();
            }}
          />
        ) : undefined
      }
    >
      <Field label="Name">
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Description" hint="Optional.">
        <Textarea value={description} rows={3} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <Field
        label="Person in charge"
        hint={picOptions.length === 0 ? "Staff someone on this project first; only people on it can be in charge." : undefined}
      >
        <Select value={picPersonId} onChange={(event) => setPicPersonId(event.target.value)}>
          {picOptions.map((row) => (
            <option key={row.id} value={row.id}>
              {personName(row)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input
            type="date"
            value={startDate}
            min={project.startDate}
            max={project.endDate ?? undefined}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </Field>
        <Field label="End">
          <Input
            type="date"
            value={endDate}
            min={startDate || project.startDate}
            max={project.endDate ?? undefined}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </Field>
      </div>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
