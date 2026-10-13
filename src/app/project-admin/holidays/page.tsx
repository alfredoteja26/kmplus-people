"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Badge } from "@/components/product/Badge";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { plainAdminError } from "@/components/work-delivery/admin/errors";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { ProjectAdminSubnav } from "@/components/work-delivery/ProjectAdminSubnav";
import type { IndonesiaHolidayFeedItem } from "@/lib/commands";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDate, formatUtcWithShortMonth, plural } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { PublicHoliday, PublicHolidayOrigin } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

const FEED_DOWN = "The Indonesia holiday source did not respond. Your list was not changed. Try Refresh Indonesia holidays again.";

function mark(origin: PublicHolidayOrigin | undefined): string {
  if (origin === "libur") return "Libur Nasional";
  if (origin === "bersama") return "Cuti Bersama";
  return "Cuti Bersama (Internal)";
}

const ORIGIN_DOT: Record<PublicHolidayOrigin, string> = {
  libur: "bg-accent-2",
  bersama: "bg-warning",
  internal: "bg-line-strong",
};

function utcDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

function jakartaYear(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date()));
}

async function loadYear(year: number): Promise<{ items: IndonesiaHolidayFeedItem[]; warning: string | null }> {
  const response = await fetch(`https://titimangsa.sangkan.dev/v1/holidays?year=${year}`);
  if (!response.ok) {
    return { items: [], warning: `${year} is not available from the Indonesia holiday source.` };
  }
  const body = (await response.json()) as {
    data?: {
      date?: string;
      localName?: string;
      name?: string;
      type?: string;
      isNationalHoliday?: boolean;
      isCollectiveLeave?: boolean;
    }[];
  };
  const items: IndonesiaHolidayFeedItem[] = [];
  for (const row of body.data ?? []) {
    if (!row.date) continue;
    const origin: IndonesiaHolidayFeedItem["origin"] | null =
      row.isNationalHoliday || row.type === "national_holiday"
        ? "libur"
        : row.isCollectiveLeave || row.type === "collective_leave"
          ? "bersama"
          : null;
    if (!origin) continue;
    items.push({ date: row.date, name: row.localName || row.name || row.date, origin });
  }
  return { items, warning: null };
}

type SheetState = { kind: "add" } | { kind: "rename"; row: PublicHoliday } | null;

