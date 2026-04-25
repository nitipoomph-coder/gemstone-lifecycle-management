import { delay } from './dashboardAPI';

export interface DepartmentQty {
  deptCode: string; // PWA, PCA, PF1, PL1, PPL, PST, PC2
  deptName: string; // Wax, Cast, Grind, Polish, Plating, Stone, Control
  qty: number;
}

export interface OrderTrackData {
  ordNo: string;
  custCode: string;
  ordMat: string; // e.g. 18K Gold, 925 Silver
  ordKind: 'New' | 'Replenish';
  ordDate: string;
  dueDate: string;
  totalQty: number;
  finishedQty: number;
  status: 'Pending' | 'Finish' | 'Export';
  departmentStatus: DepartmentQty[];
  thumbnailUrl?: string; // ItemPhoto
}

// จำลองข้อมูลอิงจากโครงสร้าง VB.net ตัวเก่า (PenQty)
const mockOrders: OrderTrackData[] = [
  {
    ordNo: 'OD-2405-00123',
    custCode: 'CUST-NY-01',
    ordMat: '18K White Gold',
    ordKind: 'New',
    ordDate: '2024-05-01',
    dueDate: '2024-05-20',
    totalQty: 100,
    finishedQty: 10,
    status: 'Pending',
    departmentStatus: [
      { deptCode: 'PWA', deptName: 'Wax', qty: 0 },
      { deptCode: 'PCA', deptName: 'Cast', qty: 0 },
      { deptCode: 'PF1', deptName: 'Grind', qty: 15 },
      { deptCode: 'PL1', deptName: 'Polish', qty: 30 },
      { deptCode: 'PPL', deptName: 'Plating', qty: 0 },
      { deptCode: 'PST', deptName: 'Stone Setting', qty: 45 },
      { deptCode: 'PC2', deptName: 'QC Control', qty: 0 },
    ]
  },
  {
    ordNo: 'OD-2405-00124',
    custCode: 'CUST-UK-05',
    ordMat: '925 Silver',
    ordKind: 'Replenish',
    ordDate: '2024-05-03',
    dueDate: '2024-05-18',
    totalQty: 50,
    finishedQty: 0,
    status: 'Pending',
    departmentStatus: [
      { deptCode: 'PWA', deptName: 'Wax', qty: 20 },
      { deptCode: 'PCA', deptName: 'Cast', qty: 30 },
      { deptCode: 'PF1', deptName: 'Grind', qty: 0 },
      { deptCode: 'PL1', deptName: 'Polish', qty: 0 },
      { deptCode: 'PPL', deptName: 'Plating', qty: 0 },
      { deptCode: 'PST', deptName: 'Stone Setting', qty: 0 },
      { deptCode: 'PC2', deptName: 'QC Control', qty: 0 },
    ]
  },
  {
    ordNo: 'OD-2405-00128',
    custCode: 'CUST-JP-02',
    ordMat: '18K Rose Gold',
    ordKind: 'New',
    ordDate: '2024-05-05',
    dueDate: '2024-05-10', // เร่งด่วน
    totalQty: 30,
    finishedQty: 5,
    status: 'Pending',
    departmentStatus: [
      { deptCode: 'PWA', deptName: 'Wax', qty: 0 },
      { deptCode: 'PCA', deptName: 'Cast', qty: 0 },
      { deptCode: 'PF1', deptName: 'Grind', qty: 0 },
      { deptCode: 'PL1', deptName: 'Polish', qty: 0 },
      { deptCode: 'PPL', deptName: 'Plating', qty: 10 },
      { deptCode: 'PST', deptName: 'Stone Setting', qty: 0 },
      { deptCode: 'PC2', deptName: 'QC Control', qty: 15 },
    ]
  }
];

export const getOrderTrackList = async (): Promise<OrderTrackData[]> => {
  await delay(800);
  return mockOrders;
};

export const getOrderTrackDetail = async (ordNo: string): Promise<OrderTrackData | undefined> => {
  await delay(500);
  return mockOrders.find(o => o.ordNo === ordNo);
};
