"use client";

import { Button } from "@/components/coss/button";
import { Checkbox } from "@/components/coss/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/coss/field";
import { RadioGroupPrimitive, RadioPrimitive } from "@/components/coss/radio-group";
import { Input } from "@/components/coss/input";
import { Switch } from "@/components/coss/switch";
import { Toggle } from "@/components/coss/toggle";
import { CodeChip } from "@/components/work-delivery/project/parts";
import { hasAdminGrant } from "@/lib/domain-query";
import { monthSpan } from "@/lib/project-admin-view";
import { personName } from "@/lib/project-view";
import { buildReport, orderSections, READY_SECTIONS, REPORT_TEMPLATES, REPORT_TEXT_MAX, REPORT_TITLE, reportDate, reportTitle, reportWorkingDays, SECTION_KEYS, SECTION_LABEL, SPREADSHEET_ONLY, suggestedPreparedFor, type ReportTemplate, reportFileName, reportRange, type Report } from "@/lib/report-model";
import { addMonthsIso, parseReportSettings, reportChoiceError, reportRangeError, serializeReportSettings } from "@/lib/report-settings";
import { useStore } from "@/lib/store";
import { addDaysIso, jakartaTodayIso } from "@/lib/work-delivery-query";
import { ArrowLeftIcon, DownloadIcon, ExternalLinkIcon, FileSpreadsheetIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";

const REPORT_FONTS_URL = "/fonts/report";
const REPORT_LOGO_URL = "/brand/kmplus-logo-official.png";

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

/** `ids` with `id` added or taken out; a null list (all) first becomes every id in `all`. */
function toggleId(ids: string[] | null, all: string[], id: string): string[] {
  const current = ids ?? all;
  return current.includes(id) ? current.filter((row) => row !== id) : all.filter((row) => row === id || current.includes(row));
}

/** One named checkbox row: coss Field names base-ui's checkbox, a wrapping `<label>` does not. */
function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <Field className="min-w-0 flex-row items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <FieldLabel className="min-w-0 font-normal">{children}</FieldLabel>
    </Field>
  );
}

/** A small schematic of each template's first pages, drawn in the app's own tokens. */
function TemplateThumbnail({ template }: { template: ReportTemplate }) {
  const sheet = "fill-paper stroke-line-strong";
  return (
    <svg viewBox="0 0 56 40" aria-hidden="true" className="h-10 w-14 shrink-0">
      {template === "letterhead" ? (
        <>
          <rect x="1" y="5" width="54" height="34" rx="2" className={sheet} strokeWidth="0.75" />
          <rect x="5" y="9" width="8" height="5" rx="1" className="fill-accent" />
          <rect x="15" y="10" width="20" height="3" rx="1" className="fill-ink/60" />
          <line x1="5" x2="51" y1="17" y2="17" className="stroke-accent" strokeWidth="1" />
          <rect x="5" y="20" width="46" height="3" className="fill-tint stroke-accent" strokeWidth="0.4" />
          {[25.5, 28.5, 31.5, 34.5].map((y) => (
            <rect key={y} x="5" y={y} width="46" height="1.5" className="fill-line" />
          ))}
        </>
      ) : (
        <>
          <rect x="1" y="1" width="20" height="38" rx="2" className={sheet} strokeWidth="0.75" />
          <rect x="4" y="5" width="7" height="3.5" rx="1" className="fill-accent" />
          <rect x="4" y="22" width="5" height="1.2" className="fill-accent" />
          <rect x="4" y="25" width="13" height="2.5" rx="1" className="fill-ink/60" />
          {template === "briefing"
            ? [30, 32.5, 35].map((y) => <rect key={y} x="4" y={y} width="9" height="1.2" className="fill-line-strong" />)
            : <rect x="4" y="30" width="12" height="1.5" className="fill-line" />}
          <rect x="24" y="8" width="31" height="25" rx="2" className={sheet} strokeWidth="0.75" />
          {template === "briefing" ? (
            [12, 16, 20, 24, 28].map((y, index) => <rect key={y} x="27" y={y} width={22 - index * 4} height="2" rx="1" className="fill-accent" />)
          ) : (
            <>
              <rect x="27" y="11" width="25" height="3" className="fill-accent" />
              {[16, 19, 22, 25, 28].map((y) => (
                <rect key={y} x="27" y={y} width="25" height="1.5" className="fill-line" />
              ))}
            </>
          )}
        </>
      )}
    </svg>
  );
}

