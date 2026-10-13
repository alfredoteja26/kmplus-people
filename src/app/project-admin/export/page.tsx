"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Toggle } from "@/components/coss/toggle";
import { hasAdminGrant } from "@/lib/domain-query";
import { monthSpan } from "@/lib/project-admin-view";
import { personName } from "@/lib/project-view";
import { buildReport, reportDate, reportFileName, reportRange, type Report } from "@/lib/report-model";
import { addMonthsIso, parseReportSettings, reportRangeError, serializeReportSettings } from "@/lib/report-settings";
import { useStore } from "@/lib/store";
import { addDaysIso, jakartaTodayIso } from "@/lib/work-delivery-query";
import { ArrowLeftIcon, DownloadIcon, FileSpreadsheetIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

const REPORT_FONTS_URL = "/fonts/report";

/** This month, last month, this quarter, and the last 12 months, all in Asia/Jakarta. */
function quickRanges(today: string) {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  const quarter = Math.floor(month / 3) * 3;
  return [
    { label: "This month", ...monthSpan(year, month) },
    { label: "Last month", ...monthSpan(month === 0 ? year - 1 : year, (month + 11) % 12) },
    { label: "This quarter", from: monthSpan(year, quarter).from, to: monthSpan(year, quarter + 2).to },
    { label: "Last 12 months", from: addDaysIso(addMonthsIso(today, -12), 1), to: today },
  ];
}

/** "13 Oct 2026, 10:42" in Asia/Jakarta. */
function jakartaStamp(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return `${reportDate(`${parts.year}-${parts.month}-${parts.day}`)}, ${parts.hour}:${parts.minute}`;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Preview = { url: string; blob: Blob; pages: number };

/** Builds the PDF about half a second after the Report changes; a late build never replaces a newer one. */
function usePdfPreview(report: Report | null) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [building, setBuilding] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    if (!report) {
      setBuilding(false);
      return;
    }
    setBuilding(true);
    const timer = setTimeout(async () => {
      try {
        const [{ pdf }, { ReportPdf, registerReportFonts }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/report/ReportPdf")]);
        registerReportFonts(REPORT_FONTS_URL);
        const blob = await pdf(<ReportPdf report={report} />).toBlob();
        if (id !== latest.current) return;
        const pages = ((await blob.text()).match(/\/Type\s*\/Page[^s]/g) ?? []).length;
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old.url);
          return { url: URL.createObjectURL(blob), blob, pages };
        });
        setFailed(false);
      } catch (error) {
        console.error(error);
        if (id === latest.current) setFailed(true);
      } finally {
        if (id === latest.current) setBuilding(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [report, attempt]);

  return { preview, building, failed, retry: () => setAttempt((n) => n + 1) };
}

function ExportReport() {
  const { state } = useStore();
  if (!hasAdminGrant(state)) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <h1 className="m-0 font-heading text-h1 font-medium">Export report</h1>
        <p className="m-0 text-sm">Only an Admin can export a report.</p>
      </div>
    );
  }
  return <ExportReportForm />;
}

