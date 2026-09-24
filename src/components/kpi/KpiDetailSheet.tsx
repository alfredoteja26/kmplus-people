"use client";

import { CadenceField } from "@/components/kpi/CadenceField";
import { CascadeFields } from "@/components/kpi/CascadeFields";
import { DirectMixField } from "@/components/kpi/DirectMixField";
import { EditableItemFields } from "@/components/kpi/my-kpi/editable-item-fields";
import { latestActualText } from "@/components/kpi/my-kpi/latest-actual";
import { TeamKpiDraftReview } from "@/components/kpi/team/TeamKpiDraftReview";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { HealthBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { isRootAssignment } from "@/lib/cascade";
import { effectiveCadence, windowFor } from "@/lib/cadence";
import { blocksOwnCheckIn } from "@/lib/direct";
import {
  isHrLike,
  itemHealth,
  itemsForSet,
  personById,
  positionById,
  todayIso,
  weightSum,
} from "@/lib/domain";
import {
  canAgreeOrReturnCheckIn,
  canAgreeOrReturnKpiPortfolio,
  canDraftKpiPortfolio,
  checkInApprovalWaitingCopy,
  effectiveCheckInStatus,
  isPortfolioDualApproved,
  kpiYearPhase,
  personIdForKpiSet,
  portfolioApprovalWaitingCopy,
} from "@/lib/domain-query";
import { liveMonitoringScore } from "@/lib/phase-desk";
import { useStore } from "@/lib/store";
import type { CascadeMode, KpiCycle, KpiItem, Polarity } from "@/lib/types";
import { useEffect, useState } from "react";

export function KpiDetailSheet({
  kpiSetId,
  initialItemId = null,
  adding = false,
  onClose,
}: {
  kpiSetId: string;
  initialItemId?: string | null;
  adding?: boolean;
  onClose: () => void;
}) {
  const { state, upsertKpiItem, removeKpiItem, addCheckIn, agreeKpiSet, returnKpiSet, agreeCheckIn, returnCheckIn } =
    useStore();
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  const cycle = kpiSet ? state.cycles.find((row) => row.id === kpiSet.cycleId) : undefined;
  const [itemId, setItemId] = useState<string | null>(initialItemId);
  const [showAdd, setShowAdd] = useState(adding);

  useEffect(() => {
    setItemId(initialItemId);
    setShowAdd(adding);
  }, [kpiSetId, initialItemId, adding]);

  if (!kpiSet || !cycle) {
    return (
      <Sheet title="KPI portfolio" onClose={onClose}>
        <Callout tone="warning">This KPI portfolio is no longer available.</Callout>
      </Sheet>
    );
  }

  const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId);
  const person = assignment ? personById(state, assignment.personId) : undefined;
  const position = assignment ? positionById(state, assignment.positionId) : undefined;
  const items = itemsForSet(state, kpiSet.id);
  const item = itemId ? items.find((row) => row.id === itemId) : undefined;
  const phase = kpiYearPhase(cycle);
  const live = phase === "monitoring" ? liveMonitoringScore(state, kpiSet.id) : null;
  const title = showAdd ? "Add KPI" : item ? item.name : `${person?.legalName ?? "KPI portfolio"}`;

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={kpiSet.status} />
          {position ? <span className="text-sm text-muted">{position.title}</span> : null}
        </div>
        {phase === "monitoring" && live !== null ? (
          <p className="m-0 text-sm">
            Latest monitoring score <span className="font-medium tabular-nums">{live}</span>
          </p>
        ) : null}
        {phase === "closed" && kpiSet.score !== undefined ? (
          <p className="m-0 text-sm">
            Stored score <span className="font-medium tabular-nums">{kpiSet.score}</span>
          </p>
        ) : null}
        {portfolioApprovalWaitingCopy(state, kpiSet.id) ? (
          <Callout tone="accent">{portfolioApprovalWaitingCopy(state, kpiSet.id)}</Callout>
        ) : null}
        {kpiSet.returnComment ? <Callout tone="warning">{kpiSet.returnComment}</Callout> : null}

        {showAdd ? (
          <AddKpiForm
            kpiSetId={kpiSet.id}
            cycleId={cycle.id}
            rootAssignment={assignment ? isRootAssignment(state, assignment.id) : false}
            onDone={() => setShowAdd(false)}
          />
        ) : item && assignment ? (
          <>
            {initialItemId ? null : (
              <Button variant="ghost" type="button" onClick={() => setItemId(null)}>
                All KPIs
              </Button>
            )}
            <ItemEditor
              cycle={cycle}
              item={item}
              assignmentId={assignment.id}
              onSave={(patch) => upsertKpiItem(patch)}
              onRemove={() => {
                removeKpiItem(item.id);
                if (initialItemId) onClose();
                else setItemId(null);
              }}
              onCheckIn={addCheckIn}
            />
          </>
        ) : (
          <PortfolioBody
            kpiSetId={kpiSet.id}
            items={items}
            onOpenItem={setItemId}
            onAgree={(id) => agreeKpiSet(id)}
            onReturn={(id, comment) => returnKpiSet(id, comment)}
            onAgreeCheckIn={(id) => agreeCheckIn(id)}
            onReturnCheckIn={(id, comment) => returnCheckIn(id, comment)}
          />
        )}
      </div>
    </Sheet>
  );
}

