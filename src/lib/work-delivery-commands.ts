import { isHrLike, nid, todayIso } from "./domain";
import { hasAdminGrant } from "./domain-query";
import type {
  AppState,
  Deliverable,
  DeliverableCategory,
  DeliverableFileVersion,
  DeliverableKind,
  DeliverableStatus,
  Invite,
  LeaveDecision,
  LeaveKind,
  LeaveRequest,
  LeaveSpanMode,
  LeaveType,
  Person,
  Project,
  PublicHoliday,
  Staffing,
  TimeBlock,
  TimeBlockType,
  WeekGridMode,
  WorkItem,
} from "./types";
import { TENANT_ID } from "./types";
import {
  blocksOverlap,
  canEditProjectWork,
  defaultDeliverableStatusId,
  hasAnyStaffingOnProject,
  hoursBetween,
  isStaffedOnProject,
  jakartaTodayIso,
  leaveBlocksWork,
  personHasBlockingLeave,
  personHasOverlappingBlock,
  personLoadOverload,
  projectById,
  projectCodeTaken,
  rangesOverlap,
  timeBlocksForPerson,
} from "./work-delivery-query";

export type CommandResult<T = object> = { state: AppState } & T;

function audit(state: AppState, action: string, entity: string, entityId: string, detail: string): AppState {
  return {
    ...state,
    audit: [
      {
        id: nid("aud"),
        at: new Date().toISOString(),
        actorRole: state.currentRole,
        actorPersonId: state.currentPersonId,
        action,
        entity,
        entityId,
        detail,
      },
      ...state.audit,
    ],
  };
}

function adminDenied(state: AppState): string | null {
  if (!hasAdminGrant(state)) return "Admin grant required";
  return null;
}

function ensureWorkDeliveryCollections(state: AppState): AppState {
  return {
    ...state,
    projects: state.projects ?? [],
    staffings: state.staffings ?? [],
    workItems: state.workItems ?? [],
    deliverables: state.deliverables ?? [],
    deliverableStatuses: state.deliverableStatuses ?? [],
    deliverableCategories: state.deliverableCategories ?? [],
    leaveRequests: state.leaveRequests ?? [],
    leaveTypes: state.leaveTypes ?? [],
    publicHolidays: state.publicHolidays ?? [],
    timeBlockTypes: state.timeBlockTypes ?? [],
    timeBlocks: state.timeBlocks ?? [],
    invites: state.invites ?? [],
  };
}

function validDateOrder(start: string, end: string | null): boolean {
  if (end === null) return true;
  return end >= start;
}

function workItemInsideProject(project: Project, startDate: string, endDate: string): string | null {
  if (endDate < startDate) return "WorkItem end must fall on or after start";
  if (startDate < project.startDate) return "WorkItem start must sit inside the Project dates";
  if (project.endDate && endDate > project.endDate) return "WorkItem end must sit inside the Project dates";
  if (project.endDate && startDate > project.endDate) return "WorkItem start must sit inside the Project dates";
  return null;
}

export type OpenProjectInput = {
  code: string;
  name: string;
  clientName?: string | null;
  startDate: string;
  endDate?: string | null;
};

export function openProject(state: AppState, input: OpenProjectInput): CommandResult<{ projectId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, projectId: null, error: denied };
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code) return { state, projectId: null, error: "Project code is required" };
  if (!name) return { state, projectId: null, error: "Project name is required" };
  if (!input.startDate) return { state, projectId: null, error: "Project start is required" };
  const endDate = input.endDate ?? null;
  if (!validDateOrder(input.startDate, endDate)) {
    return { state, projectId: null, error: "Project end must fall on or after start" };
  }
  if (projectCodeTaken(state, code)) {
    return { state, projectId: null, error: "Project code must be unique in the company" };
  }
  const projectId = nid("project");
  const project: Project = {
    id: projectId,
    tenantId: TENANT_ID,
    code,
    name,
    clientName: input.clientName?.trim() ? input.clientName.trim() : null,
    startDate: input.startDate,
    endDate,
  };
  const next = { ...state, projects: [...state.projects, project] };
  return {
    state: audit(next, "create", "Project", projectId, `Opened ${code}`),
    projectId,
    error: null,
  };
}

export type UpdateProjectInput = {
  code?: string;
  name?: string;
  clientName?: string | null;
  startDate?: string;
  endDate?: string | null;
};

export function updateProject(
  state: AppState,
  projectId: string,
  input: UpdateProjectInput,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const existing = projectById(state, projectId);
  if (!existing) return { state, error: "Project not found" };

  const code = input.code !== undefined ? input.code.trim() : existing.code;
  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const clientName =
    input.clientName !== undefined
      ? input.clientName?.trim()
        ? input.clientName.trim()
        : null
      : existing.clientName;
  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate !== undefined ? input.endDate : existing.endDate;

  if (!code) return { state, error: "Project code is required" };
  if (!name) return { state, error: "Project name is required" };
  if (!validDateOrder(startDate, endDate)) {
    return { state, error: "Project end must fall on or after start" };
  }
  if (projectCodeTaken(state, code, projectId)) {
    return { state, error: "Project code must be unique in the company" };
  }

  for (const item of state.workItems.filter((row) => row.projectId === projectId)) {
    const outside = workItemInsideProject({ ...existing, startDate, endDate }, item.startDate, item.endDate);
    if (outside) return { state, error: "Project dates would leave a WorkItem outside the Project" };
  }

  const next = {
    ...state,
    projects: state.projects.map((row) =>
      row.id === projectId ? { ...row, code, name, clientName, startDate, endDate } : row,
    ),
  };
  return { state: audit(next, "update", "Project", projectId, `Updated ${code}`), error: null };
}

