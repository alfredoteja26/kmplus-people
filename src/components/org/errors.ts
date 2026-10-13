/** Organization commands refuse in domain terms; the sheets say what to do about it. */
const PLAIN: Record<string, string> = {
  "Only HR can change people, positions, and CV reviews": "Only HR can change positions or who holds them. Ask HR to make this change.",
};

export function plainOrgError(message: string | null | undefined): string {
  if (!message) return "";
  return PLAIN[message] ?? message.replace(/\bPositions?\b/g, (word) => word.toLowerCase()).replace(/\bAssignments?\b/g, (word) => word.toLowerCase());
}
