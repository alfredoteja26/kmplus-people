"use client";

import { Field, Select } from "@/components/ui/Input";
import { parentCandidates } from "@/lib/cascade";
import { personById, positionById } from "@/lib/domain";
import type { AppState, CascadeMode, KpiItem } from "@/lib/types";

type Props = {
  state: AppState;
  cycleId: string;
  item: KpiItem;
  rootAssignment: boolean;
  canChangeParent: boolean;
  canChangeCascadeMode: boolean;
  onParentChange: (parentKpiItemId: string | null) => void;
  onCascadeModeChange: (cascadeMode: CascadeMode) => void;
};

function parentDisplay(state: AppState, parentId: string | null | undefined): string {
  if (!parentId) return "—";
  const parent = state.kpiItems.find((row) => row.id === parentId);
  if (!parent) return parentId;
  const set = state.kpiSets.find((row) => row.id === parent.kpiSetId);
  const assignment = set ? state.assignments.find((row) => row.id === set.assignmentId) : undefined;
  if (!assignment) return parent.name;
  const person = personById(state, assignment.personId);
  const position = positionById(state, assignment.positionId);
  const who = person?.preferredName ?? person?.legalName ?? "Unknown";
  const seat = position?.title ?? "Position";
  return `${who} · ${seat} · ${parent.name}`;
}

export function CascadeFields({
  state,
  cycleId,
  item,
  rootAssignment,
  canChangeParent,
  canChangeCascadeMode,
  onParentChange,
  onCascadeModeChange,
}: Props) {
  if (rootAssignment) {
    return <p className="text-sm text-muted">RootPosition — no parent</p>;
  }

  const mode = item.cascadeMode ?? "indirect";

  if (!canChangeParent && !canChangeCascadeMode) {
    return (
      <div className="text-sm">
        <span className="text-muted">Parent: </span>
        {parentDisplay(state, item.parentKpiItemId)}
        <span className="ml-2 text-muted capitalize">({mode})</span>
      </div>
    );
  }

  const candidates = parentCandidates(state, cycleId, { excludeKpiItemId: item.id });

  return (
    <div className="grid gap-2">
      {canChangeParent ? (
        <Field label="Parent KpiItem">
          <Select
            required
            value={item.parentKpiItemId ?? ""}
            onChange={(event) => onParentChange(event.target.value || null)}
          >
            <option value="">Select parent…</option>
            {candidates.map((row) => (
              <option key={row.kpiItemId} value={row.kpiItemId}>
                {row.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-sm">
          <span className="text-muted">Parent: </span>
          {parentDisplay(state, item.parentKpiItemId)}
        </p>
      )}
      {canChangeCascadeMode ? (
        <Field label="Cascade">
          <Select value={mode} onChange={(event) => onCascadeModeChange(event.target.value as CascadeMode)}>
            <option value="indirect">Indirect — alignment only</option>
            <option value="direct">Direct — CheckIn adds into parent</option>
          </Select>
        </Field>
      ) : (
        <p className="text-xs text-muted capitalize">Cascade: {mode}</p>
      )}
    </div>
  );
}
