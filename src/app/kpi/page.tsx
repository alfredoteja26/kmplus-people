"use client";

import { KpiDetailSheet } from "@/components/kpi/KpiDetailSheet";
import { kpiYearName, remainingApprovers } from "@/components/kpi/kpi-copy";
import { KpiItemRows, KpiItemsPanel } from "@/components/kpi/my-kpi/kpi-item-rows";
import { FactsStrip, ScoreFact, ToneFact, WeightFact, Fact } from "@/components/kpi/my-kpi/my-kpi-facts";
import { Button } from "@/components/coss/button";
import { Callout, PageColumn, PageHeader } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { StatusBadge } from "@/components/product/StatusBadge";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { isRootAssignment } from "@/lib/cascade";
import { currentAssignments, itemsForSet, kpiSetForAssignment, positionById, readableKpiYear, todayIso, weightSum } from "@/lib/domain";
import { kpiYearPhase, portfolioApprovalGaps } from "@/lib/domain-query";
import { plural } from "@/lib/labels";
import {
  approvalDetail,
  dueItems,
  plainKpiError,
  portfolioStep,
  rankItems,
  rowNote,
  scoreFact,
  submitBlocker,
  timeFact,
  type PortfolioStep,
} from "@/lib/my-kpi-view";
import { liveMonitoringScore } from "@/lib/phase-desk";
import { useStore } from "@/lib/store";
import { PlusIcon, TargetIcon } from "lucide-react";
import { useId, useState } from "react";

