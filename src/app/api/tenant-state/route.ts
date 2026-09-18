import { NextResponse } from "next/server";
import { currentSessionUser } from "@/lib/server/current-user";
import { loadTenantState, saveTenantState } from "@/lib/server/persist";
import { overlaySessionIdentity } from "@/lib/session-identity";
import type { AppState } from "@/lib/types";
import { TENANT_ID } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sessionUser = await currentSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const state = overlaySessionIdentity(await loadTenantState(), {
      personId: sessionUser.personId,
      role: sessionUser.role,
    });
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const sessionUser = await currentSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const incoming = (await request.json()) as AppState;
    if (!incoming || incoming.tenantId !== TENANT_ID) {
      return NextResponse.json({ error: "Invalid tenant state" }, { status: 400 });
    }
    const state = overlaySessionIdentity(incoming, {
      personId: sessionUser.personId,
      role: sessionUser.role,
    });
    await saveTenantState(state);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
