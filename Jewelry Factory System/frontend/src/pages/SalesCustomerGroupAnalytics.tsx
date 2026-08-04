import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, DollarSign, FilterX, Hash, RefreshCw, Search, SlidersHorizontal, Table2, Users, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Topbar from '../components/layout/Topbar';
import '../components/sales/SalesDenseTable.css';
import './SalesCustomerGroupAnalytics.css';
import { CUSTOMER_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchSalesOrders, type SalesOrderRow } from '../services/customerSalesAPI';
import { ErpButton, ErpIconButton, ErpSegmentedControl } from '../components/ui/ErpButtons';
import CustomSelect from '../components/ui/CustomSelect';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAGE_SIZE = 50;
const ORDER_DETAIL_COLUMNS = [
  ['OrdNo', 100],
  ['OrdDate', 90],
  ['DueDate', 90],
  ['CustDate', 90],
  ['CustCode', 100],
  ['SalesName', 120],
  ['PONo', 150],
  ['PO 2', 150],
  ['Ship To', 120],
  ['OrdStamp', 90],
  ['OrdMaker', 90],
  ['ItemNo', 90],
  ['Item SKU', 90],
  ['Type', 80],
  ['Cust Item', 130],
  ['ItemMat', 60],
  ['ItemSize', 130],
  ['ItemStone', 160],
  ['ItemDesc', 180],
  ['ItemPlate', 190],
  ['SetType', 80],
  ['ItemWeight', 110],
  ['ItemQTY', 90],
  ['ItemPrice', 90],
  ['ItemAmt', 90],
  ['ExportQTY', 100],
  ['ExportAmt', 100],
] as const;

const SALES_TYPE_OPTIONS = [
  { value: 'BBS', label: 'Bracelet / Bangle' },
  { value: 'BES', label: 'Earring' },
  { value: 'BNS', label: 'Necklace' },
  { value: 'BRS', label: 'Ring' },
  { value: 'OTHERS', label: 'Others' },
] as const;

