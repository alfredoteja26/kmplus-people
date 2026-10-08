"use client";

import { AuthFrame, BackToSignIn, CheckMark } from "@/components/auth/AuthFrame";
import { Button } from "@/components/coss/button";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
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
        setError(payload.error || "We couldn’t save your password. Try again in a moment.");
        return;
      }
      setSaved(true);
    } catch {
      setError("We couldn’t reach KMPlus People. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (!oobCode) {
    return (
      <AuthFrame title="This link has expired" description="Password links work for 1 hour, and each one works once. Request a new one.">
        <div className="grid gap-3">
          <Button size="lg" className="w-full" render={<Link href="/login/forgot" />}>
            Send a new link
          </Button>
          <BackToSignIn />
        </div>
      </AuthFrame>
    );
  }

  if (saved) {
    return (
      <AuthFrame title="Password set" description="You can now sign in with your work email and your new password.">
        <CheckMark />
        <Button size="lg" className="w-full" render={<Link href="/login" />}>
          Sign in
        </Button>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Choose a password" description="Use at least 8 characters. You’ll sign in with your work email and this password.">
      <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="New password" hint="At least 8 characters.">
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
                  Send a new link
                </Link>
              </>
            ) : null}
          </Callout>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Set password"}
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
