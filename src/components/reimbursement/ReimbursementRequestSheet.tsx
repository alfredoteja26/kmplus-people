"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Textarea } from "@/components/coss/textarea";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { Select } from "@/components/product/Select";
import type { FileReimbursementInput, ReimbursementEvidenceInput } from "@/lib/commands";
import { personName } from "@/lib/project-view";
import { REIMBURSEMENT_WINDOW_DAYS } from "@/lib/reimbursement-commands";
import { formatRupiah } from "@/lib/reimbursement-view";
import type { AppState } from "@/lib/types";
import { uploadWorkDeliveryFile } from "@/lib/upload-work-delivery";
import {
  MAX_REIMBURSEMENT_FILES,
  MAX_UPLOAD_BYTES,
  REIMBURSEMENT_EVIDENCE_ACCEPT,
  reimbursementEvidenceAllowed,
} from "@/lib/upload-rules";
import { addDaysIso, jakartaTodayIso } from "@/lib/work-delivery-query";
import { FileTextIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";

const PLAIN: Record<string, string> = {
  "Only Admin may file a reimbursement for another Person": "Only an Admin can file a reimbursement for someone else.",
  "Expense date is required": "Choose the date you spent the money.",
  "Expense date cannot be in the future": "The expense date can't be after today.",
  [`Expense date must be within ${REIMBURSEMENT_WINDOW_DAYS} days of filing`]: `This expense is more than ${REIMBURSEMENT_WINDOW_DAYS} days old, so it can't be filed.`,
  "Amount must be more than zero": "Enter the amount you paid, more than Rp 0.",
  "Amount must be whole rupiah": "Enter the amount in whole rupiah, without cents.",
  "Amount is too large": "That amount is too large for one request. Check it, or split it across requests.",
  "A description is required": "Add a description: what the expense was for.",
  "Every receipt must be uploaded first": "Wait for every receipt to finish uploading.",
  "A receipt is already on another request": "One of these receipts is already on another request. Upload it again here.",
  "Admin grant required": "Only an Admin can decide reimbursements.",
  "An Admin cannot decide their own reimbursement": "This is your own reimbursement. Another Admin decides it.",
  "This reimbursement is already decided": "This reimbursement already has a decision.",
  "A lower amount needs a note": "Add a note: why the amount is lower.",
  "A rejection needs a note": "Add a note: why it is rejected.",
};

/** A command refusal in plain words; messages without an entry already read as a sentence. */
export function plainReimbursementError(message: string | null | undefined): string {
  if (!message) return "";
  return PLAIN[message] ?? `${message}.`;
}

type Receipt = ReimbursementEvidenceInput & { key: string; uploading: boolean };

export function ReimbursementRequestSheet({
  state,
  forOthers,
  onClose,
  onFile,
}: {
  state: AppState;
  /** An Admin may choose whose expense it is. */
  forOthers: boolean;
  onClose: () => void;
  onFile: (input: FileReimbursementInput) => string | null;
}) {
  const today = jakartaTodayIso();
  const types = [...state.reimbursementTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const people = [...state.people].sort((a, b) => personName(a).localeCompare(personName(b)));
  const [personId, setPersonId] = useState(state.currentPersonId);
  const [expenseDate, setExpenseDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [reimbursementTypeId, setReimbursementTypeId] = useState(types[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState("");

  const forSomeoneElse = personId !== state.currentPersonId;
  const amountValue = Number(amount);
  const amountOk = /^\d+$/.test(amount) && amountValue > 0;
  const uploading = receipts.some((row) => row.uploading);
  const ready =
    Boolean(expenseDate && reimbursementTypeId && description.trim()) &&
    amountOk &&
    receipts.length > 0 &&
    !uploading;

  async function addFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setError("");
    const room = MAX_REIMBURSEMENT_FILES - receipts.length;
    if (files.length > room) {
      setError(`Attach no more than ten receipts. You can add ${room} more.`);
      return;
    }
    for (const file of files) {
      if (!reimbursementEvidenceAllowed(file.type, file.name)) {
        setError(`${file.name} isn't a JPG, PNG, HEIC, or PDF.`);
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`${file.name} is larger than 20 MB.`);
        return;
      }
    }
    const pending = files.map((file, index) => ({
      key: `${Date.now()}-${index}-${file.name}`,
      storagePath: "",
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      uploading: true,
    }));
    setReceipts((rows) => [...rows, ...pending]);
    await Promise.all(
      files.map(async (file, index) => {
        const key = pending[index].key;
        const result = await uploadWorkDeliveryFile(file, "reimbursement-evidence");
        if (result.error || !result.storagePath) {
          setReceipts((rows) => rows.filter((row) => row.key !== key));
          setError(`${file.name} could not be uploaded. ${result.error ?? "Try again."}`);
          return;
        }
        setReceipts((rows) =>
          rows.map((row) =>
            row.key === key ? { ...row, storagePath: result.storagePath, fileName: result.fileName, uploading: false } : row,
          ),
        );
      }),
    );
  }

  return (
    <FormSheet
      title={forSomeoneElse ? `File a reimbursement for ${personName(state.people.find((row) => row.id === personId))}` : "File a reimbursement"}
      description="One expense per request. An Admin decides it; payment happens outside the app."
      onClose={onClose}
      submitLabel={uploading ? "Uploading…" : "Send request"}
      submitDisabled={!ready}
      onSubmit={() => {
        const message = onFile({
          personId: forSomeoneElse ? personId : undefined,
          expenseDate,
          amount: amountValue,
          reimbursementTypeId,
          description: description.trim(),
          evidence: receipts.map(({ storagePath, fileName, contentType, size }) => ({ storagePath, fileName, contentType, size })),
        });
        if (message) setError(plainReimbursementError(message));
        else onClose();
      }}
    >
      {forOthers ? (
        <Field label="Expense for">
          <Select value={personId} onChange={(event) => setPersonId(event.target.value)}>
            {people.map((row) => (
              <option key={row.id} value={row.id}>
                {personName(row)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Expense date" hint={`Within the last ${REIMBURSEMENT_WINDOW_DAYS} days.`}>
          <Input
            type="date"
            value={expenseDate}
            min={addDaysIso(today, -REIMBURSEMENT_WINDOW_DAYS)}
            max={today}
            onChange={(event) => setExpenseDate(event.target.value)}
          />
        </Field>
        <Field
          label="Amount (Rp)"
          hint={amountOk ? formatRupiah(amountValue) : "Whole rupiah, as on the receipt."}
          error={amount && !amountOk ? "Whole rupiah, more than 0." : null}
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            placeholder="85000"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[.\s]/g, ""))}
          />
        </Field>
      </div>

      <Field label="Type">
        <Select value={reimbursementTypeId} onChange={(event) => setReimbursementTypeId(event.target.value)}>
          {types.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Description" hint="Required. What the expense was for.">
        <Textarea value={description} rows={3} onChange={(event) => setDescription(event.target.value)} />
      </Field>

      <Field
        label="Receipts"
        hint="1 to 10 files: JPG, PNG, HEIC, or PDF, up to 20 MB each. A foreign-currency receipt is fine; enter the rupiah you paid."
      >
        <Input
          type="file"
          multiple
          accept={REIMBURSEMENT_EVIDENCE_ACCEPT}
          disabled={receipts.length >= MAX_REIMBURSEMENT_FILES}
          onChange={(event) => {
            void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </Field>
      {receipts.length > 0 ? (
        <ul aria-label="Attached receipts" className="m-0 -mt-2 grid list-none gap-1.5 p-0">
          {receipts.map((row) => (
            <li key={row.key} className="flex items-center gap-2 rounded-lg bg-wash px-3 py-2 text-sm">
              {row.uploading ? (
                <LoaderCircleIcon aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted" />
              ) : (
                <FileTextIcon aria-hidden="true" className="size-4 shrink-0 text-muted" />
              )}
              <span className="min-w-0 flex-1 truncate">{row.fileName}</span>
              <span className="shrink-0 text-xs text-muted">{row.uploading ? "Uploading…" : "Uploaded"}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${row.fileName}`}
                disabled={row.uploading}
                onClick={() => setReceipts((rows) => rows.filter((item) => item.key !== row.key))}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
