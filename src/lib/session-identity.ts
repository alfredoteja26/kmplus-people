import type { AppState, Role } from "./types";

export function overlaySessionIdentity(
  state: AppState,
  session: { personId: string; role: Role },
): AppState {
  return {
    ...state,
    currentPersonId: session.personId,
    currentRole: session.role,
  };
}
