"use client";

import { Badge } from "@/components/product/Badge";
import { storedFileHref } from "@/lib/file-access";
import { formatDate } from "@/lib/labels";
import { personName } from "@/lib/project-view";
import {
  REIMBURSEMENT_STATE_LABEL,
  evidenceFor,
  formatRupiah,
  reimbursementState,
  reimbursementStateTone,
  reimbursementTypeName,
} from "@/lib/reimbursement-view";
import type { AppState, ReimbursementRequest } from "@/lib/types";
import { FileTextIcon } from "lucide-react";

/** One request: type and amount, its state, when, what for, who filed it if not the Person, and its receipts. */
export function ReimbursementRow({ state, row }: { state: AppState; row: ReimbursementRequest }) {
  const status = reimbursementState(row);
  const filer = row.filedByPersonId !== row.personId ? state.people.find((item) => item.id === row.filedByPersonId) : undefined;
  const evidence = evidenceFor(state, row.id);
  return (
    <li className="flex flex-col gap-2 border-t border-line px-5 py-4 first:border-t-0">
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">{reimbursementTypeName(state, row)}</span>
        <span className="font-medium tabular-nums">{formatRupiah(row.amount)}</span>
        <Badge tone={reimbursementStateTone(status)}>{REIMBURSEMENT_STATE_LABEL[status]}</Badge>
      </p>
      <p className="m-0 text-sm text-muted tabular-nums">
        Spent {formatDate(row.expenseDate)} · Filed {formatDate(row.filedOn)}
        {filer ? ` by ${personName(filer)}` : ""}
      </p>
      <p className="m-0 text-sm whitespace-pre-line">{row.description}</p>
      {evidence.length > 0 ? (
        <ul aria-label="Receipts" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
          {evidence.map((file) => (
            <li key={file.id}>
              <a
                href={storedFileHref(file.storagePath)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent no-underline hover:underline"
              >
                <FileTextIcon aria-hidden="true" className="size-4" />
                {file.fileName}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
