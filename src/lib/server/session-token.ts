import { TENANT_ID } from "@/lib/types";

export const SESSION_COOKIE = "kmplus_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type SessionPayload = {
  userId: string;
  tenantId: string;
  authEpoch: number;
  exp: number;
};

function sessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padLength = (4 - (value.length % 4)) % 4;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function textToBytes(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value);
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", textToBytes(sessionSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function timingSafeEqualString(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

export async function createSessionToken(userId: string, authEpoch: number, now = Date.now()): Promise<string> {
  const payload: SessionPayload = {
    userId,
    tenantId: TENANT_ID,
    authEpoch,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encoded = bytesToBase64Url(textToBytes(JSON.stringify(payload)));
  const key = await hmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, textToBytes(encoded));
  return `${encoded}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string, now = Date.now()): Promise<SessionPayload | null> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const key = await hmacKey();
  const expected = bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, textToBytes(encoded))));
  if (!timingSafeEqualString(expected, signature)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as SessionPayload;
    if (payload.tenantId !== TENANT_ID || typeof payload.userId !== "string") return null;
    if (typeof payload.authEpoch !== "number") return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}