export type AddStaffingInput = {
  personId: string;
  projectId: string;
  startDate: string;
  endDate?: string | null;
  load: number;
};

export function addStaffing(
  state: AppState,
  input: AddStaffingInput,
): CommandResult<{ staffingId: string | null; overload: number; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, staffingId: null, overload: 0, error: denied };
  if (!state.people.some((row) => row.id === input.personId)) {
    return { state, staffingId: null, overload: 0, error: "Only a Person can be staffed" };
  }
  if (!projectById(state, input.projectId)) {
    return { state, staffingId: null, overload: 0, error: "Project not found" };
  }
  const endDate = input.endDate ?? null;
  if (!validDateOrder(input.startDate, endDate)) {
    return { state, staffingId: null, overload: 0, error: "Staffing end must fall on or after start" };
  }
  if (!Number.isInteger(input.load) || input.load < 1 || input.load > 100) {
    return { state, staffingId: null, overload: 0, error: "Load must be a whole percent from 1 to 100" };
  }
  const overlap = state.staffings.some(
    (row) =>
      row.personId === input.personId
      && row.projectId === input.projectId
      && rangesOverlap(row.startDate, row.endDate, input.startDate, endDate),
  );
  if (overlap) {
    return { state, staffingId: null, overload: 0, error: "Staffing ranges for the same Person on the same Project may not overlap" };
  }
  const staffingId = nid("staffing");
  const row: Staffing = {
    id: staffingId,
    tenantId: TENANT_ID,
    personId: input.personId,
    projectId: input.projectId,
    startDate: input.startDate,
    endDate,
    load: input.load,
  };
  const next = { ...state, staffings: [...state.staffings, row] };
  return {
    state: audit(next, "create", "Staffing", staffingId, `Staffed ${input.personId} on ${input.projectId}`),
    staffingId,
    overload: personLoadOverload(next, input.personId),
    error: null,
  };
}

export function updateStaffing(
  state: AppState,
  staffingId: string,
  patch: { endDate?: string | null; load?: number; startDate?: string },
): CommandResult<{ overload: number; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, overload: 0, error: denied };
  const existing = state.staffings.find((row) => row.id === staffingId);
  if (!existing) return { state, overload: 0, error: "Staffing not found" };
  const startDate = patch.startDate ?? existing.startDate;
  const endDate = patch.endDate !== undefined ? patch.endDate : existing.endDate;
  const load = patch.load ?? existing.load;
  if (!validDateOrder(startDate, endDate)) {
    return { state, overload: 0, error: "Staffing end must fall on or after start" };
  }
  if (!Number.isInteger(load) || load < 1 || load > 100) {
    return { state, overload: 0, error: "Load must be a whole percent from 1 to 100" };
  }
  const overlap = state.staffings.some(
    (row) =>
      row.id !== staffingId
      && row.personId === existing.personId
      && row.projectId === existing.projectId
      && rangesOverlap(row.startDate, row.endDate, startDate, endDate),
  );
  if (overlap) {
    return { state, overload: 0, error: "Staffing ranges for the same Person on the same Project may not overlap" };
  }
  const next = {
    ...state,
    staffings: state.staffings.map((row) =>
      row.id === staffingId ? { ...row, startDate, endDate, load } : row,
    ),
  };
  return {
    state: audit(next, "update", "Staffing", staffingId, "Updated Staffing"),
    overload: personLoadOverload(next, existing.personId),
    error: null,
  };
}

export function deleteStaffing(state: AppState, staffingId: string): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  if (!state.staffings.some((row) => row.id === staffingId)) {
    return { state, error: "Staffing not found" };
  }
  const next = { ...state, staffings: state.staffings.filter((row) => row.id !== staffingId) };
  return { state: audit(next, "delete", "Staffing", staffingId, "Deleted mistaken Staffing"), error: null };
}

export type UpsertWorkItemInput = {
  id?: string;
  projectId: string;
  name: string;
  description?: string;
  picPersonId: string;
  startDate: string;
  endDate: string;
};

export function upsertWorkItem(
  state: AppState,
  input: UpsertWorkItemInput,
): CommandResult<{ workItemId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  // An update stays on the WorkItem's own Project, so permission and validation below check that Project.
  if (input.id) {
    const existing = state.workItems.find((row) => row.id === input.id);
    if (!existing || existing.projectId !== input.projectId) {
      return { state, workItemId: null, error: "WorkItem not found" };
    }
  }
  const project = projectById(state, input.projectId);
  if (!project) return { state, workItemId: null, error: "Project not found" };
  if (!canEditProjectWork(state, input.projectId)) {
    return { state, workItemId: null, error: "Only Admin or a Person staffed today may edit WorkItems" };
  }
  const name = input.name.trim();
  if (!name) return { state, workItemId: null, error: "WorkItem name is required" };
  if (!input.startDate || !input.endDate) {
    return { state, workItemId: null, error: "WorkItem start and end are required" };
  }
  const outside = workItemInsideProject(project, input.startDate, input.endDate);
  if (outside) return { state, workItemId: null, error: outside };
  if (!hasAnyStaffingOnProject(state, input.picPersonId, input.projectId)) {
    return { state, workItemId: null, error: "PIC must have a Staffing row on that Project" };
  }

  if (input.id) {
    const next = {
      ...state,
      workItems: state.workItems.map((row) =>
        row.id === input.id
          ? {
              ...row,
              name,
              description: input.description ?? "",
              picPersonId: input.picPersonId,
              startDate: input.startDate,
              endDate: input.endDate,
            }
          : row,
      ),
    };
    return {
      state: audit(next, "update", "WorkItem", input.id, `Updated ${name}`),
      workItemId: input.id,
      error: null,
    };
  }

  const workItemId = nid("workitem");
  const row: WorkItem = {
    id: workItemId,
    tenantId: TENANT_ID,
    projectId: input.projectId,
    name,
    description: input.description ?? "",
    picPersonId: input.picPersonId,
    startDate: input.startDate,
    endDate: input.endDate,
  };
  const next = { ...state, workItems: [...state.workItems, row] };
  return {
    state: audit(next, "create", "WorkItem", workItemId, `Created ${name}`),
    workItemId,
    error: null,
  };
}

