// src/pages/OrderDetailPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer, RefreshCw, AlertTriangle, Image as ImageIcon, FileText, CheckCircle2, Box, Scissors, Gem, Droplet, Sun, Layers, ShieldCheck, Package } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { fetchOrderDetail, type OrderDetail, type OrderLine } from '../services/orderTrackerAPI';

// ─── Helpers ───
function fDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fQty(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString();
}
function fAmt(n: number | null | undefined, curr?: string) {
  if (n == null) return '—';
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr || ''}`.trim();
}

// ─── Production Step Tracker ───
const PROD_STEPS = [
  { key: 'Cast', label: 'Cast', icon: <Box size={14} /> },
  { key: 'Grind', label: 'Grind', icon: <Scissors size={14} /> },
  { key: 'Polish', label: 'Polish', icon: <Sun size={14} /> },
  { key: 'Set', label: 'Set', icon: <Gem size={14} /> },
  { key: 'Epox', label: 'Epox', icon: <Droplet size={14} /> },
  { key: 'Plate', label: 'Plate', icon: <Layers size={14} /> },
  { key: 'Assem', label: 'Assem', icon: <Layers size={14} /> },
  { key: 'QC', label: 'QC', icon: <ShieldCheck size={14} /> },
  { key: 'Pack', label: 'Pack', icon: <Package size={14} /> },
];

function StepTracker({ processes }: { processes: Record<string, { qty: number | null; status: string | null }> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '8px', background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
      {PROD_STEPS.map(step => {
        const p = processes[step.key];
        const isPending = p && p.qty != null && p.qty < 0;
        const isDone = p && (p.status === 'Y' || p.status === 'C' || p.qty === 0);
        
        let color = '#adb5bd'; // default (not reached)
        let bg = '#f1f3f5';
        if (isDone) { color = '#2b8a3e'; bg = '#d3f9d8'; }
        else if (isPending) { color = '#c92a2a'; bg = '#ffe3e3'; }

        return (
          <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px', background: bg, borderRadius: '6px', border: `1px solid ${isDone ? '#b2f2bb' : isPending ? '#ffc9c9' : '#dee2e6'}` }}>
            <div style={{ color }}>{step.icon}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: color }}>{step.label}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isPending ? '#c92a2a' : '#495057' }}>
              {p?.qty != null ? Math.abs(p.qty).toLocaleString() : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { ordNo } = useParams<{ ordNo: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ordNo) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrderDetail(decodeURIComponent(ordNo));
      setDetail(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [ordNo]);

  useEffect(() => { load(); }, [load]);

  const h = detail?.header;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f6f8' }}>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'ORDER TRACKER', path: '/order-tracker' },
        { label: decodeURIComponent(ordNo ?? '') },
      ]} />

      <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        
        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => navigate('/order-tracker')} style={btnStyle('#fff', '#495057')}>
              <ChevronLeft size={16} /> กลับ
            </button>
            <div style={{ padding: '4px 16px', background: '#004b8d', color: '#fff', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,75,141,0.2)' }}>
              <FileText size={18} /> ORDER: {decodeURIComponent(ordNo ?? '')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={btnStyle('#fff', '#495057')} onClick={load}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> รีเฟรช
            </button>
            <button style={btnStyle('#1971c2', '#fff')} onClick={() => window.print()}>
              <Printer size={14} /> พิมพ์รายงาน
            </button>
          </div>
        </div>

        {/* ── Order Header Info ── */}
        {h && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #dee2e6', padding: '20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', flex: 1, gap: '24px' }}>
              <InfoCol label="Customer" value={`${h.CustCode} — ${h.CustName}`} />
              <InfoCol label="PO No." value={h.PONo || '—'} />
              <InfoCol label="Material" value={h.OrdMat || '—'} />
              <InfoCol label="Order Date" value={fDate(h.OrdDate)} />
              <InfoCol label="Due Date" value={fDate(h.DueDate)} warning />
            </div>
            <div style={{ display: 'flex', gap: '24px', borderLeft: '1px solid #e9ecef', paddingLeft: '24px' }}>
              <InfoCol label="Total Qty" value={fQty(h.TotalQty)} highlight />
              <InfoCol label={`Amount (${h.CurrCode || '$'})`} value={fAmt(h.TotalAmount)} success />
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '16px', background: '#ffe3e3', border: '1px solid #ffc9c9', borderRadius: '8px', marginBottom: '24px', color: '#c92a2a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {/* ── Items List ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#adb5bd' }}>กำลังโหลดข้อมูล...</div>
        ) : detail?.lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#adb5bd', background: '#fff', borderRadius: '12px', border: '1px solid #dee2e6' }}>ไม่พบข้อมูลรายการสินค้า</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {detail?.lines.map(line => (
              <div key={line.LineNo} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #dee2e6', overflow: 'hidden', display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                
                {/* Photo */}
                <div style={{ width: '160px', background: '#f8f9fa', borderRight: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                  {line.ItemPhoto ? (
                    <img src={line.ItemPhoto} alt={line.ItemNo} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#adb5bd' }}>
                      <ImageIcon size={32} style={{ margin: '0 auto', marginBottom: '8px' }} />
                      <div style={{ fontSize: '0.7rem' }}>No Image</div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#868e96', fontWeight: 700, marginBottom: '4px' }}>LINE {line.LineNo}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#004b8d', marginBottom: '4px' }}>{line.ItemNo}</div>
                      <div style={{ fontSize: '0.85rem', color: '#495057' }}>{line.ItemDesc || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#868e96', fontWeight: 700, marginBottom: '4px' }}>QTY / AMOUNT</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1971c2' }}>{fQty(line.Qty)}</div>
                      <div style={{ fontSize: '0.85rem', color: '#099268', fontWeight: 700 }}>{fAmt(line.Amount)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', fontSize: '0.8rem' }}>
                    <div><span style={{ color: '#868e96' }}>Material:</span> <b style={{ color: '#212529' }}>{line.ItemMat || '—'}</b></div>
                    <div><span style={{ color: '#868e96' }}>Size:</span> <b style={{ color: '#212529' }}>{line.ItemSize || '—'}</b></div>
                    <div><span style={{ color: '#868e96' }}>Status:</span> <b style={{ color: line.ItemStatus === 'Y' ? '#2b8a3e' : '#e67700' }}>{line.ItemStatus === 'Y' ? 'Done' : 'Pending'}</b></div>
                    <div><span style={{ color: '#868e96' }}>Finish Qty:</span> <b style={{ color: line.FinishQty === line.Qty ? '#2b8a3e' : '#212529' }}>{fQty(line.FinishQty)}</b></div>
                  </div>

                  {/* Production Tracker */}
                  <StepTracker processes={line.processes} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Component Helpers ───

function InfoCol({ label, value, highlight, warning, success }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '0.65rem', color: '#868e96', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ 
        fontSize: '1rem', 
        fontWeight: highlight || warning || success ? 800 : 600, 
        color: warning ? '#e03131' : success ? '#099268' : highlight ? '#1971c2' : '#212529' 
      }}>
        {value}
      </span>
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
    border: bg === '#fff' ? '1px solid #ced4da' : 'none',
    background: bg, color: color,
    cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: bg === '#fff' ? '0 2px 4px rgba(0,0,0,0.02)' : '0 2px 6px rgba(25,113,194,0.3)'
  };
}