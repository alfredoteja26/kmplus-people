import { NextResponse } from "next/server";
import { validateNewPassword } from "@/lib/auth-policy";
import { firebaseAuthConfigured, resetPassword } from "@/lib/server/firebase-auth";
import { getPrisma } from "@/lib/server/prisma";
import { TENANT_ID } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let oobCode = "";
  let password = "";
  let confirm = "";
  try {
    const body = (await request.json()) as { oobCode?: string; password?: string; confirm?: string };
    oobCode = String(body.oobCode ?? "").trim();
    password = String(body.password ?? "");
    confirm = String(body.confirm ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!oobCode) {
    return NextResponse.json({ error: "This link is missing or has expired. Request a new one." }, { status: 400 });
  }
  const invalid = validateNewPassword(password, confirm);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (!firebaseAuthConfigured()) {
    return NextResponse.json({ error: "Password email is not available yet." }, { status: 503 });
  }

  try {
    const reset = await resetPassword(oobCode, password);
    const prisma = getPrisma();
    await prisma.user.updateMany({
      where: { tenantId: TENANT_ID, email: { equals: reset.email, mode: "insensitive" } },
      data: { mustSetPassword: false },
    });
  } catch {
    return NextResponse.json({ error: "This link has expired. Request a new one." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
