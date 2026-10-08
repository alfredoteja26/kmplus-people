"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Calendar } from "@/components/coss/calendar";
import { AppSheet } from "@/components/product/AppSheet";
import { Callout, Card, PageHeader } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { Table, Td, Th } from "@/components/product/Table";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDate } from "@/lib/labels";
import type { IndonesiaHolidayFeedItem } from "@/lib/commands";
import { useStore } from "@/lib/store";
import type { PublicHoliday, PublicHolidayOrigin } from "@/lib/types";
import Link from "next/link";
import { useState, type ComponentProps } from "react";

function mark(origin: PublicHolidayOrigin | undefined): string {
  if (origin === "libur") return "Libur Nasional";
  if (origin === "bersama") return "Cuti Bersama";
  return "Cuti Bersama (Internal)";
}

function jakartaYear(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date()));
}

function jakartaMonth(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", month: "numeric" }).format(new Date())) - 1;
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

export default function PublicHolidaysPage() {
  const { state, addPublicHoliday, renamePublicHoliday, removePublicHoliday, applyIndonesiaHolidayFeed } = useStore();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftName, setDraftName] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [year, setYear] = useState(jakartaYear);
  const [month, setMonth] = useState(jakartaMonth);

  function openSheet(date: string) {
    setDraftDate(date);
    setDraftName("");
    setSheetError("");
    setSheetOpen(true);
  }

  function addFromSheet() {
    const result = addPublicHoliday(draftDate, draftName);
    if (result.error) {
      setSheetError(result.error);
      return;
    }
    setSheetError("");
    setNotice(`Added ${formatDate(draftDate)}, ${draftName.trim()}.`);
    setDraftDate("");
    setDraftName("");
    setSheetOpen(false);
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
        setError(
          "The Indonesia holiday source did not respond. Your list was not changed. Try Refresh Indonesia holidays again.",
        );
        return;
      }
      const result = applyIndonesiaHolidayFeed(items);
      if (result.error) {
        setError(result.error);
        return;
      }
      const nextYearNote = next.warning ? ` ${feedYear + 1} is not published yet, so that year was not changed.` : "";
      setNotice(
        result.added === 0
          ? `Indonesia holidays are up to date. Names you edited were kept.${nextYearNote}`
          : `Added ${result.added} missing Indonesia dates. Names you edited were kept.${nextYearNote}`,
      );
    } catch {
      setError("The Indonesia holiday source did not respond. Your list was not changed. Try Refresh Indonesia holidays again.");
    } finally {
      setRefreshing(false);
    }
  }

  const years = Array.from(
    new Set([jakartaYear(), jakartaYear() + 1, ...state.publicHolidays.map((row) => Number(row.date.slice(0, 4)))]),
  )
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (!hasAdminGrant(state)) {
    return (
      <div>
        <PageHeader title="Public holidays" />
        <Callout tone="warning">Only an Admin can edit public holidays.</Callout>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public holidays"
        description="Company-wide holidays. They appear on everyone's timesheet and don't count as work hours. People can still log time on them."
        actions={
          <Link href="/project-admin" className="text-sm font-medium text-accent no-underline hover:underline">
            Back to Project Admin
          </Link>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Year" className="w-36">
          <Select
            value={String(year)}
            onChange={(event) => {
              const next = Number(event.target.value);
              setYear(next);
              setMonth(next === jakartaYear() ? jakartaMonth() : 0);
            }}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="button" onClick={() => void refresh()} disabled={refreshing} aria-busy={refreshing}>
          {refreshing ? "Refreshing Indonesia holidays…" : "Refresh Indonesia holidays"}
        </Button>
        <Button type="button" variant="outline" onClick={() => openSheet("")}>
          Add a date
        </Button>
      </div>
      {error ? <Callout tone="danger">{error}</Callout> : null}
      {notice ? <Callout live="status">{notice}</Callout> : null}
      <div className="grid grid-cols-1 gap-6">
        <HolidayMonth
          year={year}
          month={month}
          onMonth={setMonth}
          holidays={state.publicHolidays.filter((row) => !row.suppressed && row.date.startsWith(String(year)))}
          onAddOn={(date) => openSheet(date)}
        />
        <HolidayTable
          year={year}
          holidays={state.publicHolidays.filter((row) => row.date.startsWith(String(year)))}
          onRename={(id, name) => renamePublicHoliday(id, name).error}
          onRemove={(id) => removePublicHoliday(id)}
          onRestore={(date, name) => {
            const result = addPublicHoliday(date, name);
            setError(result.error ?? "");
            return result.error;
          }}
        />
      </div>
      {sheetOpen ? (
        <AppSheet title="Add a date" onClose={() => setSheetOpen(false)}>
          <p className="m-0 mb-4 text-sm text-muted">Dates you add here are marked Cuti Bersama (Internal).</p>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              addFromSheet();
            }}
          >
            <Field label="Date">
              <Input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} />
            </Field>
            <Field label="Name">
              <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
            </Field>
            {sheetError ? <Callout tone="danger">{sheetError}</Callout> : null}
            <Button type="submit">Add date</Button>
          </form>
        </AppSheet>
      ) : null}
    </div>
  );
}

