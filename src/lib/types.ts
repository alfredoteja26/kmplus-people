export const TENANT_ID = "kmplus";

export type Role = "employee" | "manager" | "hr" | "admin";

export type WeekGridMode = "weekdays" | "full";

export type Person = {
  id: string;
  tenantId: string;
  legalName: string;
  preferredName: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  linkedIn?: string;
  skills: string[];
  educationNotes: string;
  experienceNotes: string;
  certifications: string;
  educations: EducationRecord[];
  experiences: ExperienceRecord[];
  certificationRows: CertificationRecord[];
  skillRows: SkillRecord[];
  /** Timesheet week grid; Saturday and Sunday hours still count when weekdays. */
  weekGrid?: WeekGridMode;
};

export type EducationRecord = {
  institution: string;
  credential: string;
  startDate: string;
  endDate: string;
  gpa?: string;
};

export type ExperienceRecord = {
  kind: "work" | "organization" | "volunteer";
  organization: string;
  title: string;
  startDate: string;
  endDate: string;
  narrative: string;
};

export type CertificationRecord = {
  issuer: string;
  name: string;
  date: string;
};

export type SkillRecord = {
  name: string;
  kind: "technical" | "language" | "personal";
};

export type EmploymentStatus = "active" | "resigned" | "draft-hire";
export type ContractType = "permanent" | "contract" | "intern";

export type Employment = {
  id: string;
  tenantId: string;
  personId: string;
  joinDate: string;
  endDate: string | null;
  status: EmploymentStatus;
  contractType: ContractType;
};

export type OrgUnit = {
  id: string;
  tenantId: string;
  name: string;
  parentId: string | null;
};

export type Grade = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
};

export type Position = {
  id: string;
  tenantId: string;
  title: string;
  gradeId: string;
  orgUnitId: string;
  reportsToPositionId: string | null;
};

export type Assignment = {
  id: string;
  tenantId: string;
  personId: string;
  positionId: string;
  startDate: string;
  endDate: string | null;
};

export type CvState = "uploaded" | "parsed" | "in-review" | "applied" | "rejected";
export type FieldDecision = "pending" | "accepted" | "edited" | "rejected";

export type CvProposedField = {
  key: string;
  label: string;
  value: string;
  decision: FieldDecision;
  editedValue?: string;
};

export type CurriculumVitae = {
  id: string;
  tenantId: string;
  personId: string | null;
  fileName: string;
  uploadedAt: string;
  state: CvState;
  extractedText: string;
  fields: CvProposedField[];
};

export type CorrectionRequest = {
  id: string;
  tenantId: string;
  personId: string;
  field: string;
  currentValue: string;
  proposedValue: string;
  status: "open" | "accepted" | "rejected";
};

export type KpiCycleStatus = "draft" | "open" | "closed";

export type KpiYearPhase = "planning" | "monitoring" | "closed";

export type CheckInFrequency = "monthly" | "quarterly";
export type CheckInCadence = CheckInFrequency;
export type CascadeMode = "direct" | "indirect";
export type DirectMix = "children-only" | "own-plus-children";

export type KpiCycle = {
  id: string;
  tenantId: string;
  name: string;
  year: number;
  /** Legacy persist field; kept in sync with `phase`. */
  status: KpiCycleStatus;
  phase: KpiYearPhase | null;
  /** Calendar date `YYYY-MM-DD`. Admin sets it during planning. Countdown only; monitoring does not start from this date. */
  planningEndsOn?: string | null;
  adjustmentOpen: boolean;
  checkInCadence: CheckInCadence;
  checkInWindows: { quarter: 1 | 2 | 3 | 4; open: boolean }[];
};

export type KpiSetStatus = "draft" | "pending" | "returned" | "approved" | "scored";

export type KpiSet = {
  id: string;
  tenantId: string;
  assignmentId: string;
  cycleId: string;
  status: KpiSetStatus;
  /** @deprecated Legacy persist flag; prefer status `pending`. */
  readyForAgreement?: boolean;
  lineManagerApprovedBy?: string;
  adminApprovedBy?: string;
  returnComment?: string;
  score?: number;
};

export type Polarity = "higher-better" | "lower-better";

export type KpiItem = {
  id: string;
  tenantId: string;
  kpiSetId: string;
  name: string;
  definition: string;
  target: number;
  unit: string;
  weight: number;
  polarity: Polarity;
  checkInCadence?: CheckInCadence;
  parentKpiItemId?: string | null;
  cascadeMode?: CascadeMode;
  directMix?: DirectMix;
};

