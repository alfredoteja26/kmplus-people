"use client";

import { Callout, PageHeader } from "@/components/product/Card";
import { LabelListSection } from "@/components/work-delivery/LabelListSection";
import { hasAdminGrant } from "@/lib/domain-query";
import { useStore } from "@/lib/store";
import Link from "next/link";

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
    addTimeBlockType,
    renameTimeBlockType,
    removeTimeBlockType,
  } = useStore();

  if (!hasAdminGrant(state)) {
    return (
      <div>
        <PageHeader title="Edit lists" />
        <Callout tone="warning">Only an Admin can edit these lists.</Callout>
      </div>
    );
  }

  const statuses = [...state.deliverableStatuses].sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = [...state.deliverableCategories].sort((a, b) => a.sortOrder - b.sortOrder);
  const leaveTypes = [...state.leaveTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const blockTypes = [...state.timeBlockTypes].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit lists"
        description="Deliverable statuses and categories, leave types and time entry types used across the company. A label that is in use can't be removed."
        actions={
          <Link href="/project-admin" className="text-sm font-medium text-accent no-underline hover:underline">
            Back to Project Admin
          </Link>
        }
      />

      <LabelListSection
        title="Deliverable status"
        description="New deliverables start as Draft. Accepted deliverables count toward project progress on Home."
        labels={statuses}
        onAdd={(name) => addDeliverableStatus(name).error}
        onRename={(id, name) => renameDeliverableStatus(id, name).error}
        onRemove={(id) => removeDeliverableStatus(id).error}
      />

      <LabelListSection
        title="Deliverable category"
        labels={categories}
        onAdd={(name) => addDeliverableCategory(name).error}
        onRename={(id, name) => renameDeliverableCategory(id, name).error}
        onRemove={(id) => removeDeliverableCategory(id).error}
      />

      <LabelListSection
        title="Leave type"
        description="Types of cuti people can choose. Sick and remote leave are not on this list."
        labels={leaveTypes}
        onAdd={(name) => addLeaveType(name).error}
        onRename={(id, name) => renameLeaveType(id, name).error}
        onRemove={(id) => removeLeaveType(id).error}
      />

      <LabelListSection
        title="Time entry type"
        description="Only the Meeting type can include invitations, even if you rename it."
        labels={blockTypes}
        onAdd={(name) => addTimeBlockType(name).error}
        onRename={(id, name) => renameTimeBlockType(id, name).error}
        onRemove={(id) => removeTimeBlockType(id).error}
      />
    </div>
  );
}
