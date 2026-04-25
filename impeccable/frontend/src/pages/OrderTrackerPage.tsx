import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { fetchOrders, type OrderSummary } from '../services/orderTrackerAPI';
import { Search, RefreshCw, AlertTriangle, ChevronRight, Package, Image as ImageIcon } from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function formatQty(n: number | null | undefined) {
  if (n == null) return '';
  return n.toLocaleString();
}
function negRed(n: number | null | undefined) {
  if (n == null || n === 0) return { val: '', color: '' };
  return { val: n.toLocaleString(), color: n < 0 ? '#e03131' : '#1971c2' };
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    P: { label: 'Pending', bg: '#fff3bf', color: '#e67700' },
    C: { label: 'Complete', bg: '#d3f9d8', color: '#2f9e44' },
    N: { label: 'New', bg: '#e7f5ff', color: '#1971c2' },
    Y: { label: 'Done', bg: '#d3f9d8', color: '#2f9e44' },
  };
  const s = status ? map[status] : null;
  if (!s) return <span style={{ color: '#aaa', fontSize: '0.7rem' }}>—</span>;
  return (
    <span style={{
      display: 'inline-block', padding: '1px 7px', borderRadius: '2px',
      fontSize: '0.68rem', fontWeight: 700,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

// ─── Tiny cell for QC rounds ───────────────────────────────────────────────────
function QCCell({ qty, date, fail }: { qty?: number | null; date?: string | null; fail?: number | null }) {
  if (!qty && !date) return <span style={{ color: '#ccc' }}>—</span>;
  return (
    <div style={{ fontSize: '0.68rem', lineHeight: 1.5 }}>
      {qty != null && <div style={{ fontWeight: 700, color: '#1971c2' }}>{qty.toLocaleString()}</div>}
      {date && <div style={{ color: '#666' }}>{formatDate(date)}</div>}
      {fail != null && fail !== 0 && <div style={{ color: '#e03131', fontWeight: 700 }}>✗ {fail.toLocaleString()}</div>}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      <style>{`@keyframes skSh{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {Array.from({ length: 12 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '7px 8px' }}>
              <div style={{
                height: '13px', borderRadius: '2px',
                background: 'linear-gradient(90deg,#f1f3f5 25%,#e9ecef 50%,#f1f3f5 75%)',
                backgroundSize: '400% 100%',
                animation: `skSh 1.4s ease-in-out infinite`,
                animationDelay: `${(i * cols + j) * 0.025}s`,
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────
// Mirrors PCC System rูป 1 columns
const COL_GROUPS = [
  {
    label: '',
    cols: [
      { key: 'no', label: 'No.', w: 36, align: 'center' as const },
      { key: 'week', label: 'Week', w: 44, align: 'center' as const },
      { key: 'cust', label: 'Cust', w: 52, align: 'left' as const },
      { key: 'po', label: 'PO no.', w: 120, align: 'left' as const },
      { key: 'ordno', label: 'Order no.', w: 160, align: 'left' as const },
      { key: 'kind', label: 'New/Replen', w: 60, align: 'center' as const },
      { key: 'metal', label: 'Metal', w: 44, align: 'center' as const },
      { key: 'shipto', label: 'Ship To', w: 120, align: 'left' as const },
      { key: 'photo', label: 'Picture', w: 60, align: 'center' as const },
      { key: 'orddate', label: 'Order Date', w: 72, align: 'center' as const },
      { key: 'factdue', label: 'Factory Due', w: 72, align: 'center' as const },
      { key: 'sgs', label: 'SGS', w: 72, align: 'center' as const },
      { key: 'qcdate', label: 'QC Date', w: 72, align: 'center' as const },
      { key: 'qatest', label: 'QA/BBQ/Testing', w: 72, align: 'center' as const },
      { key: 'custdue', label: 'Cust Due', w: 72, align: 'center' as const },
      { key: 'oordate', label: 'OOR Date', w: 72, align: 'center' as const },
      { key: 'sku', label: 'No. of SKU', w: 52, align: 'right' as const },
      { key: 'qty', label: 'Qty', w: 70, align: 'right' as const },
    ],
  },
  {
    label: '1. QC',
    bg: '#e7f5ff',
    cols: [
      { key: 'bkdate', label: 'Booking Date', w: 72, align: 'center' as const },
      { key: 'qc1qty', label: '1. QC Qty', w: 60, align: 'right' as const },
      { key: 'qc1date', label: '1. QC Date', w: 72, align: 'center' as const },
      { key: 'qc1fail', label: '1. QC Fail', w: 60, align: 'right' as const },
    ],
  },
  {
    label: '2. QC',
    bg: '#fff3bf',
    cols: [
      { key: 'qc2qty', label: '2. QC Qty', w: 60, align: 'right' as const },
      { key: 'qc2date', label: '2. QC Date', w: 72, align: 'center' as const },
      { key: 'qc2fail', label: '2. QC Fail', w: 60, align: 'right' as const },
    ],
  },
  {
    label: '3. QC',
    bg: '#d3f9d8',
    cols: [
      { key: 'qc3qty', label: '3. QC Qty', w: 60, align: 'right' as const },
      { key: 'qc3date', label: '3. QC Date', w: 72, align: 'center' as const },
    ],
  },
  {
    label: '',
    cols: [
      { key: 'pst', label: 'PST', w: 64, align: 'right' as const },
      { key: 'pc1', label: 'PC1', w: 64, align: 'right' as const },
      { key: 'status', label: 'Status', w: 72, align: 'center' as const },
      { key: 'arrow', label: '', w: 28, align: 'center' as const },
    ],
  },
];

// Flat column list for skeleton / colspan calc
const ALL_COLS = COL_GROUPS.flatMap(g => g.cols);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OrderTrackerPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [filtered, setFiltered] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrders({ status: statusFilter });
      setOrders(res.data);
      setFiltered(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(orders); return; }
    const q = search.toLowerCase();
    setFiltered(orders.filter(o =>
      o.OrdNo?.toLowerCase().includes(q) ||
      o.CustName?.toLowerCase().includes(q) ||
      o.CustCode?.toLowerCase().includes(q) ||
      o.PONo?.toLowerCase().includes(q)
    ));
  }, [search, orders]);

  const totalQty = filtered.reduce((s, o) => s + (o.TotalQty || 0), 0);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const TH_BASE: React.CSSProperties = {
    padding: '5px 6px',
    fontSize: '0.64rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#495057',
    background: '#f1f3f5',
    border: '1px solid #dee2e6',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  };
  const TD_BASE: React.CSSProperties = {
    padding: '5px 6px',
    border: '1px solid #e9ecef',
    fontSize: '0.72rem',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'ORDER TRACKER' },
      ]} />

      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: '#f8f9fa' }}>

        {/* ── Header bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', borderBottom: '1px solid #dee2e6',
          background: '#fff', gap: '12px', flexWrap: 'wrap',
        }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={16} style={{ color: '#1971c2' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.1em', color: '#212529' }}>
                ORDER TRACKER
              </div>
              <div style={{ fontSize: '0.67rem', color: '#868e96', marginTop: '1px' }}>
                {loading ? '...' : `${filtered.length.toLocaleString()} orders | ${totalQty.toLocaleString()} pcs`}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* Status toggle */}
            <div style={{ display: 'flex', borderRadius: '3px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
              {(['pending', 'all'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '4px 14px', fontSize: '0.7rem', fontWeight: 700,
                  letterSpacing: '0.06em', border: 'none', cursor: 'pointer',
                  background: statusFilter === s ? '#1971c2' : '#fff',
                  color: statusFilter === s ? '#fff' : '#495057',
                  transition: 'all 0.12s',
                }}>
                  {s === 'pending' ? 'PENDING' : 'ALL'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 9px', borderRadius: '3px',
              border: '1px solid #dee2e6', background: '#fff', minWidth: '210px',
            }}>
              <Search size={12} style={{ color: '#adb5bd', flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Order No, Customer, PO..."
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '0.75rem', color: '#212529', width: '100%',
                }}
              />
            </div>

            {/* Refresh */}
            <button onClick={load} title="Refresh" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '30px', height: '30px', borderRadius: '3px',
              border: '1px solid #dee2e6', background: '#fff',
              cursor: 'pointer', color: '#495057',
            }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#fff5f5', borderBottom: '1px solid #ffc9c9' }}>
            <AlertTriangle size={13} style={{ color: '#e03131', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#c92a2a' }}>{error}</span>
            <button onClick={load} style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#1971c2', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              ลองใหม่
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse',
            fontSize: '0.72rem',
            fontFamily: 'Tahoma, "Segoe UI", sans-serif',
            minWidth: '100%',
            tableLayout: 'fixed',
          }}>

            {/* colgroup */}
            <colgroup>
              {ALL_COLS.map(c => <col key={c.key} style={{ width: c.w }} />)}
            </colgroup>

            <thead>
              {/* ── Group header row ── */}
              <tr>
                {COL_GROUPS.map((g, gi) =>
                  g.label
                    ? <th key={gi} colSpan={g.cols.length} style={{
                      ...TH_BASE,
                      background: g.bg || '#e9ecef',
                      color: '#212529',
                      fontSize: '0.7rem',
                      top: 0,
                      zIndex: 11,
                    }}>{g.label}</th>
                    : g.cols.map(c => <th key={c.key} rowSpan={2} style={{
                      ...TH_BASE,
                      textAlign: c.align,
                      top: 0,
                      zIndex: 11,
                    }}>{c.label}</th>)
                )}
              </tr>
              {/* ── Sub header row (only for grouped cols) ── */}
              <tr>
                {COL_GROUPS.filter(g => g.label).flatMap(g =>
                  g.cols.map(c => (
                    <th key={c.key} style={{
                      ...TH_BASE,
                      background: g.bg ? `${g.bg}cc` : '#f1f3f5',
                      textAlign: c.align,
                      top: 28, // offset below group header
                    }}>{c.label}</th>
                  ))
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <SkeletonRows cols={ALL_COLS.length} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={ALL_COLS.length} style={{ padding: '40px', textAlign: 'center', color: '#adb5bd', fontSize: '0.8rem' }}>
                    ไม่พบข้อมูล Order
                  </td>
                </tr>
              ) : filtered.map((o, i) => {
                const pst = negRed((o as any).PolishPenQty);
                const pc1 = negRed((o as any).PlatePenQty);
                const rowBg = i % 2 === 0 ? '#fff' : '#f8f9fa';

                return (
                  <tr
                    key={o.OrdNo + i}
                    onClick={() => navigate(`/order-tracker/${encodeURIComponent(o.OrdNo)}`)}
                    style={{ cursor: 'pointer', background: rowBg, transition: 'background 0.08s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e7f5ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                  >
                    {/* No. */}
                    <td style={{ ...TD_BASE, textAlign: 'center', color: '#868e96' }}>{i + 1}</td>
                    {/* Week */}
                    <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 600 }}>
                      {o.Week || '—'}
                    </td>
                    {/* Cust */}
                    <td style={{ ...TD_BASE, fontWeight: 700, color: '#1971c2' }}>
                      {o.CustCode}
                    </td>
                    {/* PO no. */}
                    <td style={{ ...TD_BASE, overflow: 'hidden', textOverflow: 'ellipsis' }} title={o.PONo}>
                      {o.PONo || '—'}
                    </td>
                    {/* Order no. */}
                    <td style={{ ...TD_BASE, overflow: 'hidden', textOverflow: 'ellipsis', color: '#1971c2', fontWeight: 600 }} title={o.OrdNo}>
                      {o.OrdNo}
                    </td>
                    {/* New/Replen */}
                    <td style={{ ...TD_BASE, textAlign: 'center' }}>
                      {(o as any).OrdKind || '—'}
                    </td>
                    {/* Metal */}
                    <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 700 }}>
                      {o.OrdMat || '—'}
                    </td>
                    {/* Ship To */}
                    <td style={{ ...TD_BASE, overflow: 'hidden', textOverflow: 'ellipsis', color: '#495057' }}
                      title={(o as any).CustMultiAddr}>
                      {(o as any).CustMultiAddr || '—'}
                    </td>
                    {/* Picture */}
                    <td style={{ ...TD_BASE, textAlign: 'center', padding: '3px' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 4,
                        background: '#f1f3f5', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto', border: '1px solid #dee2e6',
                      }}>
                        {o.ItemPhoto
                          ? <img src={o.ItemPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <ImageIcon size={14} style={{ color: '#ced4da' }} />
                        }
                      </div>
                    </td>
                    {/* Order Date */}
                    <td style={{ ...TD_BASE, textAlign: 'center', color: '#495057' }}>
                      {formatDate(o.OrdDate)}
                    </td>
                    {/* Factory Due */}
                    <td style={{ ...TD_BASE, textAlign: 'center', color: '#495057' }}>
                      {formatDate(o.DueDate)}
                    </td>
                    {/* SGS */}
                    <td style={{ ...TD_BASE, textAlign: 'center', color: '#495057' }}>
                      {formatDate((o as any).OrdSGS)}
                    </td>
                    {/* QC Date */}
                    <td style={{ ...TD_BASE, textAlign: 'center', color: '#495057' }}>
                      {formatDate((o as any).CustQCDate)}
                    </td>
                    {/* QA/BBQ/Testing */}
                    <td style={{ ...TD_BASE, textAlign: 'center', color: '#495057' }}>
                      {formatDate((o as any).TrackTest)}
                    </td>
                    {/* Cust Due */}
                    <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 600, color: '#c92a2a' }}>
                      {formatDate((o as any).CustDueDate)}
                    </td>
                    {/* OOR Date */}
                    <td style={{ ...TD_BASE, textAlign: 'center', color: '#495057' }}>
                      {formatDate((o as any).OORDate)}
                    </td>
                    {/* No. of SKU */}
                    <td style={{ ...TD_BASE, textAlign: 'right', color: '#495057' }}>
                      {formatQty((o as any).SumItem)}
                    </td>
                    {/* Qty */}
                    <td style={{ ...TD_BASE, textAlign: 'right', fontWeight: 700, color: '#1971c2' }}>
                      {formatQty(o.TotalQty)}
                    </td>

                    {/* 1.QC ─ Booking Date */}
                    <td style={{ ...TD_BASE, textAlign: 'center', background: '#f0f8ff', color: '#495057' }}>
                      {formatDate((o as any).BookDate)}
                    </td>
                    {/* 1.QC Qty */}
                    <td style={{ ...TD_BASE, textAlign: 'right', background: '#f0f8ff' }}>
                      {formatQty((o as any).QC1_Qty)}
                    </td>
                    {/* 1.QC Date */}
                    <td style={{ ...TD_BASE, textAlign: 'center', background: '#f0f8ff', color: '#495057' }}>
                      {formatDate((o as any).QC1_Date)}
                    </td>
                    {/* 1.QC Fail */}
                    <td style={{ ...TD_BASE, textAlign: 'right', background: '#f0f8ff', color: (o as any).QC1_Fail ? '#e03131' : undefined, fontWeight: (o as any).QC1_Fail ? 700 : undefined }}>
                      {formatQty((o as any).QC1_Fail)}
                    </td>

                    {/* 2.QC Qty */}
                    <td style={{ ...TD_BASE, textAlign: 'right', background: '#fffde7' }}>
                      {formatQty((o as any).QC2_Qty)}
                    </td>
                    {/* 2.QC Date */}
                    <td style={{ ...TD_BASE, textAlign: 'center', background: '#fffde7', color: '#495057' }}>
                      {formatDate((o as any).QC2_Date)}
                    </td>
                    {/* 2.QC Fail */}
                    <td style={{ ...TD_BASE, textAlign: 'right', background: '#fffde7', color: (o as any).QC2_Fail ? '#e03131' : undefined, fontWeight: (o as any).QC2_Fail ? 700 : undefined }}>
                      {formatQty((o as any).QC2_Fail)}
                    </td>

                    {/* 3.QC Qty */}
                    <td style={{ ...TD_BASE, textAlign: 'right', background: '#f0fff4' }}>
                      {formatQty((o as any).QC3_Qty)}
                    </td>
                    {/* 3.QC Date */}
                    <td style={{ ...TD_BASE, textAlign: 'center', background: '#f0fff4', color: '#495057' }}>
                      {formatDate((o as any).QC3_Date)}
                    </td>

                    {/* PST (PolishPenQty) */}
                    <td style={{ ...TD_BASE, textAlign: 'right', color: pst.color, fontWeight: pst.val ? 700 : undefined }}>
                      {pst.val}
                    </td>
                    {/* PC1 (PlatePenQty) */}
                    <td style={{ ...TD_BASE, textAlign: 'right', color: pc1.color, fontWeight: pc1.val ? 700 : undefined }}>
                      {pc1.val}
                    </td>

                    {/* Status */}
                    <td style={{ ...TD_BASE, textAlign: 'center' }}>
                      <StatusBadge status={o.OrdStatus} />
                    </td>
                    {/* Arrow */}
                    <td style={{ ...TD_BASE, textAlign: 'center' }}>
                      <ChevronRight size={13} style={{ color: '#ced4da' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}