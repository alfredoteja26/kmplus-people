"use client";

import { DirectMixField } from "@/components/kpi/DirectMixField";
import { latestActualText } from "@/components/kpi/my-kpi/latest-actual";
import { parentLabel } from "@/components/kpi/my-kpi/parent-label";
import { Callout, PageHeader } from "@/components/ui/Card";
import { HealthBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { canViewKpiSet, kpiSetSummary } from "@/lib/kpi-tree";
import { itemHealth, weightSum } from "@/lib/domain";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function KpiSetViewPage() {
  const params = useParams();
  const kpiSetId = typeof params.id === "string" ? params.id : "";
  const { state } = useStore();

  if (!kpiSetId || !canViewKpiSet(state, kpiSetId)) {
    return (
      <div>
        <PageHeader title="KPI portfolio" />
        <Callout tone="warning">This KPI portfolio is not available in your scope.</Callout>
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
        <PageHeader title="KPI portfolio" />
        <Callout tone="warning">KPI portfolio not found.</Callout>
      </div>
    );
  }

  const { kpiSet, person, position, cycle, items } = summary;
  const personName = person.preferredName ?? person.legalName;

  return (
    <div className="space-y-4">
      <PageHeader
        kicker={cycle.name}
        title={`KPI portfolio · ${personName}`}
        description={`${position.title} · read-only view from KPI tree`}
        actions={<StatusBadge status={kpiSet.status} />}
      />
      <nav className="text-sm" aria-label="KPI portfolio">
        <Link href="/kpi/tree">← KPI tree</Link>
        {" · "}
        <Link href={`/people/${person.id}`}>{personName}</Link>
      </nav>
      {kpiSet.returnComment ? (
        <Callout tone="warning">
          <span className="font-medium">Return comment:</span> {kpiSet.returnComment}
        </Callout>
      ) : null}
      {kpiSet.score !== undefined ? (
        <Callout>
          <span className="font-medium">Stored score:</span> {kpiSet.score}
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
      <p className="text-sm text-muted tabular-nums">Weights {weightSum(items)}%</p>
    </div>
  );
}
