// src/services/dashboardAPI.ts

export interface ProductionStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'bad' | 'good';
  isAlert?: boolean;
}

export interface DelayOrder {
  no: string;
  customer: string;
  date: string;
  delay: string;
}

export interface LiveTracking {
  no: string;
  item: string;
  process: string;
  location: string;
  time: string;
}

export interface DashboardData {
  productionStats: ProductionStat[];
  delayOrders: DelayOrder[];
  liveTracking: LiveTracking[];
}

/**
 * ฟังก์ชันจำลองการดึงข้อมูลผ่าน API
 * เมื่อหลังบ้าน (VB.net 2008) พร้อม สามารถเปลี่ยนโค้ดตรงนี้ไปใช้ fetch() หรือ axios เพื่อยิงเข้า API จริงได้เลย
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  // จำลองความหน่วง (Latency) ของ Network 0.5 วินาที
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        productionStats: [
          { label: 'ORDERS TODAY', value: '128', change: '+12%', trend: 'up' },
          { label: 'COMPLETED', value: '96', change: '+8%', trend: 'up' },
          { label: 'WIP', value: '21', change: '-5%', trend: 'down' },
          { label: 'DELAY', value: '11', change: '+3', trend: 'bad', isAlert: true },
          { label: 'DEFECT', value: '3.2%', change: '-0.7%', trend: 'good' },
        ],
        delayOrders: [
          { no: 'OD-2405-00098', customer: 'AURORA', date: '20/05/2024', delay: '2 วัน' },
          { no: 'OD-2405-00102', customer: 'RICH LINE', date: '19/05/2024', delay: '1 วัน' },
          { no: 'OD-2405-00110', customer: 'GOLDEN', date: '18/05/2024', delay: '3 วัน' },
          { no: 'OD-2405-00115', customer: 'LUXURY', date: '17/05/2024', delay: '4 วัน' },
        ],
        liveTracking: [
          { no: 'OD-2405-00123', item: 'R-0001', process: 'Polishing', location: 'แผนกขัดเงา', time: '10:45:21' },
          { no: 'OD-2405-00124', item: 'N-0021', process: 'Setting', location: 'แผนกประกอบ', time: '10:45:10' },
          { no: 'OD-2405-00125', item: 'B-0105', process: 'QC', location: 'แผนกตรวจ', time: '10:44:58' },
          { no: 'OD-2405-00126', item: 'P-0055', process: 'Packing', location: 'แผนกแพ็ค', time: '10:44:30' },
        ]
      });
    }, 500);
  });
};
