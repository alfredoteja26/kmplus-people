import { TENANT_ID } from "./types";

/** Upload limits shared by the upload route, the commands that record a stored file, and the browser forms. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const MAX_REIMBURSEMENT_FILES = 10;

/** What a file is for decides the folder it lands in inside the `tenant-files` bucket (ADR-0012). */
export const UPLOAD_FOLDERS = {
  deliverable: "deliverables",
  "doctor-letter": "leave-letters",
  "reimbursement-evidence": "reimbursement-evidence",
} as const;

export type UploadPurpose = keyof typeof UPLOAD_FOLDERS;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[UploadPurpose];

export function uploadFolderFor(purpose: unknown): UploadFolder | null {
  return typeof purpose === "string" && Object.hasOwn(UPLOAD_FOLDERS, purpose)
    ? UPLOAD_FOLDERS[purpose as UploadPurpose]
    : null;
}

/** Every stored path starts with its Tenant and folder, so a recorded path shows what it was uploaded for. */
export function storagePathPrefix(folder: UploadFolder): string {
  return `tenants/${TENANT_ID}/${folder}/`;
}

const EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "application/pdf"];
const EVIDENCE_EXTENSIONS = ["jpg", "jpeg", "png", "heic", "heif", "pdf"];

export const EVIDENCE_TYPE_REFUSAL = "Receipts must be JPG, PNG, HEIC, or PDF";

/** The `accept` attribute for an evidence file picker. */
export const REIMBURSEMENT_EVIDENCE_ACCEPT = [...EVIDENCE_TYPES, ...EVIDENCE_EXTENSIONS.map((ext) => `.${ext}`)].join(",");

/**
 * An evidence file must be a JPG, PNG, HEIC, or PDF. Browsers often report no type for HEIC, so an empty type
 * falls back to the file extension; a reported type must be on the list.
 */
export function reimbursementEvidenceAllowed(contentType: string, fileName: string): boolean {
  const type = contentType.trim().toLowerCase();
  if (type) return EVIDENCE_TYPES.includes(type);
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EVIDENCE_EXTENSIONS.includes(extension);
}
