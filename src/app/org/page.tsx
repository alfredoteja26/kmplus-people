"use client";

import { OrgTree } from "@/components/org/OrgTree";
import { Button } from "@/components/ui/Button";
import { Callout, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { isHrLike } from "@/lib/domain";
import { useStore } from "@/lib/store";
import type { Position } from "@/lib/types";
import { useState } from "react";

export default function OrgPage() {
  const { state, createPosition, updatePosition } = useStore();
  const hr = isHrLike(state.currentRole);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);

  return (
    <div>
      <PageHeader
        kicker="Seats, not people-as-org"
        title="Organization"
        description="The chart is Positions. A current Assignment fills the seat. Empty seats stay visible."
        actions={
          hr ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create Position
            </Button>
          ) : null
        }
      />
      <Callout>Reporting line comes from Position reports-to, not a manager field on Person.</Callout>
      <OrgTree
        hr={hr}
        onEdit={hr ? setEditing : undefined}
        onCreatePosition={hr ? () => setCreateOpen(true) : undefined}
      />
      {createOpen ? (
        <PositionForm
          title="Create Position"
          onClose={() => setCreateOpen(false)}
          onSave={(input) => {
            createPosition(input);
            setCreateOpen(false);
          }}
        />
      ) : null}
      {editing ? (
        <PositionForm
          title="Edit Position"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            updatePosition(editing.id, input);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PositionForm({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  initial?: Position;
  onClose: () => void;
  onSave: (input: Omit<Position, "id" | "tenantId">) => void;
}) {
  const { state } = useStore();
  const [titleValue, setTitleValue] = useState(initial?.title ?? "");
  const [gradeId, setGradeId] = useState(initial?.gradeId ?? state.grades[0]?.id ?? "");
  const [orgUnitId, setOrgUnitId] = useState(initial?.orgUnitId ?? state.orgUnits[0]?.id ?? "");
  const [reportsToPositionId, setReportsTo] = useState(initial?.reportsToPositionId ?? "");

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            title: titleValue,
            gradeId,
            orgUnitId,
            reportsToPositionId: reportsToPositionId || null,
          });
        }}
      >
        <Field label="Title">
          <Input required value={titleValue} onChange={(event) => setTitleValue(event.target.value)} />
        </Field>
        <Field label="Grade">
          <Select value={gradeId} onChange={(event) => setGradeId(event.target.value)}>
            {state.grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.code} {grade.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="OrgUnit">
          <Select value={orgUnitId} onChange={(event) => setOrgUnitId(event.target.value)}>
            {state.orgUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reports to Position">
          <Select value={reportsToPositionId} onChange={(event) => setReportsTo(event.target.value)}>
            <option value="">None (root)</option>
            {state.positions
              .filter((row) => row.id !== initial?.id)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
          </Select>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save Position</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
