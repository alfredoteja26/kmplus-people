"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Textarea } from "@/components/coss/textarea";
import { AppSheet } from "@/components/product/AppSheet";
import { Callout, Card, PageHeader } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDate, formatDateRange } from "@/lib/labels";
import { uploadWorkDeliveryFile } from "@/lib/upload-work-delivery";
import { useStore } from "@/lib/store";
import type { LeaveDecision, LeaveKind, LeaveRequest, LeaveSpanMode } from "@/lib/types";
import { storedFileHref } from "@/lib/file-access";
import Link from "next/link";
import { useState } from "react";

function personName(state: ReturnType<typeof useStore>["state"], personId: string): string {
  const person = state.people.find((row) => row.id === personId);
  return person?.preferredName || person?.legalName || "Unknown person";
}

const KIND_LABELS: Record<LeaveKind, string> = {
  cuti: "Cuti",
  sick: "Sick",
  remote: "Remote",
};

function whenLabel(row: LeaveRequest): string {
  if (row.spanMode === "hours" && row.startTime && row.endTime) {
    return `${formatDate(row.startDate)}, ${row.startTime}–${row.endTime}`;
  }
  return formatDateRange(row.startDate, row.endDate || row.startDate);
}

function decisionLabel(row: LeaveRequest): string {
  if (row.decision === "paid") return "Approved (paid)";
  if (row.decision === "unpaid") return "Approved (unpaid)";
  if (row.decision === "refused") return "Declined";
  return "Waiting for a decision";
}

function decisionTone(row: LeaveRequest): string {
  if (row.decision === "refused") return "text-danger";
  if (row.decision === null) return "text-muted";
  return "";
}

export type LeaveQueueMode = "mine" | "decide";

/**
 * "mine": the signed-in Person's own requests, any decision, plus "Request leave".
 * "decide": Admin only — requests waiting for a decision (and declined ones that can be reconsidered),
 * with the decision buttons; the request sheet may file for another Person.
 */
