"use client";

import { Button } from "@/components/coss/button";
import { Callout, PageHeader } from "@/components/product/Card";
import { Table, Td, Th } from "@/components/product/Table";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDate, formatDateRange } from "@/lib/labels";
import { jakartaTodayIso, leaveIsApproved, workbookRows } from "@/lib/work-delivery-query";
import { buildXlsx, XLSX_MIME } from "@/lib/xlsx";
import { useStore } from "@/lib/store";
import Link from "next/link";

const NUMERIC_COLUMNS = new Set(["hours", "load"]);

function downloadWorkbook(state: ReturnType<typeof useStore>["state"]) {
  const sheets = workbookRows(state).map((sheet) => ({
    ...sheet,
    rows: sheet.rows.map((row) =>
      row.map((cell, index) =>
        NUMERIC_COLUMNS.has(sheet.columns[index] ?? "") && cell !== "" ? Number(cell) : cell,
      ),
    ),
  }));
  const bytes = buildXlsx(sheets);
  const blob = new Blob([bytes as BlobPart], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kmplus-project-report-${jakartaTodayIso()}.xlsx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ProjectAdminPage() {
  const { state } = useStore();
  if (!hasAdminGrant(state)) {
    return (
      <div>
        <PageHeader title="Project Admin" />
        <Callout tone="warning">Only an Admin can open Project Admin.</Callout>
      </div>
    );
  }

  const approvedLeave = state.leaveRequests.filter((row) => leaveIsApproved(row));
  const reportRowCount = workbookRows(state).reduce((sum, sheet) => sum + sheet.rows.length, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Project Admin"
        description="Set up project lists, leave types and public holidays, decide leave requests, and read company project, staffing, timesheet and leave reports."
      />

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={reportRowCount > 0 ? "default" : "outline"}
          onClick={() => downloadWorkbook(state)}
        >
          Download report
        </Button>
        <Button variant="outline" render={<Link href="/project-admin/configure" />}>
          Edit lists
        </Button>
        <Button variant="outline" render={<Link href="/project-admin/holidays" />}>
          Public holidays
        </Button>
        <Button variant="outline" render={<Link href="/leave/decide" />}>
          Leave requests
        </Button>
      </div>
      <p className="m-0 text-sm text-muted">
        The report is a text file with three sheets: Projects, Staffing and Timesheet.
      </p>

      <section>
        <h2 className="mt-0 mb-3 text-h2 font-medium">Projects</h2>
        {state.projects.length === 0 ? (
          <p className="m-0 text-sm text-muted">
            No projects yet.{" "}
            <Link href="/projects" className="font-medium text-accent underline-offset-2 hover:underline">
              Open Projects
            </Link>{" "}
            to add one.
          </p>
        ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Client</Th>
              <Th>Start</Th>
              <Th>End</Th>
            </tr>
          </thead>
          <tbody>
            {state.projects.map((row) => (
              <tr key={row.id}>
                <Td>{row.code}</Td>
                <Td>{row.name}</Td>
                <Td>{row.clientName || "—"}</Td>
                <Td>{formatDate(row.startDate)}</Td>
                <Td>{formatDate(row.endDate) || "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        )}
      </section>

      <section>
        <h2 className="mt-0 mb-3 text-h2 font-medium">Staffing</h2>
        {state.staffings.length === 0 ? (
          <p className="m-0 text-sm text-muted">No one is staffed on a project yet. Staff people from a project&apos;s page.</p>
        ) : (
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Project</Th>
              <Th>Start</Th>
              <Th>End</Th>
              <Th>Load</Th>
            </tr>
          </thead>
          <tbody>
            {state.staffings.map((row) => {
              const person = state.people.find((item) => item.id === row.personId);
              const project = state.projects.find((item) => item.id === row.projectId);
              return (
                <tr key={row.id}>
                  <Td>{person?.preferredName || person?.legalName || "Unknown person"}</Td>
                  <Td>{project?.code ?? "Unknown project"}</Td>
                  <Td>{formatDate(row.startDate)}</Td>
                  <Td>{formatDate(row.endDate) || "—"}</Td>
                  <Td>{row.load}%</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        )}
      </section>

      <section>
        <h2 className="mt-0 mb-3 text-h2 font-medium">Approved leave</h2>
        <p className="mt-0 mb-3 text-sm text-muted">Shows approved leave only. Pending requests are in Leave requests.</p>
        {approvedLeave.length === 0 ? (
          <p className="m-0 text-sm text-muted">No approved leave yet.</p>
        ) : (
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Type</Th>
              <Th>Dates</Th>
              <Th>Pay</Th>
            </tr>
          </thead>
          <tbody>
            {approvedLeave.map((row) => {
              const person = state.people.find((item) => item.id === row.personId);
              return (
                <tr key={row.id}>
                  <Td>{person?.preferredName || person?.legalName || "Unknown person"}</Td>
                  <Td>{row.kind === "cuti" ? "Cuti" : row.kind === "sick" ? "Sick" : "Remote"}</Td>
                  <Td>{formatDateRange(row.startDate, row.endDate || row.startDate)}</Td>
                  <Td>{row.decision === "paid" ? "Paid" : "Unpaid"}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        )}
      </section>
    </div>
  );
}
