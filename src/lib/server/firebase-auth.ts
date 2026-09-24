import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { LoginEmailChange } from "@/lib/auth-policy";

export function firebaseAuthConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
}

function apiKey(): string {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) throw new Error("Firebase Auth is not configured");
  return key;
}

function adminAuth() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!raw || !projectId) throw new Error("Firebase Auth is not configured");
    initializeApp({
      credential: cert(JSON.parse(raw) as ServiceAccount),
      projectId,
    });
  }
  return getAuth();
}

function continueUrl(): string {
  const origin = (process.env.APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
  return `${origin}/login/password`;
}

async function identity<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Firebase Auth request failed");
  }
  return payload;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await identity("accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
    continueUrl: continueUrl(),
    canHandleCodeInApp: true,
  });
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  await identity("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
}

export async function resetPassword(oobCode: string, password: string): Promise<{ email: string }> {
  const payload = await identity<{ email?: string }>("accounts:resetPassword", {
    oobCode,
    newPassword: password,
  });
  if (!payload.email) throw new Error("INVALID_OOB_CODE");
  return { email: payload.email };
}

export async function provisionLogin(email: string): Promise<void> {
  const auth = adminAuth();
  try {
    await auth.getUserByEmail(email);
  } catch {
    await auth.createUser({ email, emailVerified: false });
  }
  await sendPasswordReset(email);
}

export async function replaceLogin(from: string, to: string): Promise<void> {
  const auth = adminAuth();
  const user = await auth.getUserByEmail(from);
  await auth.updateUser(user.uid, { email: to, emailVerified: false });
  await auth.revokeRefreshTokens(user.uid);
  await sendPasswordReset(to);
}

export async function applyLoginEmailChanges(changes: LoginEmailChange[]): Promise<void> {
  for (const change of changes) {
    if (change.type === "created") await provisionLogin(change.email);
    else await replaceLogin(change.from, change.to);
  }
}
