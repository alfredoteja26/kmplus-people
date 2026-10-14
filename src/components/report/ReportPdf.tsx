/**
 * The Report as a designed PDF (react-pdf). Import it only through a dynamic `import()`: a static import pulls
 * react-pdf into the page's first load. Figures come from the Report model; this file only lays them out.
 */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React, { createContext, useContext, type ReactNode } from "react";
import { formatDate, plural } from "@/lib/labels";
import { clientLabel, personName } from "@/lib/project-view";
import {
  gridCellLook,
  LEAVE_COLORS,
  REPORT_COLORS as C,
  reportEmptyLine,
  reportFilterLine,
  reportHours,
  reportLeaveLabel,
  reportRange,
  SECTION_LABEL,
  SPREADSHEET_ONLY,
  type Report,
  type ReportTemplate,
  type SectionKey,
} from "@/lib/report-model";

void React;

let fontsFrom = "";

/**
 * Plus Jakarta Sans and IBM Plex Mono (code chips), served by the app (`/fonts/report` in the browser, a folder
 * path in Node). Registers once per base.
 */
export function registerReportFonts(base: string) {
  if (fontsFrom === base) return;
  fontsFrom = base;
  Font.register({
    family: "Jakarta",
    fonts: [400, 500, 600, 700].map((fontWeight) => ({ src: `${base}/plus-jakarta-sans-latin-${fontWeight}-normal.woff`, fontWeight })),
  });
  Font.register({ family: "Plex Mono", src: `${base}/ibm-plex-mono-latin-400-normal.woff` });
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
  code: { fontFamily: "Plex Mono", fontSize: 7.5, color: C.accentHover, backgroundColor: C.tint, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 },
});

/**
 * How a ReportTemplate draws the shared pieces. Standard: solid sage header bands. Letterhead: tint bands with
 * `#145F59` caps text and denser rows. Briefing: Standard's tables with section titles in sage.
 */
