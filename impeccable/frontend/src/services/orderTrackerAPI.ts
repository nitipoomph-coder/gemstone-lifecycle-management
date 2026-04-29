// src/services/orderTrackerAPI.ts

const BASE_URL = 'https://shaky-rivers-teach.loca.lt';

export interface OrderSummary {
  // ── existing ──────────────────────────────────────────────
  OrdNo: string;
  OrdDate: string;
  DueDate: string;
  CustCode: string;
  CustName: string;
  PONo: string;
  OrdMat: string;
  OrdKind: string;           // New / Replen
  CustMultiAddr: string;     // Ship To
  OrdStatus: string;
  CloseStatus: string;
  TotalQty: number;
  TotalAmount: number;
  CurrCode: string;
  Week: string;
  CastStatus: string | null;
  PolishStatus: string | null;
  PlateStatus: string | null;
  AssemStatus: string | null;
  QCStatus: string | null;
  LineCount: number;
  SumItem: number;           // No. of SKU
  ItemPhoto?: string;        // base64

  // ── dates ─────────────────────────────────────────────────
  CustQCDate: string | null;   // QC Date
  CustDueDate: string | null;  // Cust Due Date

  // ── from OrdTrackDT ───────────────────────────────────────
  OrdSGS: string | null;       // SGS date
  TrackTest: string | null;    // QA/BBQ/Testing date
  OORDate: string | null;      // OOR Date
  BookDate: string | null;     // Booking Date

  QC1_Qty: number | null;
  QC1_Date: string | null;
  QC1_Fail: number | null;

  QC2_Qty: number | null;
  QC2_Date: string | null;
  QC2_Fail: number | null;

  QC3_Qty: number | null;
  QC3_Date: string | null;

  // ── production pending qty ────────────────────────────────
  PolishPenQty: number | null;  // PST column
  PlatePenQty: number | null;   // PC1 column
}

export interface ProcessInfo {
  qty: number | null;
  status: string | null;
}

export interface OrderLine {
  LineNo: number;
  ItemNo: string;
  ItemDesc: string;
  ItemMat: string;
  ItemSize: string;
  Qty: number;
  Price: number;
  Amount: number;
  ItemPhoto?: string;
  FinishQty: number | null;
  FinishStatus: string | null;
  ItemStatus: string | null;
  processes: {
    Cast: ProcessInfo;
    Grind: ProcessInfo;
    Polish: ProcessInfo;
    Set: ProcessInfo;
    Epox: ProcessInfo;
    Plate: ProcessInfo;
    Assem: ProcessInfo;
    QC: ProcessInfo;
    Pack: ProcessInfo;
  };
}

export interface OrderHeader {
  OrdNo: string;
  OrdDate: string;
  DueDate: string;
  CustCode: string;
  CustName: string;
  PONo: string;
  OrdMat: string;
  OrdStatus: string;
  CloseStatus: string;
  TotalQty: number;
  TotalAmount: number;
  CurrCode: string;
}

export interface OrderDetail {
  header: OrderHeader;
  lines: OrderLine[];
  lineCount: number;
}

// ─── fetchOrders ──────────────────────────────────────────────────────────────
export async function fetchOrders(params?: {
  status?: 'pending' | 'all';
  custCode?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ data: OrderSummary[]; count: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.custCode) qs.set('custCode', params.custCode);
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.set('dateTo', params.dateTo);

  const res = await fetch(`${BASE_URL}/orders?${qs}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  // backend ส่ง { ok, data, count }
  return { data: json.data ?? [], count: json.count ?? 0 };
}

// ─── fetchOrderDetail (by OrdNo) ──────────────────────────────────────────────
export async function fetchOrderDetail(ordNo: string): Promise<OrderDetail> {
  const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(ordNo)}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return await res.json();
}

// ─── fetchOrderByPo (by PONo) ─────────────────────────────────────────────────
// Key หลัก — ดึงทุก OrdNo ใต้ PONo เดียวกัน
export interface OrderDetailByPo {
  ok: boolean;
  header: OrderHeader & {
    PONo: string;
    OrdNos: string[];    // รายการ OrdNo ทั้งหมดใต้ PO นี้
    OrdKind: string | null;
    Week: string | null;
  };
  lines: (OrderLine & { OrdNo: string })[];
  lineCount: number;
  ordCount: number;
}

export async function fetchOrderByPo(poNo: string): Promise<OrderDetailByPo> {
  const res = await fetch(`${BASE_URL}/orders/by-po/${encodeURIComponent(poNo)}`);
  if (!res.ok) throw new Error(`API error ${res.status} — PO "${poNo}" not found`);
  return await res.json();
}