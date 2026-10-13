/** Project commands refuse in domain terms; sheets say what to do about it. Unknown messages lose their camelCase nouns. */
const PLAIN: Record<string, string> = {
  "Admin grant required": "Only an Admin can do this.",
  "Project code is required": "Enter a project code.",
  "Project code must be unique in the company": "Another project already uses this code. Codes must differ, ignoring capital letters.",
  "Project name is required": "Enter a project name.",
  "Project start is required": "Choose a start date.",
  "Project end must fall on or after start": "The end date must be on or after the start date.",
  "Project dates would leave a WorkItem outside the Project": "A work item falls outside these dates. Change that work item first, or keep the dates wider.",
  "Load must be a whole percent from 1 to 100": "Load must be a whole number from 1 to 100.",
  "Staffing end must fall on or after start": "The end date must be on or after the start date.",
  "Staffing ranges for the same Person on the same Project may not overlap":
    "This person is already on the project for part of that time. Change their other period instead.",
  "WorkItem name is required": "Enter a work item name.",
  "WorkItem start and end are required": "Choose a start and an end date.",
  "PIC must have a Staffing row on that Project": "The person in charge must be staffed on this project.",
  "Only Admin or a Person staffed today may edit WorkItems": "Only an Admin or someone on this project today can change work items.",
  "Only Admin or a Person staffed today may edit Deliverables": "Only an Admin or someone on this project today can change deliverables.",
  "Deliverable name is required": "Enter a deliverable name.",
  "Deliverable category is required": "Choose a category.",
  "Deliverable status is required": "Choose a status.",
  "Link Deliverable requires a URL": "Enter the link's address.",
  "File Deliverable requires a storage path": "Choose a file to upload.",
  "Deliverable WorkItems must belong to the Project": "Attach only work items from this project.",
};

export function plainProjectError(message: string | null | undefined): string {
  if (!message) return "";
  return (
    PLAIN[message] ??
    message
      .replace(/WorkItems?/g, (word) => (word.endsWith("s") ? "work items" : "work item"))
      .replace(/Staffing/g, "staffing")
      .replace(/Deliverable/g, "deliverable")
  );
}
