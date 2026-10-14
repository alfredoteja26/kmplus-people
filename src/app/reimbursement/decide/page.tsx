import { redirect } from "next/navigation";

/** Reimbursement requests moved into the Admin area; old links and bookmarks land there. */
export default function MovedReimbursementDecidePage() {
  redirect("/project-admin/reimbursements");
}
