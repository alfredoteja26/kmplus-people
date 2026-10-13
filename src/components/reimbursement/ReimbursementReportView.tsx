"use client";

import { Button } from "@/components/coss/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/coss/table";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { hasAdminGrant } from "@/lib/domain-query";
import { personName } from "@/lib/project-view";
import { reimbursementReport, reimbursementWorkbook, type ReimbursementReportFilters } from "@/lib/reimbursement-report";
import { REIMBURSEMENT_STATE_LABEL, formatExpenseMonth, formatRupiah, type ReimbursementState } from "@/lib/reimbursement-view";
import { useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { jakartaTodayIso } from "@/lib/work-delivery-query";
import { buildXlsx, XLSX_MIME } from "@/lib/xlsx";
import { DownloadIcon, ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReimbursementRow } from "./ReimbursementRow";

const HEAD = "first:ps-5 last:pe-5 text-xs font-medium tracking-[0.06em] text-faint uppercase";
const CELL = "first:ps-5 last:pe-5 tabular-nums";
const STATES: ReimbursementState[] = ["pending", "approved", "paid", "rejected", "withdrawn"];

function download(state: AppState, filters: ReimbursementReportFilters) {
  const bytes = buildXlsx(reimbursementWorkbook(state, reimbursementReport(state, filters)));
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: XLSX_MIME }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kmplus-reimbursements-${filters.month ?? "all"}-${jakartaTodayIso()}.xlsx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReimbursementReportView() {
  const { state } = useStore();
  const [filters, setFilters] = useState<ReimbursementReportFilters>({});

  if (!hasAdminGrant(state)) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <h1 className="m-0 font-heading text-h1 font-medium">Reimbursement report</h1>
        <p className="m-0 text-sm">
          Only an Admin can read the reimbursement report.{" "}
          <Link href="/reimbursement" className="font-medium text-accent underline-offset-2 hover:underline">
            See your own reimbursements
          </Link>
          .
        </p>
      </div>
    );
  }

  const report = reimbursementReport(state, filters);
  const set = (key: keyof ReimbursementReportFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  const months = [...new Set(state.reimbursementRequests.map((row) => row.expenseDate.slice(0, 7)))].sort().reverse();
  const people = [...new Set(state.reimbursementRequests.map((row) => row.personId))]
    .map((id) => state.people.find((row) => row.id === id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => personName(a).localeCompare(personName(b)));
  const types = [...state.reimbursementTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const projects = [...state.projects].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium">Reimbursement report</h1>
          <p className="mt-1 mb-0 text-muted">
            Months follow the expense date. Withdrawn requests count nothing; rejected ones count as asked only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/reimbursement/decide" />}>
            Requests to decide
          </Button>
          <Button type="button" disabled={report.rows.length === 0} onClick={() => download(state, filters)}>
            <DownloadIcon aria-hidden="true" />
            Export to Excel
          </Button>
        </div>
      </header>

      <section aria-label="Filters" className="grid grid-cols-2 gap-3 rounded-2xl bg-paper p-4 shadow-(--shadow) md:grid-cols-5">
        <Field label="Month">
          <Select value={filters.month ?? ""} onChange={(event) => set("month", event.target.value)}>
            <option value="">All months</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {formatExpenseMonth(month)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Person">
          <Select value={filters.personId ?? ""} onChange={(event) => set("personId", event.target.value)}>
            <option value="">Everyone</option>
            {people.map((row) => (
              <option key={row.id} value={row.id}>
                {personName(row)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={filters.reimbursementTypeId ?? ""} onChange={(event) => set("reimbursementTypeId", event.target.value)}>
            <option value="">All types</option>
            {types.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Project">
          <Select value={filters.projectId ?? ""} onChange={(event) => set("projectId", event.target.value)}>
            <option value="">All Projects</option>
            {projects.map((row) => (
              <option key={row.id} value={row.id}>
                {`${row.code} · ${row.name}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="State">
          <Select value={filters.state ?? ""} onChange={(event) => set("state", event.target.value)}>
            <option value="">Any state</option>
            {STATES.map((value) => (
              <option key={value} value={value}>
                {REIMBURSEMENT_STATE_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section aria-label="Monthly summary" className="overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
        <h2 className="m-0 border-b border-line px-5 py-3.5 text-base font-medium">Monthly summary</h2>
        {report.months.length === 0 ? (
          <p className="m-0 px-5 py-4 text-sm text-muted">No reimbursements match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="[&_td]:h-11">
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>Month</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Requests</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Asked</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Approved</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.months.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className={`${CELL} font-medium`}>{formatExpenseMonth(row.month)}</TableCell>
                    <TableCell className={`${CELL} text-right`}>{row.count}</TableCell>
                    <TableCell className={`${CELL} text-right`}>{formatRupiah(row.asked)}</TableCell>
                    <TableCell className={`${CELL} text-right`}>{formatRupiah(row.approved)}</TableCell>
                    <TableCell className={`${CELL} text-right`}>{formatRupiah(row.paid)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-wash font-medium">
                  <TableCell className={CELL}>Total</TableCell>
                  <TableCell className={`${CELL} text-right`}>{report.totals.count}</TableCell>
                  <TableCell className={`${CELL} text-right`}>{formatRupiah(report.totals.asked)}</TableCell>
                  <TableCell className={`${CELL} text-right`}>{formatRupiah(report.totals.approved)}</TableCell>
                  <TableCell className={`${CELL} text-right`}>{formatRupiah(report.totals.paid)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section aria-label="Requests" className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
        <h2 className="m-0 flex items-baseline gap-2 border-b border-line px-5 py-3.5 text-base font-medium">
          Requests
          <span className="text-sm font-normal text-muted tabular-nums">{report.rows.length}</span>
        </h2>
        {report.rows.length === 0 ? (
          <EmptyBlock
            className="py-8"
            icon={<ReceiptIcon aria-hidden="true" />}
            title="Nothing here"
            description="No reimbursement matches these filters. Clear a filter to see more."
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {report.rows.map((row) => (
              <ReimbursementRow key={row.id} state={state} row={row} showPerson />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
