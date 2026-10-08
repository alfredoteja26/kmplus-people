"use client";

import { TimesheetWeekView } from "@/components/work-delivery/TimesheetWeekView";
import { PageHeader } from "@/components/product/Card";
import { useStore } from "@/lib/store";

export default function TimesheetPage() {
  const { state, setWeekGrid, upsertTimeBlock, deleteTimeBlock } = useStore();
  const personId = state.currentPersonId;

  return (
    <div>
      <PageHeader
        title="Timesheet"
        description="Log your working time (Jakarta time). Weekend hours count toward your weekly total, even when only Monday–Friday is shown."
      />
      <TimesheetWeekView
        state={state}
        personId={personId}
        onSetWeekGrid={(mode) => setWeekGrid(mode, personId).error}
        onUpsert={(input) => upsertTimeBlock(input).error}
        onDelete={(id) => deleteTimeBlock(id).error}
      />
    </div>
  );
}
