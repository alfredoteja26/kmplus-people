"use client";

import { CadenceField } from "@/components/kpi/CadenceField";
import { CascadeFields } from "@/components/kpi/CascadeFields";
import { DirectMixField } from "@/components/kpi/DirectMixField";
import { EditableItemFields } from "@/components/kpi/my-kpi/editable-item-fields";
import { latestActualText } from "@/components/kpi/my-kpi/latest-actual";
import { Button } from "@/components/ui/Button";
import { Callout, Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { HealthBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { isRootAssignment } from "@/lib/cascade";
import { effectiveCadence, windowFor } from "@/lib/cadence";
import { blocksOwnCheckIn } from "@/lib/direct";
import {
  currentAssignment,
  isHrLike,
  itemHealth,
  itemsForSet,
  kpiSetForAssignment,
  openCycle,
  todayIso,
  weightSum,
} from "@/lib/domain";
import { useStore } from "@/lib/store";
import type { CascadeMode, KpiCycle, KpiItem, Polarity } from "@/lib/types";
import { useState } from "react";

export default function MyKpiPage() {
  const { state, upsertKpiItem, removeKpiItem, submitKpiSet, addCheckIn } = useStore();
  const cycle = openCycle(state);
  const assignment = currentAssignment(state, state.currentPersonId);
  const kpiSet = cycle && assignment ? kpiSetForAssignment(state, assignment.id, cycle.id) : undefined;
  const items = kpiSet ? itemsForSet(state, kpiSet.id) : [];
  const sum = weightSum(items);
  const canEdit = kpiSet && (kpiSet.status === "draft" || kpiSet.status === "returned");
  const canCheckIn = kpiSet && (kpiSet.status === "active" || kpiSet.status === "agreed");
  const rootAssignment = assignment ? isRootAssignment(state, assignment.id) : false;
  const hr = isHrLike(state.currentRole);
  const canChangeParent =
    Boolean(canEdit) ||
    Boolean(kpiSet && (kpiSet.status === "active" || kpiSet.status === "agreed") && hr);
  const canChangeCascadeMode = canChangeParent;
  const canEditDirectMix =
    Boolean(canEdit) ||
    Boolean(kpiSet && (kpiSet.status === "active" || kpiSet.status === "agreed") && hr);

  function saveItem(patch: Omit<KpiItem, "tenantId">) {
    const message = upsertKpiItem(patch);
    setError(message);
  }

  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [target, setTarget] = useState("100");
  const [unit, setUnit] = useState("%");
  const [weight, setWeight] = useState("10");
  const [polarity, setPolarity] = useState<Polarity>("higher-better");
  const [parentKpiItemId, setParentKpiItemId] = useState("");
  const [newCascadeMode, setNewCascadeMode] = useState<CascadeMode>("indirect");

  if (!cycle) {
    return (
      <div>
        <PageHeader title="My KPI" description="Weighted KpiItems and CheckIns for the open cycle." />
        <Callout tone="warning">No open KpiCycle. HR opens the cycle first.</Callout>
      </div>
    );
  }

  if (!assignment || !kpiSet) {
    return (
      <div>
        <PageHeader kicker={cycle.name} title="My KPI" />
        <Callout tone="warning">
          No KpiSet on your current Assignment for {cycle.name}. HR can draft missing sets from KPI cycle.
        </Callout>
      </div>
    );
  }

  const statusBadge =
    kpiSet.readyForAgreement && kpiSet.status === "draft" ? "in-review" : kpiSet.status;

  return (
    <div className="space-y-4">
      <PageHeader
        kicker={cycle.name}
        title="My KPI"
        description="Draft weighted KpiItems to 100%, then your manager agrees. CheckIn is actual versus target."
        actions={<StatusBadge status={statusBadge} />}
      />

      {kpiSet.returnComment ? (
        <Callout tone="warning">
          <span className="font-medium">Returned for revision.</span> {kpiSet.returnComment}
        </Callout>
      ) : null}
      {error ? <Callout tone="danger">{error}</Callout> : null}
      {kpiSet.score !== undefined ? (
        <Callout>
          <span className="font-medium">Stored KpiScore:</span> {kpiSet.score}
        </Callout>
      ) : null}

      {items.length === 0 && canEdit ? (
        <Callout tone="accent">No KpiItems yet. Add your first item below — weights must total 100% before submit.</Callout>
      ) : null}

      <Table>
        <thead>
          <tr>
            <Th>KpiItem</Th>
            <Th>Target</Th>
            <Th>Weight</Th>
            <Th>Parent</Th>
            <Th>Latest actual</Th>
            <Th>Health</Th>
            {canEdit ? <Th>Cadence</Th> : null}
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <Td>
                {canEdit ? (
                  <EditableItemFields item={item} onPatch={(patch) => saveItem(patch)} />
                ) : (
                  <>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted">{item.definition}</div>
                  </>
                )}
                <DirectMixField
                  state={state}
                  item={item}
                  canEdit={canEditDirectMix}
                  onChange={(directMix) => saveItem({ ...item, directMix })}
                />
              </Td>
              <Td>
                {canEdit ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <Input
                      className="w-20 tabular-nums"
                      type="number"
                      step="any"
                      aria-label={`Target for ${item.name}`}
                      defaultValue={String(item.target)}
                      onBlur={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next) && next !== item.target) saveItem({ ...item, target: next });
                      }}
                    />
                    <Input
                      className="w-16"
                      aria-label={`Unit for ${item.name}`}
                      defaultValue={item.unit}
                      onBlur={(event) => {
                        const unit = event.target.value;
                        if (unit !== item.unit) saveItem({ ...item, unit });
                      }}
                    />
                  </div>
                ) : (
                  <>
                    {item.target} {item.unit}
                  </>
                )}
              </Td>
              <Td>
                {canEdit ? (
                  <Input
                    className="w-16 tabular-nums"
                    type="number"
                    aria-label={`Weight for ${item.name}`}
                    defaultValue={String(item.weight)}
                    onBlur={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isNaN(next) && next !== item.weight) saveItem({ ...item, weight: next });
                    }}
                  />
                ) : (
                  `${item.weight}%`
                )}
              </Td>
              <Td>
                <CascadeFields
                  state={state}
                  cycleId={cycle.id}
                  item={item}
                  rootAssignment={rootAssignment}
                  canChangeParent={canChangeParent}
                  canChangeCascadeMode={canChangeCascadeMode}
                  onParentChange={(parentId) => saveItem({ ...item, parentKpiItemId: parentId })}
                  onCascadeModeChange={(cascadeMode) => saveItem({ ...item, cascadeMode })}
                />
              </Td>
              <Td className="tabular-nums">{latestActualText(state, item)}</Td>
              <Td>
                <HealthBadge health={itemHealth(state, item)} />
              </Td>
              {canEdit ? (
                <Td>
                  <CadenceField
                    compact
                    item={item}
                    cycleCadence={cycle.checkInCadence}
                    onChange={(checkInCadence) => saveItem({ ...item, checkInCadence })}
                  />
                </Td>
              ) : null}
              <Td>
                {canEdit ? (
                  <Button variant="ghost" type="button" onClick={() => removeKpiItem(item.id)}>
                    Remove
                  </Button>
                ) : null}
                {canCheckIn ? (
                  <CheckInForm state={state} cycle={cycle} item={item} onSave={addCheckIn} />
                ) : null}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <p
        className={`text-sm tabular-nums ${sum === 100 ? "text-success" : "text-warning"}`}
        role="status"
      >
        Weights {sum}% {sum === 100 ? "— ready to submit" : "(must be 100%)"}
      </p>

      {canEdit ? (
        <Card className="mt-2">
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Add KpiItem</h2>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const message = upsertKpiItem({
                kpiSetId: kpiSet.id,
                name,
                definition,
                target: Number(target),
                unit,
                weight: Number(weight),
                polarity,
                parentKpiItemId: rootAssignment ? null : parentKpiItemId || null,
                cascadeMode: newCascadeMode,
              });
              setError(message);
              if (message) return;
              setName("");
              setDefinition("");
              setParentKpiItemId("");
              setNewCascadeMode("indirect");
            }}
          >
            <Field label="Name">
              <Input required value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Unit">
              <Input value={unit} onChange={(event) => setUnit(event.target.value)} />
            </Field>
            <Field label="Definition">
              <Input value={definition} onChange={(event) => setDefinition(event.target.value)} />
            </Field>
            <Field label="Target">
              <Input type="number" step="any" value={target} onChange={(event) => setTarget(event.target.value)} />
            </Field>
            <Field label="Weight %">
              <Input type="number" value={weight} onChange={(event) => setWeight(event.target.value)} />
            </Field>
            <Field label="Polarity">
              <Select value={polarity} onChange={(event) => setPolarity(event.target.value as Polarity)}>
                <option value="higher-better">higher-better</option>
                <option value="lower-better">lower-better</option>
              </Select>
            </Field>
            {!rootAssignment ? (
              <CascadeFields
                state={state}
                cycleId={cycle.id}
                item={{
                  id: "new",
                  tenantId: state.tenantId,
                  kpiSetId: kpiSet.id,
                  name: name || "New item",
                  definition,
                  target: Number(target) || 0,
                  unit,
                  weight: Number(weight) || 0,
                  polarity,
                  parentKpiItemId: parentKpiItemId || null,
                  cascadeMode: newCascadeMode,
                }}
                rootAssignment={false}
                canChangeParent
                canChangeCascadeMode
                onParentChange={(parentId) => setParentKpiItemId(parentId ?? "")}
                onCascadeModeChange={setNewCascadeMode}
              />
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" variant="secondary">
                Add item
              </Button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="m-0 text-sm text-muted">Submit sends this set to your manager for agreement.</p>
            <Button
              type="button"
              onClick={() => {
                const message = submitKpiSet(kpiSet.id);
                setError(message);
              }}
            >
              Submit for agreement
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function CheckInForm({
  state,
  cycle,
  item,
  onSave,
}: {
  state: import("@/lib/types").AppState;
  cycle: KpiCycle;
  item: KpiItem;
  onSave: (kpiItemId: string, actual: number, note: string) => void;
}) {
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const cadence = effectiveCadence(cycle, item);
  const windowId = windowFor(todayIso(), cadence);
  if (blocksOwnCheckIn(state, item)) {
    return <p className="text-xs text-muted">Rolls up from Direct children (children-only DirectMix)</p>;
  }
  return (
    <form
      className="flex min-w-[12rem] flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(item.id, Number(actual), note);
        setActual("");
        setNote("");
      }}
    >
      <span className="text-xs text-muted">
        Window {windowId} · {cadence}
      </span>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          className="w-24 tabular-nums"
          type="number"
          step="any"
          placeholder="Actual"
          aria-label={`Actual for ${item.name}, window ${windowId}`}
          value={actual}
          onChange={(event) => setActual(event.target.value)}
          required
        />
        <Input
          className="min-w-[8rem] flex-1"
          placeholder="Note"
          aria-label={`CheckIn note for ${item.name}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="submit">CheckIn</Button>
      </div>
    </form>
  );
}
