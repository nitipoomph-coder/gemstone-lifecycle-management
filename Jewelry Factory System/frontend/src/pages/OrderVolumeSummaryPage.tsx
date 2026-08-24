import {
  pageShell, orderPanel, panelTitle, panelHeaderRight, panelMeta, tableScroll, tdStrongCenter, tdStrong, tdCenter, td, tdStrongRight, linkButton, paginationBar, paginationText, paginationButtons, pageButton, pageButtonDisabled, pageText
} from '../components/infographic/InfographicSalesTrends';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  CustomerTrendsLoadingState,
  TrendComparisonChart,
  TypeContribution,
  SearchBox,
  SummaryMetric,
  KpiTypeSelect,
  // @ts-ignore
  FilterChip,
  EmptyRow,
  // @ts-ignore
  TableSkeletonRows
} from '../components/infographic/InfographicSalesTrends';
// @ts-ignore
import { ArrowRight, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, DollarSign, FilterX, Hash, RefreshCw, Search, SlidersHorizontal, Table2, X, Factory, Printer } from 'lucide-react';
// @ts-ignore
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import '../components/sales/SalesDenseTable.css';
import './OrderVolumeSummaryPage.css';
import { CUSTOMER_GROUPS } from '../config/customerGroups';
import { printChartDashboard } from '../utils/printChart';
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
import { DeliveryAndDepartmentOutlook } from '../components/sales/DeliveryAndDepartmentOutlook';
import { ErpIconButton, ErpSegmentedControl } from '../components/ui/ErpButtons';
// @ts-ignore
import CustomSelect from '../components/ui/CustomSelect';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAGE_SIZE = 50;
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

export const SALES_TYPE_OPTIONS = [
  { value: 'BBS', label: 'Bracelet / Bangle' },
  { value: 'BES', label: 'Earring' },
  { value: 'BNS', label: 'Necklace' },
  { value: 'BRS', label: 'Ring' },
  { value: 'OTHERS', label: 'Others' },
] as const;

