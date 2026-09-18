import { effectiveCadence, windowFor } from "./cadence";
import { normalizeKpiItemParent, validateParents } from "./cascade";
import { blocksOwnCheckIn, displayedActual, validateAllDirectInSet, validateDirectCascade } from "./direct";
import { fieldValue, isHrLike, itemsForSet, nid, todayIso, weightSum } from "./domain";
import {
  emptyPersonEvidence,
  mergeEvidenceOntoPerson,
  parseCertificationRows,
  parseEducationRows,
  parseExperienceRows,
  parseSkillRows,
  skillNamesFromRows,
} from "./person-evidence";
import type {
  AppState,
  Assignment,
  CheckInCadence,
  ContractType,
  CorrectionRequest,
  CurriculumVitae,
  EmploymentStatus,
  FieldDecision,
  KpiItem,
  Person,
  Position,
} from "./types";
import { TENANT_ID } from "./types";

export type CommandResult<T = object> = { state: AppState } & T;

export type CreatePersonInput = {
  legalName: string;
  preferredName: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  joinDate: string;
  contractType: ContractType;
  status: EmploymentStatus;
};

export type ApplyCvMode = { type: "existing"; personId: string } | { type: "new-hire" };

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

export function createPerson(state: AppState, input: CreatePersonInput): CommandResult<{ personId: string }> {
  const personId = nid("person");
  const employmentId = nid("emp");
  const next: AppState = {
    ...state,
    people: [
      ...state.people,
      {
        id: personId,
        tenantId: TENANT_ID,
        legalName: input.legalName,
        preferredName: input.preferredName || input.legalName,
        email: input.email,
        phone: input.phone,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        skills: [],
        educationNotes: "",
        experienceNotes: "",
        certifications: "",
        ...emptyPersonEvidence(),
      },
    ],
    employments: [
      ...state.employments,
      {
        id: employmentId,
        tenantId: TENANT_ID,
        personId,
        joinDate: input.joinDate,
        endDate: null,
        status: input.status,
        contractType: input.contractType,
      },
    ],
  };
  return { state: audit(next, "create", "Person", personId, `Created ${input.legalName}`), personId };
}

export function updatePerson(state: AppState, personId: string, patch: Partial<Person>): CommandResult {
  const next: AppState = {
    ...state,
    people: state.people.map((row) => (row.id === personId ? { ...row, ...patch, id: row.id, tenantId: row.tenantId } : row)),
  };
  return { state: audit(next, "update", "Person", personId, "Updated Person") };
}

export function confirmHire(state: AppState, personId: string): CommandResult {
  const person = state.people.find((row) => row.id === personId);
  if (!person) return { state };

  const wasDraft = state.employments.some((row) => row.personId === personId && row.status === "draft-hire");
  let next: AppState = {
    ...state,
    employments: state.employments.map((row) =>
      row.personId === personId && row.status === "draft-hire" ? { ...row, status: "active" } : row,
    ),
  };

  if (wasDraft && !next.users.some((row) => row.personId === personId)) {
    const userId = nid("user");
    next = {
      ...next,
      users: [
        ...next.users,
        {
          id: userId,
          tenantId: TENANT_ID,
          personId,
          email: person.email,
          role: "employee",
          mustSetPassword: true,
        },
      ],
    };
    next = audit(next, "create", "User", userId, `Invited User ${person.email}`);
  }

  return { state: audit(next, "update", "Employment", personId, "Confirmed hire") };
}

export function assignPosition(state: AppState, personId: string, positionId: string, startDate: string): CommandResult {
  const occupied = state.assignments.find((row) => row.positionId === positionId && row.endDate === null);
  if (occupied && occupied.personId !== personId) {
    return { state };
  }
  const ended: Assignment[] = state.assignments.map((row) =>
    row.personId === personId && row.endDate === null ? { ...row, endDate: startDate } : row,
  );
  const assignmentId = nid("asg");
  const next: AppState = {
    ...state,
    assignments: [
      ...ended,
      {
        id: assignmentId,
        tenantId: TENANT_ID,
        personId,
        positionId,
        startDate,
        endDate: null,
      },
    ],
  };
  return { state: audit(next, "create", "Assignment", assignmentId, `Assigned to ${positionId}`) };
}

