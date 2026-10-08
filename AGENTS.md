# AGENTS.md — KMPlus People

Seed-SaaS people + KPI product for tenant `kmplus`. English UI. Design system: sage SaaS, not Pelindo/Portaverse/Rinjani chrome.

## Local development

Always-on local loop: Postgres + Next.js on the laptop. Prod is a different machine and database.

1. Copy `.env.example` → `.env` if missing (`DATABASE_URL`, `SESSION_SECRET`).
2. Start Postgres: `npm run db:up` (uses `docker-compose.yml`, host port 5432).
3. First clone only: `npm run db:setup` (generate + `db push` + seed).
4. Run the app: `npm run dev` → http://localhost:3000.
5. Before handing off: `npm test` (and a quick click-through of the path you changed).

Done when the app serves on `:3000` against local Postgres and tests pass for the touched area.

## Ship to production

There is **no CI/CD**. Pushing `main` to GitHub does **not** update https://internal.kmplus.co.id.

Prod is Docker Compose on the KMPlus server (app on host port **88**, nginx → `internal.kmplus.co.id`). After code lands on `main`, a human with SSH must pull and rebuild. Full steps, env flags, and nginx notes: [README-DEPLOY.md](README-DEPLOY.md).

Schema changes: one prod boot with `RUN_DB_PUSH=true` (or `prisma db push` in the app container), then set `RUN_DB_PUSH` / `RUN_DB_SEED` back to `false`. Local `docker-compose.yml` and prod `docker-compose.prod.yml` are separate stacks — never point local `.env` at prod.

## Product and design (read before coding)

Authority order when docs disagree: **CONTEXT.md → ADRs → PRODUCT.md → DESIGN.md → active `.scratch` spec**. Ignore [PRD.md](PRD.md) (archived). Treat [docs/shape/](docs/shape/) as historical UI briefs only ([docs/shape/README.md](docs/shape/README.md)).

- **Domain vocabulary**: [CONTEXT.md](CONTEXT.md) — use glossary terms; avoid listed synonyms (not KpiSet / KpiCycle / CheckInCadence as product nouns).
- **Product scope / anti-refs**: [PRODUCT.md](PRODUCT.md).
- **UI tokens and chrome**: [DESIGN.md](DESIGN.md) and [design-system/kmplus.html](design-system/kmplus.html).
- **ADRs / domain agent notes**: [docs/agents/domain.md](docs/agents/domain.md) (points at `docs/adr/`).
- **Specs and tickets**: [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) — live under `.scratch/<feature>/`. Prefer `kpi-admin-planning-monitoring` vocabulary over older cascade-spec nouns when they conflict.

Code may still use older identifiers (`KpiSet`, `KpiCycle`) until renamed; **product language in UI copy and new docs follows CONTEXT**.

## Hard boundaries

- Tenant id on every record; KMPlus is tenant `kmplus`.
- CV review queue writes Person facts only after HR confirms — never auto-write legal identity.
- Navigation groups are People / Performance / Work (ADR-0010). CV review stays a People subpage. No payslip chrome.
- **Admin** (User grant) operates KPI Admin, may open a Project, may edit Staffing, configures Deliverable status labels, leave types, and time-block types, decides leave requests, and reads project, timesheet, and approved-leave reports — not “HR opens the cycle.”
- UI copy uses spaced product language (Line Manager, KPI Portfolio, KPI year, planning, monitoring). Glossary camelCase stays in code and CONTEXT, not on screen.
- Prefer existing `src/lib` commands and Prisma schema over inventing parallel domain models.
