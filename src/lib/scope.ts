import { canReadPerson, isHrLike } from "./domain";
import { hasAdminGrant, lineManagerReportPersonIds } from "./domain-query";
import type { AppState, Person, TenantUser } from "./types";

/**
 * What the signed-in User may read. `full` must already carry the session identity
 * (currentPersonId / currentRole), as the server sets it.
 *
 * Shared with every signed-in User: the org chart (units, grades, positions, assignments), KPI years and the
 * KPI tree (ADR-0001), projects and their staffing, and the configured lists. Each Person's name and work email
 * form a directory everyone sees; the rest of a profile (contact, emergency contact, CV-derived history) only
 * reaches that Person, their Line Manager chain, and HR. CVs, corrections, and the audit log are HR's; other
 * people's time entries and leave are the Admin grant's (company reports and leave decisions).
 */
export function scopeStateForViewer(full: AppState): AppState {
  const me = full.currentPersonId;
  const hr = isHrLike(full.currentRole);
  const admin = hasAdminGrant(full);
  const reports = new Set(lineManagerReportPersonIds(full, me));
  const canSeeProfile = (personId: string) => personId === me || hr || reports.has(personId) || canReadPerson(full, personId);

  const myBlockIds = new Set(full.timeBlocks.filter((row) => row.personId === me).map((row) => row.id));
  const myInvites = full.invites.filter((row) => row.personId === me);
  const invitedBlockIds = new Set(myInvites.map((row) => row.timeBlockId));

  return {
    ...full,
    people: full.people.map((person) => (canSeeProfile(person.id) ? person : directoryEntry(person))),
    employments: full.employments.filter((row) => canSeeProfile(row.personId)),
    users: hr || admin ? full.users : full.users.map((user) => (user.personId === me ? user : directoryUser(user))),
    cvs: hr ? full.cvs : full.cvs.filter((row) => row.personId === me),
    corrections: hr ? full.corrections : full.corrections.filter((row) => row.personId === me),
    audit: hr || admin ? full.audit : [],
    leaveRequests: admin ? full.leaveRequests : full.leaveRequests.filter((row) => row.personId === me),
    timeBlocks: admin
      ? full.timeBlocks
      : full.timeBlocks.filter((row) => row.personId === me || invitedBlockIds.has(row.id)),
    invites: admin
      ? full.invites
      : full.invites.filter((row) => row.personId === me || myBlockIds.has(row.timeBlockId)),
  };
}

function directoryEntry(person: Person): Person {
  return {
    id: person.id,
    tenantId: person.tenantId,
    legalName: person.legalName,
    preferredName: person.preferredName,
    email: person.email,
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    skills: [],
    educationNotes: "",
    experienceNotes: "",
    certifications: "",
    educations: [],
    experiences: [],
    certificationRows: [],
    skillRows: [],
  };
}

/** Other people's logins: who holds which role and grant, without their sign-in email or session counters. */
function directoryUser(user: TenantUser): TenantUser {
  return { ...user, email: "", mustSetPassword: false, authEpoch: 0 };
}