export function createPosition(state: AppState, input: Omit<Position, "id" | "tenantId">): CommandResult<{ positionId: string }> {
  const positionId = nid("pos");
  const next: AppState = {
    ...state,
    positions: [...state.positions, { ...input, id: positionId, tenantId: TENANT_ID }],
  };
  return { state: audit(next, "create", "Position", positionId, `Created ${input.title}`), positionId };
}

export function updatePosition(
  state: AppState,
  positionId: string,
  patch: Partial<Omit<Position, "id" | "tenantId">>,
): CommandResult {
  const next: AppState = {
    ...state,
    positions: state.positions.map((row) => (row.id === positionId ? { ...row, ...patch } : row)),
  };
  return { state: audit(next, "update", "Position", positionId, "Updated Position") };
}

export function requestCorrection(
  state: AppState,
  personId: string,
  field: string,
  currentValue: string,
  proposedValue: string,
): CommandResult {
  const row: CorrectionRequest = {
    id: nid("corr"),
    tenantId: TENANT_ID,
    personId,
    field,
    currentValue,
    proposedValue,
    status: "open",
  };
  const next: AppState = { ...state, corrections: [row, ...state.corrections] };
  return { state: audit(next, "create", "Person", personId, `Correction on ${field}`) };
}

export function resolveCorrection(state: AppState, id: string, status: "accepted" | "rejected"): CommandResult {
  const found = state.corrections.find((row) => row.id === id);
  if (!found) return { state };
  let people = state.people;
  if (status === "accepted") {
    people = people.map((person) => {
      if (person.id !== found.personId) return person;
      if (found.field in person) {
        return { ...person, [found.field]: found.proposedValue };
      }
      return person;
    });
  }
  const next: AppState = {
    ...state,
    people,
    corrections: state.corrections.map((row) => (row.id === id ? { ...row, status } : row)),
  };
  return { state: audit(next, status === "accepted" ? "update" : "reject", "Person", found.personId, `${status} correction ${found.field}`) };
}

export function addCv(state: AppState, cv: Omit<CurriculumVitae, "id" | "tenantId">): CommandResult<{ cvId: string }> {
  const cvId = nid("cv");
  const next: AppState = {
    ...state,
    cvs: [{ ...cv, id: cvId, tenantId: TENANT_ID }, ...state.cvs],
  };
  return { state: audit(next, "create", "CurriculumVitae", cvId, `Uploaded ${cv.fileName}`), cvId };
}

export function decideCvField(
  state: AppState,
  cvId: string,
  key: string,
  decision: FieldDecision,
  editedValue?: string,
): CommandResult {
  const next: AppState = {
    ...state,
    cvs: state.cvs.map((cv) =>
      cv.id === cvId
        ? {
            ...cv,
            state: cv.state === "uploaded" || cv.state === "parsed" ? "in-review" : cv.state,
            fields: cv.fields.map((field) =>
              field.key === key ? { ...field, decision, editedValue: editedValue ?? field.editedValue } : field,
            ),
          }
        : cv,
    ),
  };
  return { state: audit(next, "update", "CurriculumVitae", cvId, `${decision} ${key}`) };
}

export function applyCv(state: AppState, cvId: string, mode: ApplyCvMode): CommandResult<{ personId: string | null }> {
  const cv = state.cvs.find((row) => row.id === cvId);
  if (!cv) return { state, personId: null };
  const accepted = cv.fields.filter((field) => field.decision === "accepted" || field.decision === "edited");
  const get = (key: string) => {
    const field = accepted.find((row) => row.key === key);
    return field ? fieldValue(field) : "";
  };
  const educations = parseEducationRows(get("education"));
  const experiences = parseExperienceRows(get("experience"));
  const certificationRows = parseCertificationRows(get("certifications"));
  const skillRows = parseSkillRows(get("skills"));
  const skills = skillNamesFromRows(skillRows);
  const linkedIn = get("linkedin");
  let people = state.people;
  let employments = state.employments;
  const personId = mode.type === "existing" ? mode.personId : nid("person");
  if (mode.type === "new-hire") {
    const person: Person = {
      id: personId,
      tenantId: TENANT_ID,
      legalName: get("name") || cv.fileName,
      preferredName: get("name") || cv.fileName,
      email: get("email"),
      phone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      skills,
      educationNotes: "",
      experienceNotes: "",
      certifications: "",
      educations,
      experiences,
      certificationRows,
      skillRows,
      linkedIn: linkedIn || undefined,
    };
    people = [...people, person];
    employments = [
      ...employments,
      {
        id: nid("emp"),
        tenantId: TENANT_ID,
        personId,
        joinDate: todayIso(),
        endDate: null,
        status: "draft-hire",
        contractType: "permanent",
      },
    ];
  } else {
    people = people.map((person) => {
      if (person.id !== personId) return person;
      return mergeEvidenceOntoPerson(person, {
        educations,
        experiences,
        certificationRows,
        skillRows,
        linkedIn,
      });
    });
  }
  const next: AppState = {
    ...state,
    people,
    employments,
    cvs: state.cvs.map((row) => (row.id === cvId ? { ...row, state: "applied", personId } : row)),
  };
  return {
    state: audit(next, "update", "CurriculumVitae", cvId, mode.type === "new-hire" ? `Applied as new Person ${personId}` : `Merged into ${personId}`),
    personId,
  };
}

