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

import { BASE_URL } from './orderTrackerAPI';

/**
 * ฟังก์ชันดึงข้อมูลผ่าน API จากฐานข้อมูลจริง
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  const res = await fetch(`${BASE_URL}/dashboard`, {
    headers: {
      'bypass-tunnel-reminder': 'true' // For localtunnel bypass
    }
  });
  if (!res.ok) throw new Error(`Dashboard API error: ${res.status}`);
  return await res.json();
};
