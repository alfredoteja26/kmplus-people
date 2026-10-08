"use client";

import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
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
    return <p className="text-sm text-muted">No parent KPI. This position is at the top of the organization.</p>;
  }

  const mode = item.cascadeMode ?? "indirect";
  const modeLabel = mode === "direct" ? "Direct" : "Indirect";

  if (!canChangeParent && !canChangeCascadeMode) {
    return (
      <div className="text-sm">
        <span className="text-muted">Parent: </span>
        {parentDisplay(state, item.parentKpiItemId)}
        <span className="ml-2 text-muted">· {modeLabel}</span>
      </div>
    );
  }

  const candidates = parentCandidates(state, cycleId, { excludeKpiItemId: item.id });

  return (
    <div className="grid gap-2">
      {canChangeParent ? (
        <Field label="Parent KPI">
          <Select
            required
            value={item.parentKpiItemId ?? ""}
            onChange={(event) => onParentChange(event.target.value || null)}
          >
            <option value="">Choose a parent KPI</option>
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
        <Field label="Link to parent">
          <Select value={mode} onChange={(event) => onCascadeModeChange(event.target.value as CascadeMode)}>
            <option value="indirect">Indirect: aligned, actual stays on this KPI</option>
            <option value="direct">Direct: actual adds into the parent</option>
          </Select>
        </Field>
      ) : (
        <p className="text-xs text-muted">Link to parent: {modeLabel}</p>
      )}
    </div>
  );
}
