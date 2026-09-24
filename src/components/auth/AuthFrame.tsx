import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10 text-ink">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Image src="/brand/kmplus-logo-dark.svg" alt="KMPlus" width={56} height={48} priority unoptimized />
        </div>
        <Card>
          <h1 className="mt-0 mb-2 text-[22px] font-medium leading-tight">{title}</h1>
          {description ? <p className="mt-0 mb-5 text-sm leading-normal text-muted">{description}</p> : null}
          {children}
        </Card>
      </div>
    </div>
  );
}

export function BackToSignIn() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-1.5 text-sm text-muted no-underline hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
    <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-tint text-accent">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M4 9.2 7.2 12.5 14 5.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
