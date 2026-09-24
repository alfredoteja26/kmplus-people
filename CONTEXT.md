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
A login to one Tenant, reached by that User’s corporate email (`@kmplus.co.id`), which is not the Person’s contact email. A Person has at most one User. A candidate Curriculum Vitae may not. A User may be granted Admin.
_Avoid_: Account, profile (when you mean login), Person email as the login

**Admin**:
A User granted KPI governance for the Tenant, who may also open any Project, change its ProjectCode, name, client name, and dates, and add, end, or correct Staffing. One role, assigned to chosen Users by HR or by an existing Admin. Not implied by HR. May cast the Admin vote on their own KpiPortfolio and KpiCheckIns. LineManager must be a different Person.
_Avoid_: Tenant admin as a synonym, HR as the cycle opener, Admin as an exclusive login hat that replaces Employee or Manager, Admin as the person who creates a User or changes a login email, a single User slot that moves between people, a separate grant only for opening a Project

**Employment**:
The work relationship between a Person and the Tenant: join date, status, and contract type. Only an active Employment allows that Person’s User to sign in.
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

**LineManager**:
The Person on the nearest ancestor Position that currently has an Assignment. Vacant Positions (no current Assignment) are skipped, as many hops as needed. If no filled ancestor exists, Admin is the remaining approver. That Person has LineManager powers for draft, KpiPortfolio approval, and KpiCheckIn approval, including the Team queue.
_Avoid_: manager as a field on Person, Atasan as a stored type, acting manager as an extra Assignment

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

**KpiYear**:
The annual container for KpiPortfolios in one Tenant. Holds the default CheckInFrequency and whether the Tenant is in KpiPlanning or KpiMonitoring. After Admin closes it, no draft, adjustment, or KpiCheckIn. Closed KpiYears stay as history.
_Avoid_: KpiCycle, Cycle, Period as an unnamed date range, TW1/TW2 portfolio

**KpiAdmin**:
Tenant-wide KPI governance for one KpiYear: start KpiPlanning, start KpiMonitoring, open a KpiAdjustmentWindow, and close/score. The user-facing feature. Not a stored pack of KpiItems.
_Avoid_: KpiCycle as a product name, Cycle as a nav or screen label, KPI Cycle

**KpiPlanning**:
The yearly tenant-wide phase before KpiMonitoring. Admin, the Person, and the LineManager may draft KpiItems on that Person’s KpiPortfolio. A KpiCheckIn is not allowed in this phase. A KpiPortfolio that is not yet dual-approved may still be drafted after KpiMonitoring starts.
_Avoid_: Open cycle as a synonym for planning, drafting only inside a KpiAdjustmentWindow

**KpiMonitoring**:
The tenant-wide phase Admin starts after KpiPlanning. A Person may submit a KpiCheckIn only in this phase, and only if that KpiPortfolio is dual-approved by LineManager and Admin.
_Avoid_: Active cycle, Check-In as soon as one manager agrees

**KpiAdjustmentWindow**:
A tenant-wide interval inside KpiMonitoring. Admin opens it and Admin closes it. Typical rhythm is once per quarter, not automatic at the quarter boundary. While it is open, planned KpiItems and targets on a dual-approved KpiPortfolio may be changed. The whole KpiPortfolio goes back to pending; new KpiCheckIns on that Assignment pause until LineManager and Admin approve again. Already-approved KpiCheckIns stay. Other Assignments are unaffected.
_Avoid_: Flipping the Tenant back to KpiPlanning, semesterly, TW1/TW2 portfolio copy, pausing Check-Ins for the whole Tenant, a per-Assignment window, an automatic quarter-long window

**CheckInFrequency**:
Monthly or quarterly. UI name: KPI Check-in Frequency. Default lives on the KpiYear. Override lives on the KpiItem.
_Avoid_: CheckInCadence, cadence, semesterly, check-in window as a free date range with no frequency