type Metric = 'amount' | 'qty';
type TrendGranularity = 'monthly' | 'weekly';
type SalesTypeCode = typeof SALES_TYPE_OPTIONS[number]['value'];
type KpiTypeSelection = 'ALL' | SalesTypeCode;
type ViewMode = 'overview' | 'details';
type DrilldownBasis = 'order' | 'due';
type Drilldown = { year: string; month?: string; week?: number; type?: SalesTypeCode; basis?: DrilldownBasis; metric?: Metric };
type SalesTotals = {
  amount: number;
  qty: number;
  shippedQty: number;
  gapQty: number;
  orders: number;
  late: number;
};
type MonthlyTypeDatum = {
  month: string;
  monthNumber: number;
  total: number;
} & Record<SalesTypeCode, number>;
type TrendComparisonDatum = {
  label: string;
  periodNumber: number;
  report: number;
  compare: number;
};
type WeeklyComparisonGroup = {
  monthNumber: number;
  monthLabel: string;
  weeks: Array<TrendComparisonDatum & { dateRange: string }>;
};
type TooltipPayloadEntry = {
  color?: string;
  dataKey?: string | number;
  name?: string;
  payload?: TrendComparisonDatum;
  value?: number;
};
type TypeContributionRow = {
  code: SalesTypeCode;
  label: string;
  current: number;
  compare: number;
  orderCount: number;
  share: number;
};
type DueOutlookDatum = {
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

const SALES_TYPE_COLORS: Record<SalesTypeCode, string> = {
  BBS: 'var(--color-chart-1)',
  BES: 'var(--color-chart-2)',
  BNS: 'var(--color-chart-3)',
  BRS: 'var(--color-chart-4)',
  OTHERS: 'var(--color-chart-6)',
};

const emptyTotals: SalesTotals = { amount: 0, qty: 0, shippedQty: 0 as number, gapQty: 0, orders: 0, late: 0 };

const fmtAmount = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTableAmount = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
const fmtQty = (value: number) => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtWeight = (value: number) => (value || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtMetric = (value: number, metric: Metric) => metric === 'amount' ? fmtAmount(value) : fmtQty(value);
const fmtSignedMetric = (value: number, metric: Metric) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${fmtMetric(Math.abs(value), metric)}`;
const fmtPercent = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(value).toFixed(1)}%`;
const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const fmtAxis = (value: number, metric: Metric) => `${metric === 'amount' ? '$' : ''}${compactNumber.format(value)}`;
const fmtDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};

function csv(value: string | null) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function defaultYearSelection(years: string[]) {
  const latest = years[years.length - 1];
  const previous = years[years.length - 2];
  if (previous && latest) return [previous, latest];
  return latest ? [latest] : [];
}

function selectedCustomerCodes(groupIds: string[]) {
  if (groupIds.length === 0) return [];
  return CUSTOMER_GROUPS.filter(group => groupIds.includes(group.id)).flatMap(group => group.prefixes);
}

function initialGroupsFromParams(groups: string[], customers: string[]) {
  if (groups.length > 0) return groups;
  if (customers.length === 0) return [];
  return Array.from(new Set(
    customers
      .map(code => getCustomerGroupId(code))
      .filter(groupId => CUSTOMER_GROUPS.some(group => group.id === groupId)),
  ));
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

function yearFromOrder(row: SalesOrderRow) {
  return yearFromDate(row.ordDate);
}





function kpiTypeLabel(selectedType: KpiTypeSelection) {
  if (selectedType === 'ALL') return 'All Types';
  return SALES_TYPE_OPTIONS.find(option => option.value === selectedType)?.label || selectedType;
}

function salesTypeCode(row: SalesOrderRow): SalesTypeCode {
  const explicitCode = String(row.productTypeCode || '').trim().toUpperCase();
  if (SALES_TYPE_OPTIONS.some(option => option.value === explicitCode)) return explicitCode as SalesTypeCode;
  const typePrefix = String(row.itemType || row.itemNo || '').trim().toUpperCase()[0];
  if (typePrefix === 'B' || typePrefix === 'T') return 'BBS';
  if (typePrefix === 'E') return 'BES';
  if (typePrefix === 'N') return 'BNS';
  if (typePrefix === 'R') return 'BRS';
  return 'OTHERS';
}

function monthFromOrder(row: SalesOrderRow) {
  return monthFromDate(row.ordDate);
}

function buildMonthlyTypeData(rows: SalesOrderRow[], metric: Metric): MonthlyTypeDatum[] {
  const monthKeys = new Set<string>();
  rows.forEach(row => {
    if (!row.ordDate) return;
    const date = new Date(row.ordDate);
    if (Number.isNaN(date.getTime())) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    monthKeys.add(`${yyyy}-${mm}`);
  });

  const sortedKeys = Array.from(monthKeys).sort();
  const data = sortedKeys.map(key => {
    const [yyyy, mm] = key.split('-');
    return {
      monthKey: key,
      month: `${MONTHS[Number(mm) - 1]} '${yyyy.slice(2)}`,
      monthNumber: Number(mm),
      total: 0, BBS: 0, BES: 0, BNS: 0, BRS: 0, OTHERS: 0,
    };
  });

  const byMonth = new Map(data.map(point => [point.monthKey, point]));

  rows.forEach(row => {
    if (!row.ordDate) return;
    const date = new Date(row.ordDate);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const point = byMonth.get(key);
    if (!point) return;
    const value = rowMetricValue(row, metric);
    point[salesTypeCode(row)] += value;
    point.total += value;
  });

  return data;
}

function calendarWeekNumber(date: Date) {
  const year = date.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const dateValue = Date.UTC(year, date.getUTCMonth(), date.getUTCDate());
  const dayOfYear = Math.floor((dateValue - yearStart) / 86_400_000) + 1;
  const mondayOffset = (new Date(yearStart).getUTCDay() + 6) % 7;
  return Math.floor((dayOfYear + mondayOffset - 1) / 7) + 1;
}

function weekFromOrder(row: SalesOrderRow) {
  if (!row.ordDate) return 0;
  const date = new Date(row.ordDate);
  if (Number.isNaN(date.getTime())) return 0;
  return calendarWeekNumber(date);
}



function buildWeeklyComparisonData(rows: SalesOrderRow[], metric: Metric): TrendComparisonDatum[] {
  const weekKeys = new Set<string>();
  rows.forEach(row => {
    if (!row.ordDate) return;
    const date = new Date(row.ordDate);
    if (Number.isNaN(date.getTime())) return;
    const yyyy = date.getUTCFullYear();
    const week = calendarWeekNumber(date);
    weekKeys.add(`${yyyy}-${String(week).padStart(2, '0')}`);
  });

  const sortedKeys = Array.from(weekKeys).sort();
  const data = sortedKeys.map(key => {
    const [yyyy, ww] = key.split('-');
    return {
      label: `${yyyy.slice(2)}-W${ww}`,
      periodKey: key,
      periodNumber: Number(ww),
      report: 0,
      compare: 0
    };
  });

  const byWeek = new Map(data.map(point => [point.periodKey, point]));

  rows.forEach(row => {
    if (!row.ordDate) return;
    const date = new Date(row.ordDate);
    if (Number.isNaN(date.getTime())) return;
    const yyyy = date.getUTCFullYear();
    const week = calendarWeekNumber(date);
    const key = `${yyyy}-${String(week).padStart(2, '0')}`;
    const point = byWeek.get(key);
    if (!point) return;
    point.report += rowMetricValue(row, metric);
  });

  return data;
}

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
      dueAmount: 0 as number,
      shippedAmount: 0 as number,
      openAmount: 0 as number,
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
    const dueAmount = Math.max(Number(row.amount || 0), 0);
    const shippedAmount = Math.min(Math.max(Number(row.shippedAmount || 0), 0), dueAmount);
    const openQty = Math.max(dueQty - shippedQty, 0);
    const openAmount = Math.max(dueAmount - shippedAmount, 0);

    point.dueQty += dueQty;
    point.shippedQty += shippedQty;
    point.openQty += openQty;
    point.dueAmount += dueAmount;
    point.shippedAmount += shippedAmount;
    point.openAmount += openAmount;

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

function calcTotals(rows: SalesOrderRow[], year?: string): SalesTotals {
  if (!year) return emptyTotals;
  const orderNos = new Set<string>();
  const lateOrderNos = new Set<string>();
  let amount = 0;
  let qty = 0;
  let shippedQty = 0;
  let gapQty = 0;

  rows.forEach(row => {
    if (yearFromOrder(row) !== year) return;
    if (row.orderNo) orderNos.add(row.orderNo);
    if (row.status === 'Late' && row.orderNo) lateOrderNos.add(row.orderNo);
    amount += Number(row.amount || 0);
    qty += Number(row.orderQty || 0);
    shippedQty += Number(row.shippedQty || 0);
    gapQty += Math.max(Number(row.orderQty || 0) - Number(row.shippedQty || 0), 0);
  });

  return {
    amount,
    qty,
    shippedQty,
    gapQty,
    orders: orderNos.size,
    late: lateOrderNos.size,
  };
}

function growthPercent(primary: number, compare: number) {
  if (compare === 0) return 0;
  return ((primary - compare) / compare) * 100;
}

function rowMetricValue(row: SalesOrderRow, metric: Metric) {
  return metric === 'amount' ? Number(row.amount || 0) : Number(row.orderQty || 0);
}

export default function SalesCustomerGroupAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterToolbarRef = useRef<HTMLElement>(null);
  const loadRequestIdRef = useRef(0);
  const yearsLoadFailedRef = useRef(false);
  const requestedYears = useMemo(() => csv(searchParams.get('years')), [searchParams]);
  const requestedCustomers = useMemo(() => csv(searchParams.get('customers')), [searchParams]);
  const requestedGroups = useMemo(() => csv(searchParams.get('groups')).filter(groupId => CUSTOMER_GROUPS.some(group => group.id === groupId)), [searchParams]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => initialGroupsFromParams(requestedGroups, requestedCustomers));
  const [selectedKpiType, setSelectedKpiType] = useState<KpiTypeSelection>('ALL');
  const [metric, setMetric] = useState<Metric>(searchParams.get('metric') === 'qty' ? 'qty' : 'amount');
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>('monthly');
  const [activeView, setActiveView] = useState<ViewMode>('overview');
  const [drilldown, setDrilldown] = useState<Drilldown | null>(null);
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [dueOrders, setDueOrders] = useState<SalesOrderRow[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasResolvedData, setHasResolvedData] = useState(false);
  const [error, setError] = useState('');
  const [dueError, setDueError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const customers = useMemo(() => selectedCustomerCodes(selectedGroups), [selectedGroups]);
  const drilldownKey = drilldown ? `${drilldown.basis || 'order'}|${drilldown.year}|${drilldown.month || 'all'}|${drilldown.week || 'all'}|${drilldown.type || 'all'}|${drilldown.metric || metric}` : 'all';
  const filterPageKey = `${selectedYears.join('|')}|${selectedGroups.join('|')}|${metric}|${search}|${drilldownKey}`;

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(resetTimer);
  }, [filterPageKey]);

  useEffect(() => {
    const closeDropdowns = (event: PointerEvent) => {
      if (filterToolbarRef.current?.contains(event.target as Node)) return;
    };
    document.addEventListener('pointerdown', closeDropdowns);
    return () => document.removeEventListener('pointerdown', closeDropdowns);
  }, []);

  useEffect(() => {
    fetchAvailableYears()
      .then(years => {
        yearsLoadFailedRef.current = false;
        const sorted = years.map(String).sort((a, b) => Number(a) - Number(b));
        setAvailableYears(sorted);
        const requested = requestedYears.filter(year => sorted.includes(year));
        setSelectedYears(requested.length ? requested : defaultYearSelection(sorted));
        setYearsLoading(false);
      })
      .catch(err => {
        yearsLoadFailedRef.current = true;
        setError(err instanceof Error ? err.message : 'Failed to load years');
        setYearsLoading(false);
        setLoading(false);
      });
  }, [requestedYears]);

  const loadOrders = useCallback(async () => {
    if (yearsLoading) return;
    const requestId = ++loadRequestIdRef.current;
    if (selectedYears.length === 0) {
      setOrders([]);
      setDueOrders([]);
      setHasResolvedData(!yearsLoadFailedRef.current);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasResolvedData(false);
    setError('');
    setDueError('');
    try {
      const [ordersResult, dueOrdersResult] = await Promise.allSettled([
        fetchSalesOrders({ startDate, endDate, customers }),
        fetchSalesOrders({ startDate, endDate, customers, dateView: 'custdate' }),
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value);
      else {
        setOrders([]);
        setError(ordersResult.reason instanceof Error ? ordersResult.reason.message : 'Failed to load customer trends');
      }

      if (dueOrdersResult.status === 'fulfilled') setDueOrders(dueOrdersResult.value);
      else {
        setDueOrders([]);
        setDueError(dueOrdersResult.reason instanceof Error ? dueOrdersResult.reason.message : 'Failed to load due date outlook');
      }

      if (ordersResult.status === 'fulfilled' || dueOrdersResult.status === 'fulfilled') {
        setHasResolvedData(true);

      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setOrders([]);
      setDueOrders([]);
      setError(err instanceof Error ? err.message : 'Failed to load customer trends');
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }, [customers, startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOrders(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => () => {
    loadRequestIdRef.current += 1;
  }, []);

  const primaryYear = selectedYears[selectedYears.length - 1] || availableYears[availableYears.length - 1] || '';
  const compareYear = selectedYears.find(year => year !== primaryYear) || 'none';
  const hasCompareYear = compareYear !== 'none';
  const primaryTotals = useMemo(() => calcTotals(orders, primaryYear), [orders, primaryYear]);
  const compareTotals = useMemo(() => hasCompareYear ? calcTotals(orders, compareYear) : emptyTotals, [orders, hasCompareYear]);
  const primaryMetric = metric === 'amount' ? primaryTotals.amount : primaryTotals.qty;
  const compareMetric = metric === 'amount' ? compareTotals.amount : compareTotals.qty;
  const changeAmount = hasCompareYear ? primaryMetric - compareMetric : 0;
  const growthRate = hasCompareYear && compareMetric !== 0 ? growthPercent(primaryMetric, compareMetric) : null;
  const deliveryRate = primaryTotals.qty > 0 ? (primaryTotals.shippedQty / primaryTotals.qty) * 100 : 0;
  const kpiOrderStats = useMemo(() => {
    const primaryRows = orders.filter(row => yearFromOrder(row) === primaryYear);
    const selectedRows = selectedKpiType === 'ALL'
      ? primaryRows
      : primaryRows.filter(row => salesTypeCode(row) === selectedKpiType);
    return {
      orders: new Set(selectedRows.map(row => row.orderNo).filter(Boolean)).size,
      itemLines: selectedRows.length,
      types: new Set(primaryRows.map(salesTypeCode)).size,
    };
  }, [orders, primaryYear, selectedKpiType]);
  const primaryChartData = useMemo(
    () => buildMonthlyTypeData(orders, metric),
    [orders, metric],
  );
  const compareChartData = useMemo(
    () => buildMonthlyTypeData(orders, metric),
    [orders, metric],
  );
  const monthlyComparisonData = useMemo<TrendComparisonDatum[]>(() => primaryChartData.map((point, index) => ({
    label: point.month,
    periodNumber: point.monthNumber,
    report: point.total,
    compare: compareChartData[index]?.total || 0,
  })), [primaryChartData, compareChartData]);
  const weeklyComparisonData = useMemo(
    () => buildWeeklyComparisonData(orders, metric),
    [orders, metric],
  );
  const weeklyComparisonGroups = useMemo(
    () => groupWeeklyComparisonData(weeklyComparisonData, primaryYear),
    [weeklyComparisonData, primaryYear],
  );
  const dueOutlookData = useMemo(
    () => buildDueOutlookData(dueOrders, primaryYear),
    [dueOrders, primaryYear],
  );
  const typeContribution = useMemo<TypeContributionRow[]>(() => SALES_TYPE_OPTIONS.map(option => {
    const current = primaryChartData.reduce((sum, point) => sum + point[option.value], 0);
    const compare = compareChartData.reduce((sum, point) => sum + point[option.value], 0);
    const orderCount = new Set(
      orders
        .filter(row => yearFromOrder(row) === primaryYear && salesTypeCode(row) === option.value)
        .map(row => row.orderNo)
        .filter(Boolean),
    ).size;
    return {
      code: option.value,
      label: option.label,
      current,
      compare,
      orderCount,
      share: primaryMetric > 0 ? (current / primaryMetric) * 100 : 0,
    };
  }), [orders, primaryYear, primaryMetric, primaryChartData, compareChartData]);

  const filteredOrderRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const detailSource = drilldown?.basis === 'due' ? dueOrders : orders;
    const drilldownRows = drilldown
      ? detailSource.filter(row => (
        (drilldown.basis === 'due' ? yearFromDate(row.custDate) : yearFromOrder(row)) === drilldown.year
        && (!drilldown.month || (drilldown.basis === 'due' ? monthFromDate(row.custDate) : monthFromOrder(row)) === drilldown.month)
        && (!drilldown.week || weekFromOrder(row) === drilldown.week)
        && (!drilldown.type || salesTypeCode(row) === drilldown.type)
      ))
      : detailSource;
    const rows = q
      ? drilldownRows.filter(row => [
        row.orderNo,
        row.poNo,
        row.itemNo,
        row.customerCode,
        row.customerName,
        row.brand,
        row.itemType,
        row.itemTypeName,
        row.productTypeCode,
        row.market,
        row.status,
      ].some(value => String(value || '').toLowerCase().includes(q)))
      : drilldownRows;

    return [...rows].sort((a, b) => {
      const detailMetric = drilldown?.metric || metric;
      const metricSort = rowMetricValue(b, detailMetric) - rowMetricValue(a, detailMetric);
      const leftDate = drilldown?.basis === 'due' ? a.custDate : a.ordDate;
      const rightDate = drilldown?.basis === 'due' ? b.custDate : b.ordDate;
      const dateSort = (rightDate ? new Date(rightDate).getTime() : 0) - (leftDate ? new Date(leftDate).getTime() : 0);
      return metricSort || dateSort || String(a.orderNo || '').localeCompare(String(b.orderNo || ''));
    });
  }, [orders, dueOrders, drilldown, search, metric]);

  const totalPages = Math.max(1, Math.ceil(filteredOrderRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredOrderRows.length);
  const pageRows = filteredOrderRows.slice(pageStart, pageEnd);
  const selectedYearSummary = hasCompareYear ? `${primaryYear} vs ${compareYear}` : primaryYear || '-';
  const selectedGroupSummary = selectedGroups.length === 0 ? 'All groups' : `${selectedGroups.length} groups`;
  const selectedKpiTypeLabel = kpiTypeLabel(selectedKpiType);
  const collapsedFilterSummary = `${metric === 'amount' ? 'Amount' : 'Quantity'} / ${selectedYearSummary} / ${'Selected Dates'} / ${selectedGroupSummary}`;
  const activeScopeSummary = `${selectedYearSummary} / ${'Selected Dates'} / ${selectedGroupSummary} / ${metric === 'amount' ? 'Amount' : 'Quantity'}`;
  const loadingScopeSummary = primaryYear ? activeScopeSummary : 'Preparing available reporting periods';
  const loadFailure = !hasResolvedData ? error || dueError : '';
  const orderCountHint = selectedKpiType === 'ALL'
    ? `${fmtQty(kpiOrderStats.types)} types / ${fmtQty(kpiOrderStats.itemLines)} item lines`
    : `${selectedKpiTypeLabel} / ${fmtQty(kpiOrderStats.itemLines)} item lines`;

  const clearSearch = () => {
    setSearch('');
  };

  const retryLoad = () => {
    if (availableYears.length === 0) {
      window.location.reload();
      return;
    }
    void loadOrders();
  };

  const toggleFilters = () => {
    if (filtersExpanded) {
    }
    setFiltersExpanded(expanded => !expanded);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') clearSearch();
  };

  const toggleGroup = (groupId: string) => {
    setDrilldown(null);
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(item => item !== groupId) : [...prev, groupId]);
  };

  const resetFilters = () => {
    setStartDate(`${new Date().getFullYear()}-01-01`);
    setEndDate('');
    setSelectedGroups([]);
    setDrilldown(null);
    setMetric('amount');
  };

  const selectAllGroups = () => {
    setSelectedGroups([]);
    setDrilldown(null);
  };

  const openChartDetail = (year: string, periodNumber: number | undefined, type?: SalesTypeCode) => {
    setDrilldown({
      year,
      month: periodNumber && trendGranularity === 'monthly' ? String(periodNumber) : undefined,
      week: periodNumber && trendGranularity === 'weekly' ? periodNumber : undefined,
      type,
      basis: 'order',
      metric,
    });
    setSearch('');
    setPage(1);
    setActiveView('details');
  };

  const openDueDetail = (monthNumber: number) => {
    setDrilldown({
      year: primaryYear,
      month: String(monthNumber),
      basis: 'due',
      metric,
    });
    setSearch('');
    setPage(1);
    setActiveView('details');
  };




  return (
    <>
      <Topbar
        breadcrumb={[
          { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
          { label: 'Sales Analytics' },
          { label: 'Sales Summary', path: '/dashboard/customer' },
          { label: 'Customer Trends' },
        ]}
        hideSearch
        contentLayout="workspace"
      />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={pageShell}>
        <div className={`app-content-frame app-content-frame--workspace app-page-content customer-trends-page customer-trends-page--${activeView}`}>
          <header className="customer-trends-page-header">
            <div>
              <h1>Customer Trends</h1>
              <p>Sales Trends by Customer Group with order-line details</p>
            </div>
            <div className="customer-trends-page-header__actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <ErpSegmentedControl
                ariaLabel="Metric mode"
                value={metric}
                onChange={(v) => setMetric(v as Metric)}
                options={[
                  { value: 'amount', label: 'Sales', icon: <DollarSign size={13} /> },
                  { value: 'qty', label: 'Qty', icon: <Hash size={13} /> },
                ]}
              />
              <ErpSegmentedControl
                ariaLabel="Customer Trends view"
                value={activeView}
                onChange={(v) => setActiveView(v as ViewMode)}
                options={[
                  { value: 'overview', label: 'Overview', icon: <BarChart3 size={13} /> },
                  { value: 'details', label: 'Order Details', icon: <Table2 size={13} /> },
                ]}
              />
              <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />
              <ErpIconButton label="Reload data" tone="refresh" onClick={() => void loadOrders()} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />} disabled={loading} size="sm" />
            </div>
          </header>



          <section ref={filterToolbarRef} style={{ ...filterToolbar }} aria-label="View filters">
            {filtersExpanded ? (
              <>
                <div style={filterPrimaryRow}>
                  <span style={filterSectionLabel}><SlidersHorizontal size={13} />Filters</span>
                  <div style={filterControlDivider} />

                  <div style={filterBlock}>
                    <span style={filterLabel}><CalendarDays size={13} />Date Range</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Start Date</span>
                        <input type="date" style={selectStyle} value={startDate} onChange={e => { setStartDate(e.target.value); setDrilldown(null); }} />
                      </div>
                      <span style={{ color: 'var(--color-text-tertiary)', marginTop: 14 }}>-</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>End Date</span>
                        <input type="date" style={selectStyle} value={endDate} onChange={e => { setEndDate(e.target.value); setDrilldown(null); }} />
                      </div>
                    </div>
                  </div>
                  <ErpButton variant="ghost" size="sm" icon={<FilterX size={13} />} onClick={resetFilters} className="customer-trends-filter-reset">Clear filters</ErpButton>
                  <ErpIconButton label="Collapse filters" onClick={toggleFilters} icon={<ChevronUp size={14} />} aria-expanded size="sm" />
                </div>
                <div style={groupFilterBlock}>
                  <span style={filterLabel}><Users size={13} />Customer group</span>
                  <div style={chipRail}>
                    <FilterChip active={selectedGroups.length === 0} onClick={selectAllGroups} label="All groups" />
                    {CUSTOMER_GROUPS.map(group => (
                      <FilterChip key={group.id} active={selectedGroups.includes(group.id)} onClick={() => toggleGroup(group.id)} label={group.label} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={filterCollapsedRow}>
                <span style={filterLabel}><SlidersHorizontal size={13} />Filters</span>
                <span style={filterCollapsedSummary}>{collapsedFilterSummary}</span>
                <ErpIconButton label="Expand filters" onClick={toggleFilters} icon={<ChevronDown size={14} />} aria-expanded={false} size="sm" />
              </div>
            )}
          </section>

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
                  <SummaryMetric label={`${metric === 'amount' ? 'Sales' : 'Ordered Qty'} ${primaryYear || '-'}`} value={fmtMetric(primaryMetric, metric)} hint="Primary year" />
                  <SummaryMetric label={`${metric === 'amount' ? 'Sales' : 'Ordered Qty'} ${hasCompareYear ? compareYear : '-'}`} value={hasCompareYear ? fmtMetric(compareMetric, metric) : '-'} hint="Compare year" muted={!hasCompareYear} />
                  <SummaryMetric label={hasCompareYear ? `Change vs ${compareYear}` : 'Change'} value={hasCompareYear ? fmtSignedMetric(changeAmount, metric) : '-'} hint={growthRate === null ? 'No comparison baseline' : fmtPercent(growthRate)} tone={!hasCompareYear || changeAmount === 0 ? undefined : changeAmount < 0 ? 'down' : 'up'} muted={!hasCompareYear} />
                  <SummaryMetric
                    label="Order Count"
                    value={fmtQty(kpiOrderStats.orders)}
                    hint={orderCountHint}
                    control={<KpiTypeSelect value={selectedKpiType} onChange={setSelectedKpiType} />}
                  />
                  <SummaryMetric label="Delivery Rate" value={`${deliveryRate.toFixed(1)}%`} hint={`${fmtQty(primaryTotals.shippedQty)} / ${fmtQty(primaryTotals.qty)} qty`} tone={deliveryRate >= 100 ? 'up' : undefined} />
                  <SummaryMetric label="Outstanding Qty" value={fmtQty(primaryTotals.gapQty)} hint={`${fmtQty(primaryTotals.late)} late orders`} tone={primaryTotals.late > 0 ? 'down' : undefined} />
                </section>
              )}

              {error && (
                <div role="alert" className="customer-trends-error">
                  <span>{error}</span>
                  <button type="button" onClick={() => void loadOrders()}><RefreshCw size={13} />Retry</button>
                </div>
              )}

              {activeView === 'overview' && (
                <section id="customer-trends-overview-panel" className={`customer-trends-overview customer-trends-overview--${trendGranularity}`}>
                  <div className="customer-trends-overview__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2>{trendGranularity === 'monthly' ? 'Monthly Comparison' : 'Weekly Comparison'}</h2>
                      <span>{'Selected Dates'} / {metric === 'amount' ? 'Sales amount' : 'Ordered quantity'}</span>
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
                  {orders.length === 0 && dueOrders.length === 0 && !dueError ? (
                    <div className="customer-trends-empty">
                      <strong>No data for the current scope</strong>
                      <button type="button" onClick={resetFilters}><FilterX size={14} />Clear filters</button>
                    </div>
                  ) : (
                    <>
                      {orders.length === 0 ? (
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

                                metric={metric}
                                granularity="monthly"
                                onDrilldown={openChartDetail}
                              />
                            ) : (
                              <WeeklyComparisonList
                                key="weekly"
                                groups={weeklyComparisonGroups}
                                reportYear={primaryYear}

                                metric={metric}
                                onDrilldown={openChartDetail}
                              />
                            )}
                          </div>
                          <TypeContribution
                            rows={typeContribution}
                            metric={metric}
                            year={primaryYear}

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
                        onRetry={() => void loadOrders()}
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
                      {drilldown.basis === 'due' && <strong>{drilldown.metric === 'amount' ? 'Amount' : 'Quantity'}</strong>}
                      <button type="button" onClick={() => setDrilldown(null)}><X size={13} />Clear</button>
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
                        <span style={panelMeta}>Showing {filteredOrderRows.length === 0 ? 0 : pageStart + 1}-{pageEnd} of {fmtQty(filteredOrderRows.length)} rows</span>
                      </div>
                    </div>
                    <div className="content-scrollbar sales-dense-scroll" style={tableScroll}>
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
                                <td style={tdStrongCenter}>{fmtDate(row.ordDate)}</td>
                                <td style={tdStrongCenter}>{fmtDate(row.dueDate)}</td>
                                <td style={tdStrongCenter}>{fmtDate(row.custDate)}</td>
                                <td style={tdStrongCenter}>{row.customerCode}</td>
                                <td style={tdStrong}>{row.salesName}</td>
                                <td style={tdStrong}>{row.poNo || '-'}</td>
                                <td style={tdStrong}>{row.po2 || '-'}</td>
                                <td style={tdStrong}>{row.shipT || '-'}</td>
                                <td style={tdStrong}>{row.ordStamp || '-'}</td>
                                <td style={tdStrongCenter}>{row.ordMaker || '-'}</td>
                                <td style={tdStrongCenter}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(row.itemNo)}`)} style={linkButton}>{row.itemNo}</button></td>
                                <td style={tdStrongCenter}>{row.itemSku || '-'}</td>
                                <td style={tdStrongCenter}>{row.productTypeCode || '-'}</td>
                                <td style={tdStrongCenter}>{row.custItem || '-'}</td>
                                <td style={tdCenter}>{row.itemMat || '-'}</td>
                                <td style={td}>{row.itemSize || '-'}</td>
                                <td style={td}>{row.itemStone || '-'}</td>
                                <td style={td}>{row.itemDesc || '-'}</td>
                                <td style={tdStrongRight}>{row.itemPlate || '-'}</td>
                                <td style={td}>{row.setType || '-'}</td>
                                <td style={tdStrongRight}>{fmtWeight(row.itemWeight || 0)}</td>
                                <td style={tdStrongRight}>{fmtQty(row.orderQty)}</td>
                                <td style={tdStrongRight}>{fmtTableAmount(row.itemPrice || 0)}</td>
                                <td style={tdStrongRight}>{fmtTableAmount(row.amount)}</td>
                                <td style={tdStrongRight}>{fmtQty(row.shippedQty)}</td>
                                <td style={tdStrongRight}>{fmtTableAmount(row.shippedAmount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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

function CustomerTrendsLoadingState({
  activeView,
  granularity,
  scopeSummary,
}: {
  activeView: ViewMode;
  granularity: TrendGranularity;
  scopeSummary: string;
}) {
  const chartBars = [42, 68, 54, 82, 46, 72, 58, 88, 62, 76, 50, 66];

  return (
    <div className={`customer-trends-page-loading customer-trends-page-loading--${activeView}`} role="status" aria-live="polite">
      <div className="customer-trends-loading-status">
        <RefreshCw size={15} className="animate-spin" aria-hidden="true" />
        <span>
          <strong>{activeView === 'overview' ? 'Loading customer trends' : 'Loading order details'}</strong>
          <small>{scopeSummary}</small>
        </span>
      </div>

      {activeView === 'overview' && (
        <section className="customer-trends-summary customer-trends-summary--loading" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="customer-trends-summary__item customer-trends-loading-metric">
              <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: `${38 + (index % 3) * 8}%` }} />
              <span className="customer-trends-skeleton customer-trends-skeleton--value" style={{ width: `${58 + (index % 2) * 12}%` }} />
              <span className="customer-trends-skeleton customer-trends-skeleton--hint" style={{ width: `${46 + (index % 3) * 9}%` }} />
            </div>
          ))}
        </section>
      )}

      <div className="customer-trends-viewbar customer-trends-loading-viewbar" aria-hidden="true">
        <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 86 }} />
        <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 220 }} />
      </div>

      {activeView === 'overview' ? (
        <section className={`customer-trends-overview customer-trends-overview--${granularity}`} aria-hidden="true">
          <div className="customer-trends-overview__header">
            <div>
              <h2>{granularity === 'monthly' ? 'Monthly Comparison' : 'Weekly Comparison'}</h2>
              <span>Preparing selected period data</span>
            </div>
          </div>
          <div className={`customer-trends-overview-loading customer-trends-overview-loading--${granularity}`}>
            <div className="customer-trends-loading-panel customer-trends-loading-panel--chart">
              <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 120 }} />
              {granularity === 'monthly' ? (
                <div className="customer-trends-loading-chart" aria-hidden="true">
                  {chartBars.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
                </div>
              ) : (
                <div className="customer-trends-loading-list">
                  {Array.from({ length: 6 }, (_, index) => (
                    <span key={index}><i /><i /><i /></span>
                  ))}
                </div>
              )}
            </div>
            <div className="customer-trends-loading-panel customer-trends-loading-panel--contribution">
              <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 110 }} />
              <div className="customer-trends-loading-list">
                {Array.from({ length: 5 }, (_, index) => (
                  <span key={index}><i /><i /><i /></span>
                ))}
              </div>
            </div>
            <div className="customer-trends-loading-panel customer-trends-loading-panel--due">
              <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 124 }} />
              <div className="customer-trends-loading-due-grid">
                {Array.from({ length: 8 }, (_, index) => <span key={index}><i /><i /></span>)}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="sales-dense-panel customer-trends-loading-details" aria-hidden="true">
          <div className="sales-dense-panel__header">
            <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 96 }} />
            <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 180 }} />
          </div>
          <div className="content-scrollbar sales-dense-scroll">
            <table className="sales-dense-table" style={{ width: '100%', minWidth: 1536 }}>
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
              <tbody><TableSkeletonRows columns={ORDER_DETAIL_COLUMNS.length} rows={13} /></tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function InteractiveTrendBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  year,
  series,
  metric,
  fillColor,
  onActivate,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: TrendComparisonDatum;
  year: string;
  series: 'report' | 'compare';
  metric: Metric;
  fillColor: string;
  onActivate: (year: string, periodNumber: number | undefined, type?: SalesTypeCode) => void;
}) {
  const value = Number(payload?.[series] || 0);
  if (value <= 0 || width <= 0 || height <= 0 || !payload) return <g />;
  const label = `${payload.label} ${year}, ${fmtMetric(value, metric)}`;
  const activate = () => onActivate(year, payload.periodNumber);

  return (
    <rect
      className="customer-trends-chart-segment"
      x={x}
      y={y}
      width={width}
      height={height}
      rx={2}
      fill={fillColor}
      role="button"
      tabIndex={0}
      aria-label={`${label}. Open order details.`}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
    >
      <title>{label}</title>
    </rect>
  );
}

function TrendComparisonTooltip({ active, payload, label, metric, reportYear }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string | number; metric: Metric; reportYear: string; }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const reportValue = Number(point?.report || 0);
  const compareValue = Number(point?.compare || 0);
  const delta = reportValue - compareValue;


  return (
    <div className="customer-trends-tooltip">
      <div className="customer-trends-tooltip__header">
        <strong>{label}</strong>
        {false && <span className={delta < 0 ? 'is-down' : delta > 0 ? 'is-up' : undefined}>{fmtSignedMetric(delta, metric)}</span>}
      </div>
      <div className="customer-trends-tooltip__row">
        <span><i style={{ background: 'var(--color-brand-500)' }} />{reportYear}</span>
        <strong>{fmtMetric(reportValue, metric)}</strong>
        <small>Report</small>
      </div>
    </div>
  );
}

function WeeklyComparisonList({ groups, reportYear, metric, onDrilldown }: { groups: WeeklyComparisonGroup[]; reportYear: string; metric: Metric; onDrilldown: (year: string, week: number | undefined, type?: SalesTypeCode) => void }) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(() => groups[0]?.monthNumber ?? null);

  if (groups.length === 0) return <div className="customer-trends-chart-empty">No weekly data</div>;

  return (
    <section className="customer-trends-weekly" data-compare={false} aria-label={`Weekly comparison for ${reportYear}`}>
      <div className="customer-trends-weekly__columns" aria-hidden="true">
        <span>Month / week</span>
        <span>{reportYear || 'Report year'}</span>
        <span />
      </div>
      <div className="customer-trends-weekly__months">
        {groups.map(group => {
          const isExpanded = expandedMonth === group.monthNumber;
          const reportTotal = group.weeks.reduce((sum, week) => sum + week.report, 0);

          const panelId = `weekly-month-panel-${group.monthNumber}`;
          const triggerId = `weekly-month-trigger-${group.monthNumber}`;

          return (
            <section key={group.monthNumber} className="customer-trends-weekly__month">
              <button
                id={triggerId}
                type="button"
                className="customer-trends-weekly__month-toggle"
                data-tone={'flat'}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => setExpandedMonth(current => current === group.monthNumber ? null : group.monthNumber)}
              >
                <span className="customer-trends-weekly__period">
                  <strong>{group.monthLabel}</strong>
                  <small>{group.weeks.length} {group.weeks.length === 1 ? 'week' : 'weeks'}</small>
                </span>
                <span className="customer-trends-weekly__metric">
                  <small>{reportYear}</small>
                  <strong>{fmtMetric(reportTotal, metric)}</strong>
                </span>
                <ChevronDown className="customer-trends-weekly__chevron" size={15} aria-hidden="true" />
              </button>

              {isExpanded && (
                <div id={panelId} className="customer-trends-weekly__week-list" role="region" aria-labelledby={triggerId}>
                  {group.weeks.map(week => {

                    return (
                      <div key={week.periodNumber} className="customer-trends-weekly__week-row" data-tone={'flat'}>
                        <span className="customer-trends-weekly__period">
                          <strong>{week.label}</strong>
                          <small>{week.dateRange}</small>
                        </span>
                        <button type="button" className="customer-trends-weekly__metric" disabled={week.report <= 0} onClick={() => onDrilldown(reportYear, week.periodNumber)} title={`Open ${reportYear} order details`}>
                          <small>{reportYear}</small>
                          <strong>{fmtMetric(week.report, metric)}</strong>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function DueDateOutlook({ rows, year, metric, loading, error, onDrilldown, onRetry }: { rows: DueOutlookDatum[]; year: string; metric: Metric; loading: boolean; error: string; onDrilldown: (monthNumber: number) => void; onRetry: () => void }) {
  const rawTotals = rows.reduce((sum, row) => ({
    due: sum.due + (metric === 'amount' ? row.dueAmount : row.dueQty),
    shipped: sum.shipped + (metric === 'amount' ? row.shippedAmount : row.shippedQty),
    risk: sum.risk + row.overdueOrders + row.dueSoonOrders,
  }), { due: 0, shipped: 0, risk: 0 });
  const totals = {
    ...rawTotals,
    open: metric === 'amount'
      ? Math.max(Math.round(rawTotals.due) - Math.round(rawTotals.shipped), 0)
      : Math.max(rawTotals.due - rawTotals.shipped, 0),
  };
  const hasData = totals.due > 0 || totals.shipped > 0 || totals.open > 0;

  return (
    <section className="customer-trends-due" aria-labelledby="customer-trends-due-title">
      <div className="customer-trends-due__header">
        <div>
          <h3 id="customer-trends-due-title">Due Date Outlook</h3>
          <span>Customer due / {year || '-'} / {metric === 'amount' ? 'Amount' : 'Quantity'}</span>
        </div>
      </div>

      {loading ? (
        <div className="customer-trends-due__loading" aria-label="Loading due date outlook"><span /><span /></div>
      ) : error ? (
        <div role="alert" className="customer-trends-error customer-trends-due__error">
          <span>{error}</span>
          <button type="button" onClick={onRetry}><RefreshCw size={13} />Retry</button>
        </div>
      ) : !hasData ? (
        <div className="customer-trends-due__empty">No customer due data for the current scope</div>
      ) : (
        <>
          <div className="customer-trends-due__summary" aria-label="Due date totals">
            <span><small>Due</small><strong>{fmtMetric(totals.due, metric)}</strong></span>
            <span><small>Shipped</small><strong>{fmtMetric(totals.shipped, metric)}</strong></span>
            <span><small>Open</small><strong>{fmtMetric(totals.open, metric)}</strong></span>
            <span data-tone={totals.risk > 0 ? 'down' : 'flat'}><small>At risk</small><strong>{fmtQty(totals.risk)} orders</strong></span>
          </div>
          <div className="customer-trends-due__rows">
            {rows.map(row => {
              const due = metric === 'amount' ? row.dueAmount : row.dueQty;
              const shipped = metric === 'amount' ? row.shippedAmount : row.shippedQty;
              const open = metric === 'amount' ? row.openAmount : row.openQty;
              const progress = due > 0 ? Math.min((shipped / due) * 100, 100) : 0;
              const riskLabel = row.overdueOrders > 0
                ? `${fmtQty(row.overdueOrders)} overdue`
                : row.dueSoonOrders > 0
                  ? `${fmtQty(row.dueSoonOrders)} due soon`
                  : open > 0
                    ? 'Scheduled'
                    : due > 0
                      ? 'Complete'
                      : 'No due';
              const riskTone = row.overdueOrders > 0 ? 'down' : row.dueSoonOrders > 0 ? 'warning' : open > 0 ? 'neutral' : 'up';
              return (
                <button key={row.monthNumber} type="button" className="customer-trends-due-row" disabled={due <= 0} onClick={() => onDrilldown(row.monthNumber)} aria-label={`Open customer due order details for ${row.monthLabel} ${year}`}>
                  <span className="customer-trends-due-row__month"><strong>{row.monthLabel}</strong><small>{year}</small></span>
                  <span className="customer-trends-due-row__progress"><i style={{ width: `${progress}%` }} /><small>{progress.toFixed(0)}% shipped</small></span>
                  <span><small>Due</small><strong>{fmtMetric(due, metric)}</strong></span>
                  <span><small>Shipped</small><strong>{fmtMetric(shipped, metric)}</strong></span>
                  <span><small>Open</small><strong>{fmtMetric(open, metric)}</strong></span>
                  <span className="customer-trends-due-row__risk" data-tone={riskTone}><small>Status</small><strong>{riskLabel}</strong></span>
                  <ArrowRight size={13} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function TrendComparisonChart({ data, reportYear, metric, granularity, onDrilldown }: { data: TrendComparisonDatum[]; reportYear: string; metric: Metric; granularity: TrendGranularity; onDrilldown: (year: string, periodNumber: number | undefined, type?: SalesTypeCode) => void }) {
  const hasData = data.some(point => point.report > 0);
  const intervalLabel = granularity === 'monthly' ? 'Monthly' : 'Weekly';
  const canvasWidth = granularity === 'weekly' ? data.length * 44 : '100%';
  return (
    <section className="customer-trends-comparison-chart" aria-label={`${intervalLabel} comparison for ${reportYear}`}>
      <div className="customer-trends-comparison-chart__legend">
        <span><i style={{ background: 'var(--color-brand-500)' }} /><small>Report</small><strong>{reportYear || '-'}</strong></span>

      </div>
      <div className="customer-trends-comparison-chart__scroll content-scrollbar">
        {!hasData ? (
          <div className="customer-trends-chart-empty">No data</div>
        ) : (
          <div className="customer-trends-comparison-chart__canvas" style={{ width: canvasWidth }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="26%" barGap={4} margin={{ top: 8, right: 10, left: 0, bottom: 2 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border-light)" strokeDasharray="3 3" opacity={0.7} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval={0} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10, fontWeight: 800 }} dy={7} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value: number) => fmtAxis(value, metric)} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10, fontWeight: 750 }} width={58} />
                <Tooltip content={<TrendComparisonTooltip metric={metric} reportYear={reportYear} />} cursor={{ fill: 'color-mix(in srgb, var(--color-brand-500) 6%, transparent)' }} />
                <Bar dataKey="report" name={reportYear} fill="var(--color-brand-500)" maxBarSize={30} isAnimationActive={false} shape={<InteractiveTrendBar year={reportYear} series="report" metric={metric} fillColor="var(--color-brand-500)" onActivate={onDrilldown} />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

function TypeContribution({ rows, metric, year, total, onDrilldown }: { rows: TypeContributionRow[]; metric: Metric; year: string; total: number; onDrilldown: (year: string, month: number | undefined, type: SalesTypeCode) => void }) {


  return (
    <section className="customer-trends-contribution" aria-labelledby="customer-trends-contribution-title">
      <div className="customer-trends-contribution__header">
        <div><h3 id="customer-trends-contribution-title">Type Contribution</h3><span>{year || '-'}</span></div>
        <strong>{fmtMetric(total, metric)}</strong>
      </div>
      <div className="customer-trends-contribution__columns" aria-hidden="true">
        <span>Type</span><span>{year}</span><span>Share</span><span>Orders</span><span />
      </div>
      <div className="customer-trends-contribution__rows">
        {rows.map(row => {

          return (
            <button key={row.code} type="button" onClick={() => onDrilldown(year, undefined, row.code)} aria-label={`Open ${row.code} order details for ${year}`}>
              <span className="customer-trends-contribution__type"><i style={{ background: SALES_TYPE_COLORS[row.code] }} /><span><strong>{row.code}</strong><small>{row.label}</small></span></span>
              <span className="customer-trends-contribution__value"><strong>{fmtMetric(row.current, metric)}</strong><small>{year} / {row.share.toFixed(1)}%</small></span>
              <span className="customer-trends-contribution__delta" data-tone={'flat'}><strong>{fmtQty(row.orderCount)}</strong><small>orders</small></span>
              <ArrowRight size={13} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SearchBox({ value, onChange, onKeyDown, onClear }: { value: string; onChange: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void; onClear: () => void }) {
  return (
    <label style={searchBox}>
      <Search size={14} style={searchIcon} />
      <input value={value} onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder="Search order, item, customer" style={searchInput} />
      {value && <button type="button" onClick={onClear} title="Clear search" style={searchButton}><X size={13} /></button>}
    </label>
  );
}
function SummaryMetric({ label, value, hint, tone, muted, control }: { label: string; value: string; hint: string; tone?: 'up' | 'down'; muted?: boolean; control?: ReactNode }) {
  const valueColor = muted ? 'var(--color-text-quaternary)' : tone === 'up' ? 'var(--color-success-500)' : tone === 'down' ? 'var(--color-danger-500)' : 'var(--color-text-primary)';
  return (
    <div className="customer-trends-summary__item">
      <div style={summaryHeader}>
        <span style={summaryLabel}>{label}</span>
        {control}
      </div>
      <strong style={{ ...summaryValue, color: valueColor }}>{value}</strong>
      <span style={{ ...summaryHint, ...(tone === 'up' ? summaryHintUp : tone === 'down' ? summaryHintDown : null) }}>{hint}</span>
    </div>
  );
}

function KpiTypeSelect({ value, onChange }: { value: KpiTypeSelection; onChange: (value: KpiTypeSelection) => void }) {
  const options = [
    { value: 'ALL', label: 'All Types' },
    ...SALES_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))
  ];
  return (
    <div style={{ width: 125 }}>
      <CustomSelect
        value={value}
        onChange={(val) => onChange(val as KpiTypeSelection)}
        options={options}
        ariaLabel="Order count product type"
      />
    </div>
  );
}


function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ ...chipButton, ...(active ? chipActive : null) }}
    >
      {label}
    </button>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} className="sales-dense-empty">{label}</td></tr>;
}


function TableSkeletonRows({ columns, rows = 8 }: { columns: number; rows?: number }) {
  const widths = [72, 46, 58, 64, 54, 76, 66, 50, 60];
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex}>
              <span className="sales-dense-skeleton" style={{ width: `${widths[(rowIndex + columnIndex) % widths.length]}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const pageShell: CSSProperties = { minHeight: 0, background: 'var(--color-surface-1)' };
const searchBox: CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center', width: 'min(292px, 100%)' };
const searchIcon: CSSProperties = { position: 'absolute', left: 9, color: 'var(--color-text-tertiary)' };
const searchInput: CSSProperties = { width: '100%', height: 30, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 6, padding: '0 32px 0 30px', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 850, outline: 'none', fontFamily: 'var(--font-body)', textTransform: 'uppercase' };
const searchButton: CSSProperties = { position: 'absolute', right: 4, width: 22, height: 22, display: 'grid', placeItems: 'center', border: '1px solid var(--color-border-light)', borderRadius: 5, background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', cursor: 'pointer' };
const summaryHeader: CSSProperties = { display: 'flex', minWidth: 0, alignItems: 'center', justifyContent: 'space-between', gap: 5 };
const summaryLabel: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-meta)', fontWeight: 900, textTransform: 'uppercase' };
const summaryValue: CSSProperties = { color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-section)', fontWeight: 900, fontFamily: 'var(--font-display)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' };
const summaryHint: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-meta)', fontWeight: 750, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const summaryHintUp: CSSProperties = { color: 'var(--color-success-500)' };
const summaryHintDown: CSSProperties = { color: 'var(--color-danger-500)' };
const filterToolbar: CSSProperties = { position: 'relative', display: 'grid', overflow: 'visible', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8 };
const filterPrimaryRow: CSSProperties = { display: 'flex', alignItems: 'center', columnGap: 10, rowGap: 8, minHeight: 52, padding: '8px 12px', flexWrap: 'wrap' };
const filterCollapsedRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minHeight: 42, padding: '6px 12px' };
const filterCollapsedSummary: CSSProperties = { minWidth: 0, flex: '1 1 auto', overflow: 'hidden', color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-dense)', fontWeight: 850, textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const filterBlock: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 };
const groupFilterBlock: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '8px 12px', borderTop: '1px solid var(--color-border-light)' };
const filterLabel: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, whiteSpace: 'nowrap' };
const filterSectionLabel: CSSProperties = { ...filterLabel, color: 'var(--color-text-secondary)' };
const filterControlDivider: CSSProperties = { width: 1, minHeight: 26, alignSelf: 'stretch', background: 'var(--color-border-light)' };
const selectStyle: CSSProperties = { height: 32, borderRadius: 6, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, padding: '0 8px', outline: 'none', fontFamily: 'var(--font-body)' };

const chipRail: CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', paddingBottom: 1 };
const chipButton: CSSProperties = { height: 30, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 10px', borderRadius: 6, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'var(--font-body)' };
const chipActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-0))', color: 'var(--color-brand-600)' };
const orderPanel: CSSProperties = { width: '100%', minHeight: 0, flex: '1 1 0' };
const panelTitle: CSSProperties = { margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-control)', fontWeight: 900 };
const panelHeaderRight: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 };
const panelMeta: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900 };
const tableScroll: CSSProperties = { width: '100%', minHeight: 0 };
const td: CSSProperties = { height: 46, padding: '6px 8px', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 500, verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const tdStrongCenter: CSSProperties = { ...td, fontWeight: 900, textAlign: 'center' };
const tdCenter: CSSProperties = { ...td, textAlign: 'center' };
const tdStrong: CSSProperties = { ...td, fontWeight: 900 };
const tdStrongRight: CSSProperties = { ...td, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const linkButton: CSSProperties = { background: 'none', border: 'none', color: 'var(--color-brand-600)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' };
const paginationBar: CSSProperties = { minHeight: 38, padding: '6px 10px' };
const paginationText: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 850 };
const paginationButtons: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6 };
const pageButton: CSSProperties = { width: 28, height: 28, display: 'inline-grid', placeItems: 'center', borderRadius: 6, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', cursor: 'pointer' };
const pageButtonDisabled: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const pageText: CSSProperties = { color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, minWidth: 82, textAlign: 'center' };
