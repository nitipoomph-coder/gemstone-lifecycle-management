import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, ChevronDown, Filter, RefreshCw, Search, Trophy } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import '../components/sales/SalesDenseTable.css';
import {
  fetchSalesCustomerGroups,
  fetchSalesMonthlyAnalytics,
  fetchSalesOrders,
  type SalesCustomerGroupPoint,
  type SalesDateView,
  type SalesMonthlyPoint,
  type SalesOrderRow,
} from '../services/orderVolumeSummaryAPI';

const REPORT_YEAR = '2026';
const PREVIOUS_YEAR = '2025';
const REFRESH_MS = 60_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ label: label + ' ' + REPORT_YEAR, value: String(index + 1) }));
const DATE_BASIS_OPTIONS: { value: SalesDateView; label: string }[] = [
  { value: 'orddate', label: 'OrdDate' },
  { value: 'duedate', label: 'DueDate' },
  { value: 'custdate', label: 'CustDate' },
  { value: 'ordmonth', label: 'OrdMonth' },
  { value: 'shipmonth', label: 'ShipMonth' },
];

type PeriodMode = 'ytd' | 'month' | 'full';

type SalesMatrixRow = {
  salesName: string;
  amount: number;
  dueAmount: number;
  qty: number;
  shippedQty: number;
  orderCount: number;
  shippedRatio: number;
  dueRatio: number;
  months: MonthMetric[];
};

type MonthMetric = {
  month: number;
  label: string;
  qty: number;
  amount: number;
};

type DashboardData = {
  groups: SalesCustomerGroupPoint[];
  monthly: SalesMonthlyPoint[];
  currentMonthOrders: SalesOrderRow[];
};

const today = () => new Date();
const currentMonthNumber = () => today().getMonth() + 1;
const monthRange = (start: number, end: number) => {
  const first = Math.min(start, end);
  const last = Math.max(start, end);
  return Array.from({ length: last - first + 1 }, (_, index) => String(first + index));
};
const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};
const todayKey = () => dateKey(today());
const asDateKey = (value?: string | null) => value ? dateKey(new Date(value)) : '';
const fmtMoney = (value: number) => '$' + Math.round(value || 0).toLocaleString();
const fmtCompactMoney = (value: number) => {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000) return '$' + (value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M';
  if (abs >= 1_000) return '$' + (value / 1_000).toFixed(abs >= 100_000 ? 0 : 1) + 'K';
  return fmtMoney(value);
};
const fmtQty = (value: number) => Math.round(value || 0).toLocaleString();
const fmtCompactQty = (value: number) => {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000) return (value / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + 'k';
  return fmtQty(value);
};
const fmtTime = (date: Date | null) => date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

function matrixRows(rows: SalesCustomerGroupPoint[], months: string[]) {
  const map = new Map<string, SalesMatrixRow>();
  rows.forEach(row => {
    const salesName = row.salesName || row.customerName || row.customerCode || 'Unassigned';
    const current = map.get(salesName) || {
      salesName,
      amount: 0,
      dueAmount: 0,
      qty: 0,
      shippedQty: 0,
      orderCount: 0,
      shippedRatio: 0,
      dueRatio: 0,
      months: months.map(month => ({ month: Number(month), label: MONTHS[Number(month) - 1], qty: 0, amount: 0 })),
    };

    const monthBucket = current.months.find(month => month.month === Number(row.month));
    if (monthBucket) {
      monthBucket.qty += Number(row.qty || 0);
      monthBucket.amount += Number(row.amount || 0);
    }

    current.amount += Number(row.amount || 0);
    current.qty += Number(row.qty || 0);
    current.shippedQty += Number(row.shippedQty || 0);
    current.orderCount += Number(row.orderCount || 0);
    map.set(salesName, current);
  });

  return Array.from(map.values()).map(row => {
    const gapQty = Math.max(row.qty - row.shippedQty, 0);
    const dueAmount = row.qty > 0 ? row.amount * (gapQty / row.qty) : 0;
    const shippedRatio = row.qty > 0 ? Math.min((row.shippedQty / row.qty) * 100, 100) : 0;
    return {
      ...row,
      dueAmount,
      shippedRatio,
      dueRatio: Math.max(100 - shippedRatio, 0),
    };
  }).sort((a, b) => b.amount - a.amount);
}

