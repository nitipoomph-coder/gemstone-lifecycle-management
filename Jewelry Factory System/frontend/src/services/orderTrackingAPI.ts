import { fetchWithAuth } from '../utils/fetchWithAuth';

export interface OrderInfo {
    CustCode: string;
    OrdDate: string;
    DueDate: string;
    PONo: string;
    ItemNo: string;
    ItemMat: string;
    ItemCust: string;
    ItemDesc: string;
    ItemStone: string;
    ItemPlate: string;
    ItemSize: string;
    ItemQty: number;
    OrdLineNo?: string | number;
}

export interface TrackingStep {
    stepIndex: number;
    prefix: string;
    deptCode: string;
    nameEN: string;
    nameTH: string;
    status: number; // 0 = รอ, 1 = กำลังทำ (ส้ม), 2 = เสร็จแล้ว (เขียว)
    recQty: number;
    senQty: number;
    balance: number;
    docNo: string;
    repDate: string | null;
}

export interface TrackingSummary {
    totalSteps: number;
    doneSteps: number;
    inProgressCount: number;
    currentStepName: string;
    percent: number;
}

export interface OrderTrackingResponse {
    orderInfo: OrderInfo;
    steps: TrackingStep[];
    history: TrackingStep[];
    summary: TrackingSummary;
}

/**
 * ค้นหาข้อมูลติดตามสถานะออเดอร์ในสายการผลิต 17 ขั้นตอน
 */
export const getOrderTracking = async (
    ordNo: string,
    ordLineNo?: string
): Promise<OrderTrackingResponse> => {
    const params = new URLSearchParams({ ordNo });
    if (ordLineNo) params.append('ordLineNo', ordLineNo);

    const res = await fetchWithAuth(`/api/order-tracking/track?${params.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return res.json();
};
