# KMPlus People

Canonical language for KMPlus People, the seed-SaaS talent and performance product. KMPlus Optima Internasional is tenant `kmplus`.

## Tenant

**Tenant**:
The customer organization that owns all people and performance records in one isolated space.
_Avoid_: Company as a data container, workspace, account

## People

**Person**:
The human. Identity, contact, and reviewed evidence (Education, Experience, Certification, Skill). Not the login and not the job. The Person and Admin may edit preferred name, phone, contact email, emergency contact, and LinkedIn. Legal name changes only when HR confirms a CurriculumVitae.
_Avoid_: Employee as a mixed blob of identity, job, and pay, Admin writing a legal name

**User**:
A login to one Tenant, reached by that User’s corporate email (`@kmplus.co.id`), which is not the Person’s contact email. A Person has at most one User. A candidate Curriculum Vitae may not. A User may be granted Admin.
_Avoid_: Account, profile (when you mean login), Person email as the login

**Admin**:
A User granted KPI governance for the Tenant, who may also open any Project, change its ProjectCode, name, client name, and dates, add, end, or correct Staffing, configure Deliverable status and category labels, decide a LeaveRequest, decide a ReimbursementRequest, configure LeaveType, TimeBlockType, and ReimbursementType labels, edit PublicHolidays, and refresh Indonesia holidays into that list. The same grant may read organization and per-person project and timesheet reports, every Person’s approved cuti, sick, and remote, and every ReimbursementRequest. Those reports are read-only. One role, assigned to chosen Users by HR or by an existing Admin. Not implied by HR. May cast the Admin vote on their own KpiPortfolio and KpiCheckIns. LineManager must be a different Person.
_Avoid_: Tenant admin as a synonym, HR as the cycle opener, Admin as an exclusive login hat that replaces Employee or Manager, Admin as the person who creates a User or changes a login email, a single User slot that moves between people, a separate grant only for opening a Project, a separate grant for project reports, Admin confirming a CurriculumVitae

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
A parsed source document plus a review state. It proposes Person facts. It does not write them until HR confirms. Admin cannot confirm.
_Avoid_: CV as master data, resume as auto-write, importing a named candidate file as a required Person, Admin as the confirmer

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

**KpiReminder**:
An in-app navbar notice, 3 days before, 1 day before, and on a due date. Planning is due on the planning end date Admin set on the KpiYear, and sends nothing when that date is empty. A check-in is due on the last day of that KpiItem’s current month or quarter. For planning, the Person is reminded until the portfolio is dual-approved, the LineManager until they approve, and Admin until Admin approves. For a check-in, the Person is reminded until they submit, then the LineManager and Admin until each approves.
_Avoid_: email, a daily overdue nag, a reminder for a window that is already late, a reminder to an approver before anything is waiting

**KpiScore**:
The stored result of a KpiPortfolio when Admin closes the KpiYear. Built from already-approved KpiCheckIns only. A KpiPortfolio that is still pending plan has no KpiScore. Compensation may consume it later. Phase 1 does not compute pay from it.
_Avoid_: Bonus formula, calibration rating, score at cycle close, counting pending Check-Ins

**Home**:
The page every signed-in User lands on. It opens with what needs that User, by role: their own KpiPortfolio or KpiCheckIn when one is waiting, KpiPortfolios and KpiCheckIns waiting for them as LineManager, late KpiCheckIns, Assignments without a KpiPortfolio, and ReimbursementRequests waiting for a decision for an Admin, and Curricula Vitae waiting for review for HR (see ADR-0009). Below that it is for that Person only: their card, upcoming Meetings (pending included, declined excluded), progress on Projects they are staffed on today, their TimeBlock hours for this week and this month, and their latest approved KpiCheckIns. Progress is the number of Accepted Deliverables divided by all Deliverables on that Project. A Project with none shows no percent. The week is also shown against 40 hours.
_Avoid_: a company roster, the CV review list itself, empty seats, a month target other than the hour total, Admin’s company reports

## Delivery (Phase 2)

