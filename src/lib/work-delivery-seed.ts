import type {
  DeliverableCategory,
  DeliverableStatus,
  LeaveType,
  TimeBlockType,
} from "./types";
import { TENANT_ID } from "./types";

const t = TENANT_ID;

export function seedDeliverableStatuses(): DeliverableStatus[] {
  return [
    { id: "dstatus-draft", tenantId: t, name: "Draft", sortOrder: 0, isDefault: true, countsAsAccepted: false },
    { id: "dstatus-shared", tenantId: t, name: "Shared", sortOrder: 1, isDefault: false, countsAsAccepted: false },
    { id: "dstatus-accepted", tenantId: t, name: "Accepted", sortOrder: 2, isDefault: false, countsAsAccepted: true },
  ];
}

export function seedDeliverableCategories(): DeliverableCategory[] {
  return [
    { id: "dcat-notes", tenantId: t, name: "Meeting Notes", sortOrder: 0 },
    { id: "dcat-deliverables", tenantId: t, name: "Project Deliverables", sortOrder: 1 },
    { id: "dcat-reference", tenantId: t, name: "Reference Documents", sortOrder: 2 },
  ];
}

export function seedLeaveTypes(): LeaveType[] {
  const names = [
    "Tahunan",
    "Besar",
    "Bersalin",
    "Pernikahan",
    "Kelahiran",
    "Kematian",
    "Khitanan/Pembaptisan",
    "Ujian/test",
    "Utk. Keperluan Nasional",
    "Lain-lain (Acara Wisuda)",
  ];
  return names.map((name, sortOrder) => ({
    id: `leave-type-${sortOrder + 1}`,
    tenantId: t,
    name,
    sortOrder,
  }));
}

export function seedTimeBlockTypes(): TimeBlockType[] {
  return [
    { id: "tbtype-meeting", tenantId: t, name: "Meeting", sortOrder: 0, allowsInvites: true },
    { id: "tbtype-activity", tenantId: t, name: "Activity", sortOrder: 1, allowsInvites: false },
  ];
}
