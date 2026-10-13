"use client";

import { CadenceField } from "@/components/kpi/CadenceField";
import { CascadeFields } from "@/components/kpi/CascadeFields";
import { DirectMixField } from "@/components/kpi/DirectMixField";
import { approvalWaitingText, frequencyLabel, periodDueDate, periodLabel } from "@/components/kpi/kpi-copy";
import { EditableItemFields } from "@/components/kpi/my-kpi/editable-item-fields";
import { latestActualText } from "@/components/kpi/my-kpi/latest-actual";
import { TeamKpiDraftReview } from "@/components/kpi/team/TeamKpiDraftReview";
import { AppSheet } from "@/components/product/AppSheet";
import { Button } from "@/components/coss/button";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
import { Select } from "@/components/product/Select";
import { HealthBadge, StatusBadge } from "@/components/product/StatusBadge";
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
  checkInApprovalGaps,
  effectiveCheckInStatus,
  isPortfolioDualApproved,
  kpiYearPhase,
  personIdForKpiSet,
  portfolioApprovalGaps,
} from "@/lib/domain-query";
import { plainKpiError } from "@/lib/my-kpi-view";
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
      <AppSheet title="KPI Portfolio" onClose={onClose}>
        <Callout tone="warning">This KPI Portfolio no longer exists. Close this panel to go back to the list.</Callout>
      </AppSheet>
    );
  }

  const assignment = state.assignments.find((row) => row.id === kpiSet.assignmentId);
  const person = assignment ? personById(state, assignment.personId) : undefined;
  const position = assignment ? positionById(state, assignment.positionId) : undefined;
  const items = itemsForSet(state, kpiSet.id);
  const item = itemId ? items.find((row) => row.id === itemId) : undefined;
  const phase = kpiYearPhase(cycle);
  const live = phase === "monitoring" ? liveMonitoringScore(state, kpiSet.id) : null;
  const title = showAdd ? "Add KPI" : item ? item.name : `${person?.legalName ?? "KPI Portfolio"}`;
  const waiting = kpiSet.status === "pending" ? approvalWaitingText(portfolioApprovalGaps(state, kpiSet.id)) : null;

  return (
    <AppSheet title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={kpiSet.status} />
          {position ? <span className="text-sm text-muted">{position.title}</span> : null}
        </div>
        {phase === "monitoring" && live !== null ? (
          <p className="m-0 text-sm">
            Current score <span className="font-medium tabular-nums">{live}</span>
          </p>
        ) : null}
        {phase === "closed" && kpiSet.score !== undefined ? (
          <p className="m-0 text-sm">
            Final score <span className="font-medium tabular-nums">{kpiSet.score}</span>
          </p>
        ) : null}
        {waiting ? <Callout tone="accent">{waiting}.</Callout> : null}
        {kpiSet.returnComment && (kpiSet.status === "returned" || kpiSet.status === "draft") ? (
          <Callout tone="warning">
            <p className="m-0 font-medium">Returned for changes</p>
            <p className="mt-1 mb-0 whitespace-pre-line">{kpiSet.returnComment}</p>
          </Callout>
        ) : null}

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
                Back to all KPIs
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
    </AppSheet>
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
      <p className="m-0 text-sm tabular-nums text-muted">Weights total {weightSum(items)}%</p>
      {error ? <Callout tone="danger">{error}</Callout> : null}
      {showDraftReview ? (
        <TeamKpiDraftReview
          state={state}
          cycleId={kpiSet.cycleId}
          kpiSet={kpiSet}
          assignmentId={assignment.id}
          items={items}
          onSaveItem={(patch) => setError(plainKpiError(upsertKpiItem(patch)) || null)}
        />
      ) : (
        <ul className="m-0 list-none divide-y divide-line overflow-clip rounded-[12px] border border-line p-0">
          {items.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">No KPIs on this KPI Portfolio yet.</li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
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
              setError(plainKpiError(onAgree(kpiSetId)) || null);
            }}
          >
            Approve
          </Button>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              onReturn(kpiSetId, comment.trim() || "Please revise");
            }}
          >
            <Field label="Reason for returning">
              <Input value={comment} onChange={(event) => setComment(event.target.value)} />
            </Field>
            <Button variant="outline" type="submit">
              Return
            </Button>
          </form>
        </div>
      ) : null}
      {pendingCheckIns.length > 0 ? (
        <div className="space-y-3 border-t border-line pt-4">
          <h3 className="m-0 text-base font-medium">KPI Check-Ins to approve</h3>
          {pendingCheckIns.map((checkIn) => {
            const named = items.find((row) => row.id === checkIn.kpiItemId);
            const what = `${named?.name ?? "KPI"}, ${periodLabel(checkIn.window)}`;
            return (
              <div key={checkIn.id} className="space-y-2">
                <p className="m-0 text-sm">
                  {named?.name ?? "KPI"} · {periodLabel(checkIn.window)}: actual{" "}
                  <span className="tabular-nums">
                    {checkIn.actual} {named?.unit}
                  </span>
                </p>
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onReturnCheckIn(checkIn.id, checkInComments[checkIn.id]?.trim() || "Please revise");
                  }}
                >
                  <Button
                    type="button"
                    aria-label={`Approve KPI Check-In for ${what}`}
                    onClick={() => setError(plainKpiError(onAgreeCheckIn(checkIn.id)) || null)}
                  >
                    Approve
                  </Button>
                  <Input
                    className="min-w-[10rem] flex-1"
                    placeholder="Reason for returning"
                    aria-label={`Reason for returning the KPI Check-In for ${what}`}
                    value={checkInComments[checkIn.id] ?? ""}
                    onChange={(event) =>
                      setCheckInComments((prev) => ({ ...prev, [checkIn.id]: event.target.value }))
                    }
                  />
                  <Button variant="outline" type="submit" aria-label={`Return KPI Check-In for ${what}`}>
                    Return
                  </Button>
                </form>
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
    setError(plainKpiError(onSave(patch)) || null);
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
        <Field label="Weight (%)">
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
      <dl className="m-0 grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 border-t border-line pt-4 text-sm">
        {canEdit ? null : (
          <>
            <dt className="text-muted">Frequency</dt>
            <dd className="m-0">{frequencyLabel(effectiveCadence(cycle, item))}</dd>
          </>
        )}
        {!canEdit && item.polarity === "lower-better" ? (
          <>
            <dt className="text-muted">Polarity</dt>
            <dd className="m-0">Lower is better</dd>
          </>
        ) : null}
        <dt className="text-muted">Latest actual</dt>
        <dd className="m-0 tabular-nums">{latestActualText(state, item)}</dd>
        <dt className="text-muted">Health</dt>
        <dd className="m-0">
          <HealthBadge health={itemHealth(state, item)} />
        </dd>
      </dl>
      {state.checkIns
        .filter((row) => row.kpiItemId === item.id)
        .map((row) => {
          const status = effectiveCheckInStatus(row);
          const waiting = status === "pending" ? approvalWaitingText(checkInApprovalGaps(state, row.id)) : null;
          const returned = status === "returned";
          if (!waiting && !returned) return null;
          const period = periodLabel(row.window);
          return (
            <p key={row.id} className="m-0 text-sm text-muted">
              {returned
                ? `KPI Check-In for ${period} returned: ${row.returnComment ?? "Update it and submit again."}`
                : `KPI Check-In for ${period}: ${waiting?.toLowerCase()}.`}
            </p>
          );
        })}
      {canCheckIn ? <CheckInForm cycle={cycle} item={item} onSave={onCheckIn} /> : null}
      {canEdit ? (
        <div>
          <ConfirmAction
            trigger={
              <Button variant="ghost" size="sm" type="button" className="text-destructive-foreground">
                Remove KPI
              </Button>
            }
            title={`Remove “${item.name}”?`}
            description="It leaves this KPI Portfolio with its target and weight. Weights will need to add up to 100% again."
            confirmLabel="Remove KPI"
            onConfirm={onRemove}
          />
        </div>
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
    return (
      <p className="text-sm text-muted">This KPI adds up from its Direct child KPIs, so there is no actual to enter here.</p>
    );
  }
  return (
    <form
      className="space-y-3 border-t border-line pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        const message = onSave(item.id, Number(actual), note);
        setError(message ? plainKpiError(message) : null);
        if (message) return;
        setActual("");
        setNote("");
      }}
    >
      <h3 className="m-0 text-base font-medium">KPI Check-In for {periodLabel(windowId)}</h3>
      <p className="m-0 text-sm text-muted">
        {frequencyLabel(cadence)} · due by {periodDueDate(windowId)}
      </p>
      {error ? <Callout tone="danger">{error}</Callout> : null}
      <Field label={item.unit ? `Actual (${item.unit})` : "Actual"}>
        <Input
          type="number"
          step="any"
          className="tabular-nums"
          aria-label={`Actual for ${item.name}, ${periodLabel(windowId)}`}
          value={actual}
          onChange={(event) => setActual(event.target.value)}
          required
        />
      </Field>
      <Field label="Note (optional)">
        <Input
          aria-label={`Note for ${item.name}`}
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
        setError(message ? plainKpiError(message) : null);
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
      <Field label="Weight (%)">
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
      <Button type="submit" variant="outline">
        Add KPI
      </Button>
    </form>
  );
}
