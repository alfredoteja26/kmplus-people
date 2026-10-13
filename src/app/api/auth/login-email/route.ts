import { NextResponse } from "next/server";
import { setLoginEmail } from "@/lib/commands";
import { currentSessionUser } from "@/lib/server/current-user";
import { loadTenantState, saveTenantState } from "@/lib/server/persist";
import { withTenantLock } from "@/lib/server/tenant-lock";
import { overlaySessionIdentity } from "@/lib/session-identity";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessionUser = await currentSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "hr") return NextResponse.json({ error: "HR sets the login email." }, { status: 403 });

  let personId = "";
  let email = "";
  try {
    const body = (await request.json()) as { personId?: string; email?: string };
    personId = String(body.personId ?? "");
    email = String(body.email ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return await withTenantLock(async () => {
      const loaded = await loadTenantState();
      const before = structuredClone(loaded);
      const state = overlaySessionIdentity(loaded, {
        personId: sessionUser.personId,
        role: sessionUser.role,
      });
      const result = setLoginEmail(state, personId, email);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
      await saveTenantState(result.state, before);
      return NextResponse.json({ ok: true });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the login email.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
