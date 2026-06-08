// src/pages/POTrackerAdvanced.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import OrderTable from '../components/dashboard/OrderTable'; // 👈 Import ตารางที่แยกไว้
import { fetchOrders, type OrderSummary } from '../services/orderAPI';
import { RefreshCw, AlertTriangle, Package, LayoutGrid, DollarSign, X } from 'lucide-react';

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

  const [dateFrom, setDateFrom] = useState(() => {
    const f = searchParams.get('dateFrom');
    if (f) return f;
    const d = new Date();
    d.setMonth(d.getMonth() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const t = searchParams.get('dateTo');
    if (t) return t;
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

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
    
    const d1 = new Date(); d1.setMonth(d1.getMonth() - 7); const defFrom = d1.toISOString().split('T')[0];
    const d2 = new Date(); const defTo = d2.toISOString().split('T')[0];
    if (dateFrom !== defFrom) params.set('dateFrom', dateFrom);
    if (dateTo !== defTo) params.set('dateTo', dateTo);

    navigate({ search: params.toString() }, { replace: true });
  }, [search, statusFilter, groupFilter, dateType, page, pageSize, dateFrom, dateTo, filterType, filterWeek, filterCust, filterPO, filterShipTo, navigate]);

  // Sync search state if URL changes (e.g. from Topbar global search)
  useEffect(() => {
    const s = new URLSearchParams(location.search).get('search');
    if (s !== null) {
      const q = s.toUpperCase();
      setSearch(s);

      // Auto-group based on search keywords
      if (q.includes('N083')) setGroupFilter('N083');
      else if (q.includes('N051')) setGroupFilter('N051');
      else if (q.includes('N044')) setGroupFilter('N044');
      else if (q.includes('MLT') || q.startsWith('U')) setGroupFilter('MLT');
      else {
        const n008List = ['N008', 'N048', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'];
        if (n008List.some(code => q.includes(code))) setGroupFilter('N008');
      }
    }
  }, [location.search]);

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
    if (groupFilter !== 'ALL') {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-surface-1)', fontFamily: 'var(--font-body)' }}>
      <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'PO TRACKER' }]} />

      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        {/* ─── KPI TILES ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { id: 'total', label: 'ACTIVE ORDERS', value: filtered.length.toLocaleString(), color: 'var(--color-brand-500)', icon: <Package size={18} /> },
            { id: 'qty', label: 'TOTAL QTY', value: totalQty.toLocaleString(), color: 'var(--color-success-500)', icon: <LayoutGrid size={18} /> },
            { id: 'amount', label: 'TOTAL AMOUNT', value: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'var(--color-accent-500)', icon: <DollarSign size={18} /> },
            { id: 'pending', label: 'PENDING', value: pendingCount.toLocaleString(), color: 'var(--color-brand-400)', icon: <AlertTriangle size={18} /> },
            { id: 'late', label: 'LATE', value: delayedCount.toLocaleString(), color: 'var(--color-danger-500)', icon: <RefreshCw size={18} /> },
          ].map((stat) => (
            <div
              key={stat.id}
              onClick={() => navigate('/dashboard/detail')}
              className="animate-fade-in-up"
              style={{
                background: 'var(--color-surface-0)', padding: '20px 24px', borderRadius: '20px',
                border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: '12px',
                cursor: 'pointer', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px -8px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px -4px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `color-mix(in oklch, ${stat.color}, transparent 90%)`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>{stat.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '4px 0 0', fontFamily: 'var(--font-display)' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── COMPACT FILTER PANEL ─── */}
        <div style={{
          background: 'var(--color-surface-0)', borderRadius: '24px', border: '1px solid var(--color-border-light)',
          marginBottom: '20px', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 4px 20px -4px rgba(0,0,0,0.02)'
        }}>
          {/* Row 1: Button Filters & Refresh */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {/* Left side: Button Filters Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Customer Group</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['N008', 'MLT', 'N083', 'N044', 'N051', 'ALL'].map(grp => (
                    <button
                      key={grp}
                      onClick={() => setGroupFilter(grp)}
                      style={{
                        padding: '6px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800,
                        background: groupFilter === grp ? 'var(--color-brand-500)' : 'var(--color-surface-1)',
                        color: groupFilter === grp ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                        border: '1px solid', borderColor: groupFilter === grp ? 'var(--color-brand-600)' : 'var(--color-border-light)',
                        transition: 'all 0.2s', cursor: 'pointer'
                      }}
                    >{grp === 'ALL' ? 'General' : grp}</button>
                  ))}
                </div>
              </div>

              <div style={{ width: '1px', height: '24px', background: 'var(--color-border-light)' }} />

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['pending', 'finish', 'all'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st as any)}
                      style={{
                        padding: '6px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800,
                        background: statusFilter === st ? 'var(--color-brand-500)' : 'var(--color-surface-1)',
                        color: statusFilter === st ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                        border: '1px solid', borderColor: statusFilter === st ? 'var(--color-brand-600)' : 'var(--color-border-light)',
                        textTransform: 'uppercase', transition: 'all 0.2s', cursor: 'pointer'
                      }}
                    >{st}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: Refresh Button */}
            <button
              onClick={load}
              disabled={loading}
              style={{
                padding: '8px 16px', borderRadius: '12px', background: 'var(--color-brand-500)', color: 'var(--color-text-inverse)',
                border: 'none', fontSize: '0.78rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', transition: 'all 0.2s', opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand-600)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand-500)'}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'REFRESHING...' : 'REFRESH'}
            </button>
          </div>

          {/* Row 2: Search & Advanced Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid var(--color-border-light)', paddingTop: '16px' }}>
            {/* Left side: Quick Column Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Week"
                  value={filterWeek}
                  onChange={e => setFilterWeek(e.target.value)}
                  style={{
                    width: '75px', padding: '6px 24px 6px 10px', borderRadius: '10px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-1)',
                    fontSize: '0.78rem', color: 'var(--color-text-primary)',
                    fontWeight: 600, outline: 'none'
                  }}
                />
                {filterWeek && (
                  <button onClick={() => setFilterWeek('')} style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Cust"
                  value={filterCust}
                  onChange={e => setFilterCust(e.target.value)}
                  style={{
                    width: '85px', padding: '6px 24px 6px 10px', borderRadius: '10px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-1)',
                    fontSize: '0.78rem', color: 'var(--color-text-primary)',
                    fontWeight: 600, outline: 'none'
                  }}
                />
                {filterCust && (
                  <button onClick={() => setFilterCust('')} style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="PO / Order No"
                  value={filterPO}
                  onChange={e => setFilterPO(e.target.value)}
                  style={{
                    width: '135px', padding: '6px 24px 6px 10px', borderRadius: '10px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-1)',
                    fontSize: '0.78rem', color: 'var(--color-text-primary)',
                    fontWeight: 600, outline: 'none'
                  }}
                />
                {filterPO && (
                  <button onClick={() => setFilterPO('')} style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={{
                    width: '115px', padding: '6px 10px', borderRadius: '10px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-1)',
                    fontSize: '0.78rem', color: filterType ? 'var(--color-brand-500)' : 'var(--color-text-secondary)',
                    fontWeight: 700, outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="">All Types</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Ship To"
                  value={filterShipTo}
                  onChange={e => setFilterShipTo(e.target.value)}
                  style={{
                    width: '115px', padding: '6px 24px 6px 10px', borderRadius: '10px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-1)',
                    fontSize: '0.78rem', color: 'var(--color-text-primary)',
                    fontWeight: 600, outline: 'none'
                  }}
                />
                {filterShipTo && (
                  <button onClick={() => setFilterShipTo('')} style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Right side: Date Picker Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', borderRadius: '12px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', overflow: 'hidden' }}>
                <select value={dateType} onChange={e => setDateType(e.target.value)} style={{ padding: '8px 10px 8px 14px', border: 'none', background: 'var(--color-surface-2)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)', outline: 'none', cursor: 'pointer', borderRight: '1px solid var(--color-border-light)' }}>
                  <option value="Order Date">Order Date</option>
                  <option value="Factory Due Date">Factory Due Date</option>
                  <option value="Cust Due Date">Cust Due Date</option>
                  <option value="Finish Date">Finish Date</option>
                  <option value="All">All Dates</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px' }}>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ background: 'transparent', border: 'none', fontSize: '0.78rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.65rem', fontWeight: 800 }}>TO</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ background: 'transparent', border: 'none', fontSize: '0.78rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── DATA TABLE ─── */}
        <div style={{ background: 'var(--color-surface-0)', borderRadius: '24px', border: '1px solid var(--color-border-light)', boxShadow: '0 12px 40px -12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {error && <div style={{ padding: '16px', background: '#fff5f5', borderBottom: '1px solid #ffc9c9', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} style={{ color: '#e03131' }} /> <span style={{ fontSize: '0.85rem', color: '#c92a2a' }}>{error}</span></div>}

          {/* Top Pagination Info (New Position) */}
          {!loading && filtered.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 24px', borderBottom: '1px solid var(--color-border-light)',
              background: 'color-mix(in srgb, var(--color-surface-1), transparent 40%)',
              backdropFilter: 'blur(8px)', flexWrap: 'wrap', gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                  Showing <strong style={{ color: 'var(--color-text-primary)' }}>{pageStart + 1}</strong>–<strong style={{ color: 'var(--color-text-primary)' }}>{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong style={{ color: 'var(--color-brand-600)' }}>{filtered.length.toLocaleString()}</strong>
                </span>
                <div style={{ width: '1px', height: '16px', background: 'var(--color-border-light)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 700, outline: 'none' }}>
                    {[20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                </div>
              </div>

              {/* Top Pagination controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border-light)', background: page === 1 ? 'transparent' : 'var(--color-surface-0)', color: page === 1 ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>Prev</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {pageNumbers.map((p, i) => p === '...' ? <span key={i} style={{ color: 'var(--color-text-quaternary)', fontSize: '0.7rem' }}>...</span> : (
                    <button key={i} onClick={() => setPage(p as number)} style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'transparent'}`, background: page === p ? 'var(--color-brand-500)' : 'transparent', color: page === p ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900, minWidth: '32px' }}>{p}</button>
                  ))}
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border-light)', background: page === totalPages ? 'transparent' : 'var(--color-surface-0)', color: page === totalPages ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>Next</button>
              </div>
            </div>
          )}

          <OrderTable 
            data={paged} 
            loading={loading} 
            pageOffset={pageStart} 
            group={groupFilter} 
          />

          {/* Bottom Pagination (Controls only) */}
          {!loading && filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 24px', borderTop: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border-light)', background: page === 1 ? 'transparent' : 'var(--color-surface-1)', color: page === 1 ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Prev</button>
                {pageNumbers.map((p, i) => p === '...' ? <span key={i} style={{ color: 'var(--color-text-quaternary)', padding: '0 4px' }}>...</span> : (
                  <button key={i} onClick={() => setPage(p as number)} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`, background: page === p ? 'var(--color-brand-500)' : 'transparent', color: page === p ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 900, minWidth: '36px' }}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border-light)', background: page === totalPages ? 'transparent' : 'var(--color-surface-1)', color: page === totalPages ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .animate-spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}