export function LeaveQueue({ mode }: { mode: LeaveQueueMode }) {
  const { state, fileLeaveRequest, decideLeaveRequest } = useStore();
  const admin = hasAdminGrant(state);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (mode === "decide" && !admin) {
    return (
      <div>
        <PageHeader title="Leave requests" />
        <p className="m-0 text-sm">
          Only an Admin can decide leave requests.{" "}
          <Link href="/leave/file" className="underline underline-offset-2">
            See your own leave requests
          </Link>
          .
        </p>
      </div>
    );
  }

  const deciding = mode === "decide";
  const rows = state.leaveRequests
    .filter((row) =>
      deciding
        ? row.decision === null || row.decision === "refused"
        : row.personId === state.currentPersonId,
    )
    .sort((a, b) => {
      if (deciding && (a.decision === null) !== (b.decision === null)) return a.decision === null ? -1 : 1;
      return deciding ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate);
    });

  function decide(row: LeaveRequest, decision: LeaveDecision) {
    const result = decideLeaveRequest(row.id, decision);
    if (result.error) {
      setNotice("");
      setError(result.error);
      return;
    }
    setError("");
    const label = decision === "paid" ? "approved as paid" : decision === "unpaid" ? "approved as unpaid" : "declined";
    setNotice(`${personName(state, row.personId)}'s request was ${label}.`);
  }

  return (
    <div>
      <PageHeader
        title={deciding ? "Leave requests" : "Leave"}
        description={
          deciding
            ? "Leave requests waiting for a decision. Declined requests stay here so you can reconsider them."
            : "Your cuti, sick and remote requests. An Admin reviews each request."
        }
      />
      {notice ? (
        <Callout live="status" className="mb-4">
          {notice}
        </Callout>
      ) : null}
      {error && !open ? (
        <Callout tone="danger" className="mb-4">
          {error}
        </Callout>
      ) : null}
      <Card className="overflow-hidden p-0 sm:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="m-0 text-h2 font-medium">{deciding ? "To decide" : "My requests"}</h2>
          <Button type="button" onClick={() => { setError(""); setNotice(""); setOpen(true); }}>
            {deciding ? "Request leave for someone" : "Request leave"}
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="m-0 px-5 py-6 text-sm text-muted">
            {deciding
              ? "No leave requests to decide. New requests appear here as people send them."
              : "You have no leave requests yet. Choose Request leave to send one."}
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {rows.map((row) => {
              const leaveType = row.leaveTypeId
                ? state.leaveTypes.find((item) => item.id === row.leaveTypeId)
                : undefined;
              const cover = row.coverPersonId ? personName(state, row.coverPersonId) : null;
              const kind = leaveType ? `${KIND_LABELS[row.kind]} · ${leaveType.name}` : KIND_LABELS[row.kind];
              return (
                <li key={row.id} className="grid gap-3 border-t border-line px-5 py-4 first:border-t-0">
                  <div>
                    <p className="m-0 font-medium">
                      {deciding ? `${personName(state, row.personId)} · ${kind}` : kind}
                    </p>
                    <p className="m-0 mt-1 text-sm text-muted">
                      {whenLabel(row)}
                      {cover ? ` · Covered by ${cover}` : ""}
                      {row.doctorLetterPath ? (
                        <>
                          {" · "}
                          <a
                            href={storedFileHref(row.doctorLetterPath)}
                            className="text-ink hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Doctor&apos;s letter
                          </a>
                        </>
                      ) : null}
                    </p>
                    {row.note ? <p className="m-0 mt-1 text-sm">{row.note}</p> : null}
                    <p className={`m-0 mt-1 text-sm font-medium ${decisionTone(row)}`}>{decisionLabel(row)}</p>
                  </div>
                  {deciding ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => decide(row, "paid")}>
                        Approve as paid
                      </Button>
                      <Button type="button" variant="outline" onClick={() => decide(row, "unpaid")}>
                        Approve as unpaid
                      </Button>
                      {row.decision !== "refused" ? (
                        <ConfirmAction
                          trigger={
                            <Button type="button" variant="destructive-outline">
                              Decline
                            </Button>
                          }
                          title={`Decline ${personName(state, row.personId)}'s request?`}
                          description={`${kind}, ${whenLabel(row)}. The request stays on this list, so you can still approve it later.`}
                          confirmLabel="Decline request"
                          onConfirm={() => decide(row, "refused")}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {open ? (
        <FileLeaveSheet
          forOthers={deciding}
          onClose={() => setOpen(false)}
          onFile={(input) => {
            const result = fileLeaveRequest(input);
            if (result.error) {
              setError(result.error);
              return;
            }
            setError("");
            setNotice("Leave request sent. An Admin will review it.");
            setOpen(false);
          }}
          error={error}
        />
      ) : null}
    </div>
  );
}

function FileLeaveSheet({
  forOthers,
  onClose,
  onFile,
  error,
}: {
  forOthers: boolean;
  onClose: () => void;
  onFile: (input: Parameters<ReturnType<typeof useStore>["fileLeaveRequest"]>[0]) => void;
  error: string;
}) {
  const { state } = useStore();
  const admin = forOthers && hasAdminGrant(state);
  const [kind, setKind] = useState<LeaveKind>("cuti");
  const [spanMode, setSpanMode] = useState<LeaveSpanMode>("days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [note, setNote] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState(state.leaveTypes[0]?.id ?? "");
  const [coverPersonId, setCoverPersonId] = useState("");
  const [personId, setPersonId] = useState(state.currentPersonId);
  const [letterPath, setLetterPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const coverOptions = state.users
    .map((user) => state.people.find((row) => row.id === user.personId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  async function onLetterChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const result = await uploadWorkDeliveryFile(file, "doctor-letter");
    setUploading(false);
    if (result.error || !result.storagePath) {
      setUploadError(result.error || "The letter could not be uploaded. Try again.");
      return;
    }
    setLetterPath(result.storagePath);
  }

  return (
    <AppSheet title="Request leave" onClose={onClose}>
      <p className="m-0 mb-4 text-sm text-muted">An Admin will review your request.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (uploading) return;
          onFile({
            personId: admin && personId !== state.currentPersonId ? personId : undefined,
            kind,
            spanMode,
            startDate,
            endDate: spanMode === "days" ? endDate : startDate,
            startTime: spanMode === "hours" ? startTime : undefined,
            endTime: spanMode === "hours" ? endTime : undefined,
            note,
            leaveTypeId: kind === "cuti" ? leaveTypeId : undefined,
            coverPersonId: kind === "cuti" ? coverPersonId : undefined,
            doctorLetterPath: kind === "sick" ? letterPath : undefined,
          });
        }}
      >
        {admin ? (
          <Field label="Request for">
            <Select value={personId} onChange={(event) => setPersonId(event.target.value)}>
              {state.people.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.preferredName || row.legalName}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Type of leave">
          <Select value={kind} onChange={(event) => setKind(event.target.value as LeaveKind)}>
            <option value="cuti">Cuti (annual and other leave)</option>
            <option value="sick">Sick</option>
            <option value="remote">Remote</option>
          </Select>
        </Field>
        <Field label="Duration">
          <Select value={spanMode} onChange={(event) => setSpanMode(event.target.value as LeaveSpanMode)}>
            <option value="days">Full days</option>
            <option value="hours">Part of one day</option>
          </Select>
        </Field>
        <Field label={spanMode === "days" ? "First day" : "Date"}>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </Field>
        {spanMode === "days" ? (
          <Field label="Last day">
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </Field>
            <Field label="To">
              <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </Field>
          </div>
        )}
        {kind === "cuti" ? (
          <>
            <Field label="Cuti type">
              <Select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)}>
                {state.leaveTypes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Covered by">
              <Select value={coverPersonId} onChange={(event) => setCoverPersonId(event.target.value)}>
                <option value="">Choose who covers your work</option>
                {coverOptions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.preferredName || row.legalName}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : null}
        {kind === "sick" ? (
          <Field label="Doctor's letter">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={uploading}
              onChange={(event) => void onLetterChange(event.target.files?.[0] ?? null)}
            />
            {letterPath ? <p className="m-0 mt-2 text-xs text-muted">Letter uploaded.</p> : null}
          </Field>
        ) : null}
        <Field label="Note">
          <Textarea value={note} rows={3} onChange={(event) => setNote(event.target.value)} />
        </Field>
        {uploadError ? <Callout tone="danger">{uploadError}</Callout> : null}
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <Button type="submit" disabled={uploading}>
          Send request
        </Button>
      </form>
    </AppSheet>
  );
}
