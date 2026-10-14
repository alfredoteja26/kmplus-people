import type ExcelJSModule from "exceljs";
import { clientLabel, personName } from "@/lib/project-view";
import { REPORT_COLORS, reportEmptyLine, reportFilterLine, reportLeaveLabel, reportRange, SECTION_LABEL, type Report, type SectionKey } from "@/lib/report-model";

/**
 * The Report as an xlsx workbook. ExcelJS is passed in so the page can load it only when Download xlsx is
 * pressed, and tests can use the Node build. Figures come from the Report model; this file only lays them out.
 */
type ExcelJS = typeof ExcelJSModule;
type Sheet = ExcelJSModule.Worksheet;
type Cell = ExcelJSModule.Cell;

const FONT = "Calibri";
/** ARGB, as ExcelJS wants it, from the shared Report palette. */
const COLOR = Object.fromEntries(Object.entries(REPORT_COLORS).map(([key, hex]) => [key, `FF${hex.slice(1)}`])) as Record<keyof typeof REPORT_COLORS, string>;
const HOURS_FORMAT = "#,##0.0";
const DATE_FORMAT = "d mmm yyyy";

/** An ISO date as a real spreadsheet date (UTC midnight, so no time zone shifts the day). */
const sheetDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

const solid = (argb: string): ExcelJSModule.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const hairline = { style: "thin" as const, color: { argb: COLOR.line } };

/** Title and context rows at the top of a sheet. */
function heading(sheet: Sheet, title: string, context: string, width: number) {
  sheet.mergeCells(1, 1, 1, width);
  Object.assign(sheet.getCell(1, 1), { value: title, font: { name: FONT, size: 16, bold: true, color: { argb: COLOR.ink } } });
  sheet.getRow(1).height = 26;
  sheet.mergeCells(2, 1, 2, width);
  Object.assign(sheet.getCell(2, 1), { value: context, font: { name: FONT, size: 10, color: { argb: COLOR.muted } } });
  sheet.getRow(2).height = 18;
}

type Align = "left" | "right";

/** A sage header band: white bold labels on the accent fill. */
function band(sheet: Sheet, row: number, labels: [string, Align][]) {
  labels.forEach(([label, align], index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = label;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.white } };
    cell.fill = solid(COLOR.accent);
    cell.alignment = { vertical: "middle", horizontal: align, indent: align === "left" ? 1 : 0 };
  });
  sheet.getRow(row).height = 22;
}

function bodyCell(cell: Cell, value: ExcelJSModule.CellValue, options: { numFmt?: string; align?: Align; warn?: boolean } = {}) {
  const align = options.align ?? (typeof value === "number" || options.numFmt ? "right" : "left");
  cell.value = value;
  cell.font = { name: FONT, size: 10, color: { argb: options.warn ? COLOR.warning : COLOR.ink }, bold: options.warn || undefined };
  if (options.numFmt) cell.numFmt = options.numFmt;
  cell.alignment = { vertical: "middle", horizontal: align, indent: align === "left" ? 1 : 0 };
  cell.border = { bottom: hairline };
}

function totalCell(cell: Cell, value: ExcelJSModule.CellValue, numFmt?: string) {
  bodyCell(cell, value, { numFmt });
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.ink } };
  cell.fill = solid(COLOR.tint);
  cell.border = { top: { style: "medium", color: { argb: COLOR.accent } } };
}

/** A4 landscape, the Confidential header, a "range · sheet · Page X of N" footer, and `repeat` rows on every page. */
function printSetup(sheet: Sheet, report: Report, repeat?: string, repeatColumns?: string) {
  sheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    ...(repeat ? { printTitlesRow: repeat } : {}),
    ...(repeatColumns ? { printTitlesColumn: repeatColumns } : {}),
  };
  sheet.headerFooter = {
    oddHeader: `&L&"${FONT},Bold"&9KMPlus People&R&"${FONT},Bold"&9&K8A5E10CONFIDENTIAL`,
    // The space after "&8" keeps the range's leading digits from being read as part of the font size.
    oddFooter: `&L&"${FONT}"&8 ${reportRange(report)}&C&"${FONT}"&8${sheet.name}&R&"${FONT}"&8Page &P of &N`,
  };
}

