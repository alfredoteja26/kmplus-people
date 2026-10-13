import { isCommandName, refusal, runCommand } from "./command-registry";
import { replayingIds, withIdSource } from "./domain";
import { scopeStateForViewer } from "./scope";
import { overlaySessionIdentity } from "./session-identity";
import type { AppState, Role } from "./types";

export type CommandRequest = { name: unknown; args: unknown; ids?: unknown };

export type CommandOutcome =
  | { kind: "applied"; next: AppState; view: AppState; result: Record<string, unknown> }
  | { kind: "refused"; view: AppState; error: string }
  | { kind: "invalid"; error: string };

function takenIds(state: AppState): Set<string> {
  const taken = new Set<string>();
  for (const value of Object.values(state)) {
    if (!Array.isArray(value)) continue;
    for (const row of value) {
      if (row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string") {
        taken.add((row as { id: string }).id);
      }
    }
  }
  return taken;
}

/**
 * Runs one browser-requested command against the full tenant as the session User. Identity always comes from
 * the session; the command's own checks decide whether it may run. Returns the next full state to persist
 * (when applied) and the viewer's scoped view to send back.
 */
export function executeCommand(
  full: AppState,
  session: { personId: string; role: Role },
  request: CommandRequest,
): CommandOutcome {
  if (!isCommandName(request.name)) return { kind: "invalid", error: "Unknown command" };
  if (!Array.isArray(request.args)) return { kind: "invalid", error: "Command arguments must be a list" };

  const asViewer = overlaySessionIdentity(full, session);
  const outcome = withIdSource(replayingIds(request.ids, takenIds(asViewer)), () =>
    runCommand(request.name as Parameters<typeof runCommand>[0], asViewer, request.args as unknown[]),
  );
  const error = refusal(outcome);
  if (error) return { kind: "refused", view: scopeStateForViewer(asViewer), error };

  const next = overlaySessionIdentity(outcome.state, session);
  const { state: _state, ...result } = outcome;
  return { kind: "applied", next, view: scopeStateForViewer(next), result };
}
