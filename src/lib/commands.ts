import { normalizeLoginEmail } from "./auth-policy";
import { dateInWindow, effectiveCadence, isFutureWindow, windowFor } from "./cadence";
import { normalizeKpiItemParent, validateParents } from "./cascade";
import { blocksOwnCheckIn, displayedActual, validateAllDirectInSet, validateDirectCascade } from "./direct";
import { fieldValue, isHrLike, itemsForSet, nid, todayIso, weightSum } from "./domain";
import {
  activeKpiYear,
  adminIsRemainingApproverForKpiSet,
  adminIsRemainingPortfolioApprover,
  allPriorYearsClosed,
  canAgreeOrReturnCheckIn,
  canAgreeOrReturnKpiPortfolio,
  canDraftKpiPortfolio,
  checkInById,
  effectiveCheckInStatus,
  hasAdminGrant,
  isCheckInDualApproved,
  isLineManagerForKpiSet,
  isPortfolioDualApproved,
  normalizeKpiYearPhase,
  personIdForCheckIn,
  personIdForKpiSet,
} from "./domain-query";
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
  CheckInRecord,
  KpiCycle,
  KpiItem,
  KpiSet,
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

  const loginEmail = normalizeLoginEmail(person.email);
  if (wasDraft && loginEmail && !next.users.some((row) => row.personId === personId)) {
    const userId = nid("user");
    next = {
      ...next,
      users: [
        ...next.users,
        {
          id: userId,
          tenantId: TENANT_ID,
          personId,
          email: loginEmail,
          role: "employee",
          mustSetPassword: true,
          adminGrant: false,
          authEpoch: 0,
        },
      ],
    };
    next = audit(next, "create", "User", userId, `Invited User ${loginEmail}`);
  }

  return { state: audit(next, "update", "Employment", personId, "Confirmed hire") };
}

export function setLoginEmail(
  state: AppState,
  personId: string,
  email: string,
): CommandResult<{ error?: string }> {
  if (state.currentRole !== "hr") return { state, error: "HR sets the login email." };
  const loginEmail = normalizeLoginEmail(email);
  if (!loginEmail) return { state, error: "Login email must end with @kmplus.co.id." };
  if (state.users.some((row) => row.personId !== personId && row.email.toLowerCase() === loginEmail)) {
    return { state, error: "That login email is already used." };
  }
  const person = state.people.find((row) => row.id === personId);
  if (!person) return { state, error: "Person not found." };

  const existing = state.users.find((row) => row.personId === personId);
  if (!existing) {
    const userId = nid("user");
    const withUser: AppState = {
      ...state,
      users: [
        ...state.users,
        {
          id: userId,
          tenantId: TENANT_ID,
          personId,
          email: loginEmail,
          role: "employee",
          mustSetPassword: true,
          adminGrant: false,
          authEpoch: 0,
        },
      ],
    };
    return { state: audit(withUser, "create", "User", userId, `Invited User ${loginEmail}`) };
  }
  if (existing.email.toLowerCase() === loginEmail) return { state };
  const next: AppState = {
    ...state,
    users: state.users.map((row) =>
      row.personId === personId
        ? { ...row, email: loginEmail, mustSetPassword: true, authEpoch: row.authEpoch + 1 }
        : row,
    ),
  };
  return { state: audit(next, "update", "User", existing.id, `Changed login email to ${loginEmail}`) };
}