export function rejectCv(state: AppState, cvId: string): CommandResult {
  const next: AppState = {
    ...state,
    cvs: state.cvs.map((row) => (row.id === cvId ? { ...row, state: "rejected" } : row)),
  };
  return { state: audit(next, "reject", "CurriculumVitae", cvId, "Rejected CV") };
}

export function openKpiCycle(state: AppState, cycleId: string): CommandResult {
  const next: AppState = {
    ...state,
    cycles: state.cycles.map((row) =>
      row.id === cycleId ? { ...row, status: "open" } : row.status === "open" ? { ...row, status: "closed" } : row,
    ),
  };
  return { state: audit(next, "update", "KpiCycle", cycleId, "Opened cycle") };
}

export function setCycleCadence(state: AppState, cycleId: string, checkInCadence: CheckInCadence): CommandResult {
  const next: AppState = {
    ...state,
    cycles: state.cycles.map((row) => (row.id === cycleId ? { ...row, checkInCadence } : row)),
  };
  return { state: audit(next, "update", "KpiCycle", cycleId, `Default CheckInCadence ${checkInCadence}`) };
}

export function closeCycle(state: AppState, cycleId: string): CommandResult {
  const sets = state.kpiSets.map((row) => {
    if (row.cycleId !== cycleId || row.status === "scored") return row;
    const items = itemsForSet(state, row.id);
    let score = 0;
    for (const item of items) {
      const actual = displayedActual(state, item);
      const ratio = actual === null || item.target === 0 ? 0 : Math.min(actual / item.target, 1.2);
      score += (item.weight / 100) * ratio * 100;
    }
    return { ...row, status: "scored" as const, score: Math.round(score * 10) / 10 };
  });
  const next: AppState = {
    ...state,
    kpiSets: sets,
    cycles: state.cycles.map((row) => (row.id === cycleId ? { ...row, status: "closed" } : row)),
  };
  return { state: audit(next, "update", "KpiCycle", cycleId, "Closed cycle and stored KpiScore") };
}

export function createMissingKpiSets(state: AppState, cycleId: string): CommandResult<{ created: number }> {
  const current = state.assignments.filter((row) => row.endDate === null);
  const missing = current.filter(
    (assignment) => !state.kpiSets.some((row) => row.assignmentId === assignment.id && row.cycleId === cycleId),
  );
  if (missing.length === 0) return { state, created: 0 };
  const next: AppState = {
    ...state,
    kpiSets: [
      ...state.kpiSets,
      ...missing.map((assignment) => ({
        id: nid("set"),
        tenantId: TENANT_ID,
        assignmentId: assignment.id,
        cycleId,
        status: "draft" as const,
      })),
    ],
  };
  return { state: audit(next, "create", "KpiSet", cycleId, `Drafted ${missing.length} KpiSets`), created: missing.length };
}

function normalizeCascadeFields(
  state: AppState,
  kpiSetId: string,
  item: Omit<KpiItem, "tenantId" | "id"> & { id?: string },
  existing?: KpiItem,
): Pick<KpiItem, "cascadeMode" | "directMix"> {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  const locked =
    kpiSet &&
    (kpiSet.status === "active" || kpiSet.status === "agreed" || kpiSet.status === "scored") &&
    existing &&
    !isHrLike(state.currentRole);
  if (locked) {
    return {
      cascadeMode: existing.cascadeMode ?? "indirect",
      directMix: existing.directMix,
    };
  }
  return {
    cascadeMode: item.cascadeMode ?? "indirect",
    directMix: item.directMix,
  };
}

