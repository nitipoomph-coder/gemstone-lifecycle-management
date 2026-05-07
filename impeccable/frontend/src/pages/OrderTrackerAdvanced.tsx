// src/pages/OrderTrackerAdvanced.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import OrderTable from '../components/dashboard/OrderTable'; // 👈 Import ตารางที่แยกไว้
import { fetchOrders, type OrderSummary } from '../services/orderAPI';
import { Search, RefreshCw, AlertTriangle, ChevronRight, Package, LayoutGrid, DollarSign, Calendar } from 'lucide-react';

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

  // Sync search state if URL changes (e.g. from Topbar global search)
  // Sync search state และเลือกกลุ่มอัตโนมัติตามคำค้นหา
  useEffect(() => {
    const s = new URLSearchParams(location.search).get('search');
    if (s !== null) {
      const q = s.toUpperCase(); // ทำให้เป็นตัวพิมพ์ใหญ่เพื่อเช็คเงื่อนไขง่ายๆ
      setSearch(s);

      // --- Logic เลือกกลุ่มอัตโนมัติ ---
      if (q.includes('N083')) {
        setGroupFilter('N083');
      } else if (q.includes('N051')) {
        setGroupFilter('N051');
      } else if (q.includes('N044')) {
        setGroupFilter('N044');
      } else if (q.includes('MLT') || q.startsWith('U')) {
        setGroupFilter('MLT'); // ถ้ามี MLT หรือขึ้นต้นด้วย U ให้ไปที่กลุ่ม MLT
      } else {
        // เช็คว่าอยู่ในกลุ่ม N008 หรือไม่ (N008, N048, N066, etc.)
        const n008List = ['N008', 'N048', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'];
        if (n008List.some(code => q.includes(code))) {
          setGroupFilter('N008');
        } else {
          setGroupFilter('N008'); // ค่า Default ถ้าไม่ตรงเงื่อนไขอื่นเลย
        }
      }
    }
  }, [location.search]);

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



  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ⭐️ เรียกใช้ API จากไฟล์ service แทนการเขียน fetch ตรงๆ
      // หากเลือก finish ให้ส่ง all ไปก่อนเพื่อเอามา filter ต่อฝั่งหน้าบ้าน
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

  useEffect(() => {
    let filteredList = orders;

    // Filter by Status (Frontend override for Finish)
    if (statusFilter === 'finish') {
      filteredList = filteredList.filter(o => o.OrdStatus === 'C' || o.OrdStatus === 'Y');
    }

    // Filter by Group (Mock frontend filter)
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
    //Logic search
    if (search.trim()) {
      const q = search.toLowerCase();
      filteredList = filteredList.filter(o =>
        o.OrdNo?.toLowerCase().includes(q) ||
        o.CustCode?.toLowerCase().includes(q) ||
        o.ShipTo?.toLowerCase().includes(q) ||
        o.PONo?.toLowerCase().includes(q)
      );
    }
    setFiltered(filteredList);
    setPage(1); // reset กลับหน้า 1 ทุกครั้งที่ filter เปลี่ยน
  }, [search, orders, statusFilter, groupFilter]);

  const totalQty = filtered.reduce((s, o) => s + (o.TotalQty || 0), 0);
  const totalAmount = filtered.reduce((s, o) => s + (o.Amount || 0), 0);
  const pendingCount = filtered.filter(o => o.OrdStatus === 'P' || o.OrdStatus === 'N').length;
  const delayedCount = filtered.filter(o => o.DueDate && new Date(o.DueDate) < new Date() && (o.OrdStatus === 'P' || o.OrdStatus === 'N')).length;

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageStart = (page - 1) * pageSize;          // 0-indexed
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  // หน้าเลขที่แสดงใน pagination bar (สูงสุด 7 ปุ่ม)
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

        {/* ─── KPI TILES (Smaller) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { id: 'total', label: 'ACTIVE ORDERS', value: filtered.length, color: 'var(--color-brand-500)', icon: <Package size={18} /> },
            { id: 'qty', label: 'TOTAL QTY', value: totalQty.toLocaleString(), color: 'var(--color-success-500)', icon: <LayoutGrid size={18} /> },
            { id: 'amount', label: 'TOTAL AMOUNT', value: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'var(--color-accent-500)', icon: <DollarSign size={18} /> },
            { id: 'pending', label: 'PENDING', value: pendingCount, color: 'var(--color-brand-400)', icon: <AlertTriangle size={18} /> },
            { id: 'late', label: 'LATE', value: delayedCount, color: 'var(--color-danger-500)', icon: <RefreshCw size={18} /> },
          ].map((stat) => (
            <div
              key={stat.id}
              onClick={() => navigate('/dashboard/detail')}
              className="animate-fade-in-up"
              style={{
                background: 'var(--color-surface-0)',
                padding: '20px 24px',
                borderRadius: '20px',
                border: '1px solid var(--color-border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 30px -8px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px -4px rgba(0,0,0,0.05)';
              }}
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

        {/* ─── LEGACY FILTER PANEL ─── */}
        <div style={{
          background: 'var(--color-surface-0)',
          borderRadius: '20px',
          border: '1px solid var(--color-border-light)',
          marginBottom: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            {/* Customer Group */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', borderRight: '1px solid var(--color-border-light)', paddingRight: '32px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-brand-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group:</div>
              {['N008', 'MLT', 'N083', 'N044', 'N051', 'ALL'].map(grp => (
                <label key={grp} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: groupFilter === grp ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input
                    type="radio"
                    name="groupFilter"
                    checked={groupFilter === grp}
                    onChange={() => setGroupFilter(grp)}
                    style={{ accentColor: 'var(--color-accent-500)', width: '16px', height: '16px' }}
                  />
                  {grp === 'ALL' ? 'General' : grp}
                </label>
              ))}
            </div>

            {/* Status */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-brand-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status:</div>
              {['pending', 'finish', 'all'].map(st => (
                <label key={st} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: statusFilter === st ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>
                  <input
                    type="radio"
                    name="statusFilter"
                    checked={statusFilter === st}
                    onChange={() => setStatusFilter(st as 'pending' | 'finish' | 'all')}
                    style={{ accentColor: 'var(--color-brand-500)', width: '16px', height: '16px' }}
                  />
                  {st}
                </label>
              ))}
            </div>
          </div>

          {/* Search, Date Filter & Actions */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--color-border-light)', paddingTop: '20px' }}>
            {/* DATE RANGE FILTER */}
            <div
              style={{
                display: 'flex',
                background: 'var(--color-surface-1)',
                borderRadius: '12px',
                border: '1px solid var(--color-border-light)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--color-brand-500)', borderRight: '1px solid var(--color-brand-600)' }}>
                <select
                  value={dateType}
                  onChange={e => setDateType(e.target.value)}
                  style={{
                    padding: '10px 16px 10px 20px',
                    border: 'none',
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    paddingRight: '36px',
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  <option style={{ color: '#000' }} value="Order Date">Order Date</option>
                  <option style={{ color: '#000' }} value="Factory Due Date">Factory Due Date</option>
                  <option style={{ color: '#000' }} value="Cust Due Date">Cust Due Date</option>
                  <option style={{ color: '#000' }} value="Finish Date">Finish Date</option>
                  <option style={{ color: '#000' }} value="All">All Dates</option>
                </select>
                <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: '#fff', opacity: 0.8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px' }}>
                <Calendar size={14} style={{ color: 'var(--color-brand-500)', opacity: 0.6 }} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace' }}
                />
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem', fontWeight: 800 }}>→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <button
              onClick={load}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '12px',
                border: 'none', background: 'var(--color-brand-500)', color: '#fff',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                boxShadow: '0 4px 12px -2px rgba(var(--color-brand-500), 0.3)',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-display)'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh Tracker
            </button>
          </div>

        </div>

        {/* ─── DATA TABLE ─── */}
        <div style={{ background: 'var(--color-surface-0)', borderRadius: '24px', border: '1px solid var(--color-border-light)', boxShadow: '0 12px 40px -12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {error && (
            <div style={{ padding: '16px', background: '#fff5f5', borderBottom: '1px solid #ffc9c9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: '#e03131' }} /> <span style={{ fontSize: '0.85rem', color: '#c92a2a' }}>{error}</span>
            </div>
          )}

          {/* ⭐️ ส่งเฉพาะ rows ของหน้าปัจจุบัน */}
          <OrderTable data={paged} loading={loading} pageOffset={pageStart} group={groupFilter} />

          {/* ─── Pagination Bar ─── */}
          {!loading && filtered.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderTop: '1px solid #dee2e6',
              background: '#f8f9fa', flexWrap: 'wrap', gap: '8px',
            }}>
              {/* Left: rows info + page size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#868e96' }}>
                  Showing <strong style={{ color: '#212529' }}>{pageStart + 1}</strong>–<strong style={{ color: '#212529' }}>{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong style={{ color: '#1971c2' }}>{filtered.length.toLocaleString()}</strong> orders
                </span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{ fontSize: '0.72rem', padding: '3px 6px', borderRadius: '4px', border: '1px solid #ced4da', background: '#fff', color: '#495057', cursor: 'pointer' }}
                >
                  {[20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>

              {/* Right: page buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Prev */}
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #dee2e6', background: page === 1 ? '#f1f3f5' : '#fff', color: page === 1 ? '#adb5bd' : '#495057', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                >‹</button>

                {/* Page numbers */}
                {pageNumbers.map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} style={{ padding: '4px 6px', color: '#adb5bd', fontSize: '0.78rem' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
                        border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                        background: page === p ? 'var(--color-brand-500)' : 'var(--color-surface-0)',
                        color: page === p ? '#fff' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        minWidth: '36px',
                        transition: 'all 0.2s',
                        fontFamily: 'var(--font-display)'
                      }}
                    >{p}</button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #dee2e6', background: page === totalPages ? '#f1f3f5' : '#fff', color: page === totalPages ? '#adb5bd' : '#495057', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                >›</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}