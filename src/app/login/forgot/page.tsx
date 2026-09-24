"use client";

import { AuthFrame, BackToSignIn, CheckMark } from "@/components/auth/AuthFrame";
import { FORGOT_PASSWORD_MESSAGE } from "@/lib/auth-policy";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function send(address: string) {
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Could not send the email.");
        return;
      }
      setSentTo(address);
    } catch {
      setError("Could not send the email.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(email);
  }

  if (sentTo) {
    return (
      <AuthFrame title="Check your inbox">
        <CheckMark />
        <p className="mt-0 mb-2 text-sm text-muted">
          {FORGOT_PASSWORD_MESSAGE} We used <span className="font-medium text-ink">{sentTo}</span>.
        </p>
        <p className="mt-0 mb-5 text-sm text-muted">The link expires in 1 hour. If it is not there, check spam.</p>
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <div className="mt-4 grid gap-3">
          <Button type="button" className="w-full" disabled={pending} onClick={() => void send(sentTo)}>
            {pending ? "Sending…" : "Resend link"}
          </Button>
          <button
            type="button"
            className="text-sm text-muted hover:text-ink"
            onClick={() => {
              setSentTo("");
              setEmail("");
              setError("");
            }}
          >
            Try a different email
          </button>
          <BackToSignIn />
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Forgot password" description="Enter your KMPlus email and we will send a link to set a password.">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field label="Email">
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
        <BackToSignIn />
      </form>
    </AuthFrame>
  );
}