export function upsertKpiItem(
  state: AppState,
  item: Omit<KpiItem, "tenantId" | "id"> & { id?: string },
): CommandResult<{ error: string | null }> {
  const id = item.id ?? nid("ki");
  const exists = state.kpiItems.some((row) => row.id === id);
  const existing = state.kpiItems.find((row) => row.id === id);
  const parentKpiItemId = normalizeKpiItemParent(state, item.kpiSetId, item, existing);
  const cascadeFields = normalizeCascadeFields(state, item.kpiSetId, item, existing);
  const row: KpiItem = {
    ...item,
    id,
    tenantId: TENANT_ID,
    parentKpiItemId,
    ...cascadeFields,
  };
  const directError = validateDirectCascade(state, row);
  if (directError) {
    return { state, error: directError };
  }
  const next: AppState = {
    ...state,
    kpiItems: exists ? state.kpiItems.map((entry) => (entry.id === id ? row : entry)) : [...state.kpiItems, row],
  };
  return { state: audit(next, exists ? "update" : "create", "KpiItem", id, row.name), error: null };
}

export function removeKpiItem(state: AppState, id: string): CommandResult {
  const next: AppState = { ...state, kpiItems: state.kpiItems.filter((row) => row.id !== id) };
  return { state: audit(next, "delete", "KpiItem", id, "Removed KpiItem") };
}

export function submitKpiSet(state: AppState, kpiSetId: string): CommandResult<{ error: string | null }> {
  const items = itemsForSet(state, kpiSetId);
  const sum = weightSum(items);
  if (items.length === 0 || sum !== 100) {
    return { state, error: `Weights must sum to 100% (now ${sum}%)` };
  }
  const parentError = validateParents(state, kpiSetId);
  if (parentError) {
    return { state, error: parentError };
  }
  const directError = validateAllDirectInSet(state, kpiSetId);
  if (directError) {
    return { state, error: directError };
  }
  const next: AppState = {
    ...state,
    kpiSets: state.kpiSets.map((row) =>
      row.id === kpiSetId ? { ...row, status: "draft", readyForAgreement: true, returnComment: undefined } : row,
    ),
  };
  return { state: audit(next, "update", "KpiSet", kpiSetId, "Submitted draft for agreement"), error: null };
}

export function agreeKpiSet(state: AppState, kpiSetId: string): CommandResult<{ error: string | null }> {
  const parentError = validateParents(state, kpiSetId);
  if (parentError) {
    return { state, error: parentError };
  }
  const directError = validateAllDirectInSet(state, kpiSetId);
  if (directError) {
    return { state, error: directError };
  }
  const next: AppState = {
    ...state,
    kpiSets: state.kpiSets.map((row) => (row.id === kpiSetId ? { ...row, status: "active", returnComment: undefined } : row)),
  };
  return { state: audit(next, "update", "KpiSet", kpiSetId, "Agreed; set is active"), error: null };
}

export function returnKpiSet(state: AppState, kpiSetId: string, comment: string): CommandResult {
  const next: AppState = {
    ...state,
    kpiSets: state.kpiSets.map((row) => (row.id === kpiSetId ? { ...row, status: "returned", returnComment: comment } : row)),
  };
  return { state: audit(next, "update", "KpiSet", kpiSetId, `Returned: ${comment}`) };
}

export function addCheckIn(state: AppState, kpiItemId: string, actual: number, note: string): CommandResult {
  const item = state.kpiItems.find((row) => row.id === kpiItemId);
  if (!item) return { state };
  const kpiSet = state.kpiSets.find((row) => row.id === item.kpiSetId);
  if (!kpiSet) return { state };
  const cycle = state.cycles.find((row) => row.id === kpiSet.cycleId);
  if (!cycle) return { state };
  if (blocksOwnCheckIn(state, item)) {
    return { state };
  }
  const id = nid("ci");
  const date = todayIso();
  const cadence = effectiveCadence(cycle, item);
  const window = windowFor(date, cadence);
  const next: AppState = {
    ...state,
    checkIns: [...state.checkIns, { id, tenantId: TENANT_ID, kpiItemId, date, window, actual, note }],
  };
  return { state: audit(next, "create", "CheckIn", id, `Actual ${actual} (${window})`) };
}
