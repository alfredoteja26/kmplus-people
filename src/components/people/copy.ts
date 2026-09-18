import type { Role } from "@/lib/types";

export function peopleListDescription(role: Role, hr: boolean): string {
  if (hr) {
    return "Create Person and Employment, confirm draft hires, assign seats, and resolve correction requests from each profile.";
  }
  if (role === "manager") {
    return "People in your reporting line. Open a profile for identity, employment, and reviewed evidence.";
  }
  return "Your Person record. Request a correction from the profile when contact details need an update.";
}
