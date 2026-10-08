"use client";

import { DirectMixField } from "@/components/kpi/DirectMixField";
import { kpiYearName } from "@/components/kpi/kpi-copy";
import { latestActualText } from "@/components/kpi/my-kpi/latest-actual";
import { parentLabel } from "@/components/kpi/my-kpi/parent-label";
import { Callout, PageHeader } from "@/components/product/Card";
import { Badge } from "@/components/product/Badge";
import { HealthBadge, StatusBadge } from "@/components/product/StatusBadge";
import { Table, Td, Th } from "@/components/product/Table";
import { canViewKpiSet, kpiSetSummary } from "@/lib/kpi-tree";
import { isKpiAdmin, itemHealth, weightSum } from "@/lib/domain";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function KpiSetViewPage() {
  const params = useParams();
  const kpiSetId = typeof params.id === "string" ? params.id : "";
  const { state } = useStore();

  // Admin (User grant) reads every KPI Portfolio; KPI Admin links here with "Open portfolio".
  if (!kpiSetId || !(canViewKpiSet(state, kpiSetId) || isKpiAdmin(state))) {
    return (
      <div>
        <PageHeader title="KPI Portfolio" />
        <Callout tone="warning">You don&apos;t have access to this KPI Portfolio.</Callout>
        <p className="mt-3 text-sm">
          <Link href="/kpi/tree">Back to KPI tree</Link>
        </p>
      </div>
    );
  }

  const summary = kpiSetSummary(state, kpiSetId);
  if (!summary || !summary.person || !summary.position || !summary.cycle) {
    return (
      <div>
        <PageHeader title="KPI Portfolio" />
        <Callout tone="warning">This KPI Portfolio doesn&apos;t exist.</Callout>
        <p className="mt-3 text-sm">
          <Link href="/kpi/tree">Back to KPI tree</Link>
        </p>
      </div>
    );
  }

  const { kpiSet, person, position, cycle, items } = summary;
  const personName = person.preferredName ?? person.legalName;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`KPI Portfolio · ${personName}`}
        description={`${position.title} · ${kpiYearName(cycle)}`}
        actions={
          <>
            <StatusBadge status={kpiSet.status} />
            <Badge>View only</Badge>
          </>
        }
      />
      <nav className="text-sm" aria-label="Related pages">
        <Link href="/kpi/tree">← KPI tree</Link>
        {" · "}
        <Link href={`/people/${person.id}`}>{personName}</Link>
      </nav>
      {kpiSet.returnComment ? (
        <Callout tone="warning">
          <span className="font-medium">Returned:</span> {kpiSet.returnComment}
        </Callout>
      ) : null}
      {kpiSet.score !== undefined ? (
        <Callout>
          <span className="font-medium">Final score:</span> {kpiSet.score}
        </Callout>
      ) : null}
      <Table>
        <thead>
          <tr>
            <Th>KPI</Th>
            <Th>Target</Th>
            <Th>Weight</Th>
            <Th>Parent</Th>
            <Th>Latest actual</Th>
            <Th>Health</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <Td>
                <div className="font-medium">{item.name}</div>
                <div className="text-muted">{item.definition}</div>
                <DirectMixField state={state} item={item} canEdit={false} onChange={() => {}} />
              </Td>
              <Td className="tabular-nums">
                {item.target} {item.unit}
              </Td>
              <Td className="tabular-nums">{item.weight}%</Td>
              <Td>{parentLabel(state, item)}</Td>
              <Td className="tabular-nums">{latestActualText(state, item)}</Td>
              <Td>
                <HealthBadge health={itemHealth(state, item)} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="text-sm text-muted tabular-nums">Weights total {weightSum(items)}%</p>
    </div>
  );
}
