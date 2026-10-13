"use client";

import { Button } from "@/components/coss/button";
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
import { ReimbursementDecideSheet } from "./ReimbursementDecideSheet";
import { ReimbursementRequestSheet, plainReimbursementError } from "./ReimbursementRequestSheet";
import { ReimbursementRow } from "./ReimbursementRow";

export function ReimbursementDecideView() {
  const { state, fileReimbursementRequest, editReimbursementRequest, withdrawReimbursementRequest, decideReimbursementRequest } =
    useStore();
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
  const decidable = waiting.length - mineCount;

  const label = (row: ReimbursementRequest) =>
    `${personName(state.people.find((item) => item.id === row.personId))}, ${reimbursementTypeName(state, row)} ${formatRupiah(row.amount)}`;

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