function summarySheet(workbook: ExcelJSModule.Workbook, report: Report) {
  const sheet = workbook.addWorksheet("Summary");
  const summary = report.summary;
  sheet.columns = [{ width: 36 }, { width: 14 }, { width: 12 }];
  heading(sheet, "Summary", `${reportRange(report)} · ${summary.workingDays} working days`, 3);
  sheet.mergeCells(3, 1, 3, 3);
  Object.assign(sheet.getCell(3, 1), { value: reportFilterLine(report), font: { name: FONT, size: 10, color: { argb: COLOR.muted } } });

  band(sheet, 4, [["Figure", "left"], ["Value", "right"]]);
  const facts: [string, number, string, boolean][] = [
    ["Hours logged", summary.totalHours, HOURS_FORMAT, false],
    ["On projects", summary.projectHours, HOURS_FORMAT, false],
    ["With no project", summary.noProjectHours, HOURS_FORMAT, false],
    ["People in the report", summary.people, "0", false],
    ["People past 100% load", summary.overloaded, "0", summary.overloaded > 0],
    ["Days away (cuti and sick)", summary.daysAway, "0", false],
  ];
  facts.forEach(([label, value, numFmt, warn], index) => {
    bodyCell(sheet.getCell(5 + index, 1), label);
    bodyCell(sheet.getCell(5 + index, 2), value, { numFmt, warn });
  });

  const head = 5 + facts.length + 1;
  band(sheet, head, [["Hours by project", "left"], ["Hours", "right"], ["Share", "right"]]);
  const first = head + 1;
  const last = head + report.hoursByProject.length;
  report.hoursByProject.forEach((row, index) => {
    const r = first + index;
    bodyCell(sheet.getCell(r, 1), row.project ? `${row.project.code} · ${row.project.name}` : "No project");
    bodyCell(sheet.getCell(r, 2), row.hours, { numFmt: HOURS_FORMAT });
    bodyCell(sheet.getCell(r, 3), { formula: `IF(SUM($B$${first}:$B$${last})=0,0,B${r}/SUM($B$${first}:$B$${last}))`, result: summary.totalHours ? row.hours / summary.totalHours : 0 }, { numFmt: "0%" });
  });
  if (report.hoursByProject.length === 0) {
    sheet.mergeCells(first, 1, first, 3);
    bodyCell(sheet.getCell(first, 1), `No hours between ${reportRange(report)}`);
    sheet.getCell(first, 1).font = { name: FONT, size: 10, italic: true, color: { argb: COLOR.muted } };
  } else {
    const r = last + 1;
    totalCell(sheet.getCell(r, 1), "Total");
    totalCell(sheet.getCell(r, 2), { formula: `SUM(B${first}:B${last})`, result: summary.totalHours }, HOURS_FORMAT);
    totalCell(sheet.getCell(r, 3), "");
  }
  for (let r = 5; r <= last + 1; r += 1) sheet.getRow(r).height = 20;

  const leaveHead = Math.max(last, first) + 3;
  band(sheet, leaveHead, [["Leave, working days", "left"], ["Paid", "right"], ["Unpaid", "right"]]);
  summary.leaveByKind.forEach((row, index) => {
    const r = leaveHead + 1 + index;
    bodyCell(sheet.getCell(r, 1), row.label);
    bodyCell(sheet.getCell(r, 2), row.paid, { numFmt: "0" });
    bodyCell(sheet.getCell(r, 3), row.unpaid, { numFmt: "0" });
    sheet.getRow(r).height = 20;
  });

  // Freeze through the first header band and the label column.
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 4, showGridLines: false }];
  printSetup(sheet, report);
}

