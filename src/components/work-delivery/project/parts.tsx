"use client";

import { Avatar, AvatarFallback } from "@/components/coss/avatar";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/coss/empty";
import { initialsOf, personName } from "@/lib/project-view";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export function PersonAvatar({
  person,
  size = "md",
  className,
  style,
}: {
  person: Person | undefined;
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Avatar className={cn(size === "sm" ? "size-7 text-xs" : "size-8 text-xs", className)} style={style} title={personName(person)}>
      <AvatarFallback className="bg-[color-mix(in_srgb,var(--accent)_14%,var(--paper))] font-medium text-accent-hover shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_30%,transparent)]">{initialsOf(person)}</AvatarFallback>
    </Avatar>
  );
}

/** Up to `max` overlapping avatars, then "+N". The names travel in the label, not only in tooltips. */
export function AvatarStack({ people, max = 4 }: { people: (Person | undefined)[]; max?: number }) {
  if (people.length === 0) return <span className="text-sm text-faint">No one yet</span>;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="flex items-center" aria-label={people.map(personName).join(", ")}>
      {shown.map((person, index) => (
        // Earlier avatars sit on top so every overlap hides the edge of a circle, never someone's initials.
        <PersonAvatar
          key={person?.id ?? index}
          person={person}
          size="sm"
          className={cn("ring-2 ring-paper", index > 0 && "-ml-1")}
          style={{ zIndex: shown.length - index }}
        />
      ))}
      {rest > 0 ? <span className="ml-1.5 text-xs text-muted tabular-nums">+{rest}</span> : null}
    </span>
  );
}

/** Accepted deliverables over all deliverables. No deliverables reads as no percent, never as 0%. */
export function ProgressMeter({ accepted, total, className }: { accepted: number; total: number; className?: string }) {
  if (total === 0) return <span className={cn("text-sm text-faint", className)}>No deliverables</span>;
  const percent = Math.round((accepted / total) * 100);
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        role="meter"
        aria-label="Deliverables accepted"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={accepted}
        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_var(--line)]"
      >
        <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </span>
      <span className="text-sm tabular-nums whitespace-nowrap">
        {accepted}/{total}
        <span className="text-muted"> accepted</span>
      </span>
    </span>
  );
}

export function CodeChip({ code, className }: { code: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-[6px] bg-tint px-2 font-mono text-xs font-medium text-accent-hover", className)}>
      {code}
    </span>
  );
}

/**
 * The devl.dev "First Project" empty stack: one icon, one title, one sentence, one action, one reassurance.
 * The action is optional so everyone reads the same sentence and only people who may act see the button.
 */
export function EmptyBlock({
  icon,
  title,
  description,
  action,
  note,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  note?: string;
  className?: string;
}) {
  return (
    <Empty className={cn("py-10", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action || note ? (
        <EmptyContent>
          {action}
          {note ? <p className="m-0 text-xs text-muted">{note}</p> : null}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
