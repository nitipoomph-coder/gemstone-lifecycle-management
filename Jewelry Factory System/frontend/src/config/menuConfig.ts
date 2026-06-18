import type { NavMenuGroup } from '../types';


export const menuConfig: NavMenuGroup[] = [

  // ─── Entity 0:  ───
  {
    id: 'home',
    label: 'Dashboard',
    icon: 'Home',
    path: '/',
    accentColor: 'var(--color-brand-500)',
    roles: ['admin'],
  },

  // ─── Sales Dashboards ───
  {
    id: 'sales-dashboard',
    label: 'Sales Analytics',
    icon: 'trending-up',
    accentColor: 'var(--color-success-500)',
    roles: ['admin', 'sales'],
    items: [
      //{ id: 'dash-sales', label: 'Sales by Employee', path: '/dashboard/sales' },
      { id: 'dash-cust', label: 'Sales by Customer', path: '/dashboard/customer' },
    ],
  },

  // ─── Entity 1: Procurement & Receiving ───
  {
    id: 'procurement',
    label: 'Procurement & Receiving',
    icon: 'package-check',
    accentColor: 'var(--color-accent-500)',
    roles: ['admin'],
    items: [
      { id: 'spa', label: 'Gem Purchase Order', code: 'SPA', path: '/procurement/purchase' },
      { id: 'sra', label: 'Gem Receipt', code: 'SRA', path: '/procurement/receive' },
      { id: 'srb', label: 'Gem Receipt B', code: 'SRB', path: '/procurement/receive-b' },
      { id: 'sir', label: 'Gem Return', code: 'SIR', path: '/procurement/return' },
    ],
  },

  // ─── Entity 2: Orders & Issues ───
  {
    id: 'orders',
    label: 'Orders & Issues',
    icon: 'clipboard-list',
    accentColor: 'var(--color-info-500)',
    roles: ['admin'],
    items: [
      { id: 'soa', label: 'Gem Order', code: 'SOA', path: '/orders/create' },
      { id: 'sia', label: 'Gem Issue', code: 'SIA', path: '/orders/issue' },
      { id: 'sib', label: 'Gem Issue (Type B)', code: 'SIB', path: '/orders/issue-b' },
      { id: 'sip', label: 'Gem Issue for Repair', code: 'SIP', path: '/orders/repair' },
      { id: 'sis', label: 'Gem Dispatch for Order', code: 'SIS', path: '/orders/dispatch-order' },
    ],
  },

  // ─── Entity 3: Sample Room ───
  {
    id: 'sample',
    label: 'Sample Department',
    icon: 'flask-conical',
    accentColor: 'var(--color-success-500)',
    roles: ['admin'],
    items: [
      { id: 'ssa', label: 'Sample Request', code: 'SSA', path: '/sample/order' },
      { id: 'sim', label: 'Sample Dispatch', code: 'SIM', path: '/sample/dispatch' },
    ],
  },

  // ─── Entity 4: Inventory Control ───
  {
    id: 'inventory',
    label: 'Inventory Control',
    icon: 'bar-chart-3',
    accentColor: 'var(--color-danger-500)',
    roles: ['admin'],
    items: [
      { id: 'check-dispatch', label: 'Check Dispatch for Order', path: '/inventory/check-dispatch' },
      { id: 'check-sample', label: 'Check Sample Issue', path: '/inventory/check-sample' },
      { id: 'check-purchase', label: 'Purchase Verification', path: '/inventory/check-purchase' },
      { id: 'audit', label: 'Stock Take', path: '/inventory/audit' },
      { id: 'check-stock', label: 'Inventory Balance', path: '/inventory/check-stock' },
      { id: 'check-status', label: 'Gem Status Tracking', path: '/inventory/check-status' },
    ],
  },

  // ─── PO Tracker ───
  {
    id: 'order-tracker',
    label: 'PO Tracker',
    icon: 'layout-list',
    accentColor: 'var(--color-brand-600)',
    roles: ['admin'],
    items: [
      { id: 'ot-list', label: 'Pending Orders', path: '/po-tracker' },
    ],
  },

  // ─── Entity 5: Spare Parts ───
  {
    id: 'spare-parts',
    label: 'Spare Parts',
    icon: 'wrench',
    accentColor: 'var(--color-proc-plating)',
    roles: ['admin'],
    items: [
      { id: 'sp-order', label: 'Spare Parts Order', path: '/spare-parts/order' },
      { id: 'sp-issue', label: 'Spare Parts Issue', path: '/spare-parts/issue' },
      { id: 'sp-receive', label: 'Spare Parts Receive', path: '/spare-parts/receive' },
      { id: 'sp-pr', label: 'Spare Parts Purchase Request', path: '/spare-parts/purchase-request' },
      { id: 'sp-po', label: 'Spare Parts Purchase Order', path: '/spare-parts/purchase-order' },
      { id: 'sp-check-order', label: 'Check Spare Parts Order', path: '/spare-parts/check-order' },
      { id: 'sp-check-stock', label: 'Spare Parts Inventory Balance', path: '/spare-parts/check-stock' },
      { id: 'sp-summary-stock', label: 'Summary Spare Parts Stock', path: '/spare-parts/summary-stock' },
      { id: 'sp-check-item', label: 'Check Spare Parts', path: '/spare-parts/check-item' },
      { id: 'sp-check-status', label: 'Spare Parts Status Tracking', path: '/spare-parts/check-status' },
    ],
  },
];
