import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  fetchSalesOrders,
  fetchSalesMonthlyAnalytics,
  fetchSalesTypeAnalytics,
  fetchSalesDeliveryOutlook,
  type SalesOrderRow,
  type SalesMonthlyPoint,
  type SalesTypePoint,
  type DeliveryOutlookResponse,
  type SalesAnalyticsParams
} from '../services/orderVolumeSummaryAPI';
import { CUSTOMER_GROUPS } from '../config/customerGroups';

// --- Types ---
export type Metric = 'amount' | 'qty';
export type TrendGranularity = 'monthly' | 'weekly';
export const SALES_TYPE_OPTIONS = [
  { value: 'BBS', label: 'Bracelet / Bangle' },
  { value: 'BES', label: 'Earring' },
  { value: 'BNS', label: 'Necklace' },
  { value: 'BRS', label: 'Ring' },
  { value: 'OTHERS', label: 'Others' },
] as const;
export type SalesTypeCode = typeof SALES_TYPE_OPTIONS[number]['value'];

export const SALES_TYPE_COLORS: Record<SalesTypeCode, string> = {
  BBS: 'var(--color-chart-1)',
  BES: 'var(--color-chart-2)',
  BNS: 'var(--color-chart-3)',
  BRS: 'var(--color-chart-4)',
  OTHERS: 'var(--color-chart-6)',
};
export type KpiTypeSelection = 'ALL' | SalesTypeCode;
export type ViewMode = 'overview' | 'details';
export type DrilldownBasis = 'order' | 'due';
export type Drilldown = { year: string; month?: string; week?: number; type?: string; basis?: DrilldownBasis; metric?: Metric };
export type SalesTotals = {
  avgQtyPerOrder: number;
  avgAmountPerOrder: number;
  qty: number;
  amount: number;
  shippedQty: number;
  shippedAmount: number;
  gapQty: number;
  gapAmount: number;
  orders: number;
};
export type TrendComparisonDatum = {
  label: string;
  periodNumber: number;
  report: number;
  compare: number;
  reportShipped?: number;
  compareShipped?: number;
};
export type WeeklyComparisonGroup = {
  monthNumber: number;
  monthLabel: string;
  weeks: Array<TrendComparisonDatum & { dateRange: string }>;
};
export type TooltipPayloadEntry = {
  color?: string;
  dataKey?: string | number;
  name?: string;
  payload?: TrendComparisonDatum;
  value?: number;
};
export type TypeContributionRow = {
  code: SalesTypeCode;
  label: string;
  current: number;
  compare: number;
  orderCount: number;
  share: number;
};
export type DueOutlookDatum = {
  monthNumber: number;
  monthLabel: string;
  dueQty: number;
  shippedQty: number;
  openQty: number;
  dueAmount: number;
  shippedAmount: number;
  openAmount: number;
  overdueOrders: number;
  dueSoonOrders: number;
};

export const ORDER_DETAIL_COLUMNS = [
  ['OrdNo', 105],
  ['PONo', 140],
  ['PO 2', 110],
  ['CustCode', 85],
  ['CustDueDate', 110],
  ['Department', 110],
  ['Due Risk', 110],
  ['Ship To', 120],
  ['ItemNo', 110],
  ['Type', 80],
  ['Cust Item', 110],
  ['ItemMat', 70],
  ['ItemSize', 90],
  ['ItemStone', 110],
  ['ItemPlate', 110],
  ['OrdQTY', 85],
  ['ExportQTY', 85],
  ['OpenQTY', 85],
  ['Price', 85],
  ['Amount', 110]
] as const;

// --- Helpers ---
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const emptyTotals: SalesTotals = { avgQtyPerOrder: 0, avgAmountPerOrder: 0, qty: 0, amount: 0, shippedQty: 0, shippedAmount: 0, gapQty: 0, gapAmount: 0, orders: 0 };

function selectedCustomerCodes(groupIds: string[]) {
  if (groupIds.length === 0) return [];
  return CUSTOMER_GROUPS.filter((group: any) => groupIds.includes(group.id)).flatMap((group: any) => group.prefixes);
}

