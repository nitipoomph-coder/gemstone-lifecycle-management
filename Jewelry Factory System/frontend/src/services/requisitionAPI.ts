import { fetchWithAuth } from '../utils/fetchWithAuth';
const API_BASE = '/api/requisition';

export interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchRequisitionDocuments(docType: string, params?: FetchParams) {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);

  const res = await fetchWithAuth(`${API_BASE}/documents/${encodeURIComponent(docType)}?${query.toString()}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { data: json.data, total: json.total, page: json.page, totalPages: json.totalPages };
}

export async function fetchRequisitionDocument(docuNo: string) {
  const res = await fetchWithAuth(`${API_BASE}/document/${encodeURIComponent(docuNo)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { header: json.header, lines: json.lines };
}

export async function fetchOrderForRequisition(ordNo: string) {
  const res = await fetchWithAuth(`${API_BASE}/order/${encodeURIComponent(ordNo)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { header: json.header, lines: json.lines };
}

export async function saveRequisitionDocument(data: any) {
  const res = await fetchWithAuth(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json;
}

export async function generateNextDocumentNumber(docType: string) {
  const res = await fetchWithAuth(`${API_BASE}/next-number/${encodeURIComponent(docType)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}
