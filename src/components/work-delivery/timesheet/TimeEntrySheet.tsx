"use client";

import { Button } from "@/components/coss/button";
import { Checkbox } from "@/components/coss/checkbox";
import { CheckboxGroup } from "@/components/coss/checkbox-group";
import { Fieldset, FieldsetLegend } from "@/components/coss/fieldset";
import { Input } from "@/components/coss/input";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/coss/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { Badge } from "@/components/product/Badge";
import { Callout } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { formatDay } from "@/lib/labels";
import { MIN_BLOCK_MINUTES, clockText, durationText, minutesOf } from "@/lib/timesheet-grid";
import type { AppState, TimeBlock } from "@/lib/types";
import { useId, useState } from "react";

export type TimeEntryDraft =
  | { mode: "new"; date: string; start: number; end: number }
  | { mode: "edit"; block: TimeBlock };

export type UpsertTimeBlockInput = {
  id?: string;
  typeId: string;
  startAt: string;
  endAt: string;
  projectId?: string | null;
  workItemId?: string | null;
  title?: string;
  inviteePersonIds?: string[];
};

/** Command refusals are written in domain terms; the sheet says what to do about them. */
const PLAIN_ERRORS: Record<string, string> = {
  "TimeBlock type is required": "Choose a type.",
  "TimeBlock must be at least one hour": "An entry needs at least 1 hour.",
  "A Project TimeBlock must name one WorkItem": "Choose a work item for this project.",
  "WorkItem must belong to the Project": "Choose a work item from this project.",
  "Staffing must cover the TimeBlock date": "You aren't staffed on this project on that date. Pick another project or date.",
  "Approved cuti or sick forbids an overlapping TimeBlock": "You have approved cuti or sick leave at this time. Pick another time.",
  "TimeBlocks for the same Person may not overlap": "This overlaps another entry. Change the time or shorten the other entry.",
  "Only the Meeting type may have Invites": "Only meetings can have invites.",
  "Invitee must be a Person with a User": "Everyone you invite needs a KMPlus People login.",
  "Project meeting invitee Staffing must cover that date": "Everyone you invite must be staffed on this project on that date.",
};

export function plainTimesheetError(message: string | null): string {
  if (!message) return "";
  return PLAIN_ERRORS[message] ?? message.replace(/TimeBlock/g, "time entry").replace(/WorkItem/g, "work item");
}

export function TimeEntrySheet({
  state,
  personId,
  draft,
  onClose,
  onUpsert,
  onDelete,
  onRespondInvite,
}: {
  state: AppState;
  personId: string;
  draft: TimeEntryDraft;
  onClose: () => void;
  onUpsert: (input: UpsertTimeBlockInput) => string | null;
  onDelete: (id: string) => string | null;
  onRespondInvite: (inviteId: string, status: "accepted" | "declined") => string | null;
}) {
  const block = draft.mode === "edit" ? draft.block : null;
  const owned = !block || block.personId === personId;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetPopup className="sm:max-w-[440px]">
        {owned ? (
          <EntryForm
            state={state}
            personId={personId}
            draft={draft}
            onClose={onClose}
            onUpsert={onUpsert}
            onDelete={onDelete}
          />
        ) : (
          <InvitedEntry state={state} personId={personId} block={block!} onClose={onClose} onRespondInvite={onRespondInvite} />
        )}
      </SheetPopup>
    </Sheet>
  );
}

