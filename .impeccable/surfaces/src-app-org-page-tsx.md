---
version: 1
slug: "src-app-org-page-tsx"
primary_target: "src/app/org/page.tsx"
related_targets: []
---

# Organization (/org)

Mode: Operate. Visitors: HR staffing seats and maintaining Positions; everyone else reading who reports to whom. Product truth from the 16 Sep brief stands: the chart entity is Position, Assignment fills a seat, reporting lines come from reports-to, multiple roots are valid.

Confirmed with user (12 Oct 2026): devl.dev Org chart tree with collapse ("Show N reports"), fit to screen, and search that highlights the path; plus an Outline view (indented list, default on phones); Assign, Edit and Create Position in sheets.

## Direction contract

THESIS: The org page is a seat map you can fold: see the shape at a glance, find any seat in one search, and staff it in place. Refuses a wide tree that overflows with no way to fold or find.

OWN-WORLD: KMPlus sage on light canvas: 12px-radius seat cards on paper, connectors in --line-strong, the root card with a stronger edge, Empty position as a warning badge, initials avatars, sheets for every edit.

STORY: HR searches "Finance", sees the path from CEO light up, opens the empty Head of Finance seat, and assigns a Person from the sheet. On a phone, a Person reads the outline and expands Operations.

FIRST VIEWPORT: Title with "N positions · N filled · N empty", search, Tree | Outline toggle, Create Position; then the tree fitted to the width with collapse controls.

FORM: devl.dev Org chart, user-pinned. Seed key: none (user-pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
