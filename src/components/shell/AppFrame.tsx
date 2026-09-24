"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { StoreProvider } from "@/lib/store";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/login/")) return children;
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
