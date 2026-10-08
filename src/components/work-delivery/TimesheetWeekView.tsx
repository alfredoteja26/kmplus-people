"use client";

import { Button } from "@/components/coss/button";
import { Checkbox } from "@/components/coss/checkbox";
import { CheckboxGroup } from "@/components/coss/checkbox-group";
import { Fieldset, FieldsetLegend } from "@/components/coss/fieldset";
import { Input } from "@/components/coss/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { Callout, Card } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { formatDateRange, formatDay } from "@/lib/labels";
import { Select } from "@/components/product/Select";
import {
  addDaysIso,
  jakartaTodayIso,
  mondayOfWeek,
  personWeekHours,
  timeBlocksForPerson,
  weekTargetHours,
} from "@/lib/work-delivery-query";
import type { AppState, TimeBlock, WeekGridMode } from "@/lib/types";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";

function formatTime(value: string): string {
  return value.slice(11, 16);
}

export function TimesheetWeekView({
  state,
  personId,
  onSetWeekGrid,
  onUpsert,
  onDelete,
}: {
  state: AppState;
  personId: string;
  onSetWeekGrid: (mode: WeekGridMode) => string | null;
  onUpsert: (input: {
    id?: string;
    typeId: string;
    startAt: string;
    endAt: string;
    projectId?: string | null;
    workItemId?: string | null;
    title?: string;
    inviteePersonIds?: string[];
  }) => string | null;
  onDelete: (id: string) => string | null;
}) {
  const person = state.people.find((row) => row.id === personId);
  const weekGrid = person?.weekGrid ?? "weekdays";
  const today = jakartaTodayIso();
  const [anchorMonday, setAnchorMonday] = useState(mondayOfWeek(today));
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);

  const dayCount = weekGrid === "full" ? 7 : 5;
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, index) => addDaysIso(anchorMonday, index)),
    [anchorMonday, dayCount],
  );

  const blocks = timeBlocksForPerson(state, personId);
  const holidays = state.publicHolidays.filter((row) => !row.suppressed);

  const [typeId, setTypeId] = useState(state.timeBlockTypes[0]?.id ?? "");
  const [blockDate, setBlockDate] = useState(today);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [workItemId, setWorkItemId] = useState("");
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);

  const selectedType = state.timeBlockTypes.find((row) => row.id === typeId);
  const staffedProjects = state.projects.filter((project) =>
    state.staffings.some(
      (row) => row.personId === personId && row.projectId === project.id && row.startDate <= blockDate && (!row.endDate || row.endDate >= blockDate),
    ),
  );
  const workItems = projectId
    ? state.workItems.filter((row) => row.projectId === projectId)
    : [];
  const inviteCandidates = state.users
    .map((user) => state.people.find((row) => row.id === user.personId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row && row.id !== personId));

  function blocksOnDay(day: string): TimeBlock[] {
    return blocks.filter((row) => row.startAt.slice(0, 10) === day);
  }

  function focusEditor() {
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    editorRef.current?.querySelector<HTMLElement>("form button, form input")?.focus({ preventScroll: true });
  }

  function startOnDay(day: string) {
    resetForm();
    setBlockDate(day);
    focusEditor();
  }

  function loadEdit(block: TimeBlock) {
    setEditingId(block.id);
    setTypeId(block.typeId);
    setBlockDate(block.startAt.slice(0, 10));
    setStartTime(formatTime(block.startAt));
    setEndTime(formatTime(block.endAt));
    setTitle(block.title);
    setProjectId(block.projectId ?? "");
    setWorkItemId(block.workItemId ?? "");
    const invites = state.invites
      .filter((row) => row.timeBlockId === block.id)
      .map((row) => row.personId);
    setInviteeIds(invites);
    focusEditor();
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setProjectId("");
    setWorkItemId("");
    setInviteeIds([]);
    setError("");
  }

  function submitBlock() {
    const startAt = `${blockDate}T${startTime}`;
    const endAt = `${blockDate}T${endTime}`;
    const err = onUpsert({
      id: editingId ?? undefined,
      typeId,
      startAt,
      endAt,
      title,
      projectId: projectId || null,
      workItemId: workItemId || null,
      inviteePersonIds: selectedType?.allowsInvites ? inviteeIds : undefined,
    });
    if (!err) resetForm();
    else setError(err);
  }

  const weekHours = Math.round(personWeekHours(state, personId, anchorMonday) * 10) / 10;
  const thisWeek = anchorMonday === mondayOfWeek(today);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Previous week"
            onClick={() => setAnchorMonday(addDaysIso(anchorMonday, -7))}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Next week"
            onClick={() => setAnchorMonday(addDaysIso(anchorMonday, 7))}
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="lg" disabled={thisWeek} onClick={() => setAnchorMonday(mondayOfWeek(today))}>
            This week
          </Button>
          <p className="m-0 ml-1 text-sm font-medium tabular-nums" aria-live="polite">
            {formatDateRange(anchorMonday, addDaysIso(anchorMonday, 6))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ToggleGroup
            variant="outline"
            aria-label="Days shown"
            value={[weekGrid]}
            onValueChange={(value) => {
              const next = value[0] as WeekGridMode | undefined;
              if (next && next !== weekGrid) setError(onSetWeekGrid(next) ?? "");
            }}
          >
            <ToggleGroupItem value="weekdays">Mon–Fri</ToggleGroupItem>
            <ToggleGroupItem value="full">Full week</ToggleGroupItem>
          </ToggleGroup>
          <p className="m-0 text-sm text-muted tabular-nums">
            {weekHours}h of {weekTargetHours()}h this week (includes weekend)
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {days.map((day) => {
          const holiday = holidays.find((row) => row.date === day);
          const dayBlocks = blocksOnDay(day);
          return (
            <Card key={day} className="p-4 sm:p-4">
              <section aria-label={formatDay(day)}>
                <h2 className="mt-0 mb-2 text-sm font-medium">
                  {formatDay(day)}
                  {holiday && !holiday.suppressed ? (
                    <span className="block text-xs font-normal text-muted">
                      {holiday.name} · {holiday.origin === "libur" ? "Libur Nasional" : holiday.origin === "bersama" ? "Cuti Bersama" : "Cuti Bersama (Internal)"}
                    </span>
                  ) : null}
                </h2>
                {dayBlocks.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="m-0 text-xs text-muted">No time logged.</p>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Log time on ${formatDay(day)}`} onClick={() => startOnDay(day)}>
                      Log time
                    </Button>
                  </div>
                ) : (
                  <ul className="m-0 list-none space-y-2 p-0">
                    {dayBlocks.map((block) => {
                      const type = state.timeBlockTypes.find((row) => row.id === block.typeId);
                      const project = block.projectId
                        ? state.projects.find((row) => row.id === block.projectId)
                        : undefined;
                      const owned = block.personId === personId;
                      const label = block.title || type?.name || "Time entry";
                      const when = `${formatTime(block.startAt)}–${formatTime(block.endAt)}`;
                      return (
                        <li key={block.id} className="rounded-lg bg-tint px-3 py-2 text-sm">
                          <p className="m-0 font-medium">{label}</p>
                          <p className="m-0 text-xs text-muted tabular-nums">
                            {when}
                            {project ? ` · ${project.code}` : ""}
                          </p>
                          {owned ? (
                            <div className="mt-1 -ml-2 flex gap-1">
                              <Button type="button" variant="ghost" size="sm" aria-label={`Edit ${label}, ${when}`} onClick={() => loadEdit(block)}>
                                Edit
                              </Button>
                              <ConfirmAction
                                trigger={
                                  <Button type="button" variant="ghost" size="sm" aria-label={`Delete ${label}, ${when}`}>
                                    Delete
                                  </Button>
                                }
                                title={`Delete “${label}”?`}
                                description={`${formatDay(day)}, ${when}. The hours come off this week's total.`}
                                confirmLabel="Delete time entry"
                                onConfirm={() => {
                                  if (editingId === block.id) resetForm();
                                  setError(onDelete(block.id) ?? "");
                                }}
                              />
                            </div>
                          ) : (
                            <p className="m-0 mt-1 text-xs text-muted">Meeting you were invited to</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </Card>
          );
        })}
      </div>

      <Card>
        <section ref={editorRef} aria-labelledby="time-entry-heading" className="scroll-mt-6">
          <h2 id="time-entry-heading" className="mt-0 mb-4 text-h2 font-medium">
            {editingId ? "Edit time entry" : "Log time"}
          </h2>
          <form
            className="grid max-w-2xl gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitBlock();
            }}
          >
            <Field label="Type">
              <Select value={typeId} onChange={(event) => setTypeId(event.target.value)}>
                {state.timeBlockTypes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={blockDate} onChange={(event) => setBlockDate(event.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </Field>
              <Field label="End">
                <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </Field>
            </div>
            <Field label="Title">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Project (optional)">
              <Select value={projectId} onChange={(event) => { setProjectId(event.target.value); setWorkItemId(""); }}>
                <option value="">No project</option>
                {staffedProjects.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code}
                  </option>
                ))}
              </Select>
            </Field>
            {projectId ? (
              <Field label="Work item">
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
                  <p className="m-0 text-sm text-muted">No one else has an account yet.</p>
                ) : (
                  <CheckboxGroup
                    aria-label="Invite people"
                    value={inviteeIds}
                    onValueChange={(value) => setInviteeIds(value as string[])}
                    className="flex-row flex-wrap gap-x-4 gap-y-2"
                  >
                    {inviteCandidates.map((row) => (
                      <label key={row.id} className="flex min-h-8 items-center gap-2 text-sm pointer-coarse:min-h-11">
                        <Checkbox value={row.id} />
                        {row.preferredName || row.legalName}
                      </label>
                    ))}
                  </CheckboxGroup>
                )}
              </Fieldset>
            ) : null}
            {error ? <Callout tone="danger">{error}</Callout> : null}
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Save changes" : "Save"}</Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
            <p className="m-0 text-xs text-muted">
              {"Times are in Jakarta time. Entries are at least 1 hour and can't overlap each other or your approved cuti or sick leave."}
            </p>
          </form>
        </section>
      </Card>
    </div>
  );
}
