"use client";

import { Fieldset, FieldsetLegend } from "@/components/coss/fieldset";
import { Input } from "@/components/coss/input";
import { Textarea } from "@/components/coss/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { Select } from "@/components/product/Select";
import { formatDay, plural } from "@/lib/labels";
import { KIND_LABEL, activeHolidays, alsoOut, isWeekendIso, leaveKindLabel, leaveWhen, ownOverlaps, spanSummary } from "@/lib/leave-view";
import { AlsoOut } from "./LeaveRow";
import { personName } from "@/lib/project-view";
import type { FileLeaveInput } from "@/lib/commands";
import type { AppState, LeaveKind, LeaveSpanMode } from "@/lib/types";
import { uploadWorkDeliveryFile } from "@/lib/upload-work-delivery";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

const PLAIN: Record<string, string> = {
  "Only Admin may file LeaveRequest for another Person": "Only an Admin can request leave for someone else.",
  "LeaveRequest note is required": "Add a note: what the leave is for.",
  "Leave end must fall on or after start": "The last day must be on or after the first day.",
  "Cuti requires a LeaveType": "Choose the cuti type.",
  "Cuti requires a covering Person": "Choose who covers your work.",
  "Covering Person must have a User": "The person covering must have a KMPlus People login.",
  "Covering Person must be someone else": "Choose someone else to cover; a person can't cover their own leave.",
  "Sick requires a doctor's letter path before filing": "Upload the doctor's letter first.",
  "Hours LeaveRequest must be on one date": "Part-day leave is on one date.",
  "Hours LeaveRequest requires start and end times": "Choose a start and an end time.",
  "Hours LeaveRequest end must be after its start": "The end time must be after the start time.",
  "A decided LeaveRequest cannot be withdrawn": "This request has a decision already, so it can't be withdrawn.",
  "Only the Person or Admin may withdraw a LeaveRequest": "Only the person who asked, or an Admin, can withdraw it.",
  "Admin grant required": "Only an Admin can decide leave.",
};

export function plainLeaveError(message: string | null | undefined): string {
  if (!message) return "";
  return PLAIN[message] ?? message.replace(/LeaveRequest/g, "leave request").replace(/LeaveType/g, "leave type");
}

const KIND_HINT: Record<LeaveKind, string> = {
  cuti: "Annual and other leave. Needs a cuti type and someone to cover.",
  sick: "Needs a doctor's letter, uploaded before you send.",
  remote: "You still log your hours on the timesheet while remote.",
};

