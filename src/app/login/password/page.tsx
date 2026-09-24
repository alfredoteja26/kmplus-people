"use client";

import { AuthFrame, BackToSignIn, CheckMark } from "@/components/auth/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function FillPasswordForm() {
  const params = useSearchParams();
  const oobCode = params.get("oobCode") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oobCode, password, confirm }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Could not save the password.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not save the password.");
    } finally {
      setPending(false);
    }
  }

  if (!oobCode) {
    return (
      <AuthFrame title="Set a password" description="This link is missing or has expired.">
        <Link href="/login/forgot" className="text-sm font-medium text-accent no-underline hover:underline">
          Request a new link
        </Link>
        <div className="mt-4">
          <BackToSignIn />
        </div>
      </AuthFrame>
    );
  }

  if (saved) {
    return (
      <AuthFrame title="Password saved" description="Sign in with your email and the new password.">
        <CheckMark />
        <Link
          href="/login"
          className="inline-flex min-h-9 w-full items-center justify-center rounded-[12px] bg-accent text-sm font-medium text-on-accent no-underline"
        >
          Sign in
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Set a password" description="Choose a password for your KMPlus login. Use at least 8 characters.">
      <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="New password">
          <Input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </Field>
        {error ? (
          <Callout tone="danger">
            {error}
            {error.includes("expired") ? (
              <>
                {" "}
                <Link href="/login/forgot" className="font-medium text-ink underline">
                  Request a new link
                </Link>
              </>
            ) : null}
          </Callout>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save password"}
        </Button>
        <BackToSignIn />
      </form>
    </AuthFrame>
  );
}

export default function FillPasswordPage() {
  return (
    <Suspense fallback={null}>
      <FillPasswordForm />
    </Suspense>
  );
}
