import { REIMBURSEMENT_WINDOW_DAYS } from "@/lib/reimbursement-commands";

/** Reimbursement command refusals in plain words, shared by every reimbursement sheet and list. */
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
  "Project not found": "That Project no longer exists. Choose another or leave it blank.",
  "The Person is not staffed on that Project on the expense date": "You're not staffed on that Project on the expense date. Choose another or leave it blank.",
  "An Admin cannot mark their own reimbursement Paid": "This is your own reimbursement. Another Admin marks it paid.",
  "Only an Admin can decide a reimbursement": "Only an Admin can decide reimbursements.",
  "Only an Admin can mark a reimbursement Paid": "Only an Admin can mark reimbursements paid.",
  "Only an Admin can change reimbursement types": "Only an Admin can change reimbursement types.",
  "Only an approved reimbursement can be Paid": "Only an approved reimbursement can be marked paid.",
  "Paid date is required": "Choose the day the money went out.",
  "Paid date cannot be in the future": "The Paid date can't be after today.",
  "Only the Person or the Admin who filed it may change a reimbursement": "Only the person it is for, or the Admin who filed it, can change it.",
  "This reimbursement is withdrawn": "This reimbursement was withdrawn, so it can't change.",
  "An Admin cannot decide their own reimbursement": "This is your own reimbursement. Another Admin decides it.",
  "This reimbursement is already decided": "This reimbursement already has a decision, so it can't change.",
  "A lower amount needs a note": "Add a note: why the amount is lower.",
  "A rejection needs a note": "Add a note: why it is rejected.",
};

/** A command refusal in plain words; messages without an entry already read as a sentence. */
export function plainReimbursementError(message: string | null | undefined): string {
  if (!message) return "";
  return PLAIN[message] ?? `${message}.`;
}
