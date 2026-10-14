import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import { buildReport, REPORT_DEFAULTS } from "./report-model";
import { buildReportWorkbook } from "./report-workbook";
import type { AppState, LeaveRequest, Project, TimeBlock } from "./types";

function project(id: string, code: string): Project {
  return { id, tenantId: "kmplus", code, name: `${code} work`, clientName: null, startDate: "2026-01-01", endDate: null };
}

function block(id: string, personId: string, day: string, hours: number, projectId: string | null): TimeBlock {
  const end = String(9 + hours).padStart(2, "0");
  return { id, tenantId: "kmplus", personId, typeId: "type-x", startAt: `${day}T09:00`, endAt: `${day}T${end}:00`, projectId, workItemId: null, title: id };
}

const LEAVE: LeaveRequest = {
  id: "",
  tenantId: "kmplus",
  personId: "",
  kind: "cuti",
  leaveTypeId: null,
  coverPersonId: null,
  doctorLetterPath: null,
  note: "",
  spanMode: "days",
  startDate: "",
  endDate: "",
  startTime: null,
  endTime: null,
  decision: null,
  decidedByPersonId: null,
};

function state(): AppState {
  return {
    ...createInitialState(),
    // Fri 9 Oct, so October has 21 working days.
    publicHolidays: [{ id: "h1", tenantId: "kmplus", date: "2026-10-09", name: "Company day", origin: "internal", suppressed: false, nameLocked: false }],
    invites: [],
    leaveTypes: [{ id: "lt-tahunan", tenantId: "kmplus", name: "Tahunan", sortOrder: 0 }],
    leaveRequests: [
      { ...LEAVE, id: "l1", personId: "person-rayhan", kind: "cuti", leaveTypeId: "lt-tahunan", startDate: "2026-10-12", endDate: "2026-10-13", decision: "paid" },
      { ...LEAVE, id: "l3", personId: "person-eka", kind: "remote", startDate: "2026-10-06", endDate: "2026-10-06", decision: "paid" },
      { ...LEAVE, id: "l2", personId: "person-eka", kind: "sick", spanMode: "hours", startDate: "2026-10-14", endDate: "2026-10-14", startTime: "13:00", endTime: "15:30", decision: "unpaid" },
    ],
    staffings: [],
    projects: [project("p1", "AAA"), project("p2", "BBB")],
    timeBlocks: [block("a", "person-rayhan", "2026-10-05", 6, "p1"), block("b", "person-eka", "2026-10-06", 2, "p2"), block("c", "person-eka", "2026-10-07", 1, null)],
  };
}

