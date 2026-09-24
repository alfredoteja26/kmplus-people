import { NextResponse } from "next/server";
import { evaluateLogin } from "@/lib/server/login";
import { firebaseAuthConfigured, signInWithPassword } from "@/lib/server/firebase-auth";
import { getPrisma } from "@/lib/server/prisma";
import { writeSession } from "@/lib/server/session";
import type { Role } from "@/lib/types";
import { TENANT_ID } from "@/lib/types";

export const runtime = "nodejs";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (!firebaseAuthConfigured()) {
    return NextResponse.json({ error: "Password sign-in is not available yet." }, { status: 503 });
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const record = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, email: { equals: email, mode: "insensitive" } },
    include: { person: { include: { employments: true } } },
  });
  const employmentActive = record?.person.employments.some((row) => row.status === "active") ?? false;
  const result = evaluateLogin(
    record
      ? {
          id: record.id,
          email: record.email,
          role: record.role as Role,
          personId: record.personId,
          mustSetPassword: record.mustSetPassword,
          authEpoch: record.authEpoch,
        }
      : null,
    employmentActive,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, needsPasswordEmail: result.needsPasswordEmail === true },
      { status: result.status },
    );
  }

  try {
    await signInWithPassword(result.user.email, password);
  } catch {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await writeSession(result.user.id, result.user.authEpoch);
  return NextResponse.json({
    ok: true,
    personId: result.user.personId,
    role: result.user.role,
    email: result.user.email,
  });
}