**KpiPortfolio**:
The pack of KpiItems for one Assignment in one KpiYear. UI name: KPI Portfolio. A Person with two current Assignments has two KpiPortfolios, each with its own LineManager chain. Dual-approved by LineManager and Admin, in either order, before KpiCheckIns may be submitted. Any modification or Return clears both approvals. A vacant Position has no KpiPortfolio. A mid-year mutation leaves the old KpiPortfolio on the old Assignment and starts a new one on the new Assignment.
_Avoid_: KpiSet, one Portfolio on Person, KPI owned by Position while vacant, leftover approval after an edit, KPI Impact / Output as stored types

**KpiItem**:
One measurable: name, definition, target, unit, weight, polarity, optional CheckInFrequency override, and DirectMix when it is a parent. Every KpiItem on a non-root Assignment names exactly one parent KpiItem. A parent may have many children. KpiItems on a RootPosition Assignment have no parent.
_Avoid_: Goal, OKR (as the stored object), KPI Impact, KPI Output, parent as a Position field, true 1:1 (one child per parent), required parent on RootPosition items

**Cascade**:
A child KpiItem pointing at one parent KpiItem. The parent may sit on any Assignment, not only the reports-to Position. Mode is Direct or Indirect.
_Avoid_: Automatic copy down the org chart, three-level KPI type tree, parent “owned by Position” (the parent is a KpiItem on an Assignment)

**Direct**:
Cascade mode where child KpiCheckIn actuals add into the parent. Child and parent must share unit and CheckInFrequency. The add is a raw sum.
_Avoid_: Weighted % of target when units differ, summing monthly actuals into a quarterly parent

**DirectMix**:
How a parent combines Direct children: children-only (parent actual is the sum) or own-plus-children (parent KpiCheckIn plus the sum). Lives on the parent KpiItem. Default children-only. Indirect children never enter the sum.
_Avoid_: Mix as a property of each child link

**Indirect**:
Cascade mode where the child is linked for alignment and the tree only. Child KpiCheckIns do not add into the parent actual.
_Avoid_: Indirect as a second stored KPI type

**KpiCheckIn**:
A dated actual versus target on a KpiItem, in that item’s CheckInFrequency window. UI name: KPI Check-In. Allowed in KpiMonitoring for the current window and for any past window in this KpiYear that has no approved KpiCheckIn yet. Future windows are blocked. After submit, LineManager and Admin must both approve, in either order. Any modification or Return clears both approvals. Pending KpiCheckIns do not count at KpiYear close.
_Avoid_: CheckIn (unqualified), progress update, realisasi as the stored name, leftover approval after an edit, future-window actuals

**KpiScore**:
The stored result of a KpiPortfolio when Admin closes the KpiYear. Built from already-approved KpiCheckIns only. A KpiPortfolio that is still pending plan has no KpiScore. Compensation may consume it later. Phase 1 does not compute pay from it.
_Avoid_: Bonus formula, calibration rating, score at cycle close, counting pending Check-Ins

## Delivery (Phase 2)

**Project**:
A named body of work opened by Admin, for one named client or for KMPlus when that name is blank. It has a ProjectCode, a required start, an optional end, and a health status recorded as a ProjectUpdate.
_Avoid_: Engagement as a stored type, job (when you mean Project), task board, Client as its own record, a required end date

**ProjectCode**:
The short code an Admin types for one Project, unique in the Tenant regardless of letter case, and changeable later by any Admin. Changing the code does not create a new Project.
_Avoid_: Project id as the code people type, a system-assigned number

**Staffing**:
A Person on a Project for a required start and an optional end, with a Load. Any Admin may add a row, end it, or delete a row that was a mistake. Ranges for one Person on one Project do not overlap and may fall outside the Project’s dates. No row means the Person is not on the Project. This is not an Assignment.
_Avoid_: Assignment, project assignment, resource booking as a synonym for the org seat, a Person shown on the Project with no row

**Load**:
The share of one Person’s capacity committed on one Staffing row, as a whole percent from 1 to 100. Admin changes it by editing that number. The sum across a Person’s rows may exceed 100. That excess is overload and stays visible.
_Avoid_: Utilization as the stored field (utilization is a KPI example, not Load), a cap that hides overload, a stored history of older percents

**ProjectUpdate**:
A dated health note on a Project (status and narrative). It is not a task, checklist, or timesheet.
_Avoid_: Task, ticket, sprint, Kanban card
