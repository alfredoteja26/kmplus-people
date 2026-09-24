import { describe, expect, it } from "vitest";
import { FORGOT_PASSWORD_MESSAGE, loginEmailChanges, shouldSendPasswordEmail, validateNewPassword } from "./auth-policy";
import { applyCv, confirmHire, decideCvField, setLoginEmail } from "./commands";
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
  it("activates Employment and waits for a corporate login email", () => {
    const started = acceptAllCvFields(createInitialState(), "cv-fajar");
    const applied = applyCv(started, "cv-fajar", { type: "new-hire" });
    expect(applied.personId).toBeTruthy();
    expect(applied.state.users.some((row) => row.personId === applied.personId)).toBe(false);

    const first = confirmHire(applied.state, applied.personId!);
    expect(employmentFor(first.state, applied.personId!)?.status).toBe("active");
    expect(first.state.users.some((row) => row.personId === applied.personId)).toBe(false);
    expect(first.state.people.find((row) => row.id === applied.personId)?.email).toBe("fajar.nugroho@email.com");
  });

  it("creates one User when the Person email is already a corporate login", () => {
    const started = acceptAllCvFields(createInitialState(), "cv-fajar");
    const applied = applyCv(started, "cv-fajar", { type: "new-hire" });
    const personId = applied.personId!;
    const withCorporate = {
      ...applied.state,
      people: applied.state.people.map((row) =>
        row.id === personId ? { ...row, email: "Fajar@kmplus.co.id" } : row,
      ),
    };
    const first = confirmHire(withCorporate, personId);
    const invited = first.state.users.find((row) => row.personId === personId);
    expect(invited?.role).toBe("employee");
    expect(invited?.mustSetPassword).toBe(true);
    expect(invited?.email).toBe("fajar@kmplus.co.id");
    expect(first.state.people.find((row) => row.id === personId)?.email).toBe("Fajar@kmplus.co.id");

    const second = confirmHire(first.state, personId);
    expect(second.state.users.filter((row) => row.personId === personId)).toHaveLength(1);
  });
});

describe("login", () => {
  it("accepts an active corporate login and rejects everyone else with the same error", () => {
    const hash = hashPassword(DEMO_PASSWORD);
    expect(verifyPassword(DEMO_PASSWORD, hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);

    const seeded = seedTenantUsers()[0];
    const user = {
      id: seeded.id,
      email: "alfredo@kmplus.co.id",
      role: seeded.role,
      personId: seeded.personId,
      mustSetPassword: false,
      authEpoch: 0,
    };
    expect(evaluateLogin(user, true).ok).toBe(true);
    expect(evaluateLogin(null, true)).toMatchObject({ ok: false, status: 401, error: "Invalid email or password" });
    expect(evaluateLogin(user, false)).toMatchObject({ ok: false, status: 401, error: "Invalid email or password" });
    expect(evaluateLogin({ ...user, email: seeded.email }, true)).toMatchObject({
      ok: false,
      status: 401,
      error: "Invalid email or password",
    });
  });

  it("sends a person who has not set a password to the email link", () => {
    const invited = evaluateLogin(
      {
        id: "user-new",
        email: "fajar@kmplus.co.id",
        role: "employee",
        personId: "person-fajar",
        mustSetPassword: true,
        authEpoch: 0,
      },
      true,
    );
    expect(invited).toMatchObject({
      ok: false,
      status: 403,
      needsPasswordEmail: true,
    });
  });
});

describe("login email", () => {
  it("lets HR set a corporate login and refuses Admin", () => {
    const started = createInitialState();
    const changed = setLoginEmail(started, "person-alfredo", "Alfredo@kmplus.co.id");
    const user = changed.state.users.find((row) => row.personId === "person-alfredo");
    expect(changed.error).toBeUndefined();
    expect(user?.email).toBe("alfredo@kmplus.co.id");
    expect(user?.mustSetPassword).toBe(true);
    expect(user?.authEpoch).toBe(1);
    expect(started.people.find((row) => row.id === "person-alfredo")?.email).toBe(
      changed.state.people.find((row) => row.id === "person-alfredo")?.email,
    );

    const asAdmin = setLoginEmail({ ...started, currentRole: "admin" }, "person-alfredo", "alfredo@kmplus.co.id");
    expect(asAdmin.error).toBe("HR sets the login email.");
    expect(asAdmin.state.users.find((row) => row.personId === "person-alfredo")?.email).toBe(
      started.users.find((row) => row.personId === "person-alfredo")?.email,
    );
    expect(setLoginEmail(started, "person-alfredo", "alfredo@gmail.com").error).toMatch(/@kmplus.co.id/);
  });

  it("sends a password email only for an active corporate login", () => {
    expect(shouldSendPasswordEmail({ email: "alfredo@kmplus.co.id" }, "active")).toBe(true);
    expect(shouldSendPasswordEmail({ email: "alfredo@kmplus.co.id" }, "resigned")).toBe(false);
    expect(shouldSendPasswordEmail({ email: "alfredo@kmplusconsulting.com" }, "active")).toBe(false);
    expect(shouldSendPasswordEmail(null, "active")).toBe(false);
    expect(FORGOT_PASSWORD_MESSAGE).toMatch(/active login/);
    expect(validateNewPassword("short", "short")).toMatch(/8 characters/);
    expect(validateNewPassword("long-enough", "other-value")).toMatch(/do not match/);
    expect(validateNewPassword("long-enough", "long-enough")).toBeNull();
    expect(
      loginEmailChanges(
        [{ personId: "person-alfredo", email: "alfredo@kmplusconsulting.com" }],
        [{ personId: "person-alfredo", email: "alfredo@kmplus.co.id" }],
      ),
    ).toEqual([{ type: "created", email: "alfredo@kmplus.co.id" }]);
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
    const token = await createSessionToken("user-alfredo", 2);
    const session = await verifySessionToken(token);
    expect(session?.userId).toBe("user-alfredo");
    expect(session?.authEpoch).toBe(2);
    expect(await verifySessionToken("not-a-token")).toBeNull();
  });
});
