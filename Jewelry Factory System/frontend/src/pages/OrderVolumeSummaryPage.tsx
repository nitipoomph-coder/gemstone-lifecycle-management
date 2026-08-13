import {
  pageShell, orderPanel, panelTitle, panelHeaderRight, panelMeta, tableScroll, tdStrongCenter, tdStrong, tdCenter, td, tdStrongRight, linkButton, paginationBar, paginationText, paginationButtons, pageButton, pageButtonDisabled, pageText
} from '../components/infographic/InfographicSalesTrends';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  CustomerTrendsLoadingState,
  WeeklyComparisonList,
  DueDateOutlook,
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
import { ArrowRight, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FilterX, Hash, RefreshCw, Search, SlidersHorizontal, Table2, X } from 'lucide-react';
// @ts-ignore
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import '../components/sales/SalesDenseTable.css';
import './OrderVolumeSummaryPage.css';
import { CUSTOMER_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import {
  fetchSalesOrders,
  fetchSalesMonthlyAnalytics,
  fetchSalesTypeAnalytics,
  fetchSalesWeeklyAnalytics,
  type SalesOrderRow,
  type SalesMonthlyPoint,
  type SalesTypePoint,
  type SalesWeeklyPoint,
} from '../services/orderVolumeSummaryAPI';
import { ErpIconButton, ErpSegmentedControl } from '../components/ui/ErpButtons';
// @ts-ignore
import CustomSelect from '../components/ui/CustomSelect';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAGE_SIZE = 50;
export const ORDER_DETAIL_COLUMNS = [
  ['OrdNo', 100],
  ['PONo', 150],
  ['PO 2', 120],
  ['CustCode', 90],
  ['Ship To', 130],
  ['OrdStamp', 90],
  ['OrdMaker', 90],
  ['ItemNo', 110],
  ['Type', 80],
  ['Cust Item', 120],
  ['ItemMat', 70],
  ['ItemSize', 100],
  ['ItemStone', 130],
  ['ItemDesc', 180],
  ['ItemPlate', 140],
  ['SetType', 80],
  ['OrdQTY', 90],
  ['ExportQTY', 90],
  ['OpenQTY', 90]
] as const;

export const SALES_TYPE_OPTIONS = [
  { value: 'BBS', label: 'Bracelet / Bangle' },
  { value: 'BES', label: 'Earring' },
  { value: 'BNS', label: 'Necklace' },
  { value: 'BRS', label: 'Ring' },
  { value: 'OTHERS', label: 'Others' },
] as const;

export type Metric = 'qty';
export type TrendGranularity = 'monthly' | 'weekly';
export type SalesTypeCode = typeof SALES_TYPE_OPTIONS[number]['value'];
export type KpiTypeSelection = 'ALL' | SalesTypeCode;
export type ViewMode = 'overview' | 'details';
type DrilldownBasis = 'order' | 'due';
type Drilldown = { year: string; month?: string; week?: number; type?: SalesTypeCode; basis?: DrilldownBasis; metric?: Metric };
type SalesTotals = {
  avgQtyPerOrder: number;
  qty: number;
  shippedQty: number;
  gapQty: number;
  orders: number;
};
type MonthlyTypeDatum = {
  month: string;
  monthNumber: number;
  total: number;
} & Record<SalesTypeCode, number>;
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

const emptyTotals: SalesTotals = { avgQtyPerOrder: 0, qty: 0, shippedQty: 0, gapQty: 0, orders: 0 };

export const fmtQty = (value: number) => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
export const fmtMetric = (value: number, metric: Metric) => fmtQty(value);
export const fmtSignedMetric = (value: number, metric: Metric) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${fmtMetric(Math.abs(value), metric)}`;
export const fmtPercent = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(value).toFixed(1)}%`;
const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
export const fmtAxis = (value: number, metric: Metric) => `${compactNumber.format(value)}`;

function selectedCustomerCodes(groupIds: string[]) {
  if (groupIds.length === 0) return [];
  return CUSTOMER_GROUPS.filter(group => groupIds.includes(group.id)).flatMap(group => group.prefixes);
}

function yearFromDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return String(date.getFullYear());
}

function monthFromDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return String(date.getMonth() + 1);
}

// ═══════════════════════════════════════════════════════════════
// Aggregated data → chart data transformations
// ═══════════════════════════════════════════════════════════════

function calcTotalsFromMonthly(rows: SalesMonthlyPoint[], year: string): SalesTotals {
  const yearNum = Number(year);
  const filtered = rows.filter(r => r.year === yearNum);
  if (filtered.length === 0) return emptyTotals;
  const qty = filtered.reduce((s, r) => s + r.qty, 0);
  const shippedQty = filtered.reduce((s, r) => s + r.shippedQty, 0);
  const gapQty = filtered.reduce((s, r) => s + r.gapQty, 0);
  const orders = filtered.reduce((s, r) => s + r.orderCount, 0);
  const avgQtyPerOrder = orders > 0 ? qty / orders : 0;
  return { avgQtyPerOrder, qty, shippedQty, gapQty, orders };
}

function buildMonthlyComparison(rows: SalesMonthlyPoint[], primaryYear: string, compareYear?: string): TrendComparisonDatum[] {
  const pYear = Number(primaryYear);
  const cYear = compareYear ? Number(compareYear) : null;
  const data: TrendComparisonDatum[] = [];
  for (let m = 1; m <= 12; m++) {
    const primary = rows.find(r => r.year === pYear && r.month === m);
    const compare = cYear ? rows.find(r => r.year === cYear && r.month === m) : null;
    const report = primary?.qty || 0;
    const comp = compare?.qty || 0;
    if (report > 0 || comp > 0) {
      data.push({
        label: MONTHS[m - 1],
        periodNumber: m,
        report,
        compare: comp,
        reportShipped: primary?.shippedQty || 0,
        compareShipped: compare?.shippedQty || 0,
      });
    }
  }
  return data;
}

function buildWeeklyComparison(rows: SalesWeeklyPoint[], primaryYear: string, compareYear?: string): TrendComparisonDatum[] {
  const pYear = Number(primaryYear);
  const cYear = compareYear ? Number(compareYear) : null;
  const allWeeks = new Set<number>();
  rows.forEach(r => {
    if (r.year === pYear || r.year === cYear) allWeeks.add(r.week);
  });
  const sortedWeeks = Array.from(allWeeks).sort((a, b) => a - b);
  return sortedWeeks.map(w => {
    const primary = rows.find(r => r.year === pYear && r.week === w);
    const compare = cYear ? rows.find(r => r.year === cYear && r.week === w) : null;
    return {
      label: `W${String(w).padStart(2, '0')}`,
      periodNumber: w,
      report: primary?.qty || 0,
      compare: compare?.qty || 0,
      reportShipped: primary?.shippedQty || 0,
      compareShipped: compare?.shippedQty || 0,
    };
  }).filter(d => d.report > 0 || d.compare > 0);
}