function draftPortfolioForActiveYear(state: AppState, assignmentId: string): AppState {
  const year = activeKpiYear(state);
  if (!year) return state;
  const phase = normalizeKpiYearPhase(year);
  if (phase !== "planning" && phase !== "monitoring") return state;
  if (state.kpiSets.some((row) => row.assignmentId === assignmentId && row.cycleId === year.id)) {
    return state;
  }
  return {
    ...state,
    kpiSets: [
      ...state.kpiSets,
      {
        id: nid("set"),
        tenantId: TENANT_ID,
        assignmentId,
        cycleId: year.id,
        status: "draft",
      },
    ],
  };
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
  let next: AppState = {
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
  next = draftPortfolioForActiveYear(next, assignmentId);
  return { state: audit(next, "create", "Assignment", assignmentId, `Assigned to ${positionId}`) };
}

/** Second (or further) current Assignment. Does not end existing seats. */
export function addAssignment(state: AppState, personId: string, positionId: string, startDate: string): CommandResult {
  const occupied = state.assignments.find((row) => row.positionId === positionId && row.endDate === null);
  if (occupied) {
    return { state };
  }
  const alreadyHolds = state.assignments.some(
    (row) => row.personId === personId && row.positionId === positionId && row.endDate === null,
  );
  if (alreadyHolds) return { state };

  const assignmentId = nid("asg");
  let next: AppState = {
    ...state,
    assignments: [
      ...state.assignments,
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
  next = draftPortfolioForActiveYear(next, assignmentId);
  return { state: audit(next, "create", "Assignment", assignmentId, `Added Assignment on ${positionId}`) };
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

function kpiAdminDenied(state: AppState): string | null {
  if (!hasAdminGrant(state)) return "KPI Admin requires the Admin grant";
  return null;
}

function syncKpiYearStatus(cycle: KpiCycle): KpiCycle {
  const phase = normalizeKpiYearPhase(cycle);
  let status = cycle.status;
  if (phase === "closed") status = "closed";
  else if (phase === "planning" || phase === "monitoring") status = "open";
  else status = "draft";
  return { ...cycle, phase, status };
}

function patchKpiYear(state: AppState, cycleId: string, patch: Partial<KpiCycle>): AppState {
  return {
    ...state,
    cycles: state.cycles.map((row) => (row.id === cycleId ? syncKpiYearStatus({ ...row, ...patch }) : row)),
  };
}

function findKpiYear(state: AppState, cycleId: string) {
  return state.cycles.find((row) => row.id === cycleId);
}

function closedYearErrorForSet(state: AppState, kpiSetId: string): string | null {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet) return null;
  const cycle = findKpiYear(state, kpiSet.cycleId);
  if (!cycle) return null;
  if (normalizeKpiYearPhase(cycle) === "closed") return "KPI year is closed";
  return null;
}

export function startKpiPlanning(state: AppState, cycleId: string): CommandResult<{ error: string | null }> {
  const denied = kpiAdminDenied(state);
  if (denied) return { state, error: denied };

  const cycle = findKpiYear(state, cycleId);
  if (!cycle) return { state, error: "KPI year not found" };

  const phase = normalizeKpiYearPhase(cycle);
  if (phase === "closed") return { state, error: "KPI year is closed" };
  if (phase === "planning" || phase === "monitoring") return { state, error: "KPI year is already active" };
  const otherActive = activeKpiYear(state);
  if (otherActive && otherActive.id !== cycleId) {
    return { state, error: "At most one KPI year may be in planning or monitoring" };
  }
  if (!allPriorYearsClosed(state, cycle.year)) {
    return { state, error: "Close earlier KPI years before starting planning" };
  }

  const next = patchKpiYear(state, cycleId, { phase: "planning" });
  return {
    state: audit(next, "update", "KpiYear", cycleId, "Started planning"),
    error: null,
  };
}

export function startKpiMonitoring(state: AppState, cycleId: string): CommandResult<{ error: string | null }> {
  const denied = kpiAdminDenied(state);
  if (denied) return { state, error: denied };

  const cycle = findKpiYear(state, cycleId);
  if (!cycle) return { state, error: "KPI year not found" };

  const phase = normalizeKpiYearPhase(cycle);
  if (phase === "closed") return { state, error: "KPI year is closed" };
  if (phase === "monitoring") return { state, error: "KPI year is already in monitoring" };
  if (phase !== "planning") return { state, error: "Start planning before monitoring" };

  const next = patchKpiYear(state, cycleId, { phase: "monitoring" });
  return {
    state: audit(next, "update", "KpiYear", cycleId, "Started monitoring"),
    error: null,
  };
}

export function openKpiAdjustmentWindow(state: AppState, cycleId: string): CommandResult<{ error: string | null }> {
  const denied = kpiAdminDenied(state);
  if (denied) return { state, error: denied };

  const cycle = findKpiYear(state, cycleId);
  if (!cycle) return { state, error: "KPI year not found" };

  const phase = normalizeKpiYearPhase(cycle);
  if (phase !== "monitoring") {
    return { state, error: "The adjustment window is only available during monitoring" };
  }
  if (cycle.adjustmentOpen) {
    return { state, error: "The adjustment window is already open" };
  }

  const next = patchKpiYear(state, cycleId, { adjustmentOpen: true });
  return {
    state: audit(next, "update", "KpiYear", cycleId, "Opened the adjustment window"),
    error: null,
  };
}

export function closeKpiAdjustmentWindow(state: AppState, cycleId: string): CommandResult<{ error: string | null }> {
  const denied = kpiAdminDenied(state);
  if (denied) return { state, error: denied };

  const cycle = findKpiYear(state, cycleId);
  if (!cycle) return { state, error: "KPI year not found" };

  const phase = normalizeKpiYearPhase(cycle);
  if (phase !== "monitoring") {
    return { state, error: "The adjustment window is only available during monitoring" };
  }
  if (!cycle.adjustmentOpen) {
    return { state, error: "The adjustment window is not open" };
  }

  const next = patchKpiYear(state, cycleId, { adjustmentOpen: false });
  return {
    state: audit(next, "update", "KpiYear", cycleId, "Closed the adjustment window"),
    error: null,
  };
}

function approvedPortfolioEditBlocked(state: AppState, kpiSetId: string): string | null {
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet || kpiSet.status !== "approved") return null;
  const cycle = findKpiYear(state, kpiSet.cycleId);
  if (!cycle || cycle.adjustmentOpen) return null;
  return "Open the adjustment window to change a KPI portfolio that is already approved";
}

export function setKpiYearCheckInFrequency(
  state: AppState,
  cycleId: string,
  checkInCadence: CheckInCadence,
): CommandResult<{ error: string | null }> {
  const denied = kpiAdminDenied(state);
  if (denied) return { state, error: denied };
  if (checkInCadence !== "monthly" && checkInCadence !== "quarterly") {
    return { state, error: "Check-in frequency must be monthly or quarterly" };
  }

  const cycle = findKpiYear(state, cycleId);
  if (!cycle) return { state, error: "KPI year not found" };

  const phase = normalizeKpiYearPhase(cycle);
  if (phase === "closed") return { state, error: "KPI year is closed" };
  if (phase !== "planning" && phase !== "monitoring") {
    return { state, error: "Start planning before setting the check-in frequency" };
  }

  const next = patchKpiYear(state, cycleId, { checkInCadence });
  return {
    state: audit(next, "update", "KpiYear", cycleId, `Default check-in frequency ${checkInCadence}`),
    error: null,
  };
}

export function setKpiPlanningEndDate(
  state: AppState,
  cycleId: string,
  planningEndsOn: string,
): CommandResult<{ error: string | null }> {
  const denied = kpiAdminDenied(state);
  if (denied) return { state, error: denied };

  const cycle = findKpiYear(state, cycleId);
  if (!cycle) return { state, error: "KPI year not found" };

  const phase = normalizeKpiYearPhase(cycle);
  if (phase !== "planning") {
    return { state, error: "Set the planning end date while the KPI year is in planning" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planningEndsOn)) {
    return { state, error: "Planning end date must be a calendar date" };
  }

  const next = patchKpiYear(state, cycleId, { planningEndsOn });
  return {
    state: audit(next, "update", "KpiYear", cycleId, `Planning ends ${planningEndsOn}`),
    error: null,
  };
}

export function closeKpiYear(state: AppState, cycleId: string): CommandResult<{ error: string | null }> {
  const denied = kpiAdminDenied(state);
  if (denied) return { state, error: denied };

  const cycle = findKpiYear(state, cycleId);
  if (!cycle) return { state, error: "KPI year not found" };

  const phase = normalizeKpiYearPhase(cycle);
  if (phase === "closed") return { state, error: "KPI year is already closed" };
  if (phase !== "planning" && phase !== "monitoring") {
    return { state, error: "Only an active KPI year may be closed" };
  }

  const sets = state.kpiSets.map((row) => {
    if (row.cycleId !== cycleId || row.status === "scored") return row;
    if (!isPortfolioDualApproved(state, row.id)) {
      return { ...row, score: undefined };
    }
    const items = itemsForSet(state, row.id);
    let score = 0;
    for (const item of items) {
      const actual = displayedActual(state, item);
      const ratio = actual === null || item.target === 0 ? 0 : Math.min(actual / item.target, 1.2);
      score += (item.weight / 100) * ratio * 100;
    }
    return { ...row, status: "scored" as const, score: Math.round(score * 10) / 10 };
  });
  const next = patchKpiYear({ ...state, kpiSets: sets }, cycleId, { phase: "closed", adjustmentOpen: false });
  return {
    state: audit(next, "update", "KpiYear", cycleId, "Closed the KPI year"),
    error: null,
  };
}

/** @deprecated use startKpiPlanning / startKpiMonitoring */
export function openKpiCycle(state: AppState, cycleId: string): CommandResult {
  const planning = startKpiPlanning(state, cycleId);
  if (planning.error && planning.error.includes("already active")) {
    return startKpiMonitoring(state, cycleId);
  }
  return planning.error ? planning : startKpiMonitoring(planning.state, cycleId);
}

/** @deprecated use setKpiYearCheckInFrequency */
export function setCycleCadence(state: AppState, cycleId: string, checkInCadence: CheckInCadence): CommandResult {
  return setKpiYearCheckInFrequency(state, cycleId, checkInCadence);
}

/** @deprecated use closeKpiYear */
export function closeCycle(state: AppState, cycleId: string): CommandResult {
  return closeKpiYear(state, cycleId);
}

function adminGrantDenied(state: AppState): string | null {
  if (hasAdminGrant(state) || state.currentRole === "hr") return null;
  return "Grant or revoke Admin requires HR or an existing Admin grant";
}

export function grantAdmin(state: AppState, personId: string): CommandResult<{ error: string | null }> {
  const denied = adminGrantDenied(state);
  if (denied) return { state, error: denied };
  const user = state.users.find((row) => row.personId === personId);
  if (!user) return { state, error: "User not found" };
  if (user.adminGrant) return { state, error: null };
  const next: AppState = {
    ...state,
    users: state.users.map((row) => (row.personId === personId ? { ...row, adminGrant: true } : row)),
  };
  return { state: audit(next, "update", "User", user.id, "Granted Admin"), error: null };
}

export function revokeAdmin(state: AppState, personId: string): CommandResult<{ error: string | null }> {
  const denied = adminGrantDenied(state);
  if (denied) return { state, error: denied };
  const user = state.users.find((row) => row.personId === personId);
  if (!user) return { state, error: "User not found" };
  if (!user.adminGrant) return { state, error: null };
  const next: AppState = {
    ...state,
    users: state.users.map((row) => (row.personId === personId ? { ...row, adminGrant: false } : row)),
  };
  return { state: audit(next, "update", "User", user.id, "Revoked Admin"), error: null };
}

export function createMissingKpiSets(state: AppState, cycleId: string): CommandResult<{ created: number; error?: string }> {
  const denied = kpiAdminDenied(state);
  if (denied) return { state, created: 0, error: denied };

  const cycle = findKpiYear(state, cycleId);
  if (!cycle) return { state, created: 0, error: "KPI year not found" };
  const phase = normalizeKpiYearPhase(cycle);
  if (phase !== "planning" && phase !== "monitoring") {
    return { state, created: 0, error: "Start planning before drafting KPI portfolios" };
  }
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
  return { state: audit(next, "create", "KpiSet", cycleId, `Drafted ${missing.length} KPI portfolios`), created: missing.length };
}

function portfolioIsLocked(kpiSet: KpiSet): boolean {
  return kpiSet.status === "approved" || kpiSet.status === "scored";
}

function clearPortfolioStamps(kpiSet: KpiSet): KpiSet {
  return {
    ...kpiSet,
    lineManagerApprovedBy: undefined,
    adminApprovedBy: undefined,
    readyForAgreement: undefined,
  };
}

function applyPortfolioModification(state: AppState, kpiSetId: string): AppState {
  return {
    ...state,
    kpiSets: state.kpiSets.map((row) => {
      if (row.id !== kpiSetId) return row;
      if (!row.lineManagerApprovedBy && !row.adminApprovedBy && row.status !== "approved") return row;
      const cleared = clearPortfolioStamps(row);
      if (row.status === "approved" || row.status === "pending") {
        return { ...cleared, status: "pending" };
      }
      return cleared;
    }),
  };
}

function resolvePortfolioAgreeStamp(state: AppState, kpiSetId: string): "lineManager" | "admin" | null {
  const ownerId = personIdForKpiSet(state, kpiSetId);
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!ownerId || !kpiSet) return null;
  const actor = state.currentPersonId;
  const vacantRoot = adminIsRemainingApproverForKpiSet(state, kpiSetId);
  const canStampAsLm =
    !vacantRoot &&
    ownerId !== actor &&
    isLineManagerForKpiSet(state, kpiSetId, actor) &&
    !kpiSet.lineManagerApprovedBy;
  if (canStampAsLm) return "lineManager";
  if (hasAdminGrant(state, actor) && !kpiSet.adminApprovedBy) return "admin";
  return null;
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
    portfolioIsLocked(kpiSet) &&
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
  const closed = closedYearErrorForSet(state, item.kpiSetId);
  if (closed) return { state, error: closed };
  const adjustmentBlocked = approvedPortfolioEditBlocked(state, item.kpiSetId);
  if (adjustmentBlocked) return { state, error: adjustmentBlocked };
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
  let next: AppState = {
    ...state,
    kpiItems: exists ? state.kpiItems.map((entry) => (entry.id === id ? row : entry)) : [...state.kpiItems, row],
  };
  next = applyPortfolioModification(next, item.kpiSetId);
  return { state: audit(next, exists ? "update" : "create", "KpiItem", id, row.name), error: null };
}

export function removeKpiItem(state: AppState, id: string): CommandResult<{ error: string | null }> {
  const item = state.kpiItems.find((row) => row.id === id);
  if (item) {
    const closed = closedYearErrorForSet(state, item.kpiSetId);
    if (closed) return { state, error: closed };
    const adjustmentBlocked = approvedPortfolioEditBlocked(state, item.kpiSetId);
    if (adjustmentBlocked) return { state, error: adjustmentBlocked };
    if (!canDraftKpiPortfolio(state, item.kpiSetId)) {
      return { state, error: "Only the person, their line manager, or an admin may draft this KPI portfolio" };
    }
  }
  let next: AppState = { ...state, kpiItems: state.kpiItems.filter((row) => row.id !== id) };
  if (item) next = applyPortfolioModification(next, item.kpiSetId);
  return { state: audit(next, "delete", "KpiItem", id, "Removed KPI"), error: null };
}

export function submitKpiSet(state: AppState, kpiSetId: string): CommandResult<{ error: string | null }> {
  const closed = closedYearErrorForSet(state, kpiSetId);
  if (closed) return { state, error: closed };
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
      row.id === kpiSetId
        ? clearPortfolioStamps({ ...row, status: "pending", returnComment: undefined })
        : row,
    ),
  };
  return { state: audit(next, "update", "KpiSet", kpiSetId, "Submitted KPI portfolio for approval"), error: null };
}

