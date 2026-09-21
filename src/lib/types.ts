export const TENANT_ID = "kmplus";

export type Role = "employee" | "manager" | "hr" | "admin";

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
};

export type Health = "on-track" | "at-risk" | "off" | "none";