export function deleteWorkItem(state: AppState, workItemId: string): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const item = state.workItems.find((row) => row.id === workItemId);
  if (!item) return { state, error: "WorkItem not found" };
  if (!canEditProjectWork(state, item.projectId)) {
    return { state, error: "Only Admin or a Person staffed today may edit WorkItems" };
  }
  const next: AppState = {
    ...state,
    workItems: state.workItems.filter((row) => row.id !== workItemId),
    deliverables: state.deliverables.map((row) => ({
      ...row,
      workItemIds: row.workItemIds.filter((id) => id !== workItemId),
    })),
    timeBlocks: state.timeBlocks.map((row) =>
      row.workItemId === workItemId ? { ...row, workItemId: null, projectId: null } : row,
    ),
  };
  return { state: audit(next, "delete", "WorkItem", workItemId, "Deleted WorkItem"), error: null };
}

export type AddDeliverableInput = {
  projectId: string;
  kind: DeliverableKind;
  name: string;
  categoryId: string;
  statusId?: string;
  url?: string | null;
  storagePath?: string | null;
  fileName?: string | null;
  workItemIds?: string[];
};

export function addDeliverable(
  state: AppState,
  input: AddDeliverableInput,
): CommandResult<{ deliverableId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  if (!projectById(state, input.projectId)) return { state, deliverableId: null, error: "Project not found" };
  if (!canEditProjectWork(state, input.projectId)) {
    return { state, deliverableId: null, error: "Only Admin or a Person staffed today may edit Deliverables" };
  }
  const name = input.name.trim();
  if (!name) return { state, deliverableId: null, error: "Deliverable name is required" };
  if (!state.deliverableCategories.some((row) => row.id === input.categoryId)) {
    return { state, deliverableId: null, error: "Deliverable category is required" };
  }
  const statusId = input.statusId ?? defaultDeliverableStatusId(state);
  if (!statusId || !state.deliverableStatuses.some((row) => row.id === statusId)) {
    return { state, deliverableId: null, error: "Deliverable status is required" };
  }
  const workItemIds = input.workItemIds ?? [];
  for (const workItemId of workItemIds) {
    const item = state.workItems.find((row) => row.id === workItemId);
    if (!item || item.projectId !== input.projectId) {
      return { state, deliverableId: null, error: "Deliverable WorkItems must belong to the Project" };
    }
  }
  let url: string | null = null;
  let versions: DeliverableFileVersion[] = [];
  if (input.kind === "link") {
    const link = input.url?.trim() ?? "";
    if (!link) return { state, deliverableId: null, error: "Link Deliverable requires a URL" };
    url = link;
  } else {
    const path = input.storagePath?.trim() ?? "";
    if (!path) return { state, deliverableId: null, error: "File Deliverable requires a storage path" };
    versions = [
      {
        id: nid("dver"),
        storagePath: path,
        fileName: input.fileName?.trim() || name,
        uploadedAt: new Date().toISOString(),
      },
    ];
  }
  const deliverableId = nid("deliverable");
  const row: Deliverable = {
    id: deliverableId,
    tenantId: TENANT_ID,
    projectId: input.projectId,
    kind: input.kind,
    name,
    statusId,
    categoryId: input.categoryId,
    url,
    versions,
    workItemIds,
  };
  const next = { ...state, deliverables: [...state.deliverables, row] };
  return {
    state: audit(next, "create", "Deliverable", deliverableId, `Added ${name}`),
    deliverableId,
    error: null,
  };
}

export function updateDeliverable(
  state: AppState,
  deliverableId: string,
  patch: {
    name?: string;
    statusId?: string;
    categoryId?: string;
    url?: string | null;
    storagePath?: string | null;
    fileName?: string | null;
    workItemIds?: string[];
  },
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const existing = state.deliverables.find((row) => row.id === deliverableId);
  if (!existing) return { state, error: "Deliverable not found" };
  if (!canEditProjectWork(state, existing.projectId)) {
    return { state, error: "Only Admin or a Person staffed today may edit Deliverables" };
  }
  const name = patch.name !== undefined ? patch.name.trim() : existing.name;
  if (!name) return { state, error: "Deliverable name is required" };
  const statusId = patch.statusId ?? existing.statusId;
  const categoryId = patch.categoryId ?? existing.categoryId;
  if (!state.deliverableStatuses.some((row) => row.id === statusId)) {
    return { state, error: "Deliverable status is required" };
  }
  if (!state.deliverableCategories.some((row) => row.id === categoryId)) {
    return { state, error: "Deliverable category is required" };
  }
  const workItemIds = patch.workItemIds ?? existing.workItemIds;
  for (const workItemId of workItemIds) {
    const item = state.workItems.find((row) => row.id === workItemId);
    if (!item || item.projectId !== existing.projectId) {
      return { state, error: "Deliverable WorkItems must belong to the Project" };
    }
  }

  let url = existing.url;
  let versions = existing.versions;
  if (existing.kind === "link") {
    if (patch.url !== undefined) {
      const link = patch.url?.trim() ?? "";
      if (!link) return { state, error: "Link Deliverable requires a URL" };
      url = link;
    }
  } else if (patch.storagePath !== undefined) {
    const path = patch.storagePath?.trim() ?? "";
    if (!path) return { state, error: "File Deliverable requires a storage path" };
    versions = [
      ...versions,
      {
        id: nid("dver"),
        storagePath: path,
        fileName: patch.fileName?.trim() || name,
        uploadedAt: new Date().toISOString(),
      },
    ];
  }

  const next = {
    ...state,
    deliverables: state.deliverables.map((row) =>
      row.id === deliverableId
        ? { ...row, name, statusId, categoryId, url, versions, workItemIds }
        : row,
    ),
  };
  return { state: audit(next, "update", "Deliverable", deliverableId, `Updated ${name}`), error: null };
}

