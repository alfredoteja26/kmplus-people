"use client";

import { kpiYearName } from "@/components/kpi/kpi-copy";
import { KpiItemRows, KpiItemsPanel } from "@/components/kpi/my-kpi/kpi-item-rows";
import { Fact, FactsStrip, ScoreFact, WeightFact } from "@/components/kpi/my-kpi/my-kpi-facts";
import { Badge } from "@/components/product/Badge";
import { Callout, PageColumn, PageHeader } from "@/components/product/Card";
import { StatusBadge } from "@/components/product/StatusBadge";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { isRootAssignment } from "@/lib/cascade";
import { isKpiAdmin, weightSum } from "@/lib/domain";
import { kpiYearPhase } from "@/lib/domain-query";
import { canViewKpiSet, kpiSetSummary } from "@/lib/kpi-tree";
import { approvalDetail, scoreFact } from "@/lib/my-kpi-view";
import { liveMonitoringScore } from "@/lib/phase-desk";
import { useStore } from "@/lib/store";
import { ArrowLeftIcon, TargetIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function KpiSetViewPage() {
  const params = useParams();
  const kpiSetId = typeof params.id === "string" ? params.id : "";
  const { state } = useStore();

  // Admin (User grant) reads every KPI Portfolio; KPI Admin links here with "Open portfolio".
  if (!kpiSetId || !(canViewKpiSet(state, kpiSetId) || isKpiAdmin(state))) {
    return (
      <PageColumn>
        <PageHeader className="mb-0" title="KPI Portfolio" />
        <Callout tone="warning">
          You don&apos;t have access to this KPI Portfolio.{" "}
          <Link href="/kpi/tree" className="font-medium text-accent underline-offset-2 hover:underline">
            Go back to the KPI tree
          </Link>
          .
        </Callout>
      </PageColumn>
    );
  }

  const summary = kpiSetSummary(state, kpiSetId);
  if (!summary || !summary.person || !summary.position || !summary.cycle) {
    return (
      <PageColumn>
        <PageHeader className="mb-0" title="KPI Portfolio" />
        <Callout tone="warning">
          This KPI Portfolio doesn&apos;t exist.{" "}
          <Link href="/kpi/tree" className="font-medium text-accent underline-offset-2 hover:underline">
            Go back to the KPI tree
          </Link>
          .
        </Callout>
      </PageColumn>
    );
  }

  const { kpiSet, person, position, cycle, items } = summary;
  const personName = person.preferredName ?? person.legalName;
  const phase = kpiYearPhase(cycle);
  const rootAssignment = isRootAssignment(state, kpiSet.assignmentId);
  const score = scoreFact(phase, phase === "monitoring" ? liveMonitoringScore(state, kpiSet.id) : null, kpiSet.score);

  return (
    <PageColumn>
      <div className="flex flex-col gap-4">
        <Link href="/kpi/tree" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted no-underline hover:text-accent">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          KPI tree
        </Link>
        <header className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-heading text-h1 font-medium text-balance">{personName}</h1>
            <StatusBadge status={kpiSet.status} />
            <Badge>View only</Badge>
          </div>
          <p className="mt-2 mb-0 text-muted">
            KPI Portfolio · {position.title} · {kpiYearName(cycle)} ·{" "}
            <Link href={`/people/${person.id}`} className="font-medium text-accent underline-offset-2 hover:underline">
              Open profile
            </Link>
          </p>
        </header>
      </div>

      {kpiSet.status === "returned" && kpiSet.returnComment ? (
        <Callout tone="warning">
          <p className="m-0 font-medium">Returned for changes</p>
          <p className="mt-1 mb-0 whitespace-pre-line">{kpiSet.returnComment}</p>
        </Callout>
      ) : null}

      <FactsStrip>
        <Fact label="Approval">{approvalDetail(state, kpiSet)}</Fact>
        <WeightFact sum={weightSum(items)} />
        <ScoreFact {...score} />
      </FactsStrip>

      <KpiItemsPanel title="KPIs" count={items.length}>
        {items.length === 0 ? (
          <EmptyBlock className="py-8" icon={<TargetIcon aria-hidden="true" />} title="No KPIs yet" description="This KPI Portfolio has no KPIs." />
        ) : (
          <KpiItemRows state={state} cycle={cycle} items={[...items].sort((a, b) => a.name.localeCompare(b.name))} rootAssignment={rootAssignment} />
        )}
      </KpiItemsPanel>
    </PageColumn>
  );
}
