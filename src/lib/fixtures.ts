import type {
  AppState,
  Assignment,
  CheckInRecord,
  CurriculumVitae,
  DemoUser,
  Employment,
  Grade,
  KpiCycle,
  KpiItem,
  KpiSet,
  OrgUnit,
  Person,
  Position,
  TenantUser,
} from "./types";
import { DZAKY_CV_EXTRACTED_TEXT, DZAKY_CV_PROPOSED } from "./fixtures/dzaky-cv-extracted";
import { emptyPersonEvidence } from "./person-evidence";
import { TENANT_ID } from "./types";

const t = TENANT_ID;

function person(
  id: string,
  legalName: string,
  preferredName: string,
  skills: string[],
  notes: { education: string; experience: string },
): Person {
  const slug = preferredName.toLowerCase().replace(/[^a-z]/g, "") || id.replace("person-", "");
  return {
    id,
    tenantId: t,
    legalName,
    preferredName,
    email: `${slug}@kmplusconsulting.com`,
    phone: "+62 811 000 0000",
    emergencyContactName: "",
    emergencyContactPhone: "",
    skills,
    educationNotes: notes.education,
    experienceNotes: notes.experience,
    certifications: "",
    ...emptyPersonEvidence(),
  };
}

export const DEMO_PASSWORD = "kmplus-demo";

export const DEMO_USERS: DemoUser[] = [
  { role: "employee", personId: "person-alfredo", label: "Alfredo Teja · Employee", adminGrant: true },
  { role: "manager", personId: "person-rayhan", label: "Rayhan Alvin · Manager" },
  { role: "hr", personId: "person-denny", label: "Denny G · HR" },
  { role: "admin", personId: "person-alvin", label: "Alvin Soleh · Tenant admin" },
];

const people: Person[] = [
  person("person-alvin", "Alvin Soleh", "Alvin", ["Leadership"], { education: "", experience: "CEO, KMPlus" }),
  person("person-rayhan", "Rayhan Alvin", "Rayhan", ["Operations"], { education: "", experience: "Operational Director, KMPlus" }),
  person("person-denny", "Denny G", "Denny", ["Corporate affairs", "People operations"], { education: "", experience: "Corp. Affairs Director, KMPlus" }),
  person("person-puti", "Puti Cut", "Puti", ["Sales"], { education: "", experience: "Head of Sales, KMPlus" }),
  person("person-marcelino", "M. Marcelino Hambali", "Marcelino", ["Engineering management"], { education: "", experience: "Engineering Manager, KMPlus" }),
  person("person-eka", "Akhmad Eka", "Eka", ["Software engineering"], { education: "", experience: "Software Engineer, KMPlus" }),
  person("person-digit", "Digit Prakitka", "Digit", ["Software engineering"], { education: "", experience: "Software Engineer, KMPlus" }),
  person("person-setyo", "Mochammad Setyo Adi", "Setyo", ["QA", "DevOps"], { education: "", experience: "QA / DevOps Specialist, KMPlus" }),
  person("person-alfredo", "Alfredo Teja", "Alfredo", ["Consulting", "Delivery"], { education: "", experience: "Senior Consultant, KMPlus" }),
  person("person-irfan", "Irfan Alfieri", "Irfan", ["Consulting"], { education: "", experience: "Senior Consultant, KMPlus" }),
  person("person-pinkan", "Pinkan", "Pinkan", ["Consulting"], { education: "", experience: "Consultant, KMPlus" }),
  person("person-nabila", "Nabila", "Nabila", ["Consulting"], { education: "", experience: "Consultant, KMPlus" }),
  person("person-raafi", "Ahmad Raafi", "Raafi", ["Business analysis"], { education: "", experience: "Business Analyst, KMPlus" }),
  person("person-fadhylah", "Fadhylah", "Fadhylah", ["Business analysis"], { education: "", experience: "Business Analyst, KMPlus" }),
  person("person-imanuella", "Imanuella Gerlani", "Imanuella", ["Sales"], { education: "", experience: "Sales Specialist, KMPlus" }),
  person("person-sakinah", "Sakinah", "Sakinah", ["Sales"], { education: "", experience: "Sales Associate, KMPlus" }),
  person("person-wisnu", "Wisnu", "Wisnu", ["Sales"], { education: "", experience: "Sales Associate, KMPlus" }),
];