export function deleteDeliverable(state: AppState, deliverableId: string): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const existing = state.deliverables.find((row) => row.id === deliverableId);
  if (!existing) return { state, error: "Deliverable not found" };
  if (!canEditProjectWork(state, existing.projectId)) {
    return { state, error: "Only Admin or a Person staffed today may edit Deliverables" };
  }
  const next = { ...state, deliverables: state.deliverables.filter((row) => row.id !== deliverableId) };
  return { state: audit(next, "delete", "Deliverable", deliverableId, "Removed Deliverable"), error: null };
}

function reorderLabels<T extends { id: string; sortOrder: number }>(rows: T[], orderedIds: string[]): T[] | null {
  if (orderedIds.length !== rows.length) return null;
  if (new Set(orderedIds).size !== rows.length) return null;
  if (!orderedIds.every((id) => rows.some((row) => row.id === id))) return null;
  return orderedIds.map((id, sortOrder) => {
    const row = rows.find((item) => item.id === id)!;
    return { ...row, sortOrder };
  });
}

export function addDeliverableStatus(
  state: AppState,
  name: string,
): CommandResult<{ statusId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, statusId: null, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, statusId: null, error: "Status name is required" };
  const statusId = nid("dstatus");
  const row: DeliverableStatus = {
    id: statusId,
    tenantId: TENANT_ID,
    name: trimmed,
    sortOrder: state.deliverableStatuses.length,
    isDefault: state.deliverableStatuses.length === 0,
    countsAsAccepted: false,
  };
  const next = { ...state, deliverableStatuses: [...state.deliverableStatuses, row] };
  return { state: audit(next, "create", "DeliverableStatus", statusId, trimmed), statusId, error: null };
}

export function renameDeliverableStatus(
  state: AppState,
  statusId: string,
  name: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, error: "Status name is required" };
  if (!state.deliverableStatuses.some((row) => row.id === statusId)) {
    return { state, error: "Status not found" };
  }
  const next = {
    ...state,
    deliverableStatuses: state.deliverableStatuses.map((row) =>
      row.id === statusId ? { ...row, name: trimmed } : row,
    ),
  };
  return { state: audit(next, "update", "DeliverableStatus", statusId, trimmed), error: null };
}

export function reorderDeliverableStatuses(
  state: AppState,
  orderedIds: string[],
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const reordered = reorderLabels(state.deliverableStatuses, orderedIds);
  if (!reordered) return { state, error: "Status order must include every label once" };
  return {
    state: audit({ ...state, deliverableStatuses: reordered }, "update", "DeliverableStatus", "order", "Reordered"),
    error: null,
  };
}

export function removeDeliverableStatus(
  state: AppState,
  statusId: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  if (state.deliverableStatuses.length <= 1) {
    return { state, error: "At least one status label is required" };
  }
  if (state.deliverables.some((row) => row.statusId === statusId)) {
    return { state, error: "A label still in use cannot be removed" };
  }
  const next = {
    ...state,
    deliverableStatuses: state.deliverableStatuses.filter((row) => row.id !== statusId),
  };
  return { state: audit(next, "delete", "DeliverableStatus", statusId, "Removed"), error: null };
}

export function addDeliverableCategory(
  state: AppState,
  name: string,
): CommandResult<{ categoryId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, categoryId: null, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, categoryId: null, error: "Category name is required" };
  const categoryId = nid("dcat");
  const row: DeliverableCategory = {
    id: categoryId,
    tenantId: TENANT_ID,
    name: trimmed,
    sortOrder: state.deliverableCategories.length,
  };
  const next = { ...state, deliverableCategories: [...state.deliverableCategories, row] };
  return { state: audit(next, "create", "DeliverableCategory", categoryId, trimmed), categoryId, error: null };
}

export function renameDeliverableCategory(
  state: AppState,
  categoryId: string,
  name: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, error: "Category name is required" };
  if (!state.deliverableCategories.some((row) => row.id === categoryId)) {
    return { state, error: "Category not found" };
  }
  const next = {
    ...state,
    deliverableCategories: state.deliverableCategories.map((row) =>
      row.id === categoryId ? { ...row, name: trimmed } : row,
    ),
  };
  return { state: audit(next, "update", "DeliverableCategory", categoryId, trimmed), error: null };
}

export function reorderDeliverableCategories(
  state: AppState,
  orderedIds: string[],
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const reordered = reorderLabels(state.deliverableCategories, orderedIds);
  if (!reordered) return { state, error: "Category order must include every label once" };
  return {
    state: audit({ ...state, deliverableCategories: reordered }, "update", "DeliverableCategory", "order", "Reordered"),
    error: null,
  };
}

