import { NextResponse } from "next/server";
import { executeCommand, type CommandRequest } from "@/lib/command-service";
import { currentSessionUser } from "@/lib/server/current-user";
import { loadTenantState, saveTenantState } from "@/lib/server/persist";
import { withTenantLock } from "@/lib/server/tenant-lock";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessionUser = await currentSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CommandRequest;
  try {
    body = (await request.json()) as CommandRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return await withTenantLock(async () => {
      const loaded = await loadTenantState();
      const before = structuredClone(loaded); // a command must not be able to hide its change by mutating
      const outcome = executeCommand(loaded, sessionUser, body);
      if (outcome.kind === "invalid") return NextResponse.json({ error: outcome.error }, { status: 400 });
      if (outcome.kind === "refused") {
        return NextResponse.json({ error: outcome.error, state: outcome.view }, { status: 403 });
      }
      await saveTenantState(outcome.next, before);
      return NextResponse.json({ result: outcome.result, state: outcome.view });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
