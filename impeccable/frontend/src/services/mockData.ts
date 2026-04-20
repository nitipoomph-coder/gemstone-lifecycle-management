import type { DashboardStat, RecentDocument, PendingTask, DocumentListItem, SIRDocument } from '../types';

// ============================================
// Mock Dashboard Data
// ============================================
export const mockStats: DashboardStat[] = [
  { label: 'รอรับพลอย', value: '23', change: '↑ 12% จากเดือนก่อน', direction: 'up', icon: 'package-check', variant: 'procurement' },
  { label: 'ออเดอร์ค้าง', value: '147', change: '↓ 5% จากเดือนก่อน', direction: 'down', icon: 'clipboard-list', variant: 'orders' },
  { label: 'งานผลิตวันนี้', value: '38', change: '↑ 8% จากเดือนก่อน', direction: 'up', icon: 'factory', variant: 'production' },
  { label: 'มูลค่าสต๊อก (฿)', value: '2.4M', change: '↑ 3% จากเดือนก่อน', direction: 'up', icon: 'bar-chart-3', variant: 'stock' },
];

export const mockRecentDocs: RecentDocument[] = [
  { id: '1', docNumber: 'SPA2604001', type: 'สั่งซื้อพลอย', date: '09/04/2569', operator: 'สมชาย ว.', status: 'pending' },
  { id: '2', docNumber: 'SRA2604012', type: 'รับพลอย', date: '08/04/2569', operator: 'วิภา ก.', status: 'complete' },
  { id: '3', docNumber: 'SIS2604008', type: 'ส่งพลอยงานออเดอร์', date: '08/04/2569', operator: 'ประยุทธ์ ส.', status: 'processing' },
  { id: '4', docNumber: 'SIR2604003', type: 'คืนพลอย', date: '07/04/2569', operator: 'สมชาย ว.', status: 'complete' },
  { id: '5', docNumber: 'SOA2604045', type: 'ออเดอร์พลอย', date: '07/04/2569', operator: 'นภา จ.', status: 'pending' },
];

export const mockPendingTasks: PendingTask[] = [
  { id: '1', title: 'พลอยรอตรวจรับจาก Supplier', meta: 'BRIGHT FUTURE GEMS — เกินกำหนด 2 วัน', count: 5, priority: 'urgent' },
  { id: '2', title: 'ออเดอร์รอ Confirm', meta: 'ลูกค้า 3 ราย — ครบกำหนดพรุ่งนี้', count: 12, priority: 'urgent' },
  { id: '3', title: 'เบิกพลอยรอตรวจสอบ', meta: 'แผนกเจียระไน — ขอเบิกเมื่อวาน', count: 8, priority: 'normal' },
  { id: '4', title: 'ห้องตัวอย่างรอส่งพลอย', meta: 'SSA2604002 — ขอเมื่อ 2 วันก่อน', count: 3, priority: 'normal' },
  { id: '5', title: 'นับสต๊อกประจำเดือน', meta: 'กำหนด 15/04/2569', count: null, priority: 'low' },
];

// ============================================
// Mock SIR Data
// ============================================
export const mockSIRDocList: DocumentListItem[] = [
  { docNumber: 'SIR2603107', date: '31/03' },
  { docNumber: 'SIR2603108', date: '31/03' },
  { docNumber: 'SIR2603109', date: '30/03' },
  { docNumber: 'SIR2603110', date: '29/03' },
  { docNumber: 'SIR2603111', date: '28/03' },
  { docNumber: 'SIR2603112', date: '27/03' },
  { docNumber: 'SIR2603113', date: '26/03' },
  { docNumber: 'SIR2603114', date: '25/03' },
  { docNumber: 'SIR2603115', date: '24/03' },
  { docNumber: 'SIR2603116', date: '23/03' },
];

export const mockSIRDocument: SIRDocument = {
  docNumber: 'SIR2603107',
  date: '2026-03-31',
  refNumber: 'SRA2602380',
  supplierCode: 'A139',
  supplierName: 'BRIGHT FUTURE GEMS CO.,LTD.',
  category: 'A',
  currency: 'THB',
  exchangeRate: 1.00,
  items: [
    {
      seq: 1,
      stoneCode: 'SWTBG2.5*5PRI-A',
      unit: 'PCS',
      grade: '',
      weight: 4.9500,
      returnQty: 18,
      price: 18.0000,
      total: 324.0000,
      warehouse: 'C',
    },
  ],
};
