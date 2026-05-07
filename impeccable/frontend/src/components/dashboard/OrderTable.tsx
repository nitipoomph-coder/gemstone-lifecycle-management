// src/components/dashboard/OrderTable.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Image as ImageIcon, BarChart2, DollarSign, Layers, X } from 'lucide-react';
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
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'modalFadeIn 0.3s ease-out forwards',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface-0)',
            borderRadius: '24px',
            boxShadow: '0 32px 80px -16px rgba(0, 0, 0, 0.2)',
            width: '440px',
            maxWidth: '95vw',
            overflow: 'hidden',
            border: '1px solid var(--color-border-light)',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* Header Section */}
          <div style={{
            padding: '32px 32px 28px',
            textAlign: 'center',
            position: 'relative',
            borderBottom: '1px solid var(--color-border-light)',
            background: 'linear-gradient(to bottom, var(--color-surface-1), var(--color-surface-0))'
          }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'transparent', border: 'none', borderRadius: '50%',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--color-text-tertiary)',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'oklch(0.95 0.01 250)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
            >
              <X size={18} />
            </button>

            <div style={{ 
              display: 'inline-flex', padding: '6px 16px', borderRadius: '100px', 
              background: 'var(--color-accent-100)', color: 'var(--color-accent-600)',
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: '20px',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 2px 8px -2px var(--color-accent-500)22'
            }}>
              Select View Mode
            </div>

            <h3 style={{ 
              fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)', margin: '0 0 4px',
              letterSpacing: '-0.02em'
            }}>
              {order.OrdNo.length > 20 ? order.OrdNo.split('/')[0] + '...' : order.OrdNo}
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px 24px',
              marginTop: '24px',
              textAlign: 'left',
              padding: '0 8px',
              fontSize: '0.9rem'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-brand-600)', minWidth: '85px' }}>Customer :</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{order.CustCode || '-'}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-brand-600)', minWidth: '85px' }}>Material :</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{order.OrdMat || '-'}</span>
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-brand-600)', minWidth: '85px' }}>PO No :</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  {order.PONo && order.PONo !== '-' ? order.PONo : 'No PO Number'}
                </span>
                {order.OrdKind && (
                  <span style={{ 
                    marginLeft: 'auto',
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent-600)',
                    fontStyle: 'italic',
                    whiteSpace: 'nowrap'
                  }}>
                    ( {order.OrdKind} )
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Options Grid */}
          <div style={{ 
            padding: '0 24px 24px', 
            display: 'flex', flexDirection: 'column', gap: '12px' 
          }}>
            {VIEW_OPTIONS.map((opt, idx) => (
              <button
                key={opt.key}
                onClick={() => onSelect(opt.key)}
                onMouseEnter={() => setHovered(opt.key)}
                onMouseLeave={() => setHovered(null)}
                className={`animate-fade-in-up stagger-${idx + 1}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '18px',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: hovered === opt.key ? opt.accentColor : 'var(--color-border-light)',
                  background: hovered === opt.key ? `color-mix(in oklch, ${opt.accentColor}, transparent 92%)` : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: hovered === opt.key ? `0 12px 24px -8px color-mix(in oklch, ${opt.accentColor}, transparent 70%)` : 'none',
                  transform: hovered === opt.key ? 'translateY(-2px)' : 'none',
                }}
              >
                {/* Icon Container */}
                <div style={{
                  width: 48, height: 48, borderRadius: '12px',
                  background: hovered === opt.key ? opt.accentColor : 'oklch(0.97 0.01 250)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: hovered === opt.key ? '#fff' : 'var(--color-text-secondary)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  flexShrink: 0,
                }}>
                  {opt.icon}
                </div>

                {/* Label & Description */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.95rem', fontWeight: 600,
                    color: hovered === opt.key ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-display)',
                    transition: 'color 0.2s',
                  }}>
                    {opt.label}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: hovered === opt.key ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                    marginTop: '2px',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {opt.sub}
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  style={{
                    color: hovered === opt.key ? opt.accentColor : 'var(--color-border-strong)',
                    transition: 'all 0.3s',
                    opacity: hovered === opt.key ? 1 : 0.4,
                    transform: hovered === opt.key ? 'translateX(0)' : 'translateX(-4px)',
                  }}
                />
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px 20px',
            textAlign: 'center',
            borderTop: '1px solid var(--color-border-light)',
            background: 'oklch(0.99 0.005 250)',
          }}>
            <span style={{ 
              fontSize: '0.7rem', color: 'var(--color-text-tertiary)',
              fontWeight: 500, letterSpacing: '0.02em'
            }}>
              ESC to dismiss • Global View System
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalSlideUp { 
          from { opacity: 0; transform: translateY(20px) scale(0.98) } 
          to { opacity: 1; transform: translateY(0) scale(1) } 
        }
      `}</style>
    </>
  );
}


// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      <style>{`@keyframes skSh{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {Array.from({ length: 12 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #dee2e6' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '16px 10px' }}>
              <div style={{
                height: '14px', borderRadius: '4px',
                background: 'linear-gradient(90deg,#f8f9fa 25%,#f1f3f5 50%,#f8f9fa 75%)',
                backgroundSize: '400% 100%',
                animation: `skSh 1.4s ease-in-out infinite`,
                animationDelay: `${(i * cols + j) * 0.02}s`,
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Master Column Definitions ──────────────────────────────────────────────
// รวมคอลัมน์ทุกอย่างไว้ที่เดียว พร้อมกำหนดวิธีแสดงผล (render) และสไตล์
const MASTER_COLS: Record<string, {
  label: string;
  w: number;
  align: 'left' | 'center' | 'right';
  render: (o: OrderSummary, i: number, offset: number) => React.ReactNode;
  cellStyle?: (o: OrderSummary) => React.CSSProperties;
}> = {
  no: {
    label: 'No.', w: 40, align: 'center',
    render: (_, i, offset) => offset + i + 1,
    cellStyle: () => ({ color: '#868e96', background: '#f8f9fa' }),
  },
  week: {
    label: 'Week', w: 50, align: 'center',
    render: (o) => o.Week,
  },
  cust: {
    label: 'Cust', w: 60, align: 'center',
    render: (o) => o.CustCode,
    cellStyle: () => ({ fontWeight: 700, color: '#1971c2' }),
  },
  po: {
    label: 'PO no.', w: 180, align: 'left',
    render: (o) => o.PONo,
    cellStyle: () => ({ fontWeight: 600, color: '#495057', wordBreak: 'break-word' }),
  },
  kind: {
    label: 'New/Replen', w: 90, align: 'center',
    render: (o) => o.OrdKind,
  },
  shipto: {
    label: 'Ship To', w: 200, align: 'left',
    render: (o) => o.ShipTo,
    cellStyle: () => ({ fontWeight: 600, color: '#212529' }),
  },
  photo: {
    label: 'Photo', w: 80, align: 'center',
    render: (o) => (
      <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f1f3f5', overflow: 'hidden', margin: '0 auto', border: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {o.ItemPhoto
          ? <img src={o.ItemPhoto.startsWith('data:') ? o.ItemPhoto : `data:image/jpeg;base64,${o.ItemPhoto}`} alt="item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <ImageIcon size={20} style={{ color: '#ced4da' }} />
        }
      </div>
    ),
  },
  metal: {
    label: 'Metal', w: 50, align: 'center',
    render: (o) => o.OrdMat,
  },
  orddate: {
    label: 'Order Date', w: 90, align: 'center',
    render: (o) => formatDate(o.OrdDate),
  },
  due: {
    label: 'Factory Due', w: 90, align: 'center',
    render: (o) => formatDate(o.DueDate),
  },
  qa: {
    label: 'QA/BBQ/Testing', w: 110, align: 'center',
    render: (o) => o.TrackTest,
  },
  sgs: {
    label: 'SGS', w: 60, align: 'center',
    render: (o) => o.OrdSGS,
  },
  qcdate: {
    label: 'QC Date', w: 90, align: 'center',
    render: (o) => formatDate(o.CustQCDate),
  },
  custdue: {
    label: 'Cust Due Date', w: 90, align: 'center',
    render: (o) => formatDate(o.CustDueDate),
  },
  oor: {
    label: 'OOR Date', w: 90, align: 'center',
    render: (o) => formatDate(o.OORDate),
  },
  sku: {
    label: 'No. of SKU', w: 80, align: 'center',
    render: (o) => o.NumSKU || '-',
    cellStyle: () => ({ fontWeight: 600, color: '#e67700', background: '#fff9db' }),
  },
  qty: {
    label: 'Qty', w: 70, align: 'right',
    render: (o) => formatQty(o.TotalQty),
    cellStyle: () => ({ fontWeight: 800, color: '#1971c2', background: '#e7f5ff' }),
  },
  amount: {
    label: 'Amount', w: 100, align: 'right',
    render: (o) => o.Amount != null ? `$${o.Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    cellStyle: () => ({ fontWeight: 800, color: '#099268', background: '#ebfbee' }),
  },
  remark: {
    label: 'Remark', w: 150, align: 'left',
    render: (o) => o.TrackRemark,
    cellStyle: () => ({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  },
  arrow: {
    label: '', w: 30, align: 'center',
    render: () => <ChevronRight size={16} style={{ color: '#ced4da' }} />,
  }
};

// ─── Group Presets ────────────────────────────────────────────────────────────
// กำหนดว่าแต่ละกลุ่มเริ่มต้นให้แสดงคอลัมน์ไหนบ้าง
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
  
  // State สำหรับจัดการคอลัมน์ที่แสดงผล
  const [visibleKeys, setVisibleKeys] = useState<string[]>(GROUP_PRESETS[group] || GROUP_PRESETS.ALL);
  const [showPicker, setShowPicker] = useState(false);

  // เมื่อกลุ่มเปลี่ยน ให้ Reset คอลัมน์ตาม Preset ของกลุ่มนั้น
  useEffect(() => {
    setVisibleKeys(GROUP_PRESETS[group] || GROUP_PRESETS.ALL);
  }, [group]);

  // คอลัมน์ที่กำลังแสดงผลอยู่ (เรียงตามลำดับใน Master เพื่อความระเบียบ หรือเรียงตาม Preset ก็ได้)
  // ในที่นี้ผมให้เรียงตาม Master เพื่อให้ลำดับ No. อยู่หน้าสุดเสมอ
  const allMasterKeys = Object.keys(MASTER_COLS);
  const activeCols = allMasterKeys
    .filter(key => visibleKeys.includes(key))
    .map(key => ({ key, ...MASTER_COLS[key] }));

  const toggleKey = (key: string) => {
    setVisibleKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

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
        <button 
          onClick={() => setShowPicker(!showPicker)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px',
            background: '#fff', border: '1px solid #dee2e6',
            fontSize: '0.75rem', fontWeight: 600, color: '#495057',
            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <Layers size={14} />
          View Columns
        </button>

        {showPicker && (
          <>
            <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              background: '#fff', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              border: '1px solid #e9ecef', padding: '12px', zIndex: 101,
              width: '220px', display: 'grid', gridTemplateColumns: '1fr', gap: '4px',
              maxHeight: '400px', overflowY: 'auto'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#adb5bd', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Columns
              </div>
              {allMasterKeys.map(key => (
                <label key={key} style={{ 
                  display: 'flex', alignItems: 'center', gap: '10px', 
                  padding: '8px', borderRadius: '6px', cursor: 'pointer',
                  background: visibleKeys.includes(key) ? '#f1f3f5' : 'transparent',
                  transition: 'background 0.15s'
                }}>
                  <input 
                    type="checkbox" 
                    checked={visibleKeys.includes(key)}
                    onChange={() => toggleKey(key)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#495057', fontWeight: visibleKeys.includes(key) ? 600 : 400 }}>
                    {MASTER_COLS[key].label || key}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
          <colgroup>
            {activeCols.map(c => <col key={c.key} style={{ width: c.w }} />)}
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--color-brand-500)', borderBottom: '1px solid var(--color-brand-600)' }}>
              {activeCols.map(c => (
                <th key={c.key} style={{
                  position: 'sticky', top: 0,
                  background: 'var(--color-brand-500)',
                  padding: '16px 12px', fontSize: '0.75rem', fontWeight: 800,
                  color: '#fff', textAlign: c.align,
                  border: '1px solid var(--color-brand-600)',
                  zIndex: 10,
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={activeCols.length} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length} style={{ padding: '60px', textAlign: 'center', color: '#adb5bd', fontSize: '0.9rem' }}>
                  No orders found matching your criteria.
                </td>
              </tr>
            ) : data.map((o, i) => (
              <tr
                key={o.OrdNo + i}
                onClick={() => handleRowClick(o)}
                style={{
                  cursor: 'pointer',
                  background: i % 2 === 0 ? '#fff' : '#fafbfc',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-brand-50)')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc')}
              >
                {activeCols.map(c => (
                  <td
                    key={c.key}
                    style={{
                      padding: '12px 10px',
                      textAlign: c.align,
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border-light)',
                      ...c.cellStyle?.(o)
                    }}
                  >
                    {c.render(o, i, pageOffset)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}