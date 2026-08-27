import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CustomerTopItemSummary {
  topItem?: string;
  topItemQty?: number | string;
  productType?: string;
}

export interface CustomerSummaryRecord {
  id: string;
  name?: string;
  monthly?: Record<string, Record<string, number | string>>;
  monthlyQty?: Record<string, Record<string, number | string>>;
  topItemsByYear?: Record<string, CustomerTopItemSummary>;
  topItemsByYearByType?: Record<string, Record<string, CustomerTopItemSummary>>;
  topItem?: string;
  topItemQty?: number | string;
}

// Customer Summary data for Customer Dashboard and Top Orders first load.
export const fetchCustomerSummary = async (
  years: string[], 
  months?: string[]
): Promise<CustomerSummaryRecord[]> => {
  const yearsParam = years.join(',');
  let url = `${BASE_URL}/dashboard/customer-summary?years=${yearsParam}`;
  // Period/month filter changes the DB summary, so it is sent to the API.
  if (months && months.length > 0) {
    const monthsParam = months.map(m => MONTHS.indexOf(m) + 1).join(',');
    url += `&months=${monthsParam}`;
  }
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error(`Customer summary API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};
