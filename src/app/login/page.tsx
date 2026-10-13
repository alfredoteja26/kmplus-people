"use client";

import { AuthFrame } from "@/components/auth/AuthFrame";
import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/coss/input-group";
import { Spinner } from "@/components/coss/spinner";
import { Field } from "@/components/product/Field";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

/** Only same-site paths are honoured after sign-in. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) return "/";
  return raw;
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      {open ? null : <path d="M4 20 20 4" />}
    </svg>
  );
}

function SignInForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [needsPasswordEmail, setNeedsPasswordEmail] = useState(false);
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

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
        fail("You haven’t set a password yet. We can email you a link to set one.");
        return;
      }
      if (!response.ok) {
        fail(
          response.status === 401
            ? "That email and password don’t match. Check both and try again."
            : payload.error || "We couldn’t sign you in. Try again in a moment.",
        );
        return;
      }
      window.location.href = next;
    } catch {
      fail("We couldn’t reach KMPlus People. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function trackCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)} noValidate={false}>
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
      <Field label="Password" hint={capsLock ? "Caps Lock is on." : undefined}>
        <InputGroup>
          <InputGroupInput
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyUp={trackCapsLock}
            onKeyDown={trackCapsLock}
            required
          />
          <InputGroupAddon align="inline-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              <EyeIcon open={!showPassword} />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      {error ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md bg-[color-mix(in_srgb,var(--danger)_7%,var(--paper))] px-4 py-3 text-sm text-destructive-foreground outline-none"
        >
          {error}{" "}
          {needsPasswordEmail ? (
            <Link href="/login/forgot?first=1" className="font-medium text-ink underline underline-offset-2">
              Send me a password link
            </Link>
          ) : null}
        </div>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Spinner aria-hidden className="size-4" role={undefined} aria-label={undefined} />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <Link href="/login/forgot?first=1" className="inline-flex min-h-11 items-center font-medium text-accent no-underline hover:underline">
          First time here? Set your password
        </Link>
        <Link href="/login/forgot" className="inline-flex min-h-11 items-center text-muted no-underline hover:text-ink hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthFrame
      title="Sign in to KMPlus People"
      description={
        <>
          Use your <span className="font-medium text-ink">@kmplus.co.id</span> work email.
        </>
      }
    >
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthFrame>
  );
}
