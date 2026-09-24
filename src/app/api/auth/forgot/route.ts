import { NextResponse } from "next/server";
import { FORGOT_PASSWORD_MESSAGE, shouldSendPasswordEmail } from "@/lib/auth-policy";
import { firebaseAuthConfigured, sendPasswordReset } from "@/lib/server/firebase-auth";
import { getPrisma } from "@/lib/server/prisma";
import { TENANT_ID } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!firebaseAuthConfigured()) {
    return NextResponse.json({ error: "Password email is not available yet." }, { status: 503 });
  }

  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const prisma = getPrisma();
  const record = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, email: { equals: email, mode: "insensitive" } },
    include: { person: { include: { employments: true } } },
  });
  const employmentStatus = record?.person.employments.some((row) => row.status === "active") ? "active" : null;
  if (record && shouldSendPasswordEmail(record, employmentStatus)) {
    try {
      await sendPasswordReset(record.email);
    } catch (error) {
      console.error("Password email failed", error);
    }
  }

  return NextResponse.json({ ok: true, message: FORGOT_PASSWORD_MESSAGE });
}
