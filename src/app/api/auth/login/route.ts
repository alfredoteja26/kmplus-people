import { NextResponse } from "next/server";
import { evaluateLogin } from "@/lib/server/login";
import { hashPassword } from "@/lib/server/password";
import { getPrisma } from "@/lib/server/prisma";
import { writeSession } from "@/lib/server/session";
import type { Role } from "@/lib/types";
import { TENANT_ID } from "@/lib/types";

export const runtime = "nodejs";

type LoginBody = {
  email?: string;
  password?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : undefined;
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const record = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, email: { equals: email, mode: "insensitive" } },
  });
  const result = evaluateLogin(
    record
      ? {
          id: record.id,
          email: record.email,
          passwordHash: record.passwordHash,
          role: record.role as Role,
          personId: record.personId,
          mustSetPassword: record.mustSetPassword,
        }
      : null,
    { password, newPassword },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, mustSetPassword: result.mustSetPassword === true },
      { status: result.status },
    );
  }

  if (result.setPassword) {
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        passwordHash: hashPassword(result.setPassword),
        mustSetPassword: false,
      },
    });
  }

  await writeSession(result.user.id);
  return NextResponse.json({
    ok: true,
    personId: result.user.personId,
    role: result.user.role,
    email: result.user.email,
  });
}
