// src/pages/POTrackerAdvanced.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import OrderTable, { MASTER_COLS, GROUP_PRESETS, COLUMN_GROUPS } from '../components/dashboard/OrderTable';
import CustomViewModal from '../components/dashboard/CustomViewModal';
import CustomSelect from '../components/ui/CustomSelect';
import { fetchOrders, type OrderSummary } from '../services/orderAPI';
import { RefreshCw, AlertTriangle, Package, LayoutGrid, DollarSign, Filter, X, Layers, Search } from 'lucide-react';

const getDefaultDateRange = () => {
  const from = new Date();
  from.setMonth(from.getMonth() - 7);
  return { from: from.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] };
};

export default function POTrackerAdvanced() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [filtered, setFiltered] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);

  const [statusFilter, setStatusFilter] = useState<'pending' | 'finish' | 'all'>(() => (searchParams.get('status') as any) || 'pending');
  const [groupFilter, setGroupFilter] = useState<string>(() => searchParams.get('group') || 'N008');
  const [dateType, setDateType] = useState(() => searchParams.get('dateType') || 'Order Date');
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') || '1'));
  const [pageSize, setPageSize] = useState(() => parseInt(searchParams.get('pageSize') || '20'));

  const [filterType, setFilterType] = useState(() => searchParams.get('fType') || '');
  const [filterWeek, setFilterWeek] = useState(() => searchParams.get('fWeek') || '');
  const [filterCust, setFilterCust] = useState(() => searchParams.get('fCust') || '');
  const [filterPO, setFilterPO] = useState(() => searchParams.get('fPO') || '');
  const [filterShipTo, setFilterShipTo] = useState(() => searchParams.get('fShipTo') || '');

  const [showFiltersPopover, setShowFiltersPopover] = useState(false);

  // ⭐️ Column Picker state (lifted from OrderTable)
  const [visibleKeys, setVisibleKeys] = useState<string[]>(GROUP_PRESETS[groupFilter] || GROUP_PRESETS.ALL);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const lastGroupRef = useRef(groupFilter);

  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || getDefaultDateRange().to);

  // Sync state back to URL automatically
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'pending') params.set('status', statusFilter);
    if (groupFilter !== 'N008') params.set('group', groupFilter);
    if (dateType !== 'Order Date') params.set('dateType', dateType);
    if (page !== 1) params.set('page', page.toString());
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
  }, [search, statusFilter, groupFilter, dateType, page, pageSize, dateFrom, dateTo, filterType, filterWeek, filterCust, filterPO, filterShipTo, navigate]);

  // Sync search state if URL changes (e.g. from Topbar global search)
  useEffect(() => {
    const s = new URLSearchParams(location.search).get('search');
    if (s !== null && s !== search) {
      setSearch(s);
    }
  }, [location.search, search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOrders({
        status: statusFilter as 'pending' | 'all' | 'finish',
        dateType: dateType,
        dateFrom: dateFrom,
        dateTo: dateTo
      });

      if (result.ok) {
        setOrders(result.data);
      } else {
        setError(result.error || 'Failed to load data from API');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateType, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // ⭐️ Smart Selection Locking: reset columns when group changes
  useEffect(() => {
    if (lastGroupRef.current !== groupFilter) {
      if (groupFilter === 'CUSTOM') {
        const saved = localStorage.getItem('poTrackerCustomCols');
        if (saved) {
          try {
            setVisibleKeys(JSON.parse(saved));
          } catch (e) {
            setVisibleKeys(GROUP_PRESETS.ALL);
          }
        } else {
          setVisibleKeys(GROUP_PRESETS.ALL);
        }
      } else {
        setVisibleKeys(GROUP_PRESETS[groupFilter] || GROUP_PRESETS.ALL);
      }
      lastGroupRef.current = groupFilter;
    }
  }, [groupFilter]);

  // Save to localStorage when visibleKeys change in CUSTOM mode
  useEffect(() => {
    if (groupFilter === 'CUSTOM') {
      localStorage.setItem('poTrackerCustomCols', JSON.stringify(visibleKeys));
    }
  }, [visibleKeys, groupFilter]);

  const [showCustomViewModal, setShowCustomViewModal] = useState(false);

  // --- SMART SEARCH INTELLIGENCE ---
  useEffect(() => {
    if (!search.trim()) return;
    const q = search.toLowerCase();
    const keywords = q.split(' ').filter(k => k.length > 0);

    // 1. ตรวจจับสถานะ (Status Detection)
    if (keywords.some(k => ['pending', 'ค้าง', 'p'].includes(k))) setStatusFilter('pending');
    else if (keywords.some(k => ['finish', 'เสร็จ', 'f', 'complete'].includes(k))) setStatusFilter('finish');
    else if (keywords.some(k => ['all', 'ทั้งหมด'].includes(k))) setStatusFilter('all');

    // 2. ตรวจจับกลุ่ม (Group Detection)
    if (keywords.some(k => k.includes('n083'))) setGroupFilter('N083');
    else if (keywords.some(k => k.includes('n051'))) setGroupFilter('N051');
    else if (keywords.some(k => k.includes('n044'))) setGroupFilter('N044');
    else if (keywords.some(k => k.includes('mlt') || k.startsWith('u'))) setGroupFilter('MLT');
    else {
      const n008List = ['n008', 'n048', 'n066', 'n067', 'n068', 'n069', 'n070', 'n071', 'n072', 'n073', 'n074', 'n075'];
      if (keywords.some(k => n008List.some(code => k.includes(code)))) setGroupFilter('N008');
    }
  }, [search]);

  useEffect(() => {
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
      else if (groupFilter === 'N051') filteredList = filteredList.filter(o => o.CustCode?.includes('N051'));
    }

    // Smart Keyword Filtering
    if (search.trim()) {
      const q = search.toLowerCase();
      const keywords = q.split(' ').filter(k => k.length > 0);

      // กรองคำที่เป็น metadata ออก (เช่นคำที่ใช้เลือก status/group ไปแล้ว)
      const dataKeywords = keywords.filter(k =>
        !['pending', 'ค้าง', 'finish', 'เสร็จ', 'all', 'ทั้งหมด', 'late', 'สาย', 'ช้า', 'delay'].includes(k) &&
        !['n008', 'n083', 'n051', 'n044', 'mlt'].includes(k)
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

    setFiltered(filteredList);
    setPage(1);
  }, [search, orders, statusFilter, groupFilter, filterType, filterWeek, filterCust, filterPO, filterShipTo]);

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

  const totalPages = Math.ceil(filtered.length / pageSize);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-surface-1)', fontFamily: 'var(--font-body)' }}>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'PO TRACKER' }]} />

      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 0, zoom: '0.85' }}>

        {/* ─── FILTERS: compact toolbar + popover + active chips ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          background: 'var(--color-surface-0)', borderRadius: '16px', border: '1px solid var(--color-border-light)',
          padding: '14px 20px', marginBottom: activeChips.length > 0 ? '12px' : '24px',
          boxShadow: '0 8px 32px -8px color-mix(in srgb, var(--color-surface-900) 5%, transparent)'
        }}>
          {/* Left: Group + Status pill toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Group Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Group</span>
              <div style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
                {['N008', 'MLT', 'N083', 'N044', 'N051', 'ALL'].map(grp => (
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
              <div style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCustomViewModal(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-500) 100%)',
                border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--color-brand-500) 40%, transparent)'
              }}
              className="hover:scale-105 active:scale-95"
            >
              <Layers size={16} />
              Custom View
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowFiltersPopover(!showFiltersPopover); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px',
                  background: showFiltersPopover ? 'var(--color-surface-2)' : 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                  color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                }}
                className="hover:bg-surface-2"
              >
                <Filter size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span style={{ background: 'var(--color-brand-500)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem' }}>
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
                    className="animate-fade-in-up"
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 101,
                      background: 'var(--color-surface-1)', borderRadius: '16px',
                      boxShadow: '0 10px 40px -10px color-mix(in srgb, var(--color-surface-900) 25%, transparent), 0 0 0 1px var(--color-border-light)',
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '300px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Date Range</label>
                      <div style={{ display: 'flex', alignItems: 'center', borderRadius: '10px', gap: '8px' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: '8px', flex: 1, border: '1px solid var(--color-border-strong)', borderRadius: '10px', background: 'var(--color-surface-0)' }}>
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
                padding: '10px 18px', borderRadius: '12px', background: 'var(--color-brand-500)', color: 'white',
                border: 'none', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-brand-500) 40%, transparent)'
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { id: 'total', label: 'ACTIVE ORDERS', value: filtered.length.toLocaleString(), color: 'var(--color-brand-500)', icon: <Package size={20} /> },
            { id: 'qty', label: 'TOTAL QTY', value: totalQty.toLocaleString(), color: 'var(--color-brand-500)', icon: <LayoutGrid size={20} /> },
            { id: 'amount', label: 'TOTAL AMOUNT', value: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'var(--color-accent-600)', icon: <DollarSign size={20} /> },
            { id: 'pending', label: 'PENDING', value: pendingCount.toLocaleString(), color: 'var(--color-warning-600)', icon: <AlertTriangle size={20} /> },
            { id: 'late', label: 'LATE', value: delayedCount.toLocaleString(), color: 'var(--color-danger-600)', icon: <RefreshCw size={20} /> },
          ].map((stat, i) => (
            <div
              key={stat.id}
              className="animate-fade-in-up"
              style={{
                background: 'var(--color-surface-0)',
                padding: '20px', borderRadius: '16px',
                border: '1px solid var(--color-border-light)',
                display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: '0 2px 8px color-mix(in srgb, var(--color-surface-900) 4%, transparent)',
                animationDelay: `${i * 0.05}s`
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `color-mix(in srgb, ${stat.color} 16%, var(--color-surface-1))`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        <div style={{ background: 'var(--color-surface-0)', borderRadius: '24px', border: '1px solid var(--color-border-light)', boxShadow: '0 12px 40px -12px color-mix(in srgb, var(--color-surface-900) 8%, transparent)', overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {error && <div style={{ padding: '16px', background: '#fff5f5', borderBottom: '1px solid #ffc9c9', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} style={{ color: '#e03131' }} /> <span style={{ fontSize: '0.85rem', color: '#c92a2a' }}>{error}</span></div>}

          <OrderTable
            data={paged}
            loading={loading}
            pageOffset={pageStart}
            visibleKeys={visibleKeys}
          />

          {/* Single Pagination Bar — record count, page size, and page nav together */}
          {!loading && filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '16px 24px', borderTop: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', gap: '16px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                Showing <strong style={{ color: 'var(--color-text-primary)' }}>{pageStart + 1}</strong>–<strong style={{ color: 'var(--color-text-primary)' }}>{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong style={{ color: 'var(--color-brand-600)' }}>{filtered.length.toLocaleString()}</strong>
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid var(--color-border-light)', background: page === 1 ? 'transparent' : 'var(--color-surface-1)', color: page === 1 ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }} className="hover:bg-surface-2 active:scale-95">Prev</button>
                  {pageNumbers.map((p, i) => p === '...' ? <span key={i} style={{ color: 'var(--color-text-quaternary)', padding: '0 8px' }}>...</span> : (
                    <button key={i} onClick={() => setPage(p as number)} style={{ padding: '6px 14px', borderRadius: '10px', border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`, background: page === p ? 'var(--color-brand-500)' : 'transparent', color: page === p ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 900, minWidth: '38px', transition: 'all 0.2s' }} className="hover:bg-surface-1 active:scale-95">{p}</button>
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