const orgUnits: OrgUnit[] = [
  { id: "ou-hq", tenantId: t, name: "KMPlus Optima Internasional", parentId: null },
  { id: "ou-ops", tenantId: t, name: "Operational", parentId: "ou-hq" },
  { id: "ou-corp", tenantId: t, name: "Corporate Affairs", parentId: "ou-hq" },
  { id: "ou-eng", tenantId: t, name: "Engineering", parentId: "ou-ops" },
  { id: "ou-delivery", tenantId: t, name: "Delivery", parentId: "ou-ops" },
  { id: "ou-sales", tenantId: t, name: "Sales", parentId: "ou-ops" },
  { id: "ou-finance", tenantId: t, name: "Finance", parentId: "ou-corp" },
  { id: "ou-accounting", tenantId: t, name: "Accounting", parentId: "ou-corp" },
  { id: "ou-hr", tenantId: t, name: "People", parentId: "ou-corp" },
];

const grades: Grade[] = [
  { id: "g1", tenantId: t, code: "G1", name: "Director" },
  { id: "g2", tenantId: t, code: "G2", name: "Head" },
  { id: "g3", tenantId: t, code: "G3", name: "Manager" },
  { id: "g4", tenantId: t, code: "G4", name: "Senior" },
  { id: "g5", tenantId: t, code: "G5", name: "Professional" },
  { id: "g6", tenantId: t, code: "G6", name: "Associate" },
  { id: "g7", tenantId: t, code: "G7", name: "Trainee" },
];

function pos(id: string, title: string, gradeId: string, orgUnitId: string, reportsToPositionId: string | null): Position {
  return { id, tenantId: t, title, gradeId, orgUnitId, reportsToPositionId };
}

const positions: Position[] = [
  pos("pos-ceo", "CEO", "g1", "ou-hq", null),
  pos("pos-od", "Operational Director", "g1", "ou-ops", "pos-ceo"),
  pos("pos-cad", "Corp. Affairs Director", "g1", "ou-corp", "pos-ceo"),
  pos("pos-head-eng", "Head of Engineering", "g2", "ou-eng", "pos-od"),
  pos("pos-eng-mgr", "Engineering Manager", "g3", "ou-eng", "pos-head-eng"),
  pos("pos-sse", "Senior Software Engineer", "g4", "ou-eng", "pos-eng-mgr"),
  pos("pos-se-eka", "Software Engineer", "g5", "ou-eng", "pos-sse"),
  pos("pos-se-digit", "Software Engineer", "g5", "ou-eng", "pos-sse"),
  pos("pos-qa", "QA / DevOps Specialist", "g5", "ou-eng", "pos-eng-mgr"),
  pos("pos-jse", "Junior Software Engineer", "g6", "ou-eng", "pos-eng-mgr"),
  pos("pos-intern-eng", "Engineer Intern / Trainee", "g7", "ou-eng", "pos-eng-mgr"),
  pos("pos-head-delivery", "Head of Delivery", "g2", "ou-delivery", "pos-od"),
  pos("pos-pm", "Project Manager", "g3", "ou-delivery", "pos-head-delivery"),
  pos("pos-sr-cons-alfredo", "Senior Consultant", "g4", "ou-delivery", "pos-pm"),
  pos("pos-sr-cons-irfan", "Senior Consultant", "g4", "ou-delivery", "pos-pm"),
  pos("pos-cons-pinkan", "Consultant", "g5", "ou-delivery", "pos-pm"),
  pos("pos-cons-nabila", "Consultant", "g5", "ou-delivery", "pos-pm"),
  pos("pos-ba-raafi", "Business Analyst", "g5", "ou-delivery", "pos-pm"),
  pos("pos-ba-fadhylah", "Business Analyst", "g5", "ou-delivery", "pos-pm"),
  pos("pos-assoc-cons", "Associate Consultant", "g6", "ou-delivery", "pos-pm"),
  pos("pos-del-trainee-1", "Delivery Trainee", "g7", "ou-delivery", "pos-pm"),
  pos("pos-del-trainee-2", "Delivery Trainee", "g7", "ou-delivery", "pos-pm"),
  pos("pos-del-trainee-3", "Delivery Trainee", "g7", "ou-delivery", "pos-pm"),
  pos("pos-head-sales", "Head of Sales", "g2", "ou-sales", "pos-od"),
  pos("pos-sales-mgr", "Sales Manager", "g3", "ou-sales", "pos-head-sales"),
  pos("pos-sr-am", "Senior Account Manager", "g4", "ou-sales", "pos-sales-mgr"),
  pos("pos-am", "Account Manager", "g5", "ou-sales", "pos-sales-mgr"),
  pos("pos-sales-spec", "Sales Specialist", "g5", "ou-sales", "pos-sales-mgr"),
  pos("pos-sales-assoc-sakinah", "Sales Associate", "g6", "ou-sales", "pos-sales-mgr"),
  pos("pos-sales-assoc-wisnu", "Sales Associate", "g6", "ou-sales", "pos-sales-mgr"),
  pos("pos-sales-trainee", "Sales Trainee", "g7", "ou-sales", "pos-sales-mgr"),
  pos("pos-head-finance", "Head of Finance", "g2", "ou-finance", "pos-cad"),
  pos("pos-head-accounting", "Head of Accounting", "g2", "ou-accounting", "pos-cad"),
  pos("pos-head-hr", "Head of HR", "g2", "ou-hr", "pos-cad"),
];

