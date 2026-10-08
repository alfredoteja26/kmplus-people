import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandWave } from "./BrandWave";

/**
 * Sign-in pages are not a work surface (DESIGN.md): a deep-sage brand panel beside a light form panel.
 * On phones the brand panel shrinks to a band above the form.
 */
export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-paper text-ink lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="auth-brand relative isolate flex overflow-hidden text-white max-lg:min-h-36 lg:min-h-dvh">
        <BrandWave className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
        <div className="flex w-full flex-col justify-between gap-8 px-6 py-6 sm:px-10 lg:px-14 lg:py-12">
          <div className="flex items-center gap-4">
            <Image src="/brand/kmplus-logo.svg" alt="KMPlus" width={64} height={55} priority unoptimized className="h-12 w-auto lg:h-14" />
            <span className="text-lg font-medium leading-tight lg:hidden">People</span>
          </div>
          <div className="max-lg:hidden">
            <p className="m-0 text-sm font-medium text-white/80">KMPlus People</p>
            <p className="mt-3 mb-0 text-[42px] font-medium leading-[1.08] tracking-[-0.02em] text-balance">
              From CV to KPI.
            </p>
            <p className="mt-4 mb-0 max-w-[30ch] text-base text-white/80">
              Who each person is, the position they hold, and what they’re measured on this year — in one place.
            </p>
          </div>
          <p className="m-0 text-xs text-white/70 max-lg:hidden">KMPlus Optima Internasional</p>
        </div>
      </aside>
      <main className="flex items-start justify-center px-5 py-10 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-[400px]">
          <h1 className="m-0 text-[30px] font-medium leading-[1.2] tracking-[-0.02em] text-balance">{title}</h1>
          {description ? <div className="mt-2 mb-0 text-base text-muted">{description}</div> : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function BackToSignIn() {
  return (
    <Link
      href="/login"
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm text-muted no-underline hover:text-ink"
    >
      <ChevronLeft />
      Back to sign in
    </Link>
  );
}

export function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckMark() {
  return (
    <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-tint text-accent">
      <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M4 9.2 7.2 12.5 14 5.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
