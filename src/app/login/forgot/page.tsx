"use client";

import { AuthFrame, BackToSignIn, CheckMark } from "@/components/auth/AuthFrame";
import { FORGOT_PASSWORD_MESSAGE } from "@/lib/auth-policy";
import { Button } from "@/components/coss/button";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

function ForgotPasswordForm() {
  const firstTime = useSearchParams().get("first") === "1";
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
        setError(payload.error || "We couldn’t send the email. Try again in a moment.");
        return;
      }
      setSentTo(address);
    } catch {
      setError("We couldn’t reach KMPlus People. Check your connection and try again.");
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
          {FORGOT_PASSWORD_MESSAGE} We sent it to <span className="font-medium text-ink">{sentTo}</span>.
        </p>
        <p className="mt-0 mb-5 text-sm text-muted">The link works for 1 hour. Not there? Check your spam folder.</p>
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <div className="mt-4 grid gap-3">
          <Button type="button" className="w-full" disabled={pending} onClick={() => void send(sentTo)}>
            {pending ? "Sending…" : "Resend link"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setSentTo("");
              setEmail("");
              setError("");
            }}
          >
            Use a different email
          </Button>
          <BackToSignIn />
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title={firstTime ? "Set your password" : "Reset your password"}
      description={
        firstTime
          ? "Enter your @kmplus.co.id work email. We’ll send a link to choose your password."
          : "Enter your @kmplus.co.id work email. We’ll send a link to choose a new password."
      }
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field label="Work email">
          <Input
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="name@kmplus.co.id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus
          />
        </Field>
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send link"}
        </Button>
        <BackToSignIn />
      </form>
    </AuthFrame>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
