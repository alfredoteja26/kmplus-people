---
version: 1
slug: "src-app-kpi-page-tsx"
primary_target: "src/app/kpi/page.tsx"
related_targets: ["src/app/kpi/set/[id]/page.tsx"]
---

# My KPI (/kpi, /kpi/set/[id])

Mode: Operate. Visitor: the Person who owns this year's KPI Portfolio on an Assignment, drafting weighted items, submitting for approval, and checking in. Product truth from the earlier brief stands: weights sum to 100, every non-root item names one parent, Direct only when unit and cadence match, check-ins land in their window, score appears after the year closes.

Confirmed with user (12 Oct 2026): replace the dial gauges with a facts strip; KPI items as rows; add, edit and check-in in sheets.

## Direction contract

THESIS: My KPI is a short weighted list with its facts on top, so a Person sees what is missing before they press Submit. Refuses dial gauges and a hero score.

OWN-WORLD: KMPlus sage on light canvas: one facts strip like the project page, register rows with a weight bar, target, latest actual, health badge and cascade parent, sheets for every edit, 6px status badges.

STORY: Alfredo opens My KPI, reads "Draft · weights 80% of 100%", adds one KPI in the sheet, sees weights reach 100%, and submits.

FIRST VIEWPORT: Title and status on one line, Position switcher; facts strip (status, weights of 100 with meter, score or "Shown once approved", next check-in or window); then the item rows panel with Add KPI and Submit for approval.

FORM: devl.dev Dashboard Engineering (density only), user-pinned. Seed key: none (user-pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