type Column<T> = {
  header: string;
  value: (row: T) => ExcelJSModule.CellValue;
  numFmt?: string;
  align?: Align;
  /** A `SUM` of the column in the totals row. */
  sum?: boolean;
  /** Another totals formula, for a column whose rows are not all the same kind; `letter` maps a column number. */
  total?: (range: { first: number; last: number; letter: (column: number) => string }) => { formula: string; result: number };
  warn?: (row: T) => boolean;
  /** Indents a breakdown row's label under its parent. */
  indent?: (row: T) => boolean;
};

/** Fitted width: the longest header or value, in characters, within sensible bounds. */
function fitWidth<T>(column: Column<T>, rows: T[]): number {
  const text = (value: ExcelJSModule.CellValue) => (value instanceof Date ? "30 Sep 2026" : typeof value === "number" ? value.toFixed(1) : String(value ?? ""));
  const longest = Math.max(column.header.length, ...rows.map((row) => text(column.value(row)).length));
  return Math.min(60, Math.max(9, longest + 3));
}

/**
 * One section as its own sheet: a title and context row, a sage header band on row 3, body rows, and a tint
 * totals row of `SUM` formulas. The header and first column are frozen, the header has an autofilter and
 * repeats on every printed page.
 */
function tableSheet<T>(
  workbook: ExcelJSModule.Workbook,
  report: Report,
  options: { name: string; context: string; columns: Column<T>[]; rows: T[]; empty: string; emphasis?: (row: T) => boolean },
) {
  const { name, context, columns, rows } = options;
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map((column) => ({ width: fitWidth(column, rows) }));
  heading(sheet, name, context, columns.length);
  band(sheet, 3, columns.map((column) => [column.header, column.align ?? (column.numFmt ? "right" : "left")]));

  rows.forEach((row, index) => {
    columns.forEach((column, c) => {
      const cell = sheet.getCell(4 + index, c + 1);
      bodyCell(cell, column.value(row), { numFmt: column.numFmt, align: column.align, warn: column.warn?.(row) });
      if (column.indent?.(row)) cell.alignment = { ...cell.alignment, indent: 3 };
      if (options.emphasis?.(row)) {
        cell.fill = solid(COLOR.wash);
        cell.font = { ...cell.font, bold: true };
      }
    });
    sheet.getRow(4 + index).height = 20;
  });
  const last = 3 + rows.length;
  if (rows.length === 0) {
    sheet.mergeCells(4, 1, 4, columns.length);
    bodyCell(sheet.getCell(4, 1), options.empty);
    sheet.getCell(4, 1).font = { name: FONT, size: 10, italic: true, color: { argb: COLOR.muted } };
  } else if (columns.some((column) => column.sum || column.total)) {
    const letter = (column: number) => sheet.getColumn(column).letter;
    columns.forEach((column, c) => {
      const sum = { formula: `SUM(${letter(c + 1)}4:${letter(c + 1)}${last})`, result: rows.reduce((total, row) => total + Number(column.value(row) ?? 0), 0) };
      const value = column.total ? column.total({ first: 4, last, letter }) : column.sum ? sum : c === 0 ? "Total" : "";
      totalCell(sheet.getCell(last + 1, c + 1), value, column.sum || column.total ? column.numFmt : undefined);
    });
    sheet.getRow(last + 1).height = 20;
  }
  if (rows.length > 0) sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: last, column: columns.length } };
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 3, showGridLines: false }];
  printSetup(sheet, report, "3:3");
}

