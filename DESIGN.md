---
version: alpha
name: KMPlus People Design System
description: Visual contract from design-system/kmplus.html. Quiet sage SaaS. Never Akasia or client brands.
colors:
  bg: "#FAFAFA"
  paper: "#FFFFFF"
  ink: "#222222"
  muted: "#5E5E5E"
  faint: "#757575"
  line: "#DEDEDE"
  accent: "#1E857C"
  accent-2: "#009D9A"
  tint: "#EDFFFE"
  success: "#12A864"
  warning: "#C9891A"
  danger: "#C4353A"
  info: "#0673C0"
  on-accent: "#FFFFFF"
typography:
  display:
    fontFamily: Inter
    fontSize: 42px
    fontWeight: 500
    lineHeight: 1.1
  heading-1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.2
  heading-2:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Inter
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
    height: 36px
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

KMPlus People follows the internal KMPlus kit at [design-system/kmplus.html](design-system/kmplus.html) (source: kmplusconsulting.com computed styles, 14 Sep 2026). Quiet sage SaaS. Light surfaces. Inter. Sage buttons.

**Logo:** stacked **KM / PLUS** with five radiating bars. Use [brand/kmplus-logo-dark.svg](brand/kmplus-logo-dark.svg) on the light header. Do not invent a replacement mark.

## Colors

- **Canvas** `--bg` `#FAFAFA`: page background.
- **Paper** `--paper` `#FFFFFF`: cards, tables, inputs.
- **Ink** `--ink` `#222222`: body text.
- **Accent** `--accent` `#1E857C`: primary actions, links, selected nav.
- **Accent 2** `--accent-2` `#009D9A`: text accents, progress fill.
- **Tint** `--tint` `#EDFFFE`: mint wash, selected row, badge-neutral wash.
- Semantic: success `#12A864`, warning `#C9891A`, danger `#C4353A`, info `#0673C0`.

Do not use Pelindo navy, Portaverse blue, or dark `#0B2131` chrome on product screens. The marketing hero is dark; this app is light.

## Typography

Inter for all UI (display, headings, body). IBM Plex Mono for hex labels and code only. No Fraunces, Lora, or other display serifs in the app.

## Layout

Collapsible left sidebar on `--paper` with 1.5px `--line`. Expanded: icon + label, sage filled pill for the active item. Collapsed: icon rail (~72px), tooltips. Default expanded on desktop, collapsed on small viewports. User can pin collapsed. Quiet sage SaaS — not navy chrome, not a heavy dashboard shell.

**Top bar:** official KM/PLUS mark, product name People, tenant `kmplus`, role switcher. No Project or payslip.

**Sidebar groups:** Home, People, Organization, then Performance (My KPI, Team, KPI Admin, KPI tree). CV review is a People subpage, not a top-level item.

Main column is `--bg` with one paper work surface.

**Org tree:** top-down Positions with connectors, collapse/expand, Grade + OrgUnit on the node, empty-seat badge, search by title or Person. Nodes 12px radius, not circles. Not a people-as-org chart.

**KPI tree:** forest for the open cycle. A node is a KpiItem (name, unit, actual/target, owner Person + Position). Roots = KpiItems on RootPositions. Direct edge = solid sage; Indirect = dashed. Click opens that Assignment’s KpiSet. Not Impact/Output layers.

Phase screens: home worklist, Person list/profile plus CV review subpage, Organization Positions, My KPI / team / KPI Admin / KPI tree.

## Elevation and Depth

Cards and panels: 1.5px `--line` border, radius 16px, optional `--shadow` (`0 10px 28px -14px rgba(34,34,34,.16)`). No glassmorphism.

## Shapes

Controls radius 12px. Panels 16px. Status badges are pills. Org nodes use 12px radius, not circles.

## Components

- **Primary button:** sage fill, white label, height 36px.
- **Secondary:** paper, ink, 1.5px line border.
- **Ghost:** transparent, muted text.
- **Input:** paper, 38px, focus ring sage 18% mix.
- **Badge:** draft = tint/muted; in review = accent wash; done = success; blocked = warning; risk = danger.
- **Table:** paper, faint uppercase headers, teal for selected row and links.
- **Review queue:** each parsed field is a row with Accept / Edit / Reject.

## Do's and Don'ts

**Do**

- Use the official KMPlus stacked mark in the top bar, with a collapsible sage sidebar.
- Keep people, org, CV, and KPI on light canvas.
- Copy CTA green `#1E857C` for primary actions.

**Don't**

- Use Akasia, Pelindo, Portaverse, InJourney, or Rinjani identity.
- Invent a plus-sign or node-person logo.
- Put salary, payslip, Project, or Staffing UI in Phase 1.
- Restyle from scratch when [design-system/kmplus.html](design-system/kmplus.html) already defines the token.
