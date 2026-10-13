"use client";

import { Input } from "@/components/coss/input";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { Select } from "@/components/product/Select";
import { reportsToChoices, type OrgIndex } from "@/lib/org-view";
import { personName } from "@/lib/project-view";
import type { AppState, Position } from "@/lib/types";
import { useState } from "react";
import { plainOrgError } from "./errors";

export type PositionInput = Omit<Position, "id" | "tenantId">;

/** HR creates a seat, or changes its title, Grade, unit, or who it reports to. */
export function PositionSheet({
  state,
  index,
  position,
  onClose,
  onSave,
}: {
  state: AppState;
  index: OrgIndex;
  position?: Position;
  onClose: () => void;
  /** Returns a refusal message, or null when saved. */
  onSave: (input: PositionInput) => string | null;
}) {
  const [title, setTitle] = useState(position?.title ?? "");
  const [gradeId, setGradeId] = useState(position?.gradeId ?? state.grades[0]?.id ?? "");
  const [orgUnitId, setOrgUnitId] = useState(position?.orgUnitId ?? state.orgUnits[0]?.id ?? "");
  const [reportsTo, setReportsTo] = useState(position?.reportsToPositionId ?? "");
  const [error, setError] = useState("");

  const seat = position ? index.seats.get(position.id) : undefined;
  const choices = reportsToChoices(index, position?.id);
  const hasReports = (seat?.reports.length ?? 0) > 0;
  const gradeKnown = state.grades.some((grade) => grade.id === gradeId);
  const unitKnown = state.orgUnits.some((unit) => unit.id === orgUnitId);

  function save() {
    const message = onSave({
      title: title.trim(),
      gradeId,
      orgUnitId,
      reportsToPositionId: reportsTo || null,
    });
    if (message) setError(plainOrgError(message));
    else onClose();
  }

  return (
    <FormSheet
      title={position ? "Edit position" : "Create position"}
      description={
        position
          ? seat?.holder
            ? `${personName(seat.holder)} holds this position.`
            : "No one holds this position yet."
          : "A position is a seat on the chart. Assign someone to it once it exists."
      }
      onClose={onClose}
      submitLabel={position ? "Save changes" : "Create position"}
      submitDisabled={!title.trim() || !gradeKnown || !unitKnown}
      onSubmit={save}
    >
      <Field label="Title">
        <Input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Senior Consultant" />
      </Field>
      <Field label="Grade" hint={state.grades.length === 0 ? "No grades are set up yet." : undefined}>
        <Select value={gradeId} onChange={(event) => setGradeId(event.target.value)} disabled={state.grades.length === 0}>
          {state.grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {`${grade.code} ${grade.name}`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Unit" hint={state.orgUnits.length === 0 ? "No units are set up yet." : undefined}>
        <Select value={orgUnitId} onChange={(event) => setOrgUnitId(event.target.value)} disabled={state.orgUnits.length === 0}>
          {state.orgUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Reports to"
        hint={
          hasReports
            ? "Positions that report to this one are not listed, so the chart cannot loop."
            : "Leave it at the top of the chart for a top position. More than one is fine."
        }
      >
        <Select value={reportsTo} onChange={(event) => setReportsTo(event.target.value)}>
          <option value="">No one (top of the chart)</option>
          {choices.map((choice) => (
            <option key={choice.position.id} value={choice.position.id}>
              {`${choice.position.title} · ${choice.holder ? personName(choice.holder) : "Empty"}`}
            </option>
          ))}
        </Select>
      </Field>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
