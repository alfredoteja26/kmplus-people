"use client";

import { Button } from "@/components/coss/button";
import { EmptyBlock } from "@/components/work-delivery/project/parts";
import { hasAdminGrant } from "@/lib/domain-query";
import { plural } from "@/lib/labels";
import {
  formatExpenseMonth,
  formatRupiah,
  groupByExpenseMonth,
  reimbursementState,
  reimbursementsFor,
} from "@/lib/reimbursement-view";
import { useStore } from "@/lib/store";
import { PlusIcon, ReceiptIcon } from "lucide-react";
import { useState } from "react";
import { ReimbursementRequestSheet } from "./ReimbursementRequestSheet";
import { ReimbursementRow } from "./ReimbursementRow";

export function MyReimbursementView() {
  const { state, fileReimbursementRequest } = useStore();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const mine = reimbursementsFor(state, state.currentPersonId);
  const waiting = mine.filter((row) => reimbursementState(row) === "pending");
  const months = groupByExpenseMonth(mine);

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
              <section key={group.month} aria-label={label} className="overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
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
                    <ReimbursementRow key={row.id} state={state} row={row} />
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
