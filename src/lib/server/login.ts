import { normalizeLoginEmail } from "@/lib/auth-policy";
import type { Role } from "@/lib/types";

export type LoginUser = {
  id: string;
  email: string;
  role: Role;
  personId: string;
  mustSetPassword: boolean;
  authEpoch: number;
};

export type LoginPass = { ok: true; user: LoginUser };
export type LoginFailure = {
  ok: false;
  status: number;
  error: string;
  needsPasswordEmail?: boolean;
};

const INVALID = "Invalid email or password";

export function evaluateLogin(user: LoginUser | null, employmentActive: boolean): LoginPass | LoginFailure {
  if (!user || !employmentActive || !normalizeLoginEmail(user.email)) {
    return { ok: false, status: 401, error: INVALID };
  }
  return { ok: true, user };
}

export function rejectPassword(mustSetPassword: boolean): LoginFailure {
  if (mustSetPassword) {
    return {
      ok: false,
      status: 403,
      error: "Check your email for a link to set your password.",
      needsPasswordEmail: true,
    };
  }
  return { ok: false, status: 401, error: INVALID };
}
