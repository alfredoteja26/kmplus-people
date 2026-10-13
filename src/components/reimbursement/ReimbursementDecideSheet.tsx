"use client";

import { Input } from "@/components/coss/input";
import { Textarea } from "@/components/coss/textarea";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import type { DecideReimbursementInput } from "@/lib/commands";
import { personName } from "@/lib/project-view";
import { formatRupiah, parseRupiahInput, reimbursementTypeName } from "@/lib/reimbursement-view";
import type { AppState, ReimbursementRequest } from "@/lib/types";
import { useState } from "react";
import { plainReimbursementError } from "./plain-error";

/** Approve at a lower amount, or reject: both carry a note the Person reads. */
export function ReimbursementDecideSheet({
  state,
  row,
  mode,
  onClose,
  onDecide,
}: {
  state: AppState;
  row: ReimbursementRequest;
  mode: "lower" | "reject";
  onClose: () => void;
  onDecide: (input: DecideReimbursementInput) => string | null;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const person = personName(state.people.find((item) => item.id === row.personId));
  const parsed = parseRupiahInput(amount);
  const lowerValue = parsed ?? 0;
  const lowerOk = parsed !== null && parsed < row.amount;
  const ready = Boolean(note.trim()) && (mode === "reject" || lowerOk);

  return (
    <FormSheet
      title={mode === "lower" ? "Approve at a lower amount" : "Reject this reimbursement"}
      description={`${person} · ${reimbursementTypeName(state, row)} · asked ${formatRupiah(row.amount)}. ${person} reads your note.`}
      onClose={onClose}
      submitLabel={mode === "lower" ? "Approve lower amount" : "Reject"}
      submitDisabled={!ready}
      onSubmit={() => {
        const message = onDecide(
          mode === "lower"
            ? { decision: "approved", approvedAmount: lowerValue, note: note.trim() }
            : { decision: "rejected", note: note.trim() },
        );
        if (message) setError(plainReimbursementError(message));
        else onClose();
      }}
    >
      {mode === "lower" ? (
        <Field
          label="Approved amount (Rp)"
          hint={lowerOk ? formatRupiah(lowerValue) : `Whole rupiah, below ${formatRupiah(row.amount)}.`}
          error={amount && !lowerOk ? `Between Rp 1 and ${formatRupiah(row.amount - 1)}.` : null}
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
      ) : null}
      <Field label="Note" hint={mode === "lower" ? "Required. Why the amount is lower." : "Required. Why it is rejected. Rejection is final; they can file a new request."}>
        <Textarea value={note} rows={3} onChange={(event) => setNote(event.target.value)} />
      </Field>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