export function removeDeliverableCategory(
  state: AppState,
  categoryId: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  if (state.deliverables.some((row) => row.categoryId === categoryId)) {
    return { state, error: "A label still in use cannot be removed" };
  }
  const next = {
    ...state,
    deliverableCategories: state.deliverableCategories.filter((row) => row.id !== categoryId),
  };
  return { state: audit(next, "delete", "DeliverableCategory", categoryId, "Removed"), error: null };
}

export type FileLeaveInput = {
  personId?: string;
  kind: LeaveKind;
  leaveTypeId?: string | null;
  coverPersonId?: string | null;
  doctorLetterPath?: string | null;
  note: string;
  spanMode: LeaveSpanMode;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
};

export function fileLeaveRequest(
  state: AppState,
  input: FileLeaveInput,
): CommandResult<{ leaveRequestId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const personId = input.personId ?? state.currentPersonId;
  if (personId !== state.currentPersonId && !hasAdminGrant(state)) {
    return { state, leaveRequestId: null, error: "Only Admin may file LeaveRequest for another Person" };
  }
  if (!state.people.some((row) => row.id === personId)) {
    return { state, leaveRequestId: null, error: "Person not found" };
  }
  const note = input.note.trim();
  if (!note) return { state, leaveRequestId: null, error: "LeaveRequest note is required" };
  if (!validDateOrder(input.startDate, input.endDate)) {
    return { state, leaveRequestId: null, error: "Leave end must fall on or after start" };
  }

  let leaveTypeId: string | null = null;
  let coverPersonId: string | null = null;
  let doctorLetterPath: string | null = null;

  if (input.kind === "cuti") {
    leaveTypeId = input.leaveTypeId ?? null;
    if (!leaveTypeId || !state.leaveTypes.some((row) => row.id === leaveTypeId)) {
      return { state, leaveRequestId: null, error: "Cuti requires a LeaveType" };
    }
    coverPersonId = input.coverPersonId ?? null;
    if (!coverPersonId) return { state, leaveRequestId: null, error: "Cuti requires a covering Person" };
    if (coverPersonId === personId) {
      return { state, leaveRequestId: null, error: "Covering Person must be someone else" };
    }
    if (!state.users.some((row) => row.personId === coverPersonId)) {
      return { state, leaveRequestId: null, error: "Covering Person must have a User" };
    }
  } else if (input.kind === "sick") {
    doctorLetterPath = input.doctorLetterPath?.trim() || null;
    if (!doctorLetterPath) {
      return { state, leaveRequestId: null, error: "Sick requires a doctor's letter path before filing" };
    }
  } else if (input.kind !== "remote") {
    return { state, leaveRequestId: null, error: "LeaveRequest kind must be cuti, sick, or remote" };
  }

  let startTime: string | null = null;
  let endTime: string | null = null;
  if (input.spanMode === "hours") {
    if (input.startDate !== input.endDate) {
      return { state, leaveRequestId: null, error: "Hours LeaveRequest must be on one date" };
    }
    startTime = input.startTime ?? null;
    endTime = input.endTime ?? null;
    if (!startTime || !endTime) {
      return { state, leaveRequestId: null, error: "Hours LeaveRequest requires start and end times" };
    }
    if (endTime <= startTime) {
      return { state, leaveRequestId: null, error: "Hours LeaveRequest end must be after its start" };
    }
  }

  const leaveRequestId = nid("leave");
  const row: LeaveRequest = {
    id: leaveRequestId,
    tenantId: TENANT_ID,
    personId,
    kind: input.kind,
    leaveTypeId,
    coverPersonId,
    doctorLetterPath,
    note,
    spanMode: input.spanMode,
    startDate: input.startDate,
    endDate: input.endDate,
    startTime,
    endTime,
    decision: null,
    decidedByPersonId: null,
  };
  const next = { ...state, leaveRequests: [...state.leaveRequests, row] };
  return {
    state: audit(next, "create", "LeaveRequest", leaveRequestId, `Filed ${input.kind}`),
    leaveRequestId,
    error: null,
  };
}

export function decideLeaveRequest(
  state: AppState,
  leaveRequestId: string,
  decision: LeaveDecision,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  if (!state.leaveRequests.some((row) => row.id === leaveRequestId)) {
    return { state, error: "LeaveRequest not found" };
  }
  const next = {
    ...state,
    leaveRequests: state.leaveRequests.map((row) =>
      row.id === leaveRequestId
        ? { ...row, decision, decidedByPersonId: state.currentPersonId }
        : row,
    ),
  };
  return {
    state: audit(next, "update", "LeaveRequest", leaveRequestId, `Decided ${decision}`),
    error: null,
  };
}

/**
 * The filer, or any Admin, takes back a request that has no decision yet. A decided request stays: its paid,
 * unpaid, or refused outcome is part of the record.
 */
export function withdrawLeaveRequest(state: AppState, leaveRequestId: string): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const existing = state.leaveRequests.find((row) => row.id === leaveRequestId);
  if (!existing) return { state, error: "LeaveRequest not found" };
  if (existing.personId !== state.currentPersonId && !hasAdminGrant(state)) {
    return { state, error: "Only the Person or Admin may withdraw a LeaveRequest" };
  }
  if (existing.decision !== null) {
    return { state, error: "A decided LeaveRequest cannot be withdrawn" };
  }
  const next = { ...state, leaveRequests: state.leaveRequests.filter((row) => row.id !== leaveRequestId) };
  return { state: audit(next, "delete", "LeaveRequest", leaveRequestId, `Withdrew ${existing.kind}`), error: null };
}