export function agreeKpiSet(state: AppState, kpiSetId: string): CommandResult<{ error: string | null }> {
  const closed = closedYearErrorForSet(state, kpiSetId);
  if (closed) return { state, error: closed };
  if (!canAgreeOrReturnKpiPortfolio(state, kpiSetId)) {
    return { state, error: "Only the line manager or an admin may agree this KPI portfolio" };
  }
  const kpiSet = state.kpiSets.find((row) => row.id === kpiSetId);
  if (!kpiSet) return { state, error: "KPI portfolio not found" };
  if (kpiSet.status !== "pending") {
    return { state, error: "Only a pending KPI Portfolio can be approved" };
  }
  const ownerId = personIdForKpiSet(state, kpiSetId);
  const stamp = resolvePortfolioAgreeStamp(state, kpiSetId);
  if (!stamp) {
    if (ownerId === state.currentPersonId && !adminIsRemainingApproverForKpiSet(state, kpiSetId)) {
      return { state, error: "Line manager approval must come from a different person" };
    }
    return { state, error: "No further approval is available for you on this KPI Portfolio" };
  }
  const parentError = validateParents(state, kpiSetId);
  if (parentError) {
    return { state, error: parentError };
  }
  const directError = validateAllDirectInSet(state, kpiSetId);
  if (directError) {
    return { state, error: directError };
  }
  const stamped: KpiSet = {
    ...kpiSet,
    returnComment: undefined,
    lineManagerApprovedBy: stamp === "lineManager" ? state.currentPersonId : kpiSet.lineManagerApprovedBy,
    adminApprovedBy: stamp === "admin" ? state.currentPersonId : kpiSet.adminApprovedBy,
  };
  const dual = isPortfolioDualApproved(
    { ...state, kpiSets: state.kpiSets.map((row) => (row.id === kpiSetId ? stamped : row)) },
    kpiSetId,
  );
  const nextSet: KpiSet = { ...stamped, status: dual ? "approved" : "pending" };
  const next: AppState = {
    ...state,
    kpiSets: state.kpiSets.map((row) => (row.id === kpiSetId ? nextSet : row)),
  };
  const label = stamp === "lineManager" ? "Line manager" : "Admin";
  return {
    state: audit(next, "update", "KpiSet", kpiSetId, `${label} approved KPI portfolio`),
    error: null,
  };
}

