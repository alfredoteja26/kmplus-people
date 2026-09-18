import { describe, expect, it } from "vitest";
import { applyCv, confirmHire, decideCvField } from "./commands";
import { createInitialState, DEMO_PASSWORD, seedTenantUsers } from "./fixtures";
import { overlaySessionIdentity } from "./session-identity";
import { evaluateLogin } from "./server/login";
import { hashPassword, verifyPassword } from "./server/password";
import { createSessionToken, verifySessionToken } from "./server/session-token";
import { employmentFor } from "./domain";

function acceptAllCvFields(state: ReturnType<typeof createInitialState>, cvId: string) {
  const cv = state.cvs.find((row) => row.id === cvId);
  if (!cv) throw new Error(`Missing CurriculumVitae ${cvId}`);
  return cv.fields.reduce((next, field) => decideCvField(next, cvId, field.key, "accepted").state, state);
}

describe("confirmHire invite", () => {
  it("creates an employee User once, never on a CV apply", () => {
    const started = acceptAllCvFields(createInitialState(), "cv-fajar");
    const applied = applyCv(started, "cv-fajar", { type: "new-hire" });
    expect(applied.personId).toBeTruthy();
    expect(applied.state.users.some((row) => row.personId === applied.personId)).toBe(false);

    const first = confirmHire(applied.state, applied.personId!);
    const invited = first.state.users.find((row) => row.personId === applied.personId);
    expect(employmentFor(first.state, applied.personId!)?.status).toBe("active");
    expect(invited?.role).toBe("employee");
    expect(invited?.mustSetPassword).toBe(true);
    expect(invited?.email).toBe(first.state.people.find((row) => row.id === applied.personId)?.email);
    expect(first.state.audit.some((row) => row.action === "create" && row.entity === "User")).toBe(true);

    const second = confirmHire(first.state, applied.personId!);
    expect(second.state.users.filter((row) => row.personId === applied.personId)).toHaveLength(1);
  });
});

describe("login", () => {
  it("succeeds for a seeded User and fails for a Person without a User", () => {
    const hash = hashPassword(DEMO_PASSWORD);
    expect(verifyPassword(DEMO_PASSWORD, hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);

    const seeded = seedTenantUsers()[0];
    const result = evaluateLogin(
      {
        id: seeded.id,
        email: seeded.email,
        passwordHash: hash,
        role: seeded.role,
        personId: seeded.personId,
        mustSetPassword: false,
      },
      { password: DEMO_PASSWORD },
    );
    expect(result.ok).toBe(true);

    const candidate = evaluateLogin(null, { password: DEMO_PASSWORD });
    expect(candidate).toMatchObject({ ok: false, status: 401 });
  });

  it("requires a new password when mustSetPassword is true", () => {
    const invited = evaluateLogin(
      {
        id: "user-new",
        email: "fajar@kmplusconsulting.com",
        passwordHash: "",
        role: "employee",
        personId: "person-fajar",
        mustSetPassword: true,
      },
      { password: "" },
    );
    expect(invited).toMatchObject({ ok: false, status: 403, mustSetPassword: true });

    const finished = evaluateLogin(
      {
        id: "user-new",
        email: "fajar@kmplusconsulting.com",
        passwordHash: "",
        role: "employee",
        personId: "person-fajar",
        mustSetPassword: true,
      },
      { password: "", newPassword: "first-login-secret" },
    );
    expect(finished.ok).toBe(true);
    if (finished.ok) expect(finished.setPassword).toBe("first-login-secret");
  });
});

describe("session-owned role", () => {
  it("overwrites currentRole from the session User, not from a tenant-state write", () => {
    const started = createInitialState();
    const next = overlaySessionIdentity(
      { ...started, currentRole: "admin", currentPersonId: "person-alvin" },
      { personId: "person-alfredo", role: "employee" },
    );
    expect(next.currentRole).toBe("employee");
    expect(next.currentPersonId).toBe("person-alfredo");
  });

  it("round-trips a signed session token", async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret-value";
    const token = await createSessionToken("user-alfredo");
    const session = await verifySessionToken(token);
    expect(session?.userId).toBe("user-alfredo");
    expect(await verifySessionToken("not-a-token")).toBeNull();
  });
});
