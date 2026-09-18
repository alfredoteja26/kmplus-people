import type { Role } from "@/lib/types";
import { verifyPassword } from "./password";

export const MIN_PASSWORD_LENGTH = 8;

export type LoginUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  personId: string;
  mustSetPassword: boolean;
};

export type LoginSuccess = { ok: true; user: LoginUser; setPassword: string };
export type LoginPass = { ok: true; user: LoginUser; setPassword: null };
export type LoginFailure = {
  ok: false;
  status: number;
  error: string;
  mustSetPassword?: boolean;
};

export function evaluateLogin(
  user: LoginUser | null,
  input: { password: string; newPassword?: string },
): LoginSuccess | LoginPass | LoginFailure {
  if (!user) {
    return { ok: false, status: 401, error: "Invalid email or password" };
  }
  if (user.mustSetPassword) {
    const next = input.newPassword?.trim() ?? "";
    if (next.length < MIN_PASSWORD_LENGTH) {
      return {
        ok: false,
        status: 403,
        error: "Set a password of at least 8 characters to finish sign-in.",
        mustSetPassword: true,
      };
    }
    return { ok: true, user, setPassword: next };
  }
  if (!verifyPassword(input.password, user.passwordHash)) {
    return { ok: false, status: 401, error: "Invalid email or password" };
  }
  return { ok: true, user, setPassword: null };
}
