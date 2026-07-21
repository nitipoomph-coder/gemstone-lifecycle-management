import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, DollarSign, Eye, Hash, PackageSearch, RefreshCw, Search, Users, X } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import '../components/sales/SalesDenseTable.css';
import { ALL_GROUPS, CUSTOMER_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchSalesOrders, fetchTopItems, type SalesOrderRow, type TopItemRow } from '../services/customerSalesAPI';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_VALUES = MONTHS.map((_, index) => String(index + 1));
const QUARTERS = [
  { label: 'Q1', months: ['1', '2', '3'] },
  { label: 'Q2', months: ['4', '5', '6'] },
  { label: 'Q3', months: ['7', '8', '9'] },
  { label: 'Q4', months: ['10', '11', '12'] },
];
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  A: 'Mobile Hanging', B: 'Bangle', D: 'Body Jewelry', E: 'Earring', F: 'Anklet',
  H: 'Brooch', N: 'Necklace', O: 'Other', P: 'Pendant', R: 'Ring', S: 'Stone', T: 'Bracelet',
};

type Metric = 'amount' | 'qty';
type ItemStat = { itemNo: string; qty: number; amount: number; orderCount: number };
type CustomerTrendRow = {
  customerCode: string;
  customerName: string;
  groupLabel: string;
  groupColor: string;
  amount: number;
  qty: number;
  shippedQty: number;
  gapQty: number;
  orderCount: number;
  lateCount: number;
  primaryValue: number;
  compareValue: number | null;
  topItemNo: string;
  topItemQty: number;
  topItemAmount: number;
  lastOrderNo: string;
  lastOrderDate: string | null;
};

type CustomerAccumulator = Omit<CustomerTrendRow, 'orderCount' | 'lateCount' | 'topItemNo' | 'topItemQty' | 'topItemAmount'> & {
  orderNos: Set<string>;
  lateOrderNos: Set<string>;
  itemStats: Map<string, ItemStat>;
};

const fmtAmount = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtMetric = (value: number, metric: Metric) => metric === 'amount' ? fmtAmount(value) : fmtQty(value);
const fmtSignedMetric = (value: number, metric: Metric) => (value > 0 ? '+' : value < 0 ? '-' : '') + fmtMetric(Math.abs(value), metric);
const fmtPercent = (value: number | null) => value === null ? '-' : `${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(value).toFixed(1)}%`;
const fmtDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};

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

function yearFromOrder(row: SalesOrderRow) {
  if (!row.ordDate) return '';
  const date = new Date(row.ordDate);
  if (Number.isNaN(date.getTime())) return '';
  return String(date.getFullYear());
}

function isAfter(left: string | null, right: string | null) {
  if (!left) return false;
  if (!right) return true;
  const leftDate = new Date(left).getTime();
  const rightDate = new Date(right).getTime();
  if (Number.isNaN(leftDate)) return false;
  if (Number.isNaN(rightDate)) return true;
  return leftDate > rightDate;
}

