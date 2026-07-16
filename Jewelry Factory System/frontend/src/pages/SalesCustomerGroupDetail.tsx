import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, DollarSign, Eye, Hash, Search } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { CUSTOMER_GROUPS } from '../config/customerGroups';
import { fetchSalesOrders, type SalesOrderRow } from '../services/customerSalesAPI';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE_SIZE = 30;
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

const configuredCustomers = Array.from(new Set(CUSTOMER_GROUPS.flatMap(group => group.prefixes))).sort();

const fmtDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};
const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtAmount = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function csv(value: string | null) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function productTypeLabel(type?: string | null, typeName?: string | null) {
  const fullName = (typeName || '').trim();
  if (fullName && fullName !== 'Unclassified') return fullName;
  const code = (type || '').trim().toUpperCase();
  if (!code) return fullName || '-';
  return PRODUCT_TYPE_LABELS[code[0]] || fullName || 'Unclassified';
}

function monthSummary(months: string[]) {
  if (months.length === 0 || months.length === 12) return 'All Months';
  if (months.length <= 4) return months.map(month => MONTHS[Number(month) - 1]).filter(Boolean).join(', ');
  return `${months.length} months selected`;
}

export default function SalesCustomerGroupDetail() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const years = useMemo(() => csv(searchParams.get('years')), [searchParams]);
  const months = useMemo(() => csv(searchParams.get('months')), [searchParams]);
  const groups = useMemo(() => csv(searchParams.get('groups')), [searchParams]);
  const types = useMemo(() => csv(searchParams.get('types')), [searchParams]);
  const customersFromUrl = useMemo(() => csv(searchParams.get('customers')), [searchParams]);
  const metric = searchParams.get('metric') === 'qty' ? 'qty' : 'amount';

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(customersFromUrl);
  const [rows, setRows] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSelectedCustomers(customersFromUrl);
    setPage(1);
  }, [customersFromUrl.join('|')]);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchSalesOrders({ years, months, customers: selectedCustomers, types })
      .then(data => setRows(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sales orders'))
      .finally(() => setLoading(false));
  }, [years, months, selectedCustomers, types]);

  const customerOptions = useMemo(() => {
    const codes = new Set<string>(configuredCustomers);
    selectedCustomers.forEach(code => codes.add(code));
    rows.forEach(row => codes.add(row.customerCode));
    return Array.from(codes).filter(Boolean).sort();
  }, [rows, selectedCustomers]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const baseRows = q ? rows.filter(row => [row.orderNo, row.poNo, row.itemNo, row.customerCode, row.customerName, row.brand, row.itemType, row.itemTypeName, row.market].some(value => String(value || '').toLowerCase().includes(q))) : rows;
    return [...baseRows].sort((a, b) => {
      if (metric === 'qty') return Number(b.orderQty || 0) - Number(a.orderQty || 0);
      return Number(b.amount || 0) - Number(a.amount || 0);
    });
  }, [rows, search, metric]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totals = useMemo(() => ({
    qty: filteredRows.reduce((sum, row) => sum + Number(row.orderQty || 0), 0),
    shipped: filteredRows.reduce((sum, row) => sum + Number(row.shippedQty || 0), 0),
    amount: filteredRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
  }), [filteredRows]);

  const overviewPath = useMemo(() => {
    const next = new URLSearchParams();
    if (years.length) next.set('years', years.join(','));
    if (months.length) next.set('months', months.join(','));
    if (groups.length) next.set('groups', groups.join(','));
    else if (selectedCustomers.length) next.set('customers', selectedCustomers.join(','));
    next.set('metric', metric);
    const query = next.toString();
    return `/dashboard/sales-customer-groups${query ? `?${query}` : ''}`;
  }, [years, months, groups, selectedCustomers, types, metric]);

  const applyCustomers = (nextCustomers: string[]) => {
    const sorted = [...nextCustomers].sort();
    setSelectedCustomers(sorted);
    const next = new URLSearchParams(searchParams);
    if (sorted.length > 0) next.set('customers', sorted.join(','));
    else next.delete('customers');
    next.delete('groups');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const toggleCustomer = (code: string) => {
    const next = selectedCustomers.includes(code) ? selectedCustomers.filter(item => item !== code) : [...selectedCustomers, code];
    applyCustomers(next);
  };

  const setMetric = (nextMetric: 'amount' | 'qty') => {
    const next = new URLSearchParams(searchParams);
    next.set('metric', nextMetric);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'Customer Sales Analysis', path: '/dashboard/sales-customer-groups' }, { label: 'Order List' }]} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="p-6 flex flex-col gap-4 w-full" style={{ minHeight: '100%' }}>
          <div style={pageHeader}>
            <div>
              <button onClick={() => navigate(overviewPath)} style={backButton}><ArrowLeft size={14} /> Sales Overview</button>
              <h1 style={pageTitle}>Customer Order Detail</h1>
              <p style={pageSubtitle}>{years.join(', ') || 'All Years'} / {monthSummary(months)} / sorted by {metric === 'amount' ? 'Sales Amount' : 'Ordered Qty'}</p>
            </div>
            <div style={headerActions}>
              <MetricButton active={metric === 'amount'} onClick={() => setMetric('amount')} icon={<DollarSign size={14} />} label="Amount" />
              <MetricButton active={metric === 'qty'} onClick={() => setMetric('qty')} icon={<Hash size={14} />} label="Qty" />
            </div>
          </div>

          <div style={kpiGrid}>
            <Kpi label="Rows" value={fmtQty(filteredRows.length)} />
            <Kpi label="Ordered Qty" value={fmtQty(totals.qty)} />
            <Kpi label="Shipped Qty" value={fmtQty(totals.shipped)} />
            <Kpi label="Sales Amount" value={fmtAmount(totals.amount)} />
          </div>

          <section style={filterPanel}>
            <div style={customerFilterRow}>
              <span style={filterLabel}><Hash size={14} /> Customer</span>
              <FilterChip active={selectedCustomers.length === 0} onClick={() => applyCustomers([])} label="All" />
              {customerOptions.map(code => <FilterChip key={code} active={selectedCustomers.includes(code)} onClick={() => toggleCustomer(code)} label={code} />)}
            </div>
            <div style={searchWrap}>
              <Search size={14} style={searchIcon} />
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search order, item, customer..." style={searchInput} />
            </div>
          </section>

          {error && <div style={errorText}>{error}</div>}

          <section style={tablePanel}>
            <div className="content-scrollbar" style={{ overflow: 'auto', flex: 1 }}>
              <table style={tableBase}>
                <thead style={stickyHeader}>
                  <tr>
                    {['Order No', 'Item No', 'Ord Date', 'Cust Due', 'Customer', 'Brand', 'Type', 'Ord Qty', 'Shipped', 'Amount', 'Status', 'Market', 'Actions'].map((head, index) => <th key={head} style={index >= 7 && index <= 9 ? thRight : th}>{head}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={13} style={emptyCell}>Loading order detail...</td></tr>}
                  {!loading && pageRows.length === 0 && <tr><td colSpan={13} style={emptyCell}>No orders match the current filter.</td></tr>}
                  {!loading && pageRows.map(row => {
                    const shippedPct = row.orderQty > 0 ? Math.min(100, Math.round((row.shippedQty / row.orderQty) * 100)) : 0;
                    return (
                      <tr key={`${row.orderNo}-${row.itemNo}`} style={tableRow}>
                        <td style={tdStrong}><button onClick={() => navigate(`/po-tracker/ord/${encodeURIComponent(row.orderNo)}`)} style={linkButton}>{row.orderNo}</button><div style={subText}>{row.poNo || '-'}</div></td>
                        <td style={tdStrong}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(row.itemNo)}`)} style={linkButton}>{row.itemNo}</button></td>
                        <td style={td}>{fmtDate(row.ordDate)}</td>
                        <td style={{ ...td, color: row.status === 'Late' ? 'var(--color-danger-500)' : 'var(--color-text-primary)', fontWeight: row.status === 'Late' ? 900 : 800 }}>{fmtDate(row.custDueDate)}</td>
                        <td style={tdStrong}>{row.customerName}<div style={subText}>{row.customerCode}</div></td>
                        <td style={td}>{row.brand || '-'}</td>
                        <td style={tdStrong}>{productTypeLabel(row.itemType, row.itemTypeName)}</td>
                        <td style={tdRight}>{fmtQty(row.orderQty)}</td>
                        <td style={tdRight}><div style={shippedCell}><span style={progressTrack}><span style={{ ...progressFill, width: `${shippedPct}%`, background: row.status === 'Shipped' ? 'var(--color-success-500)' : 'var(--color-brand-500)' }} /></span>{fmtQty(row.shippedQty)}/{fmtQty(row.orderQty)}</div></td>
                        <td style={tdRight}>{fmtAmount(row.amount)}</td>
                        <td style={td}><StatusBadge status={row.status} /></td>
                        <td style={td}>{row.market || '-'}</td>
                        <td style={td}><button onClick={() => navigate(`/po-tracker/ord/${encodeURIComponent(row.orderNo)}`)} title="Open order" style={iconButton}><Eye size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={paginationBar}>
              <div style={paginationText}>Showing {filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</div>
              <div style={paginationButtons}>
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ ...pageButton, ...(page <= 1 ? disabledPageButton : null) }}><ChevronLeft size={14} /></button>
                <span style={pageText}>Page {page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ ...pageButton, ...(page >= totalPages ? disabledPageButton : null) }}><ChevronRight size={14} /></button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function MetricButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button onClick={onClick} style={{ ...metricButton, ...(active ? metricButtonActive : null) }}>{icon}{label}</button>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div style={kpiTile}><div style={kpiLabel}>{label}</div><div style={kpiValue}>{value}</div></div>;
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} style={{ ...chipButton, ...(active ? chipActive : null) }}>{label}</button>;
}

function StatusBadge({ status }: { status: SalesOrderRow['status'] }) {
  const color = status === 'Shipped' ? 'var(--color-success-500)' : status === 'Late' ? 'var(--color-danger-500)' : status === 'Partial' ? 'var(--color-warning-500)' : 'var(--color-info-500)';
  return <span style={{ ...statusBadge, background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>{status}</span>;
}

const pageHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' };
const backButton: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 900, marginBottom: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' };
const pageTitle: CSSProperties = { margin: 0, fontSize: '1.5rem', lineHeight: 1.2, fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' };
const pageSubtitle: CSSProperties = { marginTop: 4, color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800 };
const headerActions: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const metricButton: CSSProperties = { height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const metricButtonActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)' };
const kpiGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const kpiTile: CSSProperties = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 14 };
const kpiLabel: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: 900, marginBottom: 6 };
const kpiValue: CSSProperties = { color: 'var(--color-text-primary)', fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-display)' };
const filterPanel: CSSProperties = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 };
const customerFilterRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const filterLabel: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', fontSize: '0.72rem', fontWeight: 900, minWidth: 112 };
const chipButton: CSSProperties = { padding: '6px 11px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const chipActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)', color: 'var(--color-brand-600)' };
const searchWrap: CSSProperties = { position: 'relative', width: 'min(420px, 100%)' };
const searchIcon: CSSProperties = { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' };
const searchInput: CSSProperties = { width: '100%', height: 36, background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '8px 12px 8px 32px', color: 'var(--color-text-primary)', fontSize: '0.78rem', fontWeight: 800, outline: 'none', fontFamily: 'var(--font-body)' };
const tablePanel: CSSProperties = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 };
const tableBase: CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 1220, fontFamily: 'var(--font-body)' };
const stickyHeader: CSSProperties = { position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-table-header)' };
const th: CSSProperties = { textAlign: 'left', padding: '10px 12px', color: 'var(--color-text-inverse)', fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap' };
const thRight: CSSProperties = { ...th, textAlign: 'right' };
const tableRow: CSSProperties = { borderBottom: '1px solid var(--color-border-light)' };
const td: CSSProperties = { padding: '12px', color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap' };
const tdStrong: CSSProperties = { ...td, fontWeight: 900 };
const tdRight: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const subText: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.68rem', fontWeight: 700, marginTop: 2 };
const linkButton: CSSProperties = { background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' };
const shippedCell: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 };
const progressTrack: CSSProperties = { width: 64, height: 6, background: 'var(--color-surface-2)', borderRadius: 999, overflow: 'hidden' };
const progressFill: CSSProperties = { display: 'block', height: '100%' };
const statusBadge: CSSProperties = { display: 'inline-flex', padding: '4px 9px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 900 };
const iconButton: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', cursor: 'pointer' };
const paginationBar: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--color-border-light)', flexWrap: 'wrap' };
const paginationText: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800 };
const paginationButtons: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const pageButton: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', cursor: 'pointer' };
const disabledPageButton: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const pageText: CSSProperties = { color: 'var(--color-text-primary)', fontSize: '0.76rem', fontWeight: 900 };
const emptyCell: CSSProperties = { ...td, textAlign: 'center', padding: 32, color: 'var(--color-text-tertiary)', fontWeight: 900 };
const errorText: CSSProperties = { color: 'var(--color-danger-500)', fontWeight: 800, fontSize: '0.8rem' };