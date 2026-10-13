import type { Role } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  resigned: "Resigned",
  "draft-hire": "Draft hire",
  draft: "Draft",
  pending: "Waiting for approval",
  returned: "Returned",
  approved: "Approved",
  agreed: "Approved",
  scored: "Scored",
  closed: "Closed",
  open: "Open",
  planning: "Planning",
  monitoring: "Monitoring",
  parsed: "Ready to review",
  "in-review": "In review",
  applied: "Applied",
  rejected: "Rejected",
  accepted: "Accepted",
  edited: "Edited",
  "on-track": "On track",
  "at-risk": "At risk",
  off: "Off track",
};

/** Screen label for a stored status slug. Unknown slugs are sentence-cased, never shown raw. */
export function statusLabel(status: string): string {
  const known = STATUS_LABELS[status];
  if (known) return known;
  const words = status.replace(/[-_]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : status;
}

const ROLE_LABELS: Record<Role, string> = {
  employee: "Employee",
  manager: "Manager",
  hr: "HR",
  admin: "Tenant admin",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** Login role plus the Admin grant when it is held, e.g. "Employee · Admin". */
export function accessLabel(role: Role, adminGrant: boolean): string {
  return adminGrant ? `${roleLabel(role)} · Admin` : roleLabel(role);
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 0-based month index → "Jan".."Dec". ICU en-GB writes September as "Sept"; the product writes "Sep". */
export function shortMonth(monthIndex: number): string {
  return SHORT_MONTHS[monthIndex];
}

/** Formats a UTC date with `format`, swapping ICU's month name for the fixed three-letter one. */
export function formatUtcWithShortMonth(format: Intl.DateTimeFormat, date: Date): string {
  return format
    .formatToParts(date)
    .map((part) => (part.type === "month" ? shortMonth(date.getUTCMonth()) : part.value))
    .join("");
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** "2024-01-01" → "1 Jan 2024". Returns the input unchanged when it is not an ISO date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = parseIsoDate(iso);
  return date ? formatUtcWithShortMonth(DATE, date) : iso;
}

/** "2026-10-05" → "Mon, 5 Oct". */
export function formatDay(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? formatUtcWithShortMonth(DAY, date) : iso;
}

/** "2024-01-01", "2024-03-31" → "1 Jan 2024 – 31 Mar 2024"; open end → "From 1 Jan 2024". */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (start && end) return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  if (end) return `Until ${formatDate(end)}`;
  return "";
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
