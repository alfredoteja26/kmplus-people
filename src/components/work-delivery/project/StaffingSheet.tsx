"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Callout } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { Select } from "@/components/product/Select";
import { formatDate } from "@/lib/labels";
import { personName } from "@/lib/project-view";
import type { AppState, Project, Staffing } from "@/lib/types";
import { jakartaTodayIso, personLoadSum, staffingCoversDate } from "@/lib/work-delivery-query";
import { useState } from "react";
import { plainProjectError } from "./errors";

export type StaffingInput = { personId: string; startDate: string; endDate: string | null; load: number };

/** Admin puts a Person on the project for a period and a load, or changes or removes that period. */
export function StaffingSheet({
  state,
  project,
  staffing,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: {
  state: AppState;
  project: Project;
  staffing?: Staffing;
  onClose: () => void;
  onAdd: (input: StaffingInput) => string | null;
  onUpdate: (id: string, patch: Omit<StaffingInput, "personId">) => string | null;
  onDelete: (id: string) => string | null;
}) {
  const today = jakartaTodayIso();
  const people = [...state.people].sort((a, b) => personName(a).localeCompare(personName(b)));
  const [personId, setPersonId] = useState(staffing?.personId ?? people[0]?.id ?? "");
  const [startDate, setStartDate] = useState(staffing?.startDate ?? (project.startDate > today ? project.startDate : today));
  const [endDate, setEndDate] = useState(staffing?.endDate ?? project.endDate ?? "");
  const [load, setLoad] = useState(String(staffing?.load ?? 50));
  const [error, setError] = useState("");

  const person = state.people.find((row) => row.id === personId);
  const loadNumber = Number(load);
  const validLoad = Number.isInteger(loadNumber) && loadNumber >= 1 && loadNumber <= 100;
  // Load on the first day of this period, counting every other project, so the overload is visible before saving.
  const checkDate = startDate > today ? startDate : today;
  const elsewhere =
    personLoadSum(state, personId, checkDate) -
    (staffing && staffingCoversDate(staffing, checkDate) ? staffing.load : 0);
  const projected = elsewhere + (validLoad ? loadNumber : 0);

  function save() {
    const input = { startDate, endDate: endDate || null, load: loadNumber };
    const message = staffing ? onUpdate(staffing.id, input) : onAdd({ personId, ...input });
    if (message) setError(plainProjectError(message));
    else onClose();
  }

  return (
    <FormSheet
      title={staffing ? `${personName(person)} on ${project.code}` : `Add someone to ${project.code}`}
      description={staffing ? `Since ${formatDate(staffing.startDate)}` : "Choose who, from when, and how much of their time."}
      onClose={onClose}
      submitLabel={staffing ? "Save changes" : "Add to project"}
      submitDisabled={!personId || !startDate || !validLoad}
      onSubmit={save}
      secondary={
        staffing ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="ghost" className="text-destructive-foreground">
                Remove
              </Button>
            }
            title={`Remove ${personName(person)} from ${project.code}?`}
            description="Their logged hours stay. To keep the history of who was on the project, set an end date instead."
            confirmLabel="Remove from project"
            onConfirm={() => {
              const message = onDelete(staffing.id);
              if (message) setError(plainProjectError(message));
              else onClose();
            }}
          />
        ) : undefined
      }
    >
      {staffing ? null : (
        <Field label="Person">
          <Select value={personId} onChange={(event) => setPersonId(event.target.value)}>
            {people.map((row) => (
              <option key={row.id} value={row.id}>
                {personName(row)}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </Field>
        <Field label="Until" hint="Optional.">
          <Input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
      </div>
      <Field
        label="Load"
        hint={
          validLoad ? (
            <span className={projected > 100 ? "text-warning-foreground" : undefined}>
              {personName(person)} would be at {projected}% across projects on {formatDate(checkDate)}
              {projected > 100 ? `, ${projected - 100}% over full time. Saving is allowed; the overload stays visible.` : "."}
            </span>
          ) : (
            "A whole percent of full time, from 1 to 100."
          )
        }
      >
        <div className="relative">
          <Input inputMode="numeric" value={load} onChange={(event) => setLoad(event.target.value.replace(/[^0-9]/g, ""))} className="pr-8" />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">%</span>
        </div>
      </Field>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
