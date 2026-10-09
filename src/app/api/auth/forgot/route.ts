import { NextResponse } from "next/server";
import { FORGOT_PASSWORD_MESSAGE, PASSWORD_EMAIL_COOLDOWN_MS, shouldSendPasswordEmail } from "@/lib/auth-policy";
import { supabaseAuthConfigured, sendPasswordReset } from "@/lib/server/supabase-auth";
import { getPrisma } from "@/lib/server/prisma";
import { TENANT_ID } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!supabaseAuthConfigured()) {
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
  if (record && shouldSendPasswordEmail(record, employmentStatus) && (await claimPasswordEmail(record.id))) {
    try {
      await sendPasswordReset(record.email);
    } catch (error) {
      console.error("Password email failed", error);
    }
  }

  return NextResponse.json({ ok: true, message: FORGOT_PASSWORD_MESSAGE });
}

/** Atomically takes this minute's slot, so repeated requests can't flood a person's inbox. */
async function claimPasswordEmail(userId: string): Promise<boolean> {
  const now = new Date();
  const { count } = await getPrisma().user.updateMany({
    where: {
      id: userId,
      OR: [
        { passwordEmailSentAt: null },
        { passwordEmailSentAt: { lt: new Date(now.getTime() - PASSWORD_EMAIL_COOLDOWN_MS) } },
      ],
    },
    data: { passwordEmailSentAt: now },
  });
  return count === 1;
}
