---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Home (`/`) design brief

Confirmed 16 Sep 2026. Nav names: Organization, KPI Admin. CV review is a People subpage.

## 1. Job and audience

- **Who:** HR first (tenant admin and HR role via demo switcher); managers and employees may land here but Phase 1 Home optimizes for HR’s daily operate loop.
- **Context:** Small tenant (`kmplus`, ~20–30 people), office-daylight desk work, English UI, evidence-backed people and performance data already in the app.
- **Need:** A single glance that answers “what needs my hands today?” without opening four modules, plus enough roster truth to satisfy Phase 1 success item 1 (every active Person and today’s Position).
- **Visitor mode:** Operate (task UI). No marketing hero, no exploration gallery, no Register/onboarding story on this route.

## 2. Outcome and proof

- **Primary task:** Triage and jump: fill or acknowledge empty Positions, clear the CV review queue under People, and see cycle health for KpiSets (agreed/active vs missing or off-track) before drilling into People, Organization, or Performance.
- **Success:** HR can name every active Person and the Position they hold today from this surface or one click away; sees CVs waiting review; sees the open cycle’s agreed/active KpiSets and a simple on-track picture (same facts the old four counters carried, not presented as a metric strip).
- **Proof in product:** Actionable rows or grouped queues with deep links; empty seats remain explicit and scannable; audit is visible but does not compete with work items.
- **Product truth:** Person holds Position through Assignment (not Staffing); CurriculumVitae is a review queue; KpiSet is per Assignment per open KpiCycle; tenant isolation is assumed.

## 3. Selected direction

- **Visual authority:** Existing [DESIGN.md](../DESIGN.md) and [design-system/kmplus.html](../design-system/kmplus.html). Restrained sage, light canvas, accent `#1E857C`, Inter body, official KM/PLUS mark in app chrome (unchanged).
- **Structural / interaction thesis:** Replace the four equal “big number” cells with a **worklist-first** layout: prioritized **Needs attention** (or equivalent operate framing) built from queue semantics, not KPI-dashboard symmetry. Counts may appear inline as badges or sublabels on rows, never as a four-column hero band.
- **Sequence:** (1) Page intent line (keep operational kicker/title tone from current header). (2) **Work queues** grouped by domain: empty seats to fill, CVs awaiting HR review, cycle/KpiSet gaps or off-track CheckIns when a cycle is open. (3) **Roster glance** compact list or table: active Person, current Position, OrgUnit (supports success criterion 1 without a People-module detour). (4) **Audit** last, smaller visual weight, recent slice only.
- **Focal moment:** The highest-priority actionable row (typically an empty Position or oldest CV in review when queues are non-empty; a calm “caught up” state when all queues are empty).
- **Implementation consequence:** `src/app/page.tsx` drops the sm:grid-cols-4 metric strip; recompose using existing Table/Card patterns and domain helpers (`emptySeats`, `cvsInReviewCount`, `kpiOnTrackCount`, active people/roster data). Deep links: empty seats to Organization (`/org`); CV queue to People > CV review (`/people/cv`, today `/cv`); KPI health to My KPI or KPI Admin.

## 4. Scope and boundaries

- **Fidelity:** Production-ready screen; shipped-quality links, hover/focus, empty and populated states.
- **Breadth:** This module only (`/` Home); no sidebar/top-bar/role-switcher redesign.
- **Target:** `src/app/page.tsx` (brief persisted via Impeccable surface-brief).
- **Untouched:** Collapsible sage sidebar, top bar (KM/PLUS mark, “People”, tenant `kmplus`, role switcher). Sidebar labels: Home, People, Organization, then Performance (My KPI, Team, KPI Admin, KPI tree). No CV top-level item. Nav excludes Project and payslip.
- **Anti-goals:** Four-metric hero template; identical card grids; dark `#0B2131` work-surface chrome; gradient text, glass, side-stripe borders; Portaverse-style KPI trees; salary/payslip/Project/Staffing; client marks (Akasia/Pelindo/InJourney); inventing a new visual world or external product anchors (Linear/Notion/Lattice).

## 5. States and ranges