function PortfolioBody({
  kpiSetId,
  items,
  onOpenItem,
  onAgree,
  onReturn,
  onAgreeCheckIn,
  onReturnCheckIn,
}: {
  kpiSetId: string;
  items: KpiItem[];
  onOpenItem: (id: string) => void;
  onAgree: (kpiSetId: string) => string | null;
  onReturn: (kpiSetId: string, comment: string) => void;
  onAgreeCheckIn: (checkInId: string) => string | null;
  onReturnCheckIn: (checkInId: string, comment: string) => void;
}) {
  const { state, upsertKpiItem } = useStore();
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  const assignment = kpiSet ? state.assignments.find((row) => row.id === kpiSet.assignmentId) : undefined;
  const ownerId = personIdForKpiSet(state, kpiSetId);
  const isOwner = ownerId === state.currentPersonId;
  const [comment, setComment] = useState("");
  const [checkInComments, setCheckInComments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!kpiSet || !assignment) return null;

  const showDraftReview =
    !isOwner &&
    canDraftKpiPortfolio(state, kpiSetId) &&
    (kpiSet.status === "draft" || kpiSet.status === "returned");
  const showAgree = kpiSet.status === "pending" && canAgreeOrReturnKpiPortfolio(state, kpiSetId);
  const pendingCheckIns = state.checkIns.filter(
    (row) =>
      items.some((item) => item.id === row.kpiItemId) &&
      effectiveCheckInStatus(row) === "pending" &&
      canAgreeOrReturnCheckIn(state, row.id),
  );

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm tabular-nums text-muted">Weights {weightSum(items)}%</p>
      {error ? <Callout tone="danger">{error}</Callout> : null}
      {showDraftReview ? (
        <TeamKpiDraftReview
          state={state}
          cycleId={kpiSet.cycleId}
          kpiSet={kpiSet}
          assignmentId={assignment.id}
          items={items}
          onSaveItem={(patch) => upsertKpiItem(patch)}
        />
      ) : (
        <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-[12px] border-[1.5px] border-line p-0">
          {items.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">No KPIs on this portfolio yet.</li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-tint"
                  onClick={() => onOpenItem(item.id)}
                >
                  <span>
                    <span className="block font-medium">{item.name}</span>
                    <span className="block text-sm text-muted">
                      {item.target} {item.unit} · {latestActualText(state, item)}
                    </span>
                  </span>
                  <HealthBadge health={itemHealth(state, item)} />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {showAgree ? (
        <div className="space-y-2 border-t border-line pt-4">
          <Button
            type="button"
            onClick={() => {
              setError(onAgree(kpiSetId));
            }}
          >
            Agree
          </Button>
          <Field label="Return comment">
            <Input value={comment} onChange={(event) => setComment(event.target.value)} />
          </Field>
          <Button
            variant="secondary"
            type="button"
            onClick={() => onReturn(kpiSetId, comment.trim() || "Please revise")}
          >
            Return
          </Button>
        </div>
      ) : null}
      {pendingCheckIns.length > 0 ? (
        <div className="space-y-3 border-t border-line pt-4">
          <h3 className="m-0 text-[16px] font-medium">Check-ins waiting</h3>
          {pendingCheckIns.map((checkIn) => {
            const named = items.find((row) => row.id === checkIn.kpiItemId);
            return (
              <div key={checkIn.id} className="space-y-2">
                <p className="m-0 text-sm">
                  {named?.name ?? "KPI"} · {checkIn.window}: actual {checkIn.actual}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => setError(onAgreeCheckIn(checkIn.id))}>
                    Agree Check-In
                  </Button>
                  <Input
                    className="min-w-[10rem] flex-1"
                    placeholder="Return comment"
                    aria-label={`Return comment for check-in ${checkIn.window}`}
                    value={checkInComments[checkIn.id] ?? ""}
                    onChange={(event) =>
                      setCheckInComments((prev) => ({ ...prev, [checkIn.id]: event.target.value }))
                    }
                  />
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() =>
                      onReturnCheckIn(checkIn.id, checkInComments[checkIn.id]?.trim() || "Please revise")
                    }
                  >
                    Return
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ItemEditor({
  cycle,
  item,
  assignmentId,
  onSave,
  onRemove,
  onCheckIn,
}: {
  cycle: KpiCycle;
  item: KpiItem;
  assignmentId: string;
  onSave: (patch: Omit<KpiItem, "tenantId">) => string | null;
  onRemove: () => void;
  onCheckIn: (kpiItemId: string, actual: number, note: string) => string | null;
}) {
  const { state } = useStore();
  const [error, setError] = useState<string | null>(null);
  const yearClosed = kpiYearPhase(cycle) === "closed";
  const ownerId = personIdForKpiSet(state, item.kpiSetId);
  const isOwner = ownerId === state.currentPersonId;
  const kpiSet = state.kpiSets.find((row) => row.id === item.kpiSetId);
  const canEdit = Boolean(!yearClosed && isOwner && kpiSet && (kpiSet.status === "draft" || kpiSet.status === "returned"));
  const canCheckIn = Boolean(!yearClosed && isOwner && kpiSet && isPortfolioDualApproved(state, kpiSet.id));
  const hr = isHrLike(state.currentRole);
  const canChangeParent = canEdit || Boolean(!yearClosed && kpiSet?.status === "approved" && hr);
  const rootAssignment = isRootAssignment(state, assignmentId);

  function save(patch: KpiItem) {
    setError(onSave(patch));
  }

  return (
    <div className="space-y-4">
      {error ? <Callout tone="danger">{error}</Callout> : null}
      {canEdit ? (
        <EditableItemFields item={item} onPatch={save} />
      ) : (
        <div>
          <p className="m-0 font-medium">{item.name}</p>
          <p className="m-0 text-sm text-muted">{item.definition}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target">
          {canEdit ? (
            <Input
              type="number"
              step="any"
              className="tabular-nums"
              aria-label={`Target for ${item.name}`}
              defaultValue={String(item.target)}
              onBlur={(event) => {
                const next = Number(event.target.value);
                if (!Number.isNaN(next) && next !== item.target) save({ ...item, target: next });
              }}
            />
          ) : (
            <p className="m-0 tabular-nums">
              {item.target} {item.unit}
            </p>
          )}
        </Field>
        <Field label="Weight %">
          {canEdit ? (
            <Input
              type="number"
              className="tabular-nums"
              aria-label={`Weight for ${item.name}`}
              defaultValue={String(item.weight)}
              onBlur={(event) => {
                const next = Number(event.target.value);
                if (!Number.isNaN(next) && next !== item.weight) save({ ...item, weight: next });
              }}
            />
          ) : (
            <p className="m-0 tabular-nums">{item.weight}%</p>
          )}
        </Field>
      </div>
      {canEdit ? (
        <Field label="Unit">
          <Input
            aria-label={`Unit for ${item.name}`}
            defaultValue={item.unit}
            onBlur={(event) => {
              if (event.target.value !== item.unit) save({ ...item, unit: event.target.value });
            }}
          />
        </Field>
      ) : null}
      {canEdit ? (
        <Field label="Polarity">
          <Select
            value={item.polarity}
            onChange={(event) => save({ ...item, polarity: event.target.value as Polarity })}
          >
            <option value="higher-better">Higher is better</option>
            <option value="lower-better">Lower is better</option>
          </Select>
        </Field>
      ) : null}
      <DirectMixField
        state={state}
        item={item}
        canEdit={canEdit || Boolean(!yearClosed && kpiSet?.status === "approved" && hr)}
        onChange={(directMix) => save({ ...item, directMix })}
      />
      <CascadeFields
        state={state}
        cycleId={cycle.id}
        item={item}
        rootAssignment={rootAssignment}
        canChangeParent={canChangeParent}
        canChangeCascadeMode={canChangeParent}
        onParentChange={(parentId) => save({ ...item, parentKpiItemId: parentId })}
        onCascadeModeChange={(cascadeMode) => save({ ...item, cascadeMode })}
      />
      {canEdit ? (
        <CadenceField
          item={item}
          cycleCadence={cycle.checkInCadence}
          onChange={(checkInCadence) => save({ ...item, checkInCadence })}
        />
      ) : null}
      <p className="m-0 text-sm">
        Latest actual <span className="tabular-nums">{latestActualText(state, item)}</span>
      </p>
      <HealthBadge health={itemHealth(state, item)} />
      {state.checkIns
        .filter((row) => row.kpiItemId === item.id)
        .map((row) => {
          const waiting = checkInApprovalWaitingCopy(state, row.id);
          const returned = effectiveCheckInStatus(row) === "returned";
          if (!waiting && !returned) return null;
          return (
            <p key={row.id} className="m-0 text-sm text-muted">
              {returned ? `Returned: ${row.returnComment ?? "Please revise this check-in"}` : `KPI Check-In ${row.window}: ${waiting}`}
            </p>
          );
        })}
      {canCheckIn ? <CheckInForm cycle={cycle} item={item} onSave={onCheckIn} /> : null}
      {canEdit ? (
        <Button variant="ghost" type="button" onClick={onRemove}>
          Remove
        </Button>
      ) : null}
    </div>
  );
}

function CheckInForm({
  cycle,
  item,
  onSave,
}: {
  cycle: KpiCycle;
  item: KpiItem;
  onSave: (kpiItemId: string, actual: number, note: string) => string | null;
}) {
  const { state } = useStore();
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cadence = effectiveCadence(cycle, item);
  const windowId = windowFor(todayIso(), cadence);
  if (blocksOwnCheckIn(state, item)) {
    return <p className="text-sm text-muted">Rolls up from direct child KPIs only.</p>;
  }
  return (
    <form
      className="space-y-3 border-t border-line pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        const message = onSave(item.id, Number(actual), note);
        setError(message);
        if (message) return;
        setActual("");
        setNote("");
      }}
    >
      <h3 className="m-0 text-[16px] font-medium">Check in</h3>
      <p className="m-0 text-sm text-muted">
        Window {windowId} · {cadence}
      </p>
      {error ? <Callout tone="danger">{error}</Callout> : null}
      <Field label="Actual">
        <Input
          type="number"
          step="any"
          className="tabular-nums"
          aria-label={`Actual for ${item.name}, window ${windowId}`}
          value={actual}
          onChange={(event) => setActual(event.target.value)}
          required
        />
      </Field>
      <Field label="Note">
        <Input
          aria-label={`Check-in note for ${item.name}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <Button type="submit">Submit KPI Check-In</Button>
    </form>
  );
}

function AddKpiForm({
  kpiSetId,
  cycleId,
  rootAssignment,
  onDone,
}: {
  kpiSetId: string;
  cycleId: string;
  rootAssignment: boolean;
  onDone: () => void;
}) {
  const { state, upsertKpiItem } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [target, setTarget] = useState("100");
  const [unit, setUnit] = useState("%");
  const [weight, setWeight] = useState("10");
  const [polarity, setPolarity] = useState<Polarity>("higher-better");
  const [parentKpiItemId, setParentKpiItemId] = useState("");
  const [cascadeMode, setCascadeMode] = useState<CascadeMode>("indirect");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const message = upsertKpiItem({
          kpiSetId,
          name,
          definition,
          target: Number(target),
          unit,
          weight: Number(weight),
          polarity,
          parentKpiItemId: rootAssignment ? null : parentKpiItemId || null,
          cascadeMode,
        });
        setError(message);
        if (!message) onDone();
      }}
    >
      {error ? <Callout tone="danger">{error}</Callout> : null}
      <Field label="Name">
        <Input required value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Definition">
        <Input value={definition} onChange={(event) => setDefinition(event.target.value)} />
      </Field>
      <Field label="Target">
        <Input type="number" step="any" value={target} onChange={(event) => setTarget(event.target.value)} />
      </Field>
      <Field label="Unit">
        <Input value={unit} onChange={(event) => setUnit(event.target.value)} />
      </Field>
      <Field label="Weight %">
        <Input type="number" value={weight} onChange={(event) => setWeight(event.target.value)} />
      </Field>
      <Field label="Polarity">
        <Select value={polarity} onChange={(event) => setPolarity(event.target.value as Polarity)}>
          <option value="higher-better">Higher is better</option>
          <option value="lower-better">Lower is better</option>
        </Select>
      </Field>
      {!rootAssignment ? (
        <CascadeFields
          state={state}
          cycleId={cycleId}
          item={{
            id: "new",
            tenantId: state.tenantId,
            kpiSetId,
            name: name || "New item",
            definition,
            target: Number(target) || 0,
            unit,
            weight: Number(weight) || 0,
            polarity,
            parentKpiItemId: parentKpiItemId || null,
            cascadeMode,
          }}
          rootAssignment={false}
          canChangeParent
          canChangeCascadeMode
          onParentChange={(parentId) => setParentKpiItemId(parentId ?? "")}
          onCascadeModeChange={setCascadeMode}
        />
      ) : null}
      <Button type="submit" variant="secondary">
        Add item
      </Button>
    </form>
  );
}
