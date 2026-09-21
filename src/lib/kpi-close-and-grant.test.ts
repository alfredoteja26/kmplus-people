import { describe, expect, it } from "vitest";
import {
  addCheckIn,
  agreeKpiSet,
  closeKpiYear,
  grantAdmin,
  revokeAdmin,
  upsertKpiItem,
} from "./commands";
import { userForPerson } from "./domain";
import { hasAdminGrant, isPortfolioDualApproved, kpiYearPhase, readableKpiYear } from "./domain-query";
import { createInitialState } from "./fixtures";
import type { AppState } from "./types";

function asAlfredo(state: AppState): AppState {
  return { ...state, currentPersonId: "person-alfredo", currentRole: "employee" };
}

function asDenny(state: AppState): AppState {
  return { ...state, currentPersonId: "person-denny", currentRole: "hr" };
}

function asAlvin(state: AppState): AppState {
  return { ...state, currentPersonId: "person-alvin", currentRole: "admin" };
}

function asRayhan(state: AppState): AppState {
  return { ...state, currentPersonId: "person-rayhan", currentRole: "manager" };
}

describe("closeKpiYear scoring", () => {
  it("closes with unfinished packs and stores no KpiScore on a pending-plan Portfolio", () => {
    const started = asAlfredo(createInitialState());
    expect(started.kpiSets.find((row) => row.id === "set-alfredo")?.status).toBe("pending");

    const closed = closeKpiYear(started, "cycle-2026");
    expect(closed.error).toBeNull();
    expect(kpiYearPhase(closed.state.cycles.find((row) => row.id === "cycle-2026")!)).toBe("closed");

    const pending = closed.state.kpiSets.find((row) => row.id === "set-alfredo");
    expect(pending?.status).toBe("pending");
    expect(pending?.score).toBeUndefined();
  });

  it("scores only dual-approved packs from approved KpiCheckIns", () => {
    const started = asAlfredo(createInitialState());
    const approvedBefore = started.kpiSets.find((row) => row.id === "set-digit");
    expect(approvedBefore?.status).toBe("approved");
    expect(isPortfolioDualApproved(started, "set-digit")).toBe(true);

    const withoutPending = closeKpiYear(started, "cycle-2026");
    const baseline = withoutPending.state.kpiSets.find((row) => row.id === "set-digit")?.score;
    expect(baseline).toBeDefined();

    const pendingAdded = addCheckIn(
      { ...started, currentPersonId: "person-digit", currentRole: "employee" },
      "ki-digit-1",
      999,
      "should not count",
      { window: "2026-Q2" },
    );
    expect(pendingAdded.error).toBeNull();
    const closed = closeKpiYear(asAlfredo(pendingAdded.state), "cycle-2026");
    expect(closed.state.kpiSets.find((row) => row.id === "set-digit")?.score).toBe(baseline);
    expect(closed.state.kpiSets.find((row) => row.id === "set-digit")?.status).toBe("scored");
  });

  it("keeps the closed KpiYear readable and blocks writes", () => {
    const closed = closeKpiYear(asAlfredo(createInitialState()), "cycle-2026");
    expect(readableKpiYear(closed.state)?.id).toBe("cycle-2026");
    expect(kpiYearPhase(readableKpiYear(closed.state)!)).toBe("closed");

    const item = closed.state.kpiItems.find((row) => row.id === "ki-digit-1")!;
    expect(upsertKpiItem(closed.state, { ...item, name: "nope" }).error).toMatch(/closed/i);
    expect(agreeKpiSet(closed.state, "set-alfredo").error).toMatch(/closed/i);
  });
});

describe("grant and revoke Admin", () => {
  it("lets an existing Admin grant and revoke Admin on another User", () => {
    const started = asAlfredo(createInitialState());
    const granted = grantAdmin(started, "person-rayhan");
    expect(granted.error).toBeNull();
    expect(userForPerson(granted.state, "person-rayhan")?.adminGrant).toBe(true);
    expect(userForPerson(granted.state, "person-alfredo")?.adminGrant).toBe(true);
    expect(hasAdminGrant(asRayhan(granted.state))).toBe(true);

    const revoked = revokeAdmin(granted.state, "person-rayhan");
    expect(revoked.error).toBeNull();
    expect(userForPerson(revoked.state, "person-rayhan")?.adminGrant).toBe(false);
    expect(userForPerson(revoked.state, "person-alfredo")?.adminGrant).toBe(true);
  });

  it("lets HR without the Admin grant still grant Admin", () => {
    const started = asDenny(createInitialState());
    expect(userForPerson(started, "person-denny")?.adminGrant).toBe(false);

    const granted = grantAdmin(started, "person-rayhan");
    expect(granted.error).toBeNull();
    expect(userForPerson(granted.state, "person-rayhan")?.adminGrant).toBe(true);
  });

  it("refuses grant and revoke when the actor is neither HR nor Admin", () => {
    const rayhan = asRayhan(createInitialState());
    expect(grantAdmin(rayhan, "person-marcelino").error).toMatch(/HR or an existing Admin/);
    expect(revokeAdmin(rayhan, "person-alfredo").error).toMatch(/HR or an existing Admin/);

    const alvin = asAlvin(createInitialState());
    expect(userForPerson(alvin, "person-alvin")?.adminGrant).toBe(false);
    expect(grantAdmin(alvin, "person-rayhan").error).toMatch(/HR or an existing Admin/);
  });
});