export function returnKpiSet(state: AppState, kpiSetId: string, comment: string): CommandResult<{ error: string | null }> {
  const closed = closedYearErrorForSet(state, kpiSetId);
  if (closed) return { state, error: closed };
  if (!canAgreeOrReturnKpiPortfolio(state, kpiSetId)) {
    return { state, error: "Only the line manager or an admin may return this KPI portfolio" };
  }
  const next: AppState = {
    ...state,
    kpiSets: state.kpiSets.map((row) =>
      row.id === kpiSetId
        ? clearPortfolioStamps({ ...row, status: "returned", returnComment: comment })
        : row,
    ),
  };
  return { state: audit(next, "update", "KpiSet", kpiSetId, `Returned: ${comment}`), error: null };
}

function clearCheckInStamps(checkIn: CheckInRecord): CheckInRecord {
  return {
    ...checkIn,
    lineManagerApprovedBy: undefined,
    adminApprovedBy: undefined,
    returnComment: undefined,
  };
}

function resolveCheckInAgreeStamp(state: AppState, checkInId: string): "lineManager" | "admin" | null {
  const ownerId = personIdForCheckIn(state, checkInId);
  const checkIn = checkInById(state, checkInId);
  if (!ownerId || !checkIn) return null;
  const actor = state.currentPersonId;
  const item = state.kpiItems.find((row) => row.id === checkIn.kpiItemId);
  const vacantRoot = item ? adminIsRemainingApproverForKpiSet(state, item.kpiSetId) : true;
  const canStampAsLm =
    !vacantRoot &&
    ownerId !== actor &&
    Boolean(item && isLineManagerForKpiSet(state, item.kpiSetId, actor)) &&
    !checkIn.lineManagerApprovedBy;
  if (canStampAsLm) return "lineManager";
  if (hasAdminGrant(state, actor) && !checkIn.adminApprovedBy) return "admin";
  return null;
}

