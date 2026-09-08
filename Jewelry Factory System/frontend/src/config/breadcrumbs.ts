/**
 * Centralized Breadcrumb Configuration
 * 
 * Provides type-safe, centralized breadcrumbs across all modules in the application.
 * Module names and paths are standardized here to avoid redundant branding or inconsistent hierarchies.
 */

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export const BREADCRUMBS = {
  // ── Overview & Dashboard ──
  DASHBOARD: [
    { label: 'Factory Overview' },
  ] as BreadcrumbItem[],

  DASHBOARD_DETAIL: (metricTitle: string): BreadcrumbItem[] => [
    { label: 'Factory Overview', path: '/' },
    { label: metricTitle },
  ],

  // ── Sales Analytics ──
  SALES_DASHBOARD: [
    { label: 'Sales Analytics' },
    { label: 'Sales Dashboard' },
  ] as BreadcrumbItem[],

  SALES_SUMMARY: [
    { label: 'Sales Analytics' },
    { label: 'Sales Summary' },
  ] as BreadcrumbItem[],

  CUSTOMER_REPORT_MATRIX: [
    { label: 'Sales Analytics' },
    { label: 'Customer Report Matrix' },
  ] as BreadcrumbItem[],

  ORDER_TRENDS: [
    { label: 'Sales Analytics' },
    { label: 'Order Trends' },
  ] as BreadcrumbItem[],

  TOP_ORDERS_GALLERY: [
    { label: 'Sales Analytics' },
    { label: 'Top Item Gallery' },
  ] as BreadcrumbItem[],

  TOP_ORDERS_ANALYTICS: [
    { label: 'Sales Analytics' },
    { label: 'Top Items Qty' },
  ] as BreadcrumbItem[],

  SALES_CUSTOMER_GROUP_DETAIL: [
    { label: 'Sales Analytics' },
    { label: 'Order Trends', path: '/dashboard/customer/trends' },
    { label: 'Order List' },
  ] as BreadcrumbItem[],

  CUSTOMER_DASHBOARD_TAB: (activeTab: string): BreadcrumbItem[] => [
    { label: 'Sales Analytics' },
    {
      label: activeTab === 'matrix'
        ? 'Customer Report Matrix'
        : activeTab === 'trends'
        ? 'Order Trends'
        : 'Sales Summary',
    },
  ],

  // ── Production & Orders ──
  PRODUCTION_SUMMARY: [
    { label: 'Production' },
    { label: 'Production Summary' },
  ] as BreadcrumbItem[],

  PRODUCTION_FORECAST: [
    { label: 'Production' },
    { label: 'Production Forecast' },
  ] as BreadcrumbItem[],

  PO_TRACKER: [
    { label: 'Production' },
    { label: 'PO Tracker' },
  ] as BreadcrumbItem[],

  FBE_ORDER_TRACK: [
    { label: 'Production' },
    { label: 'FBE Order Tracker' },
  ] as BreadcrumbItem[],

  ORDER_DETAIL: (pageTitle: string): BreadcrumbItem[] => [
    { label: 'Production' },
    { label: 'PO Tracker', path: '/po-tracker' },
    { label: pageTitle },
  ],

  ITEM_DETAIL: (itemNo: string): BreadcrumbItem[] => [
    { label: 'Production' },
    { label: 'PO Tracker', path: '/po-tracker' },
    { label: itemNo },
  ],

  // ── Subcontract Management ──
  VENDOR_PERFORMANCE: [
    { label: 'Subcontract Management' },
    { label: 'Vendor Performance Dashboard' },
  ] as BreadcrumbItem[],

  // ── Documents (Procurement, Requisition, Sample) ──
  DOCUMENT: (groupLabel: string, itemLabel: string, docType: string): BreadcrumbItem[] => [
    { label: groupLabel },
    { label: `${itemLabel} (${docType})` },
  ],

  // ── Dynamic Placeholder Pages ──
  PLACEHOLDER: (groupLabel: string, displayTitle: string): BreadcrumbItem[] => [
    { label: groupLabel },
    { label: displayTitle },
  ],
};
