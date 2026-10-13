"use client";

import { Button } from "@/components/coss/button";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { canChangeReimbursement } from "@/lib/reimbursement-commands";
import { formatRupiah, reimbursementTypeName } from "@/lib/reimbursement-view";
import type { AppState, ReimbursementRequest } from "@/lib/types";

export function PendingChangeActions({
  state,
  row,
  onEdit,
  onWithdraw,
}: {
  state: AppState;
  row: ReimbursementRequest;
  onEdit: () => void;
  onWithdraw: () => void;
}) {
  if (!canChangeReimbursement(state, row)) return null;
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        Edit
      </Button>
      <ConfirmAction
        trigger={
          <Button type="button" variant="ghost" size="sm">
            Withdraw
          </Button>
        }
        title="Withdraw this reimbursement?"
        description={`${reimbursementTypeName(state, row)}, ${formatRupiah(row.amount)}. It comes off the Admin's list and stays in the history as withdrawn. You can file a new one later.`}
        confirmLabel="Withdraw reimbursement"
        onConfirm={onWithdraw}
      />
    </>
  );
}
