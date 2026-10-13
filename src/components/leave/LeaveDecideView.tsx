"use client";

import { Button } from "@/components/coss/button";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { hasAdminGrant } from "@/lib/domain-query";
import { plural } from "@/lib/labels";
import { leaveKindLabel, leaveWhen, monthDates } from "@/lib/leave-view";
import { personName } from "@/lib/project-view";
import { useStore } from "@/lib/store";
import type { LeaveDecision, LeaveRequest } from "@/lib/types";
import { addDaysIso, jakartaTodayIso, mondayOfWeek } from "@/lib/work-delivery-query";
import { InboxIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LeaveLegend, MonthPager } from "./LeaveMonth";
import { LeaveRequestSheet, plainLeaveError } from "./LeaveRequestSheet";
import { LeaveRow } from "./LeaveRow";
import { TeamLeaveGrid } from "./TeamLeaveGrid";

const DECIDED: Record<LeaveDecision, string> = { paid: "Approved as paid", unpaid: "Approved as unpaid", refused: "Declined" };

export function LeaveDecideView() {
  const { state, fileLeaveRequest, decideLeaveRequest, withdrawLeaveRequest } = useStore();
  const admin = hasAdminGrant(state);
  const today = jakartaTodayIso();
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const [filing, setFiling] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (!admin) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <h1 className="m-0 font-heading text-h1 font-medium">Leave requests</h1>
        <p className="m-0 text-sm">
          Only an Admin can decide leave requests.{" "}
          <Link href="/leave/file" className="font-medium text-accent underline-offset-2 hover:underline">
            See your own leave
          </Link>
          .
        </p>
      </div>
    );
  }

  const waiting = state.leaveRequests.filter((row) => row.decision === null).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const declined = state.leaveRequests.filter((row) => row.decision === "refused").sort((a, b) => b.startDate.localeCompare(a.startDate));
  const currentMonth = cursor.year === Number(today.slice(0, 4)) && cursor.month === Number(today.slice(5, 7)) - 1;

  function decide(row: LeaveRequest, decision: LeaveDecision) {
    const message = decideLeaveRequest(row.id, decision).error;
    if (message) {
      setNotice("");
      setError(plainLeaveError(message));
      return;
    }
    setError("");
    setNotice(`${DECIDED[decision]}: ${personName(state.people.find((item) => item.id === row.personId))}, ${leaveKindLabel(state, row)}, ${leaveWhen(row)}.`);
  }

  function withdraw(row: LeaveRequest) {
    const message = withdrawLeaveRequest(row.id).error;
    if (message) {
      setNotice("");
      setError(plainLeaveError(message));
      return;
    }
    setError("");
    setNotice(`Withdrawn: ${personName(state.people.find((item) => item.id === row.personId))}, ${leaveKindLabel(state, row)}, ${leaveWhen(row)}.`);
  }

  // Waiting requests read by when they start, the way the timeline block groups by time.
  const thisSunday = addDaysIso(mondayOfWeek(today), 6);
  const nextSunday = addDaysIso(thisSunday, 7);
  const timeGroups = [
    { title: "Starts this week or earlier", rows: waiting.filter((row) => row.startDate <= thisSunday) },
    { title: "Starts next week", rows: waiting.filter((row) => row.startDate > thisSunday && row.startDate <= nextSunday) },
    { title: "Starts later", rows: waiting.filter((row) => row.startDate > nextSunday) },
  ].filter((group) => group.rows.length > 0);

  function move(delta: number) {
    setCursor(({ year, month }) => {
      const next = month + delta;
      return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
    });
  }

  const approveButtons = (row: LeaveRequest) => (
    <>
      <Button type="button" size="sm" onClick={() => decide(row, "paid")}>
        Approve as paid
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => decide(row, "unpaid")}>
        Approve as unpaid
      </Button>
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium">Leave requests</h1>
          <p className="mt-1 mb-0 text-muted">
            {waiting.length ? `${plural(waiting.length, "request")} to decide.` : "Nothing to decide right now."} Approved leave shows on that person&apos;s timesheet.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setNotice("");
            setError("");
            setFiling(true);
          }}
        >
          <PlusIcon aria-hidden="true" />
          Request for someone
        </Button>
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

      <section aria-label="To decide" className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
        <h2 className="m-0 flex items-baseline gap-2 border-b border-line px-5 py-3.5 text-base font-medium">
          To decide
          <span className="text-sm font-normal text-muted tabular-nums">{waiting.length}</span>
        </h2>
        {waiting.length === 0 ? (
          <EmptyBlock
            className="py-8"
            icon={<InboxIcon aria-hidden="true" />}
            title="All caught up"
            description="New requests appear here as people send them. Each one shows who else is out on those dates."
          />
        ) : (
          timeGroups.map((group) => (
          <div key={group.title}>
          <h3 className="m-0 border-t border-line bg-[color-mix(in_srgb,var(--wash)_50%,var(--paper))] px-5 py-2 text-xs font-medium tracking-[0.06em] text-muted uppercase first:border-t-0">
            {group.title} <span className="tabular-nums">{group.rows.length}</span>
          </h3>
          <ul className="m-0 list-none p-0">
            {group.rows.map((row) => (
              <LeaveRow
                key={row.id}
                state={state}
                row={row}
                showPerson
                showAlsoOut
                actions={
                  <>
                    {approveButtons(row)}
                    <ConfirmAction
                      trigger={
                        <Button type="button" variant="ghost" size="sm" className="text-destructive-foreground">
                          Decline
                        </Button>
                      }
                      title={`Decline ${personName(state.people.find((item) => item.id === row.personId))}'s request?`}
                      description={`${leaveKindLabel(state, row)}, ${leaveWhen(row)}. It stays under Declined, so you can still approve it later.`}
                      confirmLabel="Decline request"
                      onConfirm={() => decide(row, "refused")}
                    />
                    <ConfirmAction
                      tone="default"
                      trigger={
                        <Button type="button" variant="ghost" size="sm">
                          Withdraw
                        </Button>
                      }
                      title="Withdraw this request?"
                      description={`${leaveKindLabel(state, row)}, ${leaveWhen(row)}. It is removed with no decision, for example when it was filed by mistake.`}
                      confirmLabel="Withdraw request"
                      onConfirm={() => withdraw(row)}
                    />
                  </>
                }
              />
            ))}
          </ul>
          </div>
          ))
        )}
        {declined.length > 0 ? (
          <details className="border-t border-line">
            <summary className="cursor-pointer list-none px-5 py-3 text-sm text-muted hover:text-ink">
              Declined, can be reconsidered <span className="tabular-nums">{declined.length}</span>
            </summary>
            <ul className="m-0 list-none p-0">
              {declined.map((row) => (
                <LeaveRow key={row.id} state={state} row={row} showPerson showAlsoOut actions={approveButtons(row)} />
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section aria-label="Who is out" className="overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
        <MonthPager
          year={cursor.year}
          monthIndex={cursor.month}
          onMove={move}
          onToday={() => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 })}
          isCurrent={currentMonth}
        />
        <LeaveLegend awayMark />
        <TeamLeaveGrid state={state} dates={monthDates(cursor.year, cursor.month)} today={today} />
      </section>

      {filing ? (
        <LeaveRequestSheet
          state={state}
          forOthers
          presetDate={today}
          onClose={() => setFiling(false)}
          onFile={(input) => {
            const result = fileLeaveRequest(input);
            if (!result.error) setNotice("Request filed. It is waiting under To decide.");
            return result.error;
          }}
        />
      ) : null}
    </div>
  );
}
