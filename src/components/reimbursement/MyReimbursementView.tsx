"use client";

import { Button } from "@/components/coss/button";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { hasAdminGrant, lineManagerReportPersonIds } from "@/lib/domain-query";
import { plural } from "@/lib/labels";
import {
  formatExpenseMonth,
  formatRupiah,
  groupByExpenseMonth,
  reimbursementState,
  reimbursementsFor,
} from "@/lib/reimbursement-view";
import { useStore } from "@/lib/store";
import type { ReimbursementRequest } from "@/lib/types";
import { PlusIcon, ReceiptIcon } from "lucide-react";
import { useState } from "react";
import { PendingChangeActions } from "./PendingChangeActions";
import { ReimbursementRequestSheet, plainReimbursementError } from "./ReimbursementRequestSheet";
import { ReimbursementRow } from "./ReimbursementRow";

export function MyReimbursementView() {
  const { state, fileReimbursementRequest, editReimbursementRequest, withdrawReimbursementRequest } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReimbursementRequest | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function withdraw(row: ReimbursementRequest) {
    const message = withdrawReimbursementRequest(row.id).error;
    if (message) {
      setNotice("");
      setError(plainReimbursementError(message));
      return;
    }
    setError("");
    setNotice(`Withdrawn: ${formatRupiah(row.amount)}. It stays below as history.`);
  }

  const mine = reimbursementsFor(state, state.currentPersonId);
  const waiting = mine.filter((row) => reimbursementState(row) === "pending");
  const months = groupByExpenseMonth(mine);
  // Read-only: the requests of the People this viewer is Line Manager for, newest expense first (ADR-0013).
  const reports = new Set(lineManagerReportPersonIds(state, state.currentPersonId));
  const team = state.reimbursementRequests
    .filter((row) => reports.has(row.personId))
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.id.localeCompare(a.id));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium">Reimbursement</h1>
          <p className="mt-1 mb-0 text-muted">
            {waiting.length
              ? `${plural(waiting.length, "request")} waiting for a decision · ${formatRupiah(waiting.reduce((sum, row) => sum + row.amount, 0))}`
              : "Get paid back for money you spent on company work. An Admin decides each request."}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setNotice("");
            setError("");
            setOpen(true);
          }}
        >
          <PlusIcon aria-hidden="true" />
          File a reimbursement
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

      {mine.length === 0 ? (
        <div className="rounded-2xl bg-paper shadow-(--shadow)">
          <EmptyBlock
            icon={<ReceiptIcon aria-hidden="true" />}
            title="No reimbursements yet"
            description="File one expense at a time with its receipts. You'll see the decision and the Paid date here."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {months.map((group) => {
            const label = formatExpenseMonth(group.month);
            return (
              <section key={group.month} aria-label={label} className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
                <h2 className="m-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5 text-base font-medium">
                  <span className="flex items-baseline gap-2">
                    {label}
                    <span className="text-sm font-normal text-muted tabular-nums">{group.rows.length}</span>
                  </span>
                  <span className="text-sm tabular-nums">
                    <span className="font-normal text-muted">Total </span>
                    {formatRupiah(group.total)}
                  </span>
                </h2>
                <ul className="m-0 list-none p-0">
                  {group.rows.map((row) => (
                    <ReimbursementRow
                      key={row.id}
                      state={state}
                      row={row}
                      actions={
                        <PendingChangeActions
                          state={state}
                          row={row}
                          onEdit={() => {
                            setNotice("");
                            setError("");
                            setEditing(row);
                          }}
                          onWithdraw={() => withdraw(row)}
                        />
                      }
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="m-0 text-xs text-muted">
            Months follow the expense date. A month&apos;s total counts approved amounts once decided and leaves out withdrawn and rejected requests.
          </p>
        </div>
      )}

      {team.length > 0 ? (
        <section aria-label="Your team" className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
          <h2 className="m-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5 text-base font-medium">
            <span className="flex items-baseline gap-2">
              Your team
              <span className="text-sm font-normal text-muted tabular-nums">{team.length}</span>
            </span>
            <span className="text-sm font-normal text-muted">Read only. An Admin decides.</span>
          </h2>
          <ul className="m-0 list-none p-0">
            {team.map((row) => (
              <ReimbursementRow key={row.id} state={state} row={row} showPerson />
            ))}
          </ul>
        </section>
      ) : null}

      {editing ? (
        <ReimbursementRequestSheet
          state={state}
          forOthers={false}
          editing={editing}
          onClose={() => setEditing(null)}
          onFile={(input) => {
            const result = editReimbursementRequest(editing.id, input);
            if (!result.error) setNotice("Changes saved.");
            return result.error;
          }}
        />
      ) : null}

      {open ? (
        <ReimbursementRequestSheet
          state={state}
          forOthers={hasAdminGrant(state)}
          onClose={() => setOpen(false)}
          onFile={(input) => {
            const result = fileReimbursementRequest(input);
            if (!result.error) {
              setNotice(
                input.personId
                  ? "Reimbursement filed. An Admin other than that person decides it."
                  : "Request sent. An Admin will decide it; you'll see the answer here.",
              );
            }
            return result.error;
          }}
        />
      ) : null}
    </div>
  );
}
