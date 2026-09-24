"use client";

import { AuthFrame } from "@/components/auth/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsPasswordEmail, setNeedsPasswordEmail] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNeedsPasswordEmail(false);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        needsPasswordEmail?: boolean;
      };
      if (response.status === 403 && payload.needsPasswordEmail) {
        setNeedsPasswordEmail(true);
        setError(payload.error || "Check your email for a link to set your password.");
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
    <AuthFrame title="Sign in" description="Use your KMPlus email and password.">
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <div className="flex justify-end">
          <Link
            href="/login/forgot"
            className="text-sm font-medium text-accent no-underline hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Forgot password?
          </Link>
        </div>
        {error ? (
          <Callout tone="danger">
            {error}{" "}
            {needsPasswordEmail ? (
              <Link href="/login/forgot" className="font-medium text-ink underline">
                Request the email
              </Link>
            ) : null}
          </Callout>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthFrame>
  );
}
