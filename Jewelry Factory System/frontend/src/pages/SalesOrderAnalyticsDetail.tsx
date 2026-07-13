import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, CheckCircle2, Clock, PackageSearch, Search, Settings2, Wrench } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import {
  applyFilters,
  applyStatusFilter,
  BUCKET_ORDER,
  BUCKET_STYLE,
  categorizeRecord,
  DEFAULT_FILTERS,
  DEPARTMENT_LABEL,
  formatNumber,
  getDueDate,
  type DepartmentKey,
  type DueDateSource,
  type Filters,
  type ItemRecord,
  type StatusBucket,
  type TrackableRecord,
  type ViewMode,
  useSalesOrderAnalyticsData,
} from './salesOrderAnalyticsModel';

const STATUS_ICONS: Record<StatusBucket, React.ElementType> = {
  completed: CheckCircle2,
  wip: Settings2,
  overdue: Clock,
  rework: Wrench,
};

const DEPARTMENTS = Object.keys(DEPARTMENT_LABEL) as DepartmentKey[];
type SortKey = 'customerCode' | 'po' | 'dueDate' | 'totalQty' | 'finishQty' | 'exportQty' | DepartmentKey;

export default function SalesOrderAnalyticsDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orders, items, loading, error } = useSalesOrderAnalyticsData();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'dueDate', dir: 'asc' });

  const filters: Filters = {
    ...DEFAULT_FILTERS,
    viewMode: (searchParams.get('viewMode') as ViewMode) || DEFAULT_FILTERS.viewMode,
    dueDateSource: (searchParams.get('dueDateSource') as DueDateSource) || DEFAULT_FILTERS.dueDateSource,
    shipMonth: searchParams.get('shipMonth') || DEFAULT_FILTERS.shipMonth,
  };
  const status = (searchParams.get('status') as StatusBucket | 'all') || 'all';

  const sourceRows: TrackableRecord[] = filters.viewMode === 'order' ? orders : items;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = applyStatusFilter(applyFilters(sourceRows, filters), status, filters.dueDateSource);
    if (q) {
      next = next.filter((row) => [row.customerCode, row.customerName, row.po, row.ordNo, row.ordKind, row.material, 'itemCode' in row ? row.itemCode : ''].some((value) => String(value || '').toLowerCase().includes(q)));
    }
    return [...next].sort((a, b) => compareRows(a, b, sort, filters.dueDateSource));
  }, [sourceRows, filters, status, search, sort]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'SALES ORDER ANALYTICS' }, { label: 'DETAIL TABLE' }]} icon={<PackageSearch size={22} />} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="p-6 flex flex-col gap-6 w-full">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: 0, lineHeight: 1 }}>
                Detail <span style={{ color: 'var(--color-proc-polishing)' }}>Table</span>
              </h1>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'capitalize' }}>
                Drilldown rows for meeting review
              </p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <ModeButton active={filters.viewMode === 'order'} onClick={() => updateParam('viewMode', 'order')}>View By Order</ModeButton>
              <ModeButton active={filters.viewMode === 'item'} onClick={() => updateParam('viewMode', 'item')}>View By Item</ModeButton>
            </div>
          </div>

          <section style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 20, padding: 18, boxShadow: '0 4px 18px -6px color-mix(in srgb, var(--color-surface-900) 12%, transparent)' }}>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap gap-2">
                <StatusFilter active={status === 'all'} onClick={() => updateParam('status', 'all')} label="All" />
                {BUCKET_ORDER.map((bucket) => <StatusFilter key={bucket} active={status === bucket} onClick={() => updateParam('status', bucket)} label={BUCKET_STYLE[bucket].label} status={bucket} />)}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <select value={filters.dueDateSource} onChange={(event) => updateParam('dueDateSource', event.target.value)} style={selectStyle}>
                  <option value="factory">Factory Due</option>
                  <option value="customer">Customer Due</option>
                </select>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, PO, customer..." style={{ width: 260, background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border-light)', borderRadius: 10, padding: '8px 12px 8px 34px', color: 'var(--color-text-primary)', fontSize: '0.78rem', fontWeight: 800, outline: 'none' }} />
                </div>
              </div>
            </div>
          </section>

          {error && <div style={{ padding: 14, borderRadius: 14, border: '1px solid var(--color-danger-200)', background: 'var(--color-danger-50)', color: 'var(--color-danger-600)', fontSize: '0.8rem', fontWeight: 800 }}>{error}</div>}

          <section style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 24, border: '1px solid var(--color-border-light)', boxShadow: '0 8px 32px -8px color-mix(in srgb, var(--color-surface-900) 12%, transparent)' }}>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>{filters.viewMode === 'order' ? 'Order Rows' : 'Item Rows'}</h2>
                <p style={{ margin: '5px 0 0', fontSize: '0.74rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>{formatNumber(rows.length)} records</p>
              </div>
            </div>

            <div className="content-scrollbar" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: filters.viewMode === 'order' ? 1320 : 1380, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {filters.viewMode === 'item' && <Header label="Item No" />}
                    <Header label="Status" />
                    <Header label="Customer" sortKey="customerCode" sort={sort} onSort={toggleSort} />
                    <Header label="PO" sortKey="po" sort={sort} onSort={toggleSort} />
                    <Header label="Order No" />
                    <Header label="Kind" />
                    <Header label="Due Date" sortKey="dueDate" sort={sort} onSort={toggleSort} />
                    <Header label="Total Qty" align="right" sortKey="totalQty" sort={sort} onSort={toggleSort} />
                    <Header label="Finish Qty" align="right" sortKey="finishQty" sort={sort} onSort={toggleSort} />
                    <Header label="Export Qty" align="right" sortKey="exportQty" sort={sort} onSort={toggleSort} />
                    {DEPARTMENTS.map((dept) => <Header key={dept} label={DEPARTMENT_LABEL[dept]} align="right" sortKey={dept} sort={sort} onSort={toggleSort} />)}
                  </tr>
                </thead>
                <tbody>
                  {loading && <EmptyRow colSpan={filters.viewMode === 'item' ? 15 : 14} text="Loading..." />}
                  {!loading && rows.length === 0 && <EmptyRow colSpan={filters.viewMode === 'item' ? 15 : 14} text="No records match these filters." />}
                  {!loading && rows.map((row) => <DataRow key={row.id} row={row} filters={filters} />)}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--color-surface-1)',
  border: '1.5px solid var(--color-border-light)',
  borderRadius: 10,
  padding: '8px 12px',
  color: 'var(--color-text-primary)',
  fontSize: '0.78rem',
  fontWeight: 800,
  outline: 'none',
};