const seat: Record<string, string> = {
  "person-alvin": "pos-ceo",
  "person-rayhan": "pos-od",
  "person-denny": "pos-cad",
  "person-puti": "pos-head-sales",
  "person-marcelino": "pos-eng-mgr",
  "person-eka": "pos-se-eka",
  "person-digit": "pos-se-digit",
  "person-setyo": "pos-qa",
  "person-alfredo": "pos-sr-cons-alfredo",
  "person-irfan": "pos-sr-cons-irfan",
  "person-pinkan": "pos-cons-pinkan",
  "person-nabila": "pos-cons-nabila",
  "person-raafi": "pos-ba-raafi",
  "person-fadhylah": "pos-ba-fadhylah",
  "person-imanuella": "pos-sales-spec",
  "person-sakinah": "pos-sales-assoc-sakinah",
  "person-wisnu": "pos-sales-assoc-wisnu",
};

const employments: Employment[] = people.map((row) => ({
  id: `emp-${row.id.replace("person-", "")}`,
  tenantId: t,
  personId: row.id,
  joinDate: "2024-01-01",
  endDate: null,
  status: "active",
  contractType: row.id.includes("intern") ? "intern" : "permanent",
}));

const assignments: Assignment[] = [
  ...people.map((row) => ({
    id: `asg-${row.id.replace("person-", "")}`,
    tenantId: t,
    personId: row.id,
    positionId: seat[row.id],
    startDate: "2024-01-01",
    endDate: null,
  })),
  {
    id: "asg-alfredo-assoc",
    tenantId: t,
    personId: "person-alfredo",
    positionId: "pos-assoc-cons",
    startDate: "2026-07-01",
    endDate: null,
  },
];

const cycles: KpiCycle[] = [
  {
    id: "cycle-2025",
    tenantId: t,
    name: "2025 annual",
    year: 2025,
    status: "closed",
    phase: "closed",
    adjustmentOpen: false,
    checkInCadence: "quarterly",
    checkInWindows: [
      { quarter: 1, open: false },
      { quarter: 2, open: false },
      { quarter: 3, open: false },
      { quarter: 4, open: false },
    ],
  },
  {
    id: "cycle-2026",
    tenantId: t,
    name: "2026 annual",
    year: 2026,
    status: "open",
    phase: "monitoring",
    adjustmentOpen: false,
    checkInCadence: "quarterly",
    checkInWindows: [
      { quarter: 1, open: false },
      { quarter: 2, open: false },
      { quarter: 3, open: true },
      { quarter: 4, open: false },
    ],
  },
  {
    id: "cycle-2027",
    tenantId: t,
    name: "2027 annual",
    year: 2027,
    status: "draft",
    phase: null,
    adjustmentOpen: false,
    checkInCadence: "quarterly",
    checkInWindows: [
      { quarter: 1, open: false },
      { quarter: 2, open: false },
      { quarter: 3, open: false },
      { quarter: 4, open: false },
    ],
  },
];

