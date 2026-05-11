// src/components/dashboard/OrderTable.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Image as ImageIcon, BarChart2, DollarSign, Layers, X, Search } from 'lucide-react';
import { type OrderSummary } from '../../services/orderAPI';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
const formatQty = (n: number | null | undefined) => (n != null ? n.toLocaleString() : '');

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
            boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.3), 0 0 0 1px color-mix(in srgb, var(--color-border-light), transparent 50%)',
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
              textTransform: 'uppercase', marginBottom: '24px',
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
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{order.CustCode || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Material</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{order.OrdMat || '-'}</span>
              </div>
              {/* Row 2: PO No & Order Kind */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border-light)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PO Number</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>{order.PONo || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border-light)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
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
function SkeletonRows({ cols }: { cols: number }) {
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
        <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '16px 12px' }}>
              <div className="skeleton-cell" style={{ height: '14px', borderRadius: '4px' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const MASTER_COLS: Record<string, {
  label: string;
  w: number;
  align: 'left' | 'center' | 'right';
  render: (o: OrderSummary, i: number, offset: number) => React.ReactNode;
  cellStyle?: (o: OrderSummary) => React.CSSProperties;
}> = {
  no: {
    label: 'No.', w: 50, align: 'center',
    render: (_, i, offset) => offset + i + 1,
    cellStyle: () => ({ color: 'var(--color-text-tertiary)', background: 'color-mix(in srgb, var(--color-surface-1), transparent 50%)', fontWeight: 700 }),
  },
  week: {
    label: 'Week', w: 60, align: 'center',
    render: (o) => o.Week,
    cellStyle: () => ({ fontWeight: 600, color: 'var(--color-brand-600)' }),
  },
  cust: {
    label: 'Cust', w: 70, align: 'center',
    render: (o) => o.CustCode,
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-text-primary)' }),
  },
  po: {
    label: 'PO Number', w: 180, align: 'left',
    render: (o) => o.PONo,
    cellStyle: () => ({ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.8rem' }),
  },
  kind: {
    label: 'Type', w: 100, align: 'center',
    render: (o) => (
      <span style={{
        padding: '2px 8px', borderRadius: '6px',
        fontSize: '0.65rem', fontWeight: 800,
        background: 'var(--color-surface-2)',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border-light)'
      }}>
        {o.OrdKind}
      </span>
    ),
  },
  shipto: {
    label: 'Ship To', w: 200, align: 'left',
    render: (o) => o.ShipTo,
    cellStyle: () => ({ fontWeight: 500, color: 'var(--color-text-secondary)' }),
  },
  photo: {
    label: 'Photo', w: 85, align: 'center',
    render: (o) => (
      <div style={{
        width: 60, height: 60, borderRadius: 12,
        background: 'var(--color-surface-1)', overflow: 'hidden',
        margin: '0 auto', border: '1px solid var(--color-border-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {o.ItemPhoto
          ? <img src={o.ItemPhoto.startsWith('data:') ? o.ItemPhoto : `data:image/jpeg;base64,${o.ItemPhoto}`} alt="item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <ImageIcon size={20} style={{ color: 'var(--color-text-quaternary)' }} />
        }
      </div>
    ),
  },
  metal: {
    label: 'Metal', w: 60, align: 'center',
    render: (o) => o.OrdMat,
    cellStyle: () => ({ fontWeight: 600, color: 'var(--color-accent-600)' }),
  },
  orddate: {
    label: 'Order Date', w: 100, align: 'center',
    render: (o) => formatDate(o.OrdDate),
  },
  due: {
    label: 'Factory Due', w: 100, align: 'center',
    render: (o) => formatDate(o.DueDate),
    cellStyle: (o) => {
      const isLate = o.DueDate && new Date(o.DueDate) < new Date() && (o.OrdStatus === 'P' || o.OrdStatus === 'N');
      return isLate ? { color: 'var(--color-danger-500)', fontWeight: 800, background: 'color-mix(in srgb, var(--color-danger-500), transparent 94%)' } : {};
    }
  },
  qa: {
    label: 'QA/Testing', w: 120, align: 'center',
    render: (o) => o.TrackTest || '-',
  },
  sgs: {
    label: 'SGS', w: 70, align: 'center',
    render: (o) => o.OrdSGS || '-',
  },
  qcdate: {
    label: 'QC Date', w: 100, align: 'center',
    render: (o) => formatDate(o.CustQCDate),
  },
  custdue: {
    label: 'Cust Due', w: 100, align: 'center',
    render: (o) => formatDate(o.CustDueDate),
  },
  oor: {
    label: 'OOR Date', w: 100, align: 'center',
    render: (o) => formatDate(o.OORDate),
  },
  sku: {
    label: 'SKU', w: 80, align: 'center',
    render: (o) => o.NumSKU || '-',
    cellStyle: () => ({ fontWeight: 700, color: 'var(--color-accent-600)' }),
  },
  qty: {
    label: 'Qty', w: 80, align: 'right',
    render: (o) => formatQty(o.TotalQty),
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-brand-600)', fontFamily: 'var(--font-display)', fontSize: '0.85rem' }),
  },
  amount: {
    label: 'Amount', w: 110, align: 'right',
    render: (o) => o.Amount != null ? `$${o.Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    cellStyle: () => ({ fontWeight: 800, color: 'var(--color-success-600)', fontFamily: 'var(--font-display)', fontSize: '0.85rem' }),
  },
  remark: {
    label: 'Remark', w: 180, align: 'left',
    render: (o) => o.TrackRemark || '-',
    cellStyle: () => ({ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  },
  arrow: {
    label: '', w: 40, align: 'center',
    render: () => <ChevronRight size={18} style={{ color: 'var(--color-text-quaternary)' }} />,
  }
};

const GROUP_PRESETS: Record<string, string[]> = {
  ALL: ['no', 'kind', 'orddate', 'due', 'custdue', 'sku', 'qty', 'amount', 'remark', 'arrow'],
  N008: ['no', 'week', 'cust', 'po', 'kind', 'shipto', 'photo', 'orddate', 'due', 'qa', 'sgs', 'qcdate', 'custdue', 'oor', 'sku', 'qty', 'amount', 'remark', 'arrow'],
  MLT: ['no', 'week', 'cust', 'po', 'kind', 'orddate', 'due', 'custdue', 'sku', 'qty', 'amount', 'remark', 'arrow'],
  N083: ['no', 'week', 'cust', 'po', 'kind', 'orddate', 'due', 'custdue', 'sku', 'qty', 'amount', 'remark', 'arrow'],
  N044: ['no', 'week', 'cust', 'po', 'kind', 'shipto', 'photo', 'orddate', 'due', 'qa', 'qcdate', 'custdue', 'oor', 'sku', 'qty', 'amount', 'remark', 'arrow'],
  N051: ['no', 'week', 'cust', 'po', 'kind', 'metal', 'photo', 'orddate', 'due', 'qa', 'qcdate', 'custdue', 'sku', 'qty', 'amount', 'arrow'],
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function OrderTable({
  data,
  loading,
  pageOffset = 0,
  group = 'ALL',
}: {
  data: OrderSummary[];
  loading: boolean;
  pageOffset?: number;
  group?: string;
}) {
  const navigate = useNavigate();
  const [pickerOrder, setPickerOrder] = useState<OrderSummary | null>(null);

  const [visibleKeys, setVisibleKeys] = useState<string[]>(GROUP_PRESETS[group] || GROUP_PRESETS.ALL);
  const [showPicker, setShowPicker] = useState(false);
  const [colSearch, setColSearch] = useState('');

  // ⭐️ Smart Selection Locking: ใช้ Ref จำกลุ่มล่าสุดไว้ เพื่อไม่ให้ Reset คอลัมน์เวลา Re-render ปกติ
  const lastGroupRef = useRef(group);

  // เมื่อกลุ่มเปลี่ยน "จริงๆ" เท่านั้น ถึงจะ Reset คอลัมน์ตาม Preset
  useEffect(() => {
    if (lastGroupRef.current !== group) {
      setVisibleKeys(GROUP_PRESETS[group] || GROUP_PRESETS.ALL);
      lastGroupRef.current = group;
    }
  }, [group]);

  const allMasterKeys = Object.keys(MASTER_COLS);
  const activeCols = allMasterKeys
    .filter(key => visibleKeys.includes(key) || ['no', 'week', 'cust', 'po', 'arrow'].includes(key))
    .map(key => ({ key, ...MASTER_COLS[key] }));

  const toggleKey = (key: string) => {
    setVisibleKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const filteredMasterKeys = allMasterKeys
    .filter(key => !['no', 'week', 'cust', 'po', 'arrow'].includes(key))
    .filter(key => {
      if (!colSearch) return true;
      const label = MASTER_COLS[key].label || key;
      return label.toLowerCase().includes(colSearch.toLowerCase());
    });

  const handleRowClick = (order: OrderSummary) => {
    setPickerOrder(order);
  };

  const handleViewSelect = (view: ViewMode) => {
    if (!pickerOrder) return;
    setPickerOrder(null);
    const key = pickerOrder.PONo && pickerOrder.PONo !== '-'
      ? encodeURIComponent(pickerOrder.PONo)
      : encodeURIComponent(pickerOrder.OrdNo);
    const byPo = pickerOrder.PONo && pickerOrder.PONo !== '-';
    navigate(`/order-tracker/${byPo ? 'po' : 'ord'}/${key}?view=${view}`);
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

      {/* ── Column Picker Popover ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', borderRadius: '14px',
              background: showPicker ? 'var(--color-brand-500)' : 'var(--color-surface-0)',
              border: '1px solid',
              borderColor: showPicker ? 'var(--color-brand-600)' : 'var(--color-border-light)',
              fontSize: '0.75rem', fontWeight: 800,
              color: showPicker ? '#fff' : 'var(--color-text-secondary)',
              cursor: 'pointer', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.1)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <Layers size={16} />
            View Columns
          </button>

          {showPicker && (
            <>
              {/* Backdrop: ปิดเมื่อคลิกข้างนอก */}
              <div
                onClick={() => { setShowPicker(false); setColSearch(''); }}
                style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'transparent' }}
              />
              {/* Popover Card */}
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                  background: 'var(--color-surface-0)', borderRadius: '20px',
                  boxShadow: '0 20px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px var(--color-border-light)',
                  padding: '16px', zIndex: 101,
                  width: '280px', display: 'flex', flexDirection: 'column', gap: '12px',
                  animation: 'popoverIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  transformOrigin: 'top right'
                }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 4px' }}>
                    Column Intelligence
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-quaternary)' }} />
                    <input
                      autoFocus
                      placeholder="Find column..."
                      value={colSearch}
                      onChange={(e) => setColSearch(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px',
                        background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                        fontSize: '0.78rem', color: 'var(--color-text-primary)', fontWeight: 600,
                        outline: 'none', transition: 'all 0.2s'
                      }}
                    />
                  </div>
                </div>

                <div className="custom-scrollbar" style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                  {filteredMasterKeys.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-quaternary)', fontSize: '0.75rem' }}>
                      No columns match
                    </div>
                  ) : filteredMasterKeys.map(key => (
                    <label
                      key={key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                        background: visibleKeys.includes(key) ? 'color-mix(in srgb, var(--color-brand-500), transparent 94%)' : 'transparent',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-1)'}
                      onMouseLeave={e => e.currentTarget.style.background = visibleKeys.includes(key) ? 'color-mix(in srgb, var(--color-brand-500), transparent 94%)' : 'transparent'}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '5px',
                        border: '2px solid',
                        borderColor: visibleKeys.includes(key) ? 'var(--color-brand-500)' : 'var(--color-border-strong)',
                        background: visibleKeys.includes(key) ? 'var(--color-brand-500)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {visibleKeys.includes(key) && <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#fff' }} />}
                      </div>
                      <input
                        type="checkbox"
                        hidden
                        checked={visibleKeys.includes(key)}
                        onChange={() => toggleKey(key)}
                      />
                      <span style={{ fontSize: '0.8rem', color: visibleKeys.includes(key) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: visibleKeys.includes(key) ? 700 : 500 }}>
                        {MASTER_COLS[key].label || key}
                      </span>
                    </label>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '10px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-quaternary)', textAlign: 'center', letterSpacing: '0.02em' }}>
                    {allMasterKeys.filter(k => visibleKeys.includes(k)).length} ACTIVE COLUMNS
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes popoverIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="custom-scrollbar" style={{
        overflowX: 'auto',
        borderRadius: '24px',
        border: '1px solid var(--color-border-light)',
        background: 'var(--color-surface-0)',
        boxShadow: '0 12px 40px -12px rgba(0,0,0,0.15), 0 0 0 1px var(--color-border-light)',
        position: 'relative',
      }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', tableLayout: 'auto' }}>
          <colgroup>
            {activeCols.map(c => <col key={c.key} style={{ width: c.w }} />)}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 30 }}>
            <tr>
              {activeCols.map((c, idx) => {
                return (
                  <th key={c.key} style={{
                    background: 'color-mix(in srgb, var(--color-surface-1), transparent 5%)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: '18px 14px', fontSize: '0.65rem', fontWeight: 900,
                    color: 'var(--color-text-tertiary)', textAlign: c.align,
                    borderBottom: '2px solid var(--color-border-light)',
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    position: 'sticky', top: 0,
                    zIndex: 10,
                    transition: 'all 0.2s'
                  }}>
                    {c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={activeCols.length} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length} style={{ padding: '120px 24px', textAlign: 'center', color: 'var(--color-text-quaternary)', fontSize: '0.9rem' }}>
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
                  return (
                    <td
                      key={c.key}
                      style={{
                        padding: '16px 14px',
                        textAlign: c.align,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        borderBottom: '1px solid var(--color-border-light)',
                        borderRight: idx === activeCols.length - 1 ? 'none' : '1px solid color-mix(in srgb, var(--color-border-light), transparent 85%)',
                        background: 'transparent',
                        transition: 'all 0.2s',
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
        @keyframes popoverIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .table-row-hover:hover {
          background: color-mix(in srgb, var(--color-brand-500), transparent 96%) !important;
          box-shadow: inset 4px 0 0 var(--color-brand-500);
        }
        .table-row-hover:hover td {
          color: var(--color-text-primary) !important;
          background: color-mix(in srgb, var(--color-brand-500), transparent 97%) !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-surface-1);
          border-radius: 10px;
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