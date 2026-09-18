---
version: 1
slug: "src-app-kpi-page-tsx"
primary_target: "src/app/kpi/page.tsx"
related_targets: ["src/app/kpi/set/[id]/page.tsx"]
---

# My KPI — design brief

Confirmed 16 Sep 2026. Performance nav: My KPI, Team, KPI Admin, KPI tree.

## 1. Job and audience

- **Visitor mode:** Operate. Employee on their current Assignment during an open KpiCycle, drafting weighted KpiItems or logging CheckIns against agreed targets. Manager may act on behalf on the same surface. HR may retarget parent or Direct/Indirect after the set is active; employees cannot change cascade once agreed.
- **Primary audience:** Employee (owner of the KpiSet). Secondary: Manager (behalf + agreement happens elsewhere on Team), HR (parent retarget only when active/agreed).
- **Scene:** Office daylight at a desk. One person owns the work surface; the UI stays quiet and operational, not a performance dashboard hero.

## 2. Outcome and proof

- **Primary job:** See cycle context and KpiSet status, maintain a small weighted item list (targets, definitions, cascade, cadence while editable), submit for agreement when valid, then CheckIn actual versus target in the correct window until the cycle closes and KpiScore appears here.
- **Success:** Weights sum to 100%; every non-root item names one parent KpiItem; Direct only when unit and cadence match the parent; CheckIns land in the item’s effective window (monthly or quarterly); rolled Direct actuals display where DirectMix applies; submit fails loudly until tree and weights are complete.
- **Proof in product:** Status badge and optional return comment, weight total line (100% = success tone), per-row health, latest or rolled actual, stored KpiScore callout after close. `/kpi/set/[id]` is read-only proof when opened from KPI tree (person, position, same columns, no edit or CheckIn).

## 3. Selected direction

- **Visual authority:** [DESIGN.md](../../DESIGN.md). Light canvas `#FAFAFA`, paper table and cards, accent `#1E857C`, Inter, KM/PLUS mark in shell only. Restrained sage SaaS; not Portaverse, not navy chrome, no glass or gradient type.
- **Structural thesis:** One paper work column under existing sidebar and top bar. PageHeader with cycle kicker, “My KPI” title, short description, status badge. Main artifact is a dense table of KpiItems (not a three-level Impact/Output tree). Add-item and submit live in a card below the table when draft or returned.
- **Focal moment:** The item row where cascade (parent + Direct/Indirect), optional DirectMix on parents with Direct children, cadence override while drafting, and inline CheckIn (window label + actual + note) converge. RootPosition rows show “no parent” instead of cascade controls.
- **Companion route:** KpiSet by id mirrors the table read-only with person and position in the header and links back to KPI tree and Person profile.

## 4. Scope and boundaries

- **In scope:** `/kpi` operate surface for current person’s KpiSet on current Assignment; `/kpi/set/[id]` scoped read view from tree. Fields: name, definition, target, unit, weight, polarity, parent, cascade mode, DirectMix (when applicable), per-item cadence override in draft/returned, CheckIn when agreed/active.
- **Fidelity:** Production-ready screen layout and states; chrome and nav IA unchanged (Performance group as today; no Project or payslip).
- **Untouched:** Shell sidebar/top bar, Team agreement, KPI Admin open/close, KPI tree visualization, bonus math, calibration, salary, Portaverse-style KPI type trees. Sidebar Performance labels: My KPI, Team, KPI Admin, KPI tree.
- **Anti-goals:** Hero metric template, side-stripes, dark dashboard chrome, automatic org copy for parents, TenantObjective roots, weighted % across mismatched units.

## 5. States and ranges

- **No open KpiCycle:** Warning callout only; no table.
- **Open cycle, no Assignment or no KpiSet:** Warning with cycle name; HR drafts from KPI Admin.
- **KpiSet statuses:** draft and returned (full edit, add/remove, cadence column, submit); agreed and active (CheckIn, cascade frozen for employee; HR parent/mode/DirectMix per policy); scored (read items + visible KpiScore; no CheckIn).
- **Returned:** Prominent return comment callout above table.
- **Typical load:** 3–8 KpiItems, weights totaling 100%. Sample names (utilization, delivery quality, knowledge contribution, workshop facilitation) are examples only.
- **Validation surfaces:** Weight sum ≠ 100% (warning on footer line); missing parent on non-root blocks submit; Direct blocked when unit or cadence differs (command error callout); children-only DirectMix replaces own CheckIn with muted “rolls up from Direct children” instead of a form.

## 6. Interaction and layout

- **Hierarchy:** Header (cycle, title, description, status) → optional return/score/error callouts → item table → weight summary → conditional add card + submit.
- **Table columns:** KpiItem (name, definition, DirectMix when parent has Direct children), Target, Weight, Parent (CascadeFields or read text), Latest actual (own CheckIn date or rolled sum with own suffix), Health badge, Cadence column only in draft/returned, actions (Remove when editing; CheckIn form when agreed/active).
- **Add KpiItem:** Grid form reusing CascadeFields for non-root; RootPosition skips parent. Submit for agreement primary button in card footer.
- **CheckIn:** Inline in row; show effective cadence and window id; actual required; optional note; sage primary CheckIn button. Blocked row shows explanation only.
- **Read set view:** Same column set minus cadence and actions; parent as text; weights footer muted; breadcrumb to tree and person.
- **Responsive:** Table may horizontal scroll on narrow viewports; forms stack to one column; do not collapse cascade into a separate wizard.

## 7. Constraints and open decisions

- **Domain:** KpiSet on Assignment + KpiCycle; optional company objectives elsewhere, not rendered as a type tree here. ADR-0001 and cascade spec stories govern parent pointer, Direct/Indirect, DirectMix, cadence windows.
- **ACL:** Employee sees own set; tree deep-link read view uses existing `canViewKpiSet`. Manager behalf is role/demo switcher, not a separate layout.
- **Components:** Reuse PageHeader, Callout, Table, Card, Field/Input/Select, StatusBadge, HealthBadge; CadenceField, CascadeFields, DirectMixField as the cascade/cadence affordances.
- **Accessibility:** Label CheckIn inputs by item name and window; status and health not color-only.
- **Open (non-blocking for layout):** Whether post-submit draft edits are ever allowed (today: returned only); exact copy for Direct validation errors (keep command message in danger callout).

## Direction contract

**THESIS:** One dense paper table is the entire operate surface — not a three-level Impact/Output tree, not hero metrics, not side-wizard cascade. Refuses Portaverse type trees and dashboard chrome.

**OWN-WORLD:** `#FAFAFA` canvas, white bordered table (`border-line`, paper fill), sage primary `#1E857C` on CheckIn/submit only, Inter body, mono cycle kicker on PageHeader, warning/danger callouts without left stripes.

**STORY:** Employee sees cycle + set status, maintains weighted items to 100%, submits for agreement, then logs actuals in the correct window; manager return comment is visible before rework; scored cycle shows stored KpiScore; tree deep-link proves the same columns read-only with person and position.

**FIRST VIEWPORT:** PageHeader (mono kicker = cycle name, “My KPI”, one-line description, StatusBadge right). Below: optional return/score/error callouts, then full-width item table (name/definition, target, weight, parent cascade, latest actual, health, cadence when draft). Weight total line under table; Add KpiItem card + Submit for agreement footer when editable.

**FORM:** Operate dense table + inline row affordances (not card grid dashboard). Seed: `confirmed-my-kpi-2026-09-16` (code-led; brief is comp).

**FINISH:** Unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