function calcTotalsFromMonthly(rows: SalesMonthlyPoint[], year: string): SalesTotals {
  const yearNum = Number(year);
  const filtered = rows.filter(r => r.year === yearNum);
  if (filtered.length === 0) return emptyTotals;
  const qty = filtered.reduce((s, r) => s + (r.qty || 0), 0);
  const amount = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const shippedQty = filtered.reduce((s, r) => s + (r.shippedQty || 0), 0);
  const shippedAmount = filtered.reduce((s, r) => s + (r.shippedAmount || 0), 0);
  const gapQty = filtered.reduce((s, r) => s + (r.gapQty || 0), 0);
  const gapAmount = amount > shippedAmount ? amount - shippedAmount : 0;
  const orders = filtered.reduce((s, r) => s + (r.orderCount || 0), 0);
  const avgQtyPerOrder = orders > 0 ? qty / orders : 0;
  const avgAmountPerOrder = orders > 0 ? amount / orders : 0;
  return { avgQtyPerOrder, avgAmountPerOrder, qty, amount, shippedQty, shippedAmount, gapQty, gapAmount, orders };
}

function buildMonthlyComparison(rows: SalesMonthlyPoint[], primaryYear: string, compareYear?: string, metric: Metric = 'amount'): TrendComparisonDatum[] {
  const pYear = Number(primaryYear);
  const cYear = compareYear ? Number(compareYear) : null;
  const data: TrendComparisonDatum[] = [];
  for (let m = 1; m <= 12; m++) {
    const primary = rows.find(r => r.year === pYear && r.month === m);
    const compare = cYear ? rows.find(r => r.year === cYear && r.month === m) : null;
    const report = metric === 'amount' ? (primary?.amount || 0) : (primary?.qty || 0);
    const comp = metric === 'amount' ? (compare?.amount || 0) : (compare?.qty || 0);
    if (report > 0 || comp > 0) {
      data.push({
        label: MONTHS[m - 1],
        periodNumber: m,
        report,
        compare: comp,
        reportShipped: metric === 'amount' ? (primary?.shippedAmount || 0) : (primary?.shippedQty || 0),
        compareShipped: metric === 'amount' ? (compare?.shippedAmount || 0) : (compare?.shippedQty || 0),
      });
    }
  }
  return data;
}

function buildTypeContribution(rows: SalesTypePoint[], primaryYear: string, compareYear: string | undefined, primaryMetric: number, metric: Metric = 'amount'): TypeContributionRow[] {
  const pYear = Number(primaryYear);
  const cYear = compareYear ? Number(compareYear) : null;
  return SALES_TYPE_OPTIONS.map(opt => {
    const primaryRows = rows.filter(r => r.year === pYear && r.typeCode === opt.value);
    const compareRows = cYear ? rows.filter(r => r.year === cYear && r.typeCode === opt.value) : [];
    const current = metric === 'amount' ? primaryRows.reduce((s, r) => s + (r.amount || 0), 0) : primaryRows.reduce((s, r) => s + (r.qty || 0), 0);
    const compare = metric === 'amount' ? compareRows.reduce((s, r) => s + (r.amount || 0), 0) : compareRows.reduce((s, r) => s + (r.qty || 0), 0);
    const orderCount = primaryRows.reduce((s, r) => s + r.orderCount, 0);
    return {
      code: opt.value,
      label: opt.label,
      current,
      compare,
      orderCount,
      share: primaryMetric > 0 ? (current / primaryMetric) * 100 : 0,
    };
  });
}

export function kpiTypeLabel(selectedType: KpiTypeSelection) {
  if (selectedType === 'ALL') return 'All Types';
  return SALES_TYPE_OPTIONS.find(option => option.value === selectedType)?.label || selectedType;
}

export function growthPercent(primary: number, compare: number) {
  if (compare === 0) return 0;
  return ((primary - compare) / compare) * 100;
}

// --- Formatting ---
export const fmtQty = (value: number) => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
export const fmtCurrency = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtMetric = (value: number, metric: Metric) => metric === 'amount' ? fmtCurrency(value) : fmtQty(value);
export const fmtSignedMetric = (value: number, metric: Metric) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${fmtMetric(Math.abs(value), metric)}`;
export const fmtPercent = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(value).toFixed(1)}%`;
const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
export const fmtAxis = (value: number, metric: Metric) => metric === 'amount' ? `$${compactNumber.format(value)}` : `${compactNumber.format(value)}`;

