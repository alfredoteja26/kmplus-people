---
version: 1
slug: "src-app-project-admin-page-tsx"
primary_target: "src/app/project-admin/page.tsx"
related_targets: ["src/app/project-admin/configure/page.tsx","src/app/project-admin/holidays/page.tsx"]
---

# Project Admin

Mode: Operate. Visitor: an Admin (User grant, a handful of people) checking the company's project work once or twice a week and at month end, then exporting the workbook. Job: see where hours, people, and leave stand this month, spot what needs a decision or a fix, and read or download the reports. Constraints: every report is read-only; Admin opens Projects and Staffing from the Projects pages, not here; Loads may sum past 100 and that overload stays visible; approved leave only (pending lives in Leave requests); no day balance; the download is an .xlsx workbook with Projects, Staffing and Timesheet sheets.

Confirmed with user (13 Oct 2026): the top answers first with a facts strip and a Needs attention band (leave waiting, overloaded people, past weekdays with no hours last week, projects ending within 30 days) beside Hours by project this month; reports sit in one tabbed panel (Projects, Staffing, Timesheet by person, Approved leave) with a month pager for Timesheet and Leave and Download in the panel header; an Overview / Lists / Public holidays subnav, and both subpages restyled onto paper panels and sheets.

## Direction contract

THESIS: Project Admin is a month at a glance with the receipts underneath. An Admin reads where the hours went and what needs them before reading any table. Refuses a stack of raw tables under a row of equal buttons.

OWN-WORLD: KMPlus sage on light canvas. Paper panels, 16px radius, soft shadow. The facts strip pattern from the Project page and My KPI. Bar lists are flat 6px sage bars on a wash track, overload in warning. Project code chips in Plex Mono on tint. Avatars in tint. Leave kinds keep their hues (cuti sage, sick amber, remote neutral). Status badges from the 6px badge system. Tabs as the underline variant inside the panel header.

STORY: Alfredo opens Project Admin on a Tuesday, reads "212h logged this month, 3 leave requests to decide", sees Rayhan at 120% load and Eka with no hours on Friday, opens Leave requests from the row, comes back, switches the Timesheet tab to September, downloads the workbook for finance.

FIRST VIEWPORT: Title "Project Admin" with one line of context; subnav Overview / Lists / Public holidays. Facts strip: active projects, people staffed today (overloaded count in warning), hours this month, leave to decide. Then a 1.6 : 1 band: Hours by project this month (bar list, top projects, then No project) beside Needs attention (count tiles, sentence, action arrow, the Home pattern). Report panel begins below the fold on a laptop.

FORM: devl.dev Dashboard Engineering density (user-pinned in .scratch/work-delivery/research/devl-blocks.md): summary tiles become a facts strip, the chart band becomes the hours bar list, the side panel becomes Needs attention, the ranked list becomes Timesheet by person. Concept-seed not run: the user pinned the block. Seed key: none (user-pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
