# People > CV review design brief

Confirmed 16 Sep 2026. This is a **People subpage**, not a top-level module. Sidebar does not list CV. Craft moves `/cv` to `/people/cv` (redirect `/cv`).

## 1. Job and audience

- **Who:** HR (primary) via demo role switcher; employees see only their own applied CurriculumVitae, read-only.
- **Context:** Office daylight, English UI, tenant `kmplus`. HR just uploaded a candidate or employee `.pdf` or `.docx` and is working the parser output with healthy skepticism.
- **Need:** Turn a document into reviewed evidence on a Person without silent writes to legal identity or master data.
- **Visitor mode:** Operate. No Register or onboarding story. Reached from People local nav (Roster | CV review), not from a global CV item.

## 2. Outcome and proof

- **Primary task:** For each proposed field, choose Accept, Edit, or Reject; then Apply reviewed fields to a new hire path or an existing Person, or Reject the whole document.
- **Success:** HR completes UC3 in about ten minutes after parse: queue cleared or document rejected with explicit decisions; applied means only accepted/edited fields were written; source file and extracted text stay attached; new hire gets Person plus Employment draft-hire without creating a User here; existing Person gets merged experience and skills without overwriting legal identity.
- **Proof in product:** The review queue is the product, not the upload widget. Each field row shows label, parsed value, decision state, and three actions until the CV is applied or rejected.
- **Product truth:** CurriculumVitae proposes facts; Person holds reviewed Education, Experience, Certification, and Skill. Confirm hire and User invite live on People profile, not as a silent side effect of Apply.

## 3. Selected direction

- **Visual authority:** [DESIGN.md](../../DESIGN.md) and design-system/kmplus.html. Restrained sage, light canvas `#FAFAFA`, paper cards, accent `#1E857C`, Inter, KM/PLUS mark in app chrome (unchanged).
- **Structural thesis:** Two-pane operate layout: left queue of documents (file name, CV state); right review panel for the selected CurriculumVitae. Upload is a compact top strip for HR only, not the hero.
- **Focal moment:** One field row under decision: proposed value, decision badge, Accept / Edit / Reject. HR reads parser output and commits field by field.
- **Scene tone:** Focused HR desk, slightly skeptical of automation; parser proposals feel provisional until accepted. No dashboard symmetry or metric hero.
- **Implementation consequence:** Keep the two-pane queue topology. Relocate the page under People (`/people/cv` preferred; keep `src/app/cv/page.tsx` only as a redirect if needed). Parser API and field keys stay as implemented (name, email, linkedin, education, experience, skills, certifications). Show People local nav on this surface.

## 4. Scope and boundaries

- **Fidelity:** Production-ready screen; all material states shippable.
- **Breadth:** People > CV review only; HR upload plus review plus apply/reject; employee applied-CV read view. Parent module is People.
- **Target:** `src/app/cv/page.tsx` today; `/people/cv` after craft (brief via Impeccable surface-brief).
- **Untouched:** App top bar. Global sidebar has no CV item. No Project, payslip, salary, or org chart editing on this page.
- **Anti-goals:** Auto-apply or auto-write to Person; silent legal-name overwrite; identical card grids; dark navy chrome; gradient text, glass, side-stripe decoration; Akasia/Pelindo/InJourney marks; treating a named test fixture (e.g. Dzaky CV) as a required hire or client brand.

## 5. States and ranges

- **CV lifecycle:** uploaded → parsed → in review → applied or rejected (UI may collapse uploaded/parsed into in-review after parse returns).
- **Queue empty (HR):** Upload affordance plus empty list or callout; no fake rows.
- **One CV in review:** Default selection; ~7 field rows typical (name through certifications); 0–N pending decisions.
- **Many CVs:** Left list scrolls; selected row uses tint wash; states visible per row (in-review, applied, rejected).
- **Parse error or empty extract:** Inline error on upload; CV may still land in review with sparse or empty fields; HR can reject document.
- **Apply new-hire:** Apply to selector on new Person (Employment draft-hire); link appears after apply when Person exists.
- **Apply existing:** Merge experience and skills from accepted/edited fields; name and other legal identity not silently replaced.
- **Employee:** Zero applied CVs (callout); one applied CV (read-only field list, no upload, no decisions).
- **Locked CV:** applied or rejected disables field actions and apply/reject footer; decisions remain visible.

## 6. Interaction and layout

- **Hierarchy:** PageHeader with kicker “Review queue is the product” → HR upload card → two-column grid (document queue | review panel).
- **Queue list:** Table or equivalent: file name (select), StatusBadge for CV state; selected row highlighted with tint.
- **Review panel:** Header with file name, Person link when linked, document state badge; stacked field blocks (caption label, formatted value, decision badge); per-field Accept, Edit (inline input plus save), Reject when HR and not locked.
- **Evidence:** Collapsible extracted text (mono, muted) for audit and parser debugging; not the primary reading surface.
- **Apply footer:** Warning callout when pending fields remain (apply still allowed for accepted/edited only); Apply to select (new hire vs existing Person); primary Apply reviewed fields; danger Reject document.
- **Affordances:** Sage primary for Accept and Apply; secondary Edit; danger Reject. Links to People profile for linked Person.
- **Responsiveness:** Queue stacks above review on narrow widths; field actions wrap; no new global grid template.

## 7. Constraints and open decisions

- **Platform:** Next.js client page; POST `/api/cv/parse` for extract plus `proposeCvFields`; client store for addCv, decideCvField, applyCv, rejectCv.
- **Accessibility:** Keyboard reachable file input and buttons; field labels exposed; table semantics for queue where tabular.
- **Localization:** English Phase 1.
- **Reuse:** PageHeader, Card, Callout, Table, Button, Field, Input, Select, StatusBadge, `formatCvFieldValue`, domain role helpers.
- **Open for builder:** Visual polish of field rows (border rhythm vs list density) within DESIGN.md; whether to show uploaded vs parsed as distinct badges before in-review; optional preview of source filename only (binary preview out of scope unless already trivial); exact copy for pending-field warning and employee empty state.
