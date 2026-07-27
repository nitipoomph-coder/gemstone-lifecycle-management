import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, DollarSign, Eye, FilterX, Hash, RefreshCw, Search, SlidersHorizontal, Table2, Users, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Topbar from '../components/layout/Topbar';
import '../components/sales/SalesDenseTable.css';
import './SalesCustomerGroupAnalytics.css';
import { CUSTOMER_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchSalesOrders, type SalesOrderRow } from '../services/customerSalesAPI';
import { ErpButton, ErpIconButton, ErpSegmentedControl } from '../components/ui/ErpButtons';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_VALUES = MONTHS.map((_, index) => String(index + 1));
const QUARTERS = [
  { label: 'Q1', months: ['1', '2', '3'] },
  { label: 'Q2', months: ['4', '5', '6'] },
  { label: 'Q3', months: ['7', '8', '9'] },
  { label: 'Q4', months: ['10', '11', '12'] },
];
const PAGE_SIZE = 50;
const ORDER_DETAIL_COLUMNS = [
  ['Order No', 124],
  ['Item No', 126],
  ['Ord Date', 82],
  ['Cust Due', 82],
  ['Customer', 188],
  ['Group', 120],
  ['Product Type', 126],
  ['Item Type', 134],
  ['Ord Qty', 80],
  ['Shipped', 80],
  ['Open Qty', 76],
  ['Amount', 96],
  ['Status', 82],
  ['Market', 82],
  ['Actions', 70],
] as const;

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  A: 'Mobile Hanging',
  B: 'Bangle',
  D: 'Body Jewelry',
  E: 'Earring',
  F: 'Anklet',
  H: 'Brooch',
  N: 'Necklace',
  O: 'Other',
  P: 'Pendant',
  R: 'Ring',
  S: 'Stone',
  T: 'Bracelet',
};

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

const emptyTotals: SalesTotals = { amount: 0, qty: 0, shippedQty: 0, gapQty: 0, orders: 0, late: 0 };

const fmtAmount = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
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

function productTypeLabel(type?: string | null, typeName?: string | null) {
  const fullName = (typeName || '').trim();
  if (fullName && fullName !== 'Unclassified') return fullName;
  const code = (type || '').trim().toUpperCase();
  if (!code) return fullName || '-';
  return PRODUCT_TYPE_LABELS[code[0]] || fullName || 'Unclassified';
}

function groupLabel(code?: string | null) {
  if (!code) return '-';
  const groupId = getCustomerGroupId(code);
  return CUSTOMER_GROUPS.find(group => group.id === groupId)?.label || groupId;
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

function sameMonths(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => Number(x) - Number(y));
  const right = [...b].sort((x, y) => Number(x) - Number(y));
  return left.every((value, index) => value === right[index]);
}

