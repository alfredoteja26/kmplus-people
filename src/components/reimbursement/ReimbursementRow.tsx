"use client";

import { Badge } from "@/components/product/Badge";
import { PersonAvatar } from "@/components/work-delivery/project/parts";
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
import type { ReactNode } from "react";

/**
 * One request: who (when deciding), type and amount, its state, when, what for, who filed it if not the Person,
 * its receipts, and once decided the approved amount, the note, and who decided.
 */
export function ReimbursementRow({
  state,
  row,
  showPerson,
  actions,
}: {
  state: AppState;
  row: ReimbursementRequest;
  showPerson?: boolean;
  actions?: ReactNode;
}) {
  const status = reimbursementState(row);
  const person = state.people.find((item) => item.id === row.personId);
  const filer = row.filedByPersonId !== row.personId ? state.people.find((item) => item.id === row.filedByPersonId) : undefined;
  const decider = row.decidedByPersonId ? state.people.find((item) => item.id === row.decidedByPersonId) : undefined;
  const lowered = row.decision === "approved" && row.approvedAmount !== null && row.approvedAmount < row.amount;
  const evidence = evidenceFor(state, row.id);

  return (
    <li className="flex gap-3 border-t border-line px-5 py-4 first:border-t-0">
      {showPerson ? <PersonAvatar person={person} className="mt-0.5" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-3 @2xl:flex-row @2xl:items-start @2xl:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
            {showPerson ? <span className="font-medium">{personName(person)} ·</span> : null}
            <span className="font-medium">{reimbursementTypeName(state, row)}</span>
            <span className="font-medium tabular-nums">
              {lowered ? (
                <>
                  {formatRupiah(row.approvedAmount ?? 0)} <span className="font-normal text-muted">of {formatRupiah(row.amount)}</span>
                </>
              ) : (
                formatRupiah(row.amount)
              )}
            </span>
            <Badge tone={reimbursementStateTone(status)}>
              {lowered && status === "approved" ? "Approved at a lower amount" : REIMBURSEMENT_STATE_LABEL[status]}
            </Badge>
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
          {row.decision ? (
            <p className="m-0 text-sm text-muted">
              {row.decision === "rejected" ? "Rejected" : "Approved"}
              {decider ? ` by ${personName(decider)}` : ""}
              {row.decidedOn ? ` on ${formatDate(row.decidedOn)}` : ""}
              {row.decisionNote ? (
                <>
                  : <span className="text-ink">{row.decisionNote}</span>
                </>
              ) : (
                "."
              )}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2 @2xl:justify-end">{actions}</div> : null}
      </div>
    </li>
  );
}
