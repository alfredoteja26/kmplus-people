# KPI tree (`/kpi/tree`) design brief

Confirmed 16 Sep 2026. Performance nav: My KPI, Team, KPI Admin, KPI tree. CV is under People.

## 1. Job and audience

- **Who:** Managers (team cascade alignment), HR/admin (tenant-wide audit), employees (narrow view via scope, not the full firm forest).
- **Context:** Open **KpiCycle** only; tenant `kmplus`, ~20–30 people, English UI, office-daylight desk work. Users already know Person, Position, Assignment, KpiSet, and KpiItem from CONTEXT.md.
- **Need:** Read the **cascade forest** for the cycle: which KpiItems roll up to which parents, Direct vs Indirect, who owns each node, and drill into the owning Assignment’s KpiSet without treating the chart as decoration.
- **Visitor mode:** Operate. No Register/onboarding on this route.

## 2. Outcome and proof

- **Primary task:** Scan roots (KpiItems on **RootPositions**) downward, spot misalignment or broken Direct links, then open a node’s **KpiSet** to fix or review detail.
- **Success:** Manager sees team forest with ancestors included; HR sees whole tenant and can spot missing parents or invalid Direct (unit/cadence mismatch); employee stays in “my team” without HR-only tenant scope.
- **Proof in product:** Live graph from `buildKpiForest`; scope control; node cards show name, unit, actual/target, Direct/Indirect/Root, owner Person + Position; edges encode mode; every node links to `/kpi/set/[id]`.
- **Product truth (PRD tension):** This is a **parent-pointer cascade of KpiItems** across Assignments, not a BUMN three-level KPI tree, not Impact/Output layers, not org-chart auto-copy, not Portaverse PMS. Vocabulary borrowed; complexity rejected (see ADR 0001).

## 3. Selected direction

- **Visual authority:** [DESIGN.md](../../DESIGN.md) and design-system/kmplus.html. Restrained sage `#1E857C`, light canvas, Inter, KM/PLUS mark in app chrome (unchanged).
- **Structural thesis:** **Forest map for the open cycle** per DESIGN.md: top-down layout, multiple sibling roots when multiple RootPositions carry root KpiItems, curved sage connectors (solid Direct, dashed Indirect), rectangular node cards on paper inside a bordered scroll panel.
- **Scene:** Manager scanning for Direct breaks and alignment; HR auditing the tenant; employee filtering to my team. Calm operational copy (cycle name in kicker; legend for edge styles).
- **Sequence:** PageHeader (cycle + forest intent) → scope selector + edge legend → forest canvas or empty/warning states.
- **Focal moment:** The node or edge the viewer is about to open or fix (often a dashed Indirect branch, a suspicious Direct child, or a root under a co-head RootPosition).
- **Implementation consequence:** Production polish on `src/app/kpi/tree/page.tsx` and `src/components/kpi/KpiForest.tsx` within existing data model; no new nav, no Portaverse tree chrome.

## 4. Scope and boundaries

- **Fidelity:** Production-ready screen: focus/hover on nodes, horizontal scroll for wide forests, permissions on scope and links.
- **Breadth:** KPI tree only (`/kpi/tree`). Editing cascade happens on KpiSet/KpiItem surfaces, not on the canvas.
- **Target:** `src/app/kpi/tree/page.tsx` (brief persisted via Impeccable surface-brief). Related: `KpiForest.tsx`, `kpi-tree.ts`.
- **Untouched:** Collapsible sage sidebar, top bar. Performance nav: My KPI, Team, KPI Admin, KPI tree. No Project, payslip, salary, bonus math, calibration.
- **Anti-goals:** Portaverse PMS clone; TenantObjective / fake company root; Impact/Output layer toggles; dark navy chrome; gradient text, glass, side-stripes; hero-metric dashboard; org chart substituted for cascade.

## 5. States and ranges

- **No open cycle:** Warning callout; no forest (HR opens the cycle from KPI Admin first).
- **Open cycle, empty scope:** Muted copy when no KpiItems match scope (typical small team vs full tenant).
- **Forest size:** Roughly tens of nodes in seed data; several roots possible; depth follows real parent chains (not capped at three levels).
- **Multiple roots:** Two or more RootPosition root KpiItems laid as separate subtrees with horizontal spacing.
- **Scope:** Default tenant for HR-like roles, my team for manager/employee; tenant option hidden when role cannot use it; my team includes viewer + manager’s reporting Positions per domain rules.
- **Missing parent:** Child may exist in data but parent not in visible set (scope or broken link); edge omitted; HR audit should still notice orphan semantics elsewhere; scoped view pulls ancestors when possible.
- **Empty-seat Position:** No Assignment holder means no KpiItem node and **no valid parent target** for cascade (story 27).
- **Direct breaks:** Child marked Direct but unit or CheckInCadence disagrees with parent; must be discoverable on audit (visual warning on node or edge, or summary callout; prefer at-a-glance on the offending node).

## 6. Interaction and layout

- **Hierarchy:** Header → scope + legend row → primary forest panel (dominant width).
- **Topology:** SVG edges under absolutely positioned node cards; pan via horizontal scroll on narrow viewports; roots at top, children below, sibling ordering stable (sorted ids).
- **Node card:** Title, actual/target + unit, Direct/Indirect/Root label, footer Person · Position; whole card is link to that node’s KpiSet.
- **Affordances:** Scope `<select>`: My team vs Whole tenant (HR only); inline legend “Solid sage = Direct · dashed = Indirect”.
- **Feedback:** Hover/focus accent border on nodes; empty and no-cycle states use Callout or muted text, not a blank shell.
- **Permissions:** Respect `canReadPerson` for nodes and link targets; do not show tenant scope to non-HR roles.

## 7. Constraints and open decisions

- **Platform:** Next.js client route; `@/lib/store`, `buildKpiForest`, `canUseTenantKpiTreeScope`, `displayedActual` remain source of truth.
- **Accessibility:** Keyboard-reachable node links; forest SVG decorative (`aria-hidden`); one h1 via PageHeader; scope control labeled.
- **Localization:** English Phase 1.
- **Reuse:** PageHeader, Callout, Field/Select, existing KpiForest layout constants; DESIGN.md card and border tokens.
- **Open decisions for builder:** Exact Direct-break affordance (node badge vs edge color vs top callout list); whether to show nodes whose parent is outside cycle; default zoom/fit for very wide multi-root forests; optional compact list fallback for mobile (default: scrollable canvas only if it matches org tree pattern).