export function addLeaveType(
  state: AppState,
  name: string,
): CommandResult<{ leaveTypeId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, leaveTypeId: null, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, leaveTypeId: null, error: "LeaveType name is required" };
  const leaveTypeId = nid("leave-type");
  const row: LeaveType = {
    id: leaveTypeId,
    tenantId: TENANT_ID,
    name: trimmed,
    sortOrder: state.leaveTypes.length,
  };
  const next = { ...state, leaveTypes: [...state.leaveTypes, row] };
  return { state: audit(next, "create", "LeaveType", leaveTypeId, trimmed), leaveTypeId, error: null };
}

export function renameLeaveType(
  state: AppState,
  leaveTypeId: string,
  name: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, error: "LeaveType name is required" };
  if (!state.leaveTypes.some((row) => row.id === leaveTypeId)) {
    return { state, error: "LeaveType not found" };
  }
  const next = {
    ...state,
    leaveTypes: state.leaveTypes.map((row) => (row.id === leaveTypeId ? { ...row, name: trimmed } : row)),
  };
  return { state: audit(next, "update", "LeaveType", leaveTypeId, trimmed), error: null };
}

export function reorderLeaveTypes(
  state: AppState,
  orderedIds: string[],
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const reordered = reorderLabels(state.leaveTypes, orderedIds);
  if (!reordered) return { state, error: "LeaveType order must include every label once" };
  return {
    state: audit({ ...state, leaveTypes: reordered }, "update", "LeaveType", "order", "Reordered"),
    error: null,
  };
}

export function removeLeaveType(state: AppState, leaveTypeId: string): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  if (state.leaveRequests.some((row) => row.leaveTypeId === leaveTypeId)) {
    return { state, error: "A label still in use cannot be removed" };
  }
  const next = { ...state, leaveTypes: state.leaveTypes.filter((row) => row.id !== leaveTypeId) };
  return { state: audit(next, "delete", "LeaveType", leaveTypeId, "Removed"), error: null };
}

export function addPublicHoliday(
  state: AppState,
  date: string,
  name: string,
): CommandResult<{ holidayId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, holidayId: null, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, holidayId: null, error: "PublicHoliday name is required" };
  if (!date) return { state, holidayId: null, error: "PublicHoliday date is required" };
  if (state.publicHolidays.some((row) => row.date === date && !row.suppressed)) {
    return { state, holidayId: null, error: "A PublicHoliday already exists on that date" };
  }
  const existing = state.publicHolidays.find((row) => row.date === date);
  if (existing) {
    const next = {
      ...state,
      publicHolidays: state.publicHolidays.map((row) =>
        row.id === existing.id
          ? { ...row, name: trimmed, origin: "internal" as const, suppressed: false, nameLocked: true }
          : row,
      ),
    };
    return {
      state: audit(next, "update", "PublicHoliday", existing.id, trimmed),
      holidayId: existing.id,
      error: null,
    };
  }
  const holidayId = nid("holiday");
  const row: PublicHoliday = {
    id: holidayId,
    tenantId: TENANT_ID,
    date,
    name: trimmed,
    origin: "internal",
    suppressed: false,
    nameLocked: false,
  };
  const next = { ...state, publicHolidays: [...state.publicHolidays, row] };
  return { state: audit(next, "create", "PublicHoliday", holidayId, trimmed), holidayId, error: null };
}

export function renamePublicHoliday(
  state: AppState,
  holidayId: string,
  name: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, error: "PublicHoliday name is required" };
  if (!state.publicHolidays.some((row) => row.id === holidayId)) {
    return { state, error: "PublicHoliday not found" };
  }
  const next = {
    ...state,
    publicHolidays: state.publicHolidays.map((row) =>
      row.id === holidayId ? { ...row, name: trimmed, nameLocked: true } : row,
    ),
  };
  return { state: audit(next, "update", "PublicHoliday", holidayId, trimmed), error: null };
}

export function removePublicHoliday(state: AppState, holidayId: string): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const existing = state.publicHolidays.find((row) => row.id === holidayId);
  if (!existing) return { state, error: "PublicHoliday not found" };
  if (existing.origin === "internal") {
    const next = { ...state, publicHolidays: state.publicHolidays.filter((row) => row.id !== holidayId) };
    return { state: audit(next, "delete", "PublicHoliday", holidayId, "Removed"), error: null };
  }
  const next = {
    ...state,
    publicHolidays: state.publicHolidays.map((row) =>
      row.id === holidayId ? { ...row, suppressed: true } : row,
    ),
  };
  return { state: audit(next, "update", "PublicHoliday", holidayId, "Suppressed"), error: null };
}

export type IndonesiaHolidayFeedItem = {
  date: string;
  name: string;
  origin: "libur" | "bersama";
};

export function applyIndonesiaHolidayFeed(
  state: AppState,
  items: IndonesiaHolidayFeedItem[],
): CommandResult<{ added: number; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, added: 0, error: denied };
  let added = 0;
  const holidays = [...state.publicHolidays];
  for (const item of items) {
    const name = item.name.trim();
    if (!item.date || !name) continue;
    const existing = holidays.find((row) => row.date === item.date);
    if (existing?.suppressed) continue;
    if (existing) continue;
    holidays.push({
      id: nid("holiday"),
      tenantId: TENANT_ID,
      date: item.date,
      name,
      origin: item.origin,
      suppressed: false,
      nameLocked: false,
    });
    added += 1;
  }
  const next = { ...state, publicHolidays: holidays };
  return {
    state: audit(next, "update", "PublicHoliday", "feed", `Added ${added} Indonesia holidays`),
    added,
    error: null,
  };
}

