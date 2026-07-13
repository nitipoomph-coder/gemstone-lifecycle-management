import { useEffect, useMemo, useState } from 'react';
import { fetchOrders, type OrderSummary } from '../services/orderAPI';

export type DepartmentKey = 'cast' | 'stone' | 'polish' | 'plate';
export type StatusBucket = 'completed' | 'wip' | 'overdue' | 'rework';
export type DueDateSource = 'factory' | 'customer';
export type ViewMode = 'order' | 'item';
export type PeriodMode = 'year' | 'month';

export interface Filters {
  viewMode: ViewMode;
  dueDateSource: DueDateSource;
  orderMonth: string;
  shipMonth: string;
  department: DepartmentKey | 'all';
}

export interface PendingQty {
  cast: number;
  stone: number;
  polish: number;
  plate: number;
}

export interface TrackableRecord {
  id: string;
  source: ViewMode;
  ordNo: string;
  po: string;
  customerCode: string;
  customerName: string;
  shipTo: string;
  ordKind: string;
  material: string;
  orderDate: string;
  dueDate: string;
  custDueDate: string;
  pendingQty: PendingQty;
  closeStatus: string | null;
  finishQty: number;
  exportQty: number;
  totalQty: number;
  qcFailQty: number;
  riskText: string;
  itemType: string;
  itemSku: string;
}

export interface OrderRecord extends TrackableRecord {
  source: 'order';
  numSKU: number;
}

export interface ItemRecord extends TrackableRecord {
  source: 'item';
  itemId: string;
  itemCode: string;
  qty: number;
}

export interface BucketStyle {
  label: string;
  color: string;
  softBg: string;
  border: string;
}

export const DEFAULT_FILTERS: Filters = {
  viewMode: 'order',
  dueDateSource: 'factory',
  orderMonth: 'all',
  shipMonth: 'all',
  department: 'all',
};

export const DEPARTMENT_LABEL: Record<DepartmentKey, string> = {
  cast: 'Casting',
  stone: 'Stone',
  polish: 'Polishing',
  plate: 'Plating / QC',
};

export const BUCKET_ORDER: StatusBucket[] = ['completed', 'wip', 'overdue', 'rework'];
export const ITEM_GROUPS = ['BBS', 'BES', 'BNS', 'BRS', 'Others'] as const;
export type ItemGroup = typeof ITEM_GROUPS[number];

export const BUCKET_STYLE: Record<StatusBucket, BucketStyle> = {
  completed: {
    label: 'Completed',
    color: 'var(--color-success-500)',
    softBg: 'color-mix(in srgb, var(--color-success-500) 12%, transparent)',
    border: 'color-mix(in srgb, var(--color-success-500) 35%, transparent)',
  },
  wip: {
    label: 'WIP',
    color: 'var(--color-info-500)',
    softBg: 'color-mix(in srgb, var(--color-info-500) 12%, transparent)',
    border: 'color-mix(in srgb, var(--color-info-500) 35%, transparent)',
  },
  overdue: {
    label: 'Overdue',
    color: 'var(--color-danger-500)',
    softBg: 'color-mix(in srgb, var(--color-danger-500) 12%, transparent)',
    border: 'color-mix(in srgb, var(--color-danger-500) 35%, transparent)',
  },
  rework: {
    label: 'Rework',
    color: 'var(--color-warning-500)',
    softBg: 'color-mix(in srgb, var(--color-warning-500) 14%, transparent)',
    border: 'color-mix(in srgb, var(--color-warning-500) 38%, transparent)',
  },
};

const today = new Date();

function toNumber(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function absPending(value: number | string | null | undefined): number {
  return Math.abs(toNumber(value));
}

export function toISODate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function toMonth(value: string | null | undefined): string {
  const iso = toISODate(value);
  return iso ? iso.slice(0, 7) : 'No date';
}

function getDefaultRange() {
  const from = new Date();
  from.setMonth(from.getMonth() - 7);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
  };
}

function buildPendingQty(order: OrderSummary): PendingQty {
  return {
    cast: absPending(order.CastPenQty) + absPending(order.WijPenQty) + absPending(order.WstPenQty),
    stone: absPending(order.StonePenQty) + absPending(order.FitPenQty),
    polish: absPending(order.GrindPenQty) + absPending(order.PolishPenQty),
    plate: absPending(order.PlatePenQty) + absPending(order.QCPenQty),
  };
}

function hasPending(row: TrackableRecord): boolean {
  return Object.values(row.pendingQty).some((qty) => qty > 0);
}

function isComplete(row: TrackableRecord): boolean {
  return row.closeStatus === 'Y' || (row.totalQty > 0 && row.exportQty >= row.totalQty);
}

function hasReworkSignal(row: TrackableRecord): boolean {
  return row.qcFailQty > 0 || /rework|repair|fail|reject|แก้|ซ่อม/i.test(row.riskText);
}

export function getDueDate(row: TrackableRecord, source: DueDateSource): string {
  return source === 'customer' ? row.custDueDate || row.dueDate : row.dueDate || row.custDueDate;
}

