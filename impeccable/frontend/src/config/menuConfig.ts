import type { NavMenuGroup } from '../types';


export const menuConfig: NavMenuGroup[] = [

  // ─── Entity 0:  ───
  {
    id: 'home',
    label: 'ภาพรวม',
    icon: 'home',
    path: '/',
  },

  // ─── Entity 1: จัดการออเดอร์และการสั่งซื้อ ───
  {
    id: 'procurement',
    label: 'จัดซื้อและรับเข้า',
    icon: 'package-check',
    items: [
      { id: 'spa', label: 'บันทึกสั่งซื้อพลอย', code: 'SPA', path: '/procurement/purchase' },
      { id: 'sra', label: 'บันทึกรับพลอย', code: 'SRA', path: '/procurement/receive' },
      { id: 'srb', label: 'บันทึกรับพลอย B', code: 'SRB', path: '/procurement/receive-b' },
      { id: 'sir', label: 'บันทึกคืนพลอย', code: 'SIR', path: '/procurement/return' },
    ],
  },

  // ─── Entity 2: ออเดอร์และการเบิก ───
  {
    id: 'orders',
    label: 'ออเดอร์และการเบิก',
    icon: 'clipboard-list',
    items: [
      { id: 'soa', label: 'บันทึกออเดอร์พลอย', code: 'SOA', path: '/orders/create' },
      { id: 'sia', label: 'บันทึกเบิกพลอย', code: 'SIA', path: '/orders/issue' },
      { id: 'sib', label: 'บันทึกเบิกพลอย B', code: 'SIB', path: '/orders/issue-b' },
      { id: 'sip', label: 'บันทึกเบิกพลอย งานซ่อม', code: 'SIP', path: '/orders/repair' },
      { id: 'sis', label: 'บันทึกส่งพลอย งานออเดอร์', code: 'SIS', path: '/orders/dispatch-order' },
    ],
  },

  // ─── Entity 3: ห้องตัวอย่าง ───
  {
    id: 'sample',
    label: 'ห้องตัวอย่าง',
    icon: 'flask-conical',
    items: [
      { id: 'ssa', label: 'บันทึกออเดอร์พลอย ห้องตัวอย่าง', code: 'SSA', path: '/sample/order' },
      { id: 'sim', label: 'บันทึกส่งพลอย ห้องตัวอย่าง', code: 'SIM', path: '/sample/dispatch' },
    ],
  },

  // ─── Entity 4: ตรวจสอบและนับสต็อก ───
  {
    id: 'inventory',
    label: 'ตรวจสอบและนับสต็อก',
    icon: 'bar-chart-3',
    items: [
      { id: 'check-dispatch', label: 'ตรวจสอบส่งพลอย งานออเดอร์', path: '/inventory/check-dispatch' },
      { id: 'check-sample', label: 'ตรวจสอบเบิก ห้องตัวอย่าง', path: '/inventory/check-sample' },
      { id: 'check-purchase', label: 'ตรวจสอบสั่งซื้อพลอย', path: '/inventory/check-purchase' },
      { id: 'audit', label: 'ตรวจนับสต็อกพลอย', path: '/inventory/audit' },
      { id: 'check-stock', label: 'ตรวจสอบสต็อกพลอย', path: '/inventory/check-stock' },
      { id: 'check-status', label: 'ตรวจสอบสถานะพลอย', path: '/inventory/check-status' },
    ],
  },

  // ─── Entity 5: สต็อกอะไหล่ ───
  {
    id: 'spare-parts',
    label: 'ระบบสต็อกอะไหล่',
    icon: 'wrench',
    items: [
      { id: 'sp-order', label: 'บันทึกออเดอร์อะไหล่', path: '/spare-parts/order' },
      { id: 'sp-issue', label: 'บันทึกเบิกอะไหล่', path: '/spare-parts/issue' },
      { id: 'sp-receive', label: 'บันทึกรับอะไหล่', path: '/spare-parts/receive' },
      { id: 'sp-pr', label: 'บันทึกขอสั่งซื้ออะไหล่', path: '/spare-parts/purchase-request' },
      { id: 'sp-po', label: 'บันทึกสั่งซื้ออะไหล่', path: '/spare-parts/purchase-order' },
      { id: 'sp-check-order', label: 'ตรวจสอบออเดอร์อะไหล่', path: '/spare-parts/check-order' },
      { id: 'sp-check-stock', label: 'ตรวจสอบสต็อกคงเหลือ', path: '/spare-parts/check-stock' },
      { id: 'sp-summary-stock', label: 'สรุปสต็อกคงเหลือ', path: '/spare-parts/summary-stock' },
      { id: 'sp-check-item', label: 'ตรวจสอบอะไหล่', path: '/spare-parts/check-item' },
      { id: 'sp-check-status', label: 'ตรวจสอบสถานะอะไหล่', path: '/spare-parts/check-status' },
    ],
  },
];
