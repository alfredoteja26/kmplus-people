---
version: 1
slug: "src-app-timesheet-page-tsx"
primary_target: "src/app/timesheet/page.tsx"
related_targets: ["src/components/work-delivery/TimesheetWeekView.tsx"]
---

# Timesheet

Mode: Operate. Visitor: any signed-in Person recording their own TimeBlocks, usually catching up at the end of a day or week. Job: put hours where they happened and see the week against 40h. Constraints: Asia/Jakarta clock, 1h minimum, no overlap, approved cuti/sick block time, PublicHolidays visible, Mon–Fri default with weekend hours still counted, Meeting alone takes invites.

Confirmed with user (12 Oct 2026): logging = drag on the grid plus a Log time button, both opening one side sheet. Views = Week on desktop, Day on phones. Month later (devl.dev Month block).

## Direction contract

THESIS: The week is the timesheet. Time sits on an hour grid at the hour it happened, and the week total against 40h never leaves view. Refuses stacked per-day cards with a form parked below them.

OWN-WORLD: KMPlus sage on light canvas. One paper grid surface, 16px radius, hairline hour rules, half-hour rules fainter. Blocks are flat washes: Project time in sage, non-project time in neutral wash, pending invites as a dashed outline on paper. Approved cuti/sick as a hatched band; holidays as a labelled band in the day header. Now line in accent-2 with a dot. Today's date in a filled sage circle.

STORY: Open Timesheet, read this week's hours and gaps at a glance, drag across Tuesday 09:00–12:00, the sheet opens prefilled, pick type, project, work item, save; the block lands and the total moves.

FIRST VIEWPORT: Title row: Timesheet + week range left; pager (prev / Today / next), Mon–Fri | Full week, and primary Log time right. Under it a one-line total meter (h of 40h, weekend note). Then the grid: 56px hour rail + day columns, 07:00–19:00 visible, extended to fit any block. At xl a 280px This week rail: by project, by type.

FORM: devl.dev Calendar Week block (user-pinned in .scratch/work-delivery/research/devl-blocks.md); concept-seed not run because the user pinned the structure. Seed key: none (user-pinned). Signature interaction: drag-to-draft with a live ghost block and 15-minute snap that never drafts under 1h.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