function buildCustomerTrends(rows: SalesOrderRow[], metric: Metric, primaryYear: string, compareYear: string) {
  const map = new Map<string, CustomerAccumulator>();

  rows.forEach(row => {
    const customerCode = row.customerCode || 'UNKNOWN';
    const group = groupConfig(getCustomerGroupId(customerCode));
    const current = map.get(customerCode) || {
      customerCode,
      customerName: row.customerName || customerCode,
      groupLabel: group.label,
      groupColor: group.color,
      amount: 0,
      qty: 0,
      shippedQty: 0,
      gapQty: 0,
      orderNos: new Set<string>(),
      lateOrderNos: new Set<string>(),
      primaryValue: 0,
      compareValue: compareYear === 'none' ? null : 0,
      itemStats: new Map<string, ItemStat>(),
      lastOrderNo: '',
      lastOrderDate: null,
    };

    const amount = Number(row.amount || 0);
    const qty = Number(row.orderQty || 0);
    const shippedQty = Number(row.shippedQty || 0);
    const metricValue = metric === 'amount' ? amount : qty;
    const orderYear = yearFromOrder(row);

    current.amount += amount;
    current.qty += qty;
    current.shippedQty += shippedQty;
    current.gapQty += Math.max(qty - shippedQty, 0);
    if (row.orderNo) current.orderNos.add(row.orderNo);
    if (row.status === 'Late' && row.orderNo) current.lateOrderNos.add(row.orderNo);
    if (orderYear === primaryYear) current.primaryValue += metricValue;
    if (compareYear !== 'none' && orderYear === compareYear) current.compareValue = Number(current.compareValue || 0) + metricValue;

    if (row.itemNo) {
      const item = current.itemStats.get(row.itemNo) || { itemNo: row.itemNo, qty: 0, amount: 0, orderCount: 0 };
      item.qty += qty;
      item.amount += amount;
      item.orderCount += 1;
      current.itemStats.set(row.itemNo, item);
    }

    if (isAfter(row.ordDate, current.lastOrderDate)) {
      current.lastOrderDate = row.ordDate;
      current.lastOrderNo = row.orderNo;
    }

    map.set(customerCode, current);
  });

  return Array.from(map.values()).map(row => {
    const topItem = Array.from(row.itemStats.values()).sort((a, b) => {
      const primary = metric === 'amount' ? b.amount - a.amount : b.qty - a.qty;
      return primary || b.orderCount - a.orderCount || a.itemNo.localeCompare(b.itemNo);
    })[0];

    return {
      customerCode: row.customerCode,
      customerName: row.customerName,
      groupLabel: row.groupLabel,
      groupColor: row.groupColor,
      amount: row.amount,
      qty: row.qty,
      shippedQty: row.shippedQty,
      gapQty: row.gapQty,
      orderCount: row.orderNos.size,
      lateCount: row.lateOrderNos.size,
      primaryValue: row.primaryValue,
      compareValue: row.compareValue,
      topItemNo: topItem?.itemNo || '-',
      topItemQty: topItem?.qty || 0,
      topItemAmount: topItem?.amount || 0,
      lastOrderNo: row.lastOrderNo || '-',
      lastOrderDate: row.lastOrderDate,
    };
  }).sort((a, b) => {
    const primary = metric === 'amount' ? b.amount - a.amount : b.qty - a.qty;
    return primary || a.customerCode.localeCompare(b.customerCode);
  });
}
function growthPct(primaryValue: number, compareValue: number | null) {
  if (compareValue === null) return null;
  if (compareValue === 0 && primaryValue === 0) return 0;
  if (compareValue === 0) return null;
  return ((primaryValue - compareValue) / compareValue) * 100;
}