export default function MyKpiPage() {
  const { state, submitKpiSet } = useStore();
  const cycle = readableKpiYear(state);
  const phase = cycle ? kpiYearPhase(cycle) : null;
  const assignments = currentAssignments(state, state.currentPersonId);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ itemId: string } | { add: true } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reasonId = useId();

  const assignment =
    assignments.find((row) => row.id === selectedAssignmentId) ??
    assignments.find((row) => (cycle ? kpiSetForAssignment(state, row.id, cycle.id) : undefined)) ??
    assignments[0];
  const kpiSet = cycle && assignment ? kpiSetForAssignment(state, assignment.id, cycle.id) : undefined;
  const items = kpiSet ? itemsForSet(state, kpiSet.id) : [];
  const rootAssignment = assignment ? isRootAssignment(state, assignment.id) : false;
  const today = todayIso();

  if (!cycle) {
    return (
      <PageColumn>
        <PageHeader className="mb-0" title="My KPI" />
        <Callout tone="warning">No KPI year is open yet. An Admin starts planning from KPI Admin.</Callout>
      </PageColumn>
    );
  }

  const yearName = kpiYearName(cycle);
  const positionTitle = assignment ? (positionById(state, assignment.positionId)?.title ?? null) : null;
  const multiSeat = assignments.length > 1;
  // With one Position its title rides on the context line; with several the switcher names it.
  const context = positionTitle && !multiSeat ? `${yearName} · ${positionTitle}` : yearName;

  const positionSwitch = multiSeat && assignment ? (
    <Field label="Position" className="w-full sm:w-64">
      <Select
        value={assignment.id}
        onChange={(event) => {
          setSelectedAssignmentId(event.target.value);
          setSheet(null);
          setError(null);
        }}
      >
        {assignments.map((row) => (
          <option key={row.id} value={row.id}>
            {positionById(state, row.positionId)?.title ?? "Position"}
          </option>
        ))}
      </Select>
    </Field>
  ) : null;

  if (!assignment || !kpiSet) {
    return (
      <PageColumn>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <PageHeader className="mb-0" title="My KPI" description={context} />
          {positionSwitch}
        </header>
        <Callout tone="warning">
          You don&apos;t have a KPI Portfolio for {yearName}
          {multiSeat && positionTitle ? ` on ${positionTitle}` : ""} yet. An Admin can create it from KPI Admin.
        </Callout>
      </PageColumn>
    );
  }

  const step = portfolioStep(state, phase, kpiSet);
  const canEdit = step === "plan";
  const ranked = rankItems(step, state, cycle, items, rootAssignment, today);
  const due = step === "check-in" ? dueItems(state, cycle, ranked, today) : [];
  const blocker = canEdit ? submitBlocker(state, kpiSet.id) : null;
  const approvers = remainingApprovers(portfolioApprovalGaps(state, kpiSet.id), "you");
  const time = timeFact(state, cycle, phase, step, items, today);
  const score = scoreFact(phase, phase === "monitoring" ? liveMonitoringScore(state, kpiSet.id) : null, kpiSet.score);
  const approval = approvalDetail(state, kpiSet);
  const openItemId = sheet && "itemId" in sheet ? sheet.itemId : null;

  const header: Record<PortfolioStep, { title: string; description: string }> = {
    plan: {
      title: "Plan your KPI Portfolio",
      description:
        kpiSet.status === "returned"
          ? "Make the changes asked for below, then submit it for approval again."
          : "Add your KPIs, make the weights add up to 100%, then submit for approval.",
    },
    waiting: {
      title: "Waiting for approval",
      description: approvers ? `You submitted your KPI Portfolio. It still needs approval from ${approvers}.` : "You submitted your KPI Portfolio.",
    },
    approved: { title: "KPI Portfolio approved", description: "KPI Check-Ins open when an Admin starts monitoring." },
    "check-in": { title: "KPI Check-In", description: "Enter your actual result for each KPI by the end of its period." },
    closed: { title: "KPI year closed", description: "This KPI year is closed. Your KPI Portfolio is view only." },
  };
  const { title, description } = header[step];

  const footer =
    items.length === 0 ? null : canEdit ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="button" variant="outline" onClick={() => setSheet({ add: true })}>
          <PlusIcon aria-hidden="true" />
          Add KPI
        </Button>
        <Button
          type="button"
          disabled={blocker !== null}
          aria-describedby={blocker ? reasonId : undefined}
          onClick={() => {
            const message = submitKpiSet(kpiSet.id);
            setError(message ? plainKpiError(message) : null);
          }}
        >
          Submit for approval
        </Button>
        {blocker ? (
          <p id={reasonId} className="m-0 text-sm text-muted">
            {blocker}
          </p>
        ) : (
          <p className="m-0 text-sm text-muted">Ready to send to your Line Manager and an Admin.</p>
        )}
      </div>
    ) : step === "check-in" ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="button" disabled={due.length === 0} aria-describedby={reasonId} onClick={() => due[0] && setSheet({ itemId: due[0].id })}>
          Check in
        </Button>
        <p id={reasonId} className="m-0 text-sm text-muted">
          {due.length === 0 ? "Every KPI is checked in for its current period." : `${plural(due.length, "KPI")} to check in. Starts with “${due[0].name}”.`}
        </p>
      </div>
    ) : null;

  return (
    <PageColumn className={sheet ? "lg:pr-[440px]" : undefined}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-heading text-h1 font-medium text-balance">{title}</h1>
            <StatusBadge status={kpiSet.status} />
          </div>
          <p className="mt-2 mb-0 max-w-[65ch] text-muted">
            {context}. {description}
          </p>
        </div>
        {positionSwitch}
      </header>

      {canEdit && kpiSet.returnComment ? (
        <Callout tone="warning" live="status">
          <p className="m-0 font-medium">Returned for changes</p>
          <p className="mt-1 mb-0 whitespace-pre-line">{kpiSet.returnComment}</p>
        </Callout>
      ) : null}

      <FactsStrip>
        {/* The status badge sits beside the title (DESIGN.md); the strip says what that status waits on. */}
        <Fact label="Approval">{approval}</Fact>
        <WeightFact sum={weightSum(items)} />
        <ScoreFact {...score} />
        <ToneFact {...time} />
      </FactsStrip>

      {error ? <Callout tone="danger">{error}</Callout> : null}

      <KpiItemsPanel title="KPIs" count={items.length} footer={footer}>
        {items.length === 0 ? (
          <EmptyBlock
            className="py-8"
            icon={<TargetIcon aria-hidden="true" />}
            title="No KPIs yet"
            description={
              canEdit
                ? "Add the KPIs you are measured on this year, with weights that add up to 100%."
                : "This KPI Portfolio has no KPIs."
            }
            action={
              canEdit ? (
                <Button type="button" onClick={() => setSheet({ add: true })}>
                  <PlusIcon aria-hidden="true" />
                  Add KPI
                </Button>
              ) : undefined
            }
          />
        ) : (
          <KpiItemRows
            state={state}
            cycle={cycle}
            items={ranked}
            rootAssignment={rootAssignment}
            noteFor={(item) => rowNote(step, state, cycle, item, rootAssignment, today)}
            openItemId={openItemId}
            onOpen={(itemId) => setSheet({ itemId })}
          />
        )}
      </KpiItemsPanel>

      {sheet ? (
        <KpiDetailSheet
          kpiSetId={kpiSet.id}
          initialItemId={"itemId" in sheet ? sheet.itemId : null}
          adding={"add" in sheet}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </PageColumn>
  );
}
