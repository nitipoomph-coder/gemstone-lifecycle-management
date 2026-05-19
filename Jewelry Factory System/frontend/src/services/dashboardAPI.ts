// src/services/dashboardAPI.ts

export interface StatCard {
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down' | 'bad' | 'good';
  isAlert?: boolean;
  yoyPct?: number | null;
  yoyLabel?: string;
}

export interface TrendPoint {
  day: string;
  date: string;
  count: number;
}

export interface ProcessSegment {
  label: string;
  value: number;
}

export interface ProcessDistribution {
  total: number;
  segments: ProcessSegment[];
}

export interface MaterialBreakdown {
  material: string;
  code: string;
  orders: number;
  qty: number;
}

export interface OrderType {
  type: string;
  count: number;
}

export interface TopCustomer {
  code: string;
  name: string;
  orders: number;
  qty: number;
}

export interface DelayOrder {
  ordNo: string;
  poNo: string;
  custCode: string;
  custName: string;
  dueDate: string;
  delayDays: number;
  qty: number;
}

export interface RecentOrder {
  ordNo: string;
  poNo: string;
  custCode: string;
  ordDate: string;
  material: string;
  type: string;
  qty: number;
  status: string;
}

export interface DashboardData {
  statCards: StatCard[];
  orderTrend: TrendPoint[];
  processDistribution: ProcessDistribution;
  materialBreakdown: MaterialBreakdown[];
  orderTypes: OrderType[];
  topCustomers: TopCustomer[];
  delayOrders: DelayOrder[];
  recentOrders: RecentOrder[];
}

import { BASE_URL } from './orderTrackerAPI';

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const res = await fetch(`${BASE_URL}/dashboard`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Dashboard API error: ${res.status}`);
  return await res.json();
};

// ─── Card Detail (Year-over-Year) ────────────────────────────────────────────

export interface MonthlyData {
  month: number;
  label: string;
  isFuture: boolean;
  year1: number | null;
  year1Qty: number | null;
  year2: number;
  year2Qty: number;
}

export interface BreakdownItem {
  code: string;
  name: string;
  year1: number;
  year2: number;
  year1Qty: number;
  year2Qty: number;
  changePct: number;
}

export interface CardDetailData {
  ok: boolean;
  cardType: string;
  year1: number;
  year2: number;
  summary: {
    year1Total: number;
    year2Total: number;
    year1Qty: number;
    year2Qty: number;
    changePct: number;
  };
  monthly: MonthlyData[];
  breakdown: BreakdownItem[];
}

export type CardType = 'today' | 'completed' | 'wip' | 'overdue' | 'month';

export const fetchCardDetail = async (cardType: CardType, year1: number, year2: number): Promise<CardDetailData> => {
  const res = await fetch(`${BASE_URL}/dashboard/detail/${cardType}?year1=${year1}&year2=${year2}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Detail API error: ${res.status}`);
  return await res.json();
};

export const fetchAvailableYears = async (): Promise<number[]> => {
  const res = await fetch(`${BASE_URL}/dashboard/years`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Years API error: ${res.status}`);
  const json = await res.json();
  return json.years || [];
};

