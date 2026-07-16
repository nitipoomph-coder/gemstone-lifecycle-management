import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, DollarSign, Hash, RefreshCw, ShoppingBag, TrendingUp } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import {
  fetchSalesCustomerGroups,
  fetchSalesMonthlyAnalytics,
  fetchSalesOrders,
  fetchTopItems,
  type SalesCustomerGroupPoint,
  type SalesMonthlyPoint,
  type SalesOrderRow,
  type TopItemRow,
} from '../services/customerSalesAPI';
import { getCustomerGroupId, ALL_GROUPS } from '../config/customerGroups';

const REPORT_YEAR = '2026';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REFRESH_MS = 60_000;

type CustomerRow = {
  customerCode: string;
  customerName: string;
  groupLabel: string;
  amount: number;
  qty: number;
  shippedQty: number;
  orderCount: number;
};

type DashboardData = {
  groups: SalesCustomerGroupPoint[];
  monthly: SalesMonthlyPoint[];
  topItems: TopItemRow[];
  currentMonthOrders: SalesOrderRow[];
};

const today = () => new Date();
const currentMonthNumber = () => today().getMonth() + 1;
const currentMonthValues = () => Array.from({ length: currentMonthNumber() }, (_, index) => String(index + 1));
const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const todayKey = () => dateKey(today());
const fmtAmount = (value: number) => '$' + Math.round(value || 0).toLocaleString();
const fmtQty = (value: number) => Math.round(value || 0).toLocaleString();
const fmtPct = (value: number) => Number.isFinite(value) ? value.toFixed(1) + '%' : '-';
const fmtTime = (date: Date | null) => date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
const asDateKey = (value?: string | null) => value ? dateKey(new Date(value)) : '';

function groupLabel(code: string) {
  const groupId = getCustomerGroupId(code);
  return ALL_GROUPS.find(group => group.id === groupId)?.label || groupId;
}

function byMonth(rows: SalesMonthlyPoint[]) {
  const map = new Map<number, SalesMonthlyPoint>();
  rows.forEach(row => map.set(Number(row.month), row));
  return Array.from({ length: currentMonthNumber() }, (_, index) => {
    const month = index + 1;
    const row = map.get(month);
    return {
      month,
      label: MONTHS[index],
      amount: Number(row?.amount || 0),
      qty: Number(row?.qty || 0),
      shippedQty: Number(row?.shippedQty || 0),
      orders: Number(row?.orderCount || 0),
    };
  });
}

