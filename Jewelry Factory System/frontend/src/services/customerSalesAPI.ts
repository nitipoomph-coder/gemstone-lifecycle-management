import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

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

// Shared filters for Customer Sales Analysis boxes and tables.
interface SalesAnalyticsParams {
  years?: string[];
  months?: string[];
  customers?: string[];
  types?: string[];
  dateView?: SalesDateView;
}

// Builds the query string used by every Customer Sales Analysis endpoint.
const salesAnalyticsQuery = (params: SalesAnalyticsParams = {}) => {
  const qs = new URLSearchParams();
  if (params.years?.length) qs.set('years', params.years.join(','));
  if (params.months?.length) qs.set('months', params.months.join(','));
  if (params.customers?.length) qs.set('customers', params.customers.join(','));
  if (params.types?.length) qs.set('types', params.types.join(','));
  if (params.dateView) qs.set('dateView', params.dateView);
  return qs;
};

// KPI and customer group rows for Customer Sales Overview.
export const fetchSalesCustomerGroups = async (params: SalesAnalyticsParams = {}): Promise<SalesCustomerGroupPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-customer-groups?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales customer groups API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchSalesMonthlyAnalytics = async (params: SalesAnalyticsParams = {}): Promise<SalesMonthlyPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-monthly-analytics?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales monthly analytics API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchSalesTypeAnalytics = async (params: SalesAnalyticsParams = {}): Promise<SalesTypePoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-type-analytics?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales type analytics API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

// Order-level rows for Customer Order List drilldown.
export const fetchSalesOrders = async (params: SalesAnalyticsParams = {}): Promise<SalesOrderRow[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-orders?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales orders API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

// Top 30 Items table for Customer Sales Overview.
export const fetchTopItems = async (params: SalesAnalyticsParams & { metric?: SalesMetric; limit?: number } = {}): Promise<TopItemRow[]> => {
  const qs = salesAnalyticsQuery(params);
  if (params.metric) qs.set('metric', params.metric);
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/top-items?${qs.toString()}`);
  if (!res.ok) throw new Error(`Top items API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};