function buildTypeContribution(rows: SalesTypePoint[], primaryYear: string, compareYear: string | undefined, primaryMetric: number): TypeContributionRow[] {
  const pYear = Number(primaryYear);
  const cYear = compareYear ? Number(compareYear) : null;
  return SALES_TYPE_OPTIONS.map(opt => {
    const primaryRows = rows.filter(r => r.year === pYear && r.typeCode === opt.value);
    const compareRows = cYear ? rows.filter(r => r.year === cYear && r.typeCode === opt.value) : [];
    const current = primaryRows.reduce((s, r) => s + r.qty, 0);
    const compare = compareRows.reduce((s, r) => s + r.qty, 0);
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

// ═══════════════════════════════════════════════════════════════
// Weekly grouping utilities (kept for grouping weekly data by month)
// ═══════════════════════════════════════════════════════════════

function calendarWeekRange(year: string, week: number) {
  const numericYear = Number(year);
  const yearStart = Date.UTC(numericYear, 0, 1);
  const mondayOffset = (new Date(yearStart).getUTCDay() + 6) % 7;
  const rawStart = yearStart - (mondayOffset * 86_400_000) + ((week - 1) * 7 * 86_400_000);
  const rawEnd = rawStart + (6 * 86_400_000);
  const yearEnd = Date.UTC(numericYear, 11, 31);
  return {
    start: new Date(Math.max(rawStart, yearStart)),
    end: new Date(Math.min(rawEnd, yearEnd)),
    midpoint: new Date(Math.min(Math.max(rawStart + (3 * 86_400_000), yearStart), yearEnd)),
  };
}

function formatWeekRange(year: string, week: number) {
  const { start, end } = calendarWeekRange(year, week);
  const startDay = String(start.getUTCDate()).padStart(2, '0');
  const endDay = String(end.getUTCDate()).padStart(2, '0');
  const startMonth = MONTHS[start.getUTCMonth()];
  const endMonth = MONTHS[end.getUTCMonth()];
  return startMonth === endMonth
    ? `${startDay}-${endDay} ${endMonth}`
    : `${startDay} ${startMonth}-${endDay} ${endMonth}`;
}

function groupWeeklyComparisonData(data: TrendComparisonDatum[], reportYear: string): WeeklyComparisonGroup[] {
  const groups = new Map<number, WeeklyComparisonGroup>();

  data
    .filter(point => point.report > 0 || point.compare > 0)
    .forEach(point => {
      const range = calendarWeekRange(reportYear, point.periodNumber);
      let monthNumber = range.midpoint.getUTCMonth() + 1;
      const group = groups.get(monthNumber) || {
        monthNumber,
        monthLabel: MONTHS[monthNumber - 1],
        weeks: [],
      };
      group.weeks.push({ ...point, dateRange: formatWeekRange(reportYear, point.periodNumber) });
      groups.set(monthNumber, group);
    });

  return [...groups.values()].sort((a, b) => a.monthNumber - b.monthNumber);
}

// ═══════════════════════════════════════════════════════════════
// Due Date Outlook (still uses raw orders for overdue/due-soon calc)
// ═══════════════════════════════════════════════════════════════

function buildDueOutlookData(rows: SalesOrderRow[], year: string): DueOutlookDatum[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueSoonCutoff = new Date(today);
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 14);

  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .map(monthNumber => ({
      monthNumber,
      monthLabel: MONTHS[monthNumber - 1],
      dueQty: 0 as number,
      shippedQty: 0 as number,
      openQty: 0 as number,
      overdueOrders: 0,
      dueSoonOrders: 0,
      overdueOrderNos: new Set<string>(),
      dueSoonOrderNos: new Set<string>(),
    }));
  const byMonth = new Map(data.map(point => [String(point.monthNumber), point]));

  rows.forEach(row => {
    if (yearFromDate(row.custDate) !== year) return;
    const point = byMonth.get(monthFromDate(row.custDate));
    if (!point) return;

    const dueQty = Math.max(Number(row.orderQty || 0), 0);
    const shippedQty = Math.min(Math.max(Number(row.shippedQty || 0), 0), dueQty);
    const openQty = Math.max(dueQty - shippedQty, 0);

    point.dueQty += dueQty;
    point.shippedQty += shippedQty;
    point.openQty += openQty;

    if (openQty <= 0 || !row.orderNo || !row.custDate) return;
    const dueDate = new Date(row.custDate);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) point.overdueOrderNos.add(row.orderNo);
    else if (dueDate <= dueSoonCutoff) point.dueSoonOrderNos.add(row.orderNo);
  });

  return data.map((point: any) => {
    const overdueOrderNos = point.overdueOrderNos as Set<string>;
    const dueSoonOrderNos = point.dueSoonOrderNos as Set<string>;
    const result = { ...point, overdueOrders: overdueOrderNos.size, dueSoonOrders: dueSoonOrderNos.size };
    delete result.overdueOrderNos;
    delete result.dueSoonOrderNos;
    return result;
  });
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
  const [searchParams] = useSearchParams();
  const { selectedYears, selectedMonths, selGroups: selectedGroups, availableYears } = useOutletContext<any>();
  const loadRequestIdRef = useRef(0);
  const [selectedKpiType, setSelectedKpiType] = useState<KpiTypeSelection>('ALL');
  const metric: Metric = 'qty';
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>('monthly');
  const [activeView, setActiveView] = useState<ViewMode>('overview');
  const [drilldown, setDrilldown] = useState<Drilldown | null>(null);

  // ─── Aggregated API data (lightweight, for Overview) ───
  const [monthlyData, setMonthlyData] = useState<SalesMonthlyPoint[]>([]);
  const [typeData, setTypeData] = useState<SalesTypePoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<SalesWeeklyPoint[]>([]);

  // ─── Raw orders (heavy, only for Due Outlook + Drill-down) ───
  const [dueOrders, setDueOrders] = useState<SalesOrderRow[]>([]);
  const [drilldownOrders, setDrilldownOrders] = useState<SalesOrderRow[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const yearsLoading = availableYears.length === 0;
  const [loading, setLoading] = useState(true);
  const [hasResolvedData, setHasResolvedData] = useState(false);
  const [error, setError] = useState('');
  const [dueError, setDueError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const customers = useMemo(() => selectedCustomerCodes(selectedGroups), [selectedGroups]);
  const drilldownKey = drilldown ? `${drilldown.basis || 'order'}|${drilldown.year}|${drilldown.month || 'all'}|${drilldown.week || 'all'}|${drilldown.type || 'all'}` : 'all';
  const filterPageKey = `${selectedYears.join('|')}|${selectedGroups.join('|')}|${search}|${drilldownKey}`;

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
      setWeeklyData([]);
      setDueOrders([]);
      setHasResolvedData(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasResolvedData(false);
    setError('');
    setDueError('');

    // ใช้ years + months params → SQL จะ build OR conditions แยกเดือนต่อปี = แม่นยำ
    const apiParams = {
      years: selectedYears,
      months: selectedMonths,
      customers,
    };

    try {
      const [monthlyResult, typeResult, weeklyResult, dueResult] = await Promise.allSettled([
        fetchSalesMonthlyAnalytics(apiParams),
        fetchSalesTypeAnalytics(apiParams),
        fetchSalesWeeklyAnalytics(apiParams),
        fetchSalesOrders({ years: selectedYears, months: selectedMonths, customers, dateView: 'custdate' }),
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      if (monthlyResult.status === 'fulfilled') setMonthlyData(monthlyResult.value);
      else { setMonthlyData([]); setError(monthlyResult.reason instanceof Error ? monthlyResult.reason.message : 'Failed to load monthly analytics'); }

      if (typeResult.status === 'fulfilled') setTypeData(typeResult.value);
      else setTypeData([]);

      if (weeklyResult.status === 'fulfilled') setWeeklyData(weeklyResult.value);
      else setWeeklyData([]);

      if (dueResult.status === 'fulfilled') setDueOrders(dueResult.value);
      else { setDueOrders([]); setDueError(dueResult.reason instanceof Error ? dueResult.reason.message : 'Failed to load due date outlook'); }

      if (monthlyResult.status === 'fulfilled' || typeResult.status === 'fulfilled' || weeklyResult.status === 'fulfilled') {
        setHasResolvedData(true);
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setMonthlyData([]);
      setTypeData([]);
      setWeeklyData([]);
      setDueOrders([]);
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
  // Drill-down: Lazy-load raw orders on demand
  // ═══════════════════════════════════════════════════════════

  const loadDrilldownOrders = useCallback(async (dd: Drilldown) => {
    setDrilldownLoading(true);
    setDrilldownOrders([]);
    try {
      const params: any = {
        years: [dd.year],
        months: dd.month ? [dd.month] : selectedMonths,
        customers,
      };
      if (dd.type) params.types = [dd.type];
      if (dd.basis === 'due') params.dateView = 'custdate';

      const orders = await fetchSalesOrders(params);
      setDrilldownOrders(orders);
    } catch (err) {
      setDrilldownOrders([]);
    } finally {
      setDrilldownLoading(false);
    }
  }, [selectedMonths, customers]);

  // ═══════════════════════════════════════════════════════════
  // Computed data from aggregated API results
  // ═══════════════════════════════════════════════════════════

  const primaryYear = selectedYears[selectedYears.length - 1] || availableYears[availableYears.length - 1] || '';
  // @ts-ignore
  const compareYear = selectedYears.find(year => year !== primaryYear) || 'none';
  const hasCompareYear = compareYear !== 'none';

  const primaryTotals = useMemo(() => calcTotalsFromMonthly(monthlyData, primaryYear), [monthlyData, primaryYear]);
  const compareTotals = useMemo(() => hasCompareYear ? calcTotalsFromMonthly(monthlyData, compareYear) : emptyTotals, [monthlyData, compareYear, hasCompareYear]);
  const primaryMetric = primaryTotals.qty;
  const compareMetric = compareTotals.qty;
  const changeAmount = hasCompareYear ? primaryMetric - compareMetric : 0;
  const growthRate = hasCompareYear && compareMetric !== 0 ? growthPercent(primaryMetric, compareMetric) : null;
  const deliveryRate = primaryTotals.qty > 0 ? (primaryTotals.shippedQty / primaryTotals.qty) * 100 : 0;

  // KPI order stats from type data
  const kpiOrderStats = useMemo(() => {
    const pYear = Number(primaryYear);
    const primaryRows = typeData.filter(r => r.year === pYear);
    const selectedRows = selectedKpiType === 'ALL'
      ? primaryRows
      : primaryRows.filter(r => r.typeCode === selectedKpiType);
    return {
      orders: selectedRows.reduce((s, r) => s + r.orderCount, 0),
      types: new Set(primaryRows.map(r => r.typeCode)).size,
    };
  }, [typeData, primaryYear, selectedKpiType]);

  const monthlyComparisonData = useMemo(
    () => buildMonthlyComparison(monthlyData, primaryYear, hasCompareYear ? compareYear : undefined),
    [monthlyData, primaryYear, compareYear, hasCompareYear],
  );

  const weeklyComparisonData = useMemo(
    () => buildWeeklyComparison(weeklyData, primaryYear, hasCompareYear ? compareYear : undefined),
    [weeklyData, primaryYear, compareYear, hasCompareYear],
  );

  const weeklyComparisonGroups = useMemo(
    () => groupWeeklyComparisonData(weeklyComparisonData, primaryYear),
    [weeklyComparisonData, primaryYear],
  );

  const dueOutlookData = useMemo(
    () => buildDueOutlookData(dueOrders, primaryYear),
    [dueOrders, primaryYear],
  );

  const typeContribution = useMemo(
    () => buildTypeContribution(typeData, primaryYear, hasCompareYear ? compareYear : undefined, primaryMetric),
    [typeData, primaryYear, compareYear, hasCompareYear, primaryMetric],
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
  const selectedKpiTypeLabel = kpiTypeLabel(selectedKpiType);
  const hasOverviewData = monthlyData.length > 0 || typeData.length > 0 || weeklyData.length > 0;
  const loadingScopeSummary = primaryYear ? `${selectedYearSummary} / ${selectedGroupSummary} / Quantity` : 'Preparing available reporting periods';
  const loadFailure = !hasResolvedData ? error || dueError : '';
  const orderCountHint = selectedKpiType === 'ALL'
    ? `${fmtQty(kpiOrderStats.types)} types`
    : `${selectedKpiTypeLabel}`;

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
    setActiveView('overview');
  };

  const openChartDetail = (year: string, periodNumber: number | undefined, type?: SalesTypeCode) => {
    const dd: Drilldown = {
      year,
      month: periodNumber && trendGranularity === 'monthly' ? String(periodNumber) : undefined,
      week: periodNumber && trendGranularity === 'weekly' ? periodNumber : undefined,
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

  const openDueDetail = (monthNumber: number) => {
    const dd: Drilldown = {
      year: primaryYear,
      month: String(monthNumber),
      basis: 'due',
      metric,
    };
    setDrilldown(dd);
    setSearch('');
    setPage(1);
    setActiveView('details');
    void loadDrilldownOrders(dd);
  };

  return (
    <>
      <div className="content-scrollbar flex-1 overflow-y-auto" style={pageShell}>
        <div className={`app-content-frame app-content-frame--workspace app-page-content customer-trends-page customer-trends-page--${activeView}`}>
          <header className="customer-trends-page-header">
            <div>
              <h1>Order Volume Summary</h1>
              <p>Sales Trends by Customer Group with order-line details</p>
            </div>
            <div className="customer-trends-page-header__actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
              <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />
              <ErpIconButton label="Reload data" tone="refresh" onClick={() => void loadOverviewData()} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />} disabled={loading} size="sm" />
            </div>
          </header>

          {loading ? (
            <CustomerTrendsLoadingState
              activeView={activeView}
              granularity={trendGranularity}
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
                  <SummaryMetric label={`Ordered Qty ${primaryYear || '-'}`} value={fmtMetric(primaryMetric, metric)} hint="Primary year" />
                  <SummaryMetric label={`Ordered Qty ${hasCompareYear ? compareYear : '-'}`} value={hasCompareYear ? fmtMetric(compareMetric, metric) : '-'} hint="Compare year" muted={!hasCompareYear} />
                  <SummaryMetric label={hasCompareYear ? `Change vs ${compareYear}` : 'Change'} value={hasCompareYear ? fmtSignedMetric(changeAmount, metric) : '-'} hint={growthRate === null ? 'No comparison baseline' : fmtPercent(growthRate)} tone={!hasCompareYear || changeAmount === 0 ? undefined : changeAmount < 0 ? 'down' : 'up'} muted={!hasCompareYear} />
                  <SummaryMetric
                    label="Order Count"
                    value={fmtQty(kpiOrderStats.orders)}
                    hint={orderCountHint}
                    control={<KpiTypeSelect value={selectedKpiType} onChange={setSelectedKpiType} />}
                  />
                  <SummaryMetric label="Delivery Rate" value={`${deliveryRate.toFixed(1)}%`} hint={`${fmtQty(primaryTotals.shippedQty)} / ${fmtQty(primaryTotals.qty)} qty`} tone={deliveryRate >= 100 ? 'up' : undefined} />
                  <SummaryMetric label="Outstanding Qty" value={fmtQty(primaryTotals.gapQty)} hint={`${fmtQty(primaryTotals.orders)} orders`} />
                </section>
              )}

              {error && (
                <div role="alert" className="customer-trends-error">
                  <span>{error}</span>
                  <button type="button" onClick={() => void loadOverviewData()}><RefreshCw size={13} />Retry</button>
                </div>
              )}

              {activeView === 'overview' && (
                <section id="customer-trends-overview-panel" className={`customer-trends-overview customer-trends-overview--${trendGranularity}`}>
                  <div className="customer-trends-overview__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2>{trendGranularity === 'monthly' ? 'Monthly Comparison' : 'Weekly Comparison'}</h2>
                      <span>{selectedYearSummary} / Ordered quantity</span>
                    </div>
                    <ErpSegmentedControl
                      ariaLabel="Trend interval"
                      value={trendGranularity}
                      onChange={(value) => {
                        setTrendGranularity(value as TrendGranularity);
                        setDrilldown(null);
                      }}
                      options={[
                        { value: 'monthly', label: 'Monthly', icon: <CalendarDays size={13} /> },
                        { value: 'weekly', label: 'Weekly', icon: <CalendarDays size={13} /> },
                      ]}
                    />
                  </div>
                  {!hasOverviewData && dueOrders.length === 0 && !dueError ? (
                    <div className="customer-trends-empty">
                      <strong>No data for the current scope</strong>
                    </div>
                  ) : (
                    <>
                      {!hasOverviewData ? (
                        <div className="customer-trends-empty customer-trends-empty--section">
                          <strong>No order-date data for the current scope</strong>
                        </div>
                      ) : (
                        <div className={`customer-trends-overview__body customer-trends-overview__body--${trendGranularity}`}>
                          <div className={`customer-trends-chart-area customer-trends-chart-area--${trendGranularity}`}>
                            {trendGranularity === 'monthly' ? (
                              <TrendComparisonChart
                                data={monthlyComparisonData}
                                reportYear={primaryYear}
                                compareYear={hasCompareYear ? compareYear : undefined}
                                metric={metric}
                                granularity="monthly"
                                onDrilldown={openChartDetail}
                              />
                            ) : (
                              <WeeklyComparisonList
                                key="weekly"
                                groups={weeklyComparisonGroups}
                                reportYear={primaryYear}
                                compareYear={hasCompareYear ? compareYear : undefined}
                                metric={metric}
                                onDrilldown={openChartDetail}
                              />
                            )}
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
                      <DueDateOutlook
                        rows={dueOutlookData}
                        year={primaryYear}
                        metric={metric}
                        loading={loading}
                        error={dueError}
                        onDrilldown={openDueDetail}
                        onRetry={() => void loadOverviewData()}
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
                        <table className="sales-dense-table sales-dense-table--sticky-first" style={{ width: '100%', minWidth: 1536 }}>
                          <thead>
                            <tr>
                              {ORDER_DETAIL_COLUMNS.map(([head, width], index) => (
                                <th
                                  key={head}
                                  className={index >= 21 ? 'sales-dense-table__number' : undefined}
                                  style={{ width: Number(width) }}
                                >
                                  {head}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrderRows.length === 0 && <EmptyRow colSpan={15} label="No order item lines match the current filters." />}
                            {pageRows.map(row => {
                              return (
                                <tr key={`${row.orderNo}-${row.itemNo}-${row.ordDate}`}>
                                  <td style={tdStrongCenter}>{row.orderNo}</td>
                                  <td style={tdStrong}>{row.poNo || '-'}</td>
                                  <td style={tdStrong}>{row.po2 || '-'}</td>
                                  <td style={tdStrongCenter}>{row.customerCode}</td>
                                  <td style={tdStrong}>{row.shipTo || '-'}</td>
                                  <td style={tdStrong}>{row.ordStamp || '-'}</td>
                                  <td style={tdStrongCenter}>{row.ordMaker || '-'}</td>
                                  <td style={tdStrongCenter}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(row.itemNo)}`)} style={linkButton}>{row.itemNo}</button></td>
                                  <td style={tdStrongCenter}>{row.productTypeCode || '-'}</td>
                                  <td style={tdStrongCenter}>{row.custItem || '-'}</td>
                                  <td style={tdCenter}>{row.itemMat || '-'}</td>
                                  <td style={td}>{row.itemSize || '-'}</td>
                                  <td style={td}>{row.itemStone || '-'}</td>
                                  <td style={td}>{row.itemDesc || '-'}</td>
                                  <td style={tdStrongRight}>{row.itemPlate || '-'}</td>
                                  <td style={td}>{row.setType || '-'}</td>
                                  <td style={tdStrongRight}>{row.orderQty}</td>
                                  <td style={tdStrongRight}>{row.shippedQty}</td>
                                  <td style={tdStrongRight}>{row.openQty || 0}</td>
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