function approvedCheckInExistsForWindow(state: AppState, kpiItemId: string, window: string): boolean {
  return state.checkIns.some(
    (row) =>
      row.kpiItemId === kpiItemId &&
      row.window === window &&
      (effectiveCheckInStatus(row) === "approved" || isCheckInDualApproved(state, row.id)),
  );
}

function blockingCheckInForWindow(state: AppState, kpiItemId: string, window: string): CheckInRecord | undefined {
  return state.checkIns.find(
    (row) =>
      row.kpiItemId === kpiItemId &&
      row.window === window &&
      effectiveCheckInStatus(row) !== "returned",
  );
}

export function addCheckIn(
  state: AppState,
  kpiItemId: string,
  actual: number,
  note: string,
  options?: { window?: string },
): CommandResult<{ error: string | null }> {
  const item = state.kpiItems.find((row) => row.id === kpiItemId);
  if (!item) return { state, error: "KPI not found" };
  const kpiSet = state.kpiSets.find((row) => row.id === item.kpiSetId);
  if (!kpiSet) return { state, error: "KPI portfolio not found" };
  const ownerId = personIdForKpiSet(state, kpiSet.id);
  if (!ownerId || ownerId !== state.currentPersonId) {
    return { state, error: "Only the person on this seat may submit a KPI check-in" };
  }
  const cycle = state.cycles.find((row) => row.id === kpiSet.cycleId);
  if (!cycle) return { state, error: "KPI year not found" };
  const phase = normalizeKpiYearPhase(cycle);
  if (phase === "closed") return { state, error: "KPI year is closed" };
  if (phase !== "monitoring") return { state, error: "A KPI check-in is only allowed during monitoring" };
  if (!isPortfolioDualApproved(state, kpiSet.id)) {
    return { state, error: "A KPI check-in requires a KPI portfolio that both approvers have agreed" };
  }
  if (blocksOwnCheckIn(state, item)) {
    return { state, error: "A KPI check-in is blocked for this KPI" };
  }
  const cadence = effectiveCadence(cycle, item);
  const currentWindow = windowFor(todayIso(), cadence);
  const window = options?.window ?? currentWindow;
  if (!window.startsWith(String(cycle.year))) {
    return { state, error: "This check-in window must belong to this KPI year" };
  }
  if (isFutureWindow(window, currentWindow)) {
    return { state, error: "Future check-in windows are not allowed" };
  }
  if (approvedCheckInExistsForWindow(state, kpiItemId, window)) {
    return { state, error: "An approved KPI check-in already exists for this window" };
  }
  const existing = blockingCheckInForWindow(state, kpiItemId, window);
  if (existing) {
    return { state, error: "A KPI check-in is already pending for this window" };
  }
  const id = nid("ci");
  const date = options?.window ? dateInWindow(window) : todayIso();
  const row: CheckInRecord = {
    id,
    tenantId: TENANT_ID,
    kpiItemId,
    date,
    window,
    actual,
    note,
    status: "pending",
  };
  const next: AppState = {
    ...state,
    checkIns: [...state.checkIns, row],
  };
  return { state: audit(next, "create", "CheckIn", id, `Actual ${actual} (${window})`), error: null };
}

