# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People at KMPlus Optima Internasional (tenant `kmplus`, about 20–30 people). They sign in with a User login email that ends in `@kmplus.co.id`. HR sets that email. The first password arrives by email. A resigned Person cannot sign in.

| Who | What they do in Phase 1 |
| --- | --- |
| **Employee** (Person with User) | Own Person profile, draft own **KpiPortfolio**, submit **KpiCheckIns** when allowed |
| **Manager** (as **LineManager**) | Team queue: draft/agree/return reports’ portfolios and Check-Ins |
| **HR** | Person, Employment, OrgUnit, Position, Grade; CV review queue; create a User and change the login email. Does **not** imply **Admin** |
| **Admin** | User grant for **KPI Admin** (start **KpiPlanning** / **KpiMonitoring**, open **KpiAdjustmentWindow**, close **KpiYear**) and for opening a **Project** (code, name, optional client, required start, optional end) and for **Staffing**. Any Admin may edit those Project fields and who is on the Project. A Person’s Loads may sum past 100, and that overload stays visible. Stacks with Employee or Manager. Does not create Users |
| **Finance** | Phase 2 payslips. Not a Phase 1 persona. Opening a Project is the **Admin** grant, not a separate project-owner role |

## Product Purpose

KMPlus People is a people system with evidence: who someone is, which Position they hold, what their CV claims, and what they are measured on this year. Phase 1 success means HR can name every active Person and seat, apply a reviewed CV, and see a **KpiYear** with dual-approved **KpiPortfolios** — without a spreadsheet.

Taglines for copy: “From CV to KPI.” / “People, with evidence.”

## Positioning

A CV does not change the Person until HR accepts it, and this year’s KPIs hang off the Assignment. A generic profile-plus-goals tool could not claim the same thing.

## Operating Context

Internal tool for one company, KMPlus Optima Internasional. English UI. The work surfaces are People, Organization, CV review, and KPI. Production is https://internal.kmplus.co.id. Local development runs on the laptop against a separate database.

## Capabilities and Constraints

**Phase 1 (ship):** Person + Employment; Organization (OrgUnit, Position, Grade, Assignments); CV import with human review before Person writes; KPI planning / monitoring / Check-In / score at year close (see [CONTEXT.md](CONTEXT.md) Performance terms and `docs/adr/`). Sign-in uses the corporate login email. Passwords are not stored in this app.

**Phase 2 (specified, not built):** Compensation/payslip (Grade → band → document; Finance ACL); Project + Staffing + ProjectUpdate (no task board). “Assignment” in project talk is **Staffing**, not org **Assignment**.

**Later / out:** Leave, ATS, LMS, 360, calibration committee, bonus formula, task management.

Seed-SaaS constraints:

1. Every record belongs to a Tenant. KMPlus is tenant `kmplus`.
2. Assignment is Position-centric. No `employee.department` string.
3. CurriculumVitae never auto-writes master data; review queue is the product.
4. **KpiPortfolio** hangs off Assignment + **KpiYear**. Mid-year mutation = new Assignment; history is not rewritten.
5. Compensation is a module boundary. No salary on Person in Phase 1.
6. Staffing hangs off Person + Project. Do not reuse Assignment for project allocation.

Product nouns to keep: **KpiPortfolio**, **KpiYear**, **KPI Admin**. Do not use **Cycle**, **KpiCycle**, or **KpiSet** as product names.

## Brand Commitments

The product name is KMPlus People. Voice is formal, clear, and operational. English UI for Phase 1 unless a later brief asks otherwise. It looks like KMPlus, not like a client brand.

Do not use:

- Akasia logo, palette, or wordmark
- Pelindo / Portaverse / InJourney / Rinjani colors or marks
- Dark navy chrome (`#0B2131`) on product work surfaces (the marketing site may be dark; this app is light)
- Generic purple AI glow, rainbow dashboards, heavy serif display
- Project, Staffing, or payslip navigation in Phase 1
- Portaverse PMS as a visual or domain clone (three-level KPI trees, calibration committees, TW1/TW2 portfolio copies)

The visual contract is [DESIGN.md](DESIGN.md) and [design-system/kmplus.html](design-system/kmplus.html).

## Evidence on Hand

- Glossary: [CONTEXT.md](CONTEXT.md)
- Locked decisions: `docs/adr/`
- Official KM/PLUS mark: `brand/kmplus-logo-dark.svg`
- A seeded roster used for local development. It is demonstration data, not a customer proof.
- No testimonials, case studies, or press quotes. Do not invent them.

[PRD.md](PRD.md) is historical only. Do not use it for new work.

## Product Principles

1. A CV proposes facts. Those facts become the Person only after HR accepts them.
2. This year’s KPIs belong to an Assignment in a KpiYear, not to a Person in the abstract.
3. Admin is a grant for KPI governance. It does not replace the person’s job, and it does not create logins.
4. The login is the User’s `@kmplus.co.id` email, separate from the Person’s contact email. Only an active Employment can sign in.
5. Every record belongs to tenant `kmplus`.