- **Tenant size:** ~20–30 active People; roster glance should remain readable without pagination tricks at typical seed data scale.
- **Empty seats:** 0 (positive empty copy, no table) vs several (table or queue rows with Position title and OrgUnit, link toward Organization).
- **CV review:** 0 vs a handful in queue (person/source identifier, review state, link to People > CV review).
- **KpiCycle:** No open cycle (cycle section explains closed or none; no fake on-track math) vs open cycle with mix of missing draft, awaiting agreement, active agreed KpiSets, and CheckIn health summary (link to `/kpi`).
- **Audit:** Always secondary; 0–8 recent events typical; empty audit is rare but should not break layout.
- **Permissions:** Brief assumes HR/full view; role-specific hiding may narrow queues later but Phase 1 Home is HR-centric.

## 6. Interaction and layout

- **Hierarchy:** Operate title area → work queues (dominant) → roster glance (supporting truth) → audit (tertiary).
- **Topology:** Single main column on light canvas within existing app shell; avoid symmetric “dashboard cards.” Prefer one primary panel for queues (stacked sections or one table with section headers) over four equal tiles.
- **Affordances:** Each queue item is a row or list entry with clear next action (review CV, assign Person to Position, open KpiSet) via Link or button styled per design system primary/ghost rules.
- **Counts:** Use sparingly next to section titles or row metadata (“3 in review”), not as oversized numerals.
- **Empty seats:** First-class section within queues or immediately under queue header; same data as today’s empty-seats table, possibly enriched with row actions when data supports it.
- **Feedback:** Hover/focus on interactive rows; zero-state copy that states what “good” looks like (all seats filled, queue clear, cycle healthy).
- **Responsiveness:** Queues stack vertically on narrow widths; roster and audit follow existing table/list patterns without introducing a new responsive grid template.

## 7. Constraints and open decisions

- **Platform:** Next.js app route; client store and existing `@/lib/domain` selectors remain source of truth.
- **Accessibility:** Keyboard reachable links, sensible heading order (one h1 via PageHeader, section h2s), table semantics for tabular roster/audit.
- **Localization:** English Phase 1.
- **Reuse:** PageHeader, Table/Td/Th, Link, store hooks; align with DESIGN.md components rather than one-off styling.
- **Open decisions for builder:** Exact queue grouping labels (“Needs attention” vs domain-named sections); whether roster glance is embedded table vs link-out summary row; whether off-track KPI is one aggregate line vs per-Assignment rows when cycle is open (prefer simple aggregate matching `kpiOnTrackCount` semantics unless seed data supports richer rows without scope creep).

## Direction contract

**THESIS:** Home is HR’s operate triage desk on the existing quiet-sage KMPlus world — one paper work surface where work queues dominate and counts never become a four-tile hero.

**OWN-WORLD:** Restrained sage SaaS from DESIGN.md: light canvas, paper panels with 1.5px line borders, Inter, accent `#1E857C` on links and primary affordances only. Keep PageHeader kicker “From CV to KPI”. No navy chrome, glass, gradient text, side-stripe callouts, or dashboard symmetry.

**STORY:** Land → read “Needs attention” → act on the highest-priority row (empty seat, oldest Curriculum Vitae, or KpiSet gap) → confirm roster truth in the embedded table → optionally scan recent audit last.

**FIRST VIEWPORT:** PageHeader plus the Needs attention card with domain subsections (empty seats, CVs in review, KpiCycle/KpiSets). Focal row is the first actionable queue item when any queue is non-empty; a calm caught-up Callout when all are clear.

**FORM:** Single main column inside shell. One primary Card for queues with stacked h3 subsections and inline Badge counts. Roster glance is a second section with embedded Table (Person, Position, OrgUnit). Audit is tertiary: smaller heading, muted copy, compact table, max eight rows.

**FINISH:** Production Operate polish — hover/focus on interactive rows, deep links to `/org`, `/cv`, `/kpi`, `/kpi/cycle`, English CONTEXT.md nouns, empty and populated states for every subsection, no open-cycle fake on-track math when no KpiCycle is open.
