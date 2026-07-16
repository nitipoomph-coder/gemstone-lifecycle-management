import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fetchCustomerSummary = async (years: string[], months?: string[]): Promise<any[]> => {
  const yearsParam = years.join(',');
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