---
version: 1
slug: "src-app-people-page-tsx"
primary_target: "src/app/people/page.tsx"
related_targets: ["src/app/people/[id]/page.tsx"]
---

# People (/people, /people/[id])

Mode: Operate. Visitors: HR keeping the roster and identity right; each Person reading and updating their own contact details; Line Managers reading allowed profiles. Product truth from the 16 Sep brief stands: a Person is never deleted, legal identity changes only through HR-confirmed CV or correction, Grade lives on Position, no salary, NIK, or bank data.

Confirmed with user (12 Oct 2026): devl.dev Profile card header plus sections; contact edits and correction requests in side sheets; roster with search, status filter, avatars, and seat.

## Direction contract

THESIS: A profile reads like a person summary card, then the evidence behind it, and every change happens in a sheet. Refuses a long page of inline forms.

OWN-WORLD: KMPlus sage on light canvas, the grammar of Projects and Home: paper panels at 16px radius, hairline rows, initials avatars on sage wash, 6px status badges, register rows switching on container width.

STORY: HR opens People, searches "Rayhan", opens the profile, reads Position, contact facts and this month's hours in the header, and approves a correction from its sheet. Alfredo opens his own profile and edits his phone number in a sheet.

FIRST VIEWPORT: Profile: back link, avatar, name, Position and OrgUnit, contact facts, counts (projects today, hours this month, KPI Portfolio status), actions; then Employment and seats beside CV evidence. Roster: title, search, status filter, register rows.

FORM: devl.dev Card Profile (density only), user-pinned. Seed key: none (user-pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
