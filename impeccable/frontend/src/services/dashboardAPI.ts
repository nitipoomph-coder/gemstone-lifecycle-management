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

export interface MaterialAlert {
  item: string;
  type: 'Gold' | 'Gemstone' | 'Part';
  currentStock: string;
  minStock: string;
  status: 'low' | 'critical';
}

export interface DashboardData {
  productionStats: ProductionStat[];
  delayOrders: DelayOrder[];
  liveTracking: LiveTracking[];
  materialAlerts: MaterialAlert[];
}

/**
 * ฟังก์ชันจำลองการดึงข้อมูลผ่าน API
 * เมื่อหลังบ้าน (VB.net 2008) พร้อม สามารถเปลี่ยนโค้ดตรงนี้ไปใช้ fetch() หรือ axios เพื่อยิงเข้า API จริงได้เลย
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  // Use the same base url as orderTrackerAPI or window.location.origin
  // To avoid hardcoding, we can construct it or just hardcode the localtunnel for now,
  // but it's better to export BASE_URL from a central config. For now, we will use the localtunnel URL.
  const BASE_URL = 'https://shaky-rivers-teach.loca.lt/api';
  
  const res = await fetch(`${BASE_URL}/dashboard`);
  if (!res.ok) throw new Error(`Dashboard API error: ${res.status}`);
  return await res.json();
};
