import { NextResponse } from "next/server";
import { currentSessionUser } from "@/lib/server/current-user";
import { loadTenantState } from "@/lib/server/persist";
import { scopeStateForViewer } from "@/lib/scope";
import { overlaySessionIdentity } from "@/lib/session-identity";

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
    return NextResponse.json(scopeStateForViewer(state));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

/** Writes go through POST /api/commands, one checked command at a time. */
export function PUT() {
  return NextResponse.json({ error: "Send changes as commands to /api/commands" }, { status: 405 });
}
