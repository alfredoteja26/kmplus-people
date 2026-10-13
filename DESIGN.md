---
version: alpha
name: KMPlus People Design System
description: Visual contract from design-system/kmplus.html. Quiet sage SaaS. Never Akasia or client brands.
colors:
  bg: "#FAFAFA"
  paper: "#FFFFFF"
  ink: "#222222"
  muted: "#5E5E5E"
  faint: "#6A6A6A"
  line: "#DEDEDE"
  accent: "#1A7870"
  accent-hover: "#145F59"
  line-strong: "#949494"
  brand-deep: "#0A706D"
  brand-deeper: "#0B5A56"
  brand-deepest: "#0A4643"
  brand-wave: "#8FE6DD"
  accent-2: "#009D9A"
  tint: "#EDFFFE"
  success: "#12A864"
  warning: "#C9891A"
  danger: "#C4353A"
  info: "#0673C0"
  on-accent: "#FFFFFF"
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 42px
    fontWeight: 500
    lineHeight: 1.1
  heading-1:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.2
  heading-2:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: 500
    letterSpacing: 0.06em
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.25
  micro:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.3
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: 400
rounded:
  sm: 4px
  md: 12px
  lg: 16px
  badge: 6px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  "2xl": 32px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 0 16px
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 16px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 16px
  badge:
    rounded: "{rounded.badge}"
    height: 24px
    padding: 0 8px
    typography: 13px / 500
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: 38px
    padding: 0 12px
---

# Design System

## Overview

KMPlus People follows the internal KMPlus kit at [design-system/kmplus.html](design-system/kmplus.html) (source: kmplusconsulting.com computed styles, 14 Sep 2026). Quiet sage SaaS. Light surfaces. Plus Jakarta Sans. Sage buttons.

**Logo:** the official stacked **KM / PLUS** with five teal bars, [brand/kmplus-logo-official.png](brand/kmplus-logo-official.png), served from `public/brand/kmplus-logo-official.png` (same pixels, transparent margin trimmed). Use it unaltered: no recolor, no white or mono variant, no redraw. On dark surfaces (sign-in brand panel) set it on a white radius-12 plate. Do not invent a replacement mark.

## Colors

- **Canvas** `--bg` `#FAFAFA`: page background.
- **Paper** `--paper` `#FFFFFF`: cards, tables, inputs.
- **Ink** `--ink` `#222222`: body text.
- **Accent** `--accent` `#1A7870`: primary actions, links, selected nav. One step darker than the kit's `#1E857C`, which failed WCAG AA with white text (4.47:1). Hover darkens to `--accent-hover` `#145F59`; it never lightens.
- **Brand deep** `--brand-deep` / `--brand-deeper` / `--brand-deepest` (`#0A706D` → `#0A4643`) and `--brand-wave` `#8FE6DD`: the sign-in brand panel gradient and its fine-line wave. Never on work surfaces.
- **Line strong** `--line-strong` `#949494`: input borders and tree connectors (3:1). `--line` stays for dividers.
- **Accent 2** `--accent-2` `#009D9A`: text accents, progress fill.
- **Tint** `--tint` `#EDFFFE`: mint wash, selected row, badge-neutral wash.
- Semantic: success `#12A864`, warning `#C9891A`, danger `#C4353A`, info `#0673C0`.

Do not use Pelindo navy, Portaverse blue, or dark `#0B2131` chrome on product screens. The marketing hero is dark; this app is light.

## Typography

Plus Jakarta Sans for all UI (display, headings, body). IBM Plex Mono for hex labels and code only. Two dense steps exist for packed surfaces only: `text-label` (13px, 500) for status badges and timesheet block titles, and `text-micro` (11px) for the timesheet hour rail, block times, and day-strip counts. Body copy never drops below 14px. No Fraunces, Lora, or other display serifs in the app.

## Layout

Collapsible left sidebar on `--paper` with 1.5px `--line`. Expanded: icon + label, sage filled pill for the active item. Collapsed: icon rail (~72px), tooltips. Default expanded on desktop, collapsed on small viewports. User can pin collapsed. Quiet sage SaaS — not navy chrome, not a heavy dashboard shell.

**Top bar:** official KM/PLUS mark, product name People, the signed-in Person and their access (e.g. "Employee · Admin"), Reminders. No payslip.

**Sidebar groups:** Home, People, Organization; Performance (My KPI, Team KPIs, KPI Admin, KPI Tree); Work (Projects, Timesheet, Leave, Reimbursement, and for Admin: Leave requests, Project Admin). CV review is a People subpage, not a top-level item. See ADR-0010.

**Sign-in:** the sign-in pages are not a work surface. On desktop they split into a deep-sage brand panel (mark, "KMPlus People", tagline, the brand-kit wave) and a light form panel; on mobile the brand panel becomes a short band above the form. Still no navy.

Main column is `--bg` with one paper work surface. Performance pages keep that surface, and the stat gauges above it, inside a 64rem column so a status or a button does not sit on the opposite edge of a wide window. The page title and its status sit on one line. Actions inside a panel sit together at the start of the panel footer.

