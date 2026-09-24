import { Prisma } from "@prisma/client";
import type {
  AppState,
  Assignment,
  AuditEntry,
  CheckInCadence,
  CheckInRecord,
  CorrectionRequest,
  CurriculumVitae,
  Employment,
  Grade,
  KpiCycle,
  KpiItem,
  KpiSet,
  OrgUnit,
  Person,
  Position,
  Role,
  TenantUser,
} from "@/lib/types";
import { TENANT_ID } from "@/lib/types";
import { normalizeKpiYearPhase } from "@/lib/domain-query";
import { DEMO_USERS, createInitialState } from "@/lib/fixtures";
import { loginEmailChanges } from "@/lib/auth-policy";
import { getPrisma } from "./prisma";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function hydrateKpiSet(row: {
  id: string;
  tenantId: string;
  assignmentId: string;
  cycleId: string;
  status: string;
  readyForAgreement: boolean;
  lineManagerApprovedBy?: string | null;
  adminApprovedBy?: string | null;
  returnComment?: string | null;
  score?: number | null;
}): KpiSet {
  const rawStatus = row.status;
  let status: KpiSet["status"] =
    rawStatus === "draft" || rawStatus === "pending" || rawStatus === "returned" || rawStatus === "approved" || rawStatus === "scored"
      ? rawStatus
      : "draft";
  if (rawStatus === "active" || rawStatus === "agreed") status = "approved";
  if (status === "draft" && row.readyForAgreement) status = "pending";
  return {
    id: row.id,
    tenantId: row.tenantId,
    assignmentId: row.assignmentId,
    cycleId: row.cycleId,
    status,
    readyForAgreement: row.readyForAgreement || undefined,
    lineManagerApprovedBy: row.lineManagerApprovedBy ?? undefined,
    adminApprovedBy: row.adminApprovedBy ?? undefined,
    returnComment: row.returnComment ?? undefined,
    score: row.score ?? undefined,
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function topo<T extends { id: string; parentId?: string | null }>(rows: T[]): T[] {
  const ids = new Set(rows.map((row) => row.id));
  const done = new Set<string>();
  const out: T[] = [];
  while (out.length < rows.length) {
    const ready = rows.filter((row) => {
      if (done.has(row.id)) return false;
      const parent = row.parentId;
      return !parent || !ids.has(parent) || done.has(parent);
    });
    if (ready.length === 0) {
      for (const row of rows) {
        if (!done.has(row.id)) {
          done.add(row.id);
          out.push(row);
        }
      }
      break;
    }
    for (const row of ready) {
      done.add(row.id);
      out.push(row);
    }
  }
  return out;
}

function toTenantUser(row: {
  id: string;
  tenantId: string;
  personId: string;
  email: string;
  role: string;
  adminGrant?: boolean;
  mustSetPassword: boolean;
  authEpoch?: number;
}): TenantUser {
  return {
    id: row.id,
    tenantId: row.tenantId,
    personId: row.personId,
    email: row.email,
    role: row.role as Role,
    adminGrant: row.adminGrant ?? false,
    mustSetPassword: row.mustSetPassword,
    authEpoch: row.authEpoch ?? 0,
  };
}

function hydrateKpiCycle(row: {
  id: string;
  tenantId: string;
  name: string;
  year: number;
  status: string;
  phase?: string | null;
  planningEndsOn?: string | null;
  adjustmentOpen?: boolean;
  checkInCadence: string;
  checkInWindows: unknown;
}): KpiCycle {
  const base: KpiCycle = {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    year: row.year,
    status: row.status as KpiCycle["status"],
    phase: (row.phase as KpiCycle["phase"]) ?? null,
    planningEndsOn: row.planningEndsOn ?? null,
    adjustmentOpen: row.adjustmentOpen ?? false,
    checkInCadence: row.checkInCadence as CheckInCadence,
    checkInWindows: asArray(row.checkInWindows),
  };
  return { ...base, phase: normalizeKpiYearPhase(base) };
}

export async function seedDemoUserPasswords(): Promise<void> {
  const prisma = getPrisma();
  for (const demo of DEMO_USERS) {
    await prisma.user.updateMany({
      where: { tenantId: TENANT_ID, personId: demo.personId },
      data: {
        passwordHash: "",
        mustSetPassword: true,
        role: demo.role,
        adminGrant: Boolean(demo.adminGrant),
      },
    });
  }
}

export async function loadTenantState(): Promise<AppState> {
  const prisma = getPrisma();
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    const seeded = createInitialState();
    await saveTenantState(seeded);
    await seedDemoUserPasswords();
    return loadTenantState();
  }

  const [
    people,
    users,
    employments,
    orgUnits,
    grades,
    positions,
    assignments,
    cvs,
    corrections,
    cycles,
    kpiSets,
    kpiItems,
    checkIns,
    audit,
  ] = await Promise.all([
    prisma.person.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.user.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.employment.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.orgUnit.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.grade.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.position.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.assignment.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.curriculumVitae.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.correctionRequest.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.kpiCycle.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.kpiSet.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.kpiItem.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.checkIn.findMany({ where: { tenantId: TENANT_ID } }),
    prisma.auditEntry.findMany({ where: { tenantId: TENANT_ID }, orderBy: { at: "desc" } }),
  ]);

  return {
    tenantId: TENANT_ID,
    currentRole: tenant.currentRole as Role,
    currentPersonId: tenant.currentPersonId,
    people: people.map(
      (row): Person => ({
        id: row.id,
        tenantId: row.tenantId,
        legalName: row.legalName,
        preferredName: row.preferredName,
        email: row.email,
        phone: row.phone,
        emergencyContactName: row.emergencyContactName,
        emergencyContactPhone: row.emergencyContactPhone,
        linkedIn: row.linkedIn ?? undefined,
        skills: row.skills,
        educationNotes: row.educationNotes,
        experienceNotes: row.experienceNotes,
        certifications: row.certifications,
        educations: asArray(row.educations),
        experiences: asArray(row.experiences),
        certificationRows: asArray(row.certificationRows),
        skillRows: asArray(row.skillRows),
      }),
    ),
    users: users.map(toTenantUser),
    employments: employments.map(
      (row): Employment => ({
        id: row.id,
        tenantId: row.tenantId,
        personId: row.personId,
        joinDate: row.joinDate,
        endDate: row.endDate,
        status: row.status as Employment["status"],
        contractType: row.contractType as Employment["contractType"],
      }),
    ),
    orgUnits: orgUnits.map(
      (row): OrgUnit => ({
        id: row.id,
        tenantId: row.tenantId,
        name: row.name,
        parentId: row.parentId,
      }),
    ),
    grades: grades.map(
      (row): Grade => ({
        id: row.id,
        tenantId: row.tenantId,
        code: row.code,
        name: row.name,
      }),
    ),
    positions: positions.map(
      (row): Position => ({
        id: row.id,
        tenantId: row.tenantId,
        title: row.title,
        gradeId: row.gradeId,
        orgUnitId: row.orgUnitId,
        reportsToPositionId: row.reportsToPositionId,
      }),
    ),
    assignments: assignments.map(
      (row): Assignment => ({
        id: row.id,
        tenantId: row.tenantId,
        personId: row.personId,
        positionId: row.positionId,
        startDate: row.startDate,
        endDate: row.endDate,
      }),
    ),
    cvs: cvs.map(
      (row): CurriculumVitae => ({
        id: row.id,
        tenantId: row.tenantId,
        personId: row.personId,
        fileName: row.fileName,
        uploadedAt: row.uploadedAt,
        state: row.state as CurriculumVitae["state"],
        extractedText: row.extractedText,
        fields: asArray(row.fields),
      }),
    ),
    corrections: corrections.map(
      (row): CorrectionRequest => ({
        id: row.id,
        tenantId: row.tenantId,
        personId: row.personId,
        field: row.field,
        currentValue: row.currentValue,
        proposedValue: row.proposedValue,
        status: row.status as CorrectionRequest["status"],
      }),
    ),
    cycles: cycles.map((row) => hydrateKpiCycle(row)),
    kpiSets: kpiSets.map((row) => hydrateKpiSet(row)),
    kpiItems: kpiItems.map(
      (row): KpiItem => ({
        id: row.id,
        tenantId: row.tenantId,
        kpiSetId: row.kpiSetId,
        name: row.name,
        definition: row.definition,
        target: row.target,
        unit: row.unit,
        weight: row.weight,
        polarity: row.polarity as KpiItem["polarity"],
        checkInCadence: (row.checkInCadence as CheckInCadence | null) ?? undefined,
        parentKpiItemId: row.parentKpiItemId,
        cascadeMode: (row.cascadeMode as KpiItem["cascadeMode"]) ?? undefined,
        directMix: (row.directMix as KpiItem["directMix"]) ?? undefined,
      }),
    ),
    checkIns: checkIns.map(
      (row): CheckInRecord => ({
        id: row.id,
        tenantId: row.tenantId,
        kpiItemId: row.kpiItemId,
        date: row.date,
        window: row.window,
        actual: row.actual,
        note: row.note,
      }),
    ),
    audit: audit.map(
      (row): AuditEntry => ({
        id: row.id,
        at: row.at,
        actorRole: row.actorRole as Role,
        actorPersonId: row.actorPersonId,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        detail: row.detail,
      }),
    ),
  };
}

export async function saveTenantState(state: AppState): Promise<void> {
  const prisma = getPrisma();
  const tenantId = TENANT_ID;
  const previous = await prisma.user.findMany({
    where: { tenantId },
    select: { personId: true, email: true },
  });
  const changes = loginEmailChanges(previous, state.users ?? []);
  if (changes.length > 0) {
    const { applyLoginEmailChanges, firebaseAuthConfigured } = await import("./firebase-auth");
    if (!firebaseAuthConfigured()) throw new Error("Firebase Auth is not configured");
    await applyLoginEmailChanges(changes);
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenant.upsert({
      where: { id: tenantId },
      create: {
        id: tenantId,
        currentRole: state.currentRole,
        currentPersonId: state.currentPersonId,
      },
      update: {
        currentRole: state.currentRole,
        currentPersonId: state.currentPersonId,
      },
    });

    for (const row of state.people) {
      await tx.person.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          tenantId,
          legalName: row.legalName,
          preferredName: row.preferredName,
          email: row.email,
          phone: row.phone,
          emergencyContactName: row.emergencyContactName,
          emergencyContactPhone: row.emergencyContactPhone,
          linkedIn: row.linkedIn ?? null,
          skills: row.skills,
          educationNotes: row.educationNotes,
          experienceNotes: row.experienceNotes,
          certifications: row.certifications,
          educations: json(row.educations),
          experiences: json(row.experiences),
          certificationRows: json(row.certificationRows),
          skillRows: json(row.skillRows),
        },
        update: {
          legalName: row.legalName,
          preferredName: row.preferredName,
          email: row.email,
          phone: row.phone,
          emergencyContactName: row.emergencyContactName,
          emergencyContactPhone: row.emergencyContactPhone,
          linkedIn: row.linkedIn ?? null,
          skills: row.skills,
          educationNotes: row.educationNotes,
          experienceNotes: row.experienceNotes,
          certifications: row.certifications,
          educations: json(row.educations),
          experiences: json(row.experiences),
          certificationRows: json(row.certificationRows),
          skillRows: json(row.skillRows),
        },
      });
    }

    for (const row of state.users ?? []) {
      const existing = await tx.user.findFirst({
        where: {
          tenantId,
          OR: [{ id: row.id }, { personId: row.personId }],
        },
      });
      if (!existing) {
        await tx.user.create({
          data: {
            id: row.id,
            tenantId,
            personId: row.personId,
            email: row.email,
            passwordHash: "",
            role: row.role,
            adminGrant: Boolean(row.adminGrant),
            mustSetPassword: row.mustSetPassword,
            authEpoch: row.authEpoch ?? 0,
          },
        });
      } else {
        const emailChanged = existing.email.toLowerCase() !== row.email.toLowerCase();
        const authEpoch = emailChanged
          ? Math.max(existing.authEpoch + 1, row.authEpoch ?? 0)
          : Math.max(existing.authEpoch, row.authEpoch ?? existing.authEpoch);
        await tx.user.update({
          where: { id: existing.id },
          data: {
            email: row.email,
            role: row.role,
            adminGrant: Boolean(row.adminGrant),
            authEpoch,
            ...(emailChanged ? { mustSetPassword: true } : {}),
          },
        });
      }
    }

    for (const row of state.employments) {
      await tx.employment.upsert({
        where: { id: row.id },
        create: { ...row, tenantId },
        update: {
          personId: row.personId,
          joinDate: row.joinDate,
          endDate: row.endDate,
          status: row.status,
          contractType: row.contractType,
        },
      });
    }

    for (const row of topo(state.orgUnits)) {
      await tx.orgUnit.upsert({
        where: { id: row.id },
        create: { ...row, tenantId, parentId: row.parentId },
        update: { name: row.name, parentId: row.parentId },
      });
    }

    for (const row of state.grades) {
      await tx.grade.upsert({
        where: { id: row.id },
        create: { ...row, tenantId },
        update: { code: row.code, name: row.name },
      });
    }

    for (const row of topo(
      state.positions.map((row) => ({ ...row, parentId: row.reportsToPositionId })),
    )) {
      await tx.position.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          tenantId,
          title: row.title,
          gradeId: row.gradeId,
          orgUnitId: row.orgUnitId,
          reportsToPositionId: row.reportsToPositionId,
        },
        update: {
          title: row.title,
          gradeId: row.gradeId,
          orgUnitId: row.orgUnitId,
          reportsToPositionId: row.reportsToPositionId,
        },
      });
    }

    for (const row of state.assignments) {
      await tx.assignment.upsert({
        where: { id: row.id },
        create: { ...row, tenantId },
        update: {
          personId: row.personId,
          positionId: row.positionId,
          startDate: row.startDate,
          endDate: row.endDate,
        },
      });
    }

    for (const row of state.cvs) {
      await tx.curriculumVitae.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          tenantId,
          personId: row.personId,
          fileName: row.fileName,
          uploadedAt: row.uploadedAt,
          state: row.state,
          extractedText: row.extractedText,
          fields: json(row.fields),
        },
        update: {
          personId: row.personId,
          fileName: row.fileName,
          uploadedAt: row.uploadedAt,
          state: row.state,
          extractedText: row.extractedText,
          fields: json(row.fields),
        },
      });
    }

    for (const row of state.corrections) {
      await tx.correctionRequest.upsert({
        where: { id: row.id },
        create: { ...row, tenantId },
        update: {
          personId: row.personId,
          field: row.field,
          currentValue: row.currentValue,
          proposedValue: row.proposedValue,
          status: row.status,
        },
      });
    }

    for (const row of state.cycles) {
      const phase = normalizeKpiYearPhase(row);
      let status = row.status;
      if (phase === "closed") status = "closed";
      else if (phase === "planning" || phase === "monitoring") status = "open";
      else status = "draft";
      await tx.kpiCycle.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          tenantId,
          name: row.name,
          year: row.year,
          status,
          phase,
          planningEndsOn: row.planningEndsOn ?? null,
          adjustmentOpen: row.adjustmentOpen ?? false,
          checkInCadence: row.checkInCadence,
          checkInWindows: json(row.checkInWindows),
        },
        update: {
          name: row.name,
          year: row.year,
          status,
          phase,
          planningEndsOn: row.planningEndsOn ?? null,
          adjustmentOpen: row.adjustmentOpen ?? false,
          checkInCadence: row.checkInCadence,
          checkInWindows: json(row.checkInWindows),
        },
      });
    }

    for (const row of state.kpiSets) {
      await tx.kpiSet.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          tenantId,
          assignmentId: row.assignmentId,
          cycleId: row.cycleId,
          status: row.status,
          readyForAgreement: row.status === "pending" || Boolean(row.readyForAgreement),
          lineManagerApprovedBy: row.lineManagerApprovedBy ?? null,
          adminApprovedBy: row.adminApprovedBy ?? null,
          returnComment: row.returnComment ?? null,
          score: row.score ?? null,
        },
        update: {
          assignmentId: row.assignmentId,
          cycleId: row.cycleId,
          status: row.status,
          readyForAgreement: row.status === "pending" || Boolean(row.readyForAgreement),
          lineManagerApprovedBy: row.lineManagerApprovedBy ?? null,
          adminApprovedBy: row.adminApprovedBy ?? null,
          returnComment: row.returnComment ?? null,
          score: row.score ?? null,
        },
      });
    }

    for (const row of state.kpiItems) {
      await tx.kpiItem.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          tenantId,
          kpiSetId: row.kpiSetId,
          name: row.name,
          definition: row.definition,
          target: row.target,
          unit: row.unit,
          weight: row.weight,
          polarity: row.polarity,
          checkInCadence: row.checkInCadence ?? null,
          parentKpiItemId: null,
          cascadeMode: row.cascadeMode ?? null,
          directMix: row.directMix ?? null,
        },
        update: {
          kpiSetId: row.kpiSetId,
          name: row.name,
          definition: row.definition,
          target: row.target,
          unit: row.unit,
          weight: row.weight,
          polarity: row.polarity,
          checkInCadence: row.checkInCadence ?? null,
          cascadeMode: row.cascadeMode ?? null,
          directMix: row.directMix ?? null,
        },
      });
    }

    for (const row of state.kpiItems) {
      await tx.kpiItem.update({
        where: { id: row.id },
        data: { parentKpiItemId: row.parentKpiItemId ?? null },
      });
    }

    for (const row of state.checkIns) {
      await tx.checkIn.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          tenantId,
          kpiItemId: row.kpiItemId,
          date: row.date,
          window: row.window,
          actual: row.actual,
          note: row.note,
        },
        update: {
          kpiItemId: row.kpiItemId,
          date: row.date,
          window: row.window,
          actual: row.actual,
          note: row.note,
        },
      });
    }

    for (const row of state.audit) {
      await tx.auditEntry.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          tenantId,
          at: row.at,
          actorRole: row.actorRole,
          actorPersonId: row.actorPersonId,
          action: row.action,
          entity: row.entity,
          entityId: row.entityId,
          detail: row.detail,
        },
        update: {
          at: row.at,
          actorRole: row.actorRole,
          actorPersonId: row.actorPersonId,
          action: row.action,
          entity: row.entity,
          entityId: row.entityId,
          detail: row.detail,
        },
      });
    }

    const keep = {
      people: state.people.map((row) => row.id),
      employments: state.employments.map((row) => row.id),
      orgUnits: state.orgUnits.map((row) => row.id),
      grades: state.grades.map((row) => row.id),
      positions: state.positions.map((row) => row.id),
      assignments: state.assignments.map((row) => row.id),
      cvs: state.cvs.map((row) => row.id),
      corrections: state.corrections.map((row) => row.id),
      cycles: state.cycles.map((row) => row.id),
      kpiSets: state.kpiSets.map((row) => row.id),
      kpiItems: state.kpiItems.map((row) => row.id),
      checkIns: state.checkIns.map((row) => row.id),
      audit: state.audit.map((row) => row.id),
    };

    await tx.checkIn.deleteMany({ where: { tenantId, id: { notIn: keep.checkIns } } });
    await tx.kpiItem.updateMany({
      where: { tenantId, id: { notIn: keep.kpiItems } },
      data: { parentKpiItemId: null },
    });
    await tx.kpiItem.deleteMany({ where: { tenantId, id: { notIn: keep.kpiItems } } });
    await tx.kpiSet.deleteMany({ where: { tenantId, id: { notIn: keep.kpiSets } } });
    await tx.curriculumVitae.deleteMany({ where: { tenantId, id: { notIn: keep.cvs } } });
    await tx.correctionRequest.deleteMany({ where: { tenantId, id: { notIn: keep.corrections } } });
    await tx.auditEntry.deleteMany({ where: { tenantId, id: { notIn: keep.audit } } });
    await tx.assignment.deleteMany({ where: { tenantId, id: { notIn: keep.assignments } } });
    await tx.employment.deleteMany({ where: { tenantId, id: { notIn: keep.employments } } });
    await tx.position.updateMany({
      where: { tenantId, id: { notIn: keep.positions } },
      data: { reportsToPositionId: null },
    });
    await tx.position.deleteMany({ where: { tenantId, id: { notIn: keep.positions } } });
    await tx.orgUnit.updateMany({
      where: { tenantId, id: { notIn: keep.orgUnits } },
      data: { parentId: null },
    });
    await tx.orgUnit.deleteMany({ where: { tenantId, id: { notIn: keep.orgUnits } } });
    await tx.grade.deleteMany({ where: { tenantId, id: { notIn: keep.grades } } });
    await tx.kpiCycle.deleteMany({ where: { tenantId, id: { notIn: keep.cycles } } });
    await tx.user.deleteMany({ where: { tenantId, personId: { notIn: keep.people } } });
    await tx.person.deleteMany({ where: { tenantId, id: { notIn: keep.people } } });
  });
}
