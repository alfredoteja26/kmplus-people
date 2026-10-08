"use client";

import { Button } from "@/components/coss/button";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { AppDialog } from "@/components/product/AppDialog";
import { assignmentForPosition, currentAssignment, personById, positionById, todayIso } from "@/lib/domain";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";

export function AssignSeatModal({
  positionId,
  onClose,
}: {
  positionId: string;
  onClose: () => void;
}) {
  const { state, assignPosition } = useStore();
  const position = positionById(state, positionId);
  const [personId, setPersonId] = useState("");

  const { unassigned, assigned } = useMemo(() => {
    const open: typeof state.people = [];
    const taken: typeof state.people = [];
    for (const person of state.people) {
      if (currentAssignment(state, person.id)) {
        taken.push(person);
      } else {
        open.push(person);
      }
    }
    open.sort((a, b) => a.legalName.localeCompare(b.legalName));
    taken.sort((a, b) => a.legalName.localeCompare(b.legalName));
    return { unassigned: open, assigned: taken };
  }, [state]);

  if (!position) return null;

  const occupied = assignmentForPosition(state, positionId);

  return (
    <AppDialog title="Assign person" onClose={onClose}>
      <p className="mt-0 mb-4 text-sm text-muted">
        Position: <strong className="font-medium text-ink">{position.title}</strong>
      </p>
      {occupied ? (
        <p className="text-sm text-warning-foreground">
          {personById(state, occupied.personId)?.legalName} already holds this position. Assign them to another
          position from their profile first.
        </p>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!personId) return;
            assignPosition(personId, positionId, todayIso());
            onClose();
          }}
        >
          <Field label="Person">
            <Select value={personId} onChange={(event) => setPersonId(event.target.value)} required>
              <option value="">Select a person</option>
              {unassigned.length > 0 ? (
                <optgroup label="No current position">
                  {unassigned.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.legalName}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {assigned.length > 0 ? (
                <optgroup label="Has a position (will move here)">
                  {assigned.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.legalName}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </Select>
          </Field>
          <p className="m-0 text-sm text-muted">
            Assigning ends the person&apos;s current position and moves them here.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={!personId}>
              Assign
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </AppDialog>
  );
}
