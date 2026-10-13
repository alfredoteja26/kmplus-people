"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/project-admin", label: "Overview" },
  { href: "/project-admin/configure", label: "Lists" },
  { href: "/project-admin/holidays", label: "Public holidays" },
];

/** The Project Admin area as one place: the overview and its two settings pages, the People subnav pattern. */
export function ProjectAdminSubnav({ className }: { className?: string } = {}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Project Admin sections" className={cn("flex flex-wrap gap-2", className)}>
      {SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium no-underline transition-colors",
              active ? "border-accent bg-accent text-on-accent" : "border-line bg-paper text-muted hover:text-ink",
            )}
            aria-current={active ? "page" : undefined}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
