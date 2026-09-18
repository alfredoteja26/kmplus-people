---
version: 1
slug: "src-app-org-page-tsx"
primary_target: "src/app/org/page.tsx"
related_targets: []
---

# Organization (`/org`) design brief

Confirmed 16 Sep 2026. Sidebar label is **Organization**, not Org.

## 1. Job and audience

- **Who:** HR (create/edit Position, assign Person to empty seat); managers and employees read the same chart to see reporting structure and who holds each seat.
- **Context:** Tenant `kmplus`, ~20–30 people, English UI, office-daylight desk work. HR staffs from the chart; others use it to orient, not to edit structure.
- **Need:** A trustworthy **seat map**: Positions, reporting lines, Grade and home OrgUnit, current holder or explicit empty seat. Not a photo org chart of faces.
- **Visitor mode:** Operate. No Register/onboarding story on this route.

## 2. Outcome and proof

- **Primary task (HR):** Maintain the Position catalog and fill empty seats from the chart; open a filled seat to reach that Person. **Primary task (read-only roles):** Find a seat or person and read who reports to whom.
- **Success:** Reporting line is visible from Position **reports-to** (never a manager field on Person). Every seat appears whether filled or empty. Search finds a match by Position title or Person legal name in one pass.
- **Proof in product:** Top-down tree with connectors; nodes show title, Grade, OrgUnit, holder link or empty-seat badge; HR actions (Create Position, Edit position, Assign) only when role allows.
- **Product truth:** Chart entity is **Position**; **Assignment** fills the seat; **OrgUnit** is the home unit on the Position; multiple **RootPosition** trees are valid (title is data, not a stored type).

## 3. Selected direction

- **Visual authority:** [DESIGN.md](../DESIGN.md) and [design-system/kmplus.html](../design-system/kmplus.html). Restrained sage, light canvas `#FAFAFA`, accent `#1E857C`, Inter, official KM/PLUS mark in app chrome (unchanged).
- **Structural thesis:** **Positions-as-seats** org tree per DESIGN.md: top-down layout, connector lines, 12px-radius rectangular nodes (not circular avatars), collapse/expand on branches, search and expand/collapse controls above the chart panel.
- **Scene (content tone):** HR at a desk staffing empty seats from the live chart; managers and employees reading the same structure in daylight office calm. Formal, operational copy (e.g. kicker “Seats, not people-as-org”).
- **Sequence:** PageHeader (intent + HR Create Position) → short domain callout (reports-to on Position) → search + branch controls → chart in bordered paper panel → modals for create/edit Position and assign Person.
- **Focal moment:** The node HR is about to staff (empty seat badge) or the branch a manager expands to see their team.
- **Implementation consequence:** Polish `src/app/org/page.tsx` and `src/components/org/*` toward production fidelity within existing behavior; no new routes or nav items.

## 4. Scope and boundaries

- **Fidelity:** Production-ready screen: focus/hover, search highlight, permissions, empty catalog, multi-root layout, horizontal scroll for wide trees.
- **Breadth:** UC2 Organization only (`/org`). OrgUnit tree maintenance UI may stay catalog-driven elsewhere; this surface is the Position chart and HR seat actions.
- **Target:** `src/app/org/page.tsx` (brief persisted via Impeccable surface-brief).
- **Untouched:** Collapsible sage sidebar, top bar (KM/PLUS, People, tenant `kmplus`, role switcher). Sidebar label for this route is Organization. No Project, payslip, or Phase 2 nav.
- **Out of scope:** Drag-and-drop chart editing and “move Position” on canvas (PRD later). No salary, payslip, Project, Staffing-as-Assignment, Portaverse org clones.
- **Anti-goals:** People-as-org-chart (face circles, avatar stacks); dark navy chrome; gradient text, glass, side-stripe decoration; Pelindo/Portaverse/Akasia marks or palettes.

## 5. States and ranges

