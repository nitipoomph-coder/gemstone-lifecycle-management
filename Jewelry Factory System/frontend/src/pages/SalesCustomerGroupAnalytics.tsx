import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, DollarSign, Hash, PackageSearch, RefreshCw, Users, X } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { ALL_GROUPS, CUSTOMER_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import {
  fetchAvailableYears,
  fetchSalesCustomerGroups,
  fetchTopItems,
  type SalesCustomerGroupPoint,
  type TopItemRow,
} from '../services/dashboardAPI';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_VALUES = MONTHS.map((_, index) => String(index + 1));
const QUARTERS = [
  { label: 'Q1', months: ['1', '2', '3'] },
  { label: 'Q2', months: ['4', '5', '6'] },
  { label: 'Q3', months: ['7', '8', '9'] },
  { label: 'Q4', months: ['10', '11', '12'] },
];
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

type Metric = 'amount' | 'qty';
type GroupSummaryRow = {
  id: string;
  label: string;
  color: string;
  customerCount: number;
  amount: number;
  qty: number;
  shippedQty: number;
  orderCount: number;
  primaryValue: number;
  compareValue: number | null;
};

const fmtAmount = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtMetric = (value: number, metric: Metric) => metric === 'amount' ? fmtAmount(value) : fmtQty(value);

function csv(value: string | null) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function selectedCustomerCodes(groupIds: string[]) {
  if (groupIds.length === 0) return [];
  return CUSTOMER_GROUPS.filter(group => groupIds.includes(group.id)).flatMap(group => group.prefixes);
}

function initialGroupsFromParams(groups: string[], customers: string[]) {
  if (groups.length > 0) return groups;
  if (customers.length === 0) return [];
  return Array.from(new Set(customers.map(code => getCustomerGroupId(code)).filter(groupId => CUSTOMER_GROUPS.some(group => group.id === groupId))));
}

function productTypeLabel(type?: string | null, typeName?: string | null) {
  const fullName = (typeName || '').trim();
  if (fullName && fullName !== 'Unclassified') return fullName;
  const code = (type || '').trim().toUpperCase();
  if (!code) return fullName || '-';
  return PRODUCT_TYPE_LABELS[code[0]] || fullName || 'Unclassified';
}

function groupConfig(groupId: string) {
  return ALL_GROUPS.find(group => group.id === groupId) || ALL_GROUPS.find(group => group.id === 'General')!;
}

function groupLabelFromCode(code?: string | null) {
  if (!code) return '-';
  return groupConfig(getCustomerGroupId(code)).label;
}

function selectionSummary(selected: string[], total: number, noun: string) {
  if (selected.length === 0 || selected.length === total) return `All ${noun}`;
  return `${selected.length} ${noun} selected`;
}

function buildGroupSummary(points: SalesCustomerGroupPoint[], metric: Metric, primaryYear: string, compareYear: string) {
  const map = new Map<string, GroupSummaryRow & { customerCodes: Set<string> }>();

  points.forEach(row => {
    const groupId = getCustomerGroupId(row.customerCode);
    const group = groupConfig(groupId);
    const current = map.get(groupId) || {
      id: groupId,
      label: group.label,
      color: group.color,
      customerCount: 0,
      customerCodes: new Set<string>(),
      amount: 0,
      qty: 0,
      shippedQty: 0,
      orderCount: 0,
      primaryValue: 0,
      compareValue: compareYear === 'none' ? null : 0,
    };
    const amount = Number(row.amount || 0);
    const qty = Number(row.qty || 0);
    const metricValue = metric === 'amount' ? amount : qty;

    current.customerCodes.add(row.customerCode);
    current.amount += amount;
    current.qty += qty;
    current.shippedQty += Number(row.shippedQty || 0);
    current.orderCount += Number(row.orderCount || 0);
    if (String(row.year) === primaryYear) current.primaryValue += metricValue;
    if (compareYear !== 'none' && String(row.year) === compareYear) current.compareValue = Number(current.compareValue || 0) + metricValue;
    map.set(groupId, current);
  });

  return Array.from(map.values())
    .map(row => ({ ...row, customerCount: row.customerCodes.size }))
    .sort((a, b) => (metric === 'amount' ? b.amount - a.amount : b.qty - a.qty));
}

export default function SalesCustomerGroupAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedYears = useMemo(() => csv(searchParams.get('years')), [searchParams]);
  const requestedMonths = useMemo(() => csv(searchParams.get('months')).filter(month => MONTH_VALUES.includes(month)), [searchParams]);
  const requestedCustomers = useMemo(() => csv(searchParams.get('customers')), [searchParams]);
  const requestedGroups = useMemo(() => csv(searchParams.get('groups')).filter(groupId => CUSTOMER_GROUPS.some(group => group.id === groupId)), [searchParams]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(requestedMonths.length ? requestedMonths : MONTH_VALUES);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => initialGroupsFromParams(requestedGroups, requestedCustomers));
  const [metric, setMetric] = useState<Metric>(searchParams.get('metric') === 'qty' ? 'qty' : 'amount');
  const [points, setPoints] = useState<SalesCustomerGroupPoint[]>([]);
  const [topItems, setTopItems] = useState<TopItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const customers = useMemo(() => selectedCustomerCodes(selectedGroups), [selectedGroups]);

  useEffect(() => {
    fetchAvailableYears()
      .then(years => {
        const sorted = years.map(String).sort((a, b) => Number(a) - Number(b));
        setAvailableYears(sorted);
        const requested = requestedYears.filter(year => sorted.includes(year));
        const latest = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        setSelectedYears(requested.length ? requested : prev ? [prev, latest] : latest ? [latest] : []);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load years'));
  }, [requestedYears]);

  useEffect(() => {
    if (selectedYears.length === 0) return;
    setLoading(true);
    setError('');
    Promise.all([
      fetchSalesCustomerGroups({ years: selectedYears, months: selectedMonths, customers }),
      fetchTopItems({ years: selectedYears, months: selectedMonths, customers, metric, limit: 30 }),
    ])
      .then(([groupData, itemData]) => {
        setPoints(groupData);
        setTopItems(itemData);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sales analytics'))
      .finally(() => setLoading(false));
  }, [selectedYears, selectedMonths, customers, metric]);

  const kpi = useMemo(() => {
    const amount = points.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const qty = points.reduce((sum, row) => sum + Number(row.qty || 0), 0);
    const shipped = points.reduce((sum, row) => sum + Number(row.shippedQty || 0), 0);
    const orders = points.reduce((sum, row) => sum + Number(row.orderCount || 0), 0);
    return { amount, qty, shipped, orders };
  }, [points]);

  const primaryYear = selectedYears[selectedYears.length - 1] || availableYears[availableYears.length - 1] || '';
  const compareYear = selectedYears.find(year => year !== primaryYear) || 'none';
  const groupSummary = useMemo(() => buildGroupSummary(points, metric, primaryYear, compareYear), [points, metric, primaryYear, compareYear]);

  const updateYearSelection = (primary: string, compare: string) => {
    const next = [primary, compare].filter(year => year && year !== 'none');
    setSelectedYears(Array.from(new Set(next)).sort((a, b) => Number(a) - Number(b)));
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => prev.includes(month) ? (prev.length > 1 ? prev.filter(item => item !== month) : prev) : [...prev, month].sort((a, b) => Number(a) - Number(b)));
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(item => item !== groupId) : [...prev, groupId]);
  };

  const selectedYearSummary = selectionSummary(selectedYears, availableYears.length, 'years');
  const selectedMonthSummary = selectionSummary(selectedMonths, MONTHS.length, 'months');
  const selectedGroupSummary = selectedGroups.length === 0 ? 'All customer groups' : `${selectedGroups.length} customer groups selected`;

  const openDetail = () => {
    const params = new URLSearchParams();
    if (selectedYears.length) params.set('years', selectedYears.join(','));
    if (selectedMonths.length) params.set('months', selectedMonths.join(','));
    if (customers.length) params.set('customers', customers.join(','));
    if (selectedGroups.length) params.set('groups', selectedGroups.join(','));
    params.set('metric', metric);
    navigate(`/dashboard/sales-customer-detail?${params.toString()}`);
  };

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'CUSTOMER SALES ANALYSIS' }]} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="p-6 flex flex-col gap-5 w-full">
          <div style={pageHeader}>
            <div>
              <h1 style={pageTitle}>Customer Sales Analysis</h1>
              <p style={pageSubtitle}>Customer group, order, item, amount, quantity, and shipment review.</p>
            </div>
            <div style={headerActions}>
              <SegmentButton active={metric === 'amount'} onClick={() => setMetric('amount')} icon={<DollarSign size={14} />} label="Amount" />
              <SegmentButton active={metric === 'qty'} onClick={() => setMetric('qty')} icon={<Hash size={14} />} label="Qty" />
              <button onClick={openDetail} style={primaryButton}>Order List <ArrowRight size={14} /></button>
            </div>
          </div>

          <div style={kpiGrid}>
            <Kpi icon={<DollarSign size={18} />} label="Sales Amount" value={fmtAmount(kpi.amount)} />
            <Kpi icon={<Hash size={18} />} label="Ordered Qty" value={fmtQty(kpi.qty)} />
            <Kpi icon={<PackageSearch size={18} />} label="Shipped Qty" value={fmtQty(kpi.shipped)} />
            <Kpi icon={<Users size={18} />} label="Orders" value={fmtQty(kpi.orders)} />
          </div>

          <section style={filterShell}>
            <FilterCard label="Year" summary={selectedYearSummary} icon={<CalendarDays size={14} />}>
              <YearSelectControls availableYears={availableYears} primaryYear={primaryYear} compareYear={compareYear} onChange={updateYearSelection} />
            </FilterCard>
            <FilterCard label="Month" summary={selectedMonthSummary} icon={<CalendarDays size={14} />}>
              <MonthDrillDropdown open={monthDropdownOpen} selectedMonths={selectedMonths} onToggle={() => setMonthDropdownOpen(open => !open)} onSelect={(months) => { setSelectedMonths(months); setMonthDropdownOpen(false); }} onToggleMonth={toggleMonth} />
            </FilterCard>
            <FilterCard label="Customer Group" summary={selectedGroupSummary} icon={<Users size={14} />} action={<ClearButton disabled={selectedGroups.length === 0} onClick={() => setSelectedGroups([])} />}>
              <FilterChip active={selectedGroups.length === 0} onClick={() => setSelectedGroups([])} label="All Groups" />
              {CUSTOMER_GROUPS.map(group => <FilterChip key={group.id} active={selectedGroups.includes(group.id)} onClick={() => toggleGroup(group.id)} label={group.label} color={group.color} />)}
            </FilterCard>
          </section>

          {error && <div style={errorText}>{error}</div>}
          {loading && <div style={loadingText}><RefreshCw size={14} className="animate-spin" /> Loading sales analytics...</div>}

          <div style={twoColumnGrid}>
            <Panel title="Customer Group Summary" icon={<Users size={14} />} action={<button onClick={openDetail} style={linkAction}>Open Order List</button>}>
              <div className="content-scrollbar" style={tableScroll}>
                <table style={{ ...tableBase, minWidth: 880 }}>
                  <thead>
                    <tr>
                      {['Customer Group', 'Customers', 'Orders', 'Ordered Qty', 'Shipped Qty', 'Sales Amount', primaryYear || 'Primary', compareYear === 'none' ? 'Compare' : compareYear, 'Delta'].map((head, index) => <th key={head} style={index >= 3 ? thRight : th}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && groupSummary.length === 0 && <EmptyRow colSpan={9} label="No customer group data matches the current filter." />}
                    {groupSummary.map(row => {
                      const delta = row.compareValue === null ? null : row.primaryValue - row.compareValue;
                      return (
                        <tr key={row.id}>
                          <td style={tdStrong}><span style={{ ...groupDot, background: row.color }} />{row.label}</td>
                          <td style={td}>{fmtQty(row.customerCount)}</td>
                          <td style={tdRight}>{fmtQty(row.orderCount)}</td>
                          <td style={tdRight}>{fmtQty(row.qty)}</td>
                          <td style={tdRight}>{fmtQty(row.shippedQty)}</td>
                          <td style={tdRight}>{fmtAmount(row.amount)}</td>
                          <td style={tdRight}>{fmtMetric(row.primaryValue, metric)}</td>
                          <td style={tdRight}>{row.compareValue === null ? '-' : fmtMetric(row.compareValue, metric)}</td>
                          <td style={{ ...tdRight, color: delta === null ? 'var(--color-text-tertiary)' : delta >= 0 ? 'var(--color-success-500)' : 'var(--color-danger-500)' }}>{delta === null ? '-' : fmtMetric(delta, metric)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Item / Order Lines" icon={<PackageSearch size={14} />} action={<span style={panelMeta}>Sorted by {metric === 'amount' ? 'Sales Amount' : 'Ordered Qty'}</span>}>
              <div className="content-scrollbar" style={tableScroll}>
                <table style={{ ...tableBase, minWidth: 980 }}>
                  <thead>
                    <tr>
                      {['Item No', 'Customer Group', 'Type', 'Orders', 'Ordered Qty', 'Shipped Qty', 'Sales Amount', 'Avg Price'].map((head, index) => <th key={head} style={index >= 3 ? thRight : th}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && topItems.length === 0 && <EmptyRow colSpan={8} label="No item lines match the current filter." />}
                    {topItems.map((item, index) => (
                      <tr key={`${item.itemNo}-${index}`}>
                        <td style={tdItem}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(item.itemNo)}`)} style={linkButton}>{item.itemNo}</button><div style={subText}>{item.itemDesc || '-'}</div></td>
                        <td style={tdStrong}>{groupLabelFromCode(item.primaryCustomerCode)}<div style={subText}>{item.primaryCustomerCode || '-'}</div></td>
                        <td style={td}>{productTypeLabel(item.itemType, item.itemTypeName)}</td>
                        <td style={tdRight}>{fmtQty(item.orderCount)}</td>
                        <td style={tdRight}>{fmtQty(item.qty)}</td>
                        <td style={tdRight}>{fmtQty(item.shippedQty)}</td>
                        <td style={tdRight}>{fmtAmount(item.amount)}</td>
                        <td style={tdRight}>{fmtAmount(item.avgPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

function SegmentButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button onClick={onClick} style={{ ...segmentButton, ...(active ? segmentActive : null) }}>{icon}{label}</button>;
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div style={kpiTile}><div style={kpiLabel}>{icon}{label}</div><div style={kpiValue}>{value}</div></div>;
}

function YearSelectControls({ availableYears, primaryYear, compareYear, onChange }: { availableYears: string[]; primaryYear: string; compareYear: string; onChange: (primary: string, compare: string) => void }) {
  return (
    <div style={yearGrid}>
      <label style={fieldLabel}>Primary Year<select value={primaryYear} onChange={(event) => onChange(event.target.value, compareYear)} style={selectStyle}>{availableYears.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
      <label style={fieldLabel}>Compare Year<select value={compareYear} onChange={(event) => onChange(primaryYear, event.target.value)} style={selectStyle}><option value="none">None</option>{availableYears.filter(year => year !== primaryYear).map(year => <option key={year} value={year}>{year}</option>)}</select></label>
    </div>
  );
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
  return `${selectedMonths.length} months selected`;
}

function MonthDrillDropdown({ open, selectedMonths, onToggle, onSelect, onToggleMonth }: { open: boolean; selectedMonths: string[]; onToggle: () => void; onSelect: (months: string[]) => void; onToggleMonth: (month: string) => void }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button onClick={onToggle} style={dropdownButton}>{monthButtonLabel(selectedMonths)}<span style={dropdownHint}>{open ? 'Close' : 'Drill'}</span></button>
      {open && (
        <div style={monthMenu}>
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
  return <button onClick={onClick} style={{ ...monthOption, ...(active ? optionActive : null) }}>{label}</button>;
}

function FilterCard({ label, summary, icon, action, children }: { label: string; summary: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section style={filterCard}><div style={filterHeader}><div style={{ minWidth: 0 }}><div style={filterLabel}>{icon}{label}</div><div style={filterSummary}>{summary}</div></div>{action}</div><div style={filterBody}>{children}</div></section>;
}

function ClearButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return <button disabled={disabled} onClick={onClick} title="Reset selection" style={{ ...clearButton, ...(disabled ? disabledButton : null) }}><X size={14} /></button>;
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  const activeColor = color || 'var(--color-brand-500)';
  return <button onClick={onClick} style={{ ...chipButton, borderColor: active ? activeColor : 'var(--color-border-light)', background: active ? `color-mix(in srgb, ${activeColor} 12%, transparent)` : 'var(--color-surface-1)', color: active ? activeColor : 'var(--color-text-tertiary)' }}>{color && <span style={{ ...chipDot, background: color }} />}{label}</button>;
}

function Panel({ title, icon, action, children }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section style={panel}><div style={panelHeader}><h2 style={panelTitle}>{icon}{title}</h2>{action}</div>{children}</section>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} style={emptyCell}>{label}</td></tr>;
}

const pageHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' };
const pageTitle: CSSProperties = { margin: 0, fontSize: '1.5rem', lineHeight: 1.2, fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: 0 };
const pageSubtitle: CSSProperties = { marginTop: 4, color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800 };
const headerActions: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const primaryButton: CSSProperties = { height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-brand-500)', background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const segmentButton: CSSProperties = { height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const segmentActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)' };
const kpiGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const kpiTile: CSSProperties = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 16 };
const kpiLabel: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: 900, marginBottom: 8 };
const kpiValue: CSSProperties = { color: 'var(--color-text-primary)', fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-display)', lineHeight: 1.2 };
const filterShell: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 };
const filterCard: CSSProperties = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 14, minWidth: 0 };
const filterHeader: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 };
const filterLabel: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', fontSize: '0.68rem', fontWeight: 900 };
const filterSummary: CSSProperties = { marginTop: 2, color: 'var(--color-text-primary)', fontSize: '0.78rem', fontWeight: 900, fontFamily: 'var(--font-display)' };
const filterBody: CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const yearGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' };
const fieldLabel: CSSProperties = { display: 'grid', gap: 5, color: 'var(--color-text-tertiary)', fontSize: '0.66rem', fontWeight: 900 };
const selectStyle: CSSProperties = { height: 34, borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 900, padding: '0 10px', outline: 'none', fontFamily: 'var(--font-body)' };
const dropdownButton: CSSProperties = { width: '100%', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', padding: '0 10px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const dropdownHint: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.68rem' };
const monthMenu: CSSProperties = { position: 'absolute', top: 40, left: 0, zIndex: 20, width: 'min(360px, 92vw)', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)', padding: 12 };
const quickMonthGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 };
const monthGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 };
const monthOption: CSSProperties = { height: 30, borderRadius: 7, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' };
const optionActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)', color: 'var(--color-brand-600)' };
const clearButton: CSSProperties = { width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', cursor: 'pointer' };
const disabledButton: CSSProperties = { background: 'var(--color-surface-1)', color: 'var(--color-text-quaternary)', cursor: 'not-allowed' };
const chipButton: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--color-border-light)', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const chipDot: CSSProperties = { width: 7, height: 7, borderRadius: 999 };
const twoColumnGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(520px, 100%), 1fr))', gap: 16 };
const panel: CSSProperties = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 16, minWidth: 0 };
const panelHeader: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 };
const panelTitle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 900 };
const panelMeta: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: 900 };
const linkAction: CSSProperties = { border: 'none', background: 'transparent', color: 'var(--color-brand-600)', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer' };
const tableScroll: CSSProperties = { overflow: 'auto', maxHeight: 430, border: '1px solid var(--color-border-light)', borderRadius: 8 };
const tableBase: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', tableLayout: 'fixed' };
const th: CSSProperties = { textAlign: 'left', padding: '10px 12px', color: 'var(--color-text-inverse)', background: 'var(--color-table-header)', fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
const thRight: CSSProperties = { ...th, textAlign: 'right' };
const td: CSSProperties = { padding: '10px 12px', color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, verticalAlign: 'middle', borderBottom: '1px solid var(--color-border-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const tdStrong: CSSProperties = { ...td, fontWeight: 900 };
const tdItem: CSSProperties = { ...tdStrong, whiteSpace: 'normal' };
const tdRight: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const subText: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.68rem', fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const linkButton: CSSProperties = { background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' };
const groupDot: CSSProperties = { display: 'inline-block', width: 8, height: 8, borderRadius: 999, marginRight: 8 };
const emptyCell: CSSProperties = { ...td, textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 28 };
const errorText: CSSProperties = { color: 'var(--color-danger-500)', fontWeight: 800, fontSize: '0.8rem' };
const loadingText: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-brand-500)', fontWeight: 900 };