/**
 * On desktop the settings and the preview reach from where they sit (or stick, 16px under the top) to 16px above
 * the bottom of the scroll area, so the Download footer never leaves the screen at any scroll position. Measured,
 * because banners change the shell header; written straight to `--fit` so scrolling does not re-render the form.
 */
function useFitToScroller(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const layout = ref.current;
    const scroller = layout?.closest("main");
    if (!layout || !scroller) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const area = scroller.getBoundingClientRect();
        const top = Math.max(layout.getBoundingClientRect().top, area.top + 16);
        layout.style.setProperty("--fit", `${Math.max(320, Math.floor(area.bottom - 16 - top))}px`);
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(scroller);
    scroller.addEventListener("scroll", fit, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener("scroll", fit);
    };
  }, [ref]);
}

const HOURS_WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

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
        const blob = await pdf(<ReportPdf report={report} logo={REPORT_LOGO_URL} />).toBlob();
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
  const projects = useMemo(() => [...state.projects].sort((a, b) => a.code.localeCompare(b.code)), [state.projects]);
  const people = useMemo(() => [...state.people].sort((a, b) => personName(a).localeCompare(personName(b))), [state.people]);
  const [initial] = useState(() =>
    parseReportSettings(new URLSearchParams(params.toString()), today, { projectIds: projects.map((row) => row.id), personIds: people.map((row) => row.id) }),
  );
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [projectIds, setProjectIds] = useState(initial.projectIds);
  const [personIds, setPersonIds] = useState(initial.personIds);
  const [includeNoProject, setIncludeNoProject] = useState(initial.includeNoProject);
  const [title, setTitle] = useState(initial.title);
  const [template, setTemplate] = useState(initial.template);
  // Only sections both files can draw yet; the rest join as they are built.
  const [sections, setSections] = useState(() => initial.sections.filter((key) => READY_SECTIONS.includes(key)));
  // Prepared for follows the one chosen Project's client until the Admin types in it, or the link set it.
  const [preparedForEdited, setPreparedForEdited] = useState(() => params.has("preparedFor"));
  const [preparedFor, setPreparedFor] = useState(() => (params.has("preparedFor") ? initial.preparedFor : suggestedPreparedFor(state, initial.projectIds)));
  const [xlsxBusy, setXlsxBusy] = useState(false);

  const rangeError = reportRangeError(from, to);
  const settingsError = rangeError ?? reportChoiceError({ projectIds, personIds, sections });
  const generatedBy = personName(state.people.find((row) => row.id === state.currentPersonId));
  const report = useMemo(
    () =>
      settingsError ? null : buildReport(state, { from, to, projectIds, personIds, includeNoProject, title, preparedFor, sections, template }, { generatedBy, generatedAt: jakartaStamp() }),
    [state, from, to, projectIds, personIds, includeNoProject, title, preparedFor, sections, template, settingsError, generatedBy],
  );

  function chooseProjects(next: string[] | null) {
    setProjectIds(next);
    if (!preparedForEdited) setPreparedFor(suggestedPreparedFor(state, next));
  }
  // While the range is invalid the preview keeps the last Report that could be built, dimmed.
  const lastGood = useRef<Report | null>(null);
  if (report) lastGood.current = report;
  const { preview, building, failed, retry } = usePdfPreview(report);

  useEffect(() => {
    if (settingsError) return;
    const settings = { from, to, projectIds, personIds, includeNoProject, title: reportTitle(title), preparedFor: preparedFor.trim(), sections, template };
    router.replace(`${pathname}?${serializeReportSettings(settings)}`, { scroll: false });
  }, [from, to, projectIds, personIds, includeNoProject, title, preparedFor, sections, template, settingsError, pathname, router]);

  async function downloadXlsx() {
    if (!report) return;
    setXlsxBusy(true);
    try {
      const [{ default: ExcelJS }, { buildReportWorkbook, XLSX_TYPE }, logo] = await Promise.all([
        import("exceljs"),
        import("@/lib/report-workbook"),
        fetch(REPORT_LOGO_URL)
          .then((response) => (response.ok ? response.arrayBuffer() : null))
          .catch(() => null),
      ]);
      const bytes = await buildReportWorkbook(ExcelJS, report, logo ? new Uint8Array(logo) : null);
      save(new Blob([bytes as BlobPart], { type: XLSX_TYPE }), reportFileName(report, "xlsx"));
    } finally {
      setXlsxBusy(false);
    }
  }

  const previewed = report ?? lastGood.current;
  const status = failed && !building ? "Preview failed" : building || !preview ? "Updating…" : `${preview.pages} ${preview.pages === 1 ? "page" : "pages"}`;
  // The PDF can be saved or opened only when the preview matches the current settings.
  const pdfBlocked = Boolean(settingsError) || !preview || building || failed;
  // The phone summary: "5 sections · 6 pages · 312 hours".
  const summaryLine = [`${sections.length} ${sections.length === 1 ? "section" : "sections"}`, status, `${HOURS_WHOLE.format(previewed?.summary.totalHours ?? 0)} hours`].join(" · ");
  const layoutRef = useRef<HTMLDivElement>(null);
  useFitToScroller(layoutRef);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href="/project-admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted no-underline hover:text-accent">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Back to Project Admin
        </Link>
        <h1 className="m-0 font-heading text-h1 font-medium">Export report</h1>
        <p className="m-0 max-w-[70ch] text-muted">Name the report and choose the range, projects, and people it covers. The preview is the PDF you download; the spreadsheet holds the same figures.</p>
      </header>

      <div ref={layoutRef} className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-2xl bg-paper shadow-(--shadow) lg:sticky lg:top-4 lg:max-h-(--fit) lg:overflow-clip" aria-label="Report settings">
          <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <section className="flex flex-col gap-2 px-5 py-4" aria-labelledby="report-template">
              <h2 id="report-template" className="m-0 text-base font-medium">
                Template
              </h2>
              <RadioGroupPrimitive value={template} onValueChange={(value) => setTemplate(value as ReportTemplate)} aria-labelledby="report-template" className="flex flex-col gap-1.5">
                {REPORT_TEMPLATES.map((row) => (
                  <RadioPrimitive.Root
                    key={row.key}
                    value={row.key}
                    aria-labelledby={`report-template-${row.key}`}
                    aria-describedby={`report-template-${row.key}-line`}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper p-2.5 text-left outline-none transition-colors hover:bg-tint focus-visible:ring-2 focus-visible:ring-ring data-checked:border-accent data-checked:bg-tint"
                  >
                    <TemplateThumbnail template={row.key} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span id={`report-template-${row.key}`} className="text-sm font-medium">
                        {row.name}
                      </span>
                      <span id={`report-template-${row.key}-line`} className="text-xs text-muted">
                        {row.line}
                      </span>
                    </span>
                  </RadioPrimitive.Root>
                ))}
              </RadioGroupPrimitive>
              <p className="m-0 text-sm text-muted">{REPORT_TEMPLATES.find((row) => row.key === template)?.shapes} The spreadsheet is the same for every template.</p>
            </section>

            <section className="flex flex-col gap-3 border-t border-line px-5 py-4" aria-label="Title and client">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Title
                <Input
                  value={title}
                  maxLength={REPORT_TEXT_MAX}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => setTitle(reportTitle(title))}
                  placeholder={REPORT_TITLE}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                <span>
                  Prepared for <span className="font-normal text-muted">(optional)</span>
                </span>
                <Input
                  value={preparedFor}
                  maxLength={REPORT_TEXT_MAX}
                  onChange={(event) => {
                    setPreparedFor(event.target.value);
                    setPreparedForEdited(true);
                  }}
                  placeholder="Client name"
                />
              </label>
            </section>

            <section className="flex flex-col gap-3 border-t border-line px-5 py-4" aria-labelledby="report-range">
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
                  {reportRange({ from, to })} · {reportWorkingDays(state, from, to)} working days
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2 border-t border-line px-5 py-4" aria-labelledby="report-projects">
              <h2 id="report-projects" className="m-0 text-base font-medium">
                Projects
              </h2>
              <CheckRow checked={projectIds === null} onChange={() => chooseProjects(projectIds === null ? [] : null)}>
                All projects
              </CheckRow>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 ps-1">
                {projects.map((project) => (
                  <CheckRow
                    key={project.id}
                    checked={projectIds === null || projectIds.includes(project.id)}
                    onChange={() => chooseProjects(toggleId(projectIds, projects.map((row) => row.id), project.id))}
                  >
                    <CodeChip code={project.code} />
                  </CheckRow>
                ))}
              </div>
              <Field disabled={projectIds !== null} className="mt-1 flex-row items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <FieldLabel className="font-normal">Include time with no project</FieldLabel>
                  {projectIds !== null ? <FieldDescription className="text-sm text-muted">Off while projects are chosen, so a client file carries no internal time.</FieldDescription> : null}
                </div>
                <Switch checked={projectIds === null && includeNoProject} onCheckedChange={setIncludeNoProject} />
              </Field>
            </section>

            <section className="flex flex-col gap-2 border-t border-line px-5 py-4" aria-labelledby="report-people">
              <h2 id="report-people" className="m-0 flex items-baseline justify-between text-base font-medium">
                People
                <span className="text-sm font-normal text-muted tabular-nums">{personIds === null ? "Everyone" : `${personIds.length} chosen`}</span>
              </h2>
              <CheckRow checked={personIds === null} onChange={() => setPersonIds(personIds === null ? [] : null)}>
                Everyone
              </CheckRow>
              <div className="grid max-h-40 grid-cols-2 gap-x-3 gap-y-1.5 overflow-y-auto ps-1">
                {people.map((person) => (
                  <CheckRow
                    key={person.id}
                    checked={personIds === null || personIds.includes(person.id)}
                    onChange={() => setPersonIds(toggleId(personIds, people.map((row) => row.id), person.id))}
                  >
                    <span className="truncate">{personName(person)}</span>
                  </CheckRow>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-2 border-t border-line px-5 py-4" aria-labelledby="report-sections">
              <h2 id="report-sections" className="m-0 text-base font-medium">
                Sections
              </h2>
              <div className="flex flex-col gap-1.5">
                {SECTION_KEYS.filter((key) => READY_SECTIONS.includes(key)).map((key) => (
                  <CheckRow
                    key={key}
                    checked={sections.includes(key)}
                    onChange={() => setSections(orderSections(sections.includes(key) ? sections.filter((row) => row !== key) : [...sections, key]))}
                  >
                    {SECTION_LABEL[key]}
                    {SPREADSHEET_ONLY.includes(key) ? <span className="text-muted"> · Spreadsheet only</span> : null}
                  </CheckRow>
                ))}
              </div>
            </section>
          </div>

          {/* Always in reach: pinned under the scrolling settings on desktop, stuck to the screen's foot on a phone. */}
          <div className="flex shrink-0 flex-col gap-2 rounded-b-2xl border-t border-line bg-wash px-5 py-4 max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:gap-1.5 max-lg:px-4 max-lg:py-3 max-lg:shadow-[0_-8px_16px_-12px_rgb(0_0_0/0.25)]">
            <div className="flex items-center justify-between gap-2 lg:hidden">
              <p role="status" className="m-0 min-w-0 text-sm font-medium tabular-nums">
                {summaryLine}
              </p>
              {/* Mobile Safari shows only a PDF's first page inside a frame, so phones open the PDF in its own tab. */}
              <Button type="button" variant="ghost" size="sm" className="shrink-0" disabled={pdfBlocked} onClick={() => preview && window.open(preview.url, "_blank", "noopener")}>
                <ExternalLinkIcon aria-hidden="true" />
                Show preview
              </Button>
            </div>
            <div className="grid gap-2 max-lg:grid-cols-2">
              <Button type="button" disabled={pdfBlocked} onClick={() => preview && report && save(preview.blob, reportFileName(report, "pdf"))}>
                <DownloadIcon aria-hidden="true" />
                Download PDF
              </Button>
              <Button type="button" variant="outline" disabled={Boolean(settingsError) || xlsxBusy} onClick={downloadXlsx}>
                <FileSpreadsheetIcon aria-hidden="true" />
                {xlsxBusy ? "Building…" : "Download xlsx"}
              </Button>
            </div>
            {/* On a phone the footer covers the settings, so it keeps only a reason to act. */}
            <p className={`m-0 text-sm text-muted ${settingsError ? "" : "max-lg:hidden"}`}>
              {rangeError ? "Fix the date range to download." : (settingsError ?? "The spreadsheet holds the same figures as the PDF.")}
            </p>
          </div>
        </aside>

        <section aria-label="PDF preview" className="flex min-w-0 flex-col overflow-clip rounded-2xl bg-paper shadow-(--shadow) max-lg:hidden lg:sticky lg:top-4 lg:h-(--fit)">
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
              className={`min-h-0 w-full flex-1 border-0 bg-wash transition-opacity ${settingsError ? "opacity-50" : ""}`}
            />
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted">Building the preview…</div>
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
