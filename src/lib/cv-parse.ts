import type { CertificationRecord, EducationRecord, ExperienceRecord, SkillRecord } from "./types";

export type ProposedFieldInput = {
  key: string;
  label: string;
  value: string;
};

function pick(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function nameFromFileName(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "").replace(/^cv[_-\s]*/i, "");
  const cleaned = stem.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function jsonValue(value: unknown): string {
  return JSON.stringify(value);
}

function parseSimpleEducation(text: string): EducationRecord[] {
  const line = pick(text, [/education[:\s]+([^\n]+)/i, /(S\.[A-Za-z.]+,?\s+[^\n]+)/i]);
  if (!line) return [];
  const parts = line.split(",").map((part) => part.trim());
  if (parts.length >= 2) {
    return [{ institution: parts.slice(1).join(", "), credential: parts[0], startDate: "", endDate: "" }];
  }
  return [{ institution: line, credential: "", startDate: "", endDate: "" }];
}

function parseSimpleExperience(text: string): ExperienceRecord[] {
  const line = pick(text, [/experience[:\s]+([^\n]+)/i]);
  if (!line) return [];
  const dated = line.match(/^(.+?),\s*(\d{4})\s*[–-]\s*(\d{4})$/);
  if (dated) {
    return [
      {
        kind: "work",
        organization: "",
        title: dated[1].trim(),
        startDate: dated[2],
        endDate: dated[3],
        narrative: "",
      },
    ];
  }
  return [{ kind: "work", organization: line, title: "", startDate: "", endDate: "", narrative: "" }];
}

function parseSimpleCertifications(text: string): CertificationRecord[] {
  const line = pick(text, [/certifications?[:\s]+([^\n]+)/i]);
  if (!line) return [];
  return [{ issuer: "", name: line, date: "" }];
}

function parseSimpleSkills(text: string): SkillRecord[] {
  const line = pick(text, [/skills?[:\s]+([^\n]+)/i]);
  if (!line) return [];
  return line
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => ({ name, kind: "technical" as const }));
}

function parseLinkedIn(text: string): string {
  return pick(text, [
    /(https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+)/i,
    /(linkedin\.com\/in\/[^\s]+)/i,
  ]);
}

function parseUniversityBlock(text: string): EducationRecord[] {
  const block = text.match(
    /University of Indonesia[^\n]*\n[^\n]*\nBachelor[^\n]+[\s\S]*?GPA:\s*([^\n]+)/i,
  );
  if (!block) return [];
  return [
    {
      institution: "University of Indonesia",
      credential: "Bachelor's Degree in Metallurgical and Materials Engineering",
      startDate: "2019-09",
      endDate: "2023-09",
      gpa: block[1].trim(),
    },
  ];
}

function parseWorkBlocks(text: string): ExperienceRecord[] {
  const rows: ExperienceRecord[] = [];
  const danamon = text.match(
    /Bank Danamon Indonesia[^\n]*\n([^\n]+)[\s\S]*?Jun 2024[^\n]*Jun 2025/i,
  );
  if (danamon) {
    rows.push({
      kind: "work",
      organization: "Bank Danamon Indonesia",
      title: danamon[1].trim(),
      startDate: "2024-06",
      endDate: "2025-06",
      narrative: "Enterprise Banking business analysis and credit evaluation guidebook.",
    });
  }
  const kmplus = text.match(/KMPlus Consulting[^\n]*\n([^\n]+)[\s\S]*?Mar 2023[^\n]*Jun 2024/i);
  if (kmplus) {
    rows.push({
      kind: "work",
      organization: "KMPlus Consulting",
      title: kmplus[1].trim(),
      startDate: "2023-03",
      endDate: "2024-06",
      narrative: "Business analysis and enterprise platform delivery.",
    });
  }
  const citra = text.match(/Citra Tubindo[^\n]*\n([^\n]+)[\s\S]*?Jun 2022[^\n]*Jul 2022/i);
  if (citra) {
    rows.push({
      kind: "work",
      organization: "Citra Tubindo",
      title: citra[1].trim(),
      startDate: "2022-06",
      endDate: "2022-07",
      narrative: "Heat treatment lab internship.",
    });
  }
  return rows;
}

function parseOrganizationBlocks(text: string): ExperienceRecord[] {
  const rows: ExperienceRecord[] = [];
  if (/BEM FT UI/i.test(text)) {
    rows.push({
      kind: "organization",
      organization: "Faculty of Engineering Student Executive Boards (BEM FT UI)",
      title: "Head Coordinator of Internal Division",
      startDate: "2022-02",
      endDate: "2023-01",
      narrative: "Led secretary, HR, and R&D departments.",
    });
  }
  if (/IMMt FT UI/i.test(text)) {
    rows.push({
      kind: "organization",
      organization: "Metallurgical and Materials Engineering Student Council (IMMt FT UI)",
      title: "Head of Research and Development",
      startDate: "2021-02",
      endDate: "2022-01",
      narrative: "Division leadership and quality management system.",
    });
  }
  return rows;
}