export default function PublicHolidaysPage() {
  const { state, addPublicHoliday, renamePublicHoliday, removePublicHoliday, applyIndonesiaHolidayFeed } = useStore();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [draftDate, setDraftDate] = useState("");
  const [draftName, setDraftName] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [year, setYear] = useState(jakartaYear);

  if (!hasAdminGrant(state)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <h1 className="m-0 font-heading text-h1 font-medium">Public holidays</h1>
        <p className="m-0 text-sm">Only an Admin can edit public holidays.</p>
      </div>
    );
  }

  function say(message: string) {
    setError("");
    setNotice(message);
  }

  function fail(message: string) {
    setNotice("");
    setError(message);
  }

  function open(next: SheetState) {
    setDraftDate("");
    setDraftName(next?.kind === "rename" ? next.row.name : "");
    setSheetError("");
    setSheet(next);
  }

  function submitSheet() {
    if (!sheet) return;
    const name = draftName.trim();
    if (sheet.kind === "add") {
      const result = addPublicHoliday(draftDate, draftName);
      if (result.error) {
        setSheetError(plainAdminError(result.error));
        return;
      }
      setYear(Number(draftDate.slice(0, 4)));
      say(`Added ${formatDate(draftDate)}, ${name}.`);
    } else {
      const message = renamePublicHoliday(sheet.row.id, name).error;
      if (message) {
        setSheetError(plainAdminError(message));
        return;
      }
      say(`Renamed ${formatDate(sheet.row.date)} to ${name}.`);
    }
    setSheet(null);
  }

  function remove(row: PublicHoliday) {
    const message = removePublicHoliday(row.id).error;
    if (message) {
      fail(plainAdminError(message));
      return;
    }
    say(row.origin === "internal" ? `Removed ${formatDate(row.date)}, ${row.name}.` : `Hid ${formatDate(row.date)}, ${row.name}.`);
  }

  function restore(row: PublicHoliday) {
    const message = addPublicHoliday(row.date, row.name).error;
    if (message) {
      fail(plainAdminError(message));
      return;
    }
    say(`Added ${formatDate(row.date)} back as Cuti Bersama (Internal).`);
  }

  async function refresh() {
    setRefreshing(true);
    setError("");
    setNotice("");
    const feedYear = jakartaYear();
    try {
      const [current, next] = await Promise.all([loadYear(feedYear), loadYear(feedYear + 1)]);
      const items = [...current.items, ...next.items];
      if (items.length === 0) {
        setError(FEED_DOWN);
        return;
      }
      const result = applyIndonesiaHolidayFeed(items);
      if (result.error) {
        setError(plainAdminError(result.error));
        return;
      }
      const nextYearNote = next.warning ? ` ${feedYear + 1} is not published yet, so that year was not changed.` : "";
      setNotice(
        result.added === 0
          ? `Indonesia holidays are up to date. Names you edited were kept.${nextYearNote}`
          : `Added ${plural(result.added, "missing Indonesia date")}. Names you edited were kept.${nextYearNote}`,
      );
    } catch {
      setError(FEED_DOWN);
    } finally {
      setRefreshing(false);
    }
  }

  const years = Array.from(
    new Set([jakartaYear(), jakartaYear() + 1, ...state.publicHolidays.map((row) => Number(row.date.slice(0, 4)))]),
  )
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const yearAt = years.indexOf(year);

  const rows = state.publicHolidays
    .filter((row) => row.date.startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const shown = rows.filter((row) => !row.suppressed).length;
  const hidden = rows.length - shown;
  const months = new Map<string, PublicHoliday[]>();
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), row]);
  }

  const refreshButton = (
    <Button type="button" size="sm" aria-label="Refresh Indonesia holidays" onClick={() => void refresh()} disabled={refreshing} aria-busy={refreshing}>
      <RefreshCwIcon aria-hidden="true" className={cn(refreshing && "animate-spin")} />
      <span className="@2xl:hidden">{refreshing ? "Refreshing…" : "Refresh"}</span>
      <span className="@max-2xl:hidden">{refreshing ? "Refreshing Indonesia holidays…" : "Refresh Indonesia holidays"}</span>
    </Button>
  );
  const addButton = (
    <Button type="button" variant="outline" size="sm" onClick={() => open({ kind: "add" })}>
      <PlusIcon aria-hidden="true" />
      Add a date
    </Button>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header>
        <h1 className="m-0 font-heading text-h1 font-medium">Public holidays</h1>
        <p className="mt-1 mb-0 text-muted">
          Company-wide days off. They show on everyone&apos;s timesheet and don&apos;t count as work hours, though people can
          still log time on them.
        </p>
        <ProjectAdminSubnav className="mt-4" />
      </header>

      {notice ? (
        <p role="status" className="m-0 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-sm text-destructive-foreground">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="holiday-year" className="@container min-w-0 overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" role="group" aria-label="Year">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous year"
                disabled={yearAt <= 0}
                onClick={() => setYear(years[yearAt - 1])}
              >
                <ChevronLeftIcon aria-hidden="true" />
              </Button>
              <h2 id="holiday-year" className="m-0 min-w-[3.5rem] text-center text-base font-medium tabular-nums" aria-live="polite">
                {year}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next year"
                disabled={yearAt < 0 || yearAt >= years.length - 1}
                onClick={() => setYear(years[yearAt + 1])}
              >
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
            <span className="text-sm text-muted tabular-nums">
              {plural(shown, "date")}
              {hidden > 0 ? ` · ${hidden} hidden` : null}
            </span>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 @2xl:flex @2xl:w-auto @2xl:items-center">
            {addButton}
            {refreshButton}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyBlock
            className="py-10"
            icon={<CalendarDaysIcon aria-hidden="true" />}
            title={`No public holidays in ${year}`}
            description="Load the national dates from the Indonesia holiday source, or add a company date."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {addButton}
                {refreshButton}
              </div>
            }
          />
        ) : (
          [...months.entries()].map(([key, monthRows]) => (
            <div key={key}>
              <h3 className="m-0 border-t border-line bg-[color-mix(in_srgb,var(--wash)_50%,var(--paper))] px-5 py-2 text-xs font-medium tracking-[0.06em] text-muted uppercase first:border-t-0">
                {MONTH.format(utcDate(`${key}-01`))}
                <span className="font-normal tracking-normal normal-case tabular-nums"> · {plural(monthRows.filter((row) => !row.suppressed).length, "date")}</span>
              </h3>
              <ul className="m-0 list-none p-0">
                {monthRows.map((row) => (
                  <HolidayRow
                    key={row.id}
                    row={row}
                    onRename={() => open({ kind: "rename", row })}
                    onRemove={() => remove(row)}
                    onRestore={() => restore(row)}
                  />
                ))}
              </ul>
            </div>
          ))
        )}

        {hidden > 0 ? (
          <p className="m-0 border-t border-line px-5 py-3 text-sm text-muted">
            Hidden Indonesia dates stay off everyone&apos;s timesheet. A later refresh won&apos;t bring them back.
          </p>
        ) : null}
      </section>

      {sheet ? (
        <FormSheet
          title={sheet.kind === "add" ? "Add a date" : "Rename this date"}
          description={
            sheet.kind === "add"
              ? "Dates you add here are marked Cuti Bersama (Internal)."
              : sheet.row.origin === "internal"
                ? `${formatDate(sheet.row.date)}, Cuti Bersama (Internal).`
                : `${formatDate(sheet.row.date)}, ${mark(sheet.row.origin)}. Your name is kept when Indonesia holidays are refreshed.`
          }
          onClose={() => setSheet(null)}
          onSubmit={submitSheet}
          submitLabel={sheet.kind === "add" ? "Add date" : "Save name"}
          submitDisabled={
            !draftName.trim() ||
            (sheet.kind === "add" ? !draftDate : draftName.trim() === sheet.row.name)
          }
        >
          {sheet.kind === "add" ? (
            <Field label="Date">
              <Input
                type="date"
                value={draftDate}
                onChange={(event) => {
                  setDraftDate(event.target.value);
                  setSheetError("");
                }}
              />
            </Field>
          ) : null}
          <Field label="Name">
            <Input
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
                setSheetError("");
              }}
            />
          </Field>
          {sheetError ? (
            <p role="alert" className="m-0 text-sm text-destructive-foreground">
              {sheetError}
            </p>
          ) : null}
        </FormSheet>
      ) : null}
    </div>
  );
}