function recentOrderRows(rows: SalesOrderRow[]) {
  return [...rows].sort((a, b) => {
    const right = b.ordDate ? new Date(b.ordDate).getTime() : 0;
    const left = a.ordDate ? new Date(a.ordDate).getTime() : 0;
    return right - left || String(b.orderNo || '').localeCompare(String(a.orderNo || ''));
  }).slice(0, 18);
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
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [topItems, setTopItems] = useState<TopItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

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

  const loadCustomerTrends = useCallback(async () => {
    if (selectedYears.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const [orderData, itemData] = await Promise.all([
        fetchSalesOrders({ years: selectedYears, months: selectedMonths, customers }),
        fetchTopItems({ years: selectedYears, months: selectedMonths, customers, metric, limit: 50 }),
      ]);
      setOrders(orderData);
      setTopItems(itemData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer trends');
    } finally {
      setLoading(false);
    }
  }, [selectedYears, selectedMonths, customers, metric]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadCustomerTrends(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadCustomerTrends]);

  const primaryYear = selectedYears[selectedYears.length - 1] || availableYears[availableYears.length - 1] || '';
  const compareYear = selectedYears.find(year => year !== primaryYear) || 'none';
  const customerTrends = useMemo(() => buildCustomerTrends(orders, metric, primaryYear, compareYear), [orders, metric, primaryYear, compareYear]);
  const filteredCustomerTrends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customerTrends;
    return customerTrends.filter(row => [row.customerCode, row.customerName, row.groupLabel, row.topItemNo, row.lastOrderNo].some(value => String(value || '').toLowerCase().includes(q)));
  }, [customerTrends, search]);
  const recentOrders = useMemo(() => recentOrderRows(orders), [orders]);

  const kpi = useMemo(() => {
    const orderNos = new Set<string>();
    const lateOrders = new Set<string>();
    let amount = 0;
    let qty = 0;
    let shipped = 0;
    orders.forEach(row => {
      if (row.orderNo) orderNos.add(row.orderNo);
      if (row.status === 'Late' && row.orderNo) lateOrders.add(row.orderNo);
      amount += Number(row.amount || 0);
      qty += Number(row.orderQty || 0);
      shipped += Number(row.shippedQty || 0);
    });
    return { amount, qty, shipped, gap: Math.max(qty - shipped, 0), orders: orderNos.size, late: lateOrders.size };
  }, [orders]);

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase();
    setSearchDraft(nextSearch);
    setSearch(nextSearch);
  };

  const clearSearch = () => {
    setSearchDraft('');
    setSearch('');
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') applySearch();
    if (event.key === 'Escape') setSearchDraft(search.toUpperCase());
  };

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

  const detailParams = (customerCode?: string) => {
    const params = new URLSearchParams();
    if (selectedYears.length) params.set('years', selectedYears.join(','));
    if (selectedMonths.length) params.set('months', selectedMonths.join(','));
    if (customerCode) params.set('customers', customerCode);
    else if (customers.length) params.set('customers', customers.join(','));
    if (!customerCode && selectedGroups.length) params.set('groups', selectedGroups.join(','));
    params.set('metric', metric);
    return params;
  };

  const openDetail = (customerCode?: string) => {
    navigate(`/dashboard/sales-customer-detail?${detailParams(customerCode).toString()}`);
  };

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'CUSTOMER TRENDS' }]} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="p-6 flex flex-col gap-4 w-full">
          <div style={pageHeader}>
            <div>
              <h1 style={pageTitle}>Customer Trends</h1>
              <p style={pageSubtitle}>Customer movement built from real order lines, with item drivers and latest order evidence.</p>
            </div>
            <div style={headerActions}>
              <SearchBox value={searchDraft} onChange={value => setSearchDraft(value.toUpperCase())} onKeyDown={handleSearchKeyDown} onApply={applySearch} onClear={clearSearch} active={Boolean(search)} />
              <SegmentButton active={metric === 'amount'} onClick={() => setMetric('amount')} icon={<DollarSign size={14} />} label="Amount" />
              <SegmentButton active={metric === 'qty'} onClick={() => setMetric('qty')} icon={<Hash size={14} />} label="Qty" />
              <button onClick={() => openDetail()} style={primaryButton}>Order List <ArrowRight size={14} /></button>
            </div>
          </div>

          <div style={kpiGrid}>
            <Kpi icon={<DollarSign size={18} />} label="Sales Amount" value={fmtAmount(kpi.amount)} />
            <Kpi icon={<Hash size={18} />} label="Ordered Qty" value={fmtQty(kpi.qty)} />
            <Kpi icon={<PackageSearch size={18} />} label="Open Gap Qty" value={fmtQty(kpi.gap)} />
            <Kpi icon={<Users size={18} />} label="Orders / Late" value={`${fmtQty(kpi.orders)} / ${fmtQty(kpi.late)}`} />
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
          {loading && <div className="sales-dense-loading-text"><RefreshCw size={14} className="animate-spin" /> Loading customer, item, and order evidence...</div>}
          <Panel title="Customer Evidence Matrix" icon={<Users size={14} />} action={<span style={panelMeta}>{loading ? 'Loading...' : `${fmtQty(filteredCustomerTrends.length)} customers`}</span>}>
            <div className="content-scrollbar sales-dense-scroll" style={customerTableScroll}>
              <table className="sales-dense-table sales-dense-table--sticky-first" style={{ minWidth: 1320 }}>
                <thead>
                  <tr>
                    {['Customer', 'Group', 'Orders', 'Late', 'Ord Qty', 'Shipped', 'Gap', 'Amount', 'Top Item', 'Last Order', primaryYear || 'Primary', compareYear === 'none' ? 'Compare' : compareYear, 'Delta', 'Growth', 'Actions'].map((head, index) => <th key={head} className={(index >= 2 && index <= 7) || (index >= 10 && index <= 13) ? 'sales-dense-table__number' : undefined}>{head}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading && <TableSkeletonRows columns={15} rows={10} />}
                  {!loading && filteredCustomerTrends.length === 0 && <EmptyRow colSpan={15} label="No customer evidence matches the current filter." />}
                  {!loading && filteredCustomerTrends.map(row => {
                    const delta = row.compareValue === null ? null : row.primaryValue - row.compareValue;
                    const pct = growthPct(row.primaryValue, row.compareValue);
                    const deltaTone = delta === null ? 'sales-dense-table__tone-muted' : delta >= 0 ? 'sales-dense-table__tone-up' : 'sales-dense-table__tone-down';
                    return (
                      <tr key={row.customerCode}>
                        <td style={tdItem}><button onClick={() => openDetail(row.customerCode)} style={linkButton}>{row.customerName}</button><div style={subText}>{row.customerCode}</div></td>
                        <td style={tdStrong}><span style={{ ...groupDot, background: row.groupColor }} />{row.groupLabel}</td>
                        <td style={tdRight}>{fmtQty(row.orderCount)}</td>
                        <td style={{ ...tdRight, color: row.lateCount > 0 ? 'var(--color-danger-500)' : 'var(--color-text-primary)', fontWeight: row.lateCount > 0 ? 900 : 800 }}>{fmtQty(row.lateCount)}</td>
                        <td style={tdRight}>{fmtQty(row.qty)}</td>
                        <td style={tdRight}>{fmtQty(row.shippedQty)}</td>
                        <td style={tdRight}>{fmtQty(row.gapQty)}</td>
                        <td style={tdRight}>{fmtAmount(row.amount)}</td>
                        <td style={tdItem}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(row.topItemNo)}`)} style={linkButton}>{row.topItemNo}</button><div style={subText}>{fmtMetric(metric === 'amount' ? row.topItemAmount : row.topItemQty, metric)}</div></td>
                        <td style={tdItem}>{row.lastOrderNo}<div style={subText}>{fmtDate(row.lastOrderDate)}</div></td>
                        <td style={tdRight}>{fmtMetric(row.primaryValue, metric)}</td>
                        <td style={tdRight}>{row.compareValue === null ? '-' : fmtMetric(row.compareValue, metric)}</td>
                        <td className={deltaTone} style={tdRight}>{delta === null ? '-' : fmtSignedMetric(delta, metric)}</td>
                        <td className={pct === null ? 'sales-dense-table__tone-muted' : pct >= 0 ? 'sales-dense-table__tone-up' : 'sales-dense-table__tone-down'} style={tdRight}>{fmtPercent(pct)}</td>
                        <td style={td}><button onClick={() => openDetail(row.customerCode)} title="Open customer order list" className="sales-dense-action"><Eye size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div style={twoColumnGrid}>
            <Panel title="Item Drivers" icon={<PackageSearch size={14} />} action={<span style={panelMeta}>Top {Math.min(topItems.length, 50)} by {metric === 'amount' ? 'amount' : 'qty'}</span>}>
              <div className="content-scrollbar sales-dense-scroll" style={tableScroll}>
                <table className="sales-dense-table sales-dense-table--sticky-first" style={{ minWidth: 980 }}>
                  <thead>
                    <tr>
                      {['Item No', 'Primary Customer', 'Group', 'Type', 'Orders', 'Ordered Qty', 'Shipped Qty', 'Sales Amount', 'Avg Price'].map((head, index) => <th key={head} className={index >= 4 ? 'sales-dense-table__number' : undefined}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <TableSkeletonRows columns={9} />}
                    {!loading && topItems.length === 0 && <EmptyRow colSpan={9} label="No item drivers match the current filter." />}
                    {!loading && topItems.map((item, index) => (
                      <tr key={`${item.itemNo}-${index}`}>
                        <td style={tdItem}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(item.itemNo)}`)} style={linkButton}>{item.itemNo}</button><div style={subText}>{item.itemDesc || '-'}</div></td>
                        <td style={tdStrong}>{item.primaryCustomerName || item.primaryCustomerCode || '-'}</td>
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

            <Panel title="Recent Order Evidence" icon={<Eye size={14} />} action={<button onClick={() => openDetail()} style={linkAction}>Open Full List</button>}>
              <div className="content-scrollbar sales-dense-scroll" style={tableScroll}>
                <table className="sales-dense-table sales-dense-table--sticky-first" style={{ minWidth: 1040 }}>
                  <thead>
                    <tr>
                      {['Order No', 'Item No', 'Ord Date', 'Customer', 'Type', 'Ord Qty', 'Shipped', 'Amount', 'Status'].map((head, index) => <th key={head} className={index >= 5 && index <= 7 ? 'sales-dense-table__number' : undefined}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <TableSkeletonRows columns={9} />}
                    {!loading && recentOrders.length === 0 && <EmptyRow colSpan={9} label="No order lines match the current filter." />}
                    {!loading && recentOrders.map(row => {
                      const shippedPct = row.orderQty > 0 ? Math.min(100, Math.round((row.shippedQty / row.orderQty) * 100)) : 0;
                      return (
                        <tr key={`${row.orderNo}-${row.itemNo}`}>
                          <td style={tdItem}>{row.orderNo}<div style={subText}>{row.poNo || '-'}</div></td>
                          <td style={tdItem}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(row.itemNo)}`)} style={linkButton}>{row.itemNo}</button></td>
                          <td style={td}>{fmtDate(row.ordDate)}</td>
                          <td style={tdStrong}>{row.customerName}<div style={subText}>{row.customerCode}</div></td>
                          <td style={td}>{productTypeLabel(row.itemType, row.itemTypeName)}</td>
                          <td style={tdRight}>{fmtQty(row.orderQty)}</td>
                          <td style={tdRight}><span style={shippedCell}><span className="sales-dense-progress"><span style={{ width: `${shippedPct}%` }} /></span>{fmtQty(row.shippedQty)}</span></td>
                          <td style={tdRight}>{fmtAmount(row.amount)}</td>
                          <td style={td}><StatusBadge status={row.status} /></td>

                        </tr>
                      );
                    })}
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
function SearchBox({ value, onChange, onKeyDown, onApply, onClear, active }: { value: string; onChange: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void; onApply: () => void; onClear: () => void; active: boolean }) {
  return (
    <label style={searchBox}>
      <Search size={14} style={searchIcon} />
      <input value={value} onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder="Search customer, item, order..." style={searchInput} />
      {active ? <button type="button" onClick={onClear} title="Clear search" style={searchClear}><X size={13} /></button> : <button type="button" onClick={onApply} title="Apply search" style={searchApply}>Enter</button>}
    </label>
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
  return <section className="sales-dense-panel" style={panel}><div className="sales-dense-panel__header"><h2 style={panelTitle}>{icon}{title}</h2>{action}</div>{children}</section>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} className="sales-dense-empty">{label}</td></tr>;
}

function StatusBadge({ status }: { status: SalesOrderRow['status'] }) {
  const tone = status === 'Shipped' ? 'success' : status === 'Late' ? 'danger' : status === 'Partial' ? 'warning' : 'info';
  return <span className={`sales-dense-badge sales-dense-badge--${tone}`}>{status}</span>;
}

function TableSkeletonRows({ columns, rows = 8 }: { columns: number; rows?: number }) {
  const widths = [70, 46, 56, 62, 54, 74, 66, 50, 58];
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

const pageHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' };
const pageTitle: CSSProperties = { margin: 0, fontSize: '1.5rem', lineHeight: 1.2, fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: 0 };
const pageSubtitle: CSSProperties = { marginTop: 4, color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800 };
const headerActions: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const primaryButton: CSSProperties = { height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-brand-500)', background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const segmentButton: CSSProperties = { height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const segmentActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)' };
const searchBox: CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center', width: 'min(360px, 100%)' };
const searchIcon: CSSProperties = { position: 'absolute', left: 10, color: 'var(--color-text-tertiary)' };
const searchInput: CSSProperties = { width: '100%', height: 36, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '8px 58px 8px 32px', color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, outline: 'none', fontFamily: 'var(--font-body)' };
const searchApply: CSSProperties = { position: 'absolute', right: 5, height: 26, border: '1px solid var(--color-border-light)', borderRadius: 6, background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', fontSize: '0.64rem', fontWeight: 900, padding: '0 7px', cursor: 'pointer' };
const searchClear: CSSProperties = { position: 'absolute', right: 5, width: 26, height: 26, display: 'grid', placeItems: 'center', border: '1px solid var(--color-border-light)', borderRadius: 6, background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', cursor: 'pointer' };
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
const panel: CSSProperties = { minWidth: 0 };
const panelTitle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 900 };
const panelMeta: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: 900 };
const linkAction: CSSProperties = { border: 'none', background: 'transparent', color: 'var(--color-brand-600)', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer' };
const twoColumnGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(560px, 100%), 1fr))', gap: 14 };
const customerTableScroll: CSSProperties = { maxHeight: 500 };
const tableScroll: CSSProperties = { maxHeight: 430 };
const td: CSSProperties = { height: 48, padding: '6px 8px', color: 'var(--color-text-primary)', fontSize: '11px', fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const tdStrong: CSSProperties = { ...td, fontWeight: 900 };
const tdItem: CSSProperties = { ...tdStrong, whiteSpace: 'normal' };
const tdRight: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const subText: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: '0.68rem', fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const linkButton: CSSProperties = { background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' };
const groupDot: CSSProperties = { display: 'inline-block', width: 8, height: 8, borderRadius: 999, marginRight: 8 };
const shippedCell: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 };
const errorText: CSSProperties = { color: 'var(--color-danger-500)', fontWeight: 800, fontSize: '0.8rem' };