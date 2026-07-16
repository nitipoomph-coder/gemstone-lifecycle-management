---
name: Gemstone Lifecycle Management
description: Data-dense jewelry factory ERP for sales, production, dispatch, and customer reporting.
colors:
  brand-500: "oklch(0.68 0.14 245)"
  brand-600: "oklch(0.78 0.11 245)"
  accent-500: "oklch(0.72 0.14 200)"
  surface-0: "oklch(0.18 0.03 250)"
  surface-1: "oklch(0.22 0.03 250)"
  surface-2: "oklch(0.28 0.03 250)"
  surface-800: "oklch(0.12 0.02 250)"
  surface-900: "oklch(0.08 0.02 250)"
  text-primary: "oklch(0.95 0.01 250)"
  text-secondary: "oklch(0.80 0.02 250)"
  text-tertiary: "oklch(0.65 0.03 250)"
  text-inverse: "oklch(0.15 0.02 250)"
  border-light: "oklch(0.28 0.03 250)"
  border-default: "oklch(0.34 0.03 250)"
  border-strong: "oklch(0.42 0.03 250)"
  sidebar: "oklch(0.16 0.03 250)"
  sidebar-hover: "oklch(0.20 0.03 250)"
  sidebar-accent: "oklch(0.68 0.14 245)"
  table-header: "oklch(0.22 0.06 250)"
  table-row-alt: "oklch(0.20 0.03 250)"
  table-footer: "oklch(0.25 0.04 250)"
  success-500: "oklch(0.70 0.16 150)"
  warning-500: "oklch(0.75 0.16 80)"
  danger-500: "oklch(0.62 0.20 25)"
  info-500: "oklch(0.70 0.15 220)"
  chart-1: "oklch(0.65 0.18 45)"
  chart-2: "oklch(0.70 0.16 150)"
  chart-3: "oklch(0.58 0.16 300)"
  chart-4: "oklch(0.65 0.18 340)"
  chart-5: "oklch(0.62 0.20 25)"
  chart-6: "oklch(0.72 0.14 200)"
typography:
  display:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  headline:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  title:
    fontFamily: "Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-500}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "36px"
  filter-chip:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  panel:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  table-header:
    backgroundColor: "{colors.table-header}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.label}"
    padding: "10px 12px"
---

# Design System: Gemstone Lifecycle Management

## Overview

**Creative North Star: "The Precision Control Room"**

Gemstone Lifecycle Management is a premium factory control surface for jewelry operations. It must feel precise, authoritative, and efficient, with the confidence of a business intelligence tool and the specificity of a real production and sales floor system.

The interface is intentionally data-dense. Users are expert internal staff who need to find a customer, order, quantity, amount, shipment state, or production status in under 5 seconds. Density is useful here when hierarchy, spacing, alignment, and state are disciplined.

The system rejects Excel-like rigidity, playful consumer styling, generic SaaS hero dashboards, glassmorphism, decorative gradients, and charts that compete with the table. Sales screens should be filter-first and table-first. Charts may support decisions, but they must never become decoration.

Key Characteristics:
- Compact, readable, and operational.
- Same vocabulary across Sales, Production, PO, and Dispatch.
- Three themes, one product language: Modern Dark, Dark Gold, and Royal White.
- Status and filter state must be clearer than visual flair.

## Colors

The palette is a restrained control-room system: deep blue-indigo for primary action, calm neutral surfaces for dense data, and functional status colors for business meaning.

Primary:
- **Control Blue** (`oklch(0.68 0.14 245)`): primary buttons, active navigation, selected filters, focus states, and important linked identifiers such as Order No.
- **Action Blue Lift** (`oklch(0.78 0.11 245)`): hover and active emphasis for primary controls.

Accent:
- **Analytic Cyan** (`oklch(0.72 0.14 200)`): secondary analytical emphasis, comparison markers, and non-destructive information highlights.

Neutral:
- **Operational Canvas** (`oklch(0.18 0.03 250)`): default dark workspace background.
- **Panel Surface** (`oklch(0.22 0.03 250)`): cards, toolbars, filter panels, and table containers.
- **Raised Surface** (`oklch(0.28 0.03 250)`): hover rows, selected secondary controls, dropdown surfaces.
- **Primary Text** (`oklch(0.95 0.01 250)`): core labels and high-priority numbers.
- **Secondary Text** (`oklch(0.80 0.02 250)`): metadata, sublabels, customer codes, dates, and helper text.
- **Strong Border** (`oklch(0.42 0.03 250)`): table separation, active panels, and structural boundaries.

Status:
- **Success Green** (`oklch(0.70 0.16 150)`): shipped, completed, healthy, and confirmed states.
- **Warning Gold** (`oklch(0.75 0.16 80)`): partial, pending attention, and approaching due states.
- **Danger Red** (`oklch(0.62 0.20 25)`): late, overdue, error, and blocked states.
- **Info Blue** (`oklch(0.70 0.15 220)`): open, processing, and neutral informational state.

Named Rules:
**The Meaning Before Color Rule.** A color must map to a known domain meaning: action, selection, status, process, or series. Do not introduce a new color just because a chart needs variety.

**The Sales Restraint Rule.** Sales dashboards use customer, order, amount, quantity, shipment, and item language. Do not use production-stage colors or labels in Sales unless the user explicitly enters a production detail view.

## Typography

**Display Font:** Roboto, sans-serif
**Body Font:** Roboto, sans-serif
**Logo Font:** Cinzel, serif