const kpiSets: KpiSet[] = [
  { id: "set-alfredo", tenantId: t, assignmentId: "asg-alfredo", cycleId: "cycle-2026", status: "pending" },
  {
    id: "set-rayhan",
    tenantId: t,
    assignmentId: "asg-rayhan",
    cycleId: "cycle-2026",
    status: "pending",
    lineManagerApprovedBy: "person-alvin",
  },
  {
    id: "set-digit",
    tenantId: t,
    assignmentId: "asg-digit",
    cycleId: "cycle-2026",
    status: "approved",
    lineManagerApprovedBy: "person-marcelino",
    adminApprovedBy: "person-alfredo",
  },
  {
    id: "set-alvin",
    tenantId: t,
    assignmentId: "asg-alvin",
    cycleId: "cycle-2026",
    status: "approved",
    adminApprovedBy: "person-alfredo",
  },
  {
    id: "set-denny",
    tenantId: t,
    assignmentId: "asg-denny",
    cycleId: "cycle-2026",
    status: "approved",
    lineManagerApprovedBy: "person-alvin",
    adminApprovedBy: "person-alfredo",
  },
  {
    id: "set-alfredo-assoc",
    tenantId: t,
    assignmentId: "asg-alfredo-assoc",
    cycleId: "cycle-2026",
    status: "draft",
  },
];

function items(
  setId: string,
  rows: Array<[string, string, string, number, string, number, string | null]>,
): KpiItem[] {
  return rows.map(([id, name, definition, target, unit, weight, parent]) => ({
    id,
    tenantId: t,
    kpiSetId: setId,
    name,
    definition,
    target,
    unit,
    weight,
    polarity: "higher-better" as const,
    parentKpiItemId: parent ?? null,
    cascadeMode: "indirect" as const,
  }));
}

const kpiItems: KpiItem[] = [
  ...items("set-alfredo", [
    ["ki-alfredo-1", "Utilization", "Billable hours / available hours", 70, "%", 40, "ki-rayhan-2"],
    ["ki-alfredo-2", "Delivery quality", "Client quality score on closed work", 4.5, "score", 35, "ki-rayhan-1"],
    ["ki-alfredo-3", "Knowledge contribution", "Internal playbooks published", 4, "count", 25, "ki-rayhan-1"],
  ]),
  ...items("set-rayhan", [
    ["ki-rayhan-1", "Practice delivery", "Operational delivery vs plan", 100, "%", 50, "ki-alvin-1"],
    ["ki-rayhan-2", "Team utilization", "Average utilization of reports", 72, "%", 30, "ki-alvin-1"],
    ["ki-rayhan-3", "Hiring completeness", "Filled engineering and delivery seats", 90, "%", 20, "ki-alvin-1"],
  ]),
  ...items("set-digit", [
    ["ki-digit-1", "Shipped slices", "Product slices shipped", 6, "count", 50, "ki-rayhan-1"],
    ["ki-digit-2", "Quality", "Escaped defects", 2, "count", 30, "ki-rayhan-1"],
    ["ki-digit-3", "Knowledge contribution", "Engineering notes published", 4, "count", 20, "ki-rayhan-1"],
  ]),
  ...items("set-alvin", [
    ["ki-alvin-1", "Firm utilization", "Company-wide utilization", 70, "%", 50, null],
    ["ki-alvin-2", "Client NPS", "Annual client NPS", 50, "score", 50, null],
  ]),
  ...items("set-denny", [
    ["ki-denny-1", "Master data completeness", "Active people with current Assignment", 100, "%", 50, "ki-alvin-1"],
    ["ki-denny-2", "CV review SLA", "CVs reviewed within 5 days", 95, "%", 50, "ki-alvin-1"],
  ]),
];

function seededCheckIn(
  row: Omit<CheckInRecord, "status" | "lineManagerApprovedBy" | "adminApprovedBy"> & {
    lineManagerApprovedBy?: string;
    adminApprovedBy?: string;
  },
): CheckInRecord {
  return {
    ...row,
    status: "approved",
    lineManagerApprovedBy: row.lineManagerApprovedBy,
    adminApprovedBy: row.adminApprovedBy,
  };
}

const checkIns: CheckInRecord[] = [
  seededCheckIn({
    id: "ci-digit-1",
    tenantId: t,
    kpiItemId: "ki-digit-1",
    date: "2026-07-15",
    window: "2026-Q3",
    actual: 4,
    note: "Four slices in H1",
    lineManagerApprovedBy: "person-marcelino",
    adminApprovedBy: "person-alfredo",
  }),
  seededCheckIn({
    id: "ci-digit-2",
    tenantId: t,
    kpiItemId: "ki-digit-2",
    date: "2026-07-15",
    window: "2026-Q3",
    actual: 1,
    note: "One escaped defect",
    lineManagerApprovedBy: "person-marcelino",
    adminApprovedBy: "person-alfredo",
  }),
  seededCheckIn({
    id: "ci-digit-3",
    tenantId: t,
    kpiItemId: "ki-digit-3",
    date: "2026-07-15",
    window: "2026-Q3",
    actual: 2,
    note: "Two notes",
    lineManagerApprovedBy: "person-marcelino",
    adminApprovedBy: "person-alfredo",
  }),
  seededCheckIn({
    id: "ci-alvin-1",
    tenantId: t,
    kpiItemId: "ki-alvin-1",
    date: "2026-07-20",
    window: "2026-Q3",
    actual: 68,
    note: "Close to plan",
    adminApprovedBy: "person-alfredo",
  }),
  seededCheckIn({
    id: "ci-alvin-2",
    tenantId: t,
    kpiItemId: "ki-alvin-2",
    date: "2026-07-20",
    window: "2026-Q3",
    actual: 48,
    note: "Q2 survey",
    adminApprovedBy: "person-alfredo",
  }),
  seededCheckIn({
    id: "ci-denny-1",
    tenantId: t,
    kpiItemId: "ki-denny-1",
    date: "2026-07-20",
    window: "2026-Q3",
    actual: 85,
    note: "Empty Head and trainee seats remain",
    lineManagerApprovedBy: "person-alvin",
    adminApprovedBy: "person-alfredo",
  }),
  seededCheckIn({
    id: "ci-denny-2",
    tenantId: t,
    kpiItemId: "ki-denny-2",
    date: "2026-07-20",
    window: "2026-Q3",
    actual: 92,
    note: "Two CVs over SLA",
    lineManagerApprovedBy: "person-alvin",
    adminApprovedBy: "person-alfredo",
  }),
];

