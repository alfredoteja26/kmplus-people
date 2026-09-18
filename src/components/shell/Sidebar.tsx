"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NavIcon } from "./NavIcon";
import { isNavItemActive, navGroupsForRole, type NavItem } from "./nav";
import type { Role } from "@/lib/types";

const PIN_KEY = "kmplus-people-sidebar-pinned-collapsed";
const DESKTOP_MIN = 768;

function readPinned(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PIN_KEY) === "1";
}

function writePinned(pinned: boolean) {
  window.localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group/link relative flex items-center gap-3 text-sm font-medium no-underline transition-colors",
        collapsed ? "justify-center rounded-[var(--radius-md)] px-0 py-2.5 min-h-11" : "rounded-full px-3 py-2 min-h-11",
        active ? "bg-accent text-on-accent" : "text-muted hover:bg-[color-mix(in_srgb,var(--line)_35%,transparent)] hover:text-ink",
      )}
      aria-current={active ? "page" : undefined}
    >
      <NavIcon id={item.icon} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-md)] border-[1.5px] border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink opacity-0 shadow-[var(--shadow)] transition-opacity group-hover/link:opacity-100"
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role);
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const pinnedCollapsed = readPinned();
    setPinned(pinnedCollapsed);
    setCollapsed(pinnedCollapsed || window.innerWidth < DESKTOP_MIN);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || pinned) return;

    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
    const onChange = () => {
      setCollapsed(!mq.matches);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [hydrated, pinned]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (!next) {
        setPinned(false);
        writePinned(false);
      }
      return next;
    });
  }, []);

  const togglePin = useCallback(() => {
    setPinned((prev) => {
      const next = !prev;
      writePinned(next);
      if (next) setCollapsed(true);
      return next;
    });
  }, []);

  return (
    <aside
      className={cn(
        "sidebar-shell flex h-full shrink-0 flex-col overflow-hidden border-r-[1.5px] border-line bg-paper transition-[width] duration-200 ease-out",
        collapsed ? "sidebar-collapsed w-[var(--sidebar-width-collapsed)]" : "sidebar-expanded w-[var(--sidebar-width-expanded)]",
        !hydrated && "sidebar-expanded w-[var(--sidebar-width-expanded)]",
      )}
      data-collapsed={collapsed ? "true" : "false"}
      aria-label="Main navigation"
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-hidden px-2 py-4">
        {groups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className={cn(gi > 0 && "mt-3 border-t-[1.5px] border-line pt-3")}>
            {group.label && !collapsed && (
              <p className="mb-2 px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">{group.label}</p>
            )}
            {group.label && collapsed && (
              <p className="mb-2 flex justify-center" aria-hidden>
                <span className="h-px w-6 bg-line" />
              </p>
            )}
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <NavLink item={item} active={active} collapsed={collapsed} />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t-[1.5px] border-line p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-muted hover:bg-[color-mix(in_srgb,var(--line)_35%,transparent)] hover:text-ink",
            collapsed && "justify-center px-0",
          )}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
            {collapsed ? (
              <path d="M9 6v12M15 6v12M5 6h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
            ) : (
              <path d="M7 6v12M5 6h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
            )}
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
        {collapsed && (
          <button
            type="button"
            onClick={togglePin}
            className={cn(
              "flex items-center justify-center rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium",
              pinned ? "bg-tint text-accent" : "text-muted hover:bg-[color-mix(in_srgb,var(--line)_35%,transparent)] hover:text-ink",
            )}
            aria-pressed={pinned}
            aria-label={pinned ? "Unpin collapsed sidebar" : "Pin sidebar collapsed"}
            title={pinned ? "Pinned collapsed" : "Pin collapsed"}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path d="M12 17v4M8 3h8l1 7.5a4 4 0 0 1-2.5 3.5L12 17l-2.5-3A4 4 0 0 1 7 10.5L8 3Z" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}
