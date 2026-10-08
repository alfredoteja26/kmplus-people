"use client";

import { Button } from "@/components/coss/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/coss/popover";
import { kpiRemindersForPerson } from "@/lib/work-delivery-query";
import { useStore } from "@/lib/store";

const KIND_LABELS: Record<string, string> = {
  planning: "KPI planning",
  "check-in": "KPI Check-In",
  meeting: "Meeting",
};

function BellIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ReminderPanel() {
  const { state, respondToInvite } = useStore();
  const reminders = kpiRemindersForPerson(state, state.currentPersonId);
  const count = reminders.length;

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        <BellIcon />
        <span className="max-sm:sr-only">Reminders</span>
        {count > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-on-accent tabular-nums">
            <span className="sr-only">, </span>
            {count}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverPopup align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))]">
        <PopoverTitle className="mb-3 text-base font-medium">Reminders</PopoverTitle>
        {count === 0 ? (
          <p className="m-0 text-sm text-muted">You’re all caught up.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {reminders.map((row, index) => (
              <li key={`${row.kind}-${row.dueDate}-${index}`} className="rounded-lg bg-tint px-3 py-2.5 text-sm">
                <p className="m-0 text-xs font-medium text-muted">{KIND_LABELS[row.kind] ?? "Reminder"}</p>
                <p className="m-0 mt-0.5 text-ink">{row.label}</p>
                {row.kind === "meeting" && row.inviteId ? (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" type="button" onClick={() => respondToInvite(row.inviteId!, "accepted")}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" type="button" onClick={() => respondToInvite(row.inviteId!, "declined")}>
                      Decline
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PopoverPopup>
    </Popover>
  );
}
