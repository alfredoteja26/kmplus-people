"use client";

import { TimesheetView } from "@/components/work-delivery/timesheet/TimesheetView";
import { useStore } from "@/lib/store";

export default function TimesheetPage() {
  const { state, setWeekGrid, upsertTimeBlock, deleteTimeBlock, respondToInvite } = useStore();
  const personId = state.currentPersonId;

  return (
    <TimesheetView
      state={state}
      personId={personId}
      onSetWeekGrid={(mode) => setWeekGrid(mode, personId).error}
      onUpsert={(input) => upsertTimeBlock(input).error}
      onDelete={(id) => deleteTimeBlock(id).error}
      onRespondInvite={(inviteId, status) => respondToInvite(inviteId, status).error}
    />
  );
}
