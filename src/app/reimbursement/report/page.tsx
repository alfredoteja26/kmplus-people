import { redirect } from "next/navigation";

/** The reimbursement report moved into the Admin area; old links and bookmarks land there. */
export default function MovedReimbursementReportPage() {
  redirect("/project-admin/reimbursements/report");
}
