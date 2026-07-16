import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, ChevronDown, Filter, Maximize2, RefreshCw, Search, Trophy } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import {
  fetchSalesCustomerGroups,
  fetchSalesMonthlyAnalytics,
  fetchSalesOrders,
  type SalesCustomerGroupPoint,
  type SalesDateView,
  type SalesMonthlyPoint,
  type SalesOrderRow,
} from '../services/customerSalesAPI';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';

const REPORT_YEAR = '2026';
const PREVIOUS_YEAR = '2025';
const REFRESH_MS = 60_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ label: label + ' ' + REPORT_YEAR, value: String(index + 1) }));

type PeriodMode = 'ytd' | 'month' | 'full';

type CustomerMatrixRow = {
  customerCode: string;
  customerName: string;
  groupLabel: string;
  amount: number;
  dueAmount: number;
  qty: number;
  shippedQty: number;
  orderCount: number;
  target: number;
  completion: number;
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

function groupLabel(code: string) {
  const groupId = getCustomerGroupId(code);
  return ALL_GROUPS.find(group => group.id === groupId)?.label || groupId;
}

function matrixRows(rows: SalesCustomerGroupPoint[], months: string[]) {
  const map = new Map<string, CustomerMatrixRow>();
  rows.forEach(row => {
    const current = map.get(row.customerCode) || {
      customerCode: row.customerCode,
      customerName: row.customerName || row.customerCode,
      groupLabel: groupLabel(row.customerCode),
      amount: 0,
      dueAmount: 0,
      qty: 0,
      shippedQty: 0,
      orderCount: 0,
      target: 0,
      completion: 0,
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
    map.set(row.customerCode, current);
  });

  return Array.from(map.values()).map(row => {
    const gapQty = Math.max(row.qty - row.shippedQty, 0);
    const dueAmount = row.qty > 0 ? row.amount * (gapQty / row.qty) : 0;
    const target = Math.max(row.amount / 0.84, 1);
    const completion = Math.min((row.amount / target) * 100, 100);
    const shippedRatio = row.qty > 0 ? Math.min((row.shippedQty / row.qty) * 100, 100) : 0;
    return {
      ...row,
      dueAmount,
      target,
      completion,
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
  const [dateView, setDateView] = useState<SalesDateView>('ship');
  const [comparePrevious, setComparePrevious] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');

  const activeMonths = useMemo(() => {
    if (periodMode === 'full') return monthRange(1, 12);
    if (periodMode === 'month') return [String(currentMonthNumber())];
    return monthRange(startMonth, endMonth);
  }, [periodMode, startMonth, endMonth]);

  // Sales Matrix pulls the selected 2026 period and refreshes every minute.
  const loadData = async (silent = false) => {
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
  };

  useEffect(() => {
    loadData();
    const timer = window.setInterval(() => loadData(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [activeMonths.join(','), dateView]);

  const todayLabel = todayKey();
  const rows = useMemo(() => matrixRows(data.groups, activeMonths), [data.groups, activeMonths]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row => (row.customerCode + ' ' + row.customerName + ' ' + row.groupLabel).toLowerCase().includes(term));
  }, [rows, search]);
  const summary = useMemo(() => monthlySummary(data.monthly, activeMonths), [data.monthly, activeMonths]);
  const todayOrders = useMemo(() => data.currentMonthOrders.filter(row => asDateKey(row.ordDate) === todayLabel), [data.currentMonthOrders, todayLabel]);
  const todayAmount = todayOrders.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const periodLabel = periodMode === 'month' ? MONTHS[currentMonthNumber() - 1] + ' ' + REPORT_YEAR : MONTHS[Number(activeMonths[0]) - 1] + ' - ' + MONTHS[Number(activeMonths[activeMonths.length - 1]) - 1] + ' ' + REPORT_YEAR;

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'SALES DASHBOARD' }]} hideSearch />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={workspace}>
        <main style={pageShell}>
          <section style={commandBar}>
            <div style={leftTools}>
              <button type="button" onClick={() => navigate(-1)} style={toolButton}><ArrowLeft size={14} /> Back</button>
              <button type="button" onClick={() => navigate('/dashboard/sales-customer-groups?years=' + REPORT_YEAR + '&months=' + activeMonths.join(',') + '&metric=amount')} style={activeToolButton}><BarChart3 size={14} /> Analytics</button>
              <label style={searchBox}>
                <Search size={14} />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Sales Name..." style={searchInput} />
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
                    <button type="button" onClick={() => setDateView('order')} style={dateView === 'order' ? selectedToggle : smallToggle}>Order Basis</button>
                    <button type="button" onClick={() => setDateView('ship')} style={dateView === 'ship' ? selectedToggle : smallToggle}>Due Ship-To Basis</button>
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

          <section style={matrixGrid}>
            {loading && Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}
            {!loading && filteredRows.length === 0 && <div style={emptyPanel}>No sales data found for this period.</div>}
            {!loading && filteredRows.slice(0, 12).map((row, index) => <PerformanceCard key={row.customerCode} row={row} rank={index + 1} />)}
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

function PerformanceCard({ row, rank }: { row: CustomerMatrixRow; rank: number }) {
  const avatarColor = avatarPalette[(rank - 1) % avatarPalette.length];
  return (
    <article style={matrixCard}>
      <header style={cardHeader}>
        <div style={personBlock}>
          <div style={{ ...avatar, background: avatarColor }}>{row.customerName.slice(0, 1).toUpperCase()}</div>
          <div style={personText}>
            <strong>{row.customerName}</strong>
            <span>{row.customerCode} · {row.groupLabel}</span>
          </div>
        </div>
        <span style={targetBadge}>{fmtCompactMoney(row.target)} | {Math.round(row.completion)}% Target</span>
      </header>

      <div style={metricGrid}>
        <MiniMetric label="KPI Target" value={fmtCompactMoney(row.target)} />
        <MiniMetric label="Order Amount" value={fmtCompactMoney(row.amount)} />
        <MiniMetric label="Due Amount" value={fmtCompactMoney(row.dueAmount)} />
      </div>

      <BarLabel label="KPI Completion Progress Bar" value={Math.round(row.completion) + '%'} />
      <div style={progressTrack}><div style={{ ...progressFill, width: row.completion + '%' }} /></div>

      <BarLabel label="Shipped vs. Due Proportion Bar" value="" />
      <div style={splitTrack}>
        <div style={{ ...splitDone, width: row.shippedRatio + '%' }} />
        <div style={{ ...splitDue, width: row.dueRatio + '%' }} />
      </div>
      <div style={splitLegend}><span><i style={doneDot} />{Math.round(row.shippedRatio)}%</span><span><i style={dueDot} />{Math.round(row.dueRatio)}%</span></div>

      <div style={monthHeader}>1-12 Month Due Ship-To Qty (Pcs)<Maximize2 size={12} /></div>
      <div style={monthTiles}>
        {row.months.map(month => (
          <button type="button" key={month.month} style={monthTile} title={fmtMoney(month.amount)}>
            <span>{month.label}</span>
            <strong>{fmtCompactQty(month.qty)}</strong>
            <Maximize2 size={10} />
          </button>
        ))}
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div style={miniMetric}><span>{label}</span><strong>{value}</strong></div>;
}

function BarLabel({ label, value }: { label: string; value: string }) {
  return <div style={barLabel}><span>{label}</span><strong>{value}</strong></div>;
}

function SkeletonCard() {
  return <div style={skeletonCard}><div style={skeletonLine} /><div style={skeletonMetrics} /><div style={skeletonBar} /><div style={skeletonTiles} /></div>;
}

const workspace: CSSProperties = { background: 'var(--color-surface-1)' };
const pageShell: CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 10, width: '100%' };
const commandBar: CSSProperties = { position: 'sticky', top: 0, zIndex: 20, minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 10px', border: '1px solid var(--color-border-light)', borderRadius: 8, background: 'var(--color-surface-0)' };
const leftTools: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 };
const rightTools: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const toolButton: CSSProperties = { height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border-light)', borderRadius: 7, background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', padding: '0 10px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' };
const activeToolButton: CSSProperties = { ...toolButton, color: 'var(--color-brand-500)', borderColor: 'var(--color-brand-500)', background: 'color-mix(in oklch, var(--color-brand-500) 12%, var(--color-surface-0))' };
const periodButton: CSSProperties = { ...toolButton, minWidth: 210, justifyContent: 'space-between' };
const searchBox: CSSProperties = { height: 30, maxWidth: 420, minWidth: 220, flex: '0 1 420px', display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--color-border-light)', borderRadius: 7, background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', padding: '0 10px' };
const searchInput: CSSProperties = { flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: 'var(--color-text-primary)', fontSize: '0.76rem', fontWeight: 700 };
const filterPanel: CSSProperties = { position: 'absolute', right: 10, top: 42, width: 'min(520px, calc(100vw - 36px))', display: 'grid', gridTemplateColumns: '112px 1fr', border: '1px solid var(--color-border-default)', borderRadius: 8, background: 'var(--color-surface-0)', boxShadow: '0 16px 42px rgba(0,0,0,0.22)', overflow: 'hidden' };
const periodList: CSSProperties = { display: 'flex', flexDirection: 'column', padding: 8, gap: 4, borderRight: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)' };
const periodOption: CSSProperties = { height: 30, textAlign: 'left', border: 0, borderRadius: 6, background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '0.72rem', fontWeight: 800, padding: '0 9px', cursor: 'pointer' };
const activePeriodOption: CSSProperties = { ...periodOption, background: 'color-mix(in oklch, var(--color-brand-500) 14%, var(--color-surface-0))', color: 'var(--color-text-primary)' };
const filterBody: CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 10 };
const filterTitle: CSSProperties = { fontSize: '0.78rem', fontWeight: 850, color: 'var(--color-text-primary)' };
const toggleLine: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const smallToggle: CSSProperties = { height: 28, border: '1px solid var(--color-border-light)', borderRadius: 999, background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', padding: '0 10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' };
const selectedToggle: CSSProperties = { ...smallToggle, background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)', borderColor: 'var(--color-brand-500)' };
const fieldGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))', gap: 8 };
const fieldLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--color-text-secondary)', fontSize: '0.7rem', fontWeight: 800 };
const selectControl: CSSProperties = { height: 32, border: '1px solid var(--color-border-light)', borderRadius: 7, background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', padding: '0 9px', fontSize: '0.74rem', fontWeight: 800 };
const compareLine: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, color: 'var(--color-text-secondary)', fontSize: '0.72rem', fontWeight: 800 };
const filterFooter: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-light)' };
const applyButton: CSSProperties = { ...toolButton, background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)', borderColor: 'var(--color-brand-500)' };
const titleRow: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '2px 2px 0' };
const pageTitle: CSSProperties = { margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.2, fontWeight: 850, letterSpacing: 0 };
const summaryStrip: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const metricPill: CSSProperties = { height: 32, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--color-border-light)', borderRadius: 8, background: 'var(--color-surface-0)', padding: '0 10px', color: 'var(--color-text-primary)' };
const matrixGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 12, alignItems: 'start' };
const matrixCard: CSSProperties = { minWidth: 0, border: '1px solid var(--color-border-light)', borderRadius: 8, background: 'var(--color-surface-0)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 4px 16px -8px rgba(0,0,0,0.22)' };
const cardHeader: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
const personBlock: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 };
const avatar: CSSProperties = { width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', color: 'var(--color-text-inverse)', fontSize: '0.72rem', fontWeight: 900, flex: '0 0 auto' };
const personText: CSSProperties = { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 850 };
const targetBadge: CSSProperties = { flex: '0 0 auto', borderRadius: 999, background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', padding: '4px 7px', fontSize: '0.66rem', fontWeight: 850, border: '1px solid var(--color-border-light)' };
const metricGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 };
const miniMetric: CSSProperties = { minHeight: 40, borderRadius: 6, background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 2 };
const barLabel: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--color-text-secondary)', fontSize: '0.67rem', fontWeight: 800 };
const progressTrack: CSSProperties = { height: 6, borderRadius: 999, background: 'var(--color-surface-2)', overflow: 'hidden' };
const progressFill: CSSProperties = { height: '100%', borderRadius: 999, background: 'var(--color-brand-500)' };
const splitTrack: CSSProperties = { height: 12, display: 'flex', borderRadius: 999, background: 'var(--color-surface-2)', overflow: 'hidden' };
const splitDone: CSSProperties = { height: '100%', background: 'var(--color-success-500)' };
const splitDue: CSSProperties = { height: '100%', background: 'var(--color-danger-500)' };
const splitLegend: CSSProperties = { display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '0.66rem', fontWeight: 800 };
const doneDot: CSSProperties = { display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: 'var(--color-success-500)', marginRight: 4 };
const dueDot: CSSProperties = { ...doneDot, background: 'var(--color-danger-500)' };
const monthHeader: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-primary)', fontSize: '0.69rem', fontWeight: 850, paddingTop: 2 };
const monthTiles: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 5 };
const monthTile: CSSProperties = { position: 'relative', minHeight: 40, border: '1px solid var(--color-border-light)', borderRadius: 6, background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', padding: '5px 6px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, fontSize: '0.66rem', fontWeight: 800, cursor: 'pointer' };
const errorBox: CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid color-mix(in oklch, var(--color-danger-500) 35%, var(--color-border-light))', color: 'var(--color-danger-500)', background: 'color-mix(in oklch, var(--color-danger-500) 9%, var(--color-surface-0))', fontWeight: 780, fontSize: '0.8rem' };
const emptyPanel: CSSProperties = { gridColumn: '1 / -1', minHeight: 160, display: 'grid', placeItems: 'center', border: '1px dashed var(--color-border-light)', borderRadius: 8, color: 'var(--color-text-tertiary)', background: 'var(--color-surface-0)', fontWeight: 800 };
const skeletonCard: CSSProperties = { ...matrixCard, minHeight: 260 };
const skeletonLine: CSSProperties = { height: 30, borderRadius: 7, background: 'var(--color-surface-1)' };
const skeletonMetrics: CSSProperties = { height: 44, borderRadius: 7, background: 'var(--color-surface-1)' };
const skeletonBar: CSSProperties = { height: 44, borderRadius: 7, background: 'var(--color-surface-1)' };
const skeletonTiles: CSSProperties = { height: 90, borderRadius: 7, background: 'var(--color-surface-1)' };
const avatarPalette = ['var(--color-brand-500)', 'var(--color-success-500)', 'var(--color-chart-3)', 'var(--color-warning-500)', 'var(--color-accent-500)', 'var(--color-chart-4)'];