export function LeaveRequestSheet({
  state,
  forOthers,
  presetDate,
  onClose,
  onFile,
}: {
  state: AppState;
  /** Admin filing from the decision page may choose the Person. */
  forOthers: boolean;
  presetDate: string;
  onClose: () => void;
  onFile: (input: FileLeaveInput) => string | null;
}) {
  const [personId, setPersonId] = useState(state.currentPersonId);
  const [kind, setKind] = useState<LeaveKind>("cuti");
  const [spanMode, setSpanMode] = useState<LeaveSpanMode>("days");
  const [startDate, setStartDate] = useState(presetDate);
  const [endDate, setEndDate] = useState(presetDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [note, setNote] = useState("");
  const types = [...state.leaveTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const [leaveTypeId, setLeaveTypeId] = useState(types[0]?.id ?? "");
  const [coverPersonId, setCoverPersonId] = useState("");
  const [letter, setLetter] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const lastDay = spanMode === "days" ? endDate : startDate;
  const summary = spanMode === "days" ? spanSummary(state, startDate, endDate) : null;
  const overlaps = ownOverlaps(state, personId, startDate, lastDay);
  const others = startDate && lastDay ? alsoOut(state, { id: "", personId, startDate, endDate: lastDay }) : [];
  const coverOptions = state.users
    .map((user) => state.people.find((row) => row.id === user.personId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row && row.id !== personId))
    .sort((a, b) => personName(a).localeCompare(personName(b)));
  const people = [...state.people].sort((a, b) => personName(a).localeCompare(personName(b)));
  const holidayOnDate = activeHolidays(state).find((row) => row.date === startDate);
  const partDayNote = holidayOnDate
    ? `${holidayOnDate.name} is a public holiday on this date.`
    : startDate && isWeekendIso(startDate)
      ? "This date is a weekend."
      : "";
  const forSomeoneElse = personId !== state.currentPersonId;

  const ready =
    Boolean(startDate && lastDay && note.trim()) &&
    (spanMode === "days" ? endDate >= startDate : endTime > startTime) &&
    (kind !== "cuti" || Boolean(leaveTypeId && coverPersonId)) &&
    (kind !== "sick" || Boolean(letter)) &&
    !uploading;

  async function uploadLetter(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    const result = await uploadWorkDeliveryFile(file, "doctor-letter");
    setUploading(false);
    if (result.error || !result.storagePath) {
      setError(result.error || "The letter could not be uploaded. Try again.");
      return;
    }
    setLetter({ path: result.storagePath, name: result.fileName });
  }

  return (
    <FormSheet
      title={forSomeoneElse ? `Request leave for ${personName(state.people.find((row) => row.id === personId))}` : "Request leave"}
      description="An Admin decides each request. It shows on the timesheet only once approved."
      onClose={onClose}
      submitLabel={uploading ? "Uploading…" : "Send request"}
      submitDisabled={!ready}
      onSubmit={() => {
        const message = onFile({
          personId: forSomeoneElse ? personId : undefined,
          kind,
          spanMode,
          startDate,
          endDate: lastDay,
          startTime: spanMode === "hours" ? startTime : undefined,
          endTime: spanMode === "hours" ? endTime : undefined,
          note: note.trim(),
          leaveTypeId: kind === "cuti" ? leaveTypeId : undefined,
          coverPersonId: kind === "cuti" ? coverPersonId : undefined,
          doctorLetterPath: kind === "sick" ? letter?.path : undefined,
        });
        if (message) setError(plainLeaveError(message));
        else onClose();
      }}
    >
      {forOthers ? (
        <Field label="Request for">
          <Select
            value={personId}
            onChange={(event) => {
              setPersonId(event.target.value);
              // A cover chosen for someone else could be the new person; never let anyone cover themselves.
              if (event.target.value === coverPersonId) setCoverPersonId("");
            }}
          >
            {people.map((row) => (
              <option key={row.id} value={row.id}>
                {personName(row)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Fieldset className="grid gap-2">
        <FieldsetLegend className="text-sm font-medium text-ink">Kind</FieldsetLegend>
        <ToggleGroup
          variant="outline"
          aria-label="Kind"
          value={[kind]}
          onValueChange={(value) => {
            const next = value[0] as LeaveKind | undefined;
            if (next) setKind(next);
          }}
          className="w-full *:flex-1"
        >
          {(["cuti", "sick", "remote"] as const).map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {KIND_LABEL[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="m-0 text-xs text-muted">{KIND_HINT[kind]}</p>
      </Fieldset>

      <Fieldset className="grid gap-2">
        <FieldsetLegend className="text-sm font-medium text-ink">How long</FieldsetLegend>
        <ToggleGroup
          variant="outline"
          aria-label="How long"
          value={[spanMode]}
          onValueChange={(value) => {
            const next = value[0] as LeaveSpanMode | undefined;
            if (next) setSpanMode(next);
          }}
          className="w-full *:flex-1"
        >
          <ToggleGroupItem value="days">Full days</ToggleGroupItem>
          <ToggleGroupItem value="hours">Part of a day</ToggleGroupItem>
        </ToggleGroup>
      </Fieldset>

      {spanMode === "days" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="First day">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                const next = event.target.value;
                setStartDate(next);
                if (!endDate || endDate < next) setEndDate(next);
              }}
            />
          </Field>
          <Field label="Last day">
            <Input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <Field label="Date">
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label="From">
            <Input type="time" step={900} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </Field>
          <Field label="To" error={endTime <= startTime ? "After the start." : null}>
            <Input type="time" step={900} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </Field>
        </div>
      )}

      {summary ? (
        <div className="-mt-1 grid gap-1 text-sm tabular-nums">
          <p className="m-0">
            <span className="font-medium">{plural(summary.working, "working day")}</span>
            <span className="text-muted"> of {plural(summary.days, "day")}</span>
          </p>
          {summary.holidays.length > 0 ? (
            <p className="m-0 text-warning-foreground">
              {plural(summary.holidays.length, "public holiday")} in this span: {summary.holidays.map((row) => row.name).join(", ")}
              {summary.holidays.length === 1 ? ". It is not counted as a working day." : ". They are not counted as working days."}
            </p>
          ) : null}
        </div>
      ) : spanMode === "hours" && startDate ? (
        <div className="-mt-1 grid gap-1 text-sm tabular-nums">
          <p className="m-0 text-muted">{formatDay(startDate)}</p>
          {partDayNote ? <p className="m-0 text-warning-foreground">{partDayNote}</p> : null}
        </div>
      ) : null}

      {overlaps.length > 0 ? (
        <Callout tone="warning">
          {forSomeoneElse ? "They already have" : "You already have"} {overlaps.map((row) => `${leaveKindLabel(state, row)} (${leaveWhen(row)})`).join("; ")}{" "}
          on some of these dates.
        </Callout>
      ) : null}
      {forOthers ? <AlsoOut state={state} others={others} /> : null}

      {kind === "cuti" ? (
        <>
          <Field label="Cuti type">
            <Select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)}>
              {types.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Covered by" hint="They keep your work moving; your staffing and work items stay yours.">
            <Select value={coverPersonId} onChange={(event) => setCoverPersonId(event.target.value)}>
              <option value="">Choose who covers</option>
              {coverOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {personName(row)}
                </option>
              ))}
            </Select>
          </Field>
        </>
      ) : null}

      {kind === "sick" ? (
        <Field
          label="Doctor's letter"
          hint={
            letter ? (
              <span className="inline-flex items-center gap-1 text-success-foreground">
                <CheckIcon aria-hidden="true" className="size-3.5" />
                {letter.name} uploaded
              </span>
            ) : (
              "PDF or photo. Only you and Admin can open it."
            )
          }
        >
          <Input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={uploading} onChange={(event) => void uploadLetter(event.target.files?.[0] ?? null)} />
        </Field>
      ) : null}

      <Field label="Note" hint="Required. A line on what the leave is for.">
        <Textarea value={note} rows={3} onChange={(event) => setNote(event.target.value)} />
      </Field>

      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