function customerSummary(rows: SalesCustomerGroupPoint[]) {
  const map = new Map<string, CustomerRow>();
  rows.forEach(row => {
    const key = row.customerCode;
    const current = map.get(key) || {
      customerCode: row.customerCode,
      customerName: row.customerName || row.customerCode,
      groupLabel: groupLabel(row.customerCode),
      amount: 0,
      qty: 0,
      shippedQty: 0,
      orderCount: 0,
    };
    current.amount += Number(row.amount || 0);
    current.qty += Number(row.qty || 0);
    current.shippedQty += Number(row.shippedQty || 0);
    current.orderCount += Number(row.orderCount || 0);
    map.set(key, current);
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({ groups: [], monthly: [], topItems: [], currentMonthOrders: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const periodMonths = useMemo(() => currentMonthValues(), []);
  const todayLabel = todayKey();

  // Pulls 2026 YTD plus current-month rows for the live Today panel.
  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [groups, monthly, topItems, currentMonthOrders] = await Promise.all([
        fetchSalesCustomerGroups({ years: [REPORT_YEAR], months: periodMonths }),
        fetchSalesMonthlyAnalytics({ years: [REPORT_YEAR], months: periodMonths }),
        fetchTopItems({ years: [REPORT_YEAR], months: periodMonths, metric: 'amount', limit: 12 }),
        fetchSalesOrders({ years: [REPORT_YEAR], months: [String(currentMonthNumber())] }),
      ]);
      setData({ groups, monthly, topItems, currentMonthOrders });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = window.setInterval(() => loadData(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const monthlyRows = useMemo(() => byMonth(data.monthly), [data.monthly]);
  const customers = useMemo(() => customerSummary(data.groups), [data.groups]);
  const topCustomers = customers.slice(0, 8);
  const todayOrders = useMemo(() => data.currentMonthOrders.filter(row => asDateKey(row.ordDate) === todayLabel), [data.currentMonthOrders, todayLabel]);

  const totals = useMemo(() => {
    const amount = data.groups.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const qty = data.groups.reduce((sum, row) => sum + Number(row.qty || 0), 0);
    const shippedQty = data.groups.reduce((sum, row) => sum + Number(row.shippedQty || 0), 0);
    const orders = data.groups.reduce((sum, row) => sum + Number(row.orderCount || 0), 0);
    const todayAmount = todayOrders.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const todayQty = todayOrders.reduce((sum, row) => sum + Number(row.orderQty || 0), 0);
    return { amount, qty, shippedQty, orders, todayAmount, todayQty, todayOrders: todayOrders.length };
  }, [data.groups, todayOrders]);

  const maxMonthAmount = Math.max(...monthlyRows.map(row => row.amount), 1);
  const activeMonthLabel = MONTHS[currentMonthNumber() - 1];
  const fulfillmentRate = totals.qty > 0 ? (totals.shippedQty / totals.qty) * 100 : 0;

  const openCustomerAnalysis = () => {
    const params = new URLSearchParams({ years: REPORT_YEAR, months: periodMonths.join(','), metric: 'amount' });
    navigate('/dashboard/sales-customer-groups?' + params.toString());
  };

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'SALES DASHBOARD' }]} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <main style={pageShell}>
          <section style={headerRow}>
            <div>
              <h1 style={pageTitle}>Sales Dashboard</h1>
              <p style={pageSubtitle}>2026 real-time sales pulse from January through {activeMonthLabel}, including today.</p>
            </div>
            <div style={statusBar}>
              <span style={statusPill}><CalendarDays size={14} /> Jan - {activeMonthLabel} {REPORT_YEAR}</span>
              <span style={statusPill}><Clock3 size={14} /> Updated {fmtTime(lastUpdated)}</span>
              <button onClick={() => loadData(true)} disabled={loading || refreshing} style={refreshButton}>
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </section>

          {error && <div style={errorBox}>{error}</div>}

          <section style={kpiGrid}>
            <KpiCard icon={<DollarSign size={18} />} label="YTD Sales" value={fmtAmount(totals.amount)} sub="OrdHD + OrdDT line amount" />
            <KpiCard icon={<ShoppingBag size={18} />} label="YTD Orders" value={fmtQty(totals.orders)} sub="Distinct order count by customer" />
            <KpiCard icon={<Hash size={18} />} label="Ordered Qty" value={fmtQty(totals.qty)} sub={'Shipped ' + fmtQty(totals.shippedQty) + ' (' + fmtPct(fulfillmentRate) + ')'} />
            <KpiCard icon={<TrendingUp size={18} />} label="Today" value={fmtAmount(totals.todayAmount)} sub={fmtQty(totals.todayOrders) + ' orders, ' + fmtQty(totals.todayQty) + ' pcs'} highlight />
          </section>

          <section style={mainGrid}>
            <Panel title="Monthly Sales Intake" action={<span style={panelMeta}>YTD amount by order month</span>}>
              <div style={monthChart}>
                {monthlyRows.map(row => {
                  const pct = Math.max((row.amount / maxMonthAmount) * 100, row.amount > 0 ? 4 : 0);
                  return (
                    <div key={row.month} style={monthCol}>
                      <div style={barTrack}>
                        <div style={{ ...barFill, height: pct + '%' }} title={fmtAmount(row.amount)} />
                      </div>
                      <div style={monthLabel}>{row.label}</div>
                      <div style={monthValue}>{fmtAmount(row.amount).replace('$', '')}</div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Today Activity" action={<span style={panelMeta}>{todayLabel}</span>}>
              <div style={todayList}>
                {loading && <LoadingLine />}
                {!loading && todayOrders.length === 0 && <EmptyState label="No sales orders recorded today yet." />}
                {todayOrders.slice(0, 8).map((row, index) => (
                  <button key={row.orderNo + row.itemNo + index} onClick={() => navigate('/po-tracker/ord/' + encodeURIComponent(row.orderNo))} style={todayRow}>
                    <span>
                      <strong>{row.orderNo}</strong>
                      <small>{row.customerCode} / {row.itemNo}</small>
                    </span>
                    <span style={todayAmount}>{fmtAmount(Number(row.amount || 0))}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </section>

          <section style={lowerGrid}>
            <Panel title="Top Customers" action={<button onClick={openCustomerAnalysis} style={linkButton}>Open analysis <ArrowRight size={13} /></button>}>
              <table style={tableBase}>
                <thead>
                  <tr>
                    <th style={th}>Customer</th>
                    <th style={th}>Group</th>
                    <th style={thRight}>Orders</th>
                    <th style={thRight}>Qty</th>
                    <th style={thRight}>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && topCustomers.length === 0 && <EmptyRow colSpan={5} label="No customer sales data." />}
                  {topCustomers.map(row => (
                    <tr key={row.customerCode}>
                      <td style={tdStrong}>{row.customerCode}<small>{row.customerName}</small></td>
                      <td style={td}>{row.groupLabel}</td>
                      <td style={tdRight}>{fmtQty(row.orderCount)}</td>
                      <td style={tdRight}>{fmtQty(row.qty)}</td>
                      <td style={tdRightStrong}>{fmtAmount(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Top Items" action={<span style={panelMeta}>Top 12 by amount</span>}>
              <table style={tableBase}>
                <thead>
                  <tr>
                    <th style={th}>Item</th>
                    <th style={th}>Primary Customer</th>
                    <th style={thRight}>Qty</th>
                    <th style={thRight}>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && data.topItems.length === 0 && <EmptyRow colSpan={4} label="No item sales data." />}
                  {data.topItems.map(row => (
                    <tr key={row.itemNo}>
                      <td style={tdStrong}>{row.itemNo}<small>{row.itemTypeName || row.itemType || '-'}</small></td>
                      <td style={td}>{row.primaryCustomerCode || '-'}<small>{row.primaryCustomerName || ''}</small></td>
                      <td style={tdRight}>{fmtQty(Number(row.qty || 0))}</td>
                      <td style={tdRightStrong}>{fmtAmount(Number(row.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </section>

          {loading && <div style={loadingOverlay}><RefreshCw size={16} className="animate-spin" /> Loading real-time sales data...</div>}
        </main>
      </div>
    </>
  );
}

function KpiCard({ icon, label, value, sub, highlight = false }: { icon: ReactNode; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div style={{ ...kpiCard, borderColor: highlight ? 'color-mix(in oklch, var(--color-brand-500) 45%, var(--color-border-light))' : 'var(--color-border-light)' }}>
      <div style={kpiTop}><span style={kpiIcon}>{icon}</span><span>{label}</span></div>
      <div style={kpiValue}>{value}</div>
      <div style={kpiSub}>{sub}</div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section style={panel}>
      <div style={panelHeader}><h2 style={panelTitle}>{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} style={emptyCell}>{label}</td></tr>;
}

function EmptyState({ label }: { label: string }) {
  return <div style={emptyState}>{label}</div>;
}

function LoadingLine() {
  return <div style={emptyState}><RefreshCw size={14} className="animate-spin" /> Loading...</div>;
}

const pageShell: CSSProperties = { padding: 24, display: 'flex', flexDirection: 'column', gap: 18, width: '100%' };
const headerRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' };
const pageTitle: CSSProperties = { margin: 0, fontSize: '1.45rem', lineHeight: 1.2, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: 0 };
const pageSubtitle: CSSProperties = { margin: '5px 0 0', fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 600 };
const statusBar: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const statusPill: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', fontSize: '0.74rem', fontWeight: 800 };
const refreshButton: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--color-border-default)', background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer' };
const kpiGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const kpiCard: CSSProperties = { minHeight: 118, padding: 16, borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)' };
const kpiTop: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' };
const kpiIcon: CSSProperties = { display: 'inline-flex', color: 'var(--color-brand-500)' };
const kpiValue: CSSProperties = { marginTop: 14, color: 'var(--color-text-primary)', fontSize: '1.55rem', fontWeight: 850, fontVariantNumeric: 'tabular-nums', letterSpacing: 0 };
const kpiSub: CSSProperties = { marginTop: 5, color: 'var(--color-text-tertiary)', fontSize: '0.74rem', fontWeight: 650 };
const mainGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 };
const lowerGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14 };
const panel: CSSProperties = { borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', padding: 16, minWidth: 0 };
const panelHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 };
const panelTitle: CSSProperties = { margin: 0, color: 'var(--color-text-primary)', fontSize: '0.92rem', fontWeight: 820 };
const panelMeta: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.72rem', fontWeight: 750 };
const monthChart: CSSProperties = { height: 320, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(44px, 1fr))', gap: 10, alignItems: 'end', overflowX: 'auto', paddingTop: 8 };
const monthCol: CSSProperties = { height: '100%', minWidth: 44, display: 'grid', gridTemplateRows: '1fr 18px 18px', gap: 5, alignItems: 'end' };
const barTrack: CSSProperties = { height: '100%', background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', borderRadius: 8, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' };
const barFill: CSSProperties = { width: '100%', background: 'linear-gradient(180deg, var(--color-brand-500), var(--color-accent-500))', borderRadius: '7px 7px 0 0', transition: 'height 180ms ease-out' };
const monthLabel: CSSProperties = { textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.72rem', fontWeight: 800 };
const monthValue: CSSProperties = { textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.66rem', fontWeight: 750, fontVariantNumeric: 'tabular-nums' };
const todayList: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' };
const todayRow: CSSProperties = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', textAlign: 'left', cursor: 'pointer' };
const todayAmount: CSSProperties = { color: 'var(--color-brand-500)', fontWeight: 850, fontVariantNumeric: 'tabular-nums' };
const tableBase: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: CSSProperties = { textAlign: 'left', padding: '9px 8px', borderBottom: '1px solid var(--color-border-light)', color: 'var(--color-text-tertiary)', fontSize: '0.68rem', fontWeight: 850, textTransform: 'uppercase' };
const thRight: CSSProperties = { ...th, textAlign: 'right' };
const td: CSSProperties = { padding: '10px 8px', borderBottom: '1px solid var(--color-border-light)', color: 'var(--color-text-secondary)', fontSize: '0.78rem', fontWeight: 650 };
const tdStrong: CSSProperties = { ...td, color: 'var(--color-text-primary)', fontWeight: 830 };
const tdRight: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const tdRightStrong: CSSProperties = { ...tdRight, color: 'var(--color-text-primary)', fontWeight: 850 };
const emptyCell: CSSProperties = { padding: 22, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.78rem', fontWeight: 700 };
const emptyState: CSSProperties = { minHeight: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-text-tertiary)', fontSize: '0.78rem', fontWeight: 760, border: '1px dashed var(--color-border-light)', borderRadius: 8, background: 'var(--color-surface-1)' };
const linkButton: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', color: 'var(--color-brand-500)', fontSize: '0.74rem', fontWeight: 850, cursor: 'pointer' };
const errorBox: CSSProperties = { padding: '12px 14px', borderRadius: 8, border: '1px solid color-mix(in oklch, var(--color-danger-500) 35%, var(--color-border-light))', color: 'var(--color-danger-500)', background: 'color-mix(in oklch, var(--color-danger-500) 9%, var(--color-surface-0))', fontWeight: 780, fontSize: '0.8rem' };
const loadingOverlay: CSSProperties = { position: 'fixed', right: 24, bottom: 24, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', fontSize: '0.78rem', fontWeight: 800, boxShadow: '0 12px 36px rgba(0,0,0,0.16)' };
