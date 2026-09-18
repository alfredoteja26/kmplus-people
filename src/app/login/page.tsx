"use client";

import { Button } from "@/components/ui/Button";
import { Callout, Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { DEMO_PASSWORD, DEMO_USERS, createInitialState } from "@/lib/fixtures";
import { roleLabel } from "@/lib/domain";
import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";

export default function LoginPage() {
  const demoLogins = useMemo(() => {
    const people = createInitialState().people;
    return DEMO_USERS.map((demo) => {
      const person = people.find((row) => row.id === demo.personId);
      return {
        email: person?.email ?? "",
        label: roleLabel(demo.role),
        name: person?.preferredName || person?.legalName || demo.label,
      };
    });
  }, []);

  const [email, setEmail] = useState(demoLogins[0]?.email ?? "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          newPassword: mustSetPassword ? newPassword : undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        mustSetPassword?: boolean;
      };
      if (response.status === 403 && payload.mustSetPassword) {
        setMustSetPassword(true);
        setError(payload.error || "Set a password to finish sign-in.");
        return;
      }
      if (!response.ok) {
        setError(payload.error || "Could not sign in.");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10 text-ink">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/brand/kmplus-logo-dark.svg" alt="KMPlus" width={48} height={41} priority unoptimized />
          <div>
            <p className="m-0 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">KMPlus People</p>
            <p className="m-0 text-[22px] font-medium leading-tight">Sign in</p>
          </div>
        </div>
        <Card>
          <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
            <Field label="Email">
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete={mustSetPassword ? "current-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required={!mustSetPassword}
              />
            </Field>
            {mustSetPassword ? (
              <Field label="New password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </Field>
            ) : null}
            {error ? <Callout tone="danger">{error}</Callout> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
        <div className="mt-4">
          <Callout>
            <p className="m-0 font-medium">Demo accounts</p>
            <p className="mt-1 mb-3 text-muted">
              Same password for all four: <span className="font-mono text-ink">{DEMO_PASSWORD}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {demoLogins.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => setEmail(demo.email)}
                  className="rounded-full border-[1.5px] border-line bg-paper px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-ink"
                >
                  {demo.name} · {demo.label}
                </button>
              ))}
            </div>
          </Callout>
        </div>
      </div>
    </div>
  );
}
