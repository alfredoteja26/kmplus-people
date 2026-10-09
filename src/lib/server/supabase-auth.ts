import { GoTrueClient } from "@supabase/auth-js";
import type { LoginEmailChange } from "@/lib/auth-policy";

// Auth only: the full supabase-js client also starts Realtime, which needs a native WebSocket (Node 22+).
function authClient(key: string): GoTrueClient {
  return new GoTrueClient({
    url: `${supabaseUrl()}/auth/v1`,
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  });
}

export function supabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY,
  );
}

function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("Supabase Auth is not configured");
  return url;
}

/** Acts as an anonymous visitor: password sign-in, recovery email, recovery link. */
function publicClient(): { auth: GoTrueClient } {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Supabase Auth is not configured");
  return { auth: authClient(key) };
}

/** Acts as the project admin: create, look up, and change logins. Server only. */
function adminClient(): { auth: GoTrueClient } {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Supabase Auth is not configured");
  return { auth: authClient(key) };
}

function redirectUrl(): string {
  const origin = (process.env.APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
  return `${origin}/login/password`;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await publicClient().auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
  if (error) throw error;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await publicClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Redeems the `token_hash` from a recovery email and sets the new password. */
export async function resetPassword(tokenHash: string, password: string): Promise<{ email: string }> {
  const { data, error } = await publicClient().auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  if (error) throw error;
  const user = data.user;
  if (!user?.email) throw new Error("INVALID_TOKEN_HASH");
  const updated = await adminClient().auth.admin.updateUserById(user.id, { password });
  if (updated.error) throw updated.error;
  return { email: user.email };
}

async function findLoginId(email: string): Promise<string | null> {
  const admin = adminClient().auth.admin;
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
  }
}

/** Creates the Supabase login without a password; returns false when it already existed. */
export async function ensureLogin(email: string): Promise<boolean> {
  const { error } = await adminClient().auth.admin.createUser({ email, email_confirm: true });
  if (error?.code === "email_exists") return false;
  if (error) throw error;
  return true;
}

export async function provisionLogin(email: string): Promise<void> {
  await ensureLogin(email);
  await sendPasswordReset(email);
}

export async function replaceLogin(from: string, to: string): Promise<void> {
  const id = await findLoginId(from);
  if (!id) {
    await provisionLogin(to);
    return;
  }
  const { error } = await adminClient().auth.admin.updateUserById(id, { email: to, email_confirm: true });
  if (error) throw error;
  await sendPasswordReset(to);
}

export async function applyLoginEmailChanges(changes: LoginEmailChange[]): Promise<void> {
  for (const change of changes) {
    if (change.type === "created") await provisionLogin(change.email);
    else await replaceLogin(change.from, change.to);
  }
}