**Org tree:** top-down Positions with connectors, collapse/expand, Grade + OrgUnit on the node, empty-seat badge, search by title or Person. Nodes 12px radius, not circles. Not a people-as-org chart.

**KPI tree:** forest for the open **KpiYear**. A node is a KpiItem (name, unit, actual/target, owner Person + Position). Roots = KpiItems on RootPositions. Direct edge = solid sage; Indirect = dashed. Click opens that Assignment’s **KpiPortfolio**. Not Impact/Output layers.

Phase screens: home worklist, Person list/profile plus CV review subpage, Organization Positions, My KPI / Team / KPI Admin / KPI tree, and the Timesheet week grid.

## Elevation and Depth

Cards and panels: radius 16px, `--shadow` (`0 10px 28px -14px rgba(34,34,34,.16)`), no hard outline. No glassmorphism. A detail sheet floats inset from the screen edge, with the same radius and shadow.

## Shapes

Controls radius 12px. Panels 16px. Status badges 6px. Org nodes use 12px radius, not circles.

## Components

- **Primary button:** sage fill, white label, height 44px.
- **Secondary:** paper, ink, 1.5px line border.
- **Ghost:** transparent, muted text.
- **Input:** paper, 38px, focus ring sage 18% mix.
- **Badge (status):** 24px tall, 6px radius, 13px medium label, 8px side padding. A flat 9–11% wash of the tone, a 1px inset ring of the same hue, and a 6px leading dot in the tone color. No shadow and no pill: a status is not a button, and the filled sage pill stays reserved for the active nav item. Label text uses the tone's dark foreground and stays at 5:1 or better. Draft / not started = neutral (`--wash`, muted text, `--line-strong` dot); in review / waiting for approval = accent; approved / agreed / active = success; returned / blocked / at risk = warning; rejected / off track = danger. Product code uses `Badge` / `StatusBadge` from `src/components/product`, not the raw coss badge.
- **Table:** paper, faint uppercase headers, teal for selected row and links. Body rows are at least 44px (cell padding 8px vertical), so a row holding a small button or a status badge matches a text-only row.
- **Review queue:** each parsed field is a row with Accept / Edit / Reject.
- **Stat gauge:** paper card, 16px radius, shadow, no outline. An open ring with the gap at the bottom. Sage when the fact is on track, warning when it is short, danger when it is overdue. The number sits in the ring. One target line and one detail sentence sit under it.
- **Sheet:** floats inset with a 16px radius on every corner; the footer's wash follows that radius, never square.
- **Form sheet:** every add and edit on a work surface opens one right-hand sheet (`src/components/product/FormSheet.tsx`): title, one line of context, fields, then a footer with Cancel and the primary action on the right and any destructive action (Delete, Remove) on the left behind a confirm. People who may only read get the same sheet with Close alone. No forms parked under lists.
- **Empty block:** the devl.dev First Project stack (`EmptyBlock`): one icon, one title, one sentence everyone reads, and the action only for people who may act.
- **Avatar:** initials on `--tint` in `--accent-hover`, 28px in lists and stacks (overlap 8px, paper ring, then "+N"), 32px in the team rail.
- **Project code chip:** 24px, 6px radius, `--tint` wash, Plex Mono 12px. It is an identifier, not a status.
- **"Yours" mark:** a project or row the viewer is on gets a light tint wash and a plain sage "You're on this" with a person-check icon, never a status badge (Projects and WorkItems have no status).
- **Register rows switch on container width, not viewport:** list panels are `@container`, and their column grids turn on at the panel's own width (catalogue at 64rem, work items at 42rem) so a sidebar or rail never crushes the name column.
- **Project page:** back link, code chip and name, then client · dates · a timing phrase read from the dates ("Ends in 3 months", never a status). One facts strip (on it today, work items, deliverables accepted with a meter, hours logged). Work items over deliverables (filter in a toolbar row under the panel header); a 320px team rail at lg with load bars, overload in warning ("60% · 120% total"), and per-person hours for Admin only.
- **Leave colours:** one quiet hue per kind, everywhere leave is drawn: cuti in sage (`--accent` 20% wash + 30% ring), sick in amber (`--warning` 22% + 35% ring), remote neutral (`--wash` + `--line-strong` ring), public holidays in `--tint`. Approved is a filled wash; waiting is a dashed outline on paper (in the kind's hue on the team grid, `--line-strong` on month chips); declined is never drawn on a calendar. Every leave picture carries one legend row under its pager, at every width. Lists mark the kind with a 36px tinted icon tile (palm tree, thermometer, house), never a coloured side bar.
- **Month calendar (Leave):** the devl.dev Month grid, Monday first: weekday caps header, day number (today in a filled sage circle, weekends faint), up to three chips then "+N more"; on phones the chips become dots. Choosing a day opens the request sheet starting that day.
- **Team who's-out grid (Leave requests, Admin):** the devl.dev Holidays grid: sticky name column, 28px day columns, a public-holiday strip kept apart from people's rows, one bar per request across its days (the kind's word from three days, a 6px kind dot on shorter or part-day bars), and an away count over any day when two or more people are away (remote never counts): `--warning-foreground` digits on a 24% amber wash, never white on amber. Opens scrolled to today, or to the month's first leave.
- **Leave rows:** kind and type, a status badge (waiting accent, approved success, declined danger), dates with working days, cover, note, letter link; on the decision page "Also away" (amber, cuti and sick) and "Remote then" (muted) as separate lines. Waiting requests group by start: this week or earlier, next week, later. Decisions sit on the row: Approve as paid (primary), Approve as unpaid, Decline and Withdraw behind confirms.
- **Home:** the devl.dev Home block on sage. Greeting, date and Position, one due line ("4 things need you"), then a row of outline shortcuts filtered by the sidebar's own visibility (one sideways-scrolling row on phones). A 1.6 : 1 grid: This week, then Needs you (count tiles, sentence, role line, action arrow) on the left; Today on the right (time-ordered entries with a dot per kind, an `--accent-2` now marker slotted between entries, then Coming up meetings on tint date rails with inline Accept / Decline). This week shows hours of 40 with a meter, one bar per day (today in `--accent`, others `--accent-2`, a past weekday with nothing logged gets an amber underline and amber label), month hours, and a next-leave line. Projects and latest Check-Ins sit two-up below. Phones read This week, Needs you, Today.
- **Project Admin:** a month at a glance with the receipts underneath (devl.dev Dashboard density, reduced to honest series). Title, one context line, then the Overview / Lists / Public holidays subnav (the People subnav pills). One facts strip: active projects, people staffed today (the over-100% count in warning), hours this month to today, leave to decide (a link). A 1.6 : 1 band: Hours by project this month as a bar list (code chip, name, 6px sage bar on a wash track scaled to the top project, hours and share; time with no project last in a neutral bar) beside Needs attention, the Home Needs you rows (count tile, sentence, names, action arrow) for leave waiting, people past 100%, last week's working days with no hours (cuti and sick and public holidays excused, remote not), and projects ending within 30 days. Then one report panel: underline tabs with counts (Projects, Staffing, Timesheet by person, Approved leave; short labels on phones so the row never scrolls), Download workbook (.xlsx) at the tab row's end, the month pager under the tabs for the two monthly reports, tables inside the panel with no second border, and one footer line saying what the workbook holds. Reports are read-only.
- **Scrollbars:** inner scrollers use a thin `--line-strong` thumb on a transparent track, never the platform's gray bar.
- **Toggle (pressed):** a sage wash (`--accent` 11% on paper) with `--accent-hover` text. Never the gray fill, which read as disabled.
- **Select:** an option whose value is empty (No project, No type) shows its own label, not the placeholder.
- **Timesheet week grid:** one paper surface, 16px radius, shadow. 56px hour rail; 48px per hour; hour rules in `--line`, half-hour rules at 45% of it. 07:00–19:00 visible, widened to the whole hour around any block. Sticky day header: weekday in caption caps, date number, the day's hours, then holiday chips (name plus origin mark) and approved leave chips. Today's date sits in a filled sage circle; the now line is `--accent-2` with a dot. Blocks are 8px-radius flat washes: Project time sage, non-project neutral `--wash`, a pending invite a dashed `--line-strong` outline on paper. Approved cuti or sick is a 135° warning hatch; remote is a label only. Drag on a column drafts a block (15-minute snap, never under 1 hour); the draft ghost turns warning when it overlaps. Your own blocks move by dragging the body (to another hour or another visible day) and resize from an 8px top or bottom edge; the same 15-minute snap and 1-hour floor apply, the lifted block turns warning when it would overlap, a refused save snaps it back with the reason, and a saved change offers Undo for 8 seconds at the end of the meter row. Alt+↑/↓ moves a focused block 15 minutes; add Shift to change its end. Invited meetings do not move. Drag and the Log time button open the same right-hand sheet. The corner cell above the hour rail repeats the week total. At xl a 280px This week rail lists hours by project and by type. Below 800px the grid becomes one day under a sticky meter and day strip.

The living specimen is `/design-system`. It shows the coss-ui set used by this app: buttons, fields, selects, badges, cards, tables, dialogs, floating sheets, and the rest of the installed primitives (accordion, alert, menu, tabs, toast, calendar, and the others in `src/components/coss`). Hover washes use the mint tint. `--accent` stays sage.

## Do's and Don'ts

**Do**

- Use the official KMPlus stacked mark in the top bar, with a collapsible sage sidebar.
- Keep people, org, CV, and KPI on light canvas.
- Use `--accent` (`#1A7870`) for primary actions.

**Don't**

- Use Akasia, Pelindo, Portaverse, InJourney, or Rinjani identity.
- Invent a plus-sign or node-person logo.
- Put salary, payslip, Project, or Staffing UI in Phase 1.
- Restyle from scratch when [design-system/kmplus.html](design-system/kmplus.html) already defines the token.
