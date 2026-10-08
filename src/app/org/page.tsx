"use client";

import { OrgTree } from "@/components/org/OrgTree";
import { Button } from "@/components/coss/button";
import { PageHeader } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
import { Select } from "@/components/product/Select";
import { AppDialog } from "@/components/product/AppDialog";
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
        title="Organization"
        description="Positions and who holds them. Empty positions are shown so you can fill them."
        actions={
          hr ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Add position
            </Button>
          ) : null
        }
      />
      <OrgTree
        hr={hr}
        onEdit={hr ? setEditing : undefined}
        onCreatePosition={hr ? () => setCreateOpen(true) : undefined}
      />
      {createOpen ? (
        <PositionForm
          title="Add position"
          onClose={() => setCreateOpen(false)}
          onSave={(input) => {
            createPosition(input);
            setCreateOpen(false);
          }}
        />
      ) : null}
      {editing ? (
        <PositionForm
          title="Edit position"
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
    <AppDialog title={title} onClose={onClose}>
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
        <Field label="Unit">
          <Select value={orgUnitId} onChange={(event) => setOrgUnitId(event.target.value)}>
            {state.orgUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reports to">
          <Select value={reportsToPositionId} onChange={(event) => setReportsTo(event.target.value)}>
            <option value="">No one (top of the chart)</option>
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
          <Button type="submit">Save position</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </AppDialog>
  );
}
