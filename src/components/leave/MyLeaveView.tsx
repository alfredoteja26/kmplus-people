"use client";

import { Button } from "@/components/coss/button";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { plural } from "@/lib/labels";
import { KIND_LABEL, activeHolidays, groupMine, leaveDates, leaveKindLabel, leaveWhen, monthWeeks } from "@/lib/leave-view";
import { useStore } from "@/lib/store";
import type { LeaveRequest } from "@/lib/types";
import { jakartaTodayIso } from "@/lib/work-delivery-query";
import { CalendarDaysIcon, PlusIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { LeaveLegend, LeaveMonth, MonthPager, type MonthChip } from "./LeaveMonth";
import { LeaveRequestSheet, plainLeaveError } from "./LeaveRequestSheet";
import { LeaveRow } from "./LeaveRow";

const HOLIDAY_ORIGIN = { libur: "Libur Nasional", bersama: "Cuti Bersama", internal: "Cuti Bersama (Internal)" } as const;

export function MyLeaveView() {
  const { state, fileLeaveRequest, withdrawLeaveRequest } = useStore();
  const today = jakartaTodayIso();
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const mine = state.leaveRequests.filter((row) => row.personId === state.currentPersonId);
  const groups = groupMine(mine, today);
  const holidays = activeHolidays(state);

  // Day → chips: public holidays first, then the Person's approved and waiting leave. Declined leave is never drawn.
  const chipsByDay = useMemo(() => {
    const map = new Map<string, MonthChip[]>();
    const push = (day: string, chip: MonthChip) => map.set(day, [...(map.get(day) ?? []), chip]);
    for (const holiday of holidays) push(holiday.date, { key: holiday.id, label: holiday.name, tone: "holiday", title: `${holiday.name} · ${HOLIDAY_ORIGIN[holiday.origin]}` });
    for (const row of mine) {
      if (row.decision === "refused") continue;
      for (const day of leaveDates(row)) {
        push(day, {
          key: `${row.id}-${day}`,
          label: row.spanMode === "hours" && row.startTime ? `${KIND_LABEL[row.kind]} ${row.startTime}` : KIND_LABEL[row.kind],
          tone: row.kind,
          pending: row.decision === null,
          title: `${leaveKindLabel(state, row)} · ${leaveWhen(row)}${row.decision === null ? " · waiting for a decision" : ""}`,
        });
      }
    }
    return map;
  }, [holidays, mine, state]);

  const currentMonth = cursor.year === Number(today.slice(0, 4)) && cursor.month === Number(today.slice(5, 7)) - 1;

  function move(delta: number) {
    setCursor(({ year, month }) => {
      const next = month + delta;
      return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
    });
  }

  function withdraw(row: LeaveRequest) {
    const message = withdrawLeaveRequest(row.id).error;
    if (message) {
      setNotice("");
      setError(plainLeaveError(message));
      return;
    }
    setError("");
    setNotice(`${leaveKindLabel(state, row)} for ${leaveWhen(row)} withdrawn.`);
  }

  const counts = [
    groups.waiting.length ? `${plural(groups.waiting.length, "request")} waiting for a decision` : "",
    groups.upcoming.length ? `${groups.upcoming.length} approved coming up` : "",
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium">Leave</h1>
          <p className="mt-1 mb-0 text-muted">
            {counts.length ? counts.join(" · ") : "Cuti, sick, and remote. An Admin decides each request."}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setNotice("");
            setError("");
            setSheetDate(today);
          }}
        >
          <PlusIcon aria-hidden="true" />
          Request leave
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

      <section aria-label="Calendar" className="overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
        <MonthPager
          year={cursor.year}
          monthIndex={cursor.month}
          onMove={move}
          onToday={() => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 })}
          isCurrent={currentMonth}
        />
        <LeaveLegend />
        <LeaveMonth
          weeks={monthWeeks(cursor.year, cursor.month)}
          today={today}
          chipsFor={(day) => chipsByDay.get(day) ?? []}
          onPickDay={(day) => {
            setNotice("");
            setError("");
            setSheetDate(day);
          }}
        />
        <p className="m-0 border-t border-line px-5 py-2.5 text-xs text-muted">Choose a day to request leave starting then.</p>
      </section>

      {mine.length === 0 ? (
        <div className="rounded-2xl bg-paper shadow-(--shadow)">
          <EmptyBlock
            icon={<CalendarDaysIcon aria-hidden="true" />}
            title="No leave requests yet"
            description="Request cuti, sick, or remote leave. It shows on your timesheet once an Admin approves it."
          />
        </div>
      ) : (
        <div className="@container flex flex-col gap-5">
          <Group title="Waiting for a decision" rows={groups.waiting} empty="Nothing waiting.">
            {(row) => (
              <LeaveRow
                key={row.id}
                state={state}
                row={row}
                actions={
                  <ConfirmAction
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        Withdraw
                      </Button>
                    }
                    title="Withdraw this request?"
                    description={`${leaveKindLabel(state, row)}, ${leaveWhen(row)}. It comes off the Admin's list. You can send a new one later.`}
                    confirmLabel="Withdraw request"
                    onConfirm={() => withdraw(row)}
                  />
                }
              />
            )}
          </Group>
          {groups.upcoming.length > 0 ? (
            <Group title="Coming up" rows={groups.upcoming}>
              {(row) => <LeaveRow key={row.id} state={state} row={row} />}
            </Group>
          ) : null}
          {groups.past.length > 0 ? (
            <Group title="Past" rows={groups.past}>
              {(row) => <LeaveRow key={row.id} state={state} row={row} />}
            </Group>
          ) : null}
        </div>
      )}

      {sheetDate ? (
        <LeaveRequestSheet
          state={state}
          forOthers={false}
          presetDate={sheetDate}
          onClose={() => setSheetDate(null)}
          onFile={(input) => {
            const result = fileLeaveRequest(input);
            if (!result.error) setNotice("Request sent. An Admin will decide it; you'll see the answer here.");
            return result.error;
          }}
        />
      ) : null}
    </div>
  );
}

function Group({
  title,
  rows,
  empty,
  children,
}: {
  title: string;
  rows: LeaveRequest[];
  empty?: string;
  children: (row: LeaveRequest) => ReactNode;
}) {
  return (
    <section aria-label={title} className="overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
      <h2 className="m-0 flex items-baseline gap-2 border-b border-line px-5 py-3.5 text-base font-medium">
        {title}
        <span className="text-sm font-normal text-muted tabular-nums">{rows.length}</span>
      </h2>
      {rows.length === 0 ? <p className="m-0 px-5 py-4 text-sm text-muted">{empty}</p> : <ul className="m-0 list-none p-0">{rows.map(children)}</ul>}
    </section>
  );
}
