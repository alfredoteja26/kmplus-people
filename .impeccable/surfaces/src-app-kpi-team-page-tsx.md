---
version: 1
slug: "src-app-kpi-team-page-tsx"
primary_target: "src/app/kpi/team/page.tsx"
related_targets: []
---

# Team KPI — design brief

Confirmed 16 Sep 2026. Performance nav: My KPI, Team, KPI Admin, KPI tree.

## 1. Job and audience

- **Visitor mode:** Operate. Manager during an open KpiCycle, clearing agreement queue for direct and indirect reports. HR sees every Person with a current Assignment in the tenant. Employee is blocked (nav already hides Team; surface shows a warning if reached).
- **Primary audience:** Manager with a filled Position in the reports-to tree. Secondary: HR (full roster, same actions where policy allows).
- **Scene:** Office daylight. Manager scans team health, opens a report’s draft, fixes cascade if needed, then agrees or returns with a short comment. Quiet operational table, not a calibration or bonus workspace.

## 2. Outcome and proof

- **Primary job:** Agree or return each report’s KpiSet for the open cycle. Agree makes the set **active**. Return sends it back with a visible comment on My KPI.
- **Secondary job:** Simple team monitoring: per-person status, weight total, and health (on-track / at-risk / off) from rolled Direct actuals where DirectMix applies, same rules as My KPI and spec story 53.
- **Cascade in the agreement path:** Manager can set parent KpiItem and Direct/Indirect on a report’s draft items (story 14) so incomplete drafts can be finished here, not only on My KPI.
- **Success:** Before agree, weights sum to 100%, every non-root item has a parent, and Direct links pass unit and cadence rules. Failed agree shows the command error under that row.
- **Proof in product:** Status badge moves draft/returned → active on agree; return comment stored; weight column shows 100% when valid; HealthBadge reflects worst item health on active sets; Person name links to profile for full context.

## 3. Selected direction

- **Visual authority:** [DESIGN.md](../../DESIGN.md). Light canvas `#FAFAFA`, paper table on `--bg`, accent `#1E857C`, Inter, KM/PLUS in shell only. Restrained sage SaaS; office daylight; no Portaverse navy, glass, gradient type, or hero-metric template.
- **Structural thesis:** One paper work column under existing sidebar and top bar. PageHeader with cycle kicker, “Team KPI” title, short description (agree/return + health basis). Main artifact is a team roster table, not a KPI forest (forest lives on KPI tree).
- **Focal moment:** A row where status is draft or returned: manager sees weight and cascade readiness, edits parent/mode on items if needed, then **Agree** (primary sage button) or **Return** with comment (secondary + input). Active rows are read-only monitoring with health only.
- **HR variant:** Same table and interactions; row set is all People with current Assignments, not manager subtree only.

## 4. Scope and boundaries

- **In scope:** `/kpi/team` operate surface; roster query (manager subtree vs HR all); per-row KpiSet status, weights, health; agree/return commands; inline or expandable edit of cascade fields on report drafts; link to Person profile.
- **Fidelity:** Production-ready layout and states; chrome and Performance nav unchanged (no Phase 2 Project/payslip; no new nav items).
- **Untouched:** App shell, KPI Admin open/close, KPI tree page, bonus math, calibration committee UI, KpiScore computation at close, salary. Sidebar Performance labels: My KPI, Team, KPI Admin, KPI tree.
- **Anti-goals:** Portaverse three-level KPI type trees, automatic reports-to cascade copy, dark navy chrome, side-stripes, glass, gradient headlines, tenant-wide calibration grids.

## 5. States and ranges

- **Employee role:** Warning callout only (“Team KPI is for managers and HR”).
- **No open KpiCycle:** Header + warning callout; no table.
- **Open cycle, empty team:** Manager with no descendants in Position tree: header + empty-state callout (no rows), not an error.
- **Typical manager load:** 3–12 direct/indirect reports with KpiSets; 0–4 awaiting agree (draft or returned).
- **HR load:** Up to full tenant (~20–30 people); same columns; consider stable sort by Person name.
- **Row without KpiSet:** Show “No KpiSet”, em dash for weights and health; no agree actions.
- **Draft / returned:** Show agree/return affordances; optional expand to item list with cascade edit; surface return comment if present when returned.
- **Active / agreed (monitoring):** Status and health only; no agree/return; health uses rolled Direct rules (draft/returned show health none).
- **Agree error:** Inline danger text under that row’s actions with command message (missing parent, Direct mismatch, weight not 100% when enforced on agree).

## 6. Interaction and layout

- **Hierarchy:** Header (cycle, title, description) → optional empty/blocked callouts → team table.
- **Table columns:** Person (link to profile), Position title, KpiSet status badge, Weights (% sum), Health badge, Actions.
- **Actions column (draft/returned only):** Primary Agree; Return comment input + secondary Return; validation error below. Expand control or “Review items” opens nested rows or panel: item name, weight, parent summary, Direct/Indirect controls reusing cascade affordances from My KPI (manager edit on behalf).
- **Actions column (active):** Empty or muted “Active” hint; no CheckIn here (CheckIn stays on My KPI).
- **Monitoring read:** Manager glances health column for at-risk/off across team; no roll-up chart required in Phase 1 beyond per-row badges.
- **Responsive:** Table horizontal scroll on narrow viewports; action cluster stacks comment below buttons; expanded item editor stacks fields; do not move agree to a separate wizard.

## 7. Constraints and open decisions

- **Domain:** Manager scope = Positions descending from manager’s current Assignment’s Position, filled by current Assignments (PRD §7). HR = all. `agreeKpiSet` / `returnKpiSet` commands; parent and Direct validation per ADR-0001 and cascade spec stories 13–14.
- **Health:** `setHealth` worst-of items using rolled actuals for DirectMix parents; align copy with My KPI header description.
- **Components:** Reuse PageHeader, Callout, Table, Button, Input, StatusBadge, HealthBadge; CascadeFields (or read-only cascade summary + edit) for on-behalf draft edit.
- **Accessibility:** Label return comment per person; agree/return not icon-only; health and status not color-only.
- **Open (non-blocking):** Expand-in-row vs side panel for item edit; whether HR may agree any set or only monitor (default: same agree/return as manager for demo HR); exact empty-team copy.

## Direction contract

Locked for Operate craft (16 Sep 2026). Brief sections 1–6 are authoritative; this section records builder decisions only.

- **Cascade edit:** Expand-in-row beneath the roster row (`Review items` / `Hide items`). Nested item table with name, weight, `CascadeFields`, and `DirectMixField` for on-behalf draft/returned edits. No side panel, wizard, or KPI forest on this route.
- **Agreement actions:** Primary **Agree**, secondary **Return** with labeled comment input per person. Command validation errors render as danger text under that row’s action cluster (`role="alert"`).
- **HR:** Same table, columns, agree/return, and expand-in-row as managers; roster = all People with a current Assignment, sorted by legal name.
- **Manager roster:** Descendants in the reports-to tree with current Assignments; empty subtree → header + informational callout, no table.
- **Table columns:** Person (profile link), Position, KpiSet status, Weights (% sum), Health (`HealthBadge` / em dash), Actions.
- **Row behaviors:** No KpiSet → status copy + em dashes, no actions. Draft/returned → actions + optional expand; returned return comment in expand panel. Active/agreed → muted “Active”, health only (draft/returned health = none). No CheckIn, calibration grid, or cycle close on this page.
- **Chrome:** Reuse `PageHeader` with cycle kicker, existing shell/nav; light paper table on canvas per DESIGN.md.
