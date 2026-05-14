// src/pages/OrderTrackerAdvanced.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import OrderTable from '../components/dashboard/OrderTable'; // 👈 Import ตารางที่แยกไว้
import { fetchOrders, type OrderSummary } from '../services/orderAPI';
import { Search, RefreshCw, AlertTriangle, Package, LayoutGrid, DollarSign } from 'lucide-react';

export default function OrderTrackerAdvanced() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [filtered, setFiltered] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);

  const [statusFilter, setStatusFilter] = useState<'pending' | 'finish' | 'all'>('pending');
  const [groupFilter, setGroupFilter] = useState<string>('N008');
  const [dateType, setDateType] = useState('Order Date');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // default 20 rows/page
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 7); // 7 เดือนย้อนหลัง 
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 0); // 0 เดือนข้างหน้า
    return d.toISOString().split('T')[0];
  });

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
      const apiStatus = statusFilter === 'finish' ? 'all' : statusFilter;
      const result = await fetchOrders({
        status: apiStatus as 'pending' | 'all',
        dateType: dateType,
        dateFrom: dateFrom,
        dateTo: dateTo
      });

      if (result.ok) {
        setOrders(result.data);
        setFiltered(result.data);
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

    if (statusFilter === 'finish') {
      filteredList = filteredList.filter(o => o.CloseStatus?.toString().trim().toUpperCase() === 'Y');
    } else if (statusFilter === 'pending') {
      filteredList = filteredList.filter(o => o.CloseStatus?.toString().trim().toUpperCase() !== 'Y');
    }


    // Group Filter
    if (groupFilter !== 'ALL') {
      if (groupFilter === 'N008') {
        const n008List = ['N008', 'N044', 'N048', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'];
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

      // ถ้าเหลือ keyword ที่เป็นข้อมูลจริงๆ ให้ค้นหา
      if (dataKeywords.length > 0) {
        filteredList = filteredList.filter(o =>
          dataKeywords.every(kw =>
            o.OrdNo?.toLowerCase().includes(kw) ||
            o.CustCode?.toLowerCase().includes(kw) ||
            o.ShipTo?.toLowerCase().includes(kw) ||
            o.PONo?.toLowerCase().includes(kw)
          )
        );
      }

      // ตรวจจับ 'Late/Delay' เป็นพิเศษ
      if (keywords.some(k => ['late', 'สาย', 'ช้า', 'delay'].includes(k))) {
        filteredList = filteredList.filter(o => o.DueDate && new Date(o.DueDate) < new Date() && (o.CloseStatus !== 'Y'));
      }
    }

    setFiltered(filteredList);
    setPage(1);
  }, [search, orders, statusFilter, groupFilter]);

  const totalQty = filtered.reduce((s, o) => s + (o.TotalQty || 0), 0);
  const totalAmount = filtered.reduce((s, o) => s + (o.Amount || 0), 0);
  const pendingCount = filtered.filter(o => o.CloseStatus !== 'Y').length;
  const delayedCount = filtered.filter(o => o.DueDate && new Date(o.DueDate) < new Date() && (o.CloseStatus !== 'Y')).length;

  const resetSearch = () => {
    setSearch('');
    setGroupFilter('N008');
    setStatusFilter('pending');
    navigate('/dashboard/tracker', { replace: true });
  };

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
      <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'ORDER TRACKER' }]} />

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
          marginBottom: '20px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 4px 20px -4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Customer Group</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['N008', 'MLT', 'N083', 'N044', 'N051', 'ALL'].map(grp => (
                  <button
                    key={grp}
                    onClick={() => setGroupFilter(grp)}
                    style={{
                      padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
                      background: groupFilter === grp ? 'var(--color-brand-500)' : 'var(--color-surface-1)',
                      color: groupFilter === grp ? '#fff' : 'var(--color-text-secondary)',
                      border: '1px solid', borderColor: groupFilter === grp ? 'var(--color-brand-600)' : 'var(--color-border-light)',
                      transition: 'all 0.2s', cursor: 'pointer'
                    }}
                  >{grp === 'ALL' ? 'General' : grp}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</div>
              <div style={{ display: 'flex', padding: '4px', borderRadius: '12px', background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)' }}>
                {['pending', 'finish', 'all'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st as any)}
                    style={{
                      padding: '6px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                      background: statusFilter === st ? 'var(--color-surface-0)' : 'transparent',
                      color: statusFilter === st ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                      boxShadow: statusFilter === st ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                      border: 'none', textTransform: 'uppercase', transition: 'all 0.2s', cursor: 'pointer'
                    }}
                  >{st}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid var(--color-border-light)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', flex: 1, gap: '12px', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', borderRadius: '14px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', overflow: 'hidden' }}>
                <select value={dateType} onChange={e => setDateType(e.target.value)} style={{ padding: '10px 12px 10px 16px', border: 'none', background: 'var(--color-surface-2)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', outline: 'none', cursor: 'pointer', borderRight: '1px solid var(--color-border-light)' }}>
                  <option value="Order Date">Order Date</option>
                  <option value="Factory Due Date">Factory Due Date</option>
                  <option value="Cust Due Date">Cust Due Date</option>
                  <option value="Finish Date">Finish Date</option>
                  <option value="All">All Dates</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px' }}>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: 800 }}>TO</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                </div>
              </div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              style={{
                padding: '10px 20px', borderRadius: '14px', background: 'var(--color-brand-600)', color: '#fff',
                border: 'none', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', transition: 'all 0.2s', opacity: loading ? 0.6 : 1
              }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'REFRESHING...' : 'REFRESH'}
            </button>
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
                    <button key={i} onClick={() => setPage(p as number)} style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'transparent'}`, background: page === p ? 'var(--color-brand-500)' : 'transparent', color: page === p ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, minWidth: '32px' }}>{p}</button>
                  ))}
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border-light)', background: page === totalPages ? 'transparent' : 'var(--color-surface-0)', color: page === totalPages ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>Next</button>
              </div>
            </div>
          )}

          <OrderTable data={paged} loading={loading} pageOffset={pageStart} group={groupFilter} />

          {/* Bottom Pagination (Controls only) */}
          {!loading && filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 24px', borderTop: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border-light)', background: page === 1 ? 'transparent' : 'var(--color-surface-1)', color: page === 1 ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Prev</button>
                {pageNumbers.map((p, i) => p === '...' ? <span key={i} style={{ color: 'var(--color-text-quaternary)', padding: '0 4px' }}>...</span> : (
                  <button key={i} onClick={() => setPage(p as number)} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`, background: page === p ? 'var(--color-brand-500)' : 'transparent', color: page === p ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, minWidth: '36px' }}>{p}</button>
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