export function updateCheckIn(
  state: AppState,
  checkInId: string,
  patch: { actual?: number; note?: string },
): CommandResult<{ error: string | null }> {
  const checkIn = checkInById(state, checkInId);
  if (!checkIn) return { state, error: "KPI check-in not found" };
  const ownerId = personIdForCheckIn(state, checkInId);
  if (!ownerId || ownerId !== state.currentPersonId) {
    return { state, error: "Only the person on this seat may edit a KPI check-in" };
  }
  const item = state.kpiItems.find((row) => row.id === checkIn.kpiItemId);
  if (!item) return { state, error: "KPI not found" };
  const kpiSet = state.kpiSets.find((row) => row.id === item.kpiSetId);
  if (!kpiSet) return { state, error: "KPI portfolio not found" };
  const cycle = state.cycles.find((row) => row.id === kpiSet.cycleId);
  if (!cycle) return { state, error: "KPI year not found" };
  const phase = normalizeKpiYearPhase(cycle);
  if (phase !== "monitoring") return { state, error: "A KPI check-in is only allowed during monitoring" };
  if (!isPortfolioDualApproved(state, kpiSet.id)) {
    return { state, error: "A KPI check-in requires a KPI portfolio that both approvers have agreed" };
  }
  const updated = clearCheckInStamps({
    ...checkIn,
    actual: patch.actual ?? checkIn.actual,
    note: patch.note ?? checkIn.note,
    status: "pending",
  });
  const next: AppState = {
    ...state,
    checkIns: state.checkIns.map((row) => (row.id === checkInId ? updated : row)),
  };
  return { state: audit(next, "update", "CheckIn", checkInId, "Updated KPI check-in"), error: null };
}

