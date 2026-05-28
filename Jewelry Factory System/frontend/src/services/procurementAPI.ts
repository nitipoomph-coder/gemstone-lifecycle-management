// ============================================
// Procurement & Receiving API Client
// SPA, SRA, SRB, SIR endpoints
// ============================================

const API_BASE = '/api/procurement';

export interface ProcDocListItem {
  docNumber: string;
  docDate: string;
  supplier: string;
  currency: string;
  totalAmount: number;
  totalQty: number;
  status: string;
}

export interface ProcDocHeader {
  docNumber: string;
  docDate: string;
  purchaseDate: string;
  dueDate: string;
  receiveDate: string;
  supplierCode: string;
  supplierName: string;
  buyer: string;
  currency: string;
  totalAmount: number;
  totalQty: number;
  refNumber: string;
  billNumber: string;
  invoiceNumber: string;
  remark: string;
  exchangeRate: number;
  category: string;
  status: string;
}

export interface ProcDocLine {
  seq: number;
  stoneCode: string;
  stoneName: string;
  color: string;
  shape: string;
  shapeName?: string;
  size: string;
  characteristic: string;
  specName?: string;
  grade: string;
  height: number;
  unit: string;
  warehouse: string;
  weight: number;
  qty: number;
  price: number;
  amount: number;
  ctPerPc: number;
  orderNumber: string;
  customer?: string;
  jobNumber: string;
  useStone: string;
  remark: string;
  remark1?: string;
  remark2?: string;
}

export interface ProcDocDetail {
  header: ProcDocHeader;
  lines: ProcDocLine[];
}

export interface ProcSummary {
  docCount: number;
  totalValue: number;
  totalQty: number;
  earliestDate: string;
  latestDate: string;
}

export interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
}

/** Fetch document list for a document type */
export async function fetchDocumentList(docType: string, params?: FetchParams) {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/documents/${docType}?${query.toString()}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Failed to fetch document list');
  return { data: json.data, total: json.total, page: json.page, totalPages: json.totalPages };
}

/** Fetch document detail by docNo */
export async function fetchDocumentDetail(docNo: string): Promise<ProcDocDetail> {
  const res = await fetch(`${API_BASE}/document/${docNo}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Failed to fetch document');
  return json.data;
}

/** Fetch summary statistics for a document type */
export async function fetchProcSummary(docType: string): Promise<ProcSummary> {
  const res = await fetch(`${API_BASE}/summary/${docType}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Failed to fetch summary');
  return json.data;
}
