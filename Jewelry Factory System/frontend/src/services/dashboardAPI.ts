import { fetchWithAuth } from '../utils/fetchWithAuth';
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

export interface StoneFindingSummary {
  totalItems: number;
  stone: { pending: number; done: number; pendingQty: number };
  finding: { pending: number; done: number; pendingQty: number };
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
  stoneFindings: StoneFindingSummary;
}

import { BASE_URL } from './poTrackerAPI';

export const fetchDashboardData = async (year?: number | string): Promise<DashboardData> => {
  const url = year ? `${BASE_URL}/dashboard?year=${year}` : `${BASE_URL}/dashboard`;
  const res = await fetchWithAuth(url, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Dashboard API error: ${res.status}`);
  return await res.json();
};

// Card detail (year-over-year)

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
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/detail/${cardType}?year1=${year1}&year2=${year2}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Detail API error: ${res.status}`);
  return await res.json();
};

export const fetchAvailableYears = async (): Promise<number[]> => {
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/years`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Years API error: ${res.status}`);
  const json = await res.json();
  return json.years || [];
};

export const fetchSalesSummary = async (years: string[]): Promise<any[]> => {
  const yearsParam = years.join(',');
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-summary?years=${yearsParam}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Sales summary API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchCustomerSummary = async (years: string[], months?: string[]): Promise<any[]> => {
  const yearsParam = years.join(',');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let url = `${BASE_URL}/dashboard/customer-summary?years=${yearsParam}`;
  if (months && months.length > 0) {
    const monthsParam = months.map(m => MONTHS.indexOf(m) + 1).join(',');
    url += `&months=${monthsParam}`;
  }
  const res = await fetchWithAuth(url, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Customer summary API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};
export type SalesMetric = 'amount' | 'qty';
export type SalesDateView = 'order' | 'ship';

export interface SalesCustomerGroupPoint {
  customerCode: string;
  customerName: string;
  year: number;
  month: number;
  orderCount: number;
  qty: number;
  shippedQty: number;
  amount: number;
}

export interface SalesMonthlyPoint {
  year: number;
  month: number;
  orderCount: number;
  qty: number;
  shippedQty: number;
  gapQty: number;
  amount: number;
  shippedAmount: number;
  fulfillmentRate: number;
}

export interface SalesTypePoint {
  year: number;
  month: number;
  typeCode: string;
  typeName: string;
  orderCount: number;
  qty: number;
  shippedQty: number;
  gapQty: number;
  amount: number;
  shippedAmount: number;
  fulfillmentRate: number;
}

export interface SalesOrderRow {
  orderNo: string;
  poNo: string | null;
  ordDate: string | null;
  custDueDate: string | null;
  customerCode: string;
  customerName: string;
  brand: string;
  itemNo: string;
  itemType: string;
  itemTypeName: string;
  productTypeCode?: string;
  orderQty: number;
  shippedQty: number;
  amount: number;
  status: 'Open' | 'Partial' | 'Shipped' | 'Late';
  market: string;
}

export interface TopItemRow {
  itemNo: string;
  itemDesc: string | null;
  itemType: string;
  itemTypeName: string;
  productTypeCode?: string;
  qty: number;
  shippedQty: number;
  amount: number;
  orderCount: number;
  avgPrice: number;
  primaryCustomerCode?: string;
  primaryCustomerName?: string;
}

interface SalesAnalyticsParams {
  years?: string[];
  months?: string[];
  customers?: string[];
  types?: string[];
  dateView?: SalesDateView;
}

const salesAnalyticsQuery = (params: SalesAnalyticsParams = {}) => {
  const qs = new URLSearchParams();
  if (params.years?.length) qs.set('years', params.years.join(','));
  if (params.months?.length) qs.set('months', params.months.join(','));
  if (params.customers?.length) qs.set('customers', params.customers.join(','));
  if (params.types?.length) qs.set('types', params.types.join(','));
  if (params.dateView) qs.set('dateView', params.dateView);
  return qs;
};

export const fetchSalesCustomerGroups = async (params: SalesAnalyticsParams = {}): Promise<SalesCustomerGroupPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-customer-groups?${qs.toString()}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Sales customer groups API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchSalesMonthlyAnalytics = async (params: SalesAnalyticsParams = {}): Promise<SalesMonthlyPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-monthly-analytics?${qs.toString()}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Sales monthly analytics API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchSalesTypeAnalytics = async (params: SalesAnalyticsParams = {}): Promise<SalesTypePoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-type-analytics?${qs.toString()}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Sales type analytics API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchSalesOrders = async (params: SalesAnalyticsParams = {}): Promise<SalesOrderRow[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-orders?${qs.toString()}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Sales orders API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchTopItems = async (params: SalesAnalyticsParams & { metric?: SalesMetric; limit?: number } = {}): Promise<TopItemRow[]> => {
  const qs = salesAnalyticsQuery(params);
  if (params.metric) qs.set('metric', params.metric);
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/top-items?${qs.toString()}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Top items API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};
export interface TrendTotals {
  qty: number;
  value: number;
  orderCount: number;
  lineCount: number;
}

export interface YearTrendRow extends TrendTotals {
  year: number;
  hasData: boolean;
  status: 'base' | 'ok' | 'new' | 'no_data';
  yoyQtyPct: number | null;
  yoyValuePct: number | null;
}

export interface ItemYearlySummaryItem {
  styleNo: string;
  normalizedStyleNo: string;
  combined: TrendTotals;
  data: YearTrendRow[];
}

export interface ItemsYearlySummaryResponse {
  ok: boolean;
  years: number[];
  data: ItemYearlySummaryItem[];
}

export interface ItemCustomerYearlySummaryPair {
  customerCode: string;
  styleNo: string;
}

export interface ItemCustomerYearlySummaryItem extends ItemYearlySummaryItem {
  customerCode: string;
  normalizedCustomerCode: string;
}

export interface ItemCustomerYearlySummaryResponse {
  ok: boolean;
  years: number[];
  data: ItemCustomerYearlySummaryItem[];
}

export interface ItemYearlySummaryResponse {
  ok: boolean;
  styleNo: string;
  years: number[];
  combined: TrendTotals;
  data: YearTrendRow[];
}

export const fetchItemYearlySummary = async (styleNo: string, years: string[]): Promise<ItemYearlySummaryResponse> => {
  const qs = new URLSearchParams();
  if (years.length) qs.set('years', years.join(','));
  const res = await fetchWithAuth(`${BASE_URL}/items/${encodeURIComponent(styleNo)}/yearly-summary?${qs.toString()}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Item yearly summary API error: ${res.status}`);
  return await res.json();
};

export const fetchItemCustomerYearlySummary = async (pairs: ItemCustomerYearlySummaryPair[], years: string[], months?: string[]): Promise<ItemCustomerYearlySummaryResponse> => {
  const qs = new URLSearchParams();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (pairs.length) qs.set('pairs', pairs.map(pair => `${pair.customerCode}|${pair.styleNo}`).join(','));
  if (years.length) qs.set('years', years.join(','));
  if (months && months.length > 0) qs.set('months', months.map(m => MONTHS.indexOf(m) + 1).join(','));
  const res = await fetchWithAuth(`${BASE_URL}/items/yearly-summary?${qs.toString()}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Item customer yearly summary API error: ${res.status}`);
  return await res.json();
};

export const fetchItemsYearlySummary = async (styleNos: string[], years: string[]): Promise<ItemsYearlySummaryResponse> => {
  const qs = new URLSearchParams();
  if (styleNos.length) qs.set('styles', styleNos.join(','));
  if (years.length) qs.set('years', years.join(','));
  const res = await fetchWithAuth(`${BASE_URL}/items/yearly-summary?${qs.toString()}`, {
    headers: { 'bypass-tunnel-reminder': 'true' }
  });
  if (!res.ok) throw new Error(`Items yearly summary API error: ${res.status}`);
  return await res.json();
};