function closedYearErrorForCheckIn(state: AppState, checkInId: string): string | null {
  const checkIn = checkInById(state, checkInId);
  if (!checkIn) return null;
  const item = state.kpiItems.find((row) => row.id === checkIn.kpiItemId);
  if (!item) return null;
  return closedYearErrorForSet(state, item.kpiSetId);
}

export function agreeCheckIn(state: AppState, checkInId: string): CommandResult<{ error: string | null }> {
  const closed = closedYearErrorForCheckIn(state, checkInId);
  if (closed) return { state, error: closed };
  if (!canAgreeOrReturnCheckIn(state, checkInId)) {
    return { state, error: "Only the line manager or an admin may agree this KPI check-in" };
  }
  const checkIn = checkInById(state, checkInId);
  if (!checkIn) return { state, error: "KPI check-in not found" };
  if (effectiveCheckInStatus(checkIn) !== "pending") {
    return { state, error: "Only a pending KPI check-in can be approved" };
  }
  const ownerId = personIdForCheckIn(state, checkInId);
  const stamp = resolveCheckInAgreeStamp(state, checkInId);
  if (!stamp) {
    const item = checkIn ? state.kpiItems.find((row) => row.id === checkIn.kpiItemId) : undefined;
    if (ownerId === state.currentPersonId && item && !adminIsRemainingApproverForKpiSet(state, item.kpiSetId)) {
      return { state, error: "Line manager approval must come from a different person" };
    }
    return { state, error: "No further approval is available for you on this KPI check-in" };
  }
  const stamped: CheckInRecord = {
    ...checkIn,
    returnComment: undefined,
    lineManagerApprovedBy: stamp === "lineManager" ? state.currentPersonId : checkIn.lineManagerApprovedBy,
    adminApprovedBy: stamp === "admin" ? state.currentPersonId : checkIn.adminApprovedBy,
  };
  const dual = isCheckInDualApproved(
    { ...state, checkIns: state.checkIns.map((row) => (row.id === checkInId ? stamped : row)) },
    checkInId,
  );
  const nextRow: CheckInRecord = { ...stamped, status: dual ? "approved" : "pending" };
  const next: AppState = {
    ...state,
    checkIns: state.checkIns.map((row) => (row.id === checkInId ? nextRow : row)),
  };
  const label = stamp === "lineManager" ? "Line manager" : "Admin";
  return { state: audit(next, "update", "CheckIn", checkInId, `${label} approved KPI check-in`), error: null };
}

export function returnCheckIn(
  state: AppState,
  checkInId: string,
  comment: string,
): CommandResult<{ error: string | null }> {
  const closed = closedYearErrorForCheckIn(state, checkInId);
  if (closed) return { state, error: closed };
  if (!canAgreeOrReturnCheckIn(state, checkInId)) {
    return { state, error: "Only the line manager or an admin may return this KPI check-in" };
  }
  const checkIn = checkInById(state, checkInId);
  if (!checkIn) return { state, error: "KPI check-in not found" };
  const next: AppState = {
    ...state,
    checkIns: state.checkIns.map((row) => {
      if (row.id !== checkInId) return row;
      return { ...clearCheckInStamps(row), status: "returned", returnComment: comment };
    }),
  };
  return { state: audit(next, "update", "CheckIn", checkInId, `Returned: ${comment}`), error: null };
}
