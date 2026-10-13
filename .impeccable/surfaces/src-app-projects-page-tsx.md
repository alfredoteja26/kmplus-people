---
version: 1
slug: "src-app-projects-page-tsx"
primary_target: "src/app/projects/page.tsx"
related_targets: ["src/app/projects/[id]/page.tsx"]
---

# Projects

Mode: Operate. Visitors: every signed-in Person (find the projects they are on, keep work items and deliverables current) and Admin (open projects, staff people, edit project fields). Constraints: no status or health on Project or WorkItem; Admin alone opens and staffs; Admin or a Person staffed today edits WorkItems and Deliverables; per-person timesheet hours are Admin-only.

Confirmed with user (12 Oct 2026): detail = overview + side team rail, all edits in side sheets; catalogue rows add team avatars, deliverable progress, a "You're on this" mark, a Mine / All filter and search; project total hours visible to everyone, per-person hours to Admin only.

## Direction contract

THESIS: A project page answers "who is on it, what is being made, how far along" in one look, and every change happens in place through a sheet. Refuses stacked tables with forms parked under each one.

OWN-WORLD: KMPlus sage on light canvas, same grammar as Timesheet: paper surfaces at 16px radius with the soft shadow, hairline row dividers, sage washes for "yours" and progress, status badges from the 6px badge system, initials avatars on tint. Project code as a small tinted chip.

STORY: Open Projects, see Mine first with team and progress per row, open one, read the facts line, scan work items and their deliverables, set a deliverable to Accepted from its sheet; Admin adds a person and sees their total load before saving.

FIRST VIEWPORT: Detail: back link, code chip, project name, client · dates · timing phrase, Edit project (Admin). One facts line: people, work items, accepted of all deliverables with a meter, hours logged. Main column work items then deliverables (with a work-item filter); 320px team rail at lg. Catalogue: title + New project (Admin), search and Mine | All, then one register list.

FORM: devl.dev blocks from .scratch/work-delivery/research/devl-blocks.md: Empty state First Project (empty catalogue and empty sections), Dashboard Engineering (density: facts plus one ranked list, used for the team rail), Card Profile (team row density). Concept-seed not run: the user pinned the blocks and the layout. Seed key: none (user-pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