function rowWash(origin: PublicHolidayOrigin | undefined): string {
  if (origin === "libur") return "bg-tint";
  if (origin === "bersama") return "bg-[color-mix(in_srgb,var(--warning)_14%,var(--paper))]";
  return "bg-[color-mix(in_srgb,var(--ink)_6%,var(--paper))]";
}

function HolidayTable({
  year,
  holidays,
  onRename,
  onRemove,
  onRestore,
}: {
  year: number;
  holidays: PublicHoliday[];
  onRename: (id: string, name: string) => string | null;
  onRemove: (id: string) => void;
  onRestore: (date: string, name: string) => string | null;
}) {
  const active = holidays.filter((row) => !row.suppressed).sort((a, b) => a.date.localeCompare(b.date));
  const removed = holidays.filter((row) => row.suppressed).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="min-w-0">
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th> </Th>
          </tr>
        </thead>
        <tbody>
          {active.length === 0 ? (
            <tr>
              <Td colSpan={4} className="whitespace-normal text-muted">
                No public holidays in {year}. Choose Refresh Indonesia holidays to load the national dates, or Add a date.
              </Td>
            </tr>
          ) : (
            active.map((row) => <HolidayTableRow key={row.id} row={row} onRename={onRename} onRemove={onRemove} />)
          )}
          {removed.length > 0 ? (
            <tr>
              <Td colSpan={4} className="text-sm text-muted">
                Removed Indonesia dates stay off the list. A later refresh will not restore them.
              </Td>
            </tr>
          ) : null}
          {removed.map((row) => (
            <RemovedRow key={row.id} row={row} onRestore={onRestore} />
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function HolidayTableRow({
  row,
  onRename,
  onRemove,
}: {
  row: PublicHoliday;
  onRename: (id: string, name: string) => string | null;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState(row.name);
  const [renameError, setRenameError] = useState("");
  const indonesia = row.origin === "libur" || row.origin === "bersama";
  const wash = rowWash(row.origin);
  return (
    <tr className={wash}>
      <Td className={`${wash} whitespace-nowrap tabular-nums`}>{formatDate(row.date)}</Td>
      <Td className={`${wash} whitespace-normal`}>
        <form
          className="flex min-w-0 flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = name.trim();
            if (!next) {
              setRenameError("Enter a name, then choose Save name.");
              setName(row.name);
              return;
            }
            const message = onRename(row.id, next);
            setRenameError(message ?? "");
            if (message) setName(row.name);
          }}
        >
          <Input
            aria-label={`Name for ${formatDate(row.date)}`}
            className="min-w-[10rem] flex-1"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setRenameError("");
            }}
          />
          <Button type="submit" variant="outline" size="sm" disabled={!name.trim() || name.trim() === row.name}>
            Save name
          </Button>
        </form>
        {renameError ? (
          <p className="m-0 mt-2 text-sm text-danger" role="alert">
            {renameError}
          </p>
        ) : null}
      </Td>
      <Td className={`${wash} whitespace-normal`}>{mark(row.origin)}</Td>
      <Td className={wash}>
        <ConfirmAction
          trigger={
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${row.name}, ${formatDate(row.date)}`}>
              Remove
            </Button>
          }
          title={`Remove ${row.name}?`}
          description={
            indonesia
              ? `${formatDate(row.date)} will be removed from the calendar, and a later refresh will not bring this Indonesia holiday back. You can still add it again as Cuti Bersama (Internal).`
              : `${formatDate(row.date)} is a company date. Removing it deletes it from this list.`
          }
          confirmLabel="Remove this date"
          cancelLabel="Keep this date"
          onConfirm={() => onRemove(row.id)}
        />
      </Td>
    </tr>
  );
}

function RemovedRow({ row, onRestore }: { row: PublicHoliday; onRestore: (date: string, name: string) => string | null }) {
  const [restoreError, setRestoreError] = useState("");
  return (
    <tr>
      <Td className="whitespace-nowrap tabular-nums text-muted">{formatDate(row.date)}</Td>
      <Td className="whitespace-normal text-muted">{row.name}</Td>
      <Td className="whitespace-normal text-muted">Removed</Td>
      <Td>
        <Button type="button" variant="outline" onClick={() => setRestoreError(onRestore(row.date, row.name) ?? "")}>
          Add back as internal
        </Button>
        {restoreError ? (
          <p className="m-0 mt-2 text-sm text-danger" role="alert">
            {restoreError}
          </p>
        ) : null}
      </Td>
    </tr>
  );
}

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateOf(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const DOT: Record<"libur" | "bersama" | "internal", string> = {
  libur: "bg-accent",
  bersama: "bg-warning",
  internal: "bg-ink",
};

/** Day cell with a dot for the holiday origin; module-level so focus survives re-renders. */
const HolidayDayButton: NonNullable<ComponentProps<typeof Calendar>["components"]>["DayButton"] = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- keep `day` off the DOM button
  day,
  modifiers,
  children,
  ...props
}) => {
  const origin = modifiers.libur ? "libur" : modifiers.bersama ? "bersama" : modifiers.internal ? "internal" : null;
  return (
    <button {...props}>
      <span className="flex flex-col items-center leading-none">
        <span className="tabular-nums">{children}</span>
        <span
          aria-hidden="true"
          className={`mt-1 size-1.5 rounded-full ${origin ? (modifiers.selected ? "bg-primary-foreground" : DOT[origin]) : "bg-transparent"}`}
        />
      </span>
    </button>
  );
};

function HolidayMonth({
  year,
  month,
  onMonth,
  holidays,
  onAddOn,
}: {
  year: number;
  month: number;
  onMonth: (month: number) => void;
  holidays: PublicHoliday[];
  onAddOn: (date: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const byDate = new Map(holidays.map((row) => [row.date, row]));
  const originOf = (row: PublicHoliday): keyof typeof DOT =>
    row.origin === "libur" ? "libur" : row.origin === "bersama" ? "bersama" : "internal";
  const datesFor = (origin: keyof typeof DOT) =>
    holidays.filter((row) => originOf(row) === origin).map((row) => dateOf(row.date));
  const pickedHoliday = picked ? byDate.get(picked) : undefined;
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  return (
    <Card className="min-w-0">
      <section aria-label="Holiday calendar" className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        <Calendar
          className="mx-auto sm:mx-0"
          mode="single"
          weekStartsOn={1}
          showOutsideDays={false}
          month={new Date(year, month, 1)}
          onMonthChange={(next) => onMonth(next.getMonth())}
          startMonth={new Date(year, 0, 1)}
          endMonth={new Date(year, 11, 1)}
          selected={picked ? dateOf(picked) : undefined}
          onSelect={(date) => setPicked(date ? isoOf(date) : null)}
          modifiers={{ libur: datesFor("libur"), bersama: datesFor("bersama"), internal: datesFor("internal") }}
          labels={{
            labelDayButton: (date) => {
              const holiday = byDate.get(isoOf(date));
              return holiday ? `${formatDate(isoOf(date))}, ${mark(holiday.origin)}, ${holiday.name}` : formatDate(isoOf(date));
            },
          }}
          components={{ DayButton: HolidayDayButton }}
        />
        <div className="min-w-0 flex-1 sm:pt-2">
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-muted sm:flex-col">
            <li className="inline-flex items-center gap-2">
              <span className={`size-2 rounded-full ${DOT.libur}`} /> Libur Nasional
            </li>
            <li className="inline-flex items-center gap-2">
              <span className={`size-2 rounded-full ${DOT.bersama}`} /> Cuti Bersama
            </li>
            <li className="inline-flex items-center gap-2">
              <span className={`size-2 rounded-full ${DOT.internal}`} /> Cuti Bersama (Internal)
            </li>
          </ul>
          <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
            {pickedHoliday ? (
              <p className="m-0">
                {formatDate(pickedHoliday.date)} · {pickedHoliday.name} · {mark(pickedHoliday.origin)}
              </p>
            ) : picked ? (
              <>
                <p className="m-0 text-muted">No public holiday on {formatDate(picked)}.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => onAddOn(picked)}>
                  Add this date
                </Button>
              </>
            ) : (
              <p className="m-0 text-muted">
                {holidays.some((row) => row.date.startsWith(monthPrefix))
                  ? "Select a date to see its holiday, or an empty date to add one."
                  : "No public holiday this month. Select a date to add one."}
              </p>
            )}
          </div>
        </div>
      </section>
    </Card>
  );
}
