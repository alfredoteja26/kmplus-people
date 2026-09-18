import { NextResponse } from "next/server";
import { currentSessionUser } from "@/lib/server/current-user";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    personId: user.personId,
    role: user.role,
    email: user.email,
    preferredName: user.preferredName,
    legalName: user.legalName,
    mustSetPassword: user.mustSetPassword,
  });
}