export type Metric = 'amount' | 'qty';
export type TrendGranularity = 'monthly' | 'weekly';
export type SalesTypeCode = typeof SALES_TYPE_OPTIONS[number]['value'];
export type KpiTypeSelection = 'ALL' | SalesTypeCode;
export type ViewMode = 'overview' | 'details';
type DrilldownBasis = 'order' | 'due';
type Drilldown = { year: string; month?: string; week?: number; type?: string; basis?: DrilldownBasis; metric?: Metric };
type SalesTotals = {
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

export const SALES_TYPE_COLORS: Record<SalesTypeCode, string> = {
  BBS: 'var(--color-chart-1)',
  BES: 'var(--color-chart-2)',
  BNS: 'var(--color-chart-3)',
  BRS: 'var(--color-chart-4)',
  OTHERS: 'var(--color-chart-6)',
};

const emptyTotals: SalesTotals = { avgQtyPerOrder: 0, avgAmountPerOrder: 0, qty: 0, amount: 0, shippedQty: 0, shippedAmount: 0, gapQty: 0, gapAmount: 0, orders: 0 };

export const fmtQty = (value: number) => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
export const fmtCurrency = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtMetric = (value: number, metric: Metric) => metric === 'amount' ? fmtCurrency(value) : fmtQty(value);
export const fmtSignedMetric = (value: number, metric: Metric) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${fmtMetric(Math.abs(value), metric)}`;
export const fmtPercent = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(value).toFixed(1)}%`;
const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
export const fmtAxis = (value: number, metric: Metric) => metric === 'amount' ? `$${compactNumber.format(value)}` : `${compactNumber.format(value)}`;

function selectedCustomerCodes(groupIds: string[]) {
  if (groupIds.length === 0) return [];
  return CUSTOMER_GROUPS.filter(group => groupIds.includes(group.id)).flatMap(group => group.prefixes);
}

// ═══════════════════════════════════════════════════════════════
// Aggregated data → chart data transformations
// ═══════════════════════════════════════════════════════════════

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

function kpiTypeLabel(selectedType: KpiTypeSelection) {
  if (selectedType === 'ALL') return 'All Types';
  return SALES_TYPE_OPTIONS.find(option => option.value === selectedType)?.label || selectedType;
}

function growthPercent(primary: number, compare: number) {
  if (compare === 0) return 0;
  return ((primary - compare) / compare) * 100;
}

// ═══════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════

export default function OrderVolumeSummaryPage() {
  const navigate = useNavigate();
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

  // ─── Aggregated API data (lightweight, for Overview) ───
  const [monthlyData, setMonthlyData] = useState<SalesMonthlyPoint[]>([]);
  const [typeData, setTypeData] = useState<SalesTypePoint[]>([]);
  const [deliveryOutlookData, setDeliveryOutlookData] = useState<DeliveryOutlookResponse | null>(null);

  // ─── Delivery Outlook Filter States ───
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedCustCode, setSelectedCustCode] = useState<string | null>(null);

  // ─── Raw orders (heavy, only for Drill-down) ───
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

  // ═══════════════════════════════════════════════════════════
  // Data Loading: Aggregated APIs for Overview
  // ═══════════════════════════════════════════════════════════

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

    // ใช้ years + months params → SQL จะ build OR conditions แยกเดือนต่อปี = แม่นยำ
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

  // ═══════════════════════════════════════════════════════════
  // Computed data from aggregated API results
  // ═══════════════════════════════════════════════════════════

  const primaryYear = selectedYears[selectedYears.length - 1] || availableYears[availableYears.length - 1] || '';
  const compareYear = (kpiCompareYear && selectedYears.includes(kpiCompareYear) && kpiCompareYear !== primaryYear)
    ? kpiCompareYear
    : (selectedYears.find(year => year !== primaryYear) || 'none');
  const hasCompareYear = compareYear !== 'none';

  const primaryTotals = useMemo(() => calcTotalsFromMonthly(monthlyData, primaryYear), [monthlyData, primaryYear]);
  const compareTotals = useMemo(() => hasCompareYear ? calcTotalsFromMonthly(monthlyData, compareYear) : emptyTotals, [monthlyData, compareYear, hasCompareYear]);
  const primaryMetric = metric === 'amount' ? primaryTotals.amount : primaryTotals.qty;

  // ─── Dynamic KPI Calculation based on selectedKpiType ───
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

  // ═══════════════════════════════════════════════════════════
  // Drill-down: Lazy-load raw orders on demand
  // ═══════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════
  // Drill-down order filtering
  // ═══════════════════════════════════════════════════════════

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

  const totalPages = Math.max(1, Math.ceil(filteredOrderRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredOrderRows.length);
  const pageRows = filteredOrderRows.slice(pageStart, pageEnd);
  const selectedYearSummary = hasCompareYear ? `${primaryYear} vs ${compareYear}` : primaryYear || '-';
  const selectedGroupSummary = selectedGroups.length === 0 ? 'All groups' : `${selectedGroups.length} groups`;
  const hasOverviewData = monthlyData.length > 0 || typeData.length > 0;
  const loadingScopeSummary = primaryYear ? `${selectedYearSummary} / ${selectedGroupSummary} / ${metric === 'amount' ? 'Sales ($)' : 'Quantity (PCS)'}` : 'Preparing available reporting periods';
  const loadFailure = !hasResolvedData ? error : '';
  const orderCountHint = selectedTypeTotals.isFiltered
    ? `${selectedTypeTotals.typeName}`
    : `${fmtQty(typeData.filter(r => r.year === Number(primaryYear)).reduce((s, r) => s + r.orderCount, 0))} Total orders`;

  const clearSearch = () => {
    setSearch('');
  };

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

  const handlePrint = () => {
    const title = `Order_Trends_${activeView}_${primaryYear}_${metric}`;
    printChartDashboard(title);
  };

  return (
    <>
      <div className="content-scrollbar flex-1 overflow-y-auto" style={pageShell}>
        <div className={`app-content-frame app-content-frame--workspace app-page-content customer-trends-page customer-trends-page--${activeView}`}>
          <header className="customer-trends-page-header">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>Order Trends</h1>
              <p>Sales & Order Volume Trends by Customer Group with line details</p>
            </div>
            <div className="customer-trends-page-header__actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <ErpSegmentedControl
                ariaLabel="Metric switch"
                value={metric}
                onChange={(v) => switchMetric(v as Metric)}
                options={[
                  { value: 'amount', label: 'Sales ($)', icon: <DollarSign size={13} /> },
                  { value: 'qty', label: 'Qty (PCS)', icon: <Hash size={13} /> },
                ]}
              />
              <div style={{ width: '1px', height: '20px', background: 'var(--color-border)' }} />
              <ErpSegmentedControl
                ariaLabel="Order Volume Summary view"
                value={activeView}
                onChange={(v) => {
                  setActiveView(v as ViewMode);
                  if (v === 'overview') {
                    setDrilldown(null);
                    setDrilldownOrders([]);
                  }
                }}
                options={[
                  { value: 'overview', label: 'Overview', icon: <BarChart3 size={13} /> },
                  { value: 'details', label: 'Order Details', icon: <Table2 size={13} /> },
                ]}
              />
              <div style={{ width: '1px', height: '20px', background: 'var(--color-border)' }} />
              <button
                type="button"
                disabled={loading}
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)',
                  fontSize: 'var(--erp-text-control)',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Print current page or Save as PDF (Ctrl+P)"
              >
                <Printer size={13} style={{ color: 'var(--color-brand-600)' }} />
                <span>Print / PDF</span>
              </button>
              <ErpIconButton label="Reload data" tone="refresh" onClick={() => void loadOverviewData()} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />} disabled={loading} size="sm" />
            </div>
          </header>

          {loading ? (
            <CustomerTrendsLoadingState
              activeView={activeView}
              granularity="monthly"
              scopeSummary={loadingScopeSummary}
            />
          ) : loadFailure ? (
            <div className="customer-trends-load-failure" role="alert">
              <div className="customer-trends-error">
                <span>{loadFailure}</span>
                <button type="button" onClick={retryLoad}><RefreshCw size={13} />Retry</button>
              </div>
            </div>
          ) : (
            <>
              {activeView === 'overview' && (
                <section className="customer-trends-summary" aria-label="Selected period summary">
                  <SummaryMetric
                    label={`Ordered ${metric === 'amount' ? 'Amount' : 'Qty'} ${primaryYear || '-'}`}
                    value={fmtMetric(kpiPrimaryMetric, metric)}
                    hint={selectedTypeTotals.isFiltered ? `${selectedTypeTotals.typeName}` : 'Primary year'}
                  />
                  <SummaryMetric
                    label={`Ordered ${metric === 'amount' ? 'Amount' : 'Qty'} ${hasCompareYear ? compareYear : '-'}`}
                    value={hasCompareYear ? fmtMetric(kpiCompareMetric, metric) : '-'}
                    hint={selectedTypeTotals.isFiltered ? `${selectedTypeTotals.typeName}` : 'Compare year'}
                    muted={!hasCompareYear}
                  />
                  <SummaryMetric
                    label={hasCompareYear ? `Change vs ${compareYear}` : 'Change'}
                    value={hasCompareYear ? fmtSignedMetric(kpiChangeAmount, metric) : '-'}
                    hint={kpiGrowthRate === null ? 'No comparison baseline' : fmtPercent(kpiGrowthRate)}
                    tone={!hasCompareYear || kpiChangeAmount === 0 ? undefined : kpiChangeAmount < 0 ? 'down' : 'up'}
                    muted={!hasCompareYear}
                  />
                  <SummaryMetric
                    label="Order Count"
                    value={fmtQty(selectedTypeTotals.primary.orders)}
                    hint={selectedTypeTotals.isFiltered ? `${selectedTypeTotals.typeName}` : orderCountHint}
                    control={<KpiTypeSelect value={selectedKpiType} onChange={setSelectedKpiType} />}
                  />
                  <SummaryMetric
                    label="Delivery Rate"
                    value={`${kpiDeliveryRate.toFixed(1)}%`}
                    hint={`${fmtQty(selectedTypeTotals.primary.shippedQty)} / ${fmtQty(selectedTypeTotals.primary.qty)} qty`}
                    tone={kpiDeliveryRate >= 100 ? 'up' : undefined}
                  />
                  <SummaryMetric
                    label={`Outstanding ${metric === 'amount' ? 'Balance' : 'Qty'}`}
                    value={fmtMetric(kpiOutstandingMetric, metric)}
                    hint={`${fmtQty(selectedTypeTotals.primary.orders)} orders`}
                  />
                </section>
              )}

              {error && (
                <div role="alert" className="customer-trends-error">
                  <span>{error}</span>
                  <button type="button" onClick={() => void loadOverviewData()}><RefreshCw size={13} />Retry</button>
                </div>
              )}

              {activeView === 'overview' && (
                <section id="customer-trends-overview-panel" className="customer-trends-overview">
                  <div className="customer-trends-overview__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2>Monthly Comparison & Product Type Breakdown</h2>
                      <span>{selectedYearSummary} / {metric === 'amount' ? 'Sales Amount ($)' : 'Ordered Quantity (PCS)'}</span>
                    </div>
                  </div>
                  {!hasOverviewData && !deliveryOutlookData ? (
                    <div className="customer-trends-empty">
                      <strong>No data for the current scope</strong>
                    </div>
                  ) : (
                    <>
                      {hasOverviewData && (
                        <div className="customer-trends-overview__body">
                          <div className="customer-trends-chart-area">
                            <TrendComparisonChart
                              data={monthlyComparisonData}
                              reportYear={primaryYear}
                              compareYear={hasCompareYear ? compareYear : undefined}
                              metric={metric}
                              granularity="monthly"
                              onDrilldown={openChartDetail}
                            />
                          </div>
                          <TypeContribution
                            rows={typeContribution}
                            metric={metric}
                            year={primaryYear}
                            compareYear={hasCompareYear ? compareYear : undefined}
                            total={primaryMetric}
                            onDrilldown={openChartDetail}
                          />
                        </div>
                      )}
                      <DeliveryAndDepartmentOutlook
                        data={deliveryOutlookData}
                        metric={metric}
                        year={primaryYear}
                        loading={loading}
                        selectedBucket={selectedBucket}
                        selectedDepartment={selectedDepartment}
                        selectedCustCode={selectedCustCode}
                        onSelectBucket={handleSelectBucket}
                        onSelectDepartment={handleSelectDepartment}
                        onSelectCustCode={handleSelectCustCode}
                      />
                    </>
                  )}
                </section>
              )}

              {activeView === 'details' && (
                <>
                  {drilldown && (
                    <div className="customer-trends-drilldown" role="status">
                      <span>Drill-down</span>
                      {drilldown.basis === 'due' && <strong>Customer Due</strong>}
                      <strong>{drilldown.year}</strong>
                      <strong>
                        {drilldown.week
                          ? `W${String(drilldown.week).padStart(2, '0')}`
                          : drilldown.month
                            ? MONTHS[Number(drilldown.month) - 1]
                            : 'Selected Dates'}
                      </strong>
                      {drilldown.type && <strong>{drilldown.type}</strong>}
                      {drilldown.basis === 'due' && <strong>Quantity</strong>}
                      <button type="button" onClick={resetDrilldown}><X size={13} />Clear</button>
                    </div>
                  )}
                  <section id="customer-trends-details-panel" className={['sales-dense-panel', filteredOrderRows.length > PAGE_SIZE ? 'sales-dense-panel--static-rows' : ''].filter(Boolean).join(' ')} style={orderPanel}>
                    <div className="sales-dense-panel__header customer-trends-order-header">
                      <h2 style={panelTitle}>Order Details</h2>
                      <div className="customer-trends-order-actions" style={panelHeaderRight}>
                        <div className="customer-trends-order-search">
                          <SearchBox
                            value={search}
                            onChange={value => setSearch(value.toUpperCase())}
                            onKeyDown={handleSearchKeyDown}
                            onClear={clearSearch}
                          />
                        </div>
                        <span style={panelMeta}>
                          {drilldownLoading
                            ? 'Loading...'
                            : `Showing ${filteredOrderRows.length === 0 ? 0 : pageStart + 1}-${pageEnd} of ${fmtQty(filteredOrderRows.length)} rows`}
                        </span>
                      </div>
                    </div>
                    <div className="content-scrollbar sales-dense-scroll" style={tableScroll}>
                      {drilldownLoading ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                          <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                          <p style={{ fontSize: 'var(--erp-text-control)', fontWeight: 800 }}>Loading order details...</p>
                        </div>
                      ) : !drilldown && drilldownOrders.length === 0 ? (
                        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                          <p style={{ fontSize: 'var(--erp-text-control)', fontWeight: 800 }}>Click a chart bar or type to view order details</p>
                        </div>
                      ) : (
                        <table className="sales-dense-table sales-dense-table--sticky-first" style={{ width: '100%', minWidth: 1600 }}>
                          <thead>
                            <tr>
                              {ORDER_DETAIL_COLUMNS.map(([head, width], index) => (
                                <th
                                  key={head}
                                  className={index >= 15 ? 'sales-dense-table__number' : undefined}
                                  style={{ width: Number(width) }}
                                >
                                  {head}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrderRows.length === 0 && <EmptyRow colSpan={20} label="No order item lines match the current filters." />}
                            {pageRows.map(row => {
                              const isOverdue = row.dueRiskBucket === 'Overdue';
                              const isDue15 = row.dueRiskBucket === 'Due in 15 Days';
                              const isDue30 = row.dueRiskBucket === 'Due in 16-30 Days';

                              return (
                                <tr key={`${row.orderNo}-${row.itemNo}-${row.ordDate}-${row.custDate}`}>
                                  <td style={tdStrongCenter}>{row.orderNo}</td>
                                  <td style={tdStrong}>{row.poNo || '-'}</td>
                                  <td style={tdStrong}>{row.po2 || '-'}</td>
                                  <td style={tdStrongCenter}>
                                    <span style={{ fontWeight: 900, color: 'var(--color-brand-600)' }}>
                                      {row.customerCode}
                                    </span>
                                  </td>
                                  <td style={{ ...tdCenter, fontWeight: isOverdue || isDue15 ? 900 : 700, color: isOverdue ? 'var(--color-danger-600)' : isDue15 ? 'var(--color-warning-600)' : 'inherit' }}>
                                    {row.custDate ? new Date(row.custDate).toISOString().slice(0, 10) : '-'}
                                  </td>
                                  <td style={tdCenter}>
                                    <span style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      padding: '2px 7px',
                                      borderRadius: 4,
                                      background: 'var(--color-surface-2)',
                                      color: 'var(--color-text-primary)',
                                      border: '1px solid var(--color-border-light)'
                                    }}>
                                      {row.currentDepartment || 'Wax'}
                                    </span>
                                  </td>
                                  <td style={tdCenter}>
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 900,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: isOverdue ? 'var(--color-danger-50)' : isDue15 ? 'var(--color-warning-50)' : isDue30 ? 'var(--color-success-50)' : 'var(--color-brand-50)',
                                      color: isOverdue ? 'var(--color-danger-600)' : isDue15 ? 'var(--color-warning-600)' : isDue30 ? 'var(--color-success-600)' : 'var(--color-brand-700)'
                                    }}>
                                      {row.dueRiskBucket || 'Scheduled'}
                                    </span>
                                  </td>
                                  <td style={tdStrong}>{row.shipTo || '-'}</td>
                                  <td style={tdStrongCenter}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(row.itemNo)}`)} style={linkButton}>{row.itemNo}</button></td>
                                  <td style={tdStrongCenter}>{row.productTypeCode || '-'}</td>
                                  <td style={tdStrongCenter}>{row.custItem || '-'}</td>
                                  <td style={tdCenter}>{row.itemMat || '-'}</td>
                                  <td style={td}>{row.itemSize || '-'}</td>
                                  <td style={td}>{row.itemStone || '-'}</td>
                                  <td style={tdStrongRight}>{row.itemPlate || '-'}</td>
                                  <td style={tdStrongRight}>{row.orderQty}</td>
                                  <td style={tdStrongRight}>{row.shippedQty}</td>
                                  <td style={{ ...tdStrongRight, color: row.openQty > 0 ? 'var(--color-brand-600)' : 'inherit' }}>{row.openQty || 0}</td>
                                  <td style={tdStrongRight}>{row.itemPrice !== undefined ? `$${Number(row.itemPrice).toFixed(2)}` : '-'}</td>
                                  <td style={tdStrongRight}>{row.itemAmnt !== undefined ? `$${Number(row.itemAmnt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                    {filteredOrderRows.length > PAGE_SIZE && (
                      <div className="sales-dense-pagination" style={paginationBar}>
                        <div style={paginationText}>Showing {filteredOrderRows.length === 0 ? 0 : pageStart + 1}-{pageEnd} of {fmtQty(filteredOrderRows.length)}</div>
                        <div style={paginationButtons}>
                          <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} title="Previous page" style={{ ...pageButton, ...(currentPage <= 1 ? pageButtonDisabled : null) }}><ChevronLeft size={14} /></button>
                          <span style={pageText}>Page {currentPage} / {totalPages}</span>
                          <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} title="Next page" style={{ ...pageButton, ...(currentPage >= totalPages ? pageButtonDisabled : null) }}><ChevronRight size={14} /></button>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