function OriginChip({ origin }: { origin: PublicHolidayOrigin }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[6px] bg-tint px-2 text-label whitespace-nowrap text-accent-hover shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-2)_30%,transparent)]">
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", ORIGIN_DOT[origin])} />
      {mark(origin)}
    </span>
  );
}

function HolidayRow({
  row,
  onRename,
  onRemove,
  onRestore,
}: {
  row: PublicHoliday;
  onRename: () => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const date = utcDate(row.date);
  const indonesia = row.origin === "libur" || row.origin === "bersama";
  const when = formatDate(row.date);
  return (
    <li
      className={cn(
        "grid min-h-11 grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 border-t border-line px-5 py-2 first:border-t-0",
        "@2xl:grid-cols-[6rem_minmax(0,1fr)_12rem_11rem]",
        row.suppressed && "text-muted",
      )}
    >
      <span className="flex items-baseline gap-2 text-sm whitespace-nowrap tabular-nums">
        <span className={cn("font-medium", row.suppressed ? "text-muted" : "text-ink")}>{formatUtcWithShortMonth(DAY_MONTH, date)}</span>
        <span className="text-faint">{WEEKDAY.format(date)}</span>
      </span>
      <span className={cn("min-w-0 text-sm break-words", row.suppressed ? "text-muted" : "text-ink")}>{row.name}</span>
      <span className="col-start-2 flex flex-wrap items-center gap-1.5 @2xl:col-start-3">
        <OriginChip origin={row.origin} />
        {row.suppressed ? <Badge>Hidden</Badge> : null}
      </span>
      <span className="col-start-2 -ml-2 flex flex-wrap items-center gap-1 @2xl:col-start-4 @2xl:ml-0 @2xl:justify-end">
        {row.suppressed ? (
          <Button type="button" variant="ghost" size="sm" aria-label={`Add back ${row.name}, ${when}, as internal`} onClick={onRestore}>
            Add back as internal
          </Button>
        ) : (
          <>
            <Button type="button" variant="ghost" size="sm" aria-label={`Rename ${row.name}, ${when}`} onClick={onRename}>
              Rename
            </Button>
            <ConfirmAction
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted hover:text-destructive-foreground"
                  aria-label={`${indonesia ? "Hide" : "Remove"} ${row.name}, ${when}`}
                >
                  {indonesia ? "Hide" : "Remove"}
                </Button>
              }
              title={`${indonesia ? "Hide" : "Remove"} ${row.name}?`}
              description={
                indonesia
                  ? `${when} comes off everyone's timesheet, and a later refresh won't bring this Indonesia holiday back. You can still add it back as Cuti Bersama (Internal).`
                  : `${when} is a company date. Removing it deletes it from this list.`
              }
              confirmLabel={indonesia ? "Hide this date" : "Remove this date"}
              cancelLabel="Keep this date"
              onConfirm={onRemove}
            />
          </>
        )}
      </span>
    </li>
  );
}
