"use client";

import { AuditSlice } from "@/components/home/AuditSlice";
import { NeedsAttention } from "@/components/home/NeedsAttention";
import { RosterGlance } from "@/components/home/RosterGlance";
import { PageHeader } from "@/components/ui/Card";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const { state } = useStore();

  return (
    <div>
      <PageHeader
        kicker="From CV to KPI"
        title="KMPlus People"
        description="Who someone is, which Position they hold, what their CV claims, and what they are measured on this year."
      />
      <NeedsAttention state={state} />
      <RosterGlance state={state} />
      <AuditSlice state={state} />
    </div>
  );
}
