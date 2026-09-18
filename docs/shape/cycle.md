# KPI Admin (`/kpi/cycle`) design brief

Confirmed 16 Sep 2026. Sidebar label is **KPI Admin**, not Cycle. Domain object remains KpiCycle.

## 1. Job and audience

- **Who:** HR and tenant admin (demo role switcher). Founders wearing both manager and HR hats must reach this surface when acting as HR. Employees and managers are blocked here (nav already hides KPI Admin from non-HR; page shows a permission callout if they land directly).
- **Context:** Small tenant (`kmplus`, ~20–30 people), office-daylight operate work, English UI, annual performance rhythm with CheckIns inside the year.
- **Need:** Open or close the annual **KpiCycle**, set the cycle-wide default **CheckInCadence** (monthly or quarterly), ensure every active **Assignment** can hold a **KpiSet**, and read a simple on-track picture before close.
- **Visitor mode:** Operate. No Register, no marketing hero, no exploration gallery.

## 2. Outcome and proof

- **Primary tasks:** (1) Open a closed cycle so planning and CheckIns can run. (2) While open, set default CheckIn cadence and optionally **Draft missing KpiSets** for active Assignments without one. (3) Close the cycle; system stores **KpiScore** from rolled Direct actuals. No bonus math.
- **Success (Phase 1):** After open, HR sees every active Assignment with a KpiSet in **agreed** or **active**, plus a simple on-track picture across those sets. Cadence on the cycle does not replace the annual KpiCycle (stories 17–20).
- **Proof in product:** Per-cycle control strip (status, cadence, CheckIn window labels, open/close/draft actions) and a roster table tying Person, Position, KpiSet status, and health or stored score when closed.
- **Product truth:** KpiSet is per Assignment per KpiCycle; item-level CheckInCadence override lives on **My KPI**, not this screen. CheckIn windows are part of the annual cycle; closing is the scoring boundary.

## 3. Selected direction

- **Visual authority:** [DESIGN.md](../DESIGN.md) and [design-system/kmplus.html](../design-system/kmplus.html). Restrained sage, light canvas `#FAFAFA`, paper cards, accent `#1E857C`, Inter, KM/PLUS mark in app chrome only (unchanged).
- **Structural thesis:** **KPI Admin control card + assignment roster table**, not a KPI dashboard. One paper **Card** per KpiCycle stacks above a domain **Table** of active Assignments for that cycle. Page title is **KPI Admin**. Operational header states the rules in plain language (open enables KpiSet, close stores score, no bonus math).
- **Sequence:** (1) Page intent. (2) Inline on-track summary as supporting text or badge-scale count, never a giant hero metric or four-tile strip. (3) For each cycle: name, status badge, default cadence control when open, readable CheckIn window state (e.g. quarter labels, open vs closed), primary **Open** or **Close and score**, secondary **Draft missing KpiSets (n)** when open and n > 0. (4) Table rows: Person, Position, KpiSet status or “Missing”, health badge while open or numeric KpiScore when closed.
- **Focal moment:** The open cycle’s action cluster (cadence + close + draft missing) and the row that still shows Missing or off-track health when Phase 1 success is not yet met.
- **Implementation consequence:** Evolve `src/app/kpi/cycle/page.tsx` using existing Card, PageHeader, Table, StatusBadge, HealthBadge, Field/Select, Button, and store actions (`openCycle`, `closeCycle`, `setCycleCadence`, `createMissingKpiSets`, `kpiOnTrackCount`, `setHealth`). No new routes.

## 4. Scope and boundaries

- **Fidelity:** Production-ready screen; real empty, populated, open, and closed states.
- **Breadth:** This module only (`/kpi/cycle`). No sidebar, top bar, or role-switcher redesign.
- **Target:** `src/app/kpi/cycle/page.tsx` (brief via Impeccable surface-brief).
- **Untouched:** App chrome, Performance nav grouping (My KPI, Team, KPI Admin, KPI tree). Employee and manager flows stay on My KPI for draft, agree, CheckIn, and per-item cadence override.
- **Anti-goals:** Bonus formula, calibration, Portaverse TW1/TW2 portfolios, salary/payslip, Project/Staffing, dark navy work chrome, gradient text, glass, side-stripe decoration, hero-metric “on track count” template, three-level KPI type tree, orphan-KPI engine.

## 5. States and ranges

- **Non-HR / non–tenant-admin:** Single warning **Callout**; no cycle controls or roster (matches current guard).
- **Cycles list:** Typically one annual cycle in seed data; support multiple historical cards (closed with scores visible on rows) without inventing a timeline UI.
- **No cycles:** Rare; calm empty copy pointing HR to tenant configuration if applicable, without blocking founders who are HR.
- **Open vs closed:** Open shows cadence **Select** (monthly | quarterly), CheckIn window summary, Close and score, Draft missing KpiSets. Closed shows **Open** only; cadence read-only; table shows stored score where present.
- **Missing KpiSets:** 0 (button hidden or disabled with zero count) vs several active Assignments without a set for this cycle (prominent secondary action with count).
- **Roster size:** ~20–30 active Assignments; single table per cycle without pagination at seed scale.
- **CheckIn windows:** Quarterly labels with open/closed indication in cycle metadata line; does not replace cadence picker semantics.

## 6. Interaction and layout

- **Hierarchy:** PageHeader → lightweight on-track line → cycle Card(s) → table inside each card.
- **Topology:** Single main column on light canvas; card header uses flex wrap for title block, cadence field, and action group (status + buttons) without crowding on desktop; stacks cleanly on narrow widths.
- **Affordances:** Primary sage for Open; secondary for Close and score and Draft missing KpiSets; cadence changes immediate via select when cycle is open.
- **Table:** Person legal name, Position title, KpiSet status badge or Missing, HealthBadge from Direct roll-up while open or em dash / score when absent or closed.
- **Feedback:** StatusBadge on cycle and KpiSet; missing sets and off-track health readable at a glance. Close is deliberate (secondary styling) to avoid mis-click.
- **Responsiveness:** Wrap controls; table horizontal scroll only if needed at minimum supported width.

## 7. Constraints and open decisions

- **Platform:** Next.js client route; `@/lib/store` and `@/lib/domain` remain source of truth for cycles, assignments, kpiSets, on-track count, and health.
- **Accessibility:** One h1 via PageHeader; table headers; keyboard reachable buttons and select; permission callout announced as warning content.
- **Localization:** English Phase 1.
- **Reuse:** Existing UI primitives and badge semantics from DESIGN.md; no one-off palette.
- **Open for builder:** Exact CheckIn window string format (compact inline vs subline); whether on-track count sits in header description vs a single muted line under header (always sub-hero scale); confirm copy for close action (“Close and score” vs shorter label) while keeping scoring consequence explicit.
