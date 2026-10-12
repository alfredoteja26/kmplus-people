---
version: 1
slug: "src-app-leave-file-page-tsx"
primary_target: "src/app/leave/file/page.tsx"
related_targets: ["src/app/leave/decide/page.tsx","src/components/leave/LeaveQueue.tsx"]
---

# Leave

Mode: Operate. Visitors: every Person filing cuti, sick, or remote for themselves (rarely, a few times a year), and Admin deciding requests and filing for others (weekly). Constraints: filing and deciding are separate acts; cuti needs a leave type and a covering Person with a login; sick needs a doctor's letter before filing; remote needs neither; full days or one date with hours; a note is always required; no day balance; pending and declined leave never show on the timesheet; only Admin sees other people's leave.

Confirmed with user (12 Oct 2026): Admin page gets a team who's-out month grid with approved (solid) and pending (dashed) leave, holidays in their own strip, and a mark when 2+ people are out; each request row also names who else is out. My leave page gets a month calendar with own leave and holidays, then requests grouped Waiting / Coming up / Past; the request sheet shows the day count and warns about holidays and overlaps. A pending request can be withdrawn by its filer or Admin.

## Direction contract

THESIS: Leave is read on a calendar, not in a ledger. A person sees their days against the month before asking; an Admin sees who else is out before deciding. Refuses a flat list with a form behind it.

OWN-WORLD: KMPlus sage on light canvas. Paper surfaces, 16px radius, soft shadow. Leave kinds keep one quiet hue each: cuti in sage, sick in warning amber, remote in neutral; approved is a filled wash, pending a dashed outline, declined never drawn on a calendar. Public holidays as a tint band with their origin. Status badges from the 6px badge system.

STORY: A Person opens Leave, sees October with their approved cuti and the holidays, picks Request leave, chooses dates and reads "3 working days, 1 public holiday", picks a cover, sends. Admin opens Leave requests, sees the month grid, reads "Rayhan is also out on 22 Oct" on the row, approves as paid.

FIRST VIEWPORT: My leave: title, one line of counts (waiting, coming up), Request leave primary; month calendar with prev / today / next; grouped list below. Leave requests: title, Request for someone; the queue (To decide first, then Declined to reconsider) beside or above a team month grid with the holiday strip.

FORM: devl.dev blocks from .scratch/work-delivery/research/devl-blocks.md: Calendar Month (My leave), Calendar Holidays (team grid: holiday strip separate from each person's row, overlap mark), Timeline Notifications (queue grouped by time with actor + action + object). Concept-seed not run: the user pinned the blocks. Seed key: none (user-pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