Character: typography should feel crisp, compact, and managerial. It should support scanning across dense rows rather than marketing impact.

Hierarchy:
- **Display** (700, 1.5rem, 1.2): page titles, dashboard names, and high-level report labels.
- **Headline** (700, 1.125rem, 1.3): panel titles and major table/report sections.
- **Title** (600, 1rem, 1.35): card headings, filter group names, and modal titles.
- **Body** (400, 0.875rem, 1.5): table cells, descriptions, normal UI labels, and dense operational content.
- **Label** (700, 0.75rem, 0.08em): table headers, compact badges, column labels, and uppercase metadata.

Named Rules:
**The No Hero Type Rule.** Use large type only for true page titles. Dashboards, tables, filters, and analytics panels should stay compact so more operational data remains visible.

**The Numeric Clarity Rule.** Quantities, percentages, and amounts must align consistently. Right-align numeric table cells and keep currency/quantity formats stable across screens.

## Elevation

The system is layered more by tone, border, and state than by heavy shadows. Panels sit on surface color changes; dropdowns, popovers, menus, modals, and floating pagination may use shadows to clarify stacking. Resting dashboards should not feel floaty.

Shadow Vocabulary:
- **Panel Ambient** (`0 4px 16px -4px rgba(0, 0, 0, 0.04)`): optional low emphasis for repeated cards or KPI tiles.
- **Dropdown Layer** (`0 12px 40px rgba(0, 0, 0, 0.15)`): menus, multi-select dropdowns, date pickers, and popovers.
- **Modal Layer** (`0 32px 64px rgba(0, 0, 0, 0.28)`): dialogs and blocking workflows.

Named Rules:
**The Flat By Default Rule.** A dense business screen should look stable at rest. Use borders and surface contrast first; add shadow only when an element must sit above the work surface.

## Components

Buttons:
- **Shape:** compact rounded rectangle, usually 8px radius.
- **Primary:** Control Blue background, inverse text, 36px height, icon plus label when the command benefits from recognition.
- **Secondary:** surface background, border, primary text, same height as primary.
- **Ghost:** transparent background, text-secondary at rest, surface hover.
- **Focus:** visible brand outline or ring. Focus must be keyboard-visible across all themes.

Filters and Selectors:
- **Style:** filters live in a compact toolbar or panel above the table/report.
- **Months:** use drilldown or multi-select dropdown patterns when the list is long; avoid large select-all controls that dominate the layout.
- **Years:** treat year as a deliberate report context. If a year is fixed by the page/query, show it as selected state rather than a noisy clickable chip.
- **Customer Groups:** show group name and included customer codes clearly. A selected group must be visually stronger than unselected groups.

Chips:
- **Style:** small radius, surface background, border, optional colored dot for category identity.
- **State:** active chips use brand tint and stronger border; inactive chips stay quiet.
- **Use:** customer groups, market, status, type, and saved filters.

Cards / Containers:
- **Corner Style:** 8px to 16px depending on scale; repeated table-adjacent panels should stay tighter.
- **Background:** surface-1 for panels, surface-2 for selected or hovered subareas.
- **Border:** one-pixel border-light or border-default. Use border-strong only for active/selected structures.
- **Internal Padding:** 12px to 24px. Dashboards can be dense; avoid oversized decorative cards.

Inputs / Fields:
- **Style:** surface-1 background, border-default outline, 8px radius, body text.
- **Focus:** brand border or ring; do not rely on color alone.
- **Disabled:** reduce opacity and keep text readable enough to explain state.
- **Error:** danger color plus clear message or state label.

Navigation:
- **Sidebar:** accordion hierarchy, active accent, compact row height, and consistent icons from lucide-react.
- **Route Names:** menu labels must describe the business task, not the internal implementation. Example: Customer Sales Analysis, Top Order Lines, Customer Report Matrix.
- **Active State:** preserve active sidebar state when moving from overview to detail pages.

Tables:
- **Structure:** sticky header where practical, clear column alignment, right-aligned numbers, compact rows, and visible pagination.
- **Sales Detail:** Order No, Item No, Ord Date, Cust Due, Customer, Brand, Type, Ord Qty, Shipped, Amount, Status, Market, Actions.
- **Status:** Sales uses Open, Partial, Shipped, Late. Do not show Casting, Polish, QC, or production-stage status in Sales tables.
- **Links:** Order No and Item No can be action links, but must look like operational identifiers rather than marketing links.

## Do's and Don'ts

Do:
- Use existing tokens from `Jewelry Factory System/frontend/src/index.css`.
- Keep Sales pages focused on customer groups, orders, amounts, quantities, shipped quantities, item type, and item lines.
- Keep filters compact, visible, and close to the table they control.
- Use table-first layouts when users need exact order-level data.
- Use charts only when they answer a specific business question better than a table.
- Keep typography, button sizing, spacing, and border radius consistent across all dashboards.
- Support Thai labels and mixed Thai/English operational data without breaking layout.

Don't:
- Do not copy the Production Dashboard structure into Sales.
- Do not use production-stage labels or colors in Sales overview pages.
- Do not create hero sections, glass panels, gradient text, or oversized metric cards for operational dashboards.
- Do not hardcode one-off chart colors when tokenized chart/status colors already exist.
- Do not hide exact Order No or Item No behind summary-only views.
- Do not make filters so large that they push the table or key report below the fold.
- Do not introduce a new font unless the whole system is intentionally migrating.