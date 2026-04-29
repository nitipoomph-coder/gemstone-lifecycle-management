// src/pages/OrderDetailPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// หน้าแสดงรายละเอียด Order แบบ Full Page
// Route: /order-tracker/:ordNo
// API : GET /api/orders/:ordNo  →  { ok, header, lines[], lineCount }
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Printer, RefreshCw, AlertTriangle, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { fetchOrderDetail, type OrderDetail, type OrderLine } from '../services/orderTrackerAPI';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  P: { label: 'Pending', bg: '#fff3bf', color: '#e67700' },
  N: { label: 'New', bg: '#e7f5ff', color: '#1971c2' },
  C: { label: 'Complete', bg: '#d3f9d8', color: '#2f9e44' },
  Y: { label: 'Done', bg: '#d3f9d8', color: '#2f9e44' },
  X: { label: 'Cancel', bg: '#ffe3e3', color: '#c92a2a' },
};

function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ? STATUS_MAP[status] : null;
  if (!s) return <span style={{ color: '#aaa', fontSize: '0.7rem' }}>—</span>;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '3px',
      fontSize: '0.68rem', fontWeight: 700, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ─── Process status cell ──────────────────────────────────────────────────────
// qty ติดลบ = ยังค้างอยู่ในขั้นตอนนั้น (แดง) / 0 = ผ่านแล้ว (เขียว) / null = ยังไม่ถึง
function ProcessCell({ qty, status }: { qty: number | null; status: string | null }) {
  if (qty == null && !status) return <span style={{ color: '#dee2e6' }}>—</span>;
  const isNeg = qty != null && qty < 0;
  const isZero = qty === 0;
  const isDone = status === 'Y' || status === 'C';
  const color = isDone || isZero ? '#2f9e44' : isNeg ? '#e03131' : '#495057';
  const fw = isNeg || isDone ? 700 : 400;
  return (
    <span style={{ color, fontWeight: fw, fontSize: '0.72rem' }}>
      {qty != null ? qty.toLocaleString() : ''}
      {status && <span style={{ marginLeft: '3px', fontSize: '0.62rem', opacity: 0.75 }}>{status}</span>}
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      <style>{`@keyframes skSh{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '8px 6px' }}>
              <div style={{
                height: '12px', borderRadius: '2px',
                background: 'linear-gradient(90deg,#f1f3f5 25%,#e9ecef 50%,#f1f3f5 75%)',
                backgroundSize: '400% 100%',
                animation: 'skSh 1.4s ease-in-out infinite',
                animationDelay: `${(i * cols + j) * 0.02}s`,
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Column definition ────────────────────────────────────────────────────────
// แบ่งกลุ่มเหมือนระบบเก่า VB.net
const COL_GROUPS = [
  {
    label: '',
    bg: '#004b8d',
    cols: [
      { key: 'lineno', label: 'Line', w: 36, align: 'center' as const },
      { key: 'photo', label: 'Picture', w: 56, align: 'center' as const },
      { key: 'itemno', label: 'Item No.', w: 100, align: 'left' as const },
      { key: 'desc', label: 'Description', w: 160, align: 'left' as const },
      { key: 'mat', label: 'Mat', w: 44, align: 'center' as const },
      { key: 'size', label: 'Size', w: 80, align: 'center' as const },
      { key: 'qty', label: 'Qty', w: 60, align: 'right' as const },
      { key: 'price', label: 'Price', w: 70, align: 'right' as const },
      { key: 'amount', label: 'Amount', w: 80, align: 'right' as const },
      { key: 'itemstat', label: 'Status', w: 70, align: 'center' as const },
    ],
  },
  {
    label: 'Production Balance',
    bg: '#1864ab',
    cols: [
      { key: 'cast', label: 'Cast', w: 54, align: 'right' as const },
      { key: 'grind', label: 'Grind', w: 54, align: 'right' as const },
      { key: 'polish', label: 'Polish', w: 54, align: 'right' as const },
      { key: 'set', label: 'Set', w: 54, align: 'right' as const },
      { key: 'epox', label: 'Epox', w: 54, align: 'right' as const },
      { key: 'plate', label: 'Plate', w: 54, align: 'right' as const },
      { key: 'assem', label: 'Assem', w: 54, align: 'right' as const },
      { key: 'qc', label: 'QC', w: 54, align: 'right' as const },
      { key: 'pack', label: 'Pack', w: 54, align: 'right' as const },
    ],
  },
  {
    label: '',
    bg: '#004b8d',
    cols: [
      { key: 'finqty', label: 'Finish Qty', w: 68, align: 'right' as const },
      { key: 'finstat', label: 'Finish', w: 60, align: 'center' as const },
    ],
  },
];

const ALL_COLS = COL_GROUPS.flatMap(g => g.cols);

// ─── Shared cell style ────────────────────────────────────────────────────────
const TD: React.CSSProperties = {
  padding: '7px 6px',
  border: '1px solid #dee2e6',
  fontSize: '0.72rem',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
  fontFamily: 'Tahoma, "Segoe UI", sans-serif',
  color: '#212529',
};

const TH: React.CSSProperties = {
  padding: '6px 6px',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: '#fff',
  background: '#004b8d',
  border: '1px solid #003d73',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  // รองรับทั้ง /order-tracker/po/:poNo และ /order-tracker/ord/:ordNo และ legacy /:ordNo
  const { poNo, ordNo } = useParams<{ poNo?: string; ordNo?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // key ที่ใช้จริง
  const isPo = Boolean(poNo);
  const rawKey = isPo ? poNo! : ordNo!;

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // view จาก ?view= query param (sales | prod | all) — default = prod
  const viewParam = (searchParams.get('view') as 'sales' | 'prod' | 'all') || 'prod';
  const [view, setView] = useState<'sales' | 'prod' | 'all'>(viewParam);

  const load = useCallback(async () => {
    if (!rawKey) return;
    setLoading(true);
    setError(null);
    try {
      let data: OrderDetail;
      if (isPo) {
        const { fetchOrderByPo } = await import('../services/orderTrackerAPI');
        data = await fetchOrderByPo(decodeURIComponent(rawKey)) as unknown as OrderDetail;
      } else {
        data = await fetchOrderDetail(decodeURIComponent(rawKey));
      }
      setDetail(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [rawKey, isPo]);

  useEffect(() => { load(); }, [load]);

  // ── คอลัมน์ที่แสดงตาม view ─────────────────────────────────────────────────
  const visibleGroups = (() => {
    if (view === 'sales') {
      // Sales: เฉพาะ group แรก (ข้อมูล order)
      return [COL_GROUPS[0]];
    }
    if (view === 'prod') {
      // Production: ทุก group ยกเว้น price/amount
      return COL_GROUPS;
    }
    // All: ทุก group รวม price/amount
    return COL_GROUPS;
  })();

  const visibleCols = visibleGroups.flatMap(g => g.cols).filter(c => {
    if (view === 'sales') return true; // ทุก col ใน sales group
    // prod/all: ซ่อน price ถ้า view=prod
    if (view === 'prod' && (c.key === 'price' || c.key === 'amount')) return false;
    return true;
  });

  const h = detail?.header;

  return (
    <>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'ORDER TRACKER', path: '/order-tracker' },
        // แสดง PONo เป็น key หลัก
        { label: isPo ? decodeURIComponent(rawKey) : decodeURIComponent(rawKey) },
      ]} />

      <div
        className="content-scrollbar flex-1 overflow-y-auto"
        style={{ background: '#f8f9fa', display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >

        {/* ── Action bar ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          padding: '7px 12px', background: '#fff', borderBottom: '1px solid #dee2e6',
        }}>
          {/* Back */}
          <button
            onClick={() => navigate('/order-tracker')}
            style={btnStyle()}
          >
            <ChevronLeft size={13} /> กลับ
          </button>

          <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 2px' }} />

          {/* Edit */}
          <button style={btnStyle('#1971c2', '#fff')}>
            <Edit2 size={12} /> แก้ไข
          </button>

          {/* Delete */}
          <button style={btnStyle('#e03131', '#fff')}>
            <Trash2 size={12} /> ลบ
          </button>

          {/* Print */}
          <button style={btnStyle()} onClick={() => window.print()}>
            <Printer size={12} /> พิมพ์
          </button>

          {/* Refresh */}
          <button style={btnStyle()} onClick={load}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            รีเฟรช
          </button>

          <div style={{ flex: 1 }} />

          {/* View toggle */}
          <div style={{ display: 'flex', borderRadius: '3px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
            {(['sales', 'prod', 'all'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '4px 12px', fontSize: '0.68rem', fontWeight: 700,
                  letterSpacing: '0.05em', border: 'none', cursor: 'pointer',
                  background: view === v ? '#004b8d' : '#fff',
                  color: view === v ? '#fff' : '#495057',
                  borderRight: v !== 'all' ? '1px solid #dee2e6' : 'none',
                }}
              >
                {v === 'sales' ? 'Sales View' : v === 'prod' ? 'Production View' : 'All View'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Order header info ───────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0',
          background: '#fff', borderBottom: '1px solid #dee2e6',
          padding: '8px 14px',
        }}>
          {h ? (
            <>
              {isPo ? (
                /* PO-mode: PONo เป็น highlight หลัก */
                <>
                  <InfoChip label="PO No." value={h.PONo || decodeURIComponent(rawKey)} highlight />
                  <InfoDivider />
                  {/* OrdNos tags */}
                  <div style={{ padding: '2px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.6rem', color: '#868e96', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Order No(s)</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {((h as any).OrdNos as string[] || [h.OrdNo]).map((o: string) => (
                        <span key={o} style={{ fontSize: '0.68rem', background: '#e7f5ff', color: '#1971c2', padding: '1px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>{o}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* OrdNo-mode: OrdNo เป็น highlight */
                <>
                  <InfoChip label="Order No." value={h.OrdNo} highlight />
                  <InfoDivider />
                  <InfoChip label="PO No." value={h.PONo || '—'} />
                </>
              )}
              <InfoDivider />
              <InfoChip label="Customer" value={`${h.CustCode} — ${h.CustName}`} />
              <InfoDivider />
              <InfoChip label="Material" value={h.OrdMat || '—'} />
              <InfoDivider />
              <InfoChip label="Order Date" value={fDate(h.OrdDate)} />
              <InfoDivider />
              <InfoChip label="Due Date" value={fDate(h.DueDate)} red />
              <div style={{ flex: 1 }} />
              {/* Summary right */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                <SumBox label="Lines" value={String(detail?.lineCount ?? '—')} />
                <SumBox label="Total Qty" value={fQty(h.TotalQty)} blue />
                <SumBox label={`Amount (${h.CurrCode || '$'})`} value={fAmt(h.TotalAmount)} />
                <StatusBadge status={h.OrdStatus} />
              </div>
            </>
          ) : loading ? (
            <div style={{ color: '#adb5bd', fontSize: '0.75rem' }}>กำลังโหลด...</div>
          ) : null}
        </div>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', background: '#fff5f5', borderBottom: '1px solid #ffc9c9',
          }}>
            <AlertTriangle size={13} style={{ color: '#e03131', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#c92a2a' }}>{error}</span>
            <button
              onClick={load}
              style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#1971c2', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse',
            fontFamily: 'Tahoma, "Segoe UI", sans-serif',
            fontSize: '0.72rem',
            minWidth: '100%',
            tableLayout: 'fixed',
          }}>
            <colgroup>
              {visibleCols.map(c => <col key={c.key} style={{ width: c.w }} />)}
            </colgroup>

            <thead>
              {/* Group header row */}
              <tr>
                {visibleGroups.map((g, gi) => {
                  const cols = g.cols.filter(c => visibleCols.find(vc => vc.key === c.key));
                  if (cols.length === 0) return null;
                  return g.label ? (
                    <th key={gi} colSpan={cols.length} style={{
                      ...TH,
                      background: g.bg,
                      top: 0, zIndex: 11,
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                    }}>
                      {g.label}
                    </th>
                  ) : (
                    cols.map(c => (
                      <th key={c.key} rowSpan={2} style={{
                        ...TH,
                        background: g.bg,
                        textAlign: c.align,
                        top: 0, zIndex: 11,
                      }}>
                        {c.label}
                      </th>
                    ))
                  );
                })}
              </tr>

              {/* Sub-header row (production cols only) */}
              <tr>
                {visibleGroups
                  .filter(g => g.label)
                  .flatMap(g =>
                    g.cols
                      .filter(c => visibleCols.find(vc => vc.key === c.key))
                      .map(c => (
                        <th key={c.key} style={{
                          ...TH,
                          background: g.bg ? `${g.bg}cc` : '#1864ab',
                          textAlign: c.align,
                          top: 28,
                        }}>
                          {c.label}
                        </th>
                      ))
                  )
                }
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <SkeletonRows cols={visibleCols.length} />
              ) : !detail || detail.lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleCols.length}
                    style={{ ...TD, textAlign: 'center', padding: '40px', color: '#adb5bd' }}
                  >
                    ไม่พบข้อมูลรายการสินค้า
                  </td>
                </tr>
              ) : (
                detail.lines.map((line, i) => {
                  const rowBg = i % 2 === 0 ? '#fff' : '#f8f9fa';
                  return (
                    <tr
                      key={line.LineNo}
                      style={{ background: rowBg, transition: 'background 0.08s', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#e7f5ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      {/* ── Fixed cols ── */}
                      {visibleCols.map(c => {
                        switch (c.key) {
                          case 'lineno':
                            return <td key={c.key} style={{ ...TD, textAlign: 'center', color: '#868e96' }}>{line.LineNo}</td>;

                          case 'photo':
                            return (
                              <td key={c.key} style={{ ...TD, textAlign: 'center', padding: '3px' }}>
                                <div style={{
                                  width: 38, height: 38, borderRadius: '3px',
                                  background: '#f1f3f5', overflow: 'hidden',
                                  border: '1px solid #dee2e6',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  margin: '0 auto',
                                }}>
                                  {line.ItemPhoto
                                    ? <img src={line.ItemPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <ImageIcon size={13} style={{ color: '#ced4da' }} />
                                  }
                                </div>
                              </td>
                            );

                          case 'itemno':
                            return <td key={c.key} style={{ ...TD, fontWeight: 700, color: '#1971c2' }}>{line.ItemNo}</td>;

                          case 'desc':
                            return (
                              <td key={c.key} style={{ ...TD, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }} title={line.ItemDesc}>
                                {line.ItemDesc || '—'}
                              </td>
                            );

                          case 'mat':
                            return <td key={c.key} style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>{line.ItemMat || '—'}</td>;

                          case 'size':
                            return <td key={c.key} style={{ ...TD, textAlign: 'center', color: '#495057' }}>{line.ItemSize || '—'}</td>;

                          case 'qty':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#1971c2' }}>{fQty(line.Qty)}</td>;

                          case 'price':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right', color: '#495057' }}>{fAmt(line.Price)}</td>;

                          case 'amount':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right', fontWeight: 600, color: '#212529' }}>{fAmt(line.Amount)}</td>;

                          case 'itemstat':
                            return <td key={c.key} style={{ ...TD, textAlign: 'center' }}><StatusBadge status={line.ItemStatus} /></td>;

                          // ── Production process cols ──
                          case 'cast':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.Cast} /></td>;
                          case 'grind':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.Grind} /></td>;
                          case 'polish':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.Polish} /></td>;
                          case 'set':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.Set} /></td>;
                          case 'epox':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.Epox} /></td>;
                          case 'plate':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.Plate} /></td>;
                          case 'assem':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.Assem} /></td>;
                          case 'qc':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.QC} /></td>;
                          case 'pack':
                            return <td key={c.key} style={{ ...TD, textAlign: 'right' }}><ProcessCell {...line.processes.Pack} /></td>;

                          case 'finqty':
                            return (
                              <td key={c.key} style={{ ...TD, textAlign: 'right', fontWeight: 700, color: line.FinishQty === line.Qty ? '#2f9e44' : '#495057' }}>
                                {fQty(line.FinishQty)}
                              </td>
                            );

                          case 'finstat':
                            return <td key={c.key} style={{ ...TD, textAlign: 'center' }}><StatusBadge status={line.FinishStatus} /></td>;

                          default:
                            return <td key={c.key} style={TD}>—</td>;
                        }
                      })}
                    </tr>
                  );
                })
              )}

              {/* ── Total row ── */}
              {!loading && detail && detail.lines.length > 0 && (
                <tr style={{ background: '#e9ecef', fontWeight: 700 }}>
                  {visibleCols.map((c, i) => (
                    <td key={c.key} style={{
                      ...TD,
                      background: '#e9ecef',
                      textAlign: c.align,
                      fontWeight: 700,
                      color: '#212529',
                      borderTop: '2px solid #adb5bd',
                    }}>
                      {i === 0 ? 'รวม' : c.key === 'qty' ? fQty(detail.lines.reduce((s, l) => s + (l.Qty || 0), 0)) : c.key === 'amount' ? fAmt(detail.lines.reduce((s, l) => s + (l.Amount || 0), 0)) : ''}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer count ───────────────────────────────────────────────────── */}
        {!loading && detail && (
          <div style={{
            padding: '5px 12px', background: '#fff', borderTop: '1px solid #dee2e6',
            fontSize: '0.68rem', color: '#868e96', flexShrink: 0,
          }}>
            {detail.lineCount.toLocaleString()} รายการ
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────
function InfoChip({ label, value, highlight, red }: { label: string; value: string; highlight?: boolean; red?: boolean }) {
  return (
    <div style={{ padding: '2px 10px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
      <span style={{ fontSize: '0.6rem', color: '#868e96', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{
        fontSize: '0.78rem', fontWeight: highlight ? 800 : 600,
        color: red ? '#c92a2a' : highlight ? '#1971c2' : '#212529',
        fontFamily: 'Tahoma, "Segoe UI", sans-serif',
      }}>
        {value}
      </span>
    </div>
  );
}

function InfoDivider() {
  return <div style={{ width: '1px', height: '28px', background: '#dee2e6', flexShrink: 0 }} />;
}

function SumBox({ label, value, blue }: { label: string; value: string; blue?: boolean }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '0.58rem', color: '#868e96', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: blue ? '#1971c2' : '#212529', lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

function btnStyle(bg?: string, color?: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '4px 11px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600,
    border: bg ? 'none' : '1px solid #dee2e6',
    background: bg || '#fff',
    color: color || '#495057',
    cursor: 'pointer',
    fontFamily: 'Tahoma, "Segoe UI", sans-serif',
  };
}