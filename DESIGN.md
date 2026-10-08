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
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: 400
rounded:
  sm: 4px
  md: 12px
  lg: 16px
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

**Logo:** stacked **KM / PLUS** with five radiating bars. Use [brand/kmplus-logo-dark.svg](brand/kmplus-logo-dark.svg) on the light header. Do not invent a replacement mark.

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

Plus Jakarta Sans for all UI (display, headings, body). IBM Plex Mono for hex labels and code only. No Fraunces, Lora, or other display serifs in the app.

## Layout

Collapsible left sidebar on `--paper` with 1.5px `--line`. Expanded: icon + label, sage filled pill for the active item. Collapsed: icon rail (~72px), tooltips. Default expanded on desktop, collapsed on small viewports. User can pin collapsed. Quiet sage SaaS — not navy chrome, not a heavy dashboard shell.

**Top bar:** official KM/PLUS mark, product name People, the signed-in Person and their access (e.g. "Employee · Admin"), Reminders. No payslip.

**Sidebar groups:** Home, People, Organization; Performance (My KPI, Team KPIs, KPI Admin, KPI Tree); Work (Projects, Timesheet, Leave, and for Admin: Leave requests, Project Admin). CV review is a People subpage, not a top-level item. See ADR-0010.

**Sign-in:** the sign-in pages are not a work surface. On desktop they split into a deep-sage brand panel (mark, "KMPlus People", tagline, the brand-kit wave) and a light form panel; on mobile the brand panel becomes a short band above the form. Still no navy.

Main column is `--bg` with one paper work surface. Performance pages keep that surface, and the stat gauges above it, inside a 64rem column so a status or a button does not sit on the opposite edge of a wide window. The page title and its status sit on one line. Actions inside a panel sit together at the start of the panel footer.

**Org tree:** top-down Positions with connectors, collapse/expand, Grade + OrgUnit on the node, empty-seat badge, search by title or Person. Nodes 12px radius, not circles. Not a people-as-org chart.

**KPI tree:** forest for the open **KpiYear**. A node is a KpiItem (name, unit, actual/target, owner Person + Position). Roots = KpiItems on RootPositions. Direct edge = solid sage; Indirect = dashed. Click opens that Assignment’s **KpiPortfolio**. Not Impact/Output layers.

Phase screens: home worklist, Person list/profile plus CV review subpage, Organization Positions, My KPI / Team / KPI Admin / KPI tree.

## Elevation and Depth

Cards and panels: radius 16px, `--shadow` (`0 10px 28px -14px rgba(34,34,34,.16)`), no hard outline. No glassmorphism. A detail sheet floats inset from the screen edge, with the same radius and shadow.

## Shapes

Controls radius 12px. Panels 16px. Status badges are pills. Org nodes use 12px radius, not circles.

## Components

- **Primary button:** sage fill, white label, height 44px.
- **Secondary:** paper, ink, 1.5px line border.
- **Ghost:** transparent, muted text.
- **Input:** paper, 38px, focus ring sage 18% mix.
- **Badge:** pill, 32px tall, soft shadow so a wash still separates from the canvas. Draft = tint/muted; in review = accent wash; done = success; blocked = warning; risk = danger.
- **Table:** paper, faint uppercase headers, teal for selected row and links.
- **Review queue:** each parsed field is a row with Accept / Edit / Reject.
- **Stat gauge:** paper card, 16px radius, shadow, no outline. An open ring with the gap at the bottom. Sage when the fact is on track, warning when it is short, danger when it is overdue. The number sits in the ring. One target line and one detail sentence sit under it.

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
