"use client";

import { CascadeFields } from "@/components/kpi/CascadeFields";
import { DirectMixField } from "@/components/kpi/DirectMixField";
import { Callout } from "@/components/product/Card";
import { Table, Td, Th } from "@/components/product/Table";
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
        <Callout tone="warning">
          <span className="font-medium">Returned:</span> {kpiSet.returnComment}
        </Callout>
      ) : null}
      <Table>
        <thead>
          <tr>
            <Th>KPI</Th>
            <Th>Weight</Th>
            <Th>Parent KPI</Th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <Td colSpan={3} className="text-sm text-muted">
                No KPIs on this KPI Portfolio yet.
              </Td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-0">
                <Td className="min-w-56 whitespace-normal align-top leading-normal">
                  <div className="text-sm font-medium">{item.name}</div>
                  {item.definition ? <div className="text-sm text-muted">{item.definition}</div> : null}
                  <DirectMixField
                    state={state}
                    item={item}
                    canEdit
                    onChange={(directMix) => onSaveItem({ ...item, directMix })}
                  />
                </Td>
                <Td className="align-top text-sm tabular-nums">{item.weight}%</Td>
                <Td className="min-w-56 whitespace-normal align-top leading-normal">
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
      </Table>
    </div>
  );
}
