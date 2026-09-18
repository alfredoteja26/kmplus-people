---
version: 1
slug: "src-app-people-page-tsx"
primary_target: "src/app/people/page.tsx"
related_targets: ["src/app/people/[id]/page.tsx","src/app/cv/page.tsx"]
---

# People module design brief

Confirmed 16 Sep 2026. CV review is a **People subpage**, not a top-level sidebar item. Roster, profile, and CurriculumVitae queue are one module.

## 1. Job and audience

- **Who:** HR maintaining master data and the CV review queue; employees viewing their own Person and own applied CV; managers scanning direct reports they can read under ACL.
- **Context:** Small tenant `kmplus` (about 20–30 people), office daylight, English UI. HR at a desk keeping the roster accurate or reviewing a parsed CV; an employee checking contact details and asking HR to fix something.
- **Visitor mode:** Operate. Production registry, profile, and review-queue workflows, not exploration or marketing.
- **Need:** Trustworthy directory of who works here, how they are employed, which Position they hold, and what reviewed evidence sits on their record, including the queue that writes that evidence.

## 2. Outcome and proof

- **Primary tasks:** HR creates Person with Employment; confirms draft-hire; assigns to an empty Position; accepts or rejects employee correction requests; reviews parsed CV fields (Accept / Edit / Reject) and applies them to a new hire or an existing Person. Employee opens own profile and submits a correction; may read own applied CV on the CV subpage. Manager opens allowed profiles from the list.
- **Success looks like:** List shows every Person in scope with employment status and current seat (or clear unassigned). Profile shows identity, employment (with Grade via current Position only), structured evidence rows, assignment history, and the right actions for the signed-in role. CV review queue is reachable from People without a separate sidebar item.
- **Product truth:** Person is never deleted. Grade lives on Position, not Person. Legal identity is not silently overwritten (corrections and CV apply stay explicit). Resign ends Assignment via employment status, not row removal. No NIK, bank, or salary on these surfaces. CurriculumVitae never auto-writes master data.

## 3. Selected direction

- **Visual authority:** Existing KMPlus People kit (`DESIGN.md`, `design-system/kmplus.html`). Restrained sage on light canvas, Inter, official KM/PLUS mark. No new visual world or extra product anchors.
- **Thesis:** A quiet operational register with two local surfaces: **Roster** (list and profile) and **CV review** (document queue). Same module, same chrome, no second top-level nav item.
- **Sequence:** `/people` roster → optional **CV review** subpage → `/people/[id]` profile (Identity and Employment side by side → evidence sections → role-specific action strip → assignment history).
- **Focal moment:** HR resolves an open correction, or finishes a CV field-by-field apply that lands evidence on a Person.
- **Implementation consequence:** One paper work column inside app chrome. Local subnav or tabs on People (Roster | CV review) for HR and employees who can see CV. Craft moves today’s `/cv` to `/people/cv` (or equivalent) and redirects `/cv`. Tables and flat Cards, not nested cards or hero metrics.

## 4. Scope and boundaries

- **In scope:** Production-ready `/people`, `/people/[id]`, and People > CV review (`/people/cv` at craft; today `/cv`) for UC1 employee data, UC3 CV import, and §7 access rules.
- **Fidelity:** Shipped-quality module flow for this tenant size; demo role switcher stands in for auth.
- **Untouched:** Collapsible sage sidebar, KM/PLUS top bar, tenant label, role switcher. No Project, payslip, Staffing. No separate CV item in the global sidebar.
- **Anti-goals:** Salary or payslip fields, Project/Staffing entry points, client marks (Akasia/Pelindo), dark navy chrome, gradient text, glass, side-stripe borders, nested card stacks, hero-metric templates, org chart as the people list, CV as a peer of People in the sidebar.

## 5. States and ranges

