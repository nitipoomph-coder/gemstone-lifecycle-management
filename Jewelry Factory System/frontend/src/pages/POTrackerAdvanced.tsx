// src/pages/POTrackerAdvanced.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import OrderTable from '../components/dashboard/OrderTable';
import { GROUP_PRESETS } from '../components/dashboard/orderTableConfig';
import CustomViewModal from '../components/dashboard/CustomViewModal';
import CustomSelect from '../components/ui/CustomSelect';
import { fetchOrders, type OrderSummary } from '../services/orderAPI';
import { RefreshCw, AlertTriangle, Package, LayoutGrid, DollarSign, Filter, X, Layers } from 'lucide-react';
import { getErrorMessage } from '../utils/errors';

type StatusFilter = 'pending' | 'finish' | 'all';
const EMPTY_ORDERS: OrderSummary[] = [];

const parseStatusFilter = (value: string | null): StatusFilter =>
  value === 'finish' || value === 'all' ? value : 'pending';

const getSavedColumns = (group: string): string[] => {
  if (group !== 'CUSTOM') return GROUP_PRESETS[group] || GROUP_PRESETS.ALL;
  const saved = localStorage.getItem('poTrackerCustomCols');
  if (!saved) return GROUP_PRESETS.ALL;
  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.every(key => typeof key === 'string') ? parsed : GROUP_PRESETS.ALL;
  } catch {
    return GROUP_PRESETS.ALL;
  }
};

const getDefaultDateRange = () => {
  const from = new Date();
  from.setMonth(from.getMonth() - 7);
  return { from: from.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] };
};

