/**
 * The Report as a designed PDF (react-pdf). Import it only through a dynamic `import()`: a static import pulls
 * react-pdf into the page's first load. Figures come from the Report model; this file only lays them out.
 */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React, { type ReactNode } from "react";
import { clientLabel, personName } from "@/lib/project-view";
import { REPORT_COLORS as C, reportDate, reportEmptyLine, reportFilterLine, reportHours, reportLeaveLabel, reportRange, type Report } from "@/lib/report-model";

void React;

let fontsFrom = "";

/** Plus Jakarta Sans, served by the app (`/fonts/report` in the browser, a folder path in Node). Registers once per base. */
export function registerReportFonts(base: string) {
  if (fontsFrom === base) return;
  fontsFrom = base;
  Font.register({
    family: "Jakarta",
    fonts: [400, 500, 600, 700].map((fontWeight) => ({ src: `${base}/plus-jakarta-sans-latin-${fontWeight}-normal.woff`, fontWeight })),
  });
  Font.registerHyphenationCallback((word) => [word]);
}

const s = StyleSheet.create({
  page: { fontFamily: "Jakarta", fontSize: 9, color: C.ink, paddingTop: 36, paddingBottom: 44, paddingHorizontal: 32 },
  runningHead: { position: "absolute", top: 14, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.faint },
  footer: { position: "absolute", left: 32, right: 32, bottom: 18, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.faint, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 6 },
  confidential: { color: C.warning, fontWeight: 600, letterSpacing: 0.8 },
  title: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  context: { fontSize: 8.5, color: C.muted, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 17, borderBottomWidth: 0.5, borderBottomColor: C.line },
  band: { backgroundColor: C.accent, minHeight: 19, borderBottomWidth: 0 },
  bandText: { color: C.white, fontSize: 7.5, fontWeight: 600 },
  cell: { paddingHorizontal: 5, paddingVertical: 3 },
  totals: { backgroundColor: C.tint, borderTopWidth: 1, borderTopColor: C.accent, borderBottomWidth: 0 },
  empty: { paddingVertical: 10, paddingHorizontal: 5, color: C.muted },
});

/** One section's pages: running head, title, context line, body, and the footer on every page. */
function SectionPages({ report, title, context, children }: { report: Report; title: string; context: string; children: ReactNode }) {
  return (
    <Page size="A4" orientation="landscape" style={s.page} wrap>
      <View style={s.runningHead} fixed>
        <Text>{report.title}</Text>
        <Text render={({ pageNumber }) => (pageNumber > 1 ? title : "")} />
      </View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.context}>{context}</Text>
      {children}
      <View style={s.footer} fixed>
        <Text>KMPlus People · {reportRange(report)}</Text>
        <Text style={s.confidential}>CONFIDENTIAL</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  );
}

type Column<T> = {
  title: string;
  width: number;
  align?: "right";
  render: (row: T) => string;
  total?: (rows: T[]) => string;
  warn?: (row: T) => boolean;
  /** Indents a breakdown row's label under its parent. */
  indent?: (row: T) => boolean;
};

