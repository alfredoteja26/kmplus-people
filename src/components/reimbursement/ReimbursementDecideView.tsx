"use client";

import { Button } from "@/components/coss/button";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import type { DecideReimbursementInput } from "@/lib/commands";
import { hasAdminGrant } from "@/lib/domain-query";
import { plural } from "@/lib/labels";
import { personName } from "@/lib/project-view";
import { formatRupiah, reimbursementState, reimbursementTypeName } from "@/lib/reimbursement-view";
import { useStore } from "@/lib/store";
import type { ReimbursementRequest } from "@/lib/types";
import { InboxIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PendingChangeActions } from "./PendingChangeActions";
import { MarkPaidSheet } from "./MarkPaidSheet";
import { ReimbursementDecideSheet } from "./ReimbursementDecideSheet";
import { ReimbursementRequestSheet, plainReimbursementError } from "./ReimbursementRequestSheet";
import { ReimbursementRow } from "./ReimbursementRow";

export function ReimbursementDecideView() {
  const {
    state,
    fileReimbursementRequest,
    editReimbursementRequest,
    withdrawReimbursementRequest,
    decideReimbursementRequest,
    markReimbursementPaid,
    clearReimbursementPaid,
  } = useStore();
  const [paying, setPaying] = useState<ReimbursementRequest | null>(null);
  const [deciding, setDeciding] = useState<{ row: ReimbursementRequest; mode: "lower" | "reject" } | null>(null);
  const [editing, setEditing] = useState<ReimbursementRequest | null>(null);
  const [filing, setFiling] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (!hasAdminGrant(state)) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <h1 className="m-0 font-heading text-h1 font-medium">Reimbursement requests</h1>
        <p className="m-0 text-sm">
          Only an Admin can decide reimbursements.{" "}
          <Link href="/reimbursement" className="font-medium text-accent underline-offset-2 hover:underline">
            See your own reimbursements
          </Link>
          .
        </p>
      </div>
    );
  }

  // Oldest filing first, so nobody waits longest.
  const waiting = state.reimbursementRequests
    .filter((row) => reimbursementState(row) === "pending")
    .sort((a, b) => a.filedOn.localeCompare(b.filedOn) || a.expenseDate.localeCompare(b.expenseDate) || a.id.localeCompare(b.id));
  const mineCount = waiting.filter((row) => row.personId === state.currentPersonId).length;
  // Approved and not yet paid, longest-approved first; then the most recent payments, newest first.
  const toPay = state.reimbursementRequests
    .filter((row) => reimbursementState(row) === "approved")
    .sort((a, b) => (a.decidedOn ?? "").localeCompare(b.decidedOn ?? "") || a.id.localeCompare(b.id));
  const recentlyPaid = state.reimbursementRequests
    .filter((row) => reimbursementState(row) === "paid")
    .sort((a, b) => (b.paidOn ?? "").localeCompare(a.paidOn ?? "") || b.id.localeCompare(a.id))
    .slice(0, 20);
  const decidable = waiting.length - mineCount;

  const label = (row: ReimbursementRequest) =>
    `${personName(state.people.find((item) => item.id === row.personId))}, ${reimbursementTypeName(state, row)} ${formatRupiah(row.approvedAmount ?? row.amount)}`;

  function decide(row: ReimbursementRequest, input: DecideReimbursementInput): string | null {
    const message = decideReimbursementRequest(row.id, input).error;
    if (message) {
      setNotice("");
      setError(plainReimbursementError(message));
      return message;
    }
    setError("");
    const outcome =
      input.decision === "rejected"
        ? "Rejected"
        : input.approvedAmount !== undefined && input.approvedAmount < row.amount
          ? `Approved at ${formatRupiah(input.approvedAmount)}`
          : "Approved";
    setNotice(`${outcome}: ${label(row)}.`);
    return null;
  }

  function report(message: string | null, success: string): string | null {
    if (message) {
      setNotice("");
      setError(plainReimbursementError(message));
      return message;
    }
    setError("");
    setNotice(success);
    return null;
  }

  const paidActions = (row: ReimbursementRequest) =>
    row.personId === state.currentPersonId ? (
      <p className="m-0 max-w-56 text-sm text-muted">Your own request. Another Admin marks it paid.</p>
    ) : row.paidOn ? (
      <>
        <Button type="button" variant="outline" size="sm" onClick={() => setPaying(row)}>
          Change date
        </Button>
        <ConfirmAction
          tone="default"
          trigger={
            <Button type="button" variant="ghost" size="sm">
              Clear Paid
            </Button>
          }
          title="Clear the Paid date?"
          description={`${label(row)}. It goes back to approved and waits to be paid.`}
          confirmLabel="Clear Paid date"
          onConfirm={() => report(clearReimbursementPaid(row.id).error, `Paid date cleared: ${label(row)}.`)}
        />
      </>
    ) : (
      <Button type="button" size="sm" onClick={() => setPaying(row)}>
        Mark as paid
      </Button>
    );

  function withdraw(row: ReimbursementRequest) {
    const message = withdrawReimbursementRequest(row.id).error;
    if (message) {
      setNotice("");
      setError(plainReimbursementError(message));
      return;
    }
    setError("");
    setNotice(`Withdrawn: ${label(row)}.`);
  }

  const changeActions = (row: ReimbursementRequest) => (
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
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-heading text-h1 font-medium">Reimbursement requests</h1>
          <p className="mt-1 mb-0 text-muted">
            {decidable ? `${plural(decidable, "request")} to decide.` : "Nothing to decide right now."}
            {mineCount ? ` ${plural(mineCount, "request")} of yours ${mineCount === 1 ? "waits" : "wait"} for another Admin.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/reimbursement/report" />}>
            Monthly report
          </Button>
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
            File for someone
          </Button>
        </div>
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
            description="New reimbursements appear here, oldest first, with their receipts."
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {waiting.map((row) => (
              <ReimbursementRow
                key={row.id}
                state={state}
                row={row}
                showPerson
                actions={
                  row.personId === state.currentPersonId ? (
                    <>
                      <p className="m-0 max-w-56 text-sm text-muted">Your own request. Another Admin decides it.</p>
                      {changeActions(row)}
                    </>
                  ) : (
                    <>
                      <Button type="button" size="sm" onClick={() => decide(row, { decision: "approved" })}>
                        Approve {formatRupiah(row.amount)}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setDeciding({ row, mode: "lower" })}>
                        Lower amount
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive-foreground"
                        onClick={() => setDeciding({ row, mode: "reject" })}
                      >
                        Reject
                      </Button>
                      {changeActions(row)}
                    </>
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="To pay" className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
        <h2 className="m-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5 text-base font-medium">
          <span className="flex items-baseline gap-2">
            To pay
            <span className="text-sm font-normal text-muted tabular-nums">{toPay.length}</span>
          </span>
          {toPay.length ? (
            <span className="text-sm tabular-nums">
              <span className="font-normal text-muted">Total </span>
              {formatRupiah(toPay.reduce((sum, row) => sum + (row.approvedAmount ?? row.amount), 0))}
            </span>
          ) : null}
        </h2>
        {toPay.length === 0 ? (
          <p className="m-0 px-5 py-4 text-sm text-muted">Nothing approved is waiting to be paid.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {toPay.map((row) => (
              <ReimbursementRow key={row.id} state={state} row={row} showPerson actions={paidActions(row)} />
            ))}
          </ul>
        )}
      </section>

      {recentlyPaid.length > 0 ? (
        <section aria-label="Recently paid" className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
          <h2 className="m-0 flex items-baseline gap-2 border-b border-line px-5 py-3.5 text-base font-medium">
            Recently paid
            <span className="text-sm font-normal text-muted tabular-nums">{recentlyPaid.length}</span>
          </h2>
          <ul className="m-0 list-none p-0">
            {recentlyPaid.map((row) => (
              <ReimbursementRow key={row.id} state={state} row={row} showPerson actions={paidActions(row)} />
            ))}
          </ul>
        </section>
      ) : null}

      {paying ? (
        <MarkPaidSheet
          state={state}
          row={paying}
          onClose={() => setPaying(null)}
          onMark={(paidOn) => report(markReimbursementPaid(paying.id, paidOn).error, `Marked paid: ${label(paying)}.`)}
        />
      ) : null}

      {deciding ? (
        <ReimbursementDecideSheet
          state={state}
          row={deciding.row}
          mode={deciding.mode}
          onClose={() => setDeciding(null)}
          onDecide={(input) => decide(deciding.row, input)}
        />
      ) : null}

      {editing ? (
        <ReimbursementRequestSheet
          state={state}
          forOthers={false}
          editing={editing}
          onClose={() => setEditing(null)}
          onFile={(input) => {
            const result = editReimbursementRequest(editing.id, input);
            if (!result.error) setNotice(`Changes saved: ${label({ ...editing, ...input })}.`);
            return result.error;
          }}
        />
      ) : null}

      {filing ? (
        <ReimbursementRequestSheet
          state={state}
          forOthers
          onClose={() => setFiling(false)}
          onFile={(input) => {
            const result = fileReimbursementRequest(input);
            if (!result.error) setNotice("Reimbursement filed. It is in the list below.");
            return result.error;
          }}
        />
      ) : null}
    </div>
  );
}
