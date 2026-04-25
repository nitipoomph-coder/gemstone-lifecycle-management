import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { fetchOrderDetail, type OrderDetail, type OrderLine } from '../services/orderTrackerAPI';
import { ArrowLeft, AlertTriangle, RefreshCw, Image as ImageIcon } from 'lucide-react';

// ─── Process columns to display ───────────────────────────────────────────────
const PROCESSES = [
  { key: 'Cast',   label: 'CAST' },
  { key: 'Grind',  label: 'GRIND' },
  { key: 'Polish', label: 'POLISH' },
  { key: 'Set',    label: 'SET' },
  { key: 'Epox',   label: 'EPOX' },
  { key: 'Plate',  label: 'PLATE' },
  { key: 'Assem',  label: 'ASSEM' },
  { key: 'QC',     label: 'QC' },
  { key: 'Pack',   label: 'PACK' },
] as const;

type ProcessKey = typeof PROCESSES[number]['key'];

function ProcessBadge({ label, proc, totalQty }: { label: string, proc: { qty: number | null; status: string | null }, totalQty: number }) {
  if (!proc.qty) return null; // ไม่โชว์แผนกที่ไม่มีงานเลย เพื่อความสะอาดตา
  
  const done = proc.status === 'Y';
  const isWorking = proc.status === 'W';
  const isPending = proc.status === 'P';
  
  const showPartial = proc.qty < totalQty && !done;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: '60px',
      background: isWorking ? 'var(--color-brand-500)' : isPending ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
      padding: '6px 8px',
      borderRadius: '8px',
      border: done ? '1px solid oklch(0.70 0.16 150)' : isWorking ? '1px solid var(--color-brand-600)' : '1px solid var(--color-border-default)',
    }}>
      <div style={{ 
        fontSize: '0.6rem', 
        fontWeight: 700, 
        letterSpacing: '0.05em',
        color: isWorking ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)',
        opacity: isWorking ? 0.9 : 1,
        marginBottom: '2px'
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '0.9rem', 
        fontWeight: 800,
        color: isWorking ? 'var(--color-text-inverse)' : done ? 'oklch(0.70 0.16 150)' : 'var(--color-text-primary)',
      }}>
        {proc.qty?.toLocaleString()}
      </div>
      
      {showPartial && (
        <div style={{ fontSize: '0.55rem', color: isWorking ? 'rgba(255,255,255,0.8)' : 'var(--color-brand-600)', marginTop: '2px', fontWeight: 700 }}>
          PARTIAL
        </div>
      )}
      
      {done && (
        <div style={{ fontSize: '0.6rem', color: 'oklch(0.70 0.16 150)', marginTop: '2px', fontWeight: 700 }}>
          ✓ DONE
        </div>
      )}
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = '14px' }: { w?: string; h?: string }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: '2px',
      background: 'linear-gradient(90deg,oklch(0.22 0.03 250) 25%,oklch(0.28 0.04 250) 50%,oklch(0.22 0.03 250) 75%)',
      backgroundSize: '400% 100%',
      animation: 'skSh 1.4s ease-in-out infinite',
    }} />
  );
}

