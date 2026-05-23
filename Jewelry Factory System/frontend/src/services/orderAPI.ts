// src/services/orderAPI.ts

export interface OrderSummary {
  Week: string | null;
  OrdNo: string;
  CustCode: string | null;
  ShipTo: string | null;
  CustName: string | null;
  PONo: string | null;
  OrdKind: string | null;
  OrdMat: string | null;
  DueDate: string | null;
  OrdDate: string | null;
  CustDueDate: string | null;
  OrdStatus: string | null;
  TotalQty: number;
  NumSKU: number;
  Amount: number | null;
  ItemPhoto: string | null; // รูป Base64
  TrackTest: string | null;
  OrdSGS: string | null;
  CustQCDate: string | null;
  OORDate: string | null;
  CloseStatus: string | null;
  TrackRemark: string | null;
  // Sales Remarks (Production Data)
  ReceiveRemark: string | null;
  EnamelRemark: string | null;
  CrystalRemark: string | null;
  AssemblyRemark: string | null;
  ShelfRemark: string | null;
  PackRemark: string | null;
  ProductionRemark: string | null;
}

export const fetchOrders = async (params: { status?: 'pending' | 'finish' | 'all', dateType?: string, dateFrom?: string, dateTo?: string }): Promise<{ ok: boolean; data: OrderSummary[]; error?: string }> => {
  try {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'));
    const baseUrl = isLocal ? `http://${window.location.hostname}:3001/api/orders` : 'https://fresh-camels-change.loca.lt/api/orders';
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.dateType) queryParams.append('dateType', params.dateType);

    const url = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();

    // รองรับกรณี Backend ส่งมาเป็น Array ตรงๆ หรือส่งมาเป็น { ok: true, data: [...] }
    const rawData = Array.isArray(result) ? result : (Array.isArray(result.data) ? result.data : []);

    // ⭐️ DATA MAPPING: ดักจับชื่อ Key เผื่อ Backend (C#) ส่งมาเป็นตัวพิมพ์เล็ก
    const mappedData: OrderSummary[] = rawData.map((item: any) => ({
      Week: item.OrdWeek || item.Week || item.week || '-',
      OrdNo: item.OrdNo || item.ordNo || item.ord_no || '-',
      CustCode: item.CustCode || item.custCode || '-',
      ShipTo: item.CustMultiAddr || item.custMultiAddr || item.ShipTo || item.shipTo || '-',
      CloseStatus: item.CloseStatus || item.CloseStatus || null,
      CustName: item.CustName || item.custName || '-',
      PONo: item.PONo || item.poNo || item.po_no || '-',
      OrdKind: item.OrdKind || item.ordKind || '-',
      OrdMat: item.OrdMat || item.ordMat || '-',
      DueDate: item.DueDate || item.dueDate || null,
      OrdDate: item.OrdDate || item.ordDate || null,
      CustDueDate: item.CustDueDate || item.custDueDate || null,
      OrdStatus: item.CloseStatus || item.closestatus || item.status || null,
      TotalQty: Number(item.SumQty || item.sumQty || item.TotalQty || item.totalQty || 0),
      NumSKU: Number(item.SumItem || item.sumItem || item.NumSKU || 0),
      Amount: Number(item.SumAmnt || item.sumAmnt || item.Amount || item.amount || 0),
      ItemPhoto: item.ItemPhoto || item.itemPhoto || null,
      TrackTest: item.TrackTest || '-',
      OrdSGS: item.OrdSGS || '-',
      CustQCDate: item.CustQCDate || null,
      OORDate: item.OORDate || null,
      TrackRemark: item.TrackRemark || item.remark || '-',
      
      // Sales Remarks (Production Data)
      ReceiveRemark: item.ReceiveRemark || item.receiveRemark || null,
      EnamelRemark: item.EnamelRemark || item.enamelRemark || null,
      CrystalRemark: item.CrystalRemark || item.crystalRemark || null,
      AssemblyRemark: item.AssemblyRemark || item.assemblyRemark || null,
      ShelfRemark: item.ShelfRemark || item.shelfRemark || null,
      PackRemark: item.PackRemark || item.packRemark || null,
      ProductionRemark: item.ProductionRemark || item.productionRemark || null,
    }));

    return { ok: true, data: mappedData };

  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return { ok: false, data: [], error: error.message || 'Failed to fetch' };
  }
};