import type { ReactNode } from "react";
import type { NavIconId } from "./nav";

const paths: Record<NavIconId, ReactNode> = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z" />
      <path d="M9.5 20.5V14a2.5 2.5 0 0 1 5 0v6.5" />
    </>
  ),
  people: (
    <>
      <circle cx="12" cy="8.5" r="3.25" />
      <path d="M5.5 19.5c0-3.5 2.9-5.75 6.5-5.75s6.5 2.25 6.5 5.75" />
    </>
  ),
  org: (
    <>
      <rect x="10" y="4" width="4" height="3.5" rx="1" />
      <rect x="4" y="16.5" width="4" height="3.5" rx="1" />
      <rect x="16" y="16.5" width="4" height="3.5" rx="1" />
      <path d="M12 7.5v4M12 11.5 6 14.5M12 11.5l6 3" />
    </>
  ),
  cv: (
    <>
      <path d="M7 5.5h10a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V7a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M8.5 10h7M8.5 13h5M8.5 16h4" />
    </>
  ),
  kpi: (
    <>
      <path d="M5 18.5V8.5l7-4 7 4v10" />
      <path d="M9.5 18.5v-5h5v5" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="9" r="2.5" />
      <circle cx="16" cy="10" r="2" />
      <path d="M4.5 18c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M13.5 18c0-1.8 1.3-3 3.5-3" />
    </>
  ),
  cycle: (
    <>
      <rect x="6" y="3.5" width="12" height="16" rx="2" />
      <path d="M9 3.5v-.8A1.2 1.2 0 0 1 10.2 1.5h3.6A1.2 1.2 0 0 1 15 2.7v.8" />
      <path d="M9 9h6M9 12.5h6M9 16h3.5" />
    </>
  ),
  tree: (
    <>
      <path d="M12 4v5M12 9H6.5v4M12 9h5.5v4" />
      <path d="M4.5 20v-4.5M8.5 20v-6M15.5 20v-3M19.5 20v-7" />
    </>
  ),
  projects: (
    <>
      <rect x="4.5" y="6" width="15" height="13" rx="2" />
      <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
      <path d="M4.5 11h15" />
    </>
  ),
  timesheet: (
    <>
      <circle cx="12" cy="12.5" r="7.5" />
      <path d="M12 8.5v4l2.75 1.75" />
    </>
  ),
  leave: (
    <>
      <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
      <path d="M8.5 3.5v4M15.5 3.5v4M4.5 10h15" />
      <path d="M9.5 14.5h5" />
    </>
  ),
  "leave-decide": (
    <>
      <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
      <path d="M8.5 3.5v4M15.5 3.5v4M4.5 10h15" />
      <path d="m9.25 14.75 1.9 1.9 3.6-3.9" />
    </>
  ),
  "project-admin": (
    <>
      <rect x="4.5" y="6" width="15" height="13" rx="2" />
      <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
      <path d="M9 14.5h6M12 11.5v6" />
    </>
  ),
};

export function NavIcon({ id, className }: { id: NavIconId; className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[id]}
    </svg>
  );
}
