// src/pages/OrderTrackerAdvanced.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'finish' | 'all'>('pending');
  const [groupFilter, setGroupFilter] = useState<string>('N008');
  const [dateType, setDateType] = useState('Order Date');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20); // default 20 rows/page
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3); // 3 เดือนย้อนหลัง (เดิม 7)
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2); // 2 เดือนข้างหน้า
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
  }, [statusFilter]);

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
  const totalPages  = Math.ceil(filtered.length / pageSize);
  const pageStart   = (page - 1) * pageSize;          // 0-indexed
  const paged       = filtered.slice(pageStart, pageStart + pageSize);

  // หน้าเลขที่แสดงใน pagination bar (สูงสุด 7 ปุ่ม)
  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8f9fa' }}>
      <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'ORDER TRACKER' }]} />

      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ padding: '24px' }}>

        {/* ─── KPI TILES (Smaller) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {[
            { id: 'total', label: 'ACTIVE ORDERS', value: filtered.length, color: '#1971c2', icon: <Package size={16} /> },
            { id: 'qty', label: 'TOTAL QTY', value: totalQty.toLocaleString(), color: '#099268', icon: <LayoutGrid size={16} /> },
            { id: 'amount', label: 'TOTAL AMOUNT', value: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#862e9c', icon: <DollarSign size={16} /> },
            { id: 'pending', label: 'PENDING', value: pendingCount, color: '#e67700', icon: <AlertTriangle size={16} /> },
            { id: 'late', label: 'LATE', value: delayedCount, color: '#e03131', icon: <ChevronRight size={16} /> },
          ].map((stat) => (
            <div key={stat.id} onClick={() => navigate('/dashboard/detail')} style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${stat.color}10`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#868e96' }}>{stat.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#212529', margin: '0' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── LEGACY FILTER PANEL ─── */}
        <div style={{ background: '#f4f8fb', borderRadius: '12px', border: '1px solid #d0e1f0', marginBottom: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {/* Customer Group */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', borderRight: '1px solid #d0e1f0', paddingRight: '24px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#004b8d', marginRight: '8px' }}>Customer Group:</div>
              {['N008', 'MLT', 'N083', 'N044', 'N051', 'ALL'].map(grp => (
                <label key={grp} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#495057', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="groupFilter"
                    checked={groupFilter === grp}
                    onChange={() => setGroupFilter(grp)}
                    style={{ accentColor: '#862e9c' }}
                  />
                  {grp === 'ALL' ? 'General / ALL' : `${grp} Group`}
                </label>
              ))}
            </div>

            {/* Status */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#004b8d', marginRight: '8px' }}>Status:</div>
              {['finish', 'pending', 'all'].map(st => (
                <label key={st} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#004b8d', cursor: 'pointer', textTransform: 'capitalize' }}>
                  <input
                    type="radio"
                    name="statusFilter"
                    checked={statusFilter === st}
                    onChange={() => setStatusFilter(st as 'pending' | 'finish' | 'all')}
                    style={{ accentColor: '#1971c2' }}
                  />
                  {st}
                </label>
              ))}
            </div>
          </div>

          {/* Search, Date Filter & Actions */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px dashed #d0e1f0', paddingTop: '16px' }}>

            {/* DATE RANGE FILTER (PREMIUM EDITION) */}
            <div
              style={{
                display: 'flex',
                background: '#fff',
                borderRadius: '8px',
                border: '1px solid #b8d4f0',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 75, 141, 0.06), 0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 75, 141, 0.12), 0 2px 4px rgba(0,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 75, 141, 0.06), 0 1px 3px rgba(0,0,0,0.04)'}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #005eb8 0%, #004b8d 100%)', borderRight: '1px solid #003d73' }}>
                <select
                  value={dateType}
                  onChange={e => setDateType(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    paddingRight: '32px'
                  }}
                >
                  <option style={{ color: '#000' }} value="Order Date">Order Date</option>
                  <option style={{ color: '#000' }} value="Factory Due Date">Factory Due Date</option>
                  <option style={{ color: '#000' }} value="Cust Due Date">Cust Due Date</option>
                  <option style={{ color: '#000' }} value="Finish Date">Finish Date</option>
                  <option style={{ color: '#000' }} value="All">All Dates</option>
                </select>
                <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#82bced' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px', background: '#f8fbff' }}>
                <Calendar size={14} style={{ color: '#004b8d', opacity: 0.6 }} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.75rem', color: '#1971c2', fontWeight: 600, cursor: 'pointer' }}
                />
                <span style={{ color: '#a5c8e4', fontSize: '0.8rem', fontWeight: 800 }}>→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.75rem', color: '#1971c2', fontWeight: 600, cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #ced4da', background: '#fff', flex: 1, minWidth: '200px', maxWidth: '400px' }}>
              <Search size={14} style={{ color: '#adb5bd' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา Customer, PO, Ship To..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.8rem' }} />
            </div>

            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #004b8d', background: '#004b8d', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,75,141,0.2)' }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh Data
            </button>
          </div>

        </div>

        {/* ─── DATA TABLE ─── */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #dee2e6', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {error && (
            <div style={{ padding: '16px', background: '#fff5f5', borderBottom: '1px solid #ffc9c9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: '#e03131' }} /> <span style={{ fontSize: '0.85rem', color: '#c92a2a' }}>{error}</span>
            </div>
          )}

          {/* ⭐️ ส่งเฉพาะ rows ของหน้าปัจจุบัน */}
          <OrderTable data={paged} loading={loading} pageOffset={pageStart} />

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
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                        border: `1px solid ${page === p ? '#1971c2' : '#dee2e6'}`,
                        background: page === p ? '#1971c2' : '#fff',
                        color: page === p ? '#fff' : '#495057',
                        cursor: 'pointer',
                        minWidth: '32px',
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