export function categorizeRecord(row: TrackableRecord, dueDateSource: DueDateSource): StatusBucket {
  if (hasReworkSignal(row)) return 'rework';
  if (isComplete(row)) return 'completed';

  const dueDate = getDueDate(row, dueDateSource);
  if (dueDate) {
    const due = new Date(dueDate);
    if (!Number.isNaN(due.getTime()) && due < today) return 'overdue';
  }

  return hasPending(row) ? 'wip' : 'wip';
}

export function applyFilters<T extends TrackableRecord>(rows: T[], filters: Filters): T[] {
  return rows.filter((row) => {
    if (filters.orderMonth !== 'all' && toMonth(row.orderDate) !== filters.orderMonth) return false;
    if (filters.shipMonth !== 'all' && toMonth(getDueDate(row, filters.dueDateSource)) !== filters.shipMonth) return false;
    if (filters.department !== 'all' && row.pendingQty[filters.department] <= 0) return false;
    return true;
  });
}

export function applyStatusFilter<T extends TrackableRecord>(rows: T[], status: StatusBucket | 'all', dueDateSource: DueDateSource): T[] {
  if (status === 'all') return rows;
  return rows.filter((row) => categorizeRecord(row, dueDateSource) === status);
}

export function countBuckets(rows: TrackableRecord[], dueDateSource: DueDateSource) {
  const initial = { completed: 0, wip: 0, overdue: 0, rework: 0, total: rows.length };
  return rows.reduce((acc, row) => {
    acc[categorizeRecord(row, dueDateSource)] += 1;
    return acc;
  }, initial);
}

export function aggregateDepartmentPending(rows: TrackableRecord[]) {
  return (Object.keys(DEPARTMENT_LABEL) as DepartmentKey[]).map((department) => {
    const pendingQty = rows.reduce((sum, row) => sum + row.pendingQty[department], 0);
    return { department, label: DEPARTMENT_LABEL[department], pendingQty };
  });
}

export function buildStatusByMonth(rows: TrackableRecord[], dueDateSource: DueDateSource) {
  const months = new Map<string, { month: string; completed: number; wip: number; overdue: number; rework: number }>();

  rows.forEach((row) => {
    const month = toMonth(getDueDate(row, dueDateSource));
    if (!months.has(month)) months.set(month, { month, completed: 0, wip: 0, overdue: 0, rework: 0 });
    months.get(month)![categorizeRecord(row, dueDateSource)] += 1;
  });

  return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function getPeriodLabel(row: TrackableRecord, mode: PeriodMode, dateSource: 'order' | 'ship', dueDateSource: DueDateSource): string {
  const sourceDate = dateSource === 'order' ? row.orderDate : getDueDate(row, dueDateSource);
  const month = toMonth(sourceDate);
  if (mode === 'month') return month;
  return month && month !== 'No date' ? month.slice(0, 4) : 'No date';
}

export function getItemGroup(row: TrackableRecord): ItemGroup {
  const itemCode = 'itemCode' in row ? String((row as ItemRecord).itemCode || '') : '';
  const groupSource = row.itemType || row.itemSku || itemCode || '';
  const prefix = groupSource.slice(0, 3).toUpperCase();
  return (ITEM_GROUPS as readonly string[]).includes(prefix) ? prefix as ItemGroup : 'Others';
}

export function buildItemGroupTrend(rows: TrackableRecord[], periodMode: PeriodMode, dateSource: 'order' | 'ship', dueDateSource: DueDateSource) {
  const periods = new Map<string, Record<ItemGroup | 'period' | 'total', string | number>>();

  rows.forEach((row) => {
    const period = getPeriodLabel(row, periodMode, dateSource, dueDateSource);
    if (!periods.has(period)) {
      periods.set(period, { period, BBS: 0, BES: 0, BNS: 0, BRS: 0, Others: 0, total: 0 });
    }
    const entry = periods.get(period)!;
    const group = getItemGroup(row);
    const qty = row.source === 'item' ? Number((row as ItemRecord).qty || 0) : Number(row.totalQty || 0);
    entry[group] = Number(entry[group] || 0) + qty;
    entry.total = Number(entry.total || 0) + qty;
  });

  return Array.from(periods.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)));
}

export function buildYearComparison(rows: TrackableRecord[]) {
  const years = new Map<string, Record<ItemGroup | 'year' | 'total', string | number>>();

  rows.forEach((row) => {
    const year = getPeriodLabel(row, 'year', 'order', 'factory');
    if (year === 'No date') return;
    if (!years.has(year)) {
      years.set(year, { year, BBS: 0, BES: 0, BNS: 0, BRS: 0, Others: 0, total: 0 });
    }
    const entry = years.get(year)!;
    const group = getItemGroup(row);
    const qty = row.source === 'item' ? Number((row as ItemRecord).qty || 0) : Number(row.totalQty || 0);
    entry[group] = Number(entry[group] || 0) + qty;
    entry.total = Number(entry.total || 0) + qty;
  });

  return Array.from(years.values()).sort((a, b) => String(a.year).localeCompare(String(b.year)));
}

