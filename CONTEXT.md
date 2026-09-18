# KMPlus People

Canonical language for KMPlus People, the seed-SaaS talent and performance product. KMPlus Optima Internasional is tenant `kmplus`.

## Tenant

**Tenant**:
The customer organization that owns all people and performance records in one isolated space.
_Avoid_: Company as a data container, workspace, account

## People

**Person**:
The human. Identity, contact, and reviewed evidence (Education, Experience, Certification, Skill). Not the login and not the job.
_Avoid_: Employee as a mixed blob of identity, job, and pay

**User**:
A login to one Tenant. A Person may have a User. A candidate Curriculum Vitae may not.
_Avoid_: Account, profile (when you mean login)

**Employment**:
The work relationship between a Person and the Tenant: join date, status, and contract type.
_Avoid_: Contract as a synonym for the whole relationship

## Organization

**OrgUnit**:
A node in the company tree, such as Consulting, Product, or Workshop.
_Avoid_: Department, division (as field names)

**Position**:
The seat: title, Grade, reports-to Position, and home OrgUnit.
_Avoid_: Job, role (when you mean the seat), jabatan as a Person field

**RootPosition**:
A Position with no reports-to Position. A Tenant may have more than one. Their titles may read President Director or Managing Director; that title is data, not a stored type. KpiItems on a RootPosition’s current Assignment are the only Cascade roots (no parent).
_Avoid_: President Director as a type, TenantObjective, fake company seat

**Assignment**:
A Person holding a Position for a date range. Mutation, dual-hat, and resignation are extra Assignments, not in-place edits.
_Avoid_: Staffing, project assignment, manager as a field on Person

**Grade**:
The band on a Position. Later compensation hangs off Grade, not off Person.
_Avoid_: Level, golongan as a Person field

## Evidence

**CurriculumVitae**:
A parsed source document plus a review state. It proposes Person facts. It does not write them until HR confirms.
_Avoid_: CV as master data, resume as auto-write, importing a named candidate file as a required Person

**Education**:
A reviewed school or program on a Person: institution, dates, credential, optional GPA.
_Avoid_: educationNotes as the stored shape

**Experience**:
A reviewed stint on a Person: employer or body, dates, title, narrative. Kind is work, organization, or volunteer.
_Avoid_: experienceNotes as the stored shape

**Certification**:
A reviewed certificate or course on a Person: issuer, name, date.
_Avoid_: certifications as a single string

**Skill**:
A named capability on a Person after review. Kind is technical, language, or personal.
_Avoid_: Competency (until a later competency module exists)

## Performance

**KpiCycle**:
The open period for planning and scoring, annual. It has a default CheckInCadence. A KpiItem may override that cadence.
_Avoid_: Period as an unnamed date range, TW1/TW2 portfolio

**CheckInCadence**:
Monthly or quarterly. Default lives on the KpiCycle. Override lives on the KpiItem.
_Avoid_: Check-in window as a free date range with no cadence

**KpiSet**:
The agreed pack of KpiItems for one Assignment in one KpiCycle.
_Avoid_: Portfolio, KPI Impact / Output as stored types

**KpiItem**:
One measurable: name, definition, target, unit, weight, polarity, optional CheckInCadence override, and DirectMix when it is a parent. Every KpiItem on a non-root Assignment names exactly one parent KpiItem. A parent may have many children. KpiItems on a RootPosition Assignment have no parent.
_Avoid_: Goal, OKR (as the stored object), KPI Impact, KPI Output, parent as a Position field, true 1:1 (one child per parent), required parent on RootPosition items

**Cascade**:
A child KpiItem pointing at one parent KpiItem. The parent may sit on any Assignment, not only the reports-to Position. Mode is Direct or Indirect.
_Avoid_: Automatic copy down the org chart, three-level KPI type tree, parent “owned by Position” (the parent is a KpiItem on an Assignment)

**Direct**:
Cascade mode where child CheckIn actuals add into the parent. Child and parent must share unit and CheckInCadence. The add is a raw sum.
_Avoid_: Weighted % of target when units differ, summing monthly actuals into a quarterly parent

**DirectMix**:
How a parent combines Direct children: children-only (parent actual is the sum) or own-plus-children (parent CheckIn plus the sum). Lives on the parent KpiItem. Default children-only. Indirect children never enter the sum.
_Avoid_: Mix as a property of each child link

**Indirect**:
Cascade mode where the child is linked for alignment and the tree only. Child CheckIns do not add into the parent actual.
_Avoid_: Indirect as a second stored KPI type

**CheckIn**:
A dated actual versus target on a KpiItem, in that item’s CheckInCadence window.
_Avoid_: Progress update as a free-text-only substitute for actual vs target

**KpiScore**:
The stored result of a KpiSet at cycle close. Compensation may consume it later. Phase 1 does not compute pay from it.
_Avoid_: Bonus formula, calibration rating

## Delivery (Phase 2)

**Project**:
A named body of work for a client or for KMPlus, with dates and a health status. Not a task list.
_Avoid_: Engagement as a stored type, job (when you mean Project), task board

**Staffing**:
A Person allocated to a Project for a date range, with a Load. This is not an Assignment.
_Avoid_: Assignment, project assignment, resource booking as a synonym for the org seat

**Load**:
The share of one Person’s capacity committed on one Staffing row, as a percent.
_Avoid_: Utilization as the stored field (utilization is a KPI example, not Load)

**ProjectUpdate**:
A dated health note on a Project (status and narrative). It is not a task, checklist, or timesheet.
_Avoid_: Task, ticket, sprint, Kanban card
