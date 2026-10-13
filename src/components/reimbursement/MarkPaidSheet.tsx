"use client";

import { Input } from "@/components/coss/input";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { personName } from "@/lib/project-view";
import { formatRupiah, reimbursementTypeName } from "@/lib/reimbursement-view";
import type { AppState, ReimbursementRequest } from "@/lib/types";
import { jakartaTodayIso } from "@/lib/work-delivery-query";
import { useState } from "react";
import { plainReimbursementError } from "./ReimbursementRequestSheet";

/** The day the money went out. Opening it on a paid request corrects the date. */
export function MarkPaidSheet({
  state,
  row,
  onClose,
  onMark,
}: {
  state: AppState;
  row: ReimbursementRequest;
  onClose: () => void;
  onMark: (paidOn: string) => string | null;
}) {
  const today = jakartaTodayIso();
  const [paidOn, setPaidOn] = useState(row.paidOn ?? today);
  const [error, setError] = useState("");
  const person = personName(state.people.find((item) => item.id === row.personId));

  return (
    <FormSheet
      title={row.paidOn ? "Change the Paid date" : "Mark as paid"}
      description={`${person} · ${reimbursementTypeName(state, row)} · ${formatRupiah(row.approvedAmount ?? row.amount)}. Payment itself happens outside the app.`}
      onClose={onClose}
      submitLabel={row.paidOn ? "Save Paid date" : "Mark as paid"}
      submitDisabled={!paidOn}
      onSubmit={() => {
        const message = onMark(paidOn);
        if (message) setError(plainReimbursementError(message));
        else onClose();
      }}
    >
      <Field label="Paid on" hint="The day the transfer went out. Not after today.">
        <Input type="date" value={paidOn} max={today} onChange={(event) => setPaidOn(event.target.value)} />
      </Field>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
