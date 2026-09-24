import { isHrLike } from "@/lib/domain";
import type { Role } from "@/lib/types";

export type NavIconId = "home" | "people" | "org" | "cv" | "kpi" | "team" | "cycle" | "tree";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconId;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Home", icon: "home" },
      { href: "/people", label: "People", icon: "people" },
      { href: "/org", label: "Organization", icon: "org" },
    ],
  },
  {
    label: "Performance",
    items: [
      { href: "/kpi", label: "My KPI", icon: "kpi" },
      { href: "/kpi/team", label: "Team", icon: "team" },
      { href: "/kpi/cycle", label: "KPI Admin", icon: "cycle" },
      { href: "/kpi/tree", label: "KPI Tree", icon: "tree" },
    ],
  },
];

function canSeeNavItem(href: string, role: Role, kpiAdmin: boolean): boolean {
  if (href === "/kpi/team") return role === "manager" || isHrLike(role);
  if (href === "/kpi/cycle") return kpiAdmin;
  return true;
}

export function navGroupsForRole(role: Role, kpiAdmin: boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeNavItem(item.href, role, kpiAdmin)),
  })).filter((group) => group.items.length > 0);
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/kpi") return pathname === "/kpi";
  return pathname === href || pathname.startsWith(`${href}/`);
}