function timesheetByPersonSheet(workbook: ExcelJSModule.Workbook, report: Report) {
  // One numeric column per Project the Report has hours on, so the split sums and filters like the rest.
  const splits = report.hoursByProject.map((row) => row.project);
  tableSheet(workbook, report, {
    name: SECTION_LABEL.timesheetByPerson,
    context: `${reportRange(report)} · ${report.summary.workingDays} working days`,
    rows: report.people,
    empty: reportEmptyLine(report, "one logged hours or was staffed"),
    columns: [
      { header: "Person", value: (row) => personName(row.person) },
      { header: "Hours", value: (row) => row.hours, numFmt: HOURS_FORMAT, sum: true, warn: (row) => row.hours === 0 },
      { header: "Days logged", value: (row) => row.daysLogged, numFmt: "0", sum: true },
      { header: "Working days", value: () => report.summary.workingDays, numFmt: "0" },
      ...splits.map((project) => ({
        header: project?.code ?? "No project",
        value: (row: Report["people"][number]) => row.byProject.find((split) => split.project === project)?.hours ?? null,
        numFmt: HOURS_FORMAT,
        sum: true,
      })),
    ],
  });
}

/** Part-day leave and remote keep their hours as numbers; the format only adds the mark. */
const MARKED_HOURS = { cuti: '0.0" C"', sick: '0.0" S"', remote: '0.0" R"' } as const;

/**
 * The Daily grid: Person and Total, then one column per day under a merged month band, a day-number row, and a
 * weekday row. Cuti and sick are tinted words; every hour figure stays a number, so the row and column `SUM`s hold.
 */
function dailyGridSheet(workbook: ExcelJSModule.Workbook, report: Report) {
  const sheet = workbook.addWorksheet(SECTION_LABEL.dailyGrid);
  const months = report.dailyGrid.months;
  const days = months.flatMap((month) => month.days);
  const people = months[0]?.rows.map((row) => row.person) ?? [];
  const lastColumn = 2 + days.length;
  const letter = (column: number) => sheet.getColumn(column).letter;
  sheet.columns = [{ width: Math.min(40, Math.max(12, ...people.map((person) => personName(person).length + 3))) }, { width: 9 }, ...days.map(() => ({ width: 5.5 }))];
  heading(sheet, SECTION_LABEL.dailyGrid, `${reportRange(report)} · hours per day`, Math.min(lastColumn, 20));

  const head = (cell: Cell, value: ExcelJSModule.CellValue, fill = COLOR.accent) => {
    cell.value = value;
    cell.font = { name: FONT, size: 9, bold: true, color: { argb: COLOR.white } };
    cell.fill = solid(fill);
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  sheet.mergeCells(3, 1, 5, 1);
  head(sheet.getCell(3, 1), "Person");
  sheet.getCell(3, 1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.mergeCells(3, 2, 5, 2);
  head(sheet.getCell(3, 2), "Total");
  let column = 3;
  for (const month of months) {
    if (month.days.length > 1) sheet.mergeCells(3, column, 3, column + month.days.length - 1);
    head(sheet.getCell(3, column), month.label);
    sheet.getCell(3, column).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    month.days.forEach((day, index) => {
      const off = day.holiday || day.weekend ? COLOR.accentHover : COLOR.accent;
      head(sheet.getCell(4, column + index), day.day, off);
      head(sheet.getCell(5, column + index), day.weekday, off);
      sheet.getCell(5, column + index).font = { name: FONT, size: 8, color: { argb: COLOR.white } };
      if (day.holiday) sheet.getCell(4, column + index).note = day.holiday;
    });
    column += month.days.length;
  }
  [3, 4, 5].forEach((row) => (sheet.getRow(row).height = 16));

  const first = 6;
  people.forEach((person, index) => {
    const r = first + index;
    bodyCell(sheet.getCell(r, 1), personName(person));
    const cells = months.flatMap((month) => month.rows[index].cells);
    cells.forEach((cell, d) => {
      const target = sheet.getCell(r, 3 + d);
      const away = (cell.leave === "cuti" || cell.leave === "sick") && !cell.partial ? cell.leave : null;
      if (away) bodyCell(target, away === "cuti" ? "Cuti" : "Sick", { align: "left" });
      else bodyCell(target, cell.hours > 0 || cell.leave ? cell.hours : null, { numFmt: cell.leave ? MARKED_HOURS[cell.leave] : "0.0" });
      target.alignment = { vertical: "middle", horizontal: "center" };
      const fill = cell.leave === "cuti" ? COLOR.cuti : cell.leave === "sick" ? COLOR.sick : cell.leave === "remote" ? COLOR.wash : days[d].holiday ? COLOR.tint : days[d].weekend ? COLOR.weekend : null;
      if (fill) target.fill = solid(fill);
      if (away) target.font = { name: FONT, size: 9, bold: true, color: { argb: away === "cuti" ? COLOR.accentHover : COLOR.warning } };
    });
    const total = months.reduce((sum, month) => sum + month.rows[index].total, 0);
    bodyCell(sheet.getCell(r, 2), days.length ? { formula: `SUM(${letter(3)}${r}:${letter(lastColumn)}${r})`, result: total } : total, { numFmt: HOURS_FORMAT });
    sheet.getCell(r, 2).font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.ink } };
    sheet.getRow(r).height = 18;
  });

  const last = first + people.length - 1;
  if (people.length === 0) {
    sheet.mergeCells(first, 1, first, Math.min(lastColumn, 20));
    bodyCell(sheet.getCell(first, 1), reportEmptyLine(report, "one logged hours or was staffed"));
    sheet.getCell(first, 1).font = { name: FONT, size: 10, italic: true, color: { argb: COLOR.muted } };
  } else {
    const r = last + 1;
    const dayTotals = months.flatMap((month) => month.dayTotals);
    totalCell(sheet.getCell(r, 1), "Total");
    totalCell(sheet.getCell(r, 2), { formula: `SUM(B${first}:B${last})`, result: dayTotals.reduce((sum, value) => sum + value, 0) }, HOURS_FORMAT);
    dayTotals.forEach((result, d) => {
      const target = sheet.getCell(r, 3 + d);
      // The empty third section shows a zero total as a blank cell.
      totalCell(target, { formula: `SUM(${letter(3 + d)}${first}:${letter(3 + d)}${last})`, result }, "0.0;-0.0;;@");
      target.alignment = { vertical: "middle", horizontal: "center" };
    });
    sheet.getRow(r).height = 18;
  }
  sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 5, showGridLines: false }];
  printSetup(sheet, report, "3:5", "A:B");
}

