/**
 * The Report as a designed PDF (react-pdf). Import it only through a dynamic `import()`: a static import pulls
 * react-pdf into the page's first load. Figures come from the Report model; this file only lays them out.
 */
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React, { type ReactNode } from "react";
import { REPORT_COLORS as C, REPORT_TITLE, reportHours, reportRange, type Report } from "@/lib/report-model";

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
        <Text>{REPORT_TITLE}</Text>
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
  return (
    <View>
      <View style={[s.row, s.band]} fixed>
        {columns.map((column) => (
          <Text key={column.title} style={[s.cell, s.bandText, { width: column.width, textAlign: column.align ?? "left" }]}>
            {column.title}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? <Text style={s.empty}>{empty}</Text> : null}
      {rows.map((row, index) => (
        <View key={index} style={s.row} wrap={false}>
          {columns.map((column) => (
            <Text
              key={column.title}
              style={[s.cell, { width: column.width, textAlign: column.align ?? "left" }, column.warn?.(row) ? { color: C.warning, fontWeight: 600 } : {}]}
            >
              {column.render(row)}
            </Text>
          ))}
        </View>
      ))}
      {totals ? (
        <View style={[s.row, s.totals]} wrap={false}>
          {columns.map((column, index) => (
            <Text key={column.title} style={[s.cell, { width: column.width, fontWeight: 700, textAlign: column.align ?? "left" }]}>
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
    <SectionPages report={report} title="Summary" context={`${reportRange(report)} · ${summary.workingDays} working days`}>
      <FactsStrip
        facts={[
          { label: "Hours logged", value: reportHours(summary.totalHours) },
          { label: "On projects", value: reportHours(summary.projectHours) },
          { label: "People", value: String(summary.people) },
          { label: "Past 100% load", value: String(summary.overloaded), warn: summary.overloaded > 0 },
        ]}
      />
      <View style={{ width: 470 }}>
        <Table
          rows={report.hoursByProject}
          empty={`No hours between ${reportRange(report)}.`}
          columns={[
            { title: "Project", width: 290, render: (row) => (row.project ? `${row.project.code}  ${row.project.name}` : "No project") },
            { title: "Hours", width: 90, align: "right", render: (row) => reportHours(row.hours), total: () => reportHours(summary.totalHours) },
            { title: "Share", width: 90, align: "right", render: (row) => `${summary.totalHours ? Math.round((row.hours / summary.totalHours) * 100) : 0}%` },
          ]}
        />
      </View>
    </SectionPages>
  );
}

export function ReportPdf({ report }: { report: Report }) {
  return (
    <Document title={`${REPORT_TITLE} ${report.from} to ${report.to}`} author="KMPlus People" creator="KMPlus People" producer="KMPlus People">
      <Summary report={report} />
    </Document>
  );
}