const LOOKS = {
  standard: { band: s.band, bandText: s.bandText, rowHeight: 17, cellPadding: 3, titleColor: C.ink },
  letterhead: {
    band: { backgroundColor: C.tint, minHeight: 16, borderBottomWidth: 1, borderBottomColor: C.accent },
    bandText: { color: C.accentHover, fontSize: 7, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" as const },
    rowHeight: 14,
    cellPadding: 2,
    titleColor: C.ink,
  },
  briefing: { band: s.band, bandText: s.bandText, rowHeight: 17, cellPadding: 3, titleColor: C.accentHover },
} satisfies Record<ReportTemplate, unknown>;

const Look = createContext<(typeof LOOKS)[ReportTemplate]>(LOOKS.standard);

/** The running head every page carries: the Report's title, then the section's name after page 1. `inset` matches the page's side margin. */
function RunningHead({ report, section, inset = 32 }: { report: Report; section?: string; inset?: number }) {
  return (
    <View style={[s.runningHead, { left: inset, right: inset }]} fixed>
      <Text>{report.title}</Text>
      <Text render={({ pageNumber }) => (section && pageNumber > 1 ? section : "")} />
    </View>
  );
}

/** The footer every page carries: "KMPlus People · range · CONFIDENTIAL · Page X of Y". */
function PageFooter({ report, inset = 32 }: { report: Report; inset?: number }) {
  return (
    <View style={[s.footer, { left: inset, right: inset }]} fixed>
      <Text>KMPlus People · {reportRange(report)}</Text>
      <Text style={s.confidential}>CONFIDENTIAL</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

/**
 * One section's pages: running head, title, context line, body, and the footer on every page. `lead` is the
 * Letterhead band, drawn above the title of the Report's first section.
 */
function SectionPages({ report, title, context, children, lead }: { report: Report; title: string; context: string; children: ReactNode; lead?: ReactNode }) {
  const look = useContext(Look);
  return (
    <Page size="A4" orientation="landscape" style={s.page} wrap>
      <RunningHead report={report} section={title} />
      {lead}
      <Text style={[s.title, { color: look.titleColor }]}>{title}</Text>
      <Text style={s.context}>{context}</Text>
      {children}
      <PageFooter report={report} />
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
  const look = useContext(Look);
  const totals = rows.length > 0 && columns.some((column) => column.total);
  // Text that follows a right-aligned number gets a gutter, so "5 of 22" never runs into "SMD-ERP".
  const place = columns.map((column, index) => ({
    width: column.width,
    textAlign: column.align ?? ("left" as const),
    paddingLeft: !column.align && columns[index - 1]?.align === "right" ? 16 : 5,
    paddingVertical: look.cellPadding,
  }));
  return (
    <View>
      <View style={[s.row, look.band]} fixed>
        {columns.map((column, index) => (
          <Text key={column.title} style={[s.cell, look.bandText, place[index]]}>
            {column.title}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? <Text style={s.empty}>{empty}</Text> : null}
      {rows.map((row, index) => (
        <View key={index} style={[s.row, { minHeight: look.rowHeight }, emphasis?.(row) ? { backgroundColor: C.wash } : {}]} wrap={false}>
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
        <View style={[s.row, s.totals, { minHeight: look.rowHeight }]} wrap={false}>
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

function summaryFacts(report: Report) {
  const summary = report.summary;
  return [
    { label: "Hours logged", value: reportHours(summary.totalHours) },
    { label: "On projects", value: reportHours(summary.projectHours) },
    { label: "People", value: String(summary.people) },
    { label: "Past 100% load", value: String(summary.overloaded), warn: summary.overloaded > 0 },
    { label: "Days away", value: String(summary.daysAway) },
  ];
}

/** A 5pt bar on a wash track, `share` of the full width. */
function Bar({ share, tone }: { share: number; tone: string }) {
  return (
    <View style={{ height: 5, flexGrow: 1, backgroundColor: C.wash, borderRadius: 3 }}>
      <View style={{ height: 5, width: `${Math.max(1.5, share * 100)}%`, backgroundColor: tone, borderRadius: 3 }} />
    </View>
  );
}

/** Briefing's Summary: the facts strip, then hours by Project and by Person as bar lists, and leave by kind. */
function Briefing({ report, lead }: { report: Report; lead?: ReactNode }) {
  const summary = report.summary;
  const topProject = Math.max(1, ...report.hoursByProject.map((row) => row.hours));
  const people = [...report.people].sort((a, b) => b.hours - a.hours || personName(a.person).localeCompare(personName(b.person)));
  const topPerson = Math.max(1, ...people.map((row) => row.hours));
  return (
    <SectionPages report={report} title="Briefing" context={`${reportRange(report)} · ${summary.workingDays} working days\n${reportFilterLine(report)}`} lead={lead}>
      <FactsStrip facts={summaryFacts(report)} />
      <View style={{ flexDirection: "row", gap: 28 }}>
        <View style={{ flex: 1.3 }}>
          <Text style={{ fontWeight: 600, marginBottom: 8 }}>Hours by project</Text>
          {report.hoursByProject.length === 0 ? <Text style={{ color: C.muted }}>{reportEmptyLine(report, "hours")}</Text> : null}
          {report.hoursByProject.map((row) => (
            <View key={row.project?.id ?? "none"} style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }} wrap={false}>
              <View style={{ width: 190, flexDirection: "row", alignItems: "center" }}>
                {row.project ? <Text style={s.code}>{row.project.code}</Text> : <Text style={{ color: C.muted }}>No project</Text>}
                {row.project ? <Text style={{ marginLeft: 5, color: C.muted, fontSize: 8, maxWidth: 130 }}>{row.project.name}</Text> : null}
              </View>
              <Bar share={row.hours / topProject} tone={row.project ? C.accent : C.lineStrong} />
              <Text style={{ width: 56, textAlign: "right" }}>{reportHours(row.hours)}</Text>
            </View>
          ))}
          <Text style={{ fontWeight: 600, marginTop: 14, marginBottom: 8 }}>Leave in working days</Text>
          {summary.leaveByKind.map((row) => (
            <Text key={row.kind} style={{ color: C.muted, marginBottom: 3 }}>
              {row.label}: {row.paid} paid, {row.unpaid} unpaid
            </Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 600, marginBottom: 8 }}>Hours by person</Text>
          {people.length === 0 ? <Text style={{ color: C.muted }}>{reportEmptyLine(report, "one logged hours or was staffed")}</Text> : null}
          {people.map((row) => (
            <View key={row.person.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4.5 }} wrap={false}>
              <Text style={{ width: 110, fontSize: 8 }}>{personName(row.person)}</Text>
              <Bar share={row.hours / topPerson} tone={row.hours === 0 ? C.warningBar : C.accent2} />
              <Text style={{ width: 48, textAlign: "right", fontSize: 8, color: row.hours === 0 ? C.warning : C.ink, fontWeight: row.hours === 0 ? 600 : 400 }}>{reportHours(row.hours)}</Text>
            </View>
          ))}
        </View>
      </View>
    </SectionPages>
  );
}

function Summary({ report, lead }: { report: Report; lead?: ReactNode }) {
  const summary = report.summary;
  return (
    <SectionPages report={report} title="Summary" context={`${reportRange(report)} · ${summary.workingDays} working days\n${reportFilterLine(report)}`} lead={lead}>
      <FactsStrip facts={summaryFacts(report)} />
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
            { title: "Paid", width: 70, align: "right", render: (row) => String(row.paid), total: (rows) => String(rows.reduce((total, row) => total + row.paid, 0)) },
            { title: "Unpaid", width: 70, align: "right", render: (row) => String(row.unpaid), total: (rows) => String(rows.reduce((total, row) => total + row.unpaid, 0)) },
          ]}
        />
      </View>
    </SectionPages>
  );
}

function TimesheetByPerson({ report, lead }: { report: Report; lead?: ReactNode }) {
  return (
    <SectionPages report={report} title="Timesheet by person" context={`${reportRange(report)} · ${report.summary.workingDays} working days`} lead={lead}>
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

function HoursByProject({ report, lead }: { report: Report; lead?: ReactNode }) {
  // Each Project as a washed row, then its People and WorkItems indented under it.
  const rows = report.hoursByProject.flatMap((row) => [
    { label: projectLabel(row.project), kind: "", hours: row.hours, project: true },
    ...row.people.map((split) => ({ label: personName(split.person), kind: "Person", hours: split.hours, project: false })),
    ...row.workItems.map((split) => ({ label: split.workItem?.name ?? "No work item", kind: "Work item", hours: split.hours, project: false })),
  ]);
  return (
    <SectionPages report={report} title="Hours by project" context={`${reportRange(report)} · by person and by work item`} lead={lead}>
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

function Staffing({ report, lead }: { report: Report; lead?: ReactNode }) {
  return (
    <SectionPages report={report} title="Staffing" context={`${reportRange(report)} · Load per row, and each Person's peak total Load across all their Staffing`} lead={lead}>
      <Table
        rows={report.staffing}
        empty={reportEmptyLine(report, "staffing")}
        columns={[
          // Summed Load means nothing, so the totals row counts the People and Projects staffed instead.
          { title: "Person", width: 150, render: (row) => personName(row.person), total: (rows) => plural(new Set(rows.map((row) => row.person.id)).size, "person", "people") },
          { title: "Project", width: 270, render: (row) => projectLabel(row.project), total: (rows) => plural(new Set(rows.map((row) => row.project?.id)).size, "project") },
          { title: "Load", width: 70, align: "right", render: (row) => percent(row.load) },
          { title: "From", width: 85, render: (row) => formatDate(row.startDate) },
          { title: "To", width: 85, render: (row) => (row.endDate ? formatDate(row.endDate) : "No end") },
          { title: "Peak load", width: 80, align: "right", render: (row) => percent(row.peakLoad), warn: (row) => row.peakLoad > 100 },
        ]}
      />
    </SectionPages>
  );
}

function Projects({ report, lead }: { report: Report; lead?: ReactNode }) {
  return (
    <SectionPages report={report} title="Projects" context={`${reportRange(report)} · Projects running in the range, with hours inside it`} lead={lead}>
      <Table
        rows={report.projects}
        empty={reportEmptyLine(report, "projects running")}
        columns={[
          { title: "Code", width: 80, render: (row) => row.project.code },
          { title: "Project", width: 210, render: (row) => row.project.name },
          { title: "Client", width: 160, render: (row) => clientLabel(row.project) },
          { title: "From", width: 80, render: (row) => formatDate(row.project.startDate) },
          { title: "To", width: 80, render: (row) => (row.project.endDate ? formatDate(row.project.endDate) : "No end") },
          { title: "People", width: 60, align: "right", render: (row) => String(row.people) },
          { title: "Hours", width: 80, align: "right", render: (row) => reportHours(row.hours), total: (rows) => reportHours(rows.reduce((total, row) => total + row.hours, 0)) },
        ]}
      />
    </SectionPages>
  );
}

/** Timesheet detail is spreadsheet only: the PDF names the sheet and never draws the rows. */
function TimesheetDetailNote({ report, lead }: { report: Report; lead?: ReactNode }) {
  const count = report.timesheetDetail.length;
  return (
    <SectionPages report={report} title="Timesheet detail" context={`${reportRange(report)} · one row per counted time block`} lead={lead}>
      <Text style={{ fontSize: 10 }}>
        {/* Not `plural()`: the count needs its thousands separator ("1,900"). */}
        Timesheet detail: {count.toLocaleString("en-US")} time {count === 1 ? "block" : "blocks"}, in the spreadsheet&apos;s Timesheet detail sheet.
      </Text>
    </SectionPages>
  );
}

/** "rgba(26, 120, 112, 0.24)": a `#RRGGBB` palette colour at some opacity, for Briefing's heat shading. */
function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

/** Hours in a grid cell: whole hours without a decimal, so 31 day columns stay legible. */
const gridHours = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1));

/** One page per calendar month: Person rows, day columns filling the width, totals, and a legend with the holidays. */
function DailyGrid({ report, lead }: { report: Report; lead?: ReactNode }) {
  const look = useContext(Look);
  // Briefing heat-shades each worked cell by its hours, relative to the month's busiest cell.
  const heat = look === LOOKS.briefing;
  const nameWidth = 112;
  const totalWidth = 44;
  const usable = 842 - 64;
  return (
    <>
      {report.dailyGrid.months.map((month, monthIndex) => {
        const dayWidth = Math.min(44, (usable - nameWidth - totalWidth) / month.days.length);
        const peak = Math.max(1, ...month.rows.flatMap((row) => row.cells.map((cell) => cell.hours)));
        const shade = (index: number, hours: number) =>
          month.days[index].holiday ? C.tint : month.days[index].weekend ? C.weekend : heat && hours > 0 ? withAlpha(C.accent, 0.08 + 0.32 * (hours / peak)) : undefined;
        return (
          <SectionPages key={month.from} report={report} title={`Daily grid · ${month.label}`} context={`${reportRange(month)} · hours per day`} lead={monthIndex === 0 ? lead : undefined}>
            <View style={[s.row, look.band, { minHeight: 24 }]} fixed>
              <Text style={[s.cell, look.bandText, { width: nameWidth }]}>Person</Text>
              {month.days.map((day) => (
                <View key={day.date} style={{ width: dayWidth, alignItems: "center", opacity: day.weekend || day.holiday ? 0.65 : 1 }}>
                  <Text style={[look.bandText, { fontSize: 6.5, letterSpacing: 0 }]}>{day.day}</Text>
                  <Text style={[look.bandText, { fontSize: 5.5, fontWeight: 400, letterSpacing: 0 }]}>{day.weekday}</Text>
                </View>
              ))}
              <Text style={[s.cell, look.bandText, { width: totalWidth, textAlign: "right" }]}>Total</Text>
            </View>
            {month.rows.length === 0 ? <Text style={s.empty}>{reportEmptyLine(month, "one logged hours or was staffed")}</Text> : null}
            {month.rows.map((row) => (
              <View key={row.person.id} style={[s.row, { minHeight: look.rowHeight - 2 }]} wrap={false}>
                <Text style={[s.cell, { width: nameWidth, fontSize: 7.5 }]}>{personName(row.person)}</Text>
                {row.cells.map((cell, index) => {
                  const look = gridCellLook(cell);
                  const background = look.tint ? LEAVE_COLORS[look.tint].wash : shade(index, cell.hours);
                  return (
                    <View key={month.days[index].date} style={{ width: dayWidth, alignSelf: "stretch", justifyContent: "center", alignItems: "center", backgroundColor: background, borderLeftWidth: 0.25, borderLeftColor: C.line }}>
                      {look.word && look.tint ? (
                        <Text style={{ fontSize: 5, fontWeight: 600, color: LEAVE_COLORS[look.tint].ink }}>{look.word}</Text>
                      ) : cell.hours > 0 || look.mark ? (
                        <Text style={{ fontSize: 6.5 }}>
                          {gridHours(cell.hours)}
                          {look.mark ? <Text style={{ fontSize: 4.5, color: C.muted }}> {look.mark}</Text> : null}
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
                [LEAVE_COLORS.cuti.wash, "Cuti"],
                [LEAVE_COLORS.sick.wash, "Sick"],
                [LEAVE_COLORS.remote.wash, "Remote, hours marked R"],
                [C.tint, "Public holiday"],
              ].map(([color, label]) => (
                <View key={label} style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 9, height: 9, backgroundColor: color, borderWidth: 0.5, borderColor: C.line, marginRight: 4 }} />
                  <Text>{label}</Text>
                </View>
              ))}
              <Text>Hours worked on a leave day: marked C or S</Text>
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

function ApprovedLeave({ report, lead }: { report: Report; lead?: ReactNode }) {
  return (
    <SectionPages report={report} title="Approved leave" context={`${reportRange(report)} · working days inside the range`} lead={lead}>
      <Table
        rows={report.leave}
        empty={reportEmptyLine(report, "approved leave")}
        columns={[
          { title: "Person", width: 140, render: (row) => personName(row.person) },
          { title: "Leave", width: 175, render: reportLeaveLabel },
          { title: "From", width: 75, render: (row) => formatDate(row.startDate) },
          { title: "To", width: 75, render: (row) => formatDate(row.endDate) },
          { title: "Part of day", width: 80, render: (row) => (row.partOfDay ? `${row.partOfDay.start}–${row.partOfDay.end}` : "") },
          { title: "Hours", width: 60, align: "right", render: (row) => (row.partOfDay ? reportHours(row.hours) : ""), total: (rows) => reportHours(rows.reduce((total, row) => total + row.hours, 0)) },
          { title: "Working days", width: 85, align: "right", render: (row) => String(row.workingDays), total: (rows) => String(rows.reduce((total, row) => total + row.workingDays, 0)) },
          { title: "Pay", width: 60, render: (row) => (row.paid ? "Paid" : "Unpaid") },
        ]}
      />
    </SectionPages>
  );
}

function coverFacts(report: Report) {
  return [...report.filters, { label: "Generated by", value: report.generatedBy }, { label: "Generated on", value: `${report.generatedAt}, Asia/Jakarta` }];
}

/** A section's name in a contents list: Summary reads "Briefing" there, and spreadsheet-only sections say so. */
function contentsLabel(key: SectionKey, template: ReportTemplate) {
  if (key === "summary" && template === "briefing") return "Briefing";
  return SPREADSHEET_ONLY.includes(key) ? `${SECTION_LABEL[key]} (in the spreadsheet)` : SECTION_LABEL[key];
}

/**
 * The cover page: the mark, the title, Prepared for, the range, and what the Report holds. Briefing adds an
 * "In this report" list of the chosen sections.
 */
function Cover({ report, logo }: { report: Report; logo: string }) {
  const facts = coverFacts(report);
  const briefing = report.template === "briefing";
  return (
    <Page size="A4" orientation="portrait" style={[s.page, { paddingHorizontal: 48, paddingTop: 54 }]}>
      <RunningHead report={report} inset={48} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img and takes no alt */}
      <Image src={logo} style={{ width: 92, height: 46, marginBottom: briefing ? 150 : 200 }} />
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
      {briefing ? (
        <View style={{ marginTop: 26 }}>
          <Text style={{ fontWeight: 600, marginBottom: 6 }}>In this report</Text>
          {report.sections
            .filter((key) => key !== "cover")
            .map((key) => (
              <Text key={key} style={{ color: C.muted, marginBottom: 3 }}>
                {contentsLabel(key, report.template)}
              </Text>
            ))}
        </View>
      ) : null}
      <Text style={{ position: "absolute", left: 48, right: 48, bottom: 44, fontSize: 7.5, color: C.faint }}>Read-only figures from KMPlus People. Hours are counted time blocks.</Text>
      <PageFooter report={report} inset={48} />
    </Page>
  );
}

/** Letterhead's Cover: a band above the first section's title with the mark, title, Prepared for, range, filters, and generator. */
function LetterheadBand({ report, logo }: { report: Report; logo: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: C.accent, paddingBottom: 10, marginBottom: 12 }}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img and takes no alt */}
      <Image src={logo} style={{ width: 60, height: 30, marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: 600 }}>{report.title}</Text>
        {report.preparedFor ? <Text style={{ color: C.muted, fontSize: 9 }}>Prepared for {report.preparedFor}</Text> : null}
        <Text style={{ color: C.accentHover, fontSize: 10 }}>{reportRange(report)}</Text>
      </View>
      <View style={{ width: 320, fontSize: 7.5, color: C.muted }}>
        <Text>{reportFilterLine(report)}</Text>
        <Text>
          Generated by {report.generatedBy}, {report.generatedAt} Asia/Jakarta
        </Text>
      </View>
    </View>
  );
}

const SECTION_PAGES: Partial<Record<SectionKey, (props: { report: Report; lead?: ReactNode }) => ReactNode>> = {
  summary: (props) => (props.report.template === "briefing" ? <Briefing {...props} /> : <Summary {...props} />),
  hoursByProject: HoursByProject,
  timesheetByPerson: TimesheetByPerson,
  dailyGrid: DailyGrid,
  timesheetDetail: TimesheetDetailNote,
  staffing: Staffing,
  projects: Projects,
  leave: ApprovedLeave,
};

/**
 * `logo` is the official KMPlus mark: `/brand/kmplus-logo-official.png` in the browser, a file path in Node.
 * The ReportTemplate changes only how the pages look; every figure comes from the same Report.
 */
export function ReportPdf({ report, logo }: { report: Report; logo: string }) {
  const letterhead = report.template === "letterhead";
  const cover = report.sections.includes("cover");
  const pages = report.sections.filter((key) => key !== "cover");
  const band = letterhead && cover ? <LetterheadBand report={report} logo={logo} /> : undefined;
  return (
    <Look.Provider value={LOOKS[report.template]}>
      <Document title={`${report.title} ${report.from} to ${report.to}`} author="KMPlus People" creator="KMPlus People" producer="KMPlus People">
        {cover && !letterhead ? <Cover report={report} logo={logo} /> : null}
        {/* A Letterhead Report with only Cover chosen is the band on a page of its own. */}
        {band && pages.length === 0 ? (
          <Page size="A4" orientation="landscape" style={s.page}>
            <RunningHead report={report} />
            {band}
            <PageFooter report={report} />
          </Page>
        ) : null}
        {pages.map((key, index) => {
          const Section = SECTION_PAGES[key]!;
          return <Section key={key} report={report} lead={index === 0 ? band : undefined} />;
        })}
      </Document>
    </Look.Provider>
  );
}