- **List volume:** Empty (no rows yet) versus typical 20–30 rows; no pagination fantasy for Phase 1.
- **Employment:** `draft-hire`, `active`, `resigned`; occasional row with Employment missing.
- **Assignment:** Unassigned (explicit empty/unassigned copy) versus seated on a Position; history with current row and ended rows.
- **Corrections:** None; one or more `open` requests on profile for HR; employee sees own submitted history via status badges.
- **Evidence:** All four blocks empty with short muted placeholders versus tables with multiple rows after reviewed CV apply.
- **CV queue:** Empty; one in-review document; several documents; parse error. Employee sees own applied CV only.
- **Access:** Employee list collapses to self; manager to team; out-of-scope Person shows a single warning callout, not partial data. CV review subpage follows the same ACL as today’s `/cv`.

## 6. Interaction and layout

- **People local nav:** Roster (default) and **CV review** (HR plus employees who may see own applied CV). Active state matches the current subpage. CV review is not in the global sidebar.
- **`/people`:** PageHeader with role-specific title/description; HR-only primary action **Create Person** opens a **modal** collecting identity, emergency contact, join date, contract type, and initial employment status. Main surface is a **table**: Person name (link to profile), email, employment status badge, current Position title or unassigned label.
- **`/people/[id]`:** PageHeader uses legal name and preferred name. **Two-column** grid on medium+ viewports: **Identity** definition list (legal/preferred, contact, emergency, LinkedIn); **Employment** definition list (status, contract, join date, current Position, Grade from Position). Below, **full-width** evidence sections (Education, Experience, Certifications, Skills) as tables or empty state lines.
- **HR-only inline blocks:** **Confirm hire** when status is draft-hire; **Assign Position** form (empty seats first, filled seats disabled) ending current Assignment and opening a new one; **Correction requests** list with Accept/Reject on open items.
- **Employee-only inline block:** **Request a correction** form (field picker, read-only current, proposed value, submit to HR). No direct edit of legal name on profile.
- **Shared footer:** **Assignment history** table (Position, start, end/current).
- **Modal vs inline:** Create Person = modal; assign, confirm hire, corrections = inline Cards under the read blocks. Managers and HR use the same profile layout; actions gated by role.

## 7. Constraints and open decisions

- **ACL:** Employee read own + request edit; manager read team via Position tree; HR/admin full. Other Person hidden from employees (scope callout).
- **Domain nouns:** Person, Employment, Position, Assignment only; resign via Employment status, not delete.
- **Evidence source:** Rows on profile reflect reviewed apply from the People > CV review subpage; `person-evidence` parsing shape applies at apply time.
- **Open for builder (do not invent silently):** Tabs vs in-page subnav for Roster | CV review; exact `/people/cv` vs query-tab URL; HR inline edit of Person/Employment on profile versus create-only; dedicated resign/end-assignment control; empty-list copy; whether managers get the same table columns; correction fields for CV-derived **skills** beyond contact/LinkedIn.

## Direction contract

- **THESIS:** A quiet operational register—Roster plus CV review as one People module, not a marketing directory or org chart of humans.
- **OWN-WORLD:** Existing KMPlus People kit (DESIGN.md, kmplus.html): light canvas, sage accent, Inter, KM/PLUS mark, flat Cards and tables inside one paper work column.
- **STORY:** HR lands on roster → opens a profile to confirm hire, assign seat, or resolve corrections → optional CV review subpage applies reviewed evidence; employees see self, request corrections, read applied CV; managers scan in-scope team rows only.
- **FIRST VIEWPORT:** PageHeader with kicker **Person + Employment**, role-specific description, HR **Create Person** on roster; local subnav **Roster | CV review** when CV is in scope; table or empty callout immediately below.
- **FORM:** Modal for create; inline Cards for assign, confirm hire, corrections; two-column Identity + Employment, then full-width evidence blocks, then role actions, then assignment history Card; StatusBadge for employment and correction states; no nested card stacks or hero metrics.
- **FINISH:** Every brief state is findable in under a minute—empty roster, draft-hire confirm, unassigned Position copy, open corrections with Accept/Reject, empty evidence placeholders, out-of-scope warning without partial data; English copy; Person never deleted; Grade from Position only.
