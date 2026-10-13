"use client";

import { Button } from "@/components/coss/button";
import { Sheet, SheetPopup, SheetTitle, SheetTrigger } from "@/components/coss/sheet";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/coss/tooltip";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NavIcon } from "./NavIcon";
import { isNavItemActive, navGroupsForRole, type NavGroup, type NavItem } from "./nav";
import type { Role } from "@/lib/types";

const PIN_KEY = "kmplus-people-sidebar-pinned-collapsed";

function readPinned(): boolean {
  try {
    return window.localStorage.getItem(PIN_KEY) === "1";
  } catch {
    return false;
  }
}

function writePinned(pinned: boolean) {
  try {
    window.localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}

const linkBase = "relative flex min-h-11 items-center gap-3 text-sm font-medium no-underline transition-colors";
const linkIdle = "text-muted hover:bg-tint hover:text-ink";
const linkActive = "bg-accent text-on-accent";

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(linkBase, "rounded-full px-3 py-2", active ? linkActive : linkIdle)}
      aria-current={active ? "page" : undefined}
    >
      <NavIcon id={item.icon} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={150}
        render={
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(linkBase, "justify-center rounded-[var(--radius-md)] px-0 py-2.5", active ? linkActive : linkIdle)}
          />
        }
      >
        <NavIcon id={item.icon} className="shrink-0" />
        <span className="sr-only">{item.label}</span>
      </TooltipTrigger>
      <TooltipPopup side="right" sideOffset={10} className="text-sm">
        {item.label}
      </TooltipPopup>
    </Tooltip>
  );
}

function NavGroups({
  groups,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {groups.map((group, gi) => (
        <div key={group.label ?? `group-${gi}`} className={cn(gi > 0 && "mt-3 border-t-[1.5px] border-line pt-3")}>
          {group.label && !collapsed ? <p className="mb-1.5 px-3 text-xs font-medium text-faint">{group.label}</p> : null}
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-label={group.label}>
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <RailLink item={item} active={active} />
                  ) : (
                    <NavLink item={item} active={active} onNavigate={onNavigate} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

function PanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 6h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
      <path d={collapsed ? "M9 6v12M12.5 10l2 2-2 2" : "M9 6v12M15.5 10l-2 2 2 2"} />
    </svg>
  );
}

/** Desktop and tablet navigation (md and up). Phones use MobileNav in the header instead. */
export function Sidebar({ role, kpiAdmin }: { role: Role; kpiAdmin: boolean }) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role, kpiAdmin);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readPinned());
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      writePinned(!prev);
      return !prev;
    });
  }, []);

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r-[1.5px] border-line bg-paper md:flex",
        collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width-expanded)]",
      )}
      data-collapsed={collapsed ? "true" : "false"}
      aria-label="Main navigation"
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
        <NavGroups groups={groups} pathname={pathname} collapsed={collapsed} />
      </nav>
      <div className="border-t-[1.5px] border-line p-2">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium text-muted hover:bg-tint hover:text-ink",
            collapsed && "justify-center px-0",
          )}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelIcon collapsed={collapsed} />
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </aside>
  );
}

/** Phone navigation: a menu button that opens the full, labelled navigation in a drawer. */
export function MobileNav({ role, kpiAdmin }: { role: Role; kpiAdmin: boolean }) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role, kpiAdmin);
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu" />}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
          <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
        </svg>
      </SheetTrigger>
      <SheetPopup side="left" className="max-w-[300px]">
        <SheetTitle className="px-5 pt-5 pb-2 text-base font-medium">Menu</SheetTitle>
        <nav aria-label="Main navigation" className="flex flex-col gap-1 overflow-y-auto px-3 pb-6">
          <NavGroups groups={groups} pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetPopup>
    </Sheet>
  );
}
