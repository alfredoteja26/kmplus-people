"use client";

import { canAccessKpiAdmin } from "@/lib/domain-query";
import { roleLabel, useStore } from "@/lib/store";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Sidebar } from "./Sidebar";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const role = state.currentRole;
  const person = state.people.find((row) => row.id === state.currentPersonId);
  const displayName = person?.preferredName || person?.legalName || "Signed in";

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      <header className="shrink-0 border-b-[1.5px] border-line bg-paper">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Image src="/brand/kmplus-logo-dark.svg" alt="KMPlus" width={48} height={41} priority unoptimized />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-faint">KMPlus · tenant kmplus</p>
              <p className="text-[16px] font-medium leading-tight">People</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="m-0 text-sm font-medium">{displayName}</p>
              <p className="m-0 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">{roleLabel(role)}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar role={role} kpiAdmin={canAccessKpiAdmin(state)} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-bg px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
