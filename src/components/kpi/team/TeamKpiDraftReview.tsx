"use client";

import { CascadeFields } from "@/components/kpi/CascadeFields";
import { DirectMixField } from "@/components/kpi/DirectMixField";
import { Callout } from "@/components/ui/Card";
import { Td, Th } from "@/components/ui/Table";
import { isRootAssignment } from "@/lib/cascade";
import type { AppState, KpiItem, KpiSet } from "@/lib/types";

type Props = {
  state: AppState;
  cycleId: string;
  kpiSet: KpiSet;
  assignmentId: string;
  items: KpiItem[];
  onSaveItem: (patch: Omit<KpiItem, "tenantId">) => void;
};

export function TeamKpiDraftReview({ state, cycleId, kpiSet, assignmentId, items, onSaveItem }: Props) {
  const rootAssignment = isRootAssignment(state, assignmentId);

  return (
    <div className="space-y-3 py-1">
      {kpiSet.status === "returned" && kpiSet.returnComment ? (
        <Callout tone="warning">Return comment: {kpiSet.returnComment}</Callout>
      ) : null}
      <div className="overflow-x-auto rounded-[8px] border border-line bg-canvas">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <Th className="text-[10px]">KpiItem</Th>
              <Th className="text-[10px]">Weight</Th>
              <Th className="text-[10px]">Parent & cascade</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="border-b border-line px-3 py-2.5 text-[13px] text-muted">
                  No items on this KpiSet yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <div className="font-medium">{item.name}</div>
                    {item.definition ? <div className="text-muted">{item.definition}</div> : null}
                    <DirectMixField
                      state={state}
                      item={item}
                      canEdit
                      onChange={(directMix) => onSaveItem({ ...item, directMix })}
                    />
                  </Td>
                  <Td>{item.weight}%</Td>
                  <Td>
                    <CascadeFields
                      state={state}
                      cycleId={cycleId}
                      item={item}
                      rootAssignment={rootAssignment}
                      canChangeParent
                      canChangeCascadeMode
                      onParentChange={(parentId) => onSaveItem({ ...item, parentKpiItemId: parentId })}
                      onCascadeModeChange={(cascadeMode) => onSaveItem({ ...item, cascadeMode })}
                    />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
