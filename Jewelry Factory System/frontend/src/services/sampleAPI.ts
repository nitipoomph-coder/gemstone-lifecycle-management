import { fetchWithAuth } from '../utils/fetchWithAuth';
// ============================================
// Sample Room API Client (ห้องตัวอย่าง)
// SSA, SIM endpoints
// ============================================

const API_BASE = '/api/sample';

export interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
}

/** ดึงรายการเอกสารห้องตัวอย่าง (SSA หรือ SIM) */
export async function fetchSampleDocuments(docType: string, params?: FetchParams) {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);

  const res = await fetchWithAuth(`${API_BASE}/documents/${encodeURIComponent(docType)}?${query.toString()}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { data: json.data, total: json.total, page: json.page, totalPages: json.totalPages };
}

/** ดึงรายละเอียดเอกสารห้องตัวอย่าง (header + detail lines) */
export async function fetchSampleDocument(docuNo: string) {
  const res = await fetchWithAuth(`${API_BASE}/document/${encodeURIComponent(docuNo)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { header: json.header, lines: json.lines };
}