function monthlySummary(rows: SalesMonthlyPoint[], months: string[]) {
  const monthSet = new Set(months.map(Number));
  return rows.filter(row => monthSet.has(Number(row.month))).reduce((acc, row) => {
    acc.amount += Number(row.amount || 0);
    acc.qty += Number(row.qty || 0);
    acc.shippedQty += Number(row.shippedQty || 0);
    acc.orders += Number(row.orderCount || 0);
    return acc;
  }, { amount: 0, qty: 0, shippedQty: 0, orders: 0 });
}

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({ groups: [], monthly: [], currentMonthOrders: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('ytd');
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(currentMonthNumber());
  const [dateView, setDateView] = useState<SalesDateView>('shipmonth');
  const [comparePrevious, setComparePrevious] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const activeMonths = useMemo(() => {
    if (periodMode === 'full') return monthRange(1, 12);
    if (periodMode === 'month') return [String(currentMonthNumber())];
    return monthRange(startMonth, endMonth);
  }, [periodMode, startMonth, endMonth]);

  // Sales Matrix pulls the selected 2026 period and refreshes every minute.
  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [groups, monthly, currentMonthOrders] = await Promise.all([
        fetchSalesCustomerGroups({ years: [REPORT_YEAR], months: activeMonths, dateView }),
        fetchSalesMonthlyAnalytics({ years: [REPORT_YEAR], months: activeMonths, dateView }),
        fetchSalesOrders({ years: [REPORT_YEAR], months: [String(currentMonthNumber())], dateView }),
      ]);
      setData({ groups, monthly, currentMonthOrders });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales matrix');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMonths, dateView]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadData(); }, 0);
    const timer = window.setInterval(() => { void loadData(true); }, REFRESH_MS);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadData]);

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase();
    setSearchDraft(nextSearch);
    setSearch(nextSearch);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') applySearch();
    if (event.key === 'Escape') setSearchDraft(search.toUpperCase());
  };
  const todayLabel = todayKey();
  const rows = useMemo(() => matrixRows(data.groups, activeMonths), [data.groups, activeMonths]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row => row.salesName.toLowerCase().includes(term));
  }, [rows, search]);
  const summary = useMemo(() => monthlySummary(data.monthly, activeMonths), [data.monthly, activeMonths]);
  const todayOrders = useMemo(() => data.currentMonthOrders.filter(row => asDateKey(row.ordDate) === todayLabel), [data.currentMonthOrders, todayLabel]);
  const todayAmount = todayOrders.reduce((sum, row) => sum + Number(row.itemAmnt || 0), 0);
  const periodLabel = periodMode === 'month' ? MONTHS[currentMonthNumber() - 1] + ' ' + REPORT_YEAR : MONTHS[Number(activeMonths[0]) - 1] + ' - ' + MONTHS[Number(activeMonths[activeMonths.length - 1]) - 1] + ' ' + REPORT_YEAR;

  return (
    <>
      <PageHeader breadcrumb={BREADCRUMBS.SALES_DASHBOARD} contentLayout="workspace" />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={workspace}>
        <main style={pageShell}>
          <section style={commandBar}>
            <div style={leftTools}>
              <button type="button" onClick={() => navigate(-1)} style={toolButton}><ArrowLeft size={14} /> Back</button>
              <button type="button" onClick={() => navigate('/dashboard/sales-customer-groups?years=' + REPORT_YEAR + '&months=' + activeMonths.join(',') + '&metric=amount')} style={activeToolButton}><BarChart3 size={14} /> Customer Trends</button>
              <label style={searchBox}>
                <Search size={14} />
                <input value={searchDraft} onChange={event => setSearchDraft(event.target.value.toUpperCase())} onKeyDown={handleSearchKeyDown} placeholder="Search Sales Name..." style={searchInput} />
              </label>
            </div>
            <div style={rightTools}>
              <button type="button" onClick={() => setFilterOpen(open => !open)} style={periodButton}>Period: <strong>{periodMode.toUpperCase()}</strong> <span>{periodLabel}</span> <ChevronDown size={14} /></button>
              <button type="button" onClick={() => setFilterOpen(open => !open)} style={toolButton}><Filter size={14} /> Filters</button>
              <button type="button" onClick={() => loadData(true)} disabled={loading || refreshing} style={toolButton}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {fmtTime(lastUpdated)}</button>
            </div>
            {filterOpen && (
              <div style={filterPanel}>
                <div style={periodList}>
                  <PeriodOption active={periodMode === 'ytd'} label="YTD" onClick={() => setPeriodMode('ytd')} />
                  <PeriodOption active={periodMode === 'month'} label="This Month" onClick={() => setPeriodMode('month')} />
                  <PeriodOption active={periodMode === 'full'} label="Full Year" onClick={() => setPeriodMode('full')} />
                </div>
                <div style={filterBody}>
                  <div style={filterTitle}>Define Period Basis</div>
                  <div style={toggleLine}>
                    {DATE_BASIS_OPTIONS.map(option => (
                      <button key={option.value} type="button" onClick={() => setDateView(option.value)} style={dateView === option.value ? selectedToggle : smallToggle}>{option.label}</button>
                    ))}
                  </div>
                  <div style={fieldGrid}>
                    <label style={fieldLabel}>Start Month:<select value={startMonth} onChange={event => setStartMonth(Number(event.target.value))} style={selectControl}>{MONTH_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label style={fieldLabel}>End Month:<select value={endMonth} onChange={event => setEndMonth(Number(event.target.value))} style={selectControl}>{MONTH_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label style={fieldLabel}>Year:<select value={REPORT_YEAR} disabled style={selectControl}><option>{REPORT_YEAR}</option></select></label>
                  </div>
                  <label style={compareLine}><input type="checkbox" checked={comparePrevious} onChange={event => setComparePrevious(event.target.checked)} /> Compare with Previous Year <span>{PREVIOUS_YEAR}</span></label>
                  <div style={filterFooter}>
                    <button type="button" onClick={() => setFilterOpen(false)} style={toolButton}>Cancel</button>
                    <button type="button" onClick={() => setFilterOpen(false)} style={applyButton}>Apply</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section style={titleRow}>
            <h1 style={pageTitle}><Trophy size={20} /> Sales Performance Matrix</h1>
            <div style={summaryStrip}>
              <MetricPill label="Period Sales" value={fmtCompactMoney(summary.amount)} />
              <MetricPill label="Orders" value={fmtQty(summary.orders)} />
              <MetricPill label="Today" value={fmtCompactMoney(todayAmount)} />
              <MetricPill label="Rows" value={fmtQty(filteredRows.length)} />
            </div>
          </section>

          {error && <div style={errorBox}>{error}</div>}

          <section className={['sales-dense-panel', searchDraft.trim() ? 'sales-dense-panel--searching' : ''].filter(Boolean).join(' ')} style={{ minHeight: 520 }}>
            <div className="sales-dense-panel__header">
              <div className="sales-dense-panel__title">Sales Performance Table</div>
              <div className="sales-dense-panel__meta">{loading ? 'Loading...' : `${fmtQty(filteredRows.length)} rows`}</div>
            </div>
            <div className="content-scrollbar sales-dense-scroll">
              <table className="sales-dense-table sales-dense-table--sticky-first" style={{ minWidth: 760 + activeMonths.length * 92 }}>
                <thead>
                  <tr>
                    <th style={{ width: 170 }}>Sales Name</th>
                    <th className="sales-dense-table__number" style={{ width: 74 }}>Orders</th>
                    <th className="sales-dense-table__number" style={{ width: 92 }}>Ord Qty</th>
                    <th className="sales-dense-table__number" style={{ width: 96 }}>Shipped</th>
                    <th className="sales-dense-table__number" style={{ width: 82 }}>Ship %</th>
                    <th className="sales-dense-table__number" style={{ width: 106 }}>Due Amt</th>
                    <th className="sales-dense-table__number" style={{ width: 106 }}>Amount</th>
                    {activeMonths.map(month => <th key={month} className="sales-dense-table__number" style={{ width: 92 }}>{MONTHS[Number(month) - 1]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: 12 }, (_, index) => <SalesMatrixSkeletonRow key={index} monthCount={activeMonths.length} />)}
                  {!loading && filteredRows.length === 0 && <tr><td className="sales-dense-empty" colSpan={7 + activeMonths.length}>No sales data found for this period.</td></tr>}
                  {!loading && filteredRows.map((row, index) => <SalesMatrixTableRow key={row.salesName} row={row} index={index} />)}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function PeriodOption({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={active ? activePeriodOption : periodOption}>{label}</button>;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return <span style={metricPill}><small>{label}</small><strong>{value}</strong></span>;
}

function SalesMatrixTableRow({ row, index }: { row: SalesMatrixRow; index: number }) {
  const shippedPct = Math.round(row.shippedRatio || 0);
  return (
    <tr style={{ animationDelay: `${Math.min(index * 12, 180)}ms` }}>
      <td>
        <span className="sales-dense-table__code">{row.salesName}</span>
        <span className="sales-dense-table__sub">{fmtCompactMoney(row.amount)} / {fmtCompactQty(row.qty)} pcs</span>
      </td>
      <td className="sales-dense-table__number">{fmtQty(row.orderCount)}</td>
      <td className="sales-dense-table__number">{fmtQty(row.qty)}</td>
      <td className="sales-dense-table__number">{fmtQty(row.shippedQty)}</td>
      <td className="sales-dense-table__number">
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          <span className="sales-dense-progress"><span style={{ width: `${shippedPct}%` }} /></span>
          {shippedPct}%
        </span>
      </td>
      <td className="sales-dense-table__number">{fmtCompactMoney(row.dueAmount)}</td>
      <td className="sales-dense-table__number"><strong>{fmtCompactMoney(row.amount)}</strong></td>
      {row.months.map(month => (
        <td key={month.month} className="sales-dense-table__number" title={fmtMoney(month.amount)}>
          {fmtCompactQty(month.qty)}
        </td>
      ))}
    </tr>
  );
}

function SalesMatrixSkeletonRow({ monthCount }: { monthCount: number }) {
  const widths = [70, 44, 52, 56, 62, 58, 66, 48, 72, 54, 60, 46];
  return (
    <tr>
      {Array.from({ length: 7 + monthCount }, (_, index) => (
        <td key={index}>
          <span className="sales-dense-skeleton" style={{ width: `${widths[index % widths.length]}%` }} />
        </td>
      ))}
    </tr>
  );
}
const workspace: CSSProperties = { background: 'var(--color-surface-1)' };
const pageShell: CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 10, width: '100%' };
const commandBar: CSSProperties = { position: 'sticky', top: 0, zIndex: 20, minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 10px', border: '1px solid var(--color-border-light)', borderRadius: 8, background: 'var(--color-surface-0)' };
const leftTools: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 };
const rightTools: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const toolButton: CSSProperties = { height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border-light)', borderRadius: 7, background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', padding: '0 10px', fontSize: 'var(--erp-text-control)', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' };
const activeToolButton: CSSProperties = { ...toolButton, color: 'var(--color-brand-500)', borderColor: 'var(--color-brand-500)', background: 'color-mix(in oklch, var(--color-brand-500) 12%, var(--color-surface-0))' };
const periodButton: CSSProperties = { ...toolButton, minWidth: 210, justifyContent: 'space-between' };
const searchBox: CSSProperties = { height: 30, maxWidth: 420, minWidth: 220, flex: '0 1 420px', display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--color-border-light)', borderRadius: 7, background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', padding: '0 10px' };
const searchInput: CSSProperties = { flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-control)', fontWeight: 700 };
const filterPanel: CSSProperties = { position: 'absolute', right: 10, top: 42, width: 'min(520px, calc(100vw - 36px))', display: 'grid', gridTemplateColumns: '112px 1fr', border: '1px solid var(--color-border-default)', borderRadius: 8, background: 'var(--color-surface-0)', boxShadow: 'var(--shadow-dropdown)', overflow: 'hidden' };
const periodList: CSSProperties = { display: 'flex', flexDirection: 'column', padding: 8, gap: 4, borderRight: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)' };
const periodOption: CSSProperties = { height: 30, textAlign: 'left', border: 0, borderRadius: 6, background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-control)', fontWeight: 800, padding: '0 9px', cursor: 'pointer' };
const activePeriodOption: CSSProperties = { ...periodOption, background: 'color-mix(in oklch, var(--color-brand-500) 14%, var(--color-surface-0))', color: 'var(--color-text-primary)' };
const filterBody: CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 10 };
const filterTitle: CSSProperties = { fontSize: 'var(--erp-text-body)', fontWeight: 850, color: 'var(--color-text-primary)' };
const toggleLine: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 };
const smallToggle: CSSProperties = { height: 28, border: '1px solid var(--color-border-light)', borderRadius: 999, background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', padding: '0 10px', fontSize: 'var(--erp-text-dense)', fontWeight: 800, cursor: 'pointer' };
const selectedToggle: CSSProperties = { ...smallToggle, background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)', borderColor: 'var(--color-brand-500)' };
const fieldGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))', gap: 8 };
const fieldLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-dense)', fontWeight: 800 };
const selectControl: CSSProperties = { height: 32, border: '1px solid var(--color-border-light)', borderRadius: 7, background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', padding: '0 9px', fontSize: 'var(--erp-text-control)', fontWeight: 800 };
const compareLine: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-control)', fontWeight: 800 };
const filterFooter: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-light)' };
const applyButton: CSSProperties = { ...toolButton, background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)', borderColor: 'var(--color-brand-500)' };
const titleRow: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '2px 2px 0' };
const pageTitle: CSSProperties = { margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-section)', lineHeight: 1.2, fontWeight: 850, letterSpacing: 0 };
const summaryStrip: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const metricPill: CSSProperties = { height: 32, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--color-border-light)', borderRadius: 8, background: 'var(--color-surface-0)', padding: '0 10px', color: 'var(--color-text-primary)' };
const errorBox: CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid color-mix(in oklch, var(--color-danger-500) 35%, var(--color-border-light))', color: 'var(--color-danger-500)', background: 'color-mix(in oklch, var(--color-danger-500) 9%, var(--color-surface-0))', fontWeight: 780, fontSize: 'var(--erp-text-body)' };
