import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/fixtures";
import { buildReport, READY_SECTIONS, REPORT_DEFAULTS, type SectionKey } from "@/lib/report-model";
import type { AppState, TimeBlock } from "@/lib/types";
import { registerReportFonts, ReportPdf } from "./ReportPdf";

void React;

function block(id: string, day: string): TimeBlock {
  return { id, tenantId: "kmplus", personId: "person-rayhan", typeId: "type-x", startAt: `${day}T09:00`, endAt: `${day}T15:00`, projectId: null, workItemId: null, title: id };
}

const state: AppState = { ...createInitialState(), timeBlocks: [block("a", "2026-10-05"), block("b", "2026-03-02")], invites: [] };
const stamp = { generatedBy: "Alvin Soleh", generatedAt: "13 Oct 2026, 10:42" };

async function pages(from: string, to: string, sections: SectionKey[] = REPORT_DEFAULTS.sections) {
  registerReportFonts(path.join(process.cwd(), "public/fonts/report"));
  const pdf = await renderToBuffer(<ReportPdf report={buildReport(state, { ...REPORT_DEFAULTS, from, to, sections, preparedFor: "Samudra Energi" }, stamp)} logo={path.join(process.cwd(), "public/brand/kmplus-logo-official.png")} />);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

describe("Report PDF", () => {
  it("builds for one month, twelve months, and an empty range", async () => {
    // Cover, Summary, Timesheet by person, one Daily grid page, and Approved leave, each on its own page.
    expect(await pages("2026-10-01", "2026-10-31")).toBeGreaterThanOrEqual(5);
    // Twelve Daily grid pages, one per month.
    expect(await pages("2025-11-01", "2026-10-31")).toBeGreaterThanOrEqual(16);
    expect(await pages("2027-03-01", "2027-03-31")).toBeGreaterThan(0);
  }, 30_000);

  it("builds every ready section, each on its own page", async () => {
    // Cover, Summary, Hours by project, Timesheet by person, one Daily grid month, Staffing, Projects, Approved leave.
    expect(await pages("2026-10-01", "2026-10-31", [...READY_SECTIONS])).toBeGreaterThanOrEqual(8);
  }, 30_000);
});