function EntryForm({
  state,
  personId,
  draft,
  onClose,
  onUpsert,
  onDelete,
}: {
  state: AppState;
  personId: string;
  draft: TimeEntryDraft;
  onClose: () => void;
  onUpsert: (input: UpsertTimeBlockInput) => string | null;
  onDelete: (id: string) => string | null;
}) {
  const formId = useId();
  const block = draft.mode === "edit" ? draft.block : null;
  const types = [...state.timeBlockTypes].sort((a, b) => a.sortOrder - b.sortOrder);

  const [typeId, setTypeId] = useState(block?.typeId ?? types.find((row) => !row.allowsInvites)?.id ?? types[0]?.id ?? "");
  const [date, setDate] = useState(block ? block.startAt.slice(0, 10) : draft.mode === "new" ? draft.date : "");
  const [startTime, setStartTime] = useState(clockText(block ? minutesOf(block.startAt) : draft.mode === "new" ? draft.start : 540));
  const [endTime, setEndTime] = useState(clockText(block ? minutesOf(block.endAt) : draft.mode === "new" ? draft.end : 600));
  const [title, setTitle] = useState(block?.title ?? "");
  const [projectId, setProjectId] = useState(block?.projectId ?? "");
  const [workItemId, setWorkItemId] = useState(block?.workItemId ?? "");
  const [inviteeIds, setInviteeIds] = useState<string[]>(
    block ? state.invites.filter((row) => row.timeBlockId === block.id).map((row) => row.personId) : [],
  );
  const [error, setError] = useState("");

  const selectedType = state.timeBlockTypes.find((row) => row.id === typeId);
  const minutes = minutesOf(`${date}T${endTime}`) - minutesOf(`${date}T${startTime}`);
  const tooShort = minutes < MIN_BLOCK_MINUTES;

  const staffedProjects = state.projects.filter((project) =>
    state.staffings.some(
      (row) => row.personId === personId && row.projectId === project.id && row.startDate <= date && (!row.endDate || row.endDate >= date),
    ),
  );
  const workItems = projectId ? state.workItems.filter((row) => row.projectId === projectId) : [];
  const inviteCandidates = state.users
    .map((user) => state.people.find((row) => row.id === user.personId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row && row.id !== personId));
  const inviteStatus = (inviteePersonId: string) =>
    block ? state.invites.find((row) => row.timeBlockId === block.id && row.personId === inviteePersonId)?.status : undefined;

  function submit() {
    const message = onUpsert({
      id: block?.id,
      typeId,
      startAt: `${date}T${startTime}`,
      endAt: `${date}T${endTime}`,
      title: title.trim(),
      projectId: projectId || null,
      workItemId: workItemId || null,
      inviteePersonIds: selectedType?.allowsInvites ? inviteeIds : undefined,
    });
    if (message) setError(plainTimesheetError(message));
    else onClose();
  }

  const heading = block ? "Edit time entry" : "Log time";
  const label = block?.title || selectedType?.name || "Time entry";

  return (
    <>
      <SheetHeader>
        <SheetTitle>{heading}</SheetTitle>
        <SheetDescription className="tabular-nums">
          {date ? formatDay(date) : "Pick a date"}
          {!tooShort ? ` · ${startTime}–${endTime} · ${durationText(minutes)}` : ""}
        </SheetDescription>
      </SheetHeader>
      <SheetPanel>
        <form
          id={formId}
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {types.length <= 4 ? (
            <Fieldset className="grid gap-2">
              <FieldsetLegend className="text-sm font-medium text-ink">Type</FieldsetLegend>
              <ToggleGroup
                variant="outline"
                aria-label="Type"
                value={[typeId]}
                onValueChange={(value) => {
                  const next = value[0];
                  if (next) setTypeId(next);
                }}
                className="w-full *:flex-1"
              >
                {types.map((row) => (
                  <ToggleGroupItem key={row.id} value={row.id}>
                    {row.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Fieldset>
          ) : (
            <Field label="Type">
              <Select value={typeId} onChange={(event) => setTypeId(event.target.value)}>
                {types.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="What did you work on?" hint="Optional. Shown on the block.">
            <Input value={title} placeholder={selectedType?.name ?? "Title"} onChange={(event) => setTitle(event.target.value)} />
          </Field>

          <Field label="Date">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <Input type="time" step={900} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </Field>
            <Field label="End" error={date && startTime && endTime && tooShort ? "At least 1 hour after the start." : null}>
              <Input type="time" step={900} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </Field>
          </div>

          <Field
            label="Project"
            hint={staffedProjects.length === 0 ? "You aren't staffed on a project on this date." : "Only projects you're staffed on that day."}
          >
            <Select
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setWorkItemId("");
              }}
            >
              <option value="">No project</option>
              {staffedProjects.map((row) => (
                <option key={row.id} value={row.id}>
                  {`${row.code} · ${row.name}`}
                </option>
              ))}
            </Select>
          </Field>
          {projectId ? (
            <Field label="Work item" hint={workItems.length === 0 ? "This project has no work items yet. Ask the project's Admin to add one." : undefined}>
              <Select value={workItemId} onChange={(event) => setWorkItemId(event.target.value)}>
                <option value="">Choose a work item</option>
                {workItems.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {selectedType?.allowsInvites ? (
            <Fieldset className="grid gap-2">
              <FieldsetLegend className="text-sm font-medium text-ink">Invite people</FieldsetLegend>
              {inviteCandidates.length === 0 ? (
                <p className="m-0 text-sm text-muted">No one else has a login yet.</p>
              ) : (
                <CheckboxGroup
                  aria-label="Invite people"
                  value={inviteeIds}
                  onValueChange={(value) => setInviteeIds(value as string[])}
                  className="grid gap-1 sm:grid-cols-2"
                >
                  {inviteCandidates.map((row) => {
                    const status = inviteStatus(row.id);
                    return (
                      <label key={row.id} className="flex min-h-9 items-center gap-2 text-sm pointer-coarse:min-h-11">
                        <Checkbox value={row.id} />
                        <span className="min-w-0 truncate">{row.preferredName || row.legalName}</span>
                        {status && status !== "pending" ? (
                          <span className="text-xs text-muted">{status === "accepted" ? "accepted" : "declined"}</span>
                        ) : null}
                      </label>
                    );
                  })}
                </CheckboxGroup>
              )}
            </Fieldset>
          ) : null}

          {error ? <Callout tone="danger">{error}</Callout> : null}
          <p className="m-0 text-xs text-muted">Jakarta time. Entries are at least 1 hour and can&apos;t overlap each other or approved cuti or sick leave.</p>
        </form>
      </SheetPanel>
      <SheetFooter className="sm:justify-between">
        {block ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="ghost" className="text-destructive-foreground">
                Delete
              </Button>
            }
            title={`Delete “${label}”?`}
            description={`${formatDay(block.startAt.slice(0, 10))}, ${clockText(minutesOf(block.startAt))}–${clockText(minutesOf(block.endAt))}. The hours come off this week's total.`}
            confirmLabel="Delete time entry"
            onConfirm={() => {
              const message = onDelete(block.id);
              if (message) setError(plainTimesheetError(message));
              else onClose();
            }}
          />
        ) : (
          <span className="max-sm:hidden" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!date || tooShort}>
            {block ? "Save changes" : "Save"}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

function InvitedEntry({
  state,
  personId,
  block,
  onClose,
  onRespondInvite,
}: {
  state: AppState;
  personId: string;
  block: TimeBlock;
  onClose: () => void;
  onRespondInvite: (inviteId: string, status: "accepted" | "declined") => string | null;
}) {
  const [error, setError] = useState("");
  const invite = state.invites.find((row) => row.timeBlockId === block.id && row.personId === personId);
  const creator = state.people.find((row) => row.id === block.personId);
  const project = block.projectId ? state.projects.find((row) => row.id === block.projectId) : undefined;
  const workItem = block.workItemId ? state.workItems.find((row) => row.id === block.workItemId) : undefined;
  const type = state.timeBlockTypes.find((row) => row.id === block.typeId);
  const start = minutesOf(block.startAt);
  const end = minutesOf(block.endAt);

  function respond(status: "accepted" | "declined") {
    if (!invite) return;
    const message = onRespondInvite(invite.id, status);
    if (message) setError(plainTimesheetError(message));
    else onClose();
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{block.title || type?.name || "Meeting"}</SheetTitle>
        <SheetDescription className="tabular-nums">
          {formatDay(block.startAt.slice(0, 10))} · {clockText(start)}–{clockText(end)} · {durationText(end - start)}
        </SheetDescription>
      </SheetHeader>
      <SheetPanel>
        <dl className="m-0 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted">Invited by</dt>
          <dd className="m-0">{creator?.preferredName || creator?.legalName || "Someone"}</dd>
          <dt className="text-muted">Project</dt>
          <dd className="m-0">{project ? `${project.code} · ${project.name}` : "No project"}</dd>
          {workItem ? (
            <>
              <dt className="text-muted">Work item</dt>
              <dd className="m-0">{workItem.name}</dd>
            </>
          ) : null}
          <dt className="text-muted">Your answer</dt>
          <dd className="m-0">
            {invite?.status === "accepted" ? (
              <Badge tone="success">Accepted</Badge>
            ) : (
              <Badge tone="accent">Not answered</Badge>
            )}
          </dd>
        </dl>
        <p className="mt-4 mb-0 text-sm text-muted">
          {invite?.status === "accepted"
            ? "These hours count toward your week. Only the person who set up the meeting can change it."
            : "The hours count toward your week once you accept. Declining takes it off your calendar."}
        </p>
        {error ? <Callout tone="danger" className="mt-4">{error}</Callout> : null}
      </SheetPanel>
      <SheetFooter>
        <Button type="button" variant="outline" onClick={() => respond("declined")} disabled={!invite}>
          Decline
        </Button>
        {invite?.status !== "accepted" ? (
          <Button type="button" onClick={() => respond("accepted")} disabled={!invite}>
            Accept
          </Button>
        ) : null}
      </SheetFooter>
    </>
  );
}