async function readBack() {
  const config = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", title: "Samudra Energi, October hours", preparedFor: "PT Samudra Energi" };
  const report = buildReport(state(), config, { generatedBy: "Alvin Soleh", generatedAt: "13 Oct 2026, 10:42" });
  const logo = new Uint8Array(readFileSync(path.join(process.cwd(), "public/brand/kmplus-logo-official.png")));
  const bytes = await buildReportWorkbook(ExcelJS, report, logo);
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
    expect(sheet.getCell(3, 1).value).toBe("Projects: All projects · People: Everyone · Time with no project: Included");
  });

  it("opens with a portrait Cover sheet holding the mark, the title, Prepared for, the filters, and links to each sheet", async () => {
    const workbook = await readBack();
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Cover", "Summary", "Timesheet by person", "Daily grid", "Approved leave"]);
    expect(workbook.title).toBe("Samudra Energi, October hours");
    const cover = workbook.getWorksheet("Cover")!;
    const texts: string[] = [];
    const links: string[] = [];
    cover.eachRow((row) =>
      row.eachCell((cell) => {
        const value = cell.value;
        if (typeof value === "string") texts.push(value);
        else if (value && typeof value === "object" && "hyperlink" in value) links.push(`${value.text} → ${value.hyperlink}`);
      }),
    );
    expect(texts).toEqual(expect.arrayContaining(["Samudra Energi, October hours", "Prepared for PT Samudra Energi", "1 Oct 2026 – 31 Oct 2026", "Projects", "All projects", "Generated by", "Alvin Soleh"]));
    expect(links).toEqual(["Summary → #'Summary'!A1", "Timesheet by person → #'Timesheet by person'!A1", "Daily grid → #'Daily grid'!A1", "Approved leave → #'Approved leave'!A1"]);
    expect(cover.getImages()).toHaveLength(1);
    expect(cover.pageSetup.orientation).toBe("portrait");
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
    expect(sheet.headerFooter.oddFooter).toContain("&8 1 Oct 2026 – 31 Oct 2026");
  });

  it("writes Timesheet by person with a numeric column per Project and SUM totals", async () => {
    const sheet = (await readBack()).getWorksheet("Timesheet by person")!;
    expect(sheet.getRow(3).values).toEqual([undefined, "Person", "Hours", "Days logged", "Working days", "AAA", "BBB", "No project"]);
    expect(rowOf(sheet, "Eka").values).toEqual([undefined, "Eka", 3, 2, 21, null, 2, 1].map((value) => value ?? undefined));
    const total = rowOf(sheet, "Total");
    expect((total.getCell(2).value as ExcelJS.CellFormulaValue).formula).toBe("SUM(B4:B5)");
    expect((total.getCell(5).value as ExcelJS.CellFormulaValue).formula).toBe("SUM(E4:E5)");
    expect(sheet.views[0]).toMatchObject({ state: "frozen", xSplit: 1, ySplit: 3 });
    expect(sheet.autoFilter).toBe("A3:G5");
    expect(sheet.pageSetup).toMatchObject({ orientation: "landscape", printTitlesRow: "3:3" });
  });

  it("writes Approved leave with real dates, part-day hours, and SUM totals", async () => {
    const sheet = (await readBack()).getWorksheet("Approved leave")!;
    const cuti = rowOf(sheet, "Rayhan");
    expect(cuti.getCell(3).value).toEqual(new Date("2026-10-12T00:00:00Z"));
    expect(cuti.getCell(3).numFmt).toBe("d mmm yyyy");
    expect([cuti.getCell(2).value, cuti.getCell(7).value, cuti.getCell(8).value]).toEqual(["Cuti · Tahunan", 2, "Paid"]);
    let sick: ExcelJS.Row | undefined;
    sheet.eachRow((row) => {
      if (row.getCell(2).value === "Sick") sick = row;
    });
    if (!sick) throw new Error("No Sick row");
    expect([sick.getCell(5).value, sick.getCell(6).value, sick.getCell(7).value, sick.getCell(8).value]).toEqual(["13:00–15:30", 2.5, 0, "Unpaid"]);
    const total = rowOf(sheet, "Total");
    expect((total.getCell(6).value as ExcelJS.CellFormulaValue).formula).toBe("SUM(F4:F6)");
    expect((total.getCell(7).value as ExcelJS.CellFormulaValue).formula).toBe("SUM(G4:G6)");
  });

  it("prints one line on a section sheet with no rows, and leaves out sections that are off", async () => {
    const report = buildReport(state(), { ...REPORT_DEFAULTS, from: "2027-03-01", to: "2027-03-31", sections: ["leave"] }, { generatedBy: "Alvin Soleh", generatedAt: "13 Oct 2026, 10:42" });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await buildReportWorkbook(ExcelJS, report, null)).buffer as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Approved leave"]);
    expect(workbook.getWorksheet("Approved leave")!.getCell(4, 1).value).toBe("No approved leave between 1 Mar and 31 Mar 2027.");
  });

  it("writes the Daily grid with a merged month band, frozen names, numeric remote and part-day cells, and SUM totals", async () => {
    const sheet = (await readBack()).getWorksheet("Daily grid")!;
    // October runs from column C (1 Oct) to AG (31 Oct) under one merged band.
    expect(sheet.getCell("C3").value).toBe("October 2026");
    expect(sheet.getCell("AG3").master.address).toBe("C3");
    expect([sheet.getCell("C4").value, sheet.getCell("C5").value]).toEqual([1, "T"]);
    expect(JSON.stringify(sheet.getCell("K4").note)).toContain("Company day");
    expect(sheet.views[0]).toMatchObject({ state: "frozen", xSplit: 2, ySplit: 5 });
    expect(sheet.pageSetup).toMatchObject({ printTitlesRow: "3:5", printTitlesColumn: "A:B" });

    const eka = rowOf(sheet, "Eka");
    // 6 Oct: 2 hours while remote; 14 Oct: part-day sick with no hours worked; 7 Oct: plain hours.
    expect([eka.getCell("H").value, eka.getCell("H").numFmt]).toEqual([2, '0.0" R"']);
    expect([eka.getCell("P").value, eka.getCell("P").numFmt]).toEqual([0, '0.0" S"']);
    expect([eka.getCell("I").value, eka.getCell("I").numFmt]).toEqual([1, "0.0"]);
    expect((eka.getCell("B").value as ExcelJS.CellFormulaValue).formula).toBe(`SUM(C${eka.number}:AG${eka.number})`);
    const rayhan = rowOf(sheet, "Rayhan");
    expect([rayhan.getCell("N").value, rayhan.getCell("O").value]).toEqual(["Cuti", "Cuti"]);
    expect((rayhan.getCell("N").fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFD1E4E2");

    const total = rowOf(sheet, "Total");
    expect((total.getCell("B").value as ExcelJS.CellFormulaValue).formula).toBe("SUM(B6:B7)");
    expect((total.getCell("C").value as ExcelJS.CellFormulaValue).formula).toBe("SUM(C6:C7)");
    expect(total.getCell("C").numFmt).toBe("0.0;-0.0;;@");
  });

  describe("hours by project, staffing, and projects", () => {
    async function portfolioBook() {
      const base = state();
      const portfolio: AppState = {
        ...base,
        projects: [{ ...project("p1", "AAA"), clientName: "PT Samudra Energi", endDate: "2026-12-31" }, project("p2", "BBB")],
        workItems: [{ id: "w1", tenantId: "kmplus", projectId: "p1", name: "Design", description: "", picPersonId: "person-rayhan", startDate: "2026-01-01", endDate: "2026-12-31" }],
        timeBlocks: base.timeBlocks.map((row) => (row.id === "a" ? { ...row, workItemId: "w1" } : row)),
        staffings: [
          { id: "s1", tenantId: "kmplus", personId: "person-rayhan", projectId: "p1", load: 80, startDate: "2026-09-01", endDate: null },
          { id: "s2", tenantId: "kmplus", personId: "person-rayhan", projectId: "p2", load: 40, startDate: "2026-10-01", endDate: "2026-12-31" },
        ],
      };
      const config = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", sections: ["cover" as const, "hoursByProject" as const, "staffing" as const, "projects" as const] };
      const report = buildReport(portfolio, config, { generatedBy: "Alvin Soleh", generatedAt: "13 Oct 2026, 10:42" });
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load((await buildReportWorkbook(ExcelJS, report, null)).buffer as ArrayBuffer);
      return workbook;
    }

    it("orders the sheets by section and links each from the Cover", async () => {
      const workbook = await portfolioBook();
      expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Cover", "Hours by project", "Staffing", "Projects"]);
    });

    it("writes Hours by project with washed Project rows, breakdowns, and a total over Project rows only", async () => {
      const sheet = (await portfolioBook()).getWorksheet("Hours by project")!;
      const values = (row: ExcelJS.Row) => [row.getCell(1).value, row.getCell(2).value, row.getCell(3).value, row.getCell(4).value];
      expect(values(sheet.getRow(4))).toEqual(["AAA · AAA work", "Project", "", 6]);
      expect(values(sheet.getRow(5))).toEqual(["AAA · AAA work", "Person", "Rayhan", 6]);
      expect(values(sheet.getRow(6))).toEqual(["AAA · AAA work", "Work item", "Design", 6]);
      expect((sheet.getCell("A4").fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFF4F4F4");
      const total = rowOf(sheet, "Total").getCell(4).value as ExcelJS.CellFormulaValue;
      expect(total.formula).toMatch(/^SUMIF\(B4:B\d+,"Project",D4:D\d+\)$/);
      expect(total.result).toBe(9);
    });

    it("writes Staffing with the Load format, real dates, No end, and the peak in warning past 100%", async () => {
      const sheet = (await portfolioBook()).getWorksheet("Staffing")!;
      const aaa = sheet.getRow(4);
      expect([aaa.getCell(2).value, aaa.getCell(3).value, aaa.getCell(3).numFmt]).toEqual(["AAA · AAA work", 80, '0"%"']);
      expect([aaa.getCell(4).value, aaa.getCell(4).numFmt, aaa.getCell(5).value]).toEqual([new Date("2026-09-01T00:00:00Z"), "d mmm yyyy", "No end"]);
      expect([aaa.getCell(6).value, aaa.getCell(6).font.color?.argb]).toEqual([120, "FF8A5E10"]);
    });

    it("writes Projects with client, dates, People, and a SUM of hours", async () => {
      const sheet = (await portfolioBook()).getWorksheet("Projects")!;
      expect([1, 2, 3, 5, 6, 7].map((column) => sheet.getRow(4).getCell(column).value)).toEqual(["AAA", "AAA work", "PT Samudra Energi", new Date("2026-12-31T00:00:00Z"), 1, 6]);
      expect([3, 5].map((column) => sheet.getRow(5).getCell(column).value)).toEqual(["Internal", "No end"]);
      expect((rowOf(sheet, "Total").getCell(7).value as ExcelJS.CellFormulaValue).formula).toBe("SUM(G4:G5)");
    });
  });

  it("writes Timesheet detail with one row per counted block, real dates, sorted by date and start, and a SUM of hours", async () => {
    const report = buildReport(state(), { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", sections: ["timesheetDetail"] }, { generatedBy: "Alvin Soleh", generatedAt: "13 Oct 2026, 10:42" });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await buildReportWorkbook(ExcelJS, report, null)).buffer as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Timesheet detail"]);
    const sheet = workbook.getWorksheet("Timesheet detail")!;
    expect(sheet.getRow(3).values).toEqual([undefined, "Date", "Start", "End", "Person", "Project", "Work item", "Type", "Title", "Hours"]);
    expect([4, 5, 6].map((r) => [sheet.getRow(r).getCell(1).value, sheet.getRow(r).getCell(4).value, sheet.getRow(r).getCell(5).value, sheet.getRow(r).getCell(9).value])).toEqual([
      [new Date("2026-10-05T00:00:00Z"), "Rayhan", "AAA", 6],
      [new Date("2026-10-06T00:00:00Z"), "Eka", "BBB", 2],
      [new Date("2026-10-07T00:00:00Z"), "Eka", "No project", 1],
    ]);
    expect([sheet.getCell("A4").numFmt, sheet.getCell("B4").value, sheet.getCell("C4").value]).toEqual(["d mmm yyyy", "09:00", "15:00"]);
    expect((rowOf(sheet, "Total").getCell(9).value as ExcelJS.CellFormulaValue).formula).toBe("SUM(I4:I6)");
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 3 });
    expect(sheet.autoFilter).toBe("A3:I6");
  });
});
