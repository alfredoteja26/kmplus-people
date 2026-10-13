import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import { buildReport, NO_FILTERS } from "./report-model";
import { buildReportWorkbook } from "./report-workbook";
import type { AppState, Project, TimeBlock } from "./types";

function project(id: string, code: string): Project {
  return { id, tenantId: "kmplus", code, name: `${code} work`, clientName: null, startDate: "2026-01-01", endDate: null };
}

function block(id: string, personId: string, day: string, hours: number, projectId: string | null): TimeBlock {
  const end = String(9 + hours).padStart(2, "0");
  return { id, tenantId: "kmplus", personId, typeId: "type-x", startAt: `${day}T09:00`, endAt: `${day}T${end}:00`, projectId, workItemId: null, title: id };
}

function state(): AppState {
  return {
    ...createInitialState(),
    publicHolidays: [],
    invites: [],
    leaveRequests: [],
    staffings: [],
    projects: [project("p1", "AAA"), project("p2", "BBB")],
    timeBlocks: [block("a", "person-rayhan", "2026-10-05", 6, "p1"), block("b", "person-eka", "2026-10-06", 2, "p2"), block("c", "person-eka", "2026-10-07", 1, null)],
  };
}

async function readBack() {
  const report = buildReport(state(), { ...NO_FILTERS, from: "2026-10-01", to: "2026-10-31" }, { generatedBy: "Alvin Soleh", generatedAt: "13 Oct 2026, 10:42" });
  const bytes = await buildReportWorkbook(ExcelJS, report);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
  return workbook;
}

/** The row whose first cell reads `label`. */
function rowOf(sheet: ExcelJS.Worksheet, label: string): ExcelJS.Row {
  let found: ExcelJS.Row | undefined;
  sheet.eachRow((row) => {
    if (!found && row.getCell(1).value === label) found = row;
  });
  if (!found) throw new Error(`No row "${label}"`);
  return found;
}

describe("Report workbook", () => {
  it("has a Summary sheet with the figures, Project hours, and a totals formula", async () => {
    const sheet = (await readBack()).getWorksheet("Summary");
    expect(sheet).toBeDefined();
    expect(rowOf(sheet!, "Hours logged").getCell(2).value).toBe(9);
    expect(rowOf(sheet!, "AAA · AAA work").getCell(2).value).toBe(6);
    expect(rowOf(sheet!, "No project").getCell(2).value).toBe(1);
    const total = rowOf(sheet!, "Total").getCell(2).value as ExcelJS.CellFormulaValue;
    expect(total.formula).toMatch(/^SUM\(B\d+:B\d+\)$/);
  });

  it("names the filters in plain words under the range", async () => {
    const sheet = (await readBack()).getWorksheet("Summary")!;
    expect(sheet.getCell(3, 1).value).toBe("Projects: All projects · People: Everyone · Time with no project included");
  });

  it("styles the Summary like the brand and sets it up to print on A4 landscape", async () => {
    const sheet = (await readBack()).getWorksheet("Summary")!;
    const header = rowOf(sheet, "Figure").getCell(1);
    expect((header.fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FF1A7870");
    expect(rowOf(sheet, "Hours logged").getCell(2).numFmt).toBe("#,##0.0");
    expect(sheet.views[0]).toMatchObject({ state: "frozen", xSplit: 1, ySplit: 4, showGridLines: false });
    expect(sheet.pageSetup).toMatchObject({ paperSize: 9, orientation: "landscape" });
    expect(sheet.headerFooter.oddHeader).toContain("CONFIDENTIAL");
    expect(sheet.headerFooter.oddFooter).toContain("Page &P of &N");
  });
});