export default function POTrackerAdvanced() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const search = searchParams.get('search') || '';

  const [selectedStatusFilter, setStatusFilter] = useState<StatusFilter>(() => parseStatusFilter(searchParams.get('status')));
  const [selectedGroupFilter, setGroupFilter] = useState<string>(() => searchParams.get('group') || 'N008');
  const [dateType, setDateType] = useState(() => searchParams.get('dateType') || 'Order Date');
  const [requestedPage, setPage] = useState(() => parseInt(searchParams.get('page') || '1'));
  const [pageSize, setPageSize] = useState(() => parseInt(searchParams.get('pageSize') || '20'));

  const [filterType, setFilterType] = useState(() => searchParams.get('fType') || '');
  const [filterWeek, setFilterWeek] = useState(() => searchParams.get('fWeek') || '');
  const [filterCust, setFilterCust] = useState(() => searchParams.get('fCust') || '');
  const [filterPO, setFilterPO] = useState(() => searchParams.get('fPO') || '');
  const [filterShipTo, setFilterShipTo] = useState(() => searchParams.get('fShipTo') || '');

  const [showFiltersPopover, setShowFiltersPopover] = useState(false);

  // ⭐️ Column Picker state (lifted from OrderTable)
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || getDefaultDateRange().to);

  const smartFilters = useMemo(() => {
    const keywords = search.toLowerCase().split(' ').filter(Boolean);
    let status: StatusFilter | undefined;
    let group: string | undefined;

    if (keywords.some(k => ['pending', 'ค้าง', 'p'].includes(k))) status = 'pending';
    else if (keywords.some(k => ['finish', 'เสร็จ', 'f', 'complete'].includes(k))) status = 'finish';
    else if (keywords.some(k => ['all', 'ทั้งหมด'].includes(k))) status = 'all';

    if (keywords.some(k => k.includes('n098'))) group = 'N098';
    else if (keywords.some(k => k.includes('n083'))) group = 'N083';
    else if (keywords.some(k => k.includes('n051'))) group = 'N051';
    else if (keywords.some(k => k.includes('n044'))) group = 'N044';
    else if (keywords.some(k => k.includes('mlt') || k.startsWith('u'))) group = 'MLT';
    else {
      const n008List = ['n008', 'n048', 'n066', 'n067', 'n068', 'n069', 'n070', 'n071', 'n072', 'n073', 'n074', 'n075'];
      if (keywords.some(k => n008List.some(code => k.includes(code)))) group = 'N008';
    }

    return { status, group };
  }, [search]);

  const statusFilter = smartFilters.status ?? selectedStatusFilter;
  const groupFilter = smartFilters.group ?? selectedGroupFilter;

  const [columnState, setColumnState] = useState(() => ({ group: groupFilter, keys: getSavedColumns(groupFilter) }));
  const visibleKeys = columnState.group === groupFilter ? columnState.keys : getSavedColumns(groupFilter);
  const setVisibleKeys = (keys: string[]) => setColumnState({ group: groupFilter, keys });

  const [refreshVersion, setRefreshVersion] = useState(0);
  const ordersKey = `${statusFilter}:${dateType}:${dateFrom}:${dateTo}:${refreshVersion}`;
  const [ordersState, setOrdersState] = useState<{
    key: string;
    orders: OrderSummary[];
    error: string | null;
  }>({ key: '', orders: [], error: null });
  const hasCurrentOrders = ordersState.key === ordersKey;
  const orders = hasCurrentOrders ? ordersState.orders : EMPTY_ORDERS;
  const error = hasCurrentOrders ? ordersState.error : null;
  const loading = !hasCurrentOrders;

  // Sync state back to URL automatically
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'pending') params.set('status', statusFilter);
    if (groupFilter !== 'N008') params.set('group', groupFilter);
    if (dateType !== 'Order Date') params.set('dateType', dateType);
    if (requestedPage !== 1) params.set('page', requestedPage.toString());
    if (pageSize !== 20) params.set('pageSize', pageSize.toString());
    if (filterType) params.set('fType', filterType);
    if (filterWeek) params.set('fWeek', filterWeek);
    if (filterCust) params.set('fCust', filterCust);
    if (filterPO) params.set('fPO', filterPO);
    if (filterShipTo) params.set('fShipTo', filterShipTo);

    const defaultRange = getDefaultDateRange();
    if (dateFrom !== defaultRange.from) params.set('dateFrom', dateFrom);
    if (dateTo !== defaultRange.to) params.set('dateTo', dateTo);

    navigate({ search: params.toString() }, { replace: true });
  }, [search, statusFilter, groupFilter, dateType, requestedPage, pageSize, dateFrom, dateTo, filterType, filterWeek, filterCust, filterPO, filterShipTo, navigate]);

  useEffect(() => {
    let cancelled = false;
    fetchOrders({
        status: statusFilter as 'pending' | 'all' | 'finish',
        dateType: dateType,
        dateFrom: dateFrom,
        dateTo: dateTo
      })
      .then(result => {
        if (cancelled) return;
        if (result.ok) {
          setOrdersState({ key: ordersKey, orders: result.data, error: null });
        } else {
          setOrdersState({ key: ordersKey, orders: [], error: result.error || 'Failed to load data from API' });
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setOrdersState({ key: ordersKey, orders: [], error: getErrorMessage(requestError, 'Failed to load data') });
        }
      });
    return () => { cancelled = true; };
  }, [statusFilter, dateType, dateFrom, dateTo, ordersKey]);

  const load = () => setRefreshVersion(version => version + 1);

  // ⭐️ Smart Selection Locking: reset columns when group changes
  // Save to localStorage when visibleKeys change in CUSTOM mode
  useEffect(() => {
    if (groupFilter === 'CUSTOM') {
      localStorage.setItem('poTrackerCustomCols', JSON.stringify(visibleKeys));
    }
  }, [visibleKeys, groupFilter]);

  const [showCustomViewModal, setShowCustomViewModal] = useState(false);

  const filtered = useMemo(() => {
    let filteredList = orders;

    // Group Filter
    if (groupFilter !== 'ALL' && groupFilter !== 'CUSTOM') {
      if (groupFilter === 'N008') {
        const n008List = ['N008', 'N048', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'];
        filteredList = filteredList.filter(o => o.CustCode && n008List.some(code => o.CustCode!.includes(code)));
      }
      else if (groupFilter === 'MLT') filteredList = filteredList.filter(o => o.CustCode?.includes('MLT') || o.CustCode?.startsWith('U'));
      else if (groupFilter === 'N083') filteredList = filteredList.filter(o => o.CustCode?.includes('N083'));
      else if (groupFilter === 'N044') filteredList = filteredList.filter(o => o.CustCode?.includes('N044'));
      else if (groupFilter === 'N098') filteredList = filteredList.filter(o => o.CustCode?.includes('N098'));
      else if (groupFilter === 'N051') filteredList = filteredList.filter(o => o.CustCode?.includes('N051'));
    }

    // Smart Keyword Filtering
    if (search.trim()) {
      const q = search.toLowerCase();
      const keywords = q.split(' ').filter(k => k.length > 0);

      // กรองคำที่เป็น metadata ออก (เช่นคำที่ใช้เลือก status/group ไปแล้ว)
      const dataKeywords = keywords.filter(k =>
        !['pending', 'ค้าง', 'finish', 'เสร็จ', 'all', 'ทั้งหมด', 'late', 'สาย', 'ช้า', 'delay'].includes(k) &&
        !['n008', 'n098', 'n083', 'n051', 'n044', 'mlt'].includes(k)
      );

      // ถ้าเหลือ keyword ที่เป็นข้อมูลจริงๆ ให้ค้นหา (ขยายให้ครอบคลุม Week และ ShipTo, Type ด้วย)
      if (dataKeywords.length > 0) {
        filteredList = filteredList.filter(o =>
          dataKeywords.every(kw =>
            o.OrdNo?.toLowerCase().includes(kw) ||
            o.CustCode?.toLowerCase().includes(kw) ||
            o.ShipTo?.toLowerCase().includes(kw) ||
            o.PONo?.toLowerCase().includes(kw) ||
            o.Week?.toString().toLowerCase().includes(kw) ||
            o.OrdKind?.toLowerCase().includes(kw)
          )
        );
      }

      // ตรวจจับ 'Late/Delay' เป็นพิเศษ
      if (keywords.some(k => ['late', 'สาย', 'ช้า', 'delay'].includes(k))) {
        filteredList = filteredList.filter(o => o.DueDate && new Date(o.DueDate) < new Date() && (o.CloseStatus !== 'Y'));
      }
    }

    // --- QUICK COLUMN FILTERS (Smart & Flexible) ---
    const qWeek = filterWeek.trim().toLowerCase();
    if (qWeek) {
      filteredList = filteredList.filter(o => {
        const val = String(o.Week ?? '').trim().toLowerCase();
        return val.includes(qWeek);
      });
    }

    const qCust = filterCust.trim().toLowerCase();
    if (qCust) {
      filteredList = filteredList.filter(o => {
        const val = String(o.CustCode ?? '').trim().toLowerCase();
        return val.includes(qCust);
      });
    }

    const qPO = filterPO.trim().toLowerCase();
    if (qPO) {
      filteredList = filteredList.filter(o => {
        const poVal = String(o.PONo ?? '').trim().toLowerCase();
        const ordVal = String(o.OrdNo ?? '').trim().toLowerCase();
        return poVal.includes(qPO) || ordVal.includes(qPO);
      });
    }

    const qType = filterType.trim().toLowerCase();
    if (qType) {
      filteredList = filteredList.filter(o => {
        const val = String(o.OrdKind ?? '').trim().toLowerCase();
        return val.includes(qType);
      });
    }

    const qShipTo = filterShipTo.trim().toLowerCase();
    if (qShipTo) {
      filteredList = filteredList.filter(o => {
        const val = String(o.ShipTo ?? '').trim().toLowerCase();
        return val.includes(qShipTo);
      });
    }

    return filteredList;
  }, [search, orders, groupFilter, filterType, filterWeek, filterCust, filterPO, filterShipTo]);

  const totalQty = filtered.reduce((s, o) => s + (o.TotalQty || 0), 0);
  const totalAmount = filtered.reduce((s, o) => s + (o.Amount || 0), 0);
  const pendingCount = statusFilter === 'finish' ? 0 : filtered.length;
  const delayedCount = statusFilter === 'finish' ? 0 : filtered.filter(o => o.DueDate && new Date(o.DueDate) < new Date()).length;

  // ⭐ Dynamic Type options — ดึง unique OrdKind จากข้อมูลจริง
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    orders.forEach(o => {
      if (o.OrdKind && o.OrdKind !== '-') types.add(o.OrdKind.trim());
    });
    return Array.from(types).sort();
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pageStart = (page - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  })();

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterWeek) chips.push({ key: 'week', label: `Week: ${filterWeek}`, onClear: () => setFilterWeek('') });
    if (filterCust) chips.push({ key: 'cust', label: `Cust: ${filterCust}`, onClear: () => setFilterCust('') });
    if (filterPO) chips.push({ key: 'po', label: `PO: ${filterPO}`, onClear: () => setFilterPO('') });
    if (filterType) chips.push({ key: 'type', label: `Type: ${filterType}`, onClear: () => setFilterType('') });
    if (filterShipTo) chips.push({ key: 'shipto', label: `ShipTo: ${filterShipTo}`, onClear: () => setFilterShipTo('') });
    if (dateType !== 'Order Date') chips.push({ key: 'datetype', label: `Date: ${dateType}`, onClear: () => setDateType('Order Date') });
    return chips;
  }, [filterWeek, filterCust, filterPO, filterType, filterShipTo, dateType]);
  const activeFilterCount = activeChips.length;

  return (
    <div className="app-page font-body">
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'PO TRACKER' }]} contentLayout="dashboard-wide" />

      <div className="app-page-scroll content-scrollbar">
      <div className="app-content-frame app-content-frame--dashboard-wide app-page-content po-tracker-page flex min-h-full flex-col">

        {/* ─── FILTERS: compact toolbar + popover + active chips ─── */}
        <div className="po-toolbar app-panel" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          background: 'var(--color-surface-0)',
          padding: '14px 20px', marginBottom: activeChips.length > 0 ? '12px' : '24px',
        }}>
          {/* Left: Group + Status pill toggles */}
          <div className="po-toolbar__modes" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Group Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Group</span>
              <div className="po-segmented" style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                {['N008', 'N044', 'N098', 'N051', 'N083', 'MLT', 'ALL'].map(grp => (
                  <button
                    key={grp}
                    onClick={() => setGroupFilter(grp)}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, border: 'none',
                      background: groupFilter === grp ? 'var(--color-surface-0)' : 'transparent',
                      color: groupFilter === grp ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      boxShadow: groupFilter === grp ? '0 2px 8px color-mix(in srgb, var(--color-surface-900) 6%, transparent), 0 0 0 1px var(--color-border-light)' : 'none',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >{grp === 'ALL' ? 'General' : grp}</button>
                ))}
              </div>
            </div>

            {/* Status Toggle — SP ทั้ง 5 dateType รับ @Status แล้ว */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Status</span>
              <div className="po-segmented" style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                {['pending', 'finish', 'all'].map(st => {
                  const isActive = statusFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st as 'pending' | 'finish' | 'all')}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, border: 'none', textTransform: 'capitalize',
                        background: isActive ? 'var(--color-surface-0)' : 'transparent',
                        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        boxShadow: isActive ? '0 2px 8px color-mix(in srgb, var(--color-surface-900) 6%, transparent), 0 0 0 1px var(--color-border-light)' : 'none',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >{st}</button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="po-toolbar__actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCustomViewModal(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                background: 'var(--color-brand-500)',
                border: 'none', color: 'var(--color-ui-on-interactive)', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', transition: 'background-color 0.2s ease'
              }}
              className="hover:bg-[var(--color-brand-600)]"
            >
              <Layers size={16} />
              Custom View
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowFiltersPopover(!showFiltersPopover); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                  background: showFiltersPopover ? 'var(--color-surface-2)' : 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                  color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                }}
                className="hover:bg-surface-2"
              >
                <Filter size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span style={{ background: 'var(--color-brand-500)', color: 'var(--color-ui-on-interactive)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem' }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {showFiltersPopover && (
                <>
                  <div
                    onClick={() => setShowFiltersPopover(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'transparent' }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="po-filter-popover"
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 101,
                      background: 'var(--color-ui-surface)', borderRadius: '8px',
                      boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--color-border-light)',
                      padding: '20px', width: '640px', maxWidth: '92vw',
                      display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Week</label>
                      <input type="text" value={filterWeek} onChange={e => setFilterWeek(e.target.value)} placeholder="Filter Week..." style={{ width: '120px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Customer</label>
                      <input type="text" value={filterCust} onChange={e => setFilterCust(e.target.value)} placeholder="Filter Cust..." style={{ width: '120px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>PO / Order No</label>
                      <input type="text" value={filterPO} onChange={e => setFilterPO(e.target.value)} placeholder="Filter PO/Ord..." style={{ width: '150px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Order Type</label>
                      <CustomSelect
                        value={filterType}
                        onChange={setFilterType}
                        options={[
                          { value: '', label: 'All Types' },
                          ...uniqueTypes.map(t => ({ value: t, label: t }))
                        ]}
                        width="140px"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Ship To</label>
                      <input type="text" value={filterShipTo} onChange={e => setFilterShipTo(e.target.value)} placeholder="Filter ShipTo..." style={{ width: '150px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                    </div>

                    <div className="po-filter-date-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '300px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Date Range</label>
                      <div className="po-date-range" style={{ display: 'flex', alignItems: 'center', borderRadius: '8px', gap: '8px' }}>
                        <CustomSelect
                          value={dateType}
                          onChange={setDateType}
                          options={[
                            { value: 'Order Date', label: 'Order Date' },
                            { value: 'Factory Due Date', label: 'Factory Due Date' },
                            { value: 'Cust Due Date', label: 'Cust Due Date' },
                            { value: 'Finish Date', label: 'Finish Date' },
                            { value: 'All', label: 'All Dates' }
                          ]}
                          width="140px"
                        />
                        <div className="po-date-inputs" style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: '8px', flex: 1, border: '1px solid var(--color-border-strong)', borderRadius: '8px', background: 'var(--color-surface-0)' }}>
                          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.65rem', fontWeight: 800 }}>TO</span>
                          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                        </div>
                      </div>
                    </div>

                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => {
                          setFilterWeek(''); setFilterCust(''); setFilterPO(''); setFilterType(''); setFilterShipTo('');
                          setDateType('Order Date');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '10px 16px', borderRadius: '10px',
                          background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border-strong)',
                          fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        className="hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200"
                      >
                        <X size={16} />
                        Clear Filters
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={load}
              disabled={loading}
              style={{
                padding: '10px 18px', borderRadius: '8px', background: 'var(--color-brand-500)', color: 'var(--color-ui-on-interactive)',
                border: 'none', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', transition: 'background-color 0.2s ease'
              }}
              className="hover:bg-brand-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'REFRESHING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Active filter chips — only rendered when something is set, so the toolbar above stays the only thing visible by default */}
        {activeChips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {activeChips.map(chip => (
              <div
                key={chip.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '20px',
                  background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                  padding: '6px 6px 6px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)'
                }}
              >
                <span>{chip.label}</span>
                <button
                  onClick={chip.onClear}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18,
                    borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-tertiary)'
                  }}
                  className="hover:bg-danger-100 hover:text-danger-600"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ─── KPI TILES (Flat icon-circle, static display — consistent with PCC Subcontract Management) ─── */}
        <div className="po-kpi-grid">
          {[
            { id: 'total', label: 'ACTIVE ORDERS', value: filtered.length.toLocaleString(), color: 'var(--color-brand-500)', icon: <Package size={20} /> },
            { id: 'qty', label: 'TOTAL QTY', value: totalQty.toLocaleString(), color: 'var(--color-brand-500)', icon: <LayoutGrid size={20} /> },
            { id: 'amount', label: 'TOTAL AMOUNT', value: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'var(--color-brand-500)', icon: <DollarSign size={20} /> },
            { id: 'pending', label: 'PENDING', value: pendingCount.toLocaleString(), color: 'var(--color-warning-600)', icon: <AlertTriangle size={20} /> },
            { id: 'late', label: 'LATE', value: delayedCount.toLocaleString(), color: 'var(--color-danger-600)', icon: <RefreshCw size={20} /> },
          ].map((stat) => (
            <div
              key={stat.id}
              style={{
                background: 'var(--color-surface-0)',
                padding: '16px', borderRadius: '8px',
                border: '1px solid var(--color-border-light)',
                display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: '0 2px 8px color-mix(in srgb, var(--color-surface-900) 4%, transparent)',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: '8px', flexShrink: 0, background: `color-mix(in srgb, ${stat.color} 14%, var(--color-surface-1))`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>{stat.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, margin: '2px 0 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── DATA TABLE — outer box owns the leftover viewport space (invisible, no chrome);
             inner card shrinks to its actual content and only grows up to that budget when the
             table is long enough to need it, so a short result set doesn't leave an empty box ─── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'var(--color-surface-0)', borderRadius: '8px', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-panel)', overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {error && <div style={{ padding: '16px', background: 'var(--color-danger-50)', borderBottom: '1px solid var(--color-danger-500)', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} style={{ color: 'var(--color-danger-600)' }} /> <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-600)' }}>{error}</span></div>}

          <OrderTable
            data={paged}
            loading={loading}
            pageOffset={pageStart}
            visibleKeys={visibleKeys}
          />

          {/* Single Pagination Bar — record count, page size, and page nav together */}
          {!loading && filtered.length > 0 && (
            <div className="po-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', gap: '12px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                Showing <strong style={{ color: 'var(--color-text-primary)' }}>{pageStart + 1}</strong>–<strong style={{ color: 'var(--color-text-primary)' }}>{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong style={{ color: 'var(--color-brand-600)' }}>{filtered.length.toLocaleString()}</strong>
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid var(--color-border-light)', background: page === 1 ? 'transparent' : 'var(--color-surface-1)', color: page === 1 ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }} className="hover:bg-surface-2 active:scale-95">Prev</button>
                  {pageNumbers.map((p, i) => p === '...' ? <span key={i} style={{ color: 'var(--color-text-quaternary)', padding: '0 8px' }}>...</span> : (
                    <button key={i} onClick={() => setPage(p as number)} style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`, background: page === p ? 'var(--color-brand-500)' : 'transparent', color: page === p ? 'var(--color-ui-on-interactive)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 900, minWidth: '38px', transition: 'all 0.2s' }} className="hover:bg-surface-1 active:scale-95">{p}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid var(--color-border-light)', background: page === totalPages ? 'transparent' : 'var(--color-surface-1)', color: page === totalPages ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }} className="hover:bg-surface-2 active:scale-95">Next</button>
                </div>

                <div style={{ width: '1px', height: '16px', background: 'var(--color-border-strong)' }} />

                <select
                  value={String(pageSize)}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--color-border-strong)',
                    background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)',
                    fontSize: '0.75rem', fontWeight: 700, outline: 'none', cursor: 'pointer'
                  }}
                  className="hover:border-brand-400"
                >
                  <option value="20">20 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                </select>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      </div>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .animate-spin{animation:spin 1s linear infinite}
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <CustomViewModal
        isOpen={showCustomViewModal}
        onClose={() => setShowCustomViewModal(false)}
        initialVisibleKeys={visibleKeys}
        initialGroup={groupFilter}
        onApply={(grp, keys) => {
          setGroupFilter(grp);
          setVisibleKeys(keys);
        }}
      />
    </div>
  );
}