- **Catalog size:** Typical ~20–30 Positions; deep enough that default “collapse deep branches” keeps first paint usable; expand all for audit.
- **Roots:** Zero Positions (empty catalog: clear HR CTA to create first seat) vs one vs several RootPositions (sibling roots in one scrollable panel).
- **Fill rate:** Mix of filled nodes (Person name as accent link) and empty seats (warning badge; HR badge is clickable to assign).
- **Search:** No query (full tree, user collapse state) vs active query (filter to matching nodes and ancestors; expand matches; no results message with quoted query).
- **Permissions:** Employee/Manager read-only chart (no Create, Edit, or assign affordances). HR/admin full mutate and assign.

## 6. Interaction and layout

- **Hierarchy:** Header and domain callout → search row (field + Expand all / Collapse deep branches) → primary chart panel (centered roots, vertical connectors, horizontal sibling rails when multiple children).
- **Node content:** Title (primary), Grade code/name, OrgUnit name, then holder or empty seat. Branch toggle when children exist. HR-only “Edit position” on node footer.
- **Affordances:** Filled seat → link to `/people/[id]`. Empty seat (HR) → Assign modal (Person picker, respect already-assigned people). HR header → Create Position modal (title, Grade, OrgUnit, reports-to Position).
- **Search:** Case-insensitive match on Position title and assigned Person name; highlight matching nodes; do not hide unrelated roots when a branch matches elsewhere.
- **Feedback:** Highlight border/tint on search hits; aria-expanded on collapse control; empty search miss as plain muted text.
- **Responsiveness:** Chart panel horizontal scroll on narrow viewports; node max width ~220px; preserve connector geometry rather than squashing into a list template.

## 7. Constraints and open decisions

- **Platform:** Next.js client route; `@/lib/store` and `@/lib/domain` (`rootPositions`, `childPositions`, `assignmentForPosition`) remain source of truth.
- **Accessibility:** Keyboard-reachable search, collapse, links, and HR buttons; group labels on child branches; one h1 via PageHeader.
- **Localization:** English Phase 1.
- **Reuse:** PageHeader, Callout, Field/Input/Select, Modal, Button, Badge; org components `OrgTree`, `OrgTreeNode`, `AssignSeatModal`, `org-tree-utils`.
- **Open decisions for builder:** Whether OrgUnit tree editing gets a dedicated admin surface in Phase 1 or stays seed/catalog-only; exact default collapse depth for seed data; whether non-HR empty seats should expose “request fill” copy vs static badge only (default: static badge).

## Direction contract

- **THESIS:** The org chart is a **seat map**—rectangular Position nodes with reporting connectors, not a people-as-org avatar wall. Truth lives in reports-to on Position and Assignment for the holder.
- **OWN-WORLD:** KMPlus Operate daylight: `#FAFAFA` canvas, sage accent `#1E857C`, 12px node radius, paper nodes in a bordered chart panel, Inter, restrained shadow—aligned with DESIGN.md and kmplus.html.
- **STORY:** HR staffs empty seats from the live tree; managers and employees read the same structure to see who holds which seat and who reports to whom.
- **FIRST VIEWPORT:** PageHeader with kicker “Seats, not people-as-org”, HR **Create Position**, domain callout on reports-to, then search plus **Expand all** / **Collapse deep branches**, then the scrollable multi-root chart panel (or empty-catalog CTA when no Positions exist).
- **FORM:** Modals for Create/Edit Position (title, Grade, OrgUnit, reports-to) and Assign (Person picker with unassigned vs move-on-assign groups); Cancel on create/edit; assign blocked when seat already filled.
- **FINISH:** Filled holder links to `/people/[id]`; empty seat warning badge (HR badge opens Assign, others static); search filters to matches plus ancestors with accent border/tint and inline mark on title/name; depth ≥2 default collapse; keyboard focus on search, branch toggles, links, and HR actions; horizontal scroll preserves connector geometry.
