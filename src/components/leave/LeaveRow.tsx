"use client";

import { Badge } from "@/components/product/Badge";
import { PersonAvatar } from "@/components/work-delivery/project/parts";
import { storedFileHref } from "@/lib/file-access";
import { plural } from "@/lib/labels";
import { LEAVE_STATE_LABEL, alsoOut, leaveKindLabel, leaveState, leaveStateTone, leaveWhen, spanSummary, KIND_LABEL } from "@/lib/leave-view";
import { personName } from "@/lib/project-view";
import type { AppState, LeaveRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileTextIcon, HouseIcon, PalmtreeIcon, ThermometerIcon, UsersIcon } from "lucide-react";
import type { ReactNode } from "react";

const KIND_TILE: Record<LeaveRequest["kind"], { icon: typeof PalmtreeIcon; tone: string }> = {
  cuti: { icon: PalmtreeIcon, tone: "bg-[color-mix(in_srgb,var(--accent)_12%,var(--paper))] text-accent-hover" },
  sick: { icon: ThermometerIcon, tone: "bg-[color-mix(in_srgb,var(--warning)_15%,var(--paper))] text-warning-foreground" },
  remote: { icon: HouseIcon, tone: "bg-wash text-muted" },
};

/**
 * One request as a row: who (when deciding), kind and type, when and how many working days, cover, letter, note,
 * its decision, and on the decision page who else is out on those dates.
 */
export function LeaveRow({
  state,
  row,
  showPerson,
  showAlsoOut,
  actions,
}: {
  state: AppState;
  row: LeaveRequest;
  showPerson?: boolean;
  showAlsoOut?: boolean;
  actions?: ReactNode;
}) {
  const person = state.people.find((item) => item.id === row.personId);
  const cover = row.coverPersonId ? state.people.find((item) => item.id === row.coverPersonId) : undefined;
  const summary = row.spanMode === "days" ? spanSummary(state, row.startDate, row.endDate || row.startDate) : null;
  const status = leaveState(row);
  const others = showAlsoOut ? alsoOut(state, row) : [];

  return (
    <li className="flex gap-4 border-t border-line px-5 py-4 first:border-t-0">
      {showPerson ? null : <KindTile kind={row.kind} />}
      <div className="flex min-w-0 flex-1 flex-col gap-3 @2xl:flex-row @2xl:items-start @2xl:justify-between">
        <div className="flex min-w-0 gap-3">
          {showPerson ? <PersonAvatar person={person} className="mt-0.5" /> : null}
          <div className="min-w-0">
            <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">{showPerson ? `${personName(person)} · ${leaveKindLabel(state, row)}` : leaveKindLabel(state, row)}</span>
              <Badge tone={leaveStateTone(status)}>{LEAVE_STATE_LABEL[status]}</Badge>
            </p>
            <p className="m-0 mt-1 text-sm text-muted tabular-nums">
              {leaveWhen(row)}
              {summary ? ` · ${plural(summary.working, "working day")}` : ""}
              {cover ? ` · Covered by ${personName(cover)}` : ""}
            </p>
            {row.note ? <p className="m-0 mt-1.5 text-sm whitespace-pre-line">{row.note}</p> : null}
            {row.doctorLetterPath ? (
              <a
                href={storedFileHref(row.doctorLetterPath)}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-accent no-underline hover:underline"
              >
                <FileTextIcon aria-hidden="true" className="size-4" />
                Doctor&apos;s letter
              </a>
            ) : null}
            <AlsoOut state={state} others={others} />
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2 @2xl:justify-end">{actions}</div> : null}
      </div>
    </li>
  );
}

function KindTile({ kind }: { kind: LeaveRequest["kind"] }) {
  const { icon: Icon, tone } = KIND_TILE[kind];
  return (
    <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", tone)}>
      <Icon className="size-4.5" />
    </span>
  );
}

/**
 * Who else is off on those dates, split the way the team grid counts: cuti and sick are away (amber),
 * remote people are still working (muted).
 */
export function AlsoOut({ state, others }: { state: AppState; others: LeaveRequest[] }) {
  const away = others.filter((other) => other.kind !== "remote");
  const remote = others.filter((other) => other.kind === "remote");
  const name = (other: LeaveRequest) => personName(state.people.find((item) => item.id === other.personId));
  if (others.length === 0) return null;
  return (
    <div className="mt-1.5 grid gap-1 text-sm">
      {away.length > 0 ? (
        <p className="m-0 inline-flex items-start gap-1.5 text-warning-foreground">
          <UsersIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Also away: {away.map((other) => `${name(other)} (${KIND_LABEL[other.kind]}${other.decision === null ? ", waiting" : ""})`).join(", ")}</span>
        </p>
      ) : null}
      {remote.length > 0 ? (
        <p className="m-0 inline-flex items-start gap-1.5 text-muted">
          <HouseIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Remote then: {remote.map((other) => `${name(other)}${other.decision === null ? " (waiting)" : ""}`).join(", ")}</span>
        </p>
      ) : null}
    </div>
  );
}