export default function OrderDetailPage() {
  const { ordNo } = useParams<{ ordNo: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Filter: hide fully finished lines
  const [hideFinished, setHideFinished] = useState(true);

  const load = async () => {
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
  };

  useEffect(() => { load(); }, [ordNo]);

  const h = detail?.header;

  // Lines to display — filter finished if toggled
  const lines: OrderLine[] = (() => {
    if (!detail?.lines) return [];
    if (!hideFinished) return detail.lines;
    return detail.lines.filter(l => l.FinishStatus !== 'Y' && l.ItemStatus !== 'C');
  })();

  const totalQty    = lines.reduce((s, l) => s + (l.Qty    || 0), 0);
  const totalFinish = lines.reduce((s, l) => s + (l.FinishQty || 0), 0);

  return (
    <>
      <style>{`@keyframes skSh{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <Topbar breadcrumb={[
        { label: 'ORDER TRACKER', path: '/order-tracker' },
        { label: ordNo || '...' },
      ]} />

      <div className="content-scrollbar flex-1 overflow-y-auto bg-[var(--color-surface-0)]">

        {/* ─── Header card ─── */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--color-surface-1)',
          borderBottom: '1px solid var(--color-border-light)',
        }}>
          {/* Back + title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <button onClick={() => navigate('/order-tracker')} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-tertiary)', fontSize: '0.75rem',
              padding: '4px 8px', borderRadius: '4px',
              transition: 'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
            >
              <ArrowLeft size={13} /> Back
            </button>
            <div style={{ fontFamily: 'var(--font-logo)', fontSize: '1rem', letterSpacing: '0.15em', color: 'var(--color-brand-500)' }}>
              {loading ? <Skeleton w="160px" h="20px" /> : h?.OrdNo}
            </div>
            <button onClick={load} title="Refresh" style={{
              marginLeft: 'auto', background: 'none', border: '1px solid var(--color-border-default)',
              borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--color-text-secondary',
              display: 'flex', alignItems: 'center',
            }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px' }}>
            {[
              { label: 'CUSTOMER',   value: loading ? null : (h?.CustName || h?.CustCode) },
              { label: 'PO NO',      value: loading ? null : h?.PONo },
              { label: 'ORDER DATE', value: loading ? null : formatDate(h?.OrdDate ?? null) },
              { label: 'DUE DATE',   value: loading ? null : formatDate(h?.DueDate ?? null) },
              { label: 'MATERIAL',   value: loading ? null : (h?.OrdMat || '—') },
              { label: 'TOTAL QTY',  value: loading ? null : (h?.TotalQty?.toLocaleString() ?? '—') },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-text-tertiary)', marginBottom: '3px' }}>{label}</div>
                {value == null ? <Skeleton w="80%" /> : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>{value}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Error ─── */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'oklch(0.28 0.06 25)' }}>
            <AlertTriangle size={13} style={{ color: 'oklch(0.62 0.20 25)' }} />
            <span style={{ fontSize: '0.75rem', color: 'oklch(0.80 0.10 25)' }}>{error}</span>
          </div>
        )}

        {/* ─── Table controls ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 24px',
          borderBottom: '1px solid var(--color-border-light)',
          background: 'var(--color-surface-0)',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
            {loading ? '...' : `${lines.length} lines | Qty: ${totalQty.toLocaleString()} | Finished: ${totalFinish.toLocaleString()}`}
          </div>
          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={hideFinished}
              onChange={e => setHideFinished(e.target.checked)}
              style={{ accentColor: 'var(--color-brand-500)', cursor: 'pointer' }}
            />
            ซ่อนงานเสร็จแล้ว
          </label>
        </div>

        {/* ─── Cards Layout ─── */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: '16px', background: 'var(--color-surface-0)', borderRadius: '12px', border: '1px solid var(--color-border-default)' }}>
                 <Skeleton h="60px" />
              </div>
            ))
          ) : lines.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.8rem', background: 'var(--color-surface-0)', borderRadius: '12px', border: '1px dashed var(--color-border-default)' }}>
              ไม่มีรายการ{hideFinished ? ' (งานทั้งหมดเสร็จแล้ว)' : ''}
            </div>
          ) : lines.map((line) => {
            const isFinished = line.FinishStatus === 'Y';
            return (
              <div
                key={line.LineNo}
                style={{
                  background: 'var(--color-surface-0)',
                  borderRadius: '12px',
                  border: isFinished ? '1px solid oklch(0.70 0.16 150 / 0.4)' : '1px solid var(--color-border-default)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  opacity: isFinished ? 0.7 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* แถบด้านบน: ข้อมูลสินค้า */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: '16px', 
                  padding: '16px', 
                  borderBottom: '1px solid var(--color-border-light)' 
                }}>
                  {/* รูปภาพสินค้า */}
                  <div style={{ 
                    width: '80px', height: '80px', flexShrink: 0,
                    background: 'var(--color-surface-1)', borderRadius: '8px', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--color-border-light)'
                  }}>
                    {line.ItemPhoto ? (
                      <img src={line.ItemPhoto} alt={line.ItemNo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={24} style={{ color: 'var(--color-text-tertiary)' }} />
                    )}
                  </div>

                  {/* รายละเอียด */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'inline-block', padding: '2px 6px', background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', fontWeight: 700, borderRadius: '4px', marginBottom: '4px' }}>
                          LINE {line.LineNo}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-brand-600)', fontFamily: 'var(--font-logo)' }}>
                          {line.ItemNo}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {line.ItemDesc || 'No Description'}
                        </div>
                      </div>
                      
                      {/* ยอดรวม */}
                      <div style={{ textAlign: 'right', background: 'var(--color-surface-1)', padding: '8px 12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>TOTAL QTY</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          {line.Qty?.toLocaleString() ?? '—'}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: isFinished ? 'oklch(0.70 0.16 150)' : 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Finished: {line.FinishQty ? line.FinishQty.toLocaleString() : '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* แถบด้านล่าง: Production Kanban Flow */}
                <div style={{ padding: '16px', background: 'var(--color-surface-0)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    PRODUCTION STATUS (PENDING QTY)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {PROCESSES.map(p => (
                      <ProcessBadge key={p.key} label={p.label} proc={line.processes[p.key as ProcessKey]} totalQty={line.Qty} />
                    ))}
                    {PROCESSES.every(p => !line.processes[p.key as ProcessKey]?.qty) && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', padding: '8px' }}>
                        No active production processes.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