export function summarizeItemGroups(rows: TrackableRecord[]) {
  const totals: Record<ItemGroup, number> = { BBS: 0, BES: 0, BNS: 0, BRS: 0, Others: 0 };
  rows.forEach((row) => {
    const group = getItemGroup(row);
    totals[group] += row.source === 'item' ? Number((row as ItemRecord).qty || 0) : Number(row.totalQty || 0);
  });
  return ITEM_GROUPS.map((group) => ({ group, total: totals[group] }));
}

export function buildTopRiskRows(rows: TrackableRecord[], dueDateSource: DueDateSource, limit = 10) {
  return rows
    .map((row) => {
      const status = categorizeRecord(row, dueDateSource);
      const pendingTotal = Object.values(row.pendingQty).reduce((sum, qty) => sum + qty, 0);
      const riskScore = (status === 'overdue' ? 100000 : 0) + (status === 'rework' ? 50000 : 0) + pendingTotal;
      return { ...row, status, pendingTotal, riskScore };
    })
    .filter((row) => row.status === 'overdue' || row.status === 'rework' || row.pendingTotal > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

export function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function itemSkuFromItemNo(itemNo: string | null | undefined): string {
  const raw = itemNo || '';
  return raw.replace(/[A-Za-z]$/, '') || raw || '-';
}

function itemTypeFromItemNo(itemNo: string | null | undefined): string {
  const raw = (itemNo || '').toUpperCase();
  const match = raw.match(/^[A-Z]{3}/);
  return match ? match[0] : 'Others';
}

function toOrderRecord(order: OrderSummary): OrderRecord {
  const totalQty = toNumber(order.TotalQty);
  const finishQty = toNumber(order.FinishQty);
  const exportQty = toNumber(order.ExportQty);
  const qcFailQty = toNumber(order.QC1_Fail) + toNumber(order.QC2_Fail);

  return {
    source: 'order',
    id: order.OrdNo || order.PONo || `${order.CustCode || 'ORDER'}-${order.DueDate || ''}`,
    ordNo: order.OrdNo || '-',
    po: order.PONo || '-',
    customerCode: order.CustCode || '-',
    customerName: order.CustName || '-',
    shipTo: order.ShipTo || '-',
    ordKind: order.OrdKind || '-',
    material: order.OrdMat || '-',
    orderDate: toISODate(order.OrdDate),
    dueDate: toISODate(order.DueDate),
    custDueDate: toISODate(order.CustDueDate),
    pendingQty: buildPendingQty(order),
    closeStatus: order.CloseStatus,
    finishQty,
    exportQty,
    totalQty,
    qcFailQty,
    riskText: [order.ProdRiskIssue, order.TrackRemark, order.ProductionRemark].filter(Boolean).join(' '),
    itemType: itemTypeFromItemNo(order.SampleItemNo),
    itemSku: itemSkuFromItemNo(order.SampleItemNo),
    numSKU: toNumber(order.NumSKU),
  };
}

function toItemRecord(order: OrderSummary, index: number): ItemRecord {
  const base = toOrderRecord(order);
  const itemCode = order.SampleItemNo || `${order.PONo || order.OrdNo || 'ORDER'}-SUMMARY`;
  const itemSku = itemSkuFromItemNo(order.SampleItemNo) || itemCode;

  return {
    ...base,
    source: 'item',
    id: `${base.id}-${itemCode}-${index}`,
    itemId: `${base.id}-${itemCode}-${index}`,
    itemCode,
    itemSku,
    itemType: itemTypeFromItemNo(order.SampleItemNo),
    qty: base.totalQty,
  };
}

export function useSalesOrderAnalyticsData() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const range = getDefaultRange();
      const result = await fetchOrders({ status: 'all', dateType: 'All', ...range });

      if (cancelled) return;
      if (!result.ok) {
        setOrders([]);
        setItems([]);
        setError(result.error || 'Failed to load sales order analytics data');
      } else {
        setOrders(result.data.map(toOrderRecord));
        setItems(result.data.map(toItemRecord));
      }
      setLoading(false);
    }

    load().catch((err) => {
      if (!cancelled) {
        setOrders([]);
        setItems([]);
        setError(err instanceof Error ? err.message : 'Failed to load sales order analytics data');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { orders, items, loading, error };
}

export function useAvailableMonths(orders: TrackableRecord[]) {
  return useMemo(() => {
    const orderMonths = new Set<string>();
    const shipMonths = new Set<string>();

    orders.forEach((order) => {
      orderMonths.add(toMonth(order.orderDate));
      shipMonths.add(toMonth(order.dueDate || order.custDueDate));
    });

    return {
      orderMonths: Array.from(orderMonths).filter(Boolean).sort(),
      shipMonths: Array.from(shipMonths).filter(Boolean).sort(),
    };
  }, [orders]);
}