/** A table whose header band repeats after every page break, with a tint totals row and an empty line. */
function Table<T>({ columns, rows, empty, emphasis }: { columns: Column<T>[]; rows: T[]; empty: string; emphasis?: (row: T) => boolean }) {
  const totals = rows.length > 0 && columns.some((column) => column.total);
  // Text that follows a right-aligned number gets a gutter, so "5 of 22" never runs into "SMD-ERP".
  const place = columns.map((column, index) => ({
    width: column.width,
    textAlign: column.align ?? ("left" as const),
    paddingLeft: !column.align && columns[index - 1]?.align === "right" ? 16 : 5,
  }));
  return (
    <View>
      <View style={[s.row, s.band]} fixed>
        {columns.map((column, index) => (
          <Text key={column.title} style={[s.cell, s.bandText, place[index]]}>
            {column.title}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? <Text style={s.empty}>{empty}</Text> : null}
      {rows.map((row, index) => (
        <View key={index} style={[s.row, emphasis?.(row) ? { backgroundColor: C.wash } : {}]} wrap={false}>
          {columns.map((column, index) => (
            <Text
              key={column.title}
              style={[
                s.cell,
                place[index],
                emphasis?.(row) ? { fontWeight: 600 } : {},
                column.indent?.(row) ? { paddingLeft: 20, color: C.muted } : {},
                column.warn?.(row) ? { color: C.warning, fontWeight: 600 } : {},
              ]}
            >
              {column.render(row)}
            </Text>
          ))}
        </View>
      ))}
      {totals ? (
        <View style={[s.row, s.totals]} wrap={false}>
          {columns.map((column, index) => (
            <Text key={column.title} style={[s.cell, place[index], { fontWeight: 700 }]}>
              {column.total ? column.total(rows) : index === 0 ? "Total" : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FactsStrip({ facts }: { facts: { label: string; value: string; warn?: boolean }[] }) {
  return (
    <View style={{ flexDirection: "row", borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.line, marginBottom: 16 }}>
      {facts.map((fact, index) => (
        <View key={fact.label} style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 10, borderLeftWidth: index === 0 ? 0 : 0.5, borderLeftColor: C.line }}>
          <Text style={{ fontSize: 6.5, color: C.faint, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 3 }}>{fact.label}</Text>
          <Text style={{ fontSize: 15, fontWeight: 600, color: fact.warn ? C.warning : C.ink }}>{fact.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Summary({ report }: { report: Report }) {
  const summary = report.summary;
  return (
    <SectionPages report={report} title="Summary" context={`${reportRange(report)} · ${summary.workingDays} working days\n${reportFilterLine(report)}`}>
      <FactsStrip
        facts={[
          { label: "Hours logged", value: reportHours(summary.totalHours) },
          { label: "On projects", value: reportHours(summary.projectHours) },
          { label: "People", value: String(summary.people) },
          { label: "Past 100% load", value: String(summary.overloaded), warn: summary.overloaded > 0 },
          { label: "Days away", value: String(summary.daysAway) },
        ]}
      />
      <View style={{ flexDirection: "row", gap: 18 }}>
        <Table
          rows={report.hoursByProject}
          empty={reportEmptyLine(report, "hours")}
          columns={[
            { title: "Project", width: 290, render: (row) => (row.project ? `${row.project.code}  ${row.project.name}` : "No project") },
            { title: "Hours", width: 90, align: "right", render: (row) => reportHours(row.hours), total: () => reportHours(summary.totalHours) },
            { title: "Share", width: 90, align: "right", render: (row) => `${summary.totalHours ? Math.round((row.hours / summary.totalHours) * 100) : 0}%` },
          ]}
        />
        <Table
          rows={summary.leaveByKind}
          empty=""
          columns={[
            { title: "Leave, working days", width: 130, render: (row) => row.label },
            { title: "Paid", width: 70, align: "right", render: (row) => String(row.paid) },
            { title: "Unpaid", width: 70, align: "right", render: (row) => String(row.unpaid) },
          ]}
        />
      </View>
    </SectionPages>
  );
}

function TimesheetByPerson({ report }: { report: Report }) {
  return (
    <SectionPages report={report} title="Timesheet by person" context={`${reportRange(report)} · ${report.summary.workingDays} working days`}>
      <Table
        rows={report.people}
        empty={reportEmptyLine(report, "one logged hours or was staffed")}
        columns={[
          { title: "Person", width: 170, render: (row) => personName(row.person) },
          { title: "Hours", width: 70, align: "right", render: (row) => reportHours(row.hours), total: () => reportHours(report.summary.totalHours), warn: (row) => row.hours === 0 },
          {
            title: "Days logged",
            width: 90,
            align: "right",
            render: (row) => `${row.daysLogged} of ${report.summary.workingDays}`,
            total: (rows) => String(rows.reduce((total, row) => total + row.daysLogged, 0)),
          },
          { title: "By project", width: 448, render: (row) => row.byProject.map((split) => `${split.project?.code ?? "No project"} ${reportHours(split.hours)}`).join("  ·  ") || "No hours" },
        ]}
      />
    </SectionPages>
  );
}

/** "AAA  Samudra ERP", or "No project". */
const projectLabel = (project: { code: string; name: string } | null) => (project ? `${project.code}  ${project.name}` : "No project");

/** 80 → "80%". */
const percent = (load: number) => `${load}%`;

function HoursByProject({ report }: { report: Report }) {
  // Each Project as a washed row, then its People and WorkItems indented under it.
  const rows = report.hoursByProject.flatMap((row) => [
    { label: projectLabel(row.project), kind: "", hours: row.hours, project: true },
    ...row.people.map((split) => ({ label: personName(split.person), kind: "Person", hours: split.hours, project: false })),
    ...row.workItems.map((split) => ({ label: split.workItem?.name ?? "No work item", kind: "Work item", hours: split.hours, project: false })),
  ]);
  return (
    <SectionPages report={report} title="Hours by project" context={`${reportRange(report)} · by person and by work item`}>
      <Table
        rows={rows}
        emphasis={(row) => row.project}
        empty={reportEmptyLine(report, "hours")}
        columns={[
          { title: "Project", width: 470, render: (row) => row.label, indent: (row) => !row.project },
          { title: "Breakdown", width: 110, render: (row) => row.kind },
          { title: "Hours", width: 90, align: "right", render: (row) => reportHours(row.hours), total: () => reportHours(report.summary.totalHours) },
        ]}
      />
    </SectionPages>
  );
}

function Staffing({ report }: { report: Report }) {
  return (
    <SectionPages report={report} title="Staffing" context={`${reportRange(report)} · Load per row, and each Person's peak total Load across all their Staffing`}>
      <Table
        rows={report.staffing}
        empty={reportEmptyLine(report, "staffing")}
        columns={[
          { title: "Person", width: 150, render: (row) => personName(row.person) },
          { title: "Project", width: 270, render: (row) => projectLabel(row.project) },
          { title: "Load", width: 70, align: "right", render: (row) => percent(row.load) },
          { title: "From", width: 85, render: (row) => reportDate(row.startDate) },
          { title: "To", width: 85, render: (row) => (row.endDate ? reportDate(row.endDate) : "No end") },
          { title: "Peak load", width: 80, align: "right", render: (row) => percent(row.peakLoad), warn: (row) => row.peakLoad > 100 },
        ]}
      />
    </SectionPages>
  );
}

function Projects({ report }: { report: Report }) {
  return (
    <SectionPages report={report} title="Projects" context={`${reportRange(report)} · Projects running in the range, with hours inside it`}>
      <Table
        rows={report.projects}
        empty={reportEmptyLine(report, "projects running")}
        columns={[
          { title: "Code", width: 80, render: (row) => row.project.code },
          { title: "Project", width: 210, render: (row) => row.project.name },
          { title: "Client", width: 160, render: (row) => clientLabel(row.project) },
          { title: "From", width: 80, render: (row) => reportDate(row.project.startDate) },
          { title: "To", width: 80, render: (row) => (row.project.endDate ? reportDate(row.project.endDate) : "No end") },
          { title: "People", width: 60, align: "right", render: (row) => String(row.people) },
          { title: "Hours", width: 80, align: "right", render: (row) => reportHours(row.hours), total: (rows) => reportHours(rows.reduce((total, row) => total + row.hours, 0)) },
        ]}
      />
    </SectionPages>
  );
}

const LEAVE_WORD = { cuti: "Cuti", sick: "Sick" } as const;
const PART_MARK = { cuti: "C", sick: "S", remote: "R" } as const;

/** Hours in a grid cell: whole hours without a decimal, so 31 day columns stay legible. */
const gridHours = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1));

/** One page per calendar month: Person rows, day columns filling the width, totals, and a legend with the holidays. */
function DailyGrid({ report }: { report: Report }) {
  const nameWidth = 112;
  const totalWidth = 44;
  const usable = 842 - 64;
  return (
    <>
      {report.dailyGrid.months.map((month) => {
        const dayWidth = Math.min(44, (usable - nameWidth - totalWidth) / month.days.length);
        const shade = (index: number) => (month.days[index].holiday ? C.tint : month.days[index].weekend ? C.weekend : undefined);
        return (
          <SectionPages key={month.from} report={report} title={`Daily grid · ${month.label}`} context={`${reportRange(month)} · hours per day`}>
            <View style={[s.row, s.band, { minHeight: 24 }]} fixed>
              <Text style={[s.cell, s.bandText, { width: nameWidth }]}>Person</Text>
              {month.days.map((day) => (
                <View key={day.date} style={{ width: dayWidth, alignItems: "center", opacity: day.weekend || day.holiday ? 0.65 : 1 }}>
                  <Text style={[s.bandText, { fontSize: 6.5 }]}>{day.day}</Text>
                  <Text style={[s.bandText, { fontSize: 5.5, fontWeight: 400 }]}>{day.weekday}</Text>
                </View>
              ))}
              <Text style={[s.cell, s.bandText, { width: totalWidth, textAlign: "right" }]}>Total</Text>
            </View>
            {month.rows.length === 0 ? <Text style={s.empty}>{reportEmptyLine(month, "one logged hours or was staffed")}</Text> : null}
            {month.rows.map((row) => (
              <View key={row.person.id} style={[s.row, { minHeight: 15 }]} wrap={false}>
                <Text style={[s.cell, { width: nameWidth, fontSize: 7.5 }]}>{personName(row.person)}</Text>
                {row.cells.map((cell, index) => {
                  const away = (cell.leave === "cuti" || cell.leave === "sick") && !cell.partial ? cell.leave : null;
                  const background = cell.leave === "cuti" ? C.cuti : cell.leave === "sick" ? C.sick : cell.leave === "remote" ? C.wash : shade(index);
                  return (
                    <View key={month.days[index].date} style={{ width: dayWidth, alignSelf: "stretch", justifyContent: "center", alignItems: "center", backgroundColor: background, borderLeftWidth: 0.25, borderLeftColor: C.line }}>
                      {away ? (
                        <Text style={{ fontSize: 5, fontWeight: 600, color: away === "cuti" ? C.accentHover : C.warning }}>{LEAVE_WORD[away]}</Text>
                      ) : cell.hours > 0 || cell.leave ? (
                        <Text style={{ fontSize: 6.5 }}>
                          {gridHours(cell.hours)}
                          {cell.leave ? <Text style={{ fontSize: 4.5, color: C.muted }}> {PART_MARK[cell.leave]}</Text> : null}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
                <Text style={[s.cell, { width: totalWidth, textAlign: "right", fontSize: 7.5, fontWeight: 600 }]}>{reportHours(row.total)}</Text>
              </View>
            ))}
            {month.rows.length > 0 ? (
              <View style={[s.row, s.totals]} wrap={false}>
                <Text style={[s.cell, { width: nameWidth, fontSize: 7.5, fontWeight: 700 }]}>Total</Text>
                {month.dayTotals.map((total, index) => (
                  <Text key={month.days[index].date} style={{ width: dayWidth, textAlign: "center", fontSize: 5.5, fontWeight: 600 }}>
                    {total > 0 ? gridHours(total) : ""}
                  </Text>
                ))}
                <Text style={[s.cell, { width: totalWidth, textAlign: "right", fontSize: 7.5, fontWeight: 700 }]}>{reportHours(month.total)}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 10, fontSize: 7, color: C.muted }} wrap={false}>
              {[
                [C.cuti, "Cuti"],
                [C.sick, "Sick"],
                [C.wash, "Remote, hours marked R"],
                [C.tint, "Public holiday"],
              ].map(([color, label]) => (
                <View key={label} style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 9, height: 9, backgroundColor: color, borderWidth: 0.5, borderColor: C.line, marginRight: 4 }} />
                  <Text>{label}</Text>
                </View>
              ))}
              <Text>Part of a day: hours worked, marked C or S</Text>
              {month.days
                .filter((day) => day.holiday)
                .map((day) => (
                  <Text key={day.date} style={{ color: C.ink }}>
                    {day.day} · {day.holiday}
                  </Text>
                ))}
            </View>
          </SectionPages>
        );
      })}
    </>
  );
}

function ApprovedLeave({ report }: { report: Report }) {
  return (
    <SectionPages report={report} title="Approved leave" context={`${reportRange(report)} · working days inside the range`}>
      <Table
        rows={report.leave}
        empty={reportEmptyLine(report, "approved leave")}
        columns={[
          { title: "Person", width: 140, render: (row) => personName(row.person) },
          { title: "Leave", width: 175, render: reportLeaveLabel },
          { title: "From", width: 75, render: (row) => reportDate(row.startDate) },
          { title: "To", width: 75, render: (row) => reportDate(row.endDate) },
          { title: "Part of day", width: 80, render: (row) => (row.partOfDay ? `${row.partOfDay.start}–${row.partOfDay.end}` : "") },
          { title: "Hours", width: 60, align: "right", render: (row) => (row.partOfDay ? reportHours(row.hours) : ""), total: (rows) => reportHours(rows.reduce((total, row) => total + row.hours, 0)) },
          { title: "Working days", width: 85, align: "right", render: (row) => String(row.workingDays), total: (rows) => String(rows.reduce((total, row) => total + row.workingDays, 0)) },
          { title: "Pay", width: 60, render: (row) => (row.paid ? "Paid" : "Unpaid") },
        ]}
      />
    </SectionPages>
  );
}

/** The Standard cover: a portrait page with the mark, the title, Prepared for, the range, and what the Report holds. */
function Cover({ report, logo }: { report: Report; logo: string }) {
  const facts = [...report.filters, { label: "Generated by", value: report.generatedBy }, { label: "Generated on", value: `${report.generatedAt}, Asia/Jakarta` }];
  return (
    <Page size="A4" orientation="portrait" style={[s.page, { paddingHorizontal: 48, paddingTop: 54 }]}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img and takes no alt */}
      <Image src={logo} style={{ width: 92, height: 46, marginBottom: 200 }} />
      <View style={{ width: 36, height: 3, backgroundColor: C.accent, marginBottom: 14 }} />
      <Text style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.15 }}>{report.title}</Text>
      {report.preparedFor ? <Text style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Prepared for {report.preparedFor}</Text> : null}
      <Text style={{ fontSize: 15, color: C.accentHover, marginTop: 8, marginBottom: 28 }}>{reportRange(report)}</Text>
      {facts.map((fact) => (
        <View key={fact.label} style={{ flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 6 }}>
          <Text style={{ width: 130, color: C.muted }}>{fact.label}</Text>
          <Text style={{ flex: 1 }}>{fact.value}</Text>
        </View>
      ))}
      <View style={{ position: "absolute", left: 48, right: 48, bottom: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.faint }}>
        <Text>Read-only figures from KMPlus People. Hours are counted time blocks.</Text>
        <Text style={s.confidential}>CONFIDENTIAL</Text>
      </View>
    </Page>
  );
}

/** `logo` is the official KMPlus mark: `/brand/kmplus-logo-official.png` in the browser, a file path in Node. */
export function ReportPdf({ report, logo }: { report: Report; logo: string }) {
  return (
    <Document title={`${report.title} ${report.from} to ${report.to}`} author="KMPlus People" creator="KMPlus People" producer="KMPlus People">
      {report.sections.includes("cover") ? <Cover report={report} logo={logo} /> : null}
      {report.sections.includes("summary") ? <Summary report={report} /> : null}
      {report.sections.includes("hoursByProject") ? <HoursByProject report={report} /> : null}
      {report.sections.includes("timesheetByPerson") ? <TimesheetByPerson report={report} /> : null}
      {report.sections.includes("dailyGrid") ? <DailyGrid report={report} /> : null}
      {report.sections.includes("staffing") ? <Staffing report={report} /> : null}
      {report.sections.includes("projects") ? <Projects report={report} /> : null}
      {report.sections.includes("leave") ? <ApprovedLeave report={report} /> : null}
    </Document>
  );
}