function compareRows(a: TrackableRecord, b: TrackableRecord, sort: { key: SortKey; dir: 'asc' | 'desc' }, dueDateSource: DueDateSource) {
  const av = getSortValue(a, sort.key, dueDateSource);
  const bv = getSortValue(b, sort.key, dueDateSource);
  const cmp = av < bv ? -1 : av > bv ? 1 : 0;
  return sort.dir === 'asc' ? cmp : -cmp;
}

function getSortValue(row: TrackableRecord, key: SortKey, dueDateSource: DueDateSource): string | number {
  if (key === 'dueDate') return getDueDate(row, dueDateSource) || '';
  if (key in row.pendingQty) return row.pendingQty[key as DepartmentKey];
  return row[key as keyof TrackableRecord] as string | number;
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: '9px 16px', borderRadius: 12, border: '1px solid var(--color-border-light)', background: active ? 'var(--color-proc-polishing)' : 'var(--color-surface-0)', color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer' }}>{children}</button>;
}

function StatusFilter({ active, onClick, label, status }: { active: boolean; onClick: () => void; label: string; status?: StatusBucket }) {
  const style = status ? BUCKET_STYLE[status] : null;
  const Icon = status ? STATUS_ICONS[status] : null;
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999, border: `1px solid ${active && style ? style.border : 'var(--color-border-light)'}`, background: active ? (style ? style.softBg : 'var(--color-surface-900)') : 'var(--color-surface-1)', color: active ? (style ? style.color : 'var(--color-text-inverse)') : 'var(--color-text-secondary)', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer' }}>
      {Icon && <Icon size={13} />}
      {label}
    </button>
  );
}

function Header({ label, align = 'left', sortKey, sort, onSort }: { label: string; align?: 'left' | 'right'; sortKey?: SortKey; sort?: { key: SortKey; dir: 'asc' | 'desc' }; onSort?: (key: SortKey) => void }) {
  const active = sortKey && sort?.key === sortKey;
  return (
    <th style={{ textAlign: align, padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', borderBottom: '2px solid var(--color-border-light)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {sortKey && onSort ? (
        <button onClick={() => onSort(sortKey)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
          {label}<ArrowUpDown size={11} />
        </button>
      ) : label}
    </th>
  );
}

function DataRow({ row, filters }: { row: TrackableRecord; filters: Filters }) {
  const status = categorizeRecord(row, filters.dueDateSource);
  const item = row as ItemRecord;
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
      {filters.viewMode === 'item' && <Cell strong>{item.itemCode}</Cell>}
      <td style={{ padding: '13px 14px' }}><StatusBadge status={status} /></td>
      <Cell strong>{row.customerCode}<div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', marginTop: 3 }}>{row.customerName}</div></Cell>
      <Cell>{row.po}</Cell>
      <Cell>{row.ordNo}</Cell>
      <Cell>{row.ordKind}</Cell>
      <Cell strong color={BUCKET_STYLE[status].color}>{getDueDate(row, filters.dueDateSource) || '-'}</Cell>
      <Cell align="right" strong>{formatNumber(row.totalQty)}</Cell>
      <Cell align="right">{formatNumber(row.finishQty)}</Cell>
      <Cell align="right">{formatNumber(row.exportQty)}</Cell>
      {DEPARTMENTS.map((dept) => <Cell key={dept} align="right" color={row.pendingQty[dept] > 0 ? 'var(--color-text-primary)' : 'var(--color-text-quaternary)'} strong={row.pendingQty[dept] > 0}>{formatNumber(row.pendingQty[dept])}</Cell>)}
    </tr>
  );
}

function Cell({ children, align = 'left', strong = false, color }: { children: React.ReactNode; align?: 'left' | 'right'; strong?: boolean; color?: string }) {
  return <td style={{ padding: '13px 14px', textAlign: align, fontSize: '0.8rem', fontWeight: strong ? 900 : 800, color: color || (strong ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'), whiteSpace: 'nowrap' }}>{children}</td>;
}

function StatusBadge({ status }: { status: StatusBucket }) {
  const style = BUCKET_STYLE[status];
  return <span style={{ display: 'inline-flex', alignItems: 'center', background: style.softBg, color: style.color, border: `1px solid ${style.border}`, borderRadius: 999, padding: '5px 10px', fontSize: '0.68rem', fontWeight: 900 }}>{style.label}</span>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem', fontWeight: 800 }}>{text}</td></tr>;
}
