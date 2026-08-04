# Dashboard Documentation

## Scope
This file owns dashboard and report-screen context that used to live inside `claude.md`.

Covered surfaces:
- Main production dashboard: `Dashboard.tsx`, `/`
- Sales/quantity summary dashboard: `CustomerDashboard.tsx`, `/dashboard/customer`, `/dashboard/qty`
- Matrix report: `CustomerReportPage.tsx`, `/dashboard/customer-report`
- Top item gallery: `TopOrdersGalleryPage.tsx`, `/dashboard/top-orders`
- Sales dashboard route: `SalesDashboard.tsx`, `/dashboard/sales`

Sales menu naming and breadcrumb rules live in `sales-menu.md`.

## Dashboard API Endpoints
Protected dashboard endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dashboard` | Main dashboard stats |
| GET | `/api/dashboard/detail/:section` | Dashboard drilldown |
| GET | `/api/dashboard/sales-summary` | Sales by rep/year |
| GET | `/api/dashboard/customer-summary` | Sales and quantity by customer/year/month |

Frontend service ownership:
- `src/services/dashboardAPI.ts`: dashboard core, available years, dashboard cards, card detail, sales summary compatibility exports
- `src/services/customerSummaryAPI.ts`: customer summary fetch for `/api/dashboard/customer-summary`
- `src/services/customerSalesAPI.ts`: sales customer groups, sales orders, top items, shared sales filters
- `src/services/itemYearlySummaryAPI.ts`: item yearly and item/customer yearly comparison endpoints

## Data Hygiene
Dashboard statistics must filter out inactive/sample/dead orders where the business logic requires active order reporting.

Active order prefixes historically used for dashboard accuracy:
- `BBC`, `BBQ`, `BBD`, `BBI`, `BBF`, `BBP`, `BBT`, `BBX`, `BBK`, `BBR`, `BBL`, `BBS`, `BBE`

Do not include old inactive prefixes in dashboard totals unless the user explicitly asks for an audit or historical raw-data view.

## CustomerDashboard.tsx, Sales Summary and Quantity Summary
`CustomerDashboard.tsx` is the chart-first summary surface for customer performance.

Routes:
- `/dashboard/customer`: `Sales Summary`
- `/dashboard/qty`: `Quantity Summary`

Behavior:
- Uses one component with a `metric` prop: `amount` or `qty`
- First screen is chart-focused, with compact ERP controls above the chart
- Supports year selection, month selection, customer-group selection, view mode, and series mode
- Customer group mapping must come from `src/config/customerGroups.ts`
- The `Matrix` button must carry current context into `CustomerReportPage.tsx` via query params: `metric`, `view`, `years`, `months`, `groups`
- The Matrix page must initialize immediately from those params so users see the same context after navigation

UI expectations:
- Compact internal-tool layout, not a landing page
- Use `Topbar`, existing theme variables, and restrained enterprise controls
- Avoid oversized hero sections, marketing cards, heavy gradients, and decorative motion

## CustomerReportPage.tsx, Matrix Report
`CustomerReportPage.tsx` is the full-screen dense matrix report for customer-by-month/year analysis.

Routes:
- Sales matrix: `/dashboard/customer-report?metric=amount`
- Quantity matrix: `/dashboard/customer-report?metric=qty`

View modes:
- `YTD`: year blocks with months and year total
- `Monthly`: month blocks with years and optional growth columns

Table UX rules:
- First screen must be the data table/report surface
- Dense ERP/Excel-style table, not a card grid
- Header and filter rows stay compact
- Current month highlight should continue through that month and the current-year total
- Grand total row uses the same background as the table header, except current-month/current-total cells keep the current highlight
- Data values should use one neutral text color; only Growth may use semantic direction color as a secondary cue

Search UX:
- Force uppercase while typing
- Do not refresh/filter on every keypress
- Apply search only on Enter
- Escape restores the last applied search value

Growth UX:
- Growth is optional
- Users may remove all Growth comparisons; the system must not auto-add one back after removal
- `+Growth` sits inline beside existing Growth controls and moves along as comparisons are added
- Growth columns are named `Change Amount` and `Growth Rate`
- Positive values use `+`; negative values use a minus sign
- Percent uses 1 decimal place, for example `+23.8%`
- Growth numbers are right-aligned with tabular numbers
- Do not communicate direction by color alone

Export:
- CSV/Excel export must use the same column names and growth formatting as the visible table
- Column/render/filter/export behavior should be driven by shared configuration where practical

## TopOrdersGalleryPage.tsx
Top item gallery is a product-image and ranking surface for best-selling/top ordered items.

Design rules:
- Enterprise BI layout, not marketing/gallery decoration
- Product images should be inspectable and useful
- Use existing theme variables and restrained cards/panels
- Avoid mock sales numbers when real backend data is expected

## Loading and State Rules
Whenever dashboard boxes, charts, or table areas are added/changed, update loading skeletons for the same content area.

Loading skeletons should cover only the content outlet they replace. Do not skeleton-load the sidebar/topbar unnecessarily.

## Boundary Rule
Dashboard and Sales report screens are not production tracking screens. Do not route users into PO Tracker or production-stage detail unless the user explicitly asks for production/order tracking navigation.