function monthButtonLabel(selectedMonths: string[]) {
  const quarter = QUARTERS.find(item => sameMonths(selectedMonths, item.months));
  if (selectedMonths.length === MONTH_VALUES.length) return 'All Months';
  if (quarter) return quarter.label;
  if (selectedMonths.length <= 3) return selectedMonths.map(month => MONTHS[Number(month) - 1]).join(', ');
  return `${selectedMonths.length} months`;
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

function buildMonthlyTypeData(rows: SalesOrderRow[], year: string, selectedMonths: string[], metric: Metric): MonthlyTypeDatum[] {
  const data = selectedMonths
    .map(Number)
    .sort((a, b) => a - b)
    .map(monthNumber => ({
      month: MONTHS[monthNumber - 1],
      monthNumber,
      total: 0,
      BBS: 0,
      BES: 0,
      BNS: 0,
      BRS: 0,
      OTHERS: 0,
    }));
  const byMonth = new Map(data.map(point => [String(point.monthNumber), point]));

  rows.forEach(row => {
    if (yearFromOrder(row) !== year) return;
    const point = byMonth.get(monthFromOrder(row));
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

function weeksForMonths(year: string, selectedMonths: string[]) {
  const numericYear = Number(year);
  if (!numericYear) return [];
  const weeks = new Set<number>();

  selectedMonths.forEach(month => {
    const numericMonth = Number(month);
    const daysInMonth = new Date(Date.UTC(numericYear, numericMonth, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      weeks.add(calendarWeekNumber(new Date(Date.UTC(numericYear, numericMonth - 1, day))));
    }
  });

  return [...weeks];
}

function buildWeeklyComparisonData(rows: SalesOrderRow[], reportYear: string, compareYear: string | undefined, selectedMonths: string[], metric: Metric): TrendComparisonDatum[] {
  const weekNumbers = new Set([
    ...weeksForMonths(reportYear, selectedMonths),
    ...(compareYear ? weeksForMonths(compareYear, selectedMonths) : []),
  ]);
  const data = [...weekNumbers]
    .sort((a, b) => a - b)
    .map(week => ({ label: `W${String(week).padStart(2, '0')}`, periodNumber: week, report: 0, compare: 0 }));
  const byWeek = new Map(data.map(point => [point.periodNumber, point]));

  rows.forEach(row => {
    const rowYear = yearFromOrder(row);
    if (rowYear !== reportYear && rowYear !== compareYear) return;
    const point = byWeek.get(weekFromOrder(row));
    if (!point) return;
    point[rowYear === reportYear ? 'report' : 'compare'] += rowMetricValue(row, metric);
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

function groupWeeklyComparisonData(data: TrendComparisonDatum[], reportYear: string, selectedMonths: string[]): WeeklyComparisonGroup[] {
  const groups = new Map<number, WeeklyComparisonGroup>();
  const selectedMonthNumbers = new Set(selectedMonths.map(Number));

  data
    .filter(point => point.report > 0 || point.compare > 0)
    .forEach(point => {
      const range = calendarWeekRange(reportYear, point.periodNumber);
      let monthNumber = range.midpoint.getUTCMonth() + 1;
      if (!selectedMonthNumbers.has(monthNumber)) {
        for (let dateValue = range.start.getTime(); dateValue <= range.end.getTime(); dateValue += 86_400_000) {
          const candidateMonth = new Date(dateValue).getUTCMonth() + 1;
          if (selectedMonthNumbers.has(candidateMonth)) {
            monthNumber = candidateMonth;
            break;
          }
        }
      }
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

function buildDueOutlookData(rows: SalesOrderRow[], year: string, selectedMonths: string[]): DueOutlookDatum[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueSoonCutoff = new Date(today);
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 14);

  const data = selectedMonths
    .map(Number)
    .sort((a, b) => a - b)
    .map(monthNumber => ({
      monthNumber,
      monthLabel: MONTHS[monthNumber - 1],
      dueQty: 0,
      shippedQty: 0,
      openQty: 0,
      dueAmount: 0,
      shippedAmount: 0,
      openAmount: 0,
      overdueOrders: 0,
      dueSoonOrders: 0,
      overdueOrderNos: new Set<string>(),
      dueSoonOrderNos: new Set<string>(),
    }));
  const byMonth = new Map(data.map(point => [String(point.monthNumber), point]));

  rows.forEach(row => {
    if (yearFromDate(row.custDueDate) !== year) return;
    const point = byMonth.get(monthFromDate(row.custDueDate));
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

    if (openQty <= 0 || !row.orderNo || !row.custDueDate) return;
    const dueDate = new Date(row.custDueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) point.overdueOrderNos.add(row.orderNo);
    else if (dueDate <= dueSoonCutoff) point.dueSoonOrderNos.add(row.orderNo);
  });

  return data.map(({ overdueOrderNos, dueSoonOrderNos, ...point }) => ({
    ...point,
    overdueOrders: overdueOrderNos.size,
    dueSoonOrders: dueSoonOrderNos.size,
  }));
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
  const requestedMonths = useMemo(() => csv(searchParams.get('months')).filter(month => MONTH_VALUES.includes(month)), [searchParams]);
  const requestedCustomers = useMemo(() => csv(searchParams.get('customers')), [searchParams]);
  const requestedGroups = useMemo(() => csv(searchParams.get('groups')).filter(groupId => CUSTOMER_GROUPS.some(group => group.id === groupId)), [searchParams]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(requestedMonths.length ? requestedMonths : MONTH_VALUES);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const customers = useMemo(() => selectedCustomerCodes(selectedGroups), [selectedGroups]);
  const drilldownKey = drilldown ? `${drilldown.basis || 'order'}|${drilldown.year}|${drilldown.month || 'all'}|${drilldown.week || 'all'}|${drilldown.type || 'all'}|${drilldown.metric || metric}` : 'all';
  const filterPageKey = `${selectedYears.join('|')}|${selectedMonths.join('|')}|${selectedGroups.join('|')}|${metric}|${search}|${drilldownKey}`;

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(resetTimer);
  }, [filterPageKey]);

  useEffect(() => {
    const closeDropdowns = (event: PointerEvent) => {
      if (filterToolbarRef.current?.contains(event.target as Node)) return;
      setMonthDropdownOpen(false);
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
        fetchSalesOrders({ years: selectedYears, months: selectedMonths, customers }),
        fetchSalesOrders({ years: selectedYears, months: selectedMonths, customers, dateView: 'custdate' }),
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
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setOrders([]);
      setDueOrders([]);
      setError(err instanceof Error ? err.message : 'Failed to load customer trends');
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }, [yearsLoading, selectedYears, selectedMonths, customers]);

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
  const compareTotals = useMemo(() => hasCompareYear ? calcTotals(orders, compareYear) : emptyTotals, [orders, compareYear, hasCompareYear]);
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
    () => buildMonthlyTypeData(orders, primaryYear, selectedMonths, metric),
    [orders, primaryYear, selectedMonths, metric],
  );
  const compareChartData = useMemo(
    () => buildMonthlyTypeData(orders, hasCompareYear ? compareYear : '', selectedMonths, metric),
    [orders, compareYear, hasCompareYear, selectedMonths, metric],
  );
  const monthlyComparisonData = useMemo<TrendComparisonDatum[]>(() => primaryChartData.map((point, index) => ({
    label: point.month,
    periodNumber: point.monthNumber,
    report: point.total,
    compare: compareChartData[index]?.total || 0,
  })), [primaryChartData, compareChartData]);
  const weeklyComparisonData = useMemo(
    () => buildWeeklyComparisonData(orders, primaryYear, hasCompareYear ? compareYear : undefined, selectedMonths, metric),
    [orders, primaryYear, compareYear, hasCompareYear, selectedMonths, metric],
  );
  const weeklyComparisonGroups = useMemo(
    () => groupWeeklyComparisonData(weeklyComparisonData, primaryYear, selectedMonths),
    [weeklyComparisonData, primaryYear, selectedMonths],
  );
  const dueOutlookData = useMemo(
    () => buildDueOutlookData(dueOrders, primaryYear, selectedMonths),
    [dueOrders, primaryYear, selectedMonths],
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
        (drilldown.basis === 'due' ? yearFromDate(row.custDueDate) : yearFromOrder(row)) === drilldown.year
        && (!drilldown.month || (drilldown.basis === 'due' ? monthFromDate(row.custDueDate) : monthFromOrder(row)) === drilldown.month)
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
      const leftDate = drilldown?.basis === 'due' ? a.custDueDate : a.ordDate;
      const rightDate = drilldown?.basis === 'due' ? b.custDueDate : b.ordDate;
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
  const collapsedFilterSummary = `${metric === 'amount' ? 'Amount' : 'Quantity'} / ${selectedYearSummary} / ${monthButtonLabel(selectedMonths)} / ${selectedGroupSummary}`;
  const activeScopeSummary = `${selectedYearSummary} / ${monthButtonLabel(selectedMonths)} / ${selectedGroupSummary} / ${metric === 'amount' ? 'Amount' : 'Quantity'}`;
  const lastUpdatedLabel = lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not updated';
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
      setMonthDropdownOpen(false);
    }
    setFiltersExpanded(expanded => !expanded);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') clearSearch();
  };

  const updateYearSelection = (primary: string, compare: string) => {
    const nextCompare = compare !== primary ? compare : 'none';
    const next = [nextCompare, primary].filter(year => year && year !== 'none');
    setSelectedYears(Array.from(new Set(next)));
    setDrilldown(null);
  };

  const toggleMonth = (month: string) => {
    setDrilldown(null);
    setSelectedMonths(prev => prev.includes(month)
      ? (prev.length > 1 ? prev.filter(item => item !== month) : prev)
      : [...prev, month].sort((a, b) => Number(a) - Number(b)));
  };

  const toggleGroup = (groupId: string) => {
    setDrilldown(null);
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(item => item !== groupId) : [...prev, groupId]);
  };

  const resetFilters = () => {
    setSelectedYears(defaultYearSelection(availableYears));
    setSelectedMonths(MONTH_VALUES);
    setSelectedGroups([]);
    setSelectedKpiType('ALL');
    setMonthDropdownOpen(false);
    setMetric('amount');
    setDrilldown(null);
    setSearch('');
  };

  const selectAllGroups = () => {
    setSelectedGroups([]);
    setDrilldown(null);
  };

  const selectMonths = (months: string[]) => {
    setSelectedMonths(months);
    setMonthDropdownOpen(false);
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

  const detailParams = (customerCode?: string) => {
    const params = new URLSearchParams();
    if (selectedYears.length) params.set('years', selectedYears.join(','));
    if (selectedMonths.length && selectedMonths.length !== MONTH_VALUES.length) params.set('months', selectedMonths.join(','));
    if (customerCode) params.set('customers', customerCode);
    else if (customers.length) params.set('customers', customers.join(','));
    if (!customerCode && selectedGroups.length) params.set('groups', selectedGroups.join(','));
    if (metric !== 'amount') params.set('metric', metric);
    return params.toString().replace(/%2C/g, ',');
  };

  const openDetail = (customerCode?: string) => {
    const qs = detailParams(customerCode);
    navigate(`/dashboard/sales-customer-detail${qs ? `?${qs}` : ''}`);
  };

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
          { label: 'Sales Analytics' },
          { label: 'Sales & Qty Summary', path: '/dashboard/customer' },
          { label: 'Customer Trends' },
        ]}
        hideSearch
        contentLayout={activeView === 'overview' ? 'dashboard' : 'workspace'}
      />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={pageShell}>
        <div className={`app-content-frame app-content-frame--${activeView === 'overview' ? 'dashboard' : 'workspace'} app-page-content customer-trends-page customer-trends-page--${activeView}`}>
          <header className="customer-trends-page-header">
            <div>
              <h1>Customer Trends</h1>
              <p>Customer group performance and supporting order lines</p>
            </div>
            <div className="customer-trends-page-header__actions">
              <ErpButton
                variant="secondary"
                size="sm"
                icon={<ArrowLeft size={14} />}
                onClick={() => navigate(metric === 'qty' ? '/dashboard/qty' : '/dashboard/customer')}
              >
                Sales &amp; Qty Summary
              </ErpButton>
            </div>
          </header>

          <section className="customer-trends-controlbar" aria-label="Report controls">
            <div className="customer-trends-controlbar__group">
              <span className="customer-trends-controlbar__label">Metric</span>
              <ErpSegmentedControl
                ariaLabel="Metric mode"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: 'amount', label: 'Sales', icon: <DollarSign size={13} /> },
                  { value: 'qty', label: 'Qty', icon: <Hash size={13} /> },
                ]}
              />
            </div>
            <div className="customer-trends-controlbar__divider" />
            <div className="customer-trends-controlbar__group">
              <span className="customer-trends-controlbar__label">View</span>
              <ErpSegmentedControl
                ariaLabel="Customer Trends view"
                value={activeView}
                onChange={setActiveView}
                options={[
                  { value: 'overview', label: 'Overview', icon: <BarChart3 size={13} /> },
                  { value: 'details', label: 'Order Details', icon: <Table2 size={13} /> },
                ]}
              />
            </div>
            {activeView === 'overview' && (
              <>
                <div className="customer-trends-controlbar__divider" />
                <div className="customer-trends-controlbar__group">
                  <span className="customer-trends-controlbar__label">Interval</span>
                  <ErpSegmentedControl
                    ariaLabel="Trend interval"
                    value={trendGranularity}
                    onChange={(value) => {
                      setTrendGranularity(value);
                      setDrilldown(null);
                    }}
                    options={[
                      { value: 'monthly', label: 'Monthly', icon: <CalendarDays size={13} /> },
                      { value: 'weekly', label: 'Weekly', icon: <CalendarDays size={13} /> },
                    ]}
                  />
                </div>
              </>
            )}
          </section>

          <section ref={filterToolbarRef} style={{ ...filterToolbar, zIndex: monthDropdownOpen ? 30 : 1 }} aria-label="View filters">
            {filtersExpanded ? (
              <>
                <div style={filterPrimaryRow}>
                  <span style={filterSectionLabel}><SlidersHorizontal size={13} />Filters</span>
                  <div style={filterControlDivider} />
                  <div style={filterBlock}>
                    <span style={filterLabel}><CalendarDays size={13} />Years</span>
                    <YearSelectControls availableYears={availableYears} primaryYear={primaryYear} compareYear={compareYear} onChange={updateYearSelection} />
                  </div>
                  <div style={filterBlock}>
                    <span style={filterLabel}><CalendarDays size={13} />Period</span>
                    <MonthDrillDropdown
                      open={monthDropdownOpen}
                      selectedMonths={selectedMonths}
                      onToggle={() => setMonthDropdownOpen(open => !open)}
                      onSelect={selectMonths}
                      onToggleMonth={toggleMonth}
                    />
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

          <div className="customer-trends-viewbar">
            <div className="customer-trends-viewbar__title">
              {activeView === 'overview' ? <BarChart3 size={14} /> : <Table2 size={14} />}
              <strong>{activeView === 'overview' ? 'Overview' : 'Order Details'}</strong>
            </div>
            <div className="customer-trends-viewbar__meta" title={activeScopeSummary}>
              <span>{activeScopeSummary}</span>
              <span>{lastUpdatedLabel}</span>
              <ErpIconButton label="Reload data" tone="refresh" onClick={() => void loadOrders()} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />} disabled={loading} size="sm" />
            </div>
          </div>

          {error && (
            <div role="alert" className="customer-trends-error">
              <span>{error}</span>
              <button type="button" onClick={() => void loadOrders()}><RefreshCw size={13} />Retry</button>
            </div>
          )}

          {activeView === 'overview' && (
            <section id="customer-trends-overview-panel" className={`customer-trends-overview customer-trends-overview--${trendGranularity}`}>
              <div className="customer-trends-overview__header">
                <div>
                  <h2>{trendGranularity === 'monthly' ? 'Monthly Comparison' : 'Weekly Comparison'}</h2>
                  <span>{monthButtonLabel(selectedMonths)} / {metric === 'amount' ? 'Sales amount' : 'Ordered quantity'}</span>
                </div>
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
                            compareYear={hasCompareYear ? compareYear : undefined}
                            metric={metric}
                            granularity="monthly"
                            onDrilldown={openChartDetail}
                          />
                        ) : (
                          <WeeklyComparisonList
                            key={`weekly-${selectedMonths.join('-')}`}
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
                        : monthButtonLabel(selectedMonths)}
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
                            className={index >= 8 && index <= 11 ? 'sales-dense-table__number' : index === 14 ? 'sales-dense-table__center' : undefined}
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
                        const gapQty = Math.max(Number(row.orderQty || 0) - Number(row.shippedQty || 0), 0);
                        const rowSalesType = salesTypeCode(row);
                        return (
                          <tr key={`${row.orderNo}-${row.itemNo}-${row.ordDate}`}>
                            <td style={tdCode}>{row.orderNo}<span style={subText}>{row.poNo || '-'}</span></td>
                            <td style={tdCode}><button type="button" onClick={() => navigate(`/item-detail/${encodeURIComponent(row.itemNo)}`)} style={linkButton}>{row.itemNo || '-'}</button></td>
                            <td style={td}>{fmtDate(row.ordDate)}</td>
                            <td style={{ ...td, ...(row.status === 'Late' ? lateDateCell : null) }}>{fmtDate(row.custDueDate)}</td>
                            <td style={tdStrong}>{row.customerName || '-'}<span style={subText}>{row.customerCode || '-'}</span></td>
                            <td style={tdStrong}>{groupLabel(row.customerCode)}</td>
                            <td style={tdCode}>{rowSalesType}<span style={subText}>{kpiTypeLabel(rowSalesType)}</span></td>
                            <td style={td}>{productTypeLabel(row.itemType, row.itemTypeName)}</td>
                            <td style={tdRight}>{fmtQty(Number(row.orderQty || 0))}</td>
                            <td style={tdRight}>{fmtQty(Number(row.shippedQty || 0))}</td>
                            <td style={tdRight}>{fmtQty(gapQty)}</td>
                            <td style={tdRight}>{fmtAmount(Number(row.amount || 0))}</td>
                            <td style={td}><StatusBadge status={row.status} /></td>
                            <td style={td}>{row.market || '-'}</td>
                            <td style={tdCenter}><button type="button" onClick={() => openDetail(row.customerCode)} title="Open customer order list" className="sales-dense-action"><Eye size={14} /></button></td>
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

      <section className="customer-trends-summary customer-trends-summary--loading" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="customer-trends-summary__item customer-trends-loading-metric">
            <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: `${38 + (index % 3) * 8}%` }} />
            <span className="customer-trends-skeleton customer-trends-skeleton--value" style={{ width: `${58 + (index % 2) * 12}%` }} />
            <span className="customer-trends-skeleton customer-trends-skeleton--hint" style={{ width: `${46 + (index % 3) * 9}%` }} />
          </div>
        ))}
      </section>

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
            <table className="sales-dense-table sales-dense-table--sticky-first" style={{ width: '100%', minWidth: 1536 }}>
              <thead>
                <tr>
                  {ORDER_DETAIL_COLUMNS.map(([head, width], index) => (
                    <th
                      key={head}
                      className={index >= 8 && index <= 11 ? 'sales-dense-table__number' : index === 14 ? 'sales-dense-table__center' : undefined}
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

function TrendComparisonTooltip({ active, payload, label, metric, reportYear, compareYear }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string | number; metric: Metric; reportYear: string; compareYear?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const reportValue = Number(point?.report || 0);
  const compareValue = Number(point?.compare || 0);
  const delta = reportValue - compareValue;
  const growth = compareValue > 0 ? (delta / compareValue) * 100 : null;

  return (
    <div className="customer-trends-tooltip">
      <div className="customer-trends-tooltip__header">
        <strong>{label}</strong>
        {compareYear && <span className={delta < 0 ? 'is-down' : delta > 0 ? 'is-up' : undefined}>{fmtSignedMetric(delta, metric)}</span>}
      </div>
      <div className="customer-trends-tooltip__row">
        <span><i style={{ background: 'var(--color-brand-500)' }} />{reportYear}</span>
        <strong>{fmtMetric(reportValue, metric)}</strong>
        <small>Report</small>
      </div>
      {compareYear && (
        <div className="customer-trends-tooltip__row">
          <span><i style={{ background: 'var(--color-accent-500)' }} />{compareYear}</span>
          <strong>{fmtMetric(compareValue, metric)}</strong>
          <small>{growth === null ? 'No base' : fmtPercent(growth)}</small>
        </div>
      )}
    </div>
  );
}

function WeeklyComparisonList({ groups, reportYear, compareYear, metric, onDrilldown }: { groups: WeeklyComparisonGroup[]; reportYear: string; compareYear?: string; metric: Metric; onDrilldown: (year: string, week: number | undefined, type?: SalesTypeCode) => void }) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(() => groups[0]?.monthNumber ?? null);

  if (groups.length === 0) return <div className="customer-trends-chart-empty">No weekly data</div>;

  return (
    <section className="customer-trends-weekly" data-compare={Boolean(compareYear)} aria-label={`Weekly comparison for ${reportYear}${compareYear ? ` and ${compareYear}` : ''}`}>
      <div className="customer-trends-weekly__columns" aria-hidden="true">
        <span>Month / week</span>
        <span>{reportYear || 'Report year'}</span>
        {compareYear && <span>{compareYear}</span>}
        {compareYear && <span>Change</span>}
        <span />
      </div>
      <div className="customer-trends-weekly__months">
        {groups.map(group => {
          const isExpanded = expandedMonth === group.monthNumber;
          const reportTotal = group.weeks.reduce((sum, week) => sum + week.report, 0);
          const compareTotal = group.weeks.reduce((sum, week) => sum + week.compare, 0);
          const delta = reportTotal - compareTotal;
          const growth = compareTotal > 0 ? (delta / compareTotal) * 100 : null;
          const tone = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
          const panelId = `weekly-month-panel-${group.monthNumber}`;
          const triggerId = `weekly-month-trigger-${group.monthNumber}`;

          return (
            <section key={group.monthNumber} className="customer-trends-weekly__month">
              <button
                id={triggerId}
                type="button"
                className="customer-trends-weekly__month-toggle"
                data-tone={compareYear ? tone : 'flat'}
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
                {compareYear && (
                  <span className="customer-trends-weekly__metric">
                    <small>{compareYear}</small>
                    <strong>{fmtMetric(compareTotal, metric)}</strong>
                  </span>
                )}
                {compareYear && (
                  <span className="customer-trends-weekly__delta">
                    <strong>{fmtSignedMetric(delta, metric)}</strong>
                    <small>{growth === null ? 'No baseline' : fmtPercent(growth)}</small>
                  </span>
                )}
                <ChevronDown className="customer-trends-weekly__chevron" size={15} aria-hidden="true" />
              </button>

              {isExpanded && (
                <div id={panelId} className="customer-trends-weekly__week-list" role="region" aria-labelledby={triggerId}>
                  {group.weeks.map(week => {
                    const weekDelta = week.report - week.compare;
                    const weekGrowth = week.compare > 0 ? (weekDelta / week.compare) * 100 : null;
                    const weekTone = weekDelta > 0 ? 'up' : weekDelta < 0 ? 'down' : 'flat';
                    return (
                      <div key={week.periodNumber} className="customer-trends-weekly__week-row" data-tone={compareYear ? weekTone : 'flat'}>
                        <span className="customer-trends-weekly__period">
                          <strong>{week.label}</strong>
                          <small>{week.dateRange}</small>
                        </span>
                        <button type="button" className="customer-trends-weekly__metric" disabled={week.report <= 0} onClick={() => onDrilldown(reportYear, week.periodNumber)} title={`Open ${reportYear} order details`}>
                          <small>{reportYear}</small>
                          <strong>{fmtMetric(week.report, metric)}</strong>
                        </button>
                        {compareYear && (
                          <button type="button" className="customer-trends-weekly__metric" disabled={week.compare <= 0} onClick={() => onDrilldown(compareYear, week.periodNumber)} title={`Open ${compareYear} order details`}>
                            <small>{compareYear}</small>
                            <strong>{fmtMetric(week.compare, metric)}</strong>
                          </button>
                        )}
                        {compareYear && (
                          <span className="customer-trends-weekly__delta">
                            <strong>{fmtSignedMetric(weekDelta, metric)}</strong>
                            <small>{weekGrowth === null ? 'No baseline' : fmtPercent(weekGrowth)}</small>
                          </span>
                        )}
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

function TrendComparisonChart({ data, reportYear, compareYear, metric, granularity, onDrilldown }: { data: TrendComparisonDatum[]; reportYear: string; compareYear?: string; metric: Metric; granularity: TrendGranularity; onDrilldown: (year: string, periodNumber: number | undefined, type?: SalesTypeCode) => void }) {
  const hasData = data.some(point => point.report > 0 || point.compare > 0);
  const intervalLabel = granularity === 'monthly' ? 'Monthly' : 'Weekly';
  const canvasWidth = granularity === 'weekly' ? data.length * 44 : '100%';

  return (
    <section className="customer-trends-comparison-chart" aria-label={`${intervalLabel} comparison for ${reportYear}${compareYear ? ` and ${compareYear}` : ''}`}>
      <div className="customer-trends-comparison-chart__legend">
        <span><i style={{ background: 'var(--color-brand-500)' }} /><small>Report</small><strong>{reportYear || '-'}</strong></span>
        {compareYear && <span><i style={{ background: 'var(--color-accent-500)' }} /><small>Compare</small><strong>{compareYear}</strong></span>}
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
                <Tooltip content={<TrendComparisonTooltip metric={metric} reportYear={reportYear} compareYear={compareYear} />} cursor={{ fill: 'color-mix(in srgb, var(--color-brand-500) 6%, transparent)' }} />
                <Bar dataKey="report" name={reportYear} fill="var(--color-brand-500)" maxBarSize={30} isAnimationActive={false} shape={<InteractiveTrendBar year={reportYear} series="report" metric={metric} fillColor="var(--color-brand-500)" onActivate={onDrilldown} />} />
                {compareYear && <Bar dataKey="compare" name={compareYear} fill="var(--color-accent-500)" maxBarSize={30} isAnimationActive={false} shape={<InteractiveTrendBar year={compareYear} series="compare" metric={metric} fillColor="var(--color-accent-500)" onActivate={onDrilldown} />} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

function TypeContribution({ rows, metric, year, compareYear, total, onDrilldown }: { rows: TypeContributionRow[]; metric: Metric; year: string; compareYear?: string; total: number; onDrilldown: (year: string, month: number | undefined, type: SalesTypeCode) => void }) {
  const compareTotal = rows.reduce((sum, row) => sum + row.compare, 0);

  return (
    <section className="customer-trends-contribution" aria-labelledby="customer-trends-contribution-title">
      <div className="customer-trends-contribution__header">
        <div><h3 id="customer-trends-contribution-title">Type Contribution</h3><span>{year || '-'}</span></div>
        <strong>{fmtMetric(total, metric)}</strong>
      </div>
      <div className="customer-trends-contribution__columns" aria-hidden="true">
        <span>Type</span><span>{year}</span><span>{compareYear || 'Share'}</span><span>{compareYear ? 'Change' : 'Orders'}</span><span />
      </div>
      <div className="customer-trends-contribution__rows">
        {rows.map(row => {
          const delta = row.current - row.compare;
          const tone = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
          const compareShare = compareTotal > 0 ? (row.compare / compareTotal) * 100 : 0;
          const growth = row.compare > 0 ? (delta / row.compare) * 100 : null;
          return (
            <button key={row.code} type="button" onClick={() => onDrilldown(year, undefined, row.code)} aria-label={`Open ${row.code} order details for ${year}`}>
              <span className="customer-trends-contribution__type"><i style={{ background: SALES_TYPE_COLORS[row.code] }} /><span><strong>{row.code}</strong><small>{row.label}</small></span></span>
              <span className="customer-trends-contribution__value"><strong>{fmtMetric(row.current, metric)}</strong><small>{year} / {row.share.toFixed(1)}%</small></span>
              <span className="customer-trends-contribution__compare"><strong>{compareYear ? fmtMetric(row.compare, metric) : `${row.share.toFixed(1)}%`}</strong><small>{compareYear ? `${compareYear} / ${compareShare.toFixed(1)}%` : 'share'}</small></span>
              <span className="customer-trends-contribution__delta" data-tone={compareYear ? tone : 'flat'}><strong>{compareYear ? fmtSignedMetric(delta, metric) : fmtQty(row.orderCount)}</strong><small>{compareYear ? (growth === null ? 'No base' : fmtPercent(growth)) : 'orders'}</small></span>
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
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value as KpiTypeSelection)}
      style={kpiTypeSelect}
      aria-label="Order count product type"
      title={kpiTypeLabel(value)}
    >
      <option value="ALL">All Types</option>
      {SALES_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function YearSelectControls({ availableYears, primaryYear, compareYear, onChange }: { availableYears: string[]; primaryYear: string; compareYear: string; onChange: (primary: string, compare: string) => void }) {
  return (
    <div style={yearControls}>
      <label style={yearField}>
        <span style={yearFieldLabel}>Report year</span>
        <select value={primaryYear} onChange={(event) => onChange(event.target.value, compareYear)} style={selectStyle} aria-label="Primary year">
          {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>
      <label style={yearField}>
        <span style={yearFieldLabel}>Compare with</span>
        <select value={compareYear} onChange={(event) => onChange(primaryYear, event.target.value)} style={selectStyle} aria-label="Compare year">
          <option value="none">None</option>
          {availableYears.filter(year => year !== primaryYear).map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>
    </div>
  );
}

function MonthDrillDropdown({ open, selectedMonths, onToggle, onSelect, onToggleMonth }: { open: boolean; selectedMonths: string[]; onToggle: () => void; onSelect: (months: string[]) => void; onToggleMonth: (month: string) => void }) {
  return (
    <div style={{ position: 'relative', width: 154 }}>
      <button type="button" onClick={onToggle} style={{ ...dropdownButton, ...(open ? dropdownButtonOpen : null) }} aria-label="Select reporting period" aria-expanded={open} aria-haspopup="listbox">
        <span>{monthButtonLabel(selectedMonths)}</span><ChevronDown size={13} style={{ ...dropdownChevron, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && (
        <div style={monthMenu} role="listbox" aria-label="Reporting months" aria-multiselectable="true">
          <div style={quickMonthGrid}>
            <MonthOption active={selectedMonths.length === MONTH_VALUES.length} label="All" onClick={() => onSelect(MONTH_VALUES)} />
            {QUARTERS.map(quarter => <MonthOption key={quarter.label} active={sameMonths(selectedMonths, quarter.months)} label={quarter.label} onClick={() => onSelect(quarter.months)} />)}
          </div>
          <div style={monthGrid}>{MONTHS.map((month, index) => <MonthOption key={month} active={selectedMonths.includes(String(index + 1))} label={month} onClick={() => onToggleMonth(String(index + 1))} />)}</div>
        </div>
      )}
    </div>
  );
}

function MonthOption({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} style={{ ...monthOption, ...(active ? optionActive : null) }}>{label}</button>;
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

function StatusBadge({ status }: { status: SalesOrderRow['status'] }) {
  const tone = status === 'Shipped' ? 'success' : status === 'Late' ? 'danger' : status === 'Partial' ? 'warning' : 'info';
  return <span className={`sales-dense-badge sales-dense-badge--${tone}`}>{status}</span>;
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
const kpiTypeSelect: CSSProperties = { width: 96, minWidth: 0, height: 24, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--color-border-light)', borderRadius: 5, background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', padding: '0 4px', fontSize: 'var(--erp-text-meta)', fontWeight: 850, fontFamily: 'var(--font-body)', cursor: 'pointer' };
const filterToolbar: CSSProperties = { position: 'relative', display: 'grid', overflow: 'visible', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8 };
const filterPrimaryRow: CSSProperties = { display: 'flex', alignItems: 'center', columnGap: 10, rowGap: 8, minHeight: 52, padding: '8px 12px', flexWrap: 'wrap' };
const filterCollapsedRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minHeight: 42, padding: '6px 12px' };
const filterCollapsedSummary: CSSProperties = { minWidth: 0, flex: '1 1 auto', overflow: 'hidden', color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-dense)', fontWeight: 850, textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const filterBlock: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 };
const groupFilterBlock: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '8px 12px', borderTop: '1px solid var(--color-border-light)' };
const filterLabel: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, whiteSpace: 'nowrap' };
const filterSectionLabel: CSSProperties = { ...filterLabel, color: 'var(--color-text-secondary)' };
const filterControlDivider: CSSProperties = { width: 1, minHeight: 26, alignSelf: 'stretch', background: 'var(--color-border-light)' };
const yearControls: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5 };
const yearField: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4 };
const yearFieldLabel: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-meta)', fontWeight: 800 };
const selectStyle: CSSProperties = { height: 32, borderRadius: 6, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, padding: '0 8px', outline: 'none', fontFamily: 'var(--font-body)' };
const dropdownButton: CSSProperties = { width: '100%', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderRadius: 6, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', padding: '0 8px', fontSize: 'var(--erp-text-dense)', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' };
const dropdownButtonOpen: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'var(--color-surface-0)', color: 'var(--color-brand-600)' };
const dropdownChevron: CSSProperties = { flex: '0 0 auto', transition: 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1)' };
const filterPopoverSurface: CSSProperties = { position: 'absolute', top: 38, zIndex: 60, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 7, boxShadow: '0 14px 32px color-mix(in srgb, var(--color-surface-900) 18%, transparent)', padding: 6 };
const monthMenu: CSSProperties = { ...filterPopoverSurface, left: 0, width: 'min(310px, calc(100vw - 48px))', padding: 8 };
const quickMonthGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginBottom: 7 };
const monthGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 };
const monthOption: CSSProperties = { height: 26, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-meta)', fontWeight: 900, cursor: 'pointer' };
const optionActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-0))', color: 'var(--color-brand-600)' };
const chipRail: CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', paddingBottom: 1 };
const chipButton: CSSProperties = { height: 30, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 10px', borderRadius: 6, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'var(--font-body)' };
const chipActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-0))', color: 'var(--color-brand-600)' };
const orderPanel: CSSProperties = { width: '100%', minHeight: 0, flex: '1 1 0' };
const panelTitle: CSSProperties = { margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-control)', fontWeight: 900 };
const panelHeaderRight: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 };
const panelMeta: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900 };
const tableScroll: CSSProperties = { width: '100%', minHeight: 0 };
const td: CSSProperties = { height: 46, padding: '6px 8px', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const tdStrong: CSSProperties = { ...td, fontWeight: 900 };
const tdCode: CSSProperties = { ...tdStrong, fontVariantNumeric: 'tabular-nums' };
const tdRight: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const tdCenter: CSSProperties = { ...td, textAlign: 'center' };
const lateDateCell: CSSProperties = { color: 'var(--color-danger-500)', fontWeight: 900 };
const subText: CSSProperties = { display: 'block', color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-meta)', fontWeight: 750, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const linkButton: CSSProperties = { background: 'none', border: 'none', color: 'var(--color-brand-600)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' };
const paginationBar: CSSProperties = { minHeight: 38, padding: '6px 10px' };
const paginationText: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 850 };
const paginationButtons: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6 };
const pageButton: CSSProperties = { width: 28, height: 28, display: 'inline-grid', placeItems: 'center', borderRadius: 6, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', cursor: 'pointer' };
const pageButtonDisabled: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const pageText: CSSProperties = { color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, minWidth: 82, textAlign: 'center' };
