"use client";

import { cn } from "@/lib/cn";
import { isHrLike } from "@/lib/domain";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { usePathname } from "next/navigation";

function rosterActive(pathname: string) {
  if (pathname === "/people") return true;
  if (pathname.startsWith("/people/") && !pathname.startsWith("/people/cv")) return true;
  return false;
}

export function PeopleSubnav() {
  const pathname = usePathname();
  const { state } = useStore();
  const hr = isHrLike(state.currentRole);
  const canCv = hr || state.currentRole === "employee";
  const onRoster = rosterActive(pathname);
  const onCv = pathname === "/cv";

  return (
    <nav aria-label="People sections" className="mb-6 flex flex-wrap gap-2">
      <Link
        href="/people"
        className={cn(
          "rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium no-underline transition-colors",
          onRoster
            ? "border-accent bg-accent text-on-accent"
            : "border-line bg-paper text-muted hover:text-ink",
        )}
        aria-current={onRoster ? "page" : undefined}
      >
        Roster
      </Link>
      {canCv ? (
        <Link
          href="/cv"
          className={cn(
            "rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium no-underline transition-colors",
            onCv
              ? "border-accent bg-accent text-on-accent"
              : "border-line bg-paper text-muted hover:text-ink",
          )}
          aria-current={onCv ? "page" : undefined}
        >
          CV review
        </Link>
      ) : null}
    </nav>
  );
}
