"use client";

import { hasAdminGrant } from "@/lib/domain-query";
import { accessLabel } from "@/lib/labels";
import { useStore } from "@/lib/store";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/coss/button";
import { ReminderPanel } from "./ReminderPanel";
import { MobileNav, Sidebar } from "./Sidebar";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, persisted, syncError, dismissSyncError } = useStore();
  const role = state.currentRole;
  const person = state.people.find((row) => row.id === state.currentPersonId);
  const displayName = person?.preferredName || person?.legalName || "Signed in";
  const adminGrant = hasAdminGrant(state);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-paper px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="shrink-0 border-b-[1.5px] border-line bg-paper">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <MobileNav role={role} kpiAdmin={adminGrant} />
            <Link href="/" className="flex items-center gap-3 rounded-md text-ink no-underline" aria-label="KMPlus People, Home">
              <Image src="/brand/kmplus-logo-official.png" alt="" width={695} height={350} priority unoptimized className="h-7 w-auto sm:h-8" />
              <span className="text-[16px] font-medium leading-tight max-sm:sr-only">People</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ReminderPanel />
            <div className="text-right max-sm:hidden">
              <p className="m-0 text-sm font-medium">{displayName}</p>
              <p className="m-0 text-xs text-faint">{accessLabel(role, adminGrant)}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      {!persisted ? (
        <p role="status" className="m-0 shrink-0 border-b-[1.5px] border-line bg-[color-mix(in_srgb,var(--warning)_12%,var(--paper))] px-4 py-2 text-sm">
          Can’t reach the database. You can keep working, but changes will be lost when you refresh.
        </p>
      ) : null}
      {syncError ? (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-3 border-b-[1.5px] border-line bg-[color-mix(in_srgb,var(--danger)_8%,var(--paper))] px-4 py-2 text-sm text-destructive-foreground"
        >
          <span>That change wasn’t saved: {syncError} The page now shows what is saved.</span>
          <Button size="sm" variant="ghost" type="button" onClick={dismissSyncError}>
            Dismiss
          </Button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar role={role} kpiAdmin={adminGrant} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto bg-bg px-4 py-6 outline-none sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