export type CheckInStatus = "pending" | "approved" | "returned";

export type CheckInRecord = {
  id: string;
  tenantId: string;
  kpiItemId: string;
  date: string;
  window: string;
  actual: number;
  note: string;
  status?: CheckInStatus;
  lineManagerApprovedBy?: string;
  adminApprovedBy?: string;
  returnComment?: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actorRole: Role;
  actorPersonId: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
};

export type DemoUser = {
  role: Role;
  personId: string;
  label: string;
  adminGrant?: boolean;
};

export type TenantUser = {
  id: string;
  tenantId: string;
  personId: string;
  email: string;
  role: Role;
  adminGrant?: boolean;
  mustSetPassword: boolean;
  authEpoch: number;
};

export type Project = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  /** Blank for internal work such as KMPlus People. */
  clientName: string | null;
  startDate: string;
  endDate: string | null;
};

export type Staffing = {
  id: string;
  tenantId: string;
  personId: string;
  projectId: string;
  startDate: string;
  endDate: string | null;
  /** Whole percent from 1 to 100 on this row. */
  load: number;
};

export type WorkItem = {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  description: string;
  picPersonId: string;
  startDate: string;
  endDate: string;
};

export type DeliverableKind = "file" | "link";

export type DeliverableFileVersion = {
  id: string;
  storagePath: string;
  fileName: string;
  uploadedAt: string;
};

export type Deliverable = {
  id: string;
  tenantId: string;
  projectId: string;
  kind: DeliverableKind;
  name: string;
  statusId: string;
  categoryId: string;
  /** Link URL; overwritten on edit. Empty for file Deliverables. */
  url: string | null;
  /** File versions; empty for link Deliverables. */
  versions: DeliverableFileVersion[];
  workItemIds: string[];
};

export type DeliverableStatus = {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  /** Sticky Accepted identity for progress; rename does not clear this. */
  countsAsAccepted: boolean;
};

export type DeliverableCategory = {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
};

export type LeaveKind = "cuti" | "sick" | "remote";
export type LeaveSpanMode = "days" | "hours";
export type LeaveDecision = "unpaid" | "paid" | "refused";

export type LeaveRequest = {
  id: string;
  tenantId: string;
  personId: string;
  kind: LeaveKind;
  leaveTypeId: string | null;
  coverPersonId: string | null;
  doctorLetterPath: string | null;
  note: string;
  spanMode: LeaveSpanMode;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  decision: LeaveDecision | null;
  decidedByPersonId: string | null;
};

export type LeaveType = {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
};

export type PublicHolidayOrigin = "libur" | "bersama" | "internal";

export type PublicHoliday = {
  id: string;
  tenantId: string;
  date: string;
  name: string;
  origin: PublicHolidayOrigin;
  suppressed: boolean;
  nameLocked: boolean;
};

export type TimeBlockType = {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
  /** Sticky Meeting privilege; rename does not move invites to another type. */
  allowsInvites: boolean;
};

export type TimeBlock = {
  id: string;
  tenantId: string;
  personId: string;
  typeId: string;
  /** Asia/Jakarta wall clock as `YYYY-MM-DDTHH:mm`. */
  startAt: string;
  endAt: string;
  projectId: string | null;
  workItemId: string | null;
  title: string;
};

export type InviteStatus = "pending" | "accepted" | "declined";

export type Invite = {
  id: string;
  tenantId: string;
  timeBlockId: string;
  personId: string;
  status: InviteStatus;
};

export type AppState = {
  tenantId: string;
  currentRole: Role;
  currentPersonId: string;
  people: Person[];
  users: TenantUser[];
  employments: Employment[];
  orgUnits: OrgUnit[];
  grades: Grade[];
  positions: Position[];
  assignments: Assignment[];
  cvs: CurriculumVitae[];
  corrections: CorrectionRequest[];
  cycles: KpiCycle[];
  kpiSets: KpiSet[];
  kpiItems: KpiItem[];
  checkIns: CheckInRecord[];
  audit: AuditEntry[];
  projects: Project[];
  staffings: Staffing[];
  workItems: WorkItem[];
  deliverables: Deliverable[];
  deliverableStatuses: DeliverableStatus[];
  deliverableCategories: DeliverableCategory[];
  leaveRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
  publicHolidays: PublicHoliday[];
  timeBlockTypes: TimeBlockType[];
  timeBlocks: TimeBlock[];
  invites: Invite[];
};

export type Health = "on-track" | "at-risk" | "off" | "none";