const LOAD_FORMAT = '0"%"';
/** "AAA · Samudra ERP", or "No project". */
const projectLabel = (project: { code: string; name: string } | null) => (project ? `${project.code} · ${project.name}` : "No project");

function hoursByProjectSheet(workbook: ExcelJSModule.Workbook, report: Report) {
  // The Project row carries the Project's hours; its breakdowns repeat the Project so a filter keeps them together.
  const rows = report.hoursByProject.flatMap((row) => [
    { project: projectLabel(row.project), breakdown: "Project", name: "", hours: row.hours },
    ...row.people.map((split) => ({ project: projectLabel(row.project), breakdown: "Person", name: personName(split.person), hours: split.hours })),
    ...row.workItems.map((split) => ({ project: projectLabel(row.project), breakdown: "Work item", name: split.workItem?.name ?? "No work item", hours: split.hours })),
  ]);
  tableSheet(workbook, report, {
    name: SECTION_LABEL.hoursByProject,
    context: `${reportRange(report)} · by person and by work item`,
    rows,
    emphasis: (row) => row.breakdown === "Project",
    empty: reportEmptyLine(report, "hours"),
    columns: [
      { header: "Project", value: (row) => row.project },
      { header: "Breakdown", value: (row) => row.breakdown },
      { header: "Name", value: (row) => row.name, indent: (row) => row.breakdown !== "Project" },
      {
        header: "Hours",
        value: (row) => row.hours,
        numFmt: HOURS_FORMAT,
        // Each hour appears once per Project row and again under Person and under Work item, so only Project rows add up.
        total: ({ first, last, letter }) => ({ formula: `SUMIF(${letter(2)}${first}:${letter(2)}${last},"Project",${letter(4)}${first}:${letter(4)}${last})`, result: report.summary.totalHours }),
      },
    ],
  });
}

