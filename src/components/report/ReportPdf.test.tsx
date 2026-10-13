import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/fixtures";
import { buildReport, NO_FILTERS } from "@/lib/report-model";
import type { AppState, TimeBlock } from "@/lib/types";
import { registerReportFonts, ReportPdf } from "./ReportPdf";

void React;

function block(id: string, day: string): TimeBlock {
  return { id, tenantId: "kmplus", personId: "person-rayhan", typeId: "type-x", startAt: `${day}T09:00`, endAt: `${day}T15:00`, projectId: null, workItemId: null, title: id };
}

const state: AppState = { ...createInitialState(), timeBlocks: [block("a", "2026-10-05"), block("b", "2026-03-02")], invites: [] };
const stamp = { generatedBy: "Alvin Soleh", generatedAt: "13 Oct 2026, 10:42" };

async function pages(from: string, to: string) {
  registerReportFonts(path.join(process.cwd(), "public/fonts/report"));
  const pdf = await renderToBuffer(<ReportPdf report={buildReport(state, { ...NO_FILTERS, from, to }, stamp)} />);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

describe("Report PDF", () => {
  it("builds for one month, twelve months, and an empty range", async () => {
    expect(await pages("2026-10-01", "2026-10-31")).toBeGreaterThan(0);
    expect(await pages("2025-11-01", "2026-10-31")).toBeGreaterThan(0);
    expect(await pages("2027-03-01", "2027-03-31")).toBeGreaterThan(0);
  }, 30_000);
});