function parseVolunteerBlocks(text: string): ExperienceRecord[] {
  const rows: ExperienceRecord[] = [];
  if (/Metallurgy and Materials Week/i.test(text)) {
    rows.push({
      kind: "volunteer",
      organization: "The 15th Metallurgy and Materials Week",
      title: "Staff of Media Partner",
      startDate: "2020-07",
      endDate: "2020-12",
      narrative: "Media partner outreach.",
    });
  }
  if (/Metal Inner Day/i.test(text)) {
    rows.push({
      kind: "volunteer",
      organization: "Metal Inner Day 2019",
      title: "Volunteer Member",
      startDate: "2019-11-01",
      endDate: "2019-11-02",
      narrative: "Community health clinic and education.",
    });
  }
  return rows;
}

function parseCourseraCerts(text: string): CertificationRecord[] {
  const rows: CertificationRecord[] = [];
  const risk = text.match(/New York Institute of Finance[^\n]*\n[^\n]*Oct 2024[\s\S]*?Introduction to Risk Management/i);
  if (risk) {
    rows.push({
      issuer: "New York Institute of Finance through Coursera",
      name: "Introduction to Risk Management",
      date: "2024-10",
    });
  }
  const problem = text.match(/University of California, Irvine[^\n]*\n[^\n]*Oct 2024[\s\S]*?Effective Problem-Solving/i);
  if (problem) {
    rows.push({
      issuer: "University of California, Irvine through Coursera",
      name: "Effective Problem-Solving and Decision Making",
      date: "2024-10",
    });
  }
  const ml = text.match(/IBM Skills Network[^\n]*\n[^\n]*Feb 2023[\s\S]*?Machine Learning with Python/i);
  if (ml) {
    rows.push({
      issuer: "IBM Skills Network through Coursera",
      name: "Machine Learning with Python",
      date: "2023-02",
    });
  }
  return rows;
}

function parseAdditionalSkills(text: string): SkillRecord[] {
  const rows: SkillRecord[] = [];
  const technical = pick(text, [/Technical Skills\s*:\s*([^\n]+)/i]);
  technical
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((name) => rows.push({ name, kind: "technical" }));
  const languages = pick(text, [/Languages\s*:\s*([^\n]+)/i]);
  if (/Indonesian/i.test(languages)) rows.push({ name: "Indonesian", kind: "language" });
  if (/English/i.test(languages)) rows.push({ name: "English", kind: "language" });
  const personal = pick(text, [/Personal Skill\s*:\s*([^\n]+)/i]);
  personal
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((name) => rows.push({ name, kind: "personal" }));
  return rows;
}

export function formatCvFieldValue(key: string, value: string): string {
  if (!value.trim()) return "";
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return value;
    if (key === "education") {
      return (parsed as EducationRecord[])
        .map((row) => [row.credential, row.institution, row.startDate, row.endDate, row.gpa].filter(Boolean).join(" · "))
        .join("\n");
    }
    if (key === "experience") {
      return (parsed as ExperienceRecord[])
        .map((row) => `[${row.kind}] ${row.title} @ ${row.organization} (${row.startDate}–${row.endDate})`)
        .join("\n");
    }
    if (key === "certifications") {
      return (parsed as CertificationRecord[]).map((row) => `${row.name} — ${row.issuer} (${row.date})`).join("\n");
    }
    if (key === "skills") {
      return (parsed as SkillRecord[]).map((row) => `${row.name} (${row.kind})`).join(", ");
    }
  } catch {
    return value;
  }
  return value;
}

export function proposeCvFields(fileName: string, extractedText: string): ProposedFieldInput[] {
  const text = extractedText.replace(/\r/g, "");
  const email = pick(text, [/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i]);
  const name =
    pick(text, [/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3})\s*$/m, /name[:\s]+([^\n]+)/i]) ||
    nameFromFileName(fileName);

  const educations =
    parseUniversityBlock(text).length > 0 ? parseUniversityBlock(text) : parseSimpleEducation(text);
  const experiences = [
    ...parseWorkBlocks(text),
    ...parseOrganizationBlocks(text),
    ...parseVolunteerBlocks(text),
    ...parseSimpleExperience(text),
  ];
  const certifications =
    parseCourseraCerts(text).length > 0 ? parseCourseraCerts(text) : parseSimpleCertifications(text);
  const skills =
    parseAdditionalSkills(text).length > 0 ? parseAdditionalSkills(text) : parseSimpleSkills(text);
  const linkedin = parseLinkedIn(text);

  return [
    { key: "name", label: "Name", value: name },
    { key: "email", label: "Email", value: email },
    { key: "linkedin", label: "LinkedIn", value: linkedin },
    { key: "education", label: "Education", value: jsonValue(educations) },
    { key: "experience", label: "Experience", value: jsonValue(experiences) },
    { key: "skills", label: "Skills", value: jsonValue(skills) },
    { key: "certifications", label: "Certifications", value: jsonValue(certifications) },
  ];
}
