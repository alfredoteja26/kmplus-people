"use client";

import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { Select } from "@/components/product/Select";
import type { OrgIndex } from "@/lib/org-view";
import { personName } from "@/lib/project-view";
import type { AppState, Person } from "@/lib/types";
import { useMemo, useState } from "react";
import { plainOrgError } from "./errors";

/** HR fills an empty seat. Someone who already holds a position moves here; their current position ends today. */
export function AssignSeatSheet({
  state,
  index,
  positionId,
  onClose,
  onAssign,
}: {
  state: AppState;
  index: OrgIndex;
  positionId: string;
  onClose: () => void;
  /** Returns a refusal message, or null when assigned. */
  onAssign: (personId: string) => string | null;
}) {
  const seat = index.seats.get(positionId);
  const [personId, setPersonId] = useState("");
  const [error, setError] = useState("");

  // Who holds what today, by Person: the seats they would leave (assigning ends every current one).
  const heldBy = useMemo(() => {
    const held = new Map<string, string>();
    for (const row of index.seats.values()) {
      if (!row.holder) continue;
      const before = held.get(row.holder.id);
      held.set(row.holder.id, before ? `${before} and ${row.position.title}` : row.position.title);
    }
    return held;
  }, [index]);

  const { open, placed } = useMemo(() => {
    const byName = (a: Person, b: Person) => a.legalName.localeCompare(b.legalName);
    return {
      open: state.people.filter((person) => !heldBy.has(person.id)).sort(byName),
      placed: state.people.filter((person) => heldBy.has(person.id)).sort(byName),
    };
  }, [state.people, heldBy]);

  if (!seat) return null;
  const unit = seat.unit?.name;
  const description = unit ? `${seat.position.title} · ${unit}` : seat.position.title;

  if (seat.holder) {
    return (
      <FormSheet title="Assign someone" description={description} onClose={onClose}>
        <Callout tone="warning">
          {personName(seat.holder)} already holds this position. To put someone else here, move {personName(seat.holder)} to
          another position from their profile first.
        </Callout>
      </FormSheet>
    );
  }

  const chosen = state.people.find((person) => person.id === personId);
  const leaving = chosen ? heldBy.get(chosen.id) : undefined;

  return (
    <FormSheet
      title="Assign someone"
      description={description}
      onClose={onClose}
      submitLabel="Assign"
      submitDisabled={!personId}
      onSubmit={() => {
        if (!personId) return;
        const message = onAssign(personId);
        if (message) setError(plainOrgError(message));
        else onClose();
      }}
    >
      <Field
        label="Person"
        hint={
          leaving
            ? `${personName(chosen)} leaves ${leaving} today and moves here.`
            : "People without a position are listed first. Choosing someone who holds one moves them here."
        }
      >
        <Select value={personId} onChange={(event) => setPersonId(event.target.value)} required>
          <option value="">Select a person</option>
          {open.map((person) => (
            <option key={person.id} value={person.id}>
              {person.legalName}
            </option>
          ))}
          {placed.map((person) => (
            <option key={person.id} value={person.id}>
              {`${person.legalName} · now ${heldBy.get(person.id)}`}
            </option>
          ))}
        </Select>
      </Field>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