function staffingSheet(workbook: ExcelJSModule.Workbook, report: Report) {
  tableSheet(workbook, report, {
    name: SECTION_LABEL.staffing,
    context: `${reportRange(report)} · Load per row, and each Person's peak total Load across all their Staffing`,
    rows: report.staffing,
    empty: reportEmptyLine(report, "staffing"),
    columns: [
      { header: "Person", value: (row) => personName(row.person) },
      { header: "Project", value: (row) => projectLabel(row.project) },
      { header: "Load", value: (row) => row.load, numFmt: LOAD_FORMAT },
      { header: "From", value: (row) => sheetDate(row.startDate), numFmt: DATE_FORMAT, align: "left" },
      { header: "To", value: (row) => (row.endDate ? sheetDate(row.endDate) : "No end"), numFmt: DATE_FORMAT, align: "left" },
      { header: "Peak load", value: (row) => row.peakLoad, numFmt: LOAD_FORMAT, warn: (row) => row.peakLoad > 100 },
    ],
  });
}

function projectsSheet(workbook: ExcelJSModule.Workbook, report: Report) {
  tableSheet(workbook, report, {
    name: SECTION_LABEL.projects,
    context: `${reportRange(report)} · Projects running in the range, with hours inside it`,
    rows: report.projects,
    empty: reportEmptyLine(report, "projects running"),
    columns: [
      { header: "Code", value: (row) => row.project.code },
      { header: "Project", value: (row) => row.project.name },
      { header: "Client", value: (row) => clientLabel(row.project) },
      { header: "From", value: (row) => sheetDate(row.project.startDate), numFmt: DATE_FORMAT, align: "left" },
      { header: "To", value: (row) => (row.project.endDate ? sheetDate(row.project.endDate) : "No end"), numFmt: DATE_FORMAT, align: "left" },
      { header: "People", value: (row) => row.people, numFmt: "0" },
      { header: "Hours", value: (row) => row.hours, numFmt: HOURS_FORMAT, sum: true },
    ],
  });
}

function leaveSheet(workbook: ExcelJSModule.Workbook, report: Report) {
  tableSheet(workbook, report, {
    name: SECTION_LABEL.leave,
    context: `${reportRange(report)} · working days inside the range`,
    rows: report.leave,
    empty: reportEmptyLine(report, "approved leave"),
    columns: [
      { header: "Person", value: (row) => personName(row.person) },
      { header: "Leave", value: reportLeaveLabel },
      { header: "From", value: (row) => sheetDate(row.startDate), numFmt: DATE_FORMAT, align: "left" },
      { header: "To", value: (row) => sheetDate(row.endDate), numFmt: DATE_FORMAT, align: "left" },
      { header: "Part of day", value: (row) => (row.partOfDay ? `${row.partOfDay.start}–${row.partOfDay.end}` : "") },
      { header: "Hours", value: (row) => (row.partOfDay ? row.hours : null), numFmt: HOURS_FORMAT, sum: true },
      { header: "Working days", value: (row) => row.workingDays, numFmt: "0", sum: true },
      { header: "Pay", value: (row) => (row.paid ? "Paid" : "Unpaid") },
    ],
  });
}

/** The sheets after the Cover, in the fixed section order. */
const SECTION_SHEETS: { key: SectionKey; write: (workbook: ExcelJSModule.Workbook, report: Report) => void }[] = [
  { key: "summary", write: summarySheet },
  { key: "hoursByProject", write: hoursByProjectSheet },
  { key: "timesheetByPerson", write: timesheetByPersonSheet },
  { key: "dailyGrid", write: dailyGridSheet },
  { key: "staffing", write: staffingSheet },
  { key: "projects", write: projectsSheet },
  { key: "leave", write: leaveSheet },
];

