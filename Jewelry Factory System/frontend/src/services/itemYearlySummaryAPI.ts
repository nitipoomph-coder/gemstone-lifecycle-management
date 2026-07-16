import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

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