const cvs: CurriculumVitae[] = [
  {
    id: "cv-alfredo",
    tenantId: t,
    personId: "person-alfredo",
    fileName: "CV_Alfredo_Teja.pdf",
    uploadedAt: "2024-03-20T08:00:00.000Z",
    state: "applied",
    extractedText: "Alfredo Teja. Senior Consultant.",
    fields: [
      { key: "name", label: "Name", value: "Alfredo Teja", decision: "accepted" },
      { key: "email", label: "Email", value: "alfredo@kmplusconsulting.com", decision: "accepted" },
      { key: "linkedin", label: "LinkedIn", value: "", decision: "rejected" },
      { key: "education", label: "Education", value: "[]", decision: "rejected" },
      {
        key: "experience",
        label: "Experience",
        value: JSON.stringify([
          {
            kind: "work",
            organization: "KMPlus",
            title: "Senior Consultant",
            startDate: "",
            endDate: "",
            narrative: "",
          },
        ]),
        decision: "accepted",
      },
      {
        key: "skills",
        label: "Skills",
        value: JSON.stringify([
          { name: "Consulting", kind: "technical" },
          { name: "Delivery", kind: "technical" },
        ]),
        decision: "accepted",
      },
      { key: "certifications", label: "Certifications", value: "[]", decision: "rejected" },
    ],
  },
  {
    id: "cv-fajar",
    tenantId: t,
    personId: null,
    fileName: "CV_Fajar_Nugroho.docx",
    uploadedAt: "2026-09-10T09:30:00.000Z",
    state: "in-review",
    extractedText:
      "Fajar Nugroho\nfajar.nugroho@email.com\nEducation: S.Psi, Universitas Airlangga\nExperience: Talent analyst, 2022–2026\nSkills: Assessment, Excel, Facilitation\nCertifications: BNSP Assessor",
    fields: [
      { key: "name", label: "Name", value: "Fajar Nugroho", decision: "pending" },
      { key: "email", label: "Email", value: "fajar.nugroho@email.com", decision: "pending" },
      { key: "linkedin", label: "LinkedIn", value: "", decision: "pending" },
      {
        key: "education",
        label: "Education",
        value: JSON.stringify([
          {
            institution: "Universitas Airlangga",
            credential: "S.Psi",
            startDate: "",
            endDate: "",
          },
        ]),
        decision: "pending",
      },
      {
        key: "experience",
        label: "Experience",
        value: JSON.stringify([
          {
            kind: "work",
            organization: "",
            title: "Talent analyst",
            startDate: "2022",
            endDate: "2026",
            narrative: "",
          },
        ]),
        decision: "pending",
      },
      {
        key: "skills",
        label: "Skills",
        value: JSON.stringify([
          { name: "Assessment", kind: "technical" },
          { name: "Excel", kind: "technical" },
          { name: "Facilitation", kind: "personal" },
        ]),
        decision: "pending",
      },
      {
        key: "certifications",
        label: "Certifications",
        value: JSON.stringify([{ issuer: "BNSP", name: "Assessor", date: "" }]),
        decision: "pending",
      },
    ],
  },
  {
    id: "cv-dzaky",
    tenantId: t,
    personId: null,
    fileName: "CV - Dzaky Iman Ajiputro.pdf",
    uploadedAt: "2026-09-12T10:00:00.000Z",
    state: "in-review",
    extractedText: DZAKY_CV_EXTRACTED_TEXT,
    fields: [
      { key: "name", label: "Name", value: DZAKY_CV_PROPOSED.name, decision: "pending" },
      { key: "email", label: "Email", value: DZAKY_CV_PROPOSED.email, decision: "pending" },
      { key: "linkedin", label: "LinkedIn", value: DZAKY_CV_PROPOSED.linkedin, decision: "pending" },
      { key: "education", label: "Education", value: DZAKY_CV_PROPOSED.education, decision: "pending" },
      { key: "experience", label: "Experience", value: DZAKY_CV_PROPOSED.experience, decision: "pending" },
      { key: "skills", label: "Skills", value: DZAKY_CV_PROPOSED.skills, decision: "pending" },
      { key: "certifications", label: "Certifications", value: DZAKY_CV_PROPOSED.certifications, decision: "pending" },
    ],
  },
];

export function seedTenantUsers(): TenantUser[] {
  return DEMO_USERS.map((demo) => {
    const row = people.find((person) => person.id === demo.personId);
    if (!row) throw new Error(`Missing demo person ${demo.personId}`);
    return {
      id: `user-${demo.personId.replace("person-", "")}`,
      tenantId: t,
      personId: demo.personId,
      email: row.email,
      role: demo.role,
      adminGrant: demo.personId === "person-alfredo",
      mustSetPassword: false,
      authEpoch: 0,
    };
  });
}

export function createInitialState(): AppState {
  return {
    tenantId: t,
    currentRole: "hr",
    currentPersonId: "person-denny",
    people,
    users: seedTenantUsers(),
    employments,
    orgUnits,
    grades,
    positions,
    assignments,
    cvs,
    corrections: [],
    cycles,
    kpiSets,
    kpiItems,
    checkIns,
    audit: [
      {
        id: "aud-seed",
        at: "2026-09-01T00:00:00.000Z",
        actorRole: "admin",
        actorPersonId: "person-alvin",
        action: "seed",
        entity: "Tenant",
        entityId: t,
        detail: "Fixture tenant kmplus loaded from KMPlus Organization Structure",
      },
    ],
  };
}