function ExportReportForm() {
  const { state } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const today = jakartaTodayIso();
  const [initial] = useState(() => parseReportSettings(new URLSearchParams(params.toString()), today));
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [xlsxBusy, setXlsxBusy] = useState(false);

  const rangeError = reportRangeError(from, to);
  const generatedBy = personName(state.people.find((row) => row.id === state.currentPersonId));
  const report = useMemo(
    () => (rangeError ? null : buildReport(state, { from, to }, { generatedBy, generatedAt: jakartaStamp() })),
    [state, from, to, rangeError, generatedBy],
  );
  // While the range is invalid the preview keeps the last Report that could be built, dimmed.
  const lastGood = useRef<Report | null>(null);
  if (report) lastGood.current = report;
  const { preview, building, failed, retry } = usePdfPreview(report);

  useEffect(() => {
    if (rangeError) return;
    router.replace(`${pathname}?${serializeReportSettings({ from, to })}`, { scroll: false });
  }, [from, to, rangeError, pathname, router]);

  async function downloadXlsx() {
    if (!report) return;
    setXlsxBusy(true);
    try {
      const [{ default: ExcelJS }, { buildReportWorkbook, XLSX_TYPE }] = await Promise.all([import("exceljs"), import("@/lib/report-workbook")]);
      const bytes = await buildReportWorkbook(ExcelJS, report);
      save(new Blob([bytes as BlobPart], { type: XLSX_TYPE }), reportFileName(report, "xlsx"));
    } finally {
      setXlsxBusy(false);
    }
  }

  const previewed = report ?? lastGood.current;
  const status = failed && !building ? "Preview failed" : building || !preview ? "Updating…" : `${preview.pages} ${preview.pages === 1 ? "page" : "pages"}`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href="/project-admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted no-underline hover:text-accent">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Back to Project Admin
        </Link>
        <h1 className="m-0 font-heading text-h1 font-medium">Export report</h1>
        <p className="m-0 max-w-[70ch] text-muted">Choose the range the report covers. The preview is the PDF you download; the spreadsheet holds the same figures.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex flex-col overflow-clip rounded-2xl bg-paper shadow-(--shadow) lg:sticky lg:top-4" aria-label="Report settings">
          <section className="flex flex-col gap-3 px-5 py-4" aria-labelledby="report-range">
            <h2 id="report-range" className="m-0 text-base font-medium">
              Date range
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {quickRanges(today).map((range) => (
                <Toggle
                  key={range.label}
                  variant="outline"
                  size="sm"
                  pressed={from === range.from && to === range.to}
                  onPressedChange={() => {
                    setFrom(range.from);
                    setTo(range.to);
                  }}
                >
                  {range.label}
                </Toggle>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                From
                <Input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} aria-invalid={Boolean(rangeError) || undefined} aria-describedby="report-range-note" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                To
                <Input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} aria-invalid={Boolean(rangeError) || undefined} aria-describedby="report-range-note" />
              </label>
            </div>
            {rangeError ? (
              <p id="report-range-note" role="alert" className="m-0 text-sm text-destructive-foreground">
                {rangeError}
              </p>
            ) : (
              <p id="report-range-note" className="m-0 text-sm text-muted tabular-nums">
                {reportRange({ from, to })} · {report?.summary.workingDays ?? 0} working days
              </p>
            )}
          </section>

          <div className="flex flex-col gap-2 border-t border-line bg-wash px-5 py-4">
            <Button type="button" disabled={Boolean(rangeError) || !preview || building} onClick={() => preview && report && save(preview.blob, reportFileName(report, "pdf"))}>
              <DownloadIcon aria-hidden="true" />
              Download PDF
            </Button>
            <Button type="button" variant="outline" disabled={Boolean(rangeError) || xlsxBusy} onClick={downloadXlsx}>
              <FileSpreadsheetIcon aria-hidden="true" />
              {xlsxBusy ? "Building spreadsheet…" : "Download xlsx"}
            </Button>
            <p className="m-0 text-sm text-muted">{rangeError ? "Fix the date range to download." : "The spreadsheet holds the same figures as the PDF."}</p>
          </div>
        </aside>

        <section aria-label="PDF preview" className="flex min-w-0 flex-col overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 text-sm">
            <span className="font-medium">Preview</span>
            <span role="status" className="text-muted tabular-nums">
              {status}
            </span>
          </div>
          {failed ? (
            <div role="alert" className="flex flex-col items-start gap-2 px-5 py-6 text-sm">
              <p className="m-0">The preview couldn&apos;t be built. The spreadsheet download still works.</p>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            </div>
          ) : preview && previewed ? (
            <iframe
              title={`Report preview, ${reportRange(previewed)}`}
              src={`${preview.url}#view=FitH`}
              className={`h-[calc(100vh-9rem)] min-h-[640px] w-full border-0 bg-wash transition-opacity ${rangeError ? "opacity-50" : ""}`}
            />
          ) : (
            <div className="grid h-[480px] place-items-center text-sm text-muted">Building the preview…</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ExportReportPage() {
  return (
    <Suspense>
      <ExportReport />
    </Suspense>
  );
}