export function addTimeBlockType(
  state: AppState,
  name: string,
): CommandResult<{ typeId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, typeId: null, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, typeId: null, error: "TimeBlock type name is required" };
  const typeId = nid("tbtype");
  const row: TimeBlockType = {
    id: typeId,
    tenantId: TENANT_ID,
    name: trimmed,
    sortOrder: state.timeBlockTypes.length,
    allowsInvites: false,
  };
  const next = { ...state, timeBlockTypes: [...state.timeBlockTypes, row] };
  return { state: audit(next, "create", "TimeBlockType", typeId, trimmed), typeId, error: null };
}

export function renameTimeBlockType(
  state: AppState,
  typeId: string,
  name: string,
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const trimmed = name.trim();
  if (!trimmed) return { state, error: "TimeBlock type name is required" };
  if (!state.timeBlockTypes.some((row) => row.id === typeId)) {
    return { state, error: "TimeBlock type not found" };
  }
  const next = {
    ...state,
    timeBlockTypes: state.timeBlockTypes.map((row) =>
      row.id === typeId ? { ...row, name: trimmed } : row,
    ),
  };
  return { state: audit(next, "update", "TimeBlockType", typeId, trimmed), error: null };
}

export function reorderTimeBlockTypes(
  state: AppState,
  orderedIds: string[],
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  const reordered = reorderLabels(state.timeBlockTypes, orderedIds);
  if (!reordered) return { state, error: "TimeBlock type order must include every label once" };
  return {
    state: audit({ ...state, timeBlockTypes: reordered }, "update", "TimeBlockType", "order", "Reordered"),
    error: null,
  };
}

export function removeTimeBlockType(state: AppState, typeId: string): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const denied = adminDenied(state);
  if (denied) return { state, error: denied };
  if (state.timeBlocks.some((row) => row.typeId === typeId)) {
    return { state, error: "A label still in use cannot be removed" };
  }
  const next = { ...state, timeBlockTypes: state.timeBlockTypes.filter((row) => row.id !== typeId) };
  return { state: audit(next, "delete", "TimeBlockType", typeId, "Removed"), error: null };
}

export type UpsertTimeBlockInput = {
  id?: string;
  typeId: string;
  startAt: string;
  endAt: string;
  projectId?: string | null;
  workItemId?: string | null;
  title?: string;
  inviteePersonIds?: string[];
};

export function upsertTimeBlock(
  state: AppState,
  input: UpsertTimeBlockInput,
): CommandResult<{ timeBlockId: string | null; error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const personId = state.currentPersonId;
  const type = state.timeBlockTypes.find((row) => row.id === input.typeId);
  if (!type) return { state, timeBlockId: null, error: "TimeBlock type is required" };
  if (hoursBetween(input.startAt, input.endAt) < 1) {
    return { state, timeBlockId: null, error: "TimeBlock must be at least one hour" };
  }

  const projectId = input.projectId ?? null;
  const workItemId = input.workItemId ?? null;
  if (projectId || workItemId) {
    if (!projectId || !workItemId) {
      return { state, timeBlockId: null, error: "A Project TimeBlock must name one WorkItem" };
    }
    const workItem = state.workItems.find((row) => row.id === workItemId);
    if (!workItem || workItem.projectId !== projectId) {
      return { state, timeBlockId: null, error: "WorkItem must belong to the Project" };
    }
    const day = input.startAt.slice(0, 10);
    if (!isStaffedOnProject(state, personId, projectId, day)) {
      return { state, timeBlockId: null, error: "Staffing must cover the TimeBlock date" };
    }
  }

  if (personHasBlockingLeave(state, personId, input.startAt, input.endAt)) {
    return { state, timeBlockId: null, error: "Approved cuti or sick forbids an overlapping TimeBlock" };
  }
  if (personHasOverlappingBlock(state, personId, input.startAt, input.endAt, input.id)) {
    return { state, timeBlockId: null, error: "TimeBlocks for the same Person may not overlap" };
  }

  const inviteePersonIds = input.inviteePersonIds ?? [];
  if (inviteePersonIds.length > 0 && !type.allowsInvites) {
    return { state, timeBlockId: null, error: "Only the Meeting type may have Invites" };
  }
  for (const inviteeId of inviteePersonIds) {
    if (!state.users.some((row) => row.personId === inviteeId)) {
      return { state, timeBlockId: null, error: "Invitee must be a Person with a User" };
    }
    if (projectId) {
      const day = input.startAt.slice(0, 10);
      if (!isStaffedOnProject(state, inviteeId, projectId, day)) {
        return { state, timeBlockId: null, error: "Project meeting invitee Staffing must cover that date" };
      }
    }
  }

  if (input.id) {
    const existing = state.timeBlocks.find((row) => row.id === input.id);
    if (!existing) return { state, timeBlockId: null, error: "TimeBlock not found" };
    if (existing.personId !== personId) {
      return { state, timeBlockId: null, error: "Only the creator may edit the TimeBlock" };
    }
    const nextBlocks = state.timeBlocks.map((row) =>
      row.id === input.id
        ? {
            ...row,
            typeId: input.typeId,
            startAt: input.startAt,
            endAt: input.endAt,
            projectId,
            workItemId,
            title: input.title ?? row.title,
          }
        : row,
    );
    let invites = state.invites.filter((row) => row.timeBlockId !== input.id);
    invites = [
      ...invites,
      ...inviteePersonIds.map(
        (inviteeId): Invite => ({
          id: nid("invite"),
          tenantId: TENANT_ID,
          timeBlockId: input.id!,
          personId: inviteeId,
          status: "pending",
        }),
      ),
    ];
    // Preserve prior accept/decline when still invited
    const prior = state.invites.filter((row) => row.timeBlockId === input.id);
    invites = invites.map((row) => {
      if (row.timeBlockId !== input.id) return row;
      const old = prior.find((item) => item.personId === row.personId);
      return old ? { ...row, id: old.id, status: old.status } : row;
    });
    const next = { ...state, timeBlocks: nextBlocks, invites };
    return {
      state: audit(next, "update", "TimeBlock", input.id, "Updated TimeBlock"),
      timeBlockId: input.id,
      error: null,
    };
  }

  const timeBlockId = nid("timeblock");
  const block: TimeBlock = {
    id: timeBlockId,
    tenantId: TENANT_ID,
    personId,
    typeId: input.typeId,
    startAt: input.startAt,
    endAt: input.endAt,
    projectId,
    workItemId,
    title: input.title?.trim() ?? "",
  };
  const invites: Invite[] = inviteePersonIds.map((inviteeId) => ({
    id: nid("invite"),
    tenantId: TENANT_ID,
    timeBlockId,
    personId: inviteeId,
    status: "pending",
  }));
  const next = {
    ...state,
    timeBlocks: [...state.timeBlocks, block],
    invites: [...state.invites, ...invites],
  };
  return {
    state: audit(next, "create", "TimeBlock", timeBlockId, "Recorded TimeBlock"),
    timeBlockId,
    error: null,
  };
}