**Project**:
A named body of work opened by Admin, for one named client or for KMPlus when that name is blank. It has a ProjectCode, a required start, and an optional end. It is not itself a list of work.
_Avoid_: Engagement as a stored type, job (when you mean Project), task board, Client as its own record, a required end date, ProjectUpdate, a health status

**ProjectCode**:
The short code an Admin types for one Project, unique in the Tenant regardless of letter case, and changeable later by any Admin. Changing the code does not create a new Project.
_Avoid_: Project id as the code people type, a system-assigned number

**WorkItem**:
One named piece of a Project, with one PIC, a required start, and a required end on or after that start. Both dates sit inside the Project’s dates. When the Project has no end, the WorkItem still has an end. The PIC is a Person with a Staffing row on that Project. Description may be blank. Any Admin, or a Person whose Staffing on that Project has started and has not ended, may create, edit, or delete it. It has no parent and no status.
_Avoid_: Task, ticket, sprint, Kanban card, ProjectUpdate, a health status, a parent item, dates that fall outside the Project

**Deliverable**:
A file or a link on one Project. It may also be attached to many WorkItems on that Project, or to none. It is born as one kind and stays that kind. A file has a name taken from the file name, and each upload adds a version that stays until the whole Deliverable is removed. A link has a typed name and one URL, and a new URL overwrites the old one. Editing the name does not add a version. It has one DeliverableStatus and one DeliverableCategory. Any Admin, or a Person whose Staffing on that Project has started and has not ended, may add, replace, remove, or change that status. Removing a WorkItem drops that attachment and leaves the Deliverable on the Project.
_Avoid_: a status on the WorkItem, a health note on the Project, versioning a link, holding a file and a link together, a Deliverable with no Project

**DeliverableStatus**:
A label Admin configures for the Tenant. The list starts as Draft, Shared, and Accepted, and Draft is the default on a new Deliverable. Admin may add, rename, and reorder labels. The list always has at least one. A label still in use cannot be removed. Changing a Deliverable’s label does not add a file version.
_Avoid_: a fixed list Admin cannot edit, a blank status

**DeliverableCategory**:
A label on a Deliverable, for a file or a link. The list starts as Meeting Notes, Project Deliverables, and Reference Documents. Admin may add, rename, and reorder labels. A label still in use cannot be removed.
_Avoid_: a fixed list of three, a Deliverable with no category

**Staffing**:
A Person on a Project for a required start and an optional end, with a Load. Any Admin may add a row, end it, or delete a row that was a mistake. Ranges for one Person on one Project do not overlap and may fall outside the Project’s dates. No row means the Person is not on the Project. This is not an Assignment.
_Avoid_: Assignment, project assignment, resource booking as a synonym for the org seat, a Person shown on the Project with no row

**Load**:
The share of one Person’s capacity committed on one Staffing row, as a whole percent from 1 to 100. Admin changes it by editing that number. The sum across a Person’s rows may exceed 100. That excess is overload and stays visible.
_Avoid_: Utilization as the stored field (utilization is a KPI example, not Load), a cap that hides overload, a stored history of older percents

**LeaveRequest**:
A Person’s request for cuti, sick, or remote, on a past or future date. Cuti names one LeaveType and one covering Person, who has a User. That Person is shown on the request and on the timesheet, and does not receive the absent Person’s Staffing or WorkItem PIC. Sick and remote name no covering Person. Sick requires a doctor’s letter on the request before it is filed. Remote does not. It is either a range of full days or a start time and end time on one date, and it has a required note. The Person files their own. Any Admin may file for another Person. Any Admin decides: may be taken unpaid, may be taken paid, or may not be taken. Only a may-be-taken request shows on the timesheet, and it adds no work hours. Approved cuti and sick forbid overlapping work blocks. Approved remote does not.
_Avoid_: PersonDay, a direct mark with no request, a leave balance, a pay calculation, the doctor’s letter as a Deliverable

