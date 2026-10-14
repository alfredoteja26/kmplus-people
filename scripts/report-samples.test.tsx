/**
 * Writes sample Reports for checking the PDF templates and the workbook by eye against DESIGN.md: one PDF per
 * ReportTemplate and one xlsx, all sections on, over a billing cycle with leave, holidays, and an overload.
 * Skipped in `npm test`. Run it with a folder for the files:
 *   REPORT_SAMPLES=/tmp/report-samples npx vitest run scripts/report-samples.test.tsx
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import React from "react";
import { it } from "vitest";
import { registerReportFonts, ReportPdf } from "@/components/report/ReportPdf";
import { createInitialState } from "@/lib/fixtures";
import { buildReport, REPORT_DEFAULTS, REPORT_TEMPLATES, SECTION_KEYS } from "@/lib/report-model";
import { buildReportWorkbook } from "@/lib/report-workbook";
import type { AppState, LeaveRequest, Project, TimeBlock } from "@/lib/types";
import { addDaysIso } from "@/lib/work-delivery-query";

void React;

const OUT = process.env.REPORT_SAMPLES;

function sampleState(): AppState {
  const base = createInitialState();
  const people = base.people.slice(0, 10);
  const projects: Project[] = [
    { id: "p-smd", tenantId: "kmplus", code: "SMD-ERP", name: "Samudra ERP rollout", clientName: "PT Samudra Energi", startDate: "2026-01-05", endDate: "2026-12-18" },
    { id: "p-bhd", tenantId: "kmplus", code: "BHD-DWH", name: "Bahari data warehouse", clientName: "PT Bahari", startDate: "2026-06-01", endDate: null },
  ];
  const workItems = ["Discovery", "Build", "Testing"].map((name, index) => ({
    id: `w-${index}`,
    tenantId: "kmplus",
    projectId: index < 2 ? "p-smd" : "p-bhd",
    name,
    description: "",
    picPersonId: people[0].id,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  }));
  const leave = (id: string, personIndex: number, kind: LeaveRequest["kind"], startDate: string, endDate: string, part?: [string, string]): LeaveRequest => ({
    id,
    tenantId: "kmplus",
    personId: people[personIndex].id,
    kind,
    leaveTypeId: kind === "cuti" ? (base.leaveTypes[0]?.id ?? null) : null,
    coverPersonId: null,
    doctorLetterPath: null,
    note: id,
    spanMode: part ? "hours" : "days",
    startDate,
    endDate,
    startTime: part?.[0] ?? null,
    endTime: part?.[1] ?? null,
    decision: personIndex % 2 ? "paid" : "unpaid",
    decidedByPersonId: null,
  });
  const leaveRequests = [
    leave("cuti", 0, "cuti", "2026-09-24", "2026-09-29"),
    leave("sick", 1, "sick", "2026-10-01", "2026-10-02"),
    leave("remote", 2, "remote", "2026-09-22", "2026-09-23"),
    leave("half", 3, "cuti", "2026-10-07", "2026-10-07", ["13:00", "17:00"]),
  ];
  const away = (personId: string, day: string) =>
    leaveRequests.some((row) => row.personId === personId && row.spanMode === "days" && row.kind !== "remote" && day >= row.startDate && day <= row.endDate);
  const timeBlocks: TimeBlock[] = [];
  for (let day = "2026-09-21"; day <= "2026-10-20"; day = addDaysIso(day, 1)) {
    if ([0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay())) continue;
    people.forEach((person, index) => {
      // The eighth Person is staffed but logs nothing, so the warning colour shows.
      if (index === 7 || away(person.id, day)) return;
      const projectId = index % 3 === 2 ? null : index % 2 ? "p-bhd" : "p-smd";
      timeBlocks.push({
        id: `${person.id}-${day}`,
        tenantId: "kmplus",
        personId: person.id,
        typeId: base.timeBlockTypes[0]?.id ?? "type",
        startAt: `${day}T09:00`,
        endAt: `${day}T${String(13 + (index % 5)).padStart(2, "0")}:30`,
        projectId,
        workItemId: projectId ? workItems[(index + Number(day.slice(8))) % 3].id : null,
        title: "Sample work",
      });
    });
  }
  return {
    ...base,
    projects,
    workItems,
    leaveRequests,
    timeBlocks,
    invites: [],
    publicHolidays: [{ id: "h", tenantId: "kmplus", date: "2026-10-09", name: "Company day", origin: "internal", suppressed: false, nameLocked: false }],
    staffings: people.flatMap((person, index) => [
      { id: `s-${index}`, tenantId: "kmplus", personId: person.id, projectId: index % 2 ? "p-bhd" : "p-smd", load: 60 + (index % 3) * 20, startDate: "2026-02-01", endDate: null },
      // Two People take on a second Project in October and go past 100%.
      ...(index < 2 ? [{ id: `t-${index}`, tenantId: "kmplus", personId: person.id, projectId: "p-bhd", load: 50, startDate: "2026-10-10", endDate: "2026-11-30" }] : []),
    ]),
  };
}

it.skipIf(!OUT)("writes sample Reports for each template", async () => {
  const folder = OUT!;
  mkdirSync(folder, { recursive: true });
  registerReportFonts(path.join(process.cwd(), "public/fonts/report"));
  const logo = path.join(process.cwd(), "public/brand/kmplus-logo-official.png");
  const stamp = { generatedBy: "Alfredo", generatedAt: "14 Oct 2026, 12:00" };
  const config = { ...REPORT_DEFAULTS, from: "2026-09-21", to: "2026-10-20", sections: [...SECTION_KEYS], title: "Samudra Energi, September hours", preparedFor: "PT Samudra Energi" };
  for (const { key } of REPORT_TEMPLATES) {
    const report = buildReport(sampleState(), { ...config, template: key }, stamp);
    writeFileSync(path.join(folder, `sample-${key}.pdf`), await renderToBuffer(<ReportPdf report={report} logo={logo} />));
  }
  writeFileSync(path.join(folder, "sample.xlsx"), await buildReportWorkbook(ExcelJS, buildReport(sampleState(), config, stamp), new Uint8Array((await import("node:fs")).readFileSync(logo))));
}, 60_000);