export function deleteTimeBlock(state: AppState, timeBlockId: string): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const existing = state.timeBlocks.find((row) => row.id === timeBlockId);
  if (!existing) return { state, error: "TimeBlock not found" };
  if (existing.personId !== state.currentPersonId) {
    return { state, error: "Only the creator may edit the TimeBlock" };
  }
  const next = {
    ...state,
    timeBlocks: state.timeBlocks.filter((row) => row.id !== timeBlockId),
    invites: state.invites.filter((row) => row.timeBlockId !== timeBlockId),
  };
  return { state: audit(next, "delete", "TimeBlock", timeBlockId, "Deleted TimeBlock"), error: null };
}

export function respondToInvite(
  state: AppState,
  inviteId: string,
  status: "accepted" | "declined",
): CommandResult<{ error: string | null }> {
  state = ensureWorkDeliveryCollections(state);
  const invite = state.invites.find((row) => row.id === inviteId);
  if (!invite) return { state, error: "Invite not found" };
  if (invite.personId !== state.currentPersonId) {
    return { state, error: "Only the invitee may answer the Invite" };
  }
  const block = state.timeBlocks.find((row) => row.id === invite.timeBlockId);
  if (!block) return { state, error: "TimeBlock not found" };
  if (status === "accepted") {
    if (personHasBlockingLeave(state, invite.personId, block.startAt, block.endAt)) {
      return { state, error: "Accept is refused when the meeting overlaps approved cuti or sick" };
    }
    if (personHasOverlappingBlock(state, invite.personId, block.startAt, block.endAt, block.id)) {
      return { state, error: "TimeBlocks for the same Person may not overlap" };
    }
  }
  const next = {
    ...state,
    invites: state.invites.map((row) => (row.id === inviteId ? { ...row, status } : row)),
  };
  return { state: audit(next, "update", "Invite", inviteId, status), error: null };
}

export function setWeekGrid(
  state: AppState,
  mode: WeekGridMode,
  personId: string = state.currentPersonId,
): CommandResult<{ error: string | null }> {
  if (personId !== state.currentPersonId && !hasAdminGrant(state)) {
    return { state, error: "Only the Person or Admin may change the week grid" };
  }
  if (mode !== "weekdays" && mode !== "full") {
    return { state, error: "Week grid must be weekdays or full" };
  }
  const next = {
    ...state,
    people: state.people.map((row) => (row.id === personId ? { ...row, weekGrid: mode } : row)),
  };
  return { state: audit(next, "update", "Person", personId, `Week grid ${mode}`), error: null };
}

export type ContactPatch = {
  preferredName?: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  linkedIn?: string | null;
};

export function updatePersonContact(
  state: AppState,
  personId: string,
  patch: ContactPatch,
): CommandResult<{ error: string | null }> {
  const self = personId === state.currentPersonId;
  if (!self && !hasAdminGrant(state)) {
    return { state, error: "Only the Person or Admin may edit contact details" };
  }
  if (!state.people.some((row) => row.id === personId)) {
    return { state, error: "Person not found" };
  }
  const next = {
    ...state,
    people: state.people.map((row): Person => {
      if (row.id !== personId) return row;
      return {
        ...row,
        preferredName: patch.preferredName !== undefined ? patch.preferredName.trim() || row.preferredName : row.preferredName,
        phone: patch.phone !== undefined ? patch.phone : row.phone,
        email: patch.email !== undefined ? patch.email : row.email,
        emergencyContactName:
          patch.emergencyContactName !== undefined ? patch.emergencyContactName : row.emergencyContactName,
        emergencyContactPhone:
          patch.emergencyContactPhone !== undefined ? patch.emergencyContactPhone : row.emergencyContactPhone,
        linkedIn:
          patch.linkedIn !== undefined
            ? patch.linkedIn?.trim()
              ? patch.linkedIn.trim()
              : undefined
            : row.linkedIn,
      };
    }),
  };
  return { state: audit(next, "update", "Person", personId, "Updated contact details"), error: null };
}

export function refuseApplyCvIfAdminOnly(state: AppState): string | null {
  if (!isHrLike(state.currentRole)) return "Only HR may confirm a Curriculum Vitae";
  return null;
}

// re-export helpers used by tests
export { leaveBlocksWork, personLoadOverload, jakartaTodayIso, todayIso, timeBlocksForPerson, blocksOverlap };
