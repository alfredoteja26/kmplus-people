import type { ReactNode } from "react";

/** A paper section of the profile: a header row with an optional count and action, then hairline rows. */
export function ProfilePanel({
  id,
  title,
  count,
  action,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="@container overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 id={id} className="m-0 flex items-baseline gap-2 text-base font-medium">
          {title}
          {count !== undefined ? <span className="text-sm font-normal text-muted tabular-nums">{count}</span> : null}
        </h2>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** A labelled group inside a panel, e.g. Education inside CV evidence. */
export function PanelGroup({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <div className="border-t border-line first:border-t-0">
      <h3 className="m-0 flex items-baseline gap-2 px-5 pt-3.5 pb-1 text-label font-medium text-muted">
        {title}
        {count !== undefined ? <span className="font-normal tabular-nums">{count}</span> : null}
      </h3>
      {children}
    </div>
  );
}

export function PanelRows({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-none p-0 pb-1.5">{children}</ul>;
}

export function PanelRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={`border-t border-line px-5 py-3 transition-colors duration-150 first:border-t-0 hover:bg-[color-mix(in_srgb,var(--tint)_60%,var(--paper))] ${className ?? ""}`}
    >
      {children}
    </li>
  );
}

/** One quiet line where a group has nothing yet. */
export function PanelNote({ children }: { children: ReactNode }) {
  return <p className="m-0 px-5 pt-1 pb-3.5 text-sm text-muted">{children}</p>;
}

/** Label over value, for the facts inside a panel. Labels are sentence case, never caps. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="m-0 min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}
