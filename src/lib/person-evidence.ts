import type {
  CertificationRecord,
  EducationRecord,
  ExperienceRecord,
  Person,
  SkillRecord,
} from "./types";

export function emptyPersonEvidence(): Pick<
  Person,
  "educations" | "experiences" | "certificationRows" | "skillRows"
> {
  return {
    educations: [],
    experiences: [],
    certificationRows: [],
    skillRows: [],
  };
}

export function parseEducationRows(raw: string): EducationRecord[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEducationRecord);
  } catch {
    return [
      {
        institution: raw.trim(),
        credential: "",
        startDate: "",
        endDate: "",
      },
    ];
  }
}

export function parseExperienceRows(raw: string): ExperienceRecord[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isExperienceRecord);
  } catch {
    return [
      {
        kind: "work",
        organization: raw.trim(),
        title: "",
        startDate: "",
        endDate: "",
        narrative: "",
      },
    ];
  }
}

export function parseCertificationRows(raw: string): CertificationRecord[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCertificationRecord);
  } catch {
    return [{ issuer: "", name: raw.trim(), date: "" }];
  }
}

export function parseSkillRows(raw: string): SkillRecord[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSkillRecord);
  } catch {
    return raw
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((name) => ({ name, kind: "technical" as const }));
  }
}

export function skillNamesFromRows(rows: SkillRecord[]): string[] {
  return rows.map((row) => row.name);
}

export function mergeEvidenceOntoPerson(
  person: Person,
  input: {
    educations: EducationRecord[];
    experiences: ExperienceRecord[];
    certificationRows: CertificationRecord[];
    skillRows: SkillRecord[];
    linkedIn?: string;
  },
): Person {
  const mergedSkillRows = dedupeSkillRows([...person.skillRows, ...input.skillRows]);
  const mergedSkills = Array.from(
    new Set([...person.skills, ...skillNamesFromRows(input.skillRows)]),
  );
  return {
    ...person,
    educations: [...person.educations, ...input.educations],
    experiences: [...person.experiences, ...input.experiences],
    certificationRows: [...person.certificationRows, ...input.certificationRows],
    skillRows: mergedSkillRows,
    skills: mergedSkills,
    linkedIn: input.linkedIn?.trim() ? input.linkedIn.trim() : person.linkedIn,
  };
}

function dedupeSkillRows(rows: SkillRecord[]): SkillRecord[] {
  const seen = new Set<string>();
  const out: SkillRecord[] = [];
  for (const row of rows) {
    const key = `${row.kind}:${row.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function isEducationRecord(value: unknown): value is EducationRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as EducationRecord;
  return typeof row.institution === "string";
}

function isExperienceRecord(value: unknown): value is ExperienceRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as ExperienceRecord;
  return (
    typeof row.organization === "string" &&
    (row.kind === "work" || row.kind === "organization" || row.kind === "volunteer")
  );
}

function isCertificationRecord(value: unknown): value is CertificationRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as CertificationRecord;
  return typeof row.name === "string";
}

function isSkillRecord(value: unknown): value is SkillRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as SkillRecord;
  return (
    typeof row.name === "string" &&
    (row.kind === "technical" || row.kind === "language" || row.kind === "personal")
  );
}
