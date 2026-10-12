---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/home/Home.tsx"]
---

# Home (`/`)

Mode: Operate. Visitor: every signed-in Person, first thing in the day and between tasks. Job: know what needs them, what their day holds, and how their week stands, then jump. Authority: ADR-0009 (role-aware Needs you, then the Person's own week) plus the 12 Oct 2026 update in ticket 10 (today's agenda, week by day, next leave, role-aware shortcuts). Company reports, roster, CV queue, and empty seats stay off Home. Supersedes the 16 Sep HR-triage brief.

Confirmed with user (12 Oct 2026): devl.dev two-column Home; all four additions.

## Direction contract

THESIS: Home is the Person's desk for today: what needs them on the left, what their day holds on the right, and the week's shape underneath. Refuses a stack of equal panels and refuses a company dashboard.

OWN-WORLD: KMPlus sage on light canvas, the same grammar as Timesheet, Projects, and Leave: paper panels at 16px radius with the soft shadow, hairline rows, sage for own time and progress, dashed outline for pending, amber only for something late or empty, status badges from the 6px system, date rails on tint.

STORY: Alfredo opens Home, reads "2 things need you", sees today's 09:00–12:00 block and a pending invite at 14:00, accepts it inline, notices Wednesday has 0h in the week bars, clicks it, lands on the Timesheet.

FIRST VIEWPORT: Greeting, date and Position, one due line; a shortcut row; then a 1.6 : 1 grid: Needs you (left) and Today with a now marker plus Coming up meetings (right); This week (hours of 40, bars per day, month hours, next leave) under Needs you. Projects and latest check-ins in a two-up row below.

FORM: devl.dev Dashboard Home block (date, greeting, one due line, shortcut row, tasks beside today's schedule, a few facts) and Card Event (date rail for meetings), from .scratch/work-delivery/research/devl-blocks.md. Concept-seed not run: the user pinned the block. Seed key: none (user-pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
