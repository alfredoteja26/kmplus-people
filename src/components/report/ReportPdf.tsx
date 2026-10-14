/**
 * The Report as a designed PDF (react-pdf). Import it only through a dynamic `import()`: a static import pulls
 * react-pdf into the page's first load. Figures come from the Report model; this file only lays them out.
 */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React, { type ReactNode } from "react";
import { personName } from "@/lib/project-view";
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

type Column<T> = { title: string; width: number; align?: "right"; render: (row: T) => string; total?: (rows: T[]) => string; warn?: (row: T) => boolean };

/** A table whose header band repeats after every page break, with a tint totals row and an empty line. */
function Table<T>({ columns, rows, empty }: { columns: Column<T>[]; rows: T[]; empty: string }) {
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
        <View key={index} style={s.row} wrap={false}>
          {columns.map((column, index) => (
            <Text
              key={column.title}
              style={[s.cell, place[index], column.warn?.(row) ? { color: C.warning, fontWeight: 600 } : {}]}
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
      {report.sections.includes("timesheetByPerson") ? <TimesheetByPerson report={report} /> : null}
      {report.sections.includes("leave") ? <ApprovedLeave report={report} /> : null}
    </Document>
  );
}
