/** Admin list and holiday commands refuse in domain terms; the sheets and rows say what to do about it. */
const PLAIN: Record<string, string> = {
  "Admin grant required": "Only an Admin can do this.",
  "A label still in use cannot be removed": "This label is still in use, so it can't be removed.",
  "The Meeting type cannot be removed; rename it instead":
    "Only the Meeting type can carry invitations, so it can be renamed but not removed.",
  "PublicHoliday date is required": "Choose a date.",
  "A PublicHoliday already exists on that date": "That date already has a public holiday.",
};

export function plainAdminError(message: string | null | undefined): string {
  if (!message) return "";
  const known = PLAIN[message];
  if (known) return known;
  if (/ name is required$/.test(message)) return "Enter a name.";
  if (/ not found$/.test(message)) return "This item no longer exists. Reload the page to see the current list.";
  if (/^At least one /.test(message)) return "A list needs at least one label, so the last one can't be removed.";
  return message
    .replace(/PublicHoliday/g, "public holiday")
    .replace(/LeaveType/g, "leave type")
    .replace(/TimeBlock type/g, "time entry type");
}