/** The Cover sheet: the mark, the title, Prepared for, the range, the filters, the generator, and sheet links. */
function coverSheet(workbook: ExcelJSModule.Workbook, report: Report, logo: Uint8Array | null, sheets: { name: string; label: string }[]) {
  const sheet = workbook.addWorksheet("Cover", { properties: { tabColor: { argb: COLOR.accent } } });
  sheet.columns = [{ width: 3 }, { width: 24 }, { width: 70 }];
  if (logo) {
    // The PNG is 695 × 350; keep that ratio so the official mark is never stretched.
    const image = workbook.addImage({ buffer: logo as unknown as ExcelJSModule.Buffer, extension: "png" });
    sheet.addImage(image, { tl: { col: 1, row: 1 }, ext: { width: 139, height: 70 } });
  }
  const put = (row: number, value: ExcelJSModule.CellValue, font: Partial<ExcelJSModule.Font>, column = 2) => {
    const cell = sheet.getCell(row, column);
    cell.value = value;
    cell.font = { name: FONT, ...font };
    cell.alignment = { vertical: "middle", wrapText: true };
  };

  let row = 7;
  const line = (value: string, font: Partial<ExcelJSModule.Font>, height: number) => {
    sheet.mergeCells(row, 2, row, 3);
    put(row, value, font);
    sheet.getRow(row).height = height;
    row += 1;
  };
  line(report.title, { size: 26, bold: true, color: { argb: COLOR.ink } }, 38);
  if (report.preparedFor) line(`Prepared for ${report.preparedFor}`, { size: 13, color: { argb: COLOR.muted } }, 22);
  line(reportRange(report), { size: 14, color: { argb: COLOR.accentHover } }, 22);

  row += 1;
  const facts = [...report.filters, { label: "Generated by", value: report.generatedBy }, { label: "Generated on", value: `${report.generatedAt}, Asia/Jakarta` }];
  for (const fact of facts) {
    put(row, fact.label, { size: 10, color: { argb: COLOR.muted } });
    put(row, fact.value, { size: 11, color: { argb: COLOR.ink } }, 3);
    sheet.getCell(row, 2).border = { bottom: hairline };
    sheet.getCell(row, 3).border = { bottom: hairline };
    sheet.getRow(row).height = 20;
    row += 1;
  }

  row += 1;
  put(row, "In this workbook", { size: 11, bold: true, color: { argb: COLOR.ink } });
  for (const target of sheets) {
    row += 1;
    put(row, { text: target.label, hyperlink: `#'${target.name}'!A1` }, { size: 11, color: { argb: COLOR.accent }, underline: true });
  }
  row += 2;
  line("Confidential. Read-only figures from KMPlus People; hours are counted time blocks.", { size: 9, italic: true, color: { argb: COLOR.muted } }, 18);

  sheet.views = [{ showGridLines: false }];
  printSetup(sheet, report);
  sheet.pageSetup.orientation = "portrait";
}

/** `logo` is the official KMPlus mark as PNG bytes; without it the Cover has no image. */
export async function buildReportWorkbook(ExcelJSLib: ExcelJS, report: Report, logo: Uint8Array | null): Promise<Uint8Array> {
  const workbook = new ExcelJSLib.Workbook();
  workbook.creator = "KMPlus People";
  workbook.title = report.title;
  const sheets = SECTION_SHEETS.filter((sheet) => report.sections.includes(sheet.key));
  if (report.sections.includes("cover")) coverSheet(workbook, report, logo, sheets.map((sheet) => ({ name: SECTION_LABEL[sheet.key], label: SECTION_LABEL[sheet.key] })));
  for (const sheet of sheets) sheet.write(workbook, report);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
