// src/components/dashboard/OrderTable.tsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Image as ImageIcon, BarChart2, DollarSign, Layers, X } from 'lucide-react';
import { type OrderSummary } from '../../services/orderAPI';
import { psPhotoUrl, attachPhotoFallback } from '../../utils/photoUrl';

// ─── Helpers ─────────────────────────────────────────────────────────────────
// ช่องที่ไม่มีข้อมูล = เว้นว่าง (ตามที่ผู้ใช้ระบุ ไม่ใส่ placeholder '-')
const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
const formatQty = (n: number | null | undefined) => (n != null ? n.toLocaleString() : '');

type ColDef = {
  label: string;
  w: number;
  align: 'left' | 'center' | 'right';
  render: (o: OrderSummary, i: number, offset: number) => React.ReactNode;
  cellStyle?: (o: OrderSummary) => React.CSSProperties;
};

// คอลัมน์ข้อความ/สถานะ (Track / QC / Pack) — โชว์ค่าตรง ๆ, ว่างถ้าไม่มี
const txt = (label: string, key: keyof OrderSummary, w = 100, align: 'left' | 'center' | 'right' = 'center'): ColDef => ({
  label, w, align,
  render: (o) => (o[key] as string | null) || '',
  cellStyle: () => ({ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.8rem' }),
});

// คอลัมน์จำนวนงานค้าง (Pending Qty) — ติดลบ = ค้าง แสดงสีแดง, ว่างถ้า null
const pen = (label: string, key: keyof OrderSummary, w = 78): ColDef => ({
  label, w, align: 'right',
  render: (o) => { const v = o[key] as number | null; return v != null ? v.toLocaleString() : ''; },
  cellStyle: (o) => {
    const v = o[key] as number | null;
    return v != null && v < 0
      ? { color: 'var(--color-danger-500)', fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: '0.85rem' }
      : { fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', fontSize: '0.85rem' };
  },
});

// ─── View Selection Popup ─────────────────────────────────────────────────────
type ViewMode = 'sales' | 'prod' | 'all';

interface ViewPickerProps {
  order: OrderSummary;
  onClose: () => void;
  onSelect: (view: ViewMode) => void;
}

const VIEW_OPTIONS: {
  key: ViewMode;
  label: string;
  sub: string;
  icon: React.ReactNode;
  accentColor: string;
}[] = [
    {
      key: 'sales',
      label: 'Sales Perspective',
      sub: 'Pricing, quantity, and total amount insights',
      icon: <DollarSign size={20} />,
      accentColor: 'oklch(0.75 0.16 80)', // Gold
    },
    {
      key: 'prod',
      label: 'Production Tracker',
      sub: 'Real-time production status and workflow tracking',
      icon: <BarChart2 size={20} />,
      accentColor: 'oklch(0.60 0.14 245)', // Blue
    },
    {
      key: 'all',
      label: 'Unified View',
      sub: 'Full dataset with all columns for deep-dive analysis',
      icon: <Layers size={20} />,
      accentColor: 'oklch(0.70 0.16 150)', // Green
    },
  ];

function ViewPickerModal({ order, onClose, onSelect }: ViewPickerProps) {
  const [hovered, setHovered] = useState<ViewMode | null>(null);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <div
        onClick={handleBackdrop}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'color-mix(in srgb, var(--color-surface-1), transparent 30%)',
          backdropFilter: 'blur(12px) saturate(160%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'modalFadeIn 0.3s ease-out forwards',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface-0)',
            borderRadius: '28px',
            boxShadow: '0 40px 100px -20px color-mix(in srgb, var(--color-surface-900) 30%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-border-light), transparent 50%)',
            width: '480px',
            maxWidth: '95vw',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* ─── Premium Header ─── */}
          <div style={{
            padding: '40px 40px 32px',
            textAlign: 'center',
            position: 'relative',
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-brand-500), transparent 96%), transparent)',
          }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '24px', right: '24px',
                background: 'var(--color-surface-2)', border: 'none', borderRadius: '12px',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--color-text-tertiary)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'rotate(90deg)';
                e.currentTarget.style.background = 'var(--color-danger-500)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'rotate(0deg)';
                e.currentTarget.style.background = 'var(--color-surface-2)';
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              display: 'inline-flex', padding: '6px 14px', borderRadius: '100px',
              background: 'color-mix(in srgb, var(--color-brand-500), transparent 90%)',
              color: 'var(--color-brand-600)',
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'capitalize', marginBottom: '24px',
              border: '1px solid color-mix(in srgb, var(--color-brand-500), transparent 80%)'
            }}>
              Select Intelligence View
            </div>

            <h3 style={{
              fontSize: '2rem', fontWeight: 900, color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)', margin: '0 0 8px',
              letterSpacing: '-0.03em', lineHeight: 1.1
            }}>
              {order.PONo || 'NO PO'}
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px 24px',
              marginTop: '32px',
              textAlign: 'left',
              background: 'var(--color-surface-1)',
              padding: '20px 24px',
              borderRadius: '20px',
              border: '1px solid var(--color-border-light)',
            }}>
              {/* Row 1: Customer & Material */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Customer</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{order.CustCode || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Material</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{order.OrdMat || '-'}</span>
              </div>
              {/* Row 2: PO No & Order Kind */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border-light)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>PO Number</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>{order.PONo || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border-light)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Status</span>
                {order.OrdKind && (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 800,
                    color: 'var(--color-accent-600)',
                    background: 'color-mix(in srgb, var(--color-accent-500), transparent 90%)',
                    padding: '2px 8px', borderRadius: '6px', alignSelf: 'flex-start'
                  }}>
                    {order.OrdKind}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ─── Options List ─── */}
          <div style={{ padding: '0 32px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onMouseEnter={() => setHovered(opt.key)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '20px',
                    padding: '20px 24px', borderRadius: '20px',
                    background: hovered === opt.key ? 'var(--color-surface-1)' : 'transparent',
                    border: '1px solid',
                    borderColor: hovered === opt.key ? 'var(--color-border-light)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    textAlign: 'left', position: 'relative', overflow: 'hidden'
                  }}
                >
                  {hovered === opt.key && (
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                      background: opt.accentColor, borderRadius: '0 4px 4px 0'
                    }} />
                  )}

                  <div style={{
                    width: '52px', height: '52px', borderRadius: '16px',
                    background: hovered === opt.key ? opt.accentColor : 'var(--color-surface-2)',
                    color: hovered === opt.key ? '#fff' : 'var(--color-text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: hovered === opt.key ? `0 8px 20px -6px ${opt.accentColor}` : 'none'
                  }}>
                    {opt.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '1rem', fontWeight: 800,
                      color: hovered === opt.key ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      marginBottom: '2px', transition: 'color 0.2s'
                    }}>
                      {opt.label}
                    </div>
                    <div style={{
                      fontSize: '0.78rem', color: 'var(--color-text-tertiary)',
                      fontWeight: 500, lineHeight: 1.4
                    }}>
                      {opt.sub}
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    style={{
                      color: 'var(--color-text-quaternary)',
                      transform: hovered === opt.key ? 'translateX(0)' : 'translateX(-8px)',
                      opacity: hovered === opt.key ? 1 : 0,
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ─── Premium Footer ─── */}
          <div style={{
            padding: '16px', textAlign: 'center',
            background: 'var(--color-surface-1)',
            borderTop: '1px solid var(--color-border-light)',
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
              ESC TO DISMISS • INTEL-VIEW SYSTEM v2.0
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}


// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows({ activeCols }: { activeCols: { key: string; w: number }[] }) {
  return (
    <>
      <style>{`
        @keyframes skSh { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .skeleton-cell {
          background: linear-gradient(90deg, var(--color-surface-1) 25%, var(--color-surface-2) 50%, var(--color-surface-1) 75%);
          backgroundSize: 400% 100%;
          animation: skSh 1.4s ease-in-out infinite;
        }
      `}</style>
      {Array.from({ length: 12 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid var(--color-border-strong)' }}>
          {activeCols.map((c, idx) => {
            const isPinned = ['no', 'week', 'cust', 'po', 'po2', 'ordno', 'newReplen'].includes(c.key);
            let leftPos = 0;
            if (isPinned) {
              const prevPinned = activeCols.slice(0, idx);
              leftPos = prevPinned.reduce((sum, col) => sum + col.w, 0);
            }
            return (
              <td key={c.key} style={{
                padding: '16px 14px',
                borderRight: '1px solid var(--color-border-strong)',
                background: isPinned ? 'var(--color-surface-0)' : 'transparent',
                position: isPinned ? 'sticky' : 'static',
                left: isPinned ? leftPos : undefined,
                zIndex: isPinned ? 15 : 1,
                boxShadow: isPinned && c.key === 'newReplen' ? '4px 0 12px -4px rgba(0,0,0,0.05)' : 'none',
                minWidth: c.w, width: c.w, maxWidth: c.w, boxSizing: 'border-box'
              }}>
                {c.key === 'photo'
                  ? <div className="skeleton-cell" style={{ width: 100, height: 60, borderRadius: 6, margin: '0 auto' }} />
                  : <div className="skeleton-cell" style={{ height: '14px', borderRadius: '4px' }} />}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

// ─── Master column catalog ─────────────────────────────────────────────────────
// ลำดับ key = ลำดับการแสดงผลซ้าย→ขวา (activeCols filter จาก Object.keys ตามลำดับนี้)
// mapping อ้างอิง production_stages_mapping_log.md + PO_TRACKER_REVAMP_PLAN.md
export const MASTER_COLS: Record<string, ColDef> = {
  // ── Always-on / pinned ──
  no: {
    label: 'No.', w: 50, align: 'center',
    render: (_, i, offset) => offset + i + 1,
    cellStyle: () => ({ color: 'var(--color-text-tertiary)', background: 'var(--color-surface-1)', fontWeight: 700 }),
  },
  week: {
    label: 'Week', w: 62, align: 'center',
    render: (o) => o.Week,
    cellStyle: () => ({ fontWeight: 600, color: 'var(--color-brand-600)' }),
  },
  cust: {
    label: 'Cust', w: 70, align: 'center',
    render: (o) => o.CustCode,
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-text-primary)' }),
  },
  po: {
    label: 'PO No.', w: 160, align: 'center',
    render: (o) => o.PONo,
    cellStyle: () => ({ fontWeight: 900, color: 'var(--color-text-primary)' }),
  },

  // ── Customer Data ──
  po2: {
    label: 'PO2', w: 140, align: 'center',
    render: (o) => o.EXNo || '',
    cellStyle: () => ({ fontWeight: 600, color: 'var(--color-text-secondary)' }),
  },
  ordno: {
    label: 'Order No.', w: 170, align: 'left',
    render: (o) => o.OrdNo || '',
    cellStyle: () => ({ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.78rem' }),
  },
  newReplen: {
    label: 'New/\nReplen', w: 100, align: 'center',
    render: (o) => {
      const isUrgent = o.OrdKind?.toLowerCase().includes('urgent');
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {isUrgent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger-500)', boxShadow: '0 0 4px var(--color-danger-500)' }} />}
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            color: isUrgent ? 'var(--color-danger-600)' : 'var(--color-text-secondary)',
            textTransform: 'capitalize'
          }}>
            {o.OrdKind || ''}
          </span>
        </div>
      );
    },
  },
  metal: {
    label: 'Metal', w: 70, align: 'center',
    render: (o) => o.OrdMat || '',
    cellStyle: () => ({ fontWeight: 700, color: 'var(--color-text-secondary)' }),
  },
  shipto: {
    label: 'Ship To', w: 160, align: 'left',
    render: (o) => o.ShipTo,
    cellStyle: () => ({ fontWeight: 500, color: 'var(--color-text-secondary)' }),
  },
  photo: {
    label: 'Picture', w: 130, align: 'center',
    render: (o) => (
      <div style={{
        position: 'relative',
        width: 100, height: 60, borderRadius: 6,
        background: 'var(--color-surface-1)', overflow: 'hidden',
        margin: '0 auto', border: '1px solid var(--color-border-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px color-mix(in srgb, var(--color-surface-900) 5%, transparent)'
      }}>
        <ImageIcon size={30} style={{ color: 'var(--color-text-quaternary)', position: 'absolute' }} />
        {o.SampleItemNo && (
          <img
            key={o.SampleItemNo}
            src={psPhotoUrl(o.SampleItemNo)}
            alt="item"
            loading="lazy"
            onError={(e) => attachPhotoFallback(e, o.SampleItemNo)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>
    ),
  },
  orddate: {
    label: 'Order Date', w: 95, align: 'center',
    render: (o) => formatDate(o.OrdDate),
  },
  due: {
    label: 'Factory Due', w: 95, align: 'center',
    render: (o) => formatDate(o.DueDate),
    cellStyle: (o) => {
      const isLate = o.DueDate && new Date(o.DueDate) < new Date() && (o.OrdStatus === 'P' || o.OrdStatus === 'N');
      return isLate ? { color: 'var(--color-danger-500)', fontWeight: 800, background: 'color-mix(in srgb, var(--color-danger-500), transparent 94%)' } : {};
    }
  },
  qa: txt('QA / BBQ / Testing', 'TrackTest', 100),
  sgs: txt('SGS', 'OrdSGS', 60),
  qcdate: {
    label: 'QC Date', w: 95, align: 'center',
    render: (o) => formatDate(o.CustQCDate),
  },
  custdue: {
    label: 'Cust Due', w: 95, align: 'center',
    render: (o) => formatDate(o.CustDueDate),
  },
  oor: txt('OOR Date', 'OORDate', 95),
  sku: {
    label: 'No. of SKU', w: 85, align: 'center',
    render: (o) => (o.NumSKU ? o.NumSKU.toLocaleString() : ''),
    cellStyle: () => ({ fontWeight: 700, color: 'var(--color-accent-600)' }),
  },
  qty: {
    label: 'Qty', w: 80, align: 'right',
    render: (o) => formatQty(o.TotalQty),
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-brand-600)', fontFamily: 'var(--font-display)', fontSize: '0.85rem' }),
  },
  amount: {
    label: 'Amount ($)', w: 110, align: 'right',
    render: (o) => o.Amount != null ? `$${o.Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '',
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-success-600)', fontFamily: 'var(--font-display)', fontSize: '0.85rem' }),
  },
  remark: {
    label: 'Remark', w: 150, align: 'left',
    render: (o) => o.TrackRemark || '',
    cellStyle: () => ({ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }),
  },

  // ── Production — Stage Pending Qty ──
  stonePen: pen('PST', 'StonePenQty'),
  fitPen: pen('PC1', 'FitPenQty'),
  wijPen: pen('PWA', 'WijPenQty'),
  castPen: pen('PCA', 'CastPenQty'),
  controlPen: pen('PC2', 'ControlPenQty'),
  grindPen: pen('PF', 'GrindPenQty'),
  polishPen: pen('PL', 'PolishPenQty'),
  platePen: pen('PPL', 'PlatePenQty'),
  exportQty: pen('Shipped', 'ExportQty', 85),
  balQty: pen('Balance', 'BalQty', 85),
  expPct: {
    label: '% Shipped', w: 90, align: 'right',
    render: (o) => (o.ExpPct != null ? `${o.ExpPct}%` : ''),
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-accent-600)', fontFamily: 'var(--font-display)', fontSize: '0.85rem' }),
  },

  // ── Production — Book / QC ──
  bookInspect: txt('Book Inspect', 'BookDate', 110),
  bookShip: txt('Book Ship', 'BookShip', 100),
  qc1qty: txt('1. QC Qty', 'QC1_Qty', 85),
  qc1date: txt('1. QC Date', 'QC1_Date', 95),
  qc1fail: txt('1. QC Fail Qty', 'QC1_Fail', 95),
  qc2qty: txt('2. QC Qty', 'QC2_Qty', 85),
  qc2date: txt('2. QC Date', 'QC2_Date', 95),
  qc2fail: txt('2. QC Fail Qty', 'QC2_Fail', 95),
  qc3qty: txt('3. QC Qty', 'QC3_Qty', 85),
  qc3date: txt('3. QC Date', 'QC3_Date', 95),

  // --- N044 Specific Columns ---
  // แก้ชื่อในเครื่องหมาย ''
  qa_n044: txt('Inspection', 'TrackTest', 100),
  cardBox_n044: txt('BBQ/Top', 'PackCard', 120),
  orderTicket_n044: txt('ส่ง Test', 'TickOrd', 110),
  receiveTicket_n044: txt('1.ส่ง Ticket', 'TickRec', 130),
  sample_n044: txt('1.จัดส่ง Ticket', 'TrackSam', 90),
  custCT_n044: txt('2.สั่ง Card', 'TrackCT', 90),
  mf_n044: txt('2.เบิก/จัด Card', 'TrackMF', 90),
  packScanDo_n044: txt('3.สั่ง Box', 'PackScanDo', 160),
  packScanSen_n044: txt('3.เบิก/จัด Box', 'PackScanSen', 160),
  packScan_n044: txt('4.สั่ง Pouch', 'PackScanAppv', 100),
  packScanMF_n044: txt('4.เบิก/จัด Pouch', 'PackScanMF', 170),
  polyOrd_n044: txt('Remark', 'PolyOrd', 120),
  polyRec_n044: txt('Pack Scan', 'PolyRec', 130),
  tagRcyRec_n044: txt('Upload MF', 'TagRcyRec', 180),

  // ── Production — Pack / Tag ──
  cardBox: txt('1.Card/Box', 'PackCard', 120),
  orderTicket: txt('2.Order Ticket/Label', 'TickOrd', 110),
  receiveTicket: txt('3.Receive Ticket/Label', 'TickRec', 130),
  sample: txt('4.Sample', 'TrackSam', 90),
  custCT: txt('5.Cust CT', 'TrackCT', 90),
  mf: txt('6.MF', 'TrackMF', 90),
  packScanDo: txt('7.Day to Do Pack Scan', 'PackScanDo', 160),
  packScanSen: txt('8.Pack Scan Send Cust', 'PackScanSen', 160),
  packScan: txt('9.Pack Scan Approved On', 'PackScanAppv', 100),
  packScanMF: txt('10.Pack Scan Photo on MF', 'PackScanMF', 170),
  polyOrd: txt('4. Order Polybag', 'PolyOrd', 120),
  polyRec: txt('5. Receive Polybag', 'PolyRec', 130),
  tagRcyRec: txt('6. Receive Recycled Tag U413', 'TagRcyRec', 180),

  // ── Production — Issue / Plan ──
  prodRisk: {
    label: 'Production Risky Issue', w: 170, align: 'left',
    render: (o) => o.ProdRiskIssue || '',
    cellStyle: () => ({ color: 'var(--color-danger-600)', fontWeight: 600, fontSize: '0.78rem' }),
  },
  pqc: txt('PQC Plan Ship', 'PQCPlanShip', 115),

  arrow: {
    label: '', w: 40, align: 'left',
    render: () => <ChevronRight size={18} style={{ color: 'var(--color-text-quaternary)' }} />,
  }
};

// ── คอลัมน์ที่ฝ่ายผลิต "คีย์เอง" (ข้อมูลติดตามงานจากตาราง OrdTrackDT) ──
// ลงสีพื้นอำพัน (amber) เพื่อแยกให้เห็นชัดจากคอลัมน์ออเดอร์/ยอดที่ระบบคำนวณอัตโนมัติ (OrdHD/OrdDT)
const USER_INPUT_KEYS = new Set<string>([
  'qa', 'sgs', 'oor', 'remark',
  'bookInspect', 'bookShip',
  'qc1qty', 'qc1date', 'qc1fail', 'qc2qty', 'qc2date', 'qc2fail', 'qc3qty', 'qc3date',
  'cardBox', 'orderTicket', 'receiveTicket', 'sample', 'custCT', 'mf',
  'qa_n044', 'cardBox_n044', 'orderTicket_n044', 'receiveTicket_n044', 'sample_n044', 'custCT_n044', 'mf_n044',
  'packScanDo_n044', 'packScanSen_n044', 'packScan_n044', 'packScanMF_n044',
  'polyOrd_n044', 'polyRec_n044', 'tagRcyRec_n044',
  'packScanDo', 'packScanSen', 'packScan', 'packScanMF',
  'polyOrd', 'polyRec', 'tagRcyRec',
  'prodRisk', 'pqc',
]);
const USER_INPUT_CELL_BG = 'color-mix(in srgb, var(--color-warning-500) 9%, transparent)';                 // พื้นเซลล์ (โปร่ง — ทับ row stripe ได้)
const USER_INPUT_HEAD_BG = 'color-mix(in srgb, var(--color-warning-500) 16%, var(--color-surface-1))';     // พื้นหัวตาราง (ทึบ — sticky)

// Default columns ต่อกลุ่ม (จากระบบเก่า — ดู PO_TRACKER_REVAMP_PLAN.md §4)
// ลำดับใน array ไม่มีผล (เป็น membership set) — ลำดับแสดงผลมาจาก key order ของ MASTER_COLS
export const GROUP_PRESETS: Record<string, string[]> = {
  // General (ปุ่ม "General" map มาที่ key ALL)
  ALL: [
    'no', 'week', 'cust', 'po', 'newReplen', 'orddate', 'due', 'custdue', 'sku', 'qty',
    'qc1qty', 'qc1date', 'qc1fail',
    'controlPen', 'polishPen', 'platePen', 'exportQty', 'balQty', 'expPct',
    'prodRisk', 'pqc', 'receiveTicket', 'remark', 'amount', 'arrow'
  ],
  N008: [
    'no', 'week', 'cust', 'po', 'newReplen', 'shipto', 'photo', 'orddate', 'due', 'qa', 'sgs', 'qcdate', 'custdue', 'oor', 'sku', 'qty',
    'controlPen', 'polishPen', 'platePen',
    'prodRisk', 'pqc', 'cardBox', 'orderTicket', 'receiveTicket', 'packScan', 'remark', 'amount', 'arrow'
  ],
  N044: [
    'no', 'week', 'cust', 'po', 'po2', 'newReplen', 'metal', 'shipto', 'photo', 'orddate', 'due', 'qcdate', 'bookInspect', 'qa_n044', 'bookShip', 'custdue', 'oor',
    'sku', 'qty', 'controlPen', 'polishPen', 'platePen', 'prodRisk', 'pqc',
    'receiveTicket_n044', 'sample_n044', 'custCT_n044', 'mf_n044',
    'packScanDo_n044', 'packScanSen_n044', 'packScan_n044', 'packScanMF_n044',
    'polyOrd_n044', 'polyRec_n044', 'tagRcyRec_n044',
    'cardBox_n044', 'orderTicket_n044', 'remark', 'amount', 'arrow'
  ],
  MLT: [
    'no', 'week', 'cust', 'po', 'newReplen', 'orddate', 'due', 'custdue', 'sku', 'qty',
    'bookInspect', 'qc1qty', 'qc1date', 'qc1fail', 'qc2qty', 'qc2date', 'qc2fail',
    'orderTicket', 'receiveTicket', 'polyOrd', 'polyRec',
    'controlPen', 'polishPen', 'platePen',
    'prodRisk', 'pqc', 'remark', 'amount', 'arrow'
  ],
  N051: [
    'no', 'week', 'cust', 'po', 'po2', 'newReplen', 'metal', 'photo', 'orddate', 'custdue', 'sku', 'qty',
    'controlPen', 'polishPen', 'platePen', 'exportQty', 'balQty', 'expPct',
    'prodRisk', 'pqc', 'remark', 'amount', 'arrow'
  ],
  N083: [
    'no', 'week', 'cust', 'po', 'newReplen', 'orddate', 'due', 'custdue', 'sku', 'qty',
    'qc1qty', 'qc1date', 'qc1fail', 'qc2qty', 'qc2date', 'qc2fail',
    'controlPen', 'polishPen', 'platePen',
    'prodRisk', 'pqc', 'receiveTicket', 'remark', 'amount', 'arrow'
  ],
};

// หมวดหมู่คอลัมน์สำหรับ View Columns picker (ให้หาง่าย) — ไม่รวม always-on (no/week/cust/po/arrow)
export const COLUMN_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Customer Data', keys: ['po2', 'ordno', 'newReplen', 'metal', 'shipto', 'photo', 'orddate', 'due', 'qa', 'sgs', 'qcdate', 'custdue', 'oor', 'sku', 'qty', 'amount', 'remark'] },
  { label: 'Production — Stage', keys: ['stonePen', 'fitPen', 'wijPen', 'castPen', 'controlPen', 'grindPen', 'polishPen', 'platePen', 'exportQty', 'balQty', 'expPct'] },
  { label: 'Production — Book / QC', keys: ['bookInspect', 'bookShip', 'qc1qty', 'qc1date', 'qc1fail', 'qc2qty', 'qc2date', 'qc2fail', 'qc3qty', 'qc3date'] },
  { label: 'Production — Pack / Tag', keys: ['cardBox', 'orderTicket', 'receiveTicket', 'sample', 'custCT', 'mf', 'packScanDo', 'packScanSen', 'packScan', 'packScanMF', 'polyOrd', 'polyRec', 'tagRcyRec'] },
  { label: 'Production — Issue / Plan', keys: ['prodRisk', 'pqc'] },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function OrderTable({
  data,
  loading,
  pageOffset = 0,
  visibleKeys,
}: {
  data: OrderSummary[];
  loading: boolean;
  pageOffset?: number;
  visibleKeys: string[];
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pickerOrder, setPickerOrder] = useState<OrderSummary | null>(null);

  // Use visibleKeys order (from GROUP_PRESETS) to control column sequence
  const mandatory = ['no', 'week', 'cust', 'po', 'arrow'];
  const orderedKeys = [
    ...visibleKeys.filter(key => key in MASTER_COLS),
    ...mandatory.filter(key => !visibleKeys.includes(key)),
  ];
  // Remove duplicates while preserving order
  const uniqueKeys = [...new Set(orderedKeys)];
  const activeCols = uniqueKeys.map(key => ({ key, ...MASTER_COLS[key] }));

  const handleRowClick = (order: OrderSummary) => {
    setPickerOrder(order);
  };

  // ใน OrderTable.tsx
  const handleViewSelect = (view: ViewMode) => {
    if (!pickerOrder) return;
    setPickerOrder(null);

    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const dateType = searchParams.get('dateType') || '';
    const status = searchParams.get('status') || 'Pending';

    const query = new URLSearchParams();
    if (dateFrom) query.append('dateFrom', dateFrom);
    if (dateTo) query.append('dateTo', dateTo);
    if (dateType) query.append('dateType', dateType);
    if (status) query.append('status', status);
    query.append('view', view);

    // ทุกแถวยิงเข้า endpoint /group/ เดียว (กรองครบทุกแกนเหมือน SP → ยอด detail ตรงกับแถวใน list)
    // แนบ ?po= เป็น "แกนที่ 6" เมื่อแถวผูกกับ PO จริง — ครอบคลุมลูกค้าทั่วไป + N008 หลาย PO (CTM)
    query.append('po', pickerOrder.PONo || '');
    const path = [
      pickerOrder.CustCode || '-',
      encodeURIComponent(pickerOrder.ShipTo || '-'),
      encodeURIComponent(pickerOrder.OrdKind || '-'),
      encodeURIComponent(pickerOrder.OrdMat || '-'),
      encodeURIComponent(pickerOrder.CustDueDate || '-')
    ].join('/');
    navigate(`/po-tracker/group/${path}?${query.toString()}`);
  };

  return (
    <>
      {/* ── View Picker Modal ── */}
      {pickerOrder && (
        <ViewPickerModal
          order={pickerOrder}
          onClose={() => setPickerOrder(null)}
          onSelect={handleViewSelect}
        />
      )}

      <div className="custom-scrollbar" style={{
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
        background: 'var(--color-surface-0)',
        position: 'relative',
        borderLeft: '1px solid var(--color-border-light)',
      }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 'max-content', tableLayout: 'fixed', fontFamily: 'var(--font-body)' }}>
          <colgroup>
            {activeCols.map((c, i) => (
              // The last column ('arrow', always present per GROUP_PRESETS) gets no fixed
              // width — CSS lets an unconstrained column absorb leftover horizontal space,
              // so the table always fills the card's width instead of stopping short.
              <col key={c.key} style={i === activeCols.length - 1 ? { minWidth: c.w } : { width: c.w, minWidth: c.w }} />
            ))}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 30 }}>
            <tr>
              {activeCols.map((c, idx) => {
                const isPinned = ['no', 'week', 'cust', 'po', 'po2', 'ordno', 'newReplen'].includes(c.key);
                let leftPos = 0;
                if (isPinned) {
                  const prevPinned = activeCols.slice(0, idx);
                  leftPos = prevPinned.reduce((sum, col) => sum + col.w, 0);
                }

                return (
                  <th key={c.key} style={{
                    background: USER_INPUT_KEYS.has(c.key) ? USER_INPUT_HEAD_BG : 'var(--color-surface-1)',
                    padding: '16px 10px 14px', fontSize: '0.85rem', fontWeight: 900,
                    color: c.key === 'arrow' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                    textAlign: c.align,
                    borderBottom: '1px solid var(--color-border-strong)',
                    borderRight: '1px solid var(--color-border-light)',
                    textTransform: 'capitalize', letterSpacing: '0.02em',
                    position: isPinned ? 'sticky' : 'static',
                    left: isPinned ? leftPos : undefined,
                    top: 0, // Make all headers stick to top
                    zIndex: isPinned ? 35 : 20,
                    minWidth: c.w, width: c.w, maxWidth: c.w, boxSizing: 'border-box',
                    fontFamily: 'var(--font-display)',
                    transition: 'all 0.2s',
                    whiteSpace: 'pre-wrap', wordWrap: 'break-word', lineHeight: '1.2',
                    boxShadow: isPinned && c.key === 'newReplen' ? '4px 0 12px -4px rgba(0,0,0,0.2)' : 'none'
                  }}>
                    <span>{c.label}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows activeCols={activeCols} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length} style={{ padding: '120px 24px', textAlign: 'center', color: 'var(--color-text-quaternary)', fontSize: '0.9rem', borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-light)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px', opacity: 0.2 }}>📦</div>
                  <div style={{ fontWeight: 800, letterSpacing: '0.02em' }}>No matching orders found</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.6 }}>Try adjusting your filters or search keywords</div>
                </td>
              </tr>
            ) : data.map((o, i) => (
              <tr
                key={o.OrdNo + i}
                onClick={() => handleRowClick(o)}
                className="table-row-hover"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  background: 'transparent',
                }}
              >
                {activeCols.map((c, idx) => {
                  const isPinned = ['no', 'week', 'cust', 'po', 'po2', 'ordno', 'newReplen'].includes(c.key);
                  let leftPos = 0;
                  if (isPinned) {
                    const prevPinned = activeCols.slice(0, idx);
                    leftPos = prevPinned.reduce((sum, col) => sum + col.w, 0);
                  }

                  return (
                    <td
                      key={c.key}
                      className={isPinned ? 'pinned-col' : ''}
                      style={{
                        padding: '16px 10px',
                        textAlign: c.align,
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: 'var(--color-text-primary)',
                        borderBottom: '1px solid var(--color-border-strong)',
                        borderRight: '1px solid var(--color-border-light)',
                        background: isPinned ? 'var(--color-surface-0)' : (USER_INPUT_KEYS.has(c.key) ? USER_INPUT_CELL_BG : 'transparent'),
                        position: isPinned ? 'sticky' : 'static',
                        left: isPinned ? leftPos : undefined,
                        zIndex: isPinned ? 15 : 1,
                        minWidth: c.w, width: c.w, maxWidth: c.w, boxSizing: 'border-box',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                        boxShadow: isPinned && c.key === 'newReplen' ? '4px 0 12px -4px rgba(0,0,0,0.05)' : 'none',
                        ...c.cellStyle?.(o)
                      }}
                    >
                      {c.render(o, i, pageOffset)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-row-hover {
          position: relative;
        }
        .table-row-hover:hover {
          background: color-mix(in srgb, var(--color-brand-500), transparent 96%) !important;
          box-shadow: inset 4px 0 0 var(--color-brand-500);
        }
        .table-row-hover:hover td:not(.pinned-col) {
          color: var(--color-text-primary) !important;
          background: transparent !important;
        }
        .table-row-hover:hover td.pinned-col {
          color: var(--color-text-primary) !important;
          background: color-mix(in srgb, var(--color-brand-500) 4%, var(--color-surface-0)) !important;
        }
        .table-row-hover::after {
          content: 'View Details';
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%) translateX(10px);
          opacity: 0;
          background: var(--color-brand-500);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          white-space: nowrap;
          pointer-events: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px color-mix(in srgb, var(--color-brand-500) 30%, transparent);
          z-index: 10;
        }
        .table-row-hover:hover::after {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-surface-1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border-strong);
          border-radius: 10px;
          border: 2px solid var(--color-surface-1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-brand-400);
        }
      `}</style>
    </>
  );
}