**ReimbursementRequest**:
A Person's request to be paid back for one expense: one date, one amount in whole rupiah, one ReimbursementType, a description, and one to ten evidence files (images or PDF). It may name one Project, only one where that Person has a Staffing row covering the expense date. A foreign-currency receipt is entered as its rupiah amount. The Person files their own. Any Admin may file for another Person. Any Admin decides: approved, approved at a lower amount, or rejected. A lower amount or a rejection requires a note. Until an Admin decides, the filer may edit or withdraw it. A withdrawn request stays as history with its evidence files. After the decision it is locked. A rejection is final: the Person files a new request. After approval, an Admin marks it Paid with a date, and any Admin may later correct or clear that date; payment itself happens outside the app. The Admin who decides it or marks it Paid must be a different Person from the one it is for. With only one Admin, that Admin’s own request waits for a second Admin. The expense date may not be in the future or more than 90 days before filing. Only the Person it is for, the Admin who filed it, every Admin, and that Person’s current LineManager may see it and its evidence files; the LineManager reads only. UI name: Reimbursement.
_Avoid_: Expense, Claim, Klaim, several line items on one request, a request with no evidence file, a LineManager approval or edit, a stored exchange rate, a Project the Person is not staffed on that date, a Return to the Person after rejection, bank details or a payout run, an Admin deciding or paying their own request, deleting a withdrawn request

**ReimbursementType**:
A label on a ReimbursementRequest. The list starts as Transport, Meals, Accommodation, Communication, and Other. Admin may add, rename, and reorder labels. A label still in use cannot be removed.
_Avoid_: a fixed list Admin cannot edit, a request with no type

**LeaveType**:
A cuti label Admin configures for the Tenant. The list starts as Tahunan, Besar, Bersalin, Pernikahan, Kelahiran, Kematian, Khitanan/Pembaptisan, Ujian/test, Utk. Keperluan Nasional, and Lain-lain (Acara Wisuda). Admin may add, rename, and reorder labels. A label still in use cannot be removed.
_Avoid_: Sick as a LeaveType, Remote as a LeaveType, a fixed list Admin cannot edit

**PublicHoliday**:
One named date for the whole Tenant. It shows on every Person’s timesheet with an origin mark, adds no hours, and still allows a TimeBlock. Origin is Libur Nasional or Cuti Bersama when the date came from Indonesia sync, or Cuti Bersama (Internal) when any Admin added it. Admin may add, rename, or remove a date, and may refresh Indonesia holidays for the current and next Asia/Jakarta years. Removing an Indonesia date suppresses it so a later refresh does not restore that date; Admin may re-add the same date by hand as Cuti Bersama (Internal). Refresh adds missing Indonesia dates only and does not overwrite a local name.
_Avoid_: LeaveRequest, a per-Person holiday, a day that forbids work, a second domain type per origin mark, treating Cuti Bersama (Internal) as a LeaveRequest

**TimeBlock**:
A span of at least one hour that a Person records on their own calendar. It may name no Project. If it names a Project, it names one WorkItem on that Project, and a Staffing row must cover the block’s date. It has one TimeBlockType. The week grid defaults to Monday–Friday in Asia/Jakarta, and that Person may switch it to the full week. A week’s hour total includes Saturday and Sunday even when the grid hides them. The total counts blocks this Person created, and invited blocks only after they accept. Two TimeBlocks for the same Person may not overlap. A past day stays editable. A block with no Project counts in the total and in its type.
_Avoid_: LeaveRequest as a work block, a block shorter than one hour, a Project block with no WorkItem, a device clock instead of Asia/Jakarta, overlapping blocks for one Person, a locked past day

**TimeBlockType**:
A label on a TimeBlock. The list starts as Meeting and Activity. Admin may add, rename, and reorder labels. A label still in use cannot be removed. Only the type that starts as Meeting may have Invites. Renaming that label does not remove that.
_Avoid_: a separate object for each label, LeaveType as a time-block label, Invites on Activity or a later type

**Invite**:
A Person with a User asked to attend one Meeting TimeBlock. On a meeting that names a Project, their Staffing must cover the block’s date. On a meeting with no Project, any such Person may be invited. The block shows on their calendar as pending until they accept or decline. Only the creator edits the block. Accept adds its hours to their summary. Decline removes it from their calendar and adds no hours. Accept is refused when the span overlaps their approved cuti or sick.
_Avoid_: hours before accept, an invitee editing the block, an invite on a type other than Meeting
