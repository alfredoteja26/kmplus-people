import type { Role } from "@/lib/types";

export function peopleListDescription(role: Role, hr: boolean): string {
  if (hr) {
    return "Add people, confirm new hires, assign positions, and handle correction requests.";
  }
  if (role === "manager") {
    return "People who report to you. Open a profile to see their details, employment, and reviewed CV.";
  }
  return "Your profile. To change your legal name or reviewed CV details, ask HR from your profile.";
}