export function useOrderVolumeSummaryData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedYears, selectedMonths, selGroups: selectedGroups, availableYears, kpiCompareYear } = useOutletContext<{
    selectedYears: string[];
    selectedMonths: string[];
    selGroups: string[];
    availableYears: string[];
    kpiCompareYear?: string;
  }>();

  const loadRequestIdRef = useRef(0);
  const [selectedKpiType, setSelectedKpiType] = useState<KpiTypeSelection>('ALL');
  const urlMetric = searchParams.get('metric') as Metric | null;
  const metric: Metric = urlMetric === 'qty' ? 'qty' : 'amount';

  const switchMetric = (m: Metric) => {
    const newParams = new URLSearchParams(searchParams);
    if (m === 'qty') newParams.set('metric', 'qty');
    else newParams.delete('metric');
    setSearchParams(newParams, { replace: true });
  };

  const [activeView, setActiveView] = useState<ViewMode>('overview');
  const [drilldown, setDrilldown] = useState<Drilldown | null>(null);

  const [monthlyData, setMonthlyData] = useState<SalesMonthlyPoint[]>([]);
  const [typeData, setTypeData] = useState<SalesTypePoint[]>([]);
  const [deliveryOutlookData, setDeliveryOutlookData] = useState<DeliveryOutlookResponse | null>(null);

  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedCustCode, setSelectedCustCode] = useState<string | null>(null);

  const [drilldownOrders, setDrilldownOrders] = useState<SalesOrderRow[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const yearsLoading = availableYears.length === 0;
  const [loading, setLoading] = useState(true);
  const [hasResolvedData, setHasResolvedData] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const customers = useMemo(() => selectedCustomerCodes(selectedGroups), [selectedGroups]);
  const drilldownKey = drilldown ? `${drilldown.basis || 'order'}|${drilldown.year}|${drilldown.month || 'all'}|${drilldown.week || 'all'}|${drilldown.type || 'all'}` : 'all';
  const filterPageKey = `${selectedYears.join('|')}|${selectedGroups.join('|')}|${search}|${drilldownKey}|${selectedBucket || ''}|${selectedDepartment || ''}|${selectedCustCode || ''}`;

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(resetTimer);
  }, [filterPageKey]);

  const loadOverviewData = useCallback(async () => {
    if (yearsLoading) return;
    const requestId = ++loadRequestIdRef.current;
    if (selectedYears.length === 0) {
      setMonthlyData([]);
      setTypeData([]);
      setDeliveryOutlookData(null);
      setHasResolvedData(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasResolvedData(false);
    setError('');

    const apiParams = {
      years: selectedYears,
      months: selectedMonths,
      customers,
    };

    try {
      const [monthlyResult, typeResult, deliveryResult] = await Promise.allSettled([
        fetchSalesMonthlyAnalytics(apiParams),
        fetchSalesTypeAnalytics(apiParams),
        fetchSalesDeliveryOutlook(apiParams),
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      if (monthlyResult.status === 'fulfilled') setMonthlyData(monthlyResult.value);
      else { setMonthlyData([]); setError(monthlyResult.reason instanceof Error ? monthlyResult.reason.message : 'Failed to load monthly analytics'); }

      if (typeResult.status === 'fulfilled') setTypeData(typeResult.value);
      else setTypeData([]);

      if (deliveryResult.status === 'fulfilled') setDeliveryOutlookData(deliveryResult.value);
      else setDeliveryOutlookData(null);

      if (monthlyResult.status === 'fulfilled' || typeResult.status === 'fulfilled' || deliveryResult.status === 'fulfilled') {
        setHasResolvedData(true);
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setMonthlyData([]);
      setTypeData([]);
      setDeliveryOutlookData(null);
      setError(err instanceof Error ? err.message : 'Failed to load order volume summary');
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }, [customers, selectedYears, selectedMonths, yearsLoading]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOverviewData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOverviewData]);

  useEffect(() => () => {
    loadRequestIdRef.current += 1;
  }, []);

  const primaryYear = selectedYears[selectedYears.length - 1] || availableYears[availableYears.length - 1] || '';
  const compareYear = (kpiCompareYear && selectedYears.includes(kpiCompareYear) && kpiCompareYear !== primaryYear)
    ? kpiCompareYear
    : (selectedYears.find(year => year !== primaryYear) || 'none');
  const hasCompareYear = compareYear !== 'none';

  const primaryTotals = useMemo(() => calcTotalsFromMonthly(monthlyData, primaryYear), [monthlyData, primaryYear]);
  const compareTotals = useMemo(() => hasCompareYear ? calcTotalsFromMonthly(monthlyData, compareYear) : emptyTotals, [monthlyData, compareYear, hasCompareYear]);
  const primaryMetric = metric === 'amount' ? primaryTotals.amount : primaryTotals.qty;

  const selectedTypeTotals = useMemo(() => {
    if (selectedKpiType === 'ALL') {
      return {
        primary: primaryTotals,
        compare: compareTotals,
        isFiltered: false,
        typeName: 'All Types'
      };
    }
    const pYear = Number(primaryYear);
    const cYear = hasCompareYear ? Number(compareYear) : null;
    const pRows = typeData.filter(r => r.year === pYear && r.typeCode === selectedKpiType);
    const cRows = cYear ? typeData.filter(r => r.year === cYear && r.typeCode === selectedKpiType) : [];

    const pQty = pRows.reduce((s, r) => s + (r.qty || 0), 0);
    const pShippedQty = pRows.reduce((s, r) => s + (r.shippedQty || 0), 0);
    const pOpenQty = pRows.reduce((s, r) => s + (r.openQty !== undefined ? r.openQty : Math.max(0, r.qty - (r.shippedQty || 0))), 0);
    const pAmount = pRows.reduce((s, r) => s + (r.amount || 0), 0);
    const pShippedAmount = pRows.reduce((s, r) => s + (r.shippedAmount || 0), 0);
    const pOrders = pRows.reduce((s, r) => s + (r.orderCount || 0), 0);

    const cQty = cRows.reduce((s, r) => s + (r.qty || 0), 0);
    const cAmount = cRows.reduce((s, r) => s + (r.amount || 0), 0);

    return {
      primary: {
        qty: pQty,
        shippedQty: pShippedQty,
        gapQty: pOpenQty,
        amount: pAmount,
        shippedAmount: pShippedAmount,
        gapAmount: Math.max(0, pAmount - pShippedAmount),
        orders: pOrders,
        avgQtyPerOrder: pOrders > 0 ? pQty / pOrders : 0,
        avgAmountPerOrder: pOrders > 0 ? pAmount / pOrders : 0,
      },
      compare: {
        qty: cQty,
        amount: cAmount,
      },
      isFiltered: true,
      typeName: kpiTypeLabel(selectedKpiType)
    };
  }, [selectedKpiType, primaryTotals, compareTotals, typeData, primaryYear, compareYear, hasCompareYear]);

  const kpiPrimaryMetric = metric === 'amount' ? selectedTypeTotals.primary.amount : selectedTypeTotals.primary.qty;
  const kpiCompareMetric = metric === 'amount' ? selectedTypeTotals.compare.amount : selectedTypeTotals.compare.qty;
  const kpiChangeAmount = hasCompareYear ? kpiPrimaryMetric - kpiCompareMetric : 0;
  const kpiGrowthRate = hasCompareYear && kpiCompareMetric !== 0 ? growthPercent(kpiPrimaryMetric, kpiCompareMetric) : null;
  const kpiDeliveryRate = selectedTypeTotals.primary.qty > 0 ? (selectedTypeTotals.primary.shippedQty / selectedTypeTotals.primary.qty) * 100 : 0;
  const kpiOutstandingMetric = metric === 'amount' ? selectedTypeTotals.primary.gapAmount : selectedTypeTotals.primary.gapQty;

  const loadDrilldownOrders = useCallback(async (dd: Drilldown) => {
    setDrilldownLoading(true);
    setDrilldownOrders([]);
    try {
      const params: SalesAnalyticsParams = {
        years: [dd.year],
        months: dd.month ? [dd.month] : selectedMonths,
        customers,
      };
      if (dd.type) params.types = [dd.type];
      if (dd.basis === 'due') params.dateView = 'custdate';

      const orders = await fetchSalesOrders(params);
      setDrilldownOrders(orders);
    } catch {
      setDrilldownOrders([]);
    } finally {
      setDrilldownLoading(false);
    }
  }, [selectedMonths, customers]);

  const loadFilteredDeliveryOrders = useCallback(async (bucket: string | null, dept: string | null, custCode: string | null) => {
    setDrilldownLoading(true);
    setActiveView('details');
    try {
      const params: SalesAnalyticsParams = {
        years: selectedYears,
        months: selectedMonths,
        customers: custCode ? [custCode] : customers,
      };
      if (bucket) params.bucket = bucket;
      if (dept) params.department = dept;
      const orders = await fetchSalesOrders(params);
      setDrilldownOrders(orders);
      setDrilldown({
        basis: 'due',
        year: primaryYear,
        type: dept ? `Dept: ${dept}` : bucket ? `Risk: ${bucket}` : custCode ? `Cust: ${custCode}` : undefined
      });
    } catch {
      setDrilldownOrders([]);
    } finally {
      setDrilldownLoading(false);
    }
  }, [selectedYears, selectedMonths, customers, primaryYear]);

  const handleSelectBucket = (bucket: string | null) => {
    setSelectedBucket(bucket);
    if (bucket) {
      void loadFilteredDeliveryOrders(bucket, selectedDepartment, selectedCustCode);
    }
  };

  const handleSelectDepartment = (dept: string | null) => {
    setSelectedDepartment(dept);
    if (dept) {
      void loadFilteredDeliveryOrders(selectedBucket, dept, selectedCustCode);
    }
  };

  const handleSelectCustCode = (custCode: string | null) => {
    setSelectedCustCode(custCode);
    if (custCode) {
      void loadFilteredDeliveryOrders(selectedBucket, selectedDepartment, custCode);
    }
  };

  const monthlyComparisonData = useMemo(
    () => buildMonthlyComparison(monthlyData, primaryYear, hasCompareYear ? compareYear : undefined, metric),
    [monthlyData, primaryYear, compareYear, hasCompareYear, metric],
  );

  const typeContribution = useMemo(
    () => buildTypeContribution(typeData, primaryYear, hasCompareYear ? compareYear : undefined, primaryMetric, metric),
    [typeData, primaryYear, compareYear, hasCompareYear, primaryMetric, metric],
  );

  const filteredOrderRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? drilldownOrders.filter(row => [
        row.orderNo,
        row.poNo,
        row.itemNo,
        row.customerCode,
        row.productTypeCode,
      ].some(value => String(value || '').toLowerCase().includes(q)))
      : drilldownOrders;

    return [...rows].sort((a, b) => {
      const metricSort = Number(b.orderQty || 0) - Number(a.orderQty || 0);
      const dateSort = (b.ordDate ? new Date(b.ordDate).getTime() : 0) - (a.ordDate ? new Date(a.ordDate).getTime() : 0);
      return metricSort || dateSort || String(a.orderNo || '').localeCompare(String(b.orderNo || ''));
    });
  }, [drilldownOrders, search]);

  const clearSearch = () => setSearch('');
  const retryLoad = () => {
    if (availableYears.length === 0) {
      window.location.reload();
      return;
    }
    void loadOverviewData();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') clearSearch();
  };

  const resetDrilldown = () => {
    setDrilldown(null);
    setDrilldownOrders([]);
    setSelectedBucket(null);
    setSelectedDepartment(null);
    setSelectedCustCode(null);
    setActiveView('overview');
  };

  const openChartDetail = (year: string, periodNumber: number | undefined, type?: SalesTypeCode) => {
    const dd: Drilldown = {
      year,
      month: periodNumber ? String(periodNumber) : undefined,
      type,
      basis: 'order',
      metric,
    };
    setDrilldown(dd);
    setSearch('');
    setPage(1);
    setActiveView('details');
    void loadDrilldownOrders(dd);
  };

  return {
    metric, switchMetric,
    activeView, setActiveView,
    drilldown, setDrilldown, resetDrilldown,
    monthlyData, typeData, deliveryOutlookData,
    selectedBucket, handleSelectBucket,
    selectedDepartment, handleSelectDepartment,
    selectedCustCode, handleSelectCustCode,
    drilldownOrders, drilldownLoading, loadDrilldownOrders,
    loading, error, hasResolvedData, retryLoad, loadOverviewData,
    search, setSearch, clearSearch, handleSearchKeyDown,
    page, setPage,
    primaryYear, compareYear, hasCompareYear,
    primaryMetric, selectedTypeTotals,
    kpiPrimaryMetric, kpiCompareMetric, kpiChangeAmount, kpiGrowthRate, kpiDeliveryRate, kpiOutstandingMetric,
    selectedKpiType, setSelectedKpiType,
    monthlyComparisonData, typeContribution,
    filteredOrderRows,
    selectedYears, selectedGroups, availableYears,
    openChartDetail
  };
}
