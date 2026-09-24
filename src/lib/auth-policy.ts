export const CORPORATE_LOGIN_DOMAIN = "kmplus.co.id";
export const MIN_PASSWORD_LENGTH = 8;
export const FORGOT_PASSWORD_MESSAGE =
  "If an active login uses that email, we sent a link to set a password.";

export type LoginEmailChange =
  | { type: "created"; email: string }
  | { type: "changed"; from: string; to: string };

export function normalizeLoginEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  const suffix = `@${CORPORATE_LOGIN_DOMAIN}`;
  if (!value.endsWith(suffix)) return null;
  const local = value.slice(0, -suffix.length);
  if (!local || local.includes("@") || /\s/.test(value)) return null;
  return value;
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== confirm) return "Those passwords do not match.";
  return null;
}

export function shouldSendPasswordEmail(
  user: { email: string } | null,
  employmentStatus: string | null,
): boolean {
  if (!user || !normalizeLoginEmail(user.email)) return false;
  return employmentStatus === "active";
}

export function loginEmailChanges(
  previous: { personId: string; email: string }[],
  next: { personId: string; email: string }[],
): LoginEmailChange[] {
  const changes: LoginEmailChange[] = [];
  for (const row of next) {
    const email = normalizeLoginEmail(row.email);
    if (!email) continue;
    const prev = previous.find((item) => item.personId === row.personId);
    const prevEmail = prev ? normalizeLoginEmail(prev.email) : null;
    if (!prevEmail) changes.push({ type: "created", email });
    else if (prevEmail !== email) changes.push({ type: "changed", from: prevEmail, to: email });
  }
  return changes;
}
