"use client";

import { LabelListSection } from "@/components/work-delivery/LabelListSection";
import { ProjectAdminSubnav } from "@/components/work-delivery/ProjectAdminSubnav";
import { hasAdminGrant } from "@/lib/domain-query";
import { useStore } from "@/lib/store";

const MEETING_LOCK = "Only the Meeting type can carry invitations, so it can be renamed but not removed.";

/** How many records carry each label id. */
function countBy<T>(rows: T[], key: (row: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = key(row);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function bySortOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export default function ProjectAdminConfigurePage() {
  const {
    state,
    addDeliverableStatus,
    renameDeliverableStatus,
    removeDeliverableStatus,
    addDeliverableCategory,
    renameDeliverableCategory,
    removeDeliverableCategory,
    addLeaveType,
    renameLeaveType,
    removeLeaveType,
    addReimbursementType,
    renameReimbursementType,
    removeReimbursementType,
    addTimeBlockType,
    renameTimeBlockType,
    removeTimeBlockType,
  } = useStore();

  if (!hasAdminGrant(state)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <h1 className="m-0 font-heading text-h1 font-medium">Lists</h1>
        <p className="m-0 text-sm">Only an Admin can edit these lists.</p>
      </div>
    );
  }

  const statusUses = countBy(state.deliverables, (row) => row.statusId);
  const categoryUses = countBy(state.deliverables, (row) => row.categoryId);
  const leaveUses = countBy(state.leaveRequests, (row) => row.leaveTypeId);
  const blockUses = countBy(state.timeBlocks, (row) => row.typeId);
  const reimbursementUses = countBy(state.reimbursementRequests, (row) => row.reimbursementTypeId);

  const statuses = bySortOrder(state.deliverableStatuses).map((row) => ({
    id: row.id,
    name: row.name,
    uses: statusUses.get(row.id) ?? 0,
    note: [row.isDefault ? "New deliverables start here" : "", row.countsAsAccepted ? "Counts toward progress" : ""]
      .filter(Boolean)
      .join(" · "),
  }));
  const categories = bySortOrder(state.deliverableCategories).map((row) => ({
    id: row.id,
    name: row.name,
    uses: categoryUses.get(row.id) ?? 0,
  }));
  const leaveTypes = bySortOrder(state.leaveTypes).map((row) => ({
    id: row.id,
    name: row.name,
    uses: leaveUses.get(row.id) ?? 0,
  }));
  const reimbursementTypes = bySortOrder(state.reimbursementTypes).map((row) => ({
    id: row.id,
    name: row.name,
    uses: reimbursementUses.get(row.id) ?? 0,
  }));
  const blockTypes = bySortOrder(state.timeBlockTypes).map((row) => ({
    id: row.id,
    name: row.name,
    uses: blockUses.get(row.id) ?? 0,
    locked: row.allowsInvites ? MEETING_LOCK : undefined,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header>
        <h1 className="m-0 font-heading text-h1 font-medium">Lists</h1>
        <p className="mt-1 mb-0 text-muted">
          The labels people pick across the company. A label in use can be renamed but not removed.
        </p>
        <ProjectAdminSubnav className="mt-4" />
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <LabelListSection
          title="Deliverable status"
          noun="deliverable status"
          description="Accepted deliverables count toward project progress."
          context="People pick a status when they add or update a deliverable."
          usedBy={["deliverable", "deliverables"]}
          labels={statuses}
          onAdd={(name) => addDeliverableStatus(name).error}
          onRename={(id, name) => renameDeliverableStatus(id, name).error}
          onRemove={(id) => removeDeliverableStatus(id).error}
        />

        <LabelListSection
          title="Deliverable category"
          noun="deliverable category"
          context="People pick a category when they add a deliverable."
          usedBy={["deliverable", "deliverables"]}
          labels={categories}
          onAdd={(name) => addDeliverableCategory(name).error}
          onRename={(id, name) => renameDeliverableCategory(id, name).error}
          onRemove={(id) => removeDeliverableCategory(id).error}
        />

        <LabelListSection
          title="Leave type"
          noun="leave type"
          description="Types of cuti people can choose. Sick and remote leave are not on this list."
          context="People pick a leave type when they request cuti."
          usedBy={["leave request", "leave requests"]}
          labels={leaveTypes}
          onAdd={(name) => addLeaveType(name).error}
          onRename={(id, name) => renameLeaveType(id, name).error}
          onRemove={(id) => removeLeaveType(id).error}
        />

        <LabelListSection
          title="Reimbursement type"
          noun="reimbursement type"
          context="People pick a type when they file a reimbursement."
          usedBy={["reimbursement", "reimbursements"]}
          labels={reimbursementTypes}
          onAdd={(name) => addReimbursementType(name).error}
          onRename={(id, name) => renameReimbursementType(id, name).error}
          onRemove={(id) => removeReimbursementType(id).error}
        />

        <LabelListSection
          title="Time entry type"
          noun="time entry type"
          context="People pick a type when they log time on the timesheet."
          usedBy={["time entry", "time entries"]}
          labels={blockTypes}
          onAdd={(name) => addTimeBlockType(name).error}
          onRename={(id, name) => renameTimeBlockType(id, name).error}
          onRemove={(id) => removeTimeBlockType(id).error}
        />
      </div>
    </div>
  );
}
