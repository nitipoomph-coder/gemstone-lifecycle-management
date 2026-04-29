// src/components/dashboard/OrderTable.tsx
import { useState } from 'react';
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

const VIEW_OPTIONS: { key: ViewMode; label: string; sub: string; icon: React.ReactNode; bg: string; border: string; iconBg: string }[] = [
  {
    key: 'sales',
    label: 'Sales View',
    sub: 'ข้อมูลราคา, จำนวน, ยอดเงิน',
    icon: <DollarSign size={22} />,
    bg: '#fff9db',
    border: '#fcc419',
    iconBg: '#ffd43b',
  },
  {
    key: 'prod',
    label: 'Production View',
    sub: 'สถานะแต่ละขั้นตอนการผลิต',
    icon: <BarChart2 size={22} />,
    bg: '#e7f5ff',
    border: '#74c0fc',
    iconBg: '#4dabf7',
  },
  {
    key: 'all',
    label: 'All View',
    sub: 'ข้อมูลทั้งหมดรวมทุก column',
    icon: <Layers size={22} />,
    bg: '#f3f0ff',
    border: '#b197fc',
    iconBg: '#9775fa',
  },
];

function ViewPickerModal({ order, onClose, onSelect }: ViewPickerProps) {
  const [hovered, setHovered] = useState<ViewMode | null>(null);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdrop}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.15s ease',
        }}
      >
        {/* Modal card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            width: '460px',
            maxWidth: '95vw',
            overflow: 'hidden',
            animation: 'slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #004b8d 0%, #1971c2 100%)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: '#a5d8ff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '2px' }}>
                เลือกมุมมองที่ต้องการ
              </div>
              {/* PONo = key หลัก */}
              <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, fontFamily: 'Tahoma, "Segoe UI", sans-serif', letterSpacing: '0.05em' }}>
                {order.PONo && order.PONo !== '-' ? order.PONo : order.OrdNo}
              </div>
              {/* OrdNo + CustName แสดงรอง */}
              <div style={{ color: '#a5d8ff', fontSize: '0.7rem', marginTop: '3px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>
                  {order.OrdNo}
                </span>
                <span>·</span>
                <span>{order.CustName || order.CustCode}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <X size={16} />
            </button>
          </div>

          {/* View options */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {VIEW_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => onSelect(opt.key)}
                onMouseEnter={() => setHovered(opt.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${hovered === opt.key ? opt.border : '#e9ecef'}`,
                  background: hovered === opt.key ? opt.bg : '#fafbfc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  transform: hovered === opt.key ? 'translateX(4px)' : 'none',
                  boxShadow: hovered === opt.key ? `0 4px 16px ${opt.border}44` : 'none',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: '10px',
                  background: hovered === opt.key ? opt.iconBg : '#e9ecef',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: hovered === opt.key ? '#fff' : '#adb5bd',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}>
                  {opt.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.88rem', fontWeight: 800,
                    color: hovered === opt.key ? '#212529' : '#495057',
                    fontFamily: 'Tahoma, "Segoe UI", sans-serif',
                  }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#868e96', marginTop: '2px' }}>
                    {opt.sub}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight
                  size={18}
                  style={{
                    color: hovered === opt.key ? opt.border : '#dee2e6',
                    transition: 'color 0.15s',
                    flexShrink: 0,
                  }}
                />
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div style={{
            padding: '10px 20px 14px',
            fontSize: '0.68rem', color: '#adb5bd', textAlign: 'center',
            borderTop: '1px solid #f1f3f5',
          }}>
            กด ESC หรือคลิกนอกกรอบเพื่อปิด
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: scale(0.92) translateY(16px) } to { opacity: 1; transform: scale(1) translateY(0) } }
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

// ─── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { key: 'no',      label: 'No.',        w: 40,  align: 'center' as const },
  { key: 'week',    label: 'Week',       w: 50,  align: 'center' as const },
  { key: 'cust',    label: 'Cust',       w: 60,  align: 'center' as const },
  { key: 'po',      label: 'PO no.',     w: 180, align: 'left'   as const },
  { key: 'kind',    label: 'New/Replen', w: 90,  align: 'center' as const },
  { key: 'metal',   label: 'Metal',      w: 50,  align: 'center' as const },
  { key: 'shipto',  label: 'Ship To',    w: 250, align: 'left'   as const },
  { key: 'photo',   label: 'Picture',    w: 60,  align: 'center' as const },
  { key: 'orddate', label: 'Order Date', w: 90,  align: 'center' as const },
  { key: 'due',     label: 'Factory Due',w: 90,  align: 'center' as const },
  { key: 'custdue', label: 'Cust Due',   w: 90,  align: 'center' as const },
  { key: 'sku',     label: 'No. of SKU', w: 80,  align: 'center' as const },
  { key: 'qty',     label: 'Qty',        w: 80,  align: 'right'  as const },
  { key: 'amount',  label: 'Amount ($)', w: 100, align: 'right'  as const },
  { key: 'arrow',   label: '',           w: 30,  align: 'center' as const },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function OrderTable({
  data,
  loading,
  pageOffset = 0,   // เลข offset สำหรับแสดง No. ต่อเนื่องข้ามหน้า
}: {
  data: OrderSummary[];
  loading: boolean;
  pageOffset?: number;
}) {
  const navigate = useNavigate();
  const [pickerOrder, setPickerOrder] = useState<OrderSummary | null>(null);

  const handleRowClick = (order: OrderSummary) => {
    setPickerOrder(order); // เปิด popup
  };

  const handleViewSelect = (view: ViewMode) => {
    if (!pickerOrder) return;
    setPickerOrder(null);
    // ใช้ PONo เป็น key หลัก ถ้าไม่มี PONo fallback ไป OrdNo
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

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            {COLS.map(c => <col key={c.key} style={{ width: c.w }} />)}
          </colgroup>
          <thead>
            <tr style={{ background: '#004b8d', borderBottom: '1px solid #003d73' }}>
              {COLS.map(c => (
                <th key={c.key} style={{
                  position: 'sticky', top: 0,
                  padding: '16px 12px', fontSize: '0.75rem', fontWeight: 800,
                  color: '#fff', textAlign: c.align, textTransform: 'uppercase',
                  border: '1px solid #003d73',
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={COLS.length} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} style={{ padding: '60px', textAlign: 'center', color: '#adb5bd', fontSize: '0.9rem' }}>
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
                onMouseEnter={e => (e.currentTarget.style.background = '#e7f5ff')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc')}
              >
                <td style={{ padding: '16px 12px', textAlign: 'center', color: '#868e96', fontSize: '0.75rem', border: '1px solid #d0e1f0', background: '#f8f9fa' }}>{pageOffset + i + 1}</td>
                <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 600, color: '#495057', border: '1px solid #d0e1f0' }}>{o.Week}</td>
                <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: '#1971c2', border: '1px solid #d0e1f0' }}>{o.CustCode}</td>
                <td style={{ padding: '16px 12px', fontWeight: 600, color: '#495057', fontSize: '0.75rem', wordBreak: 'break-word', border: '1px solid #d0e1f0' }}>{o.PONo}</td>
                <td style={{ padding: '16px 12px', textAlign: 'center', color: '#495057', fontSize: '0.75rem', border: '1px solid #d0e1f0' }}>{o.OrdKind}</td>
                <td style={{ padding: '16px 12px', textAlign: 'center', color: '#495057', fontSize: '0.75rem', border: '1px solid #d0e1f0' }}>{o.OrdMat}</td>
                <td style={{ padding: '16px 12px', fontWeight: 600, color: '#212529', fontSize: '0.75rem', wordBreak: 'break-word', border: '1px solid #d0e1f0' }}>{o.ShipTo}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid #d0e1f0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f3f5', overflow: 'hidden', margin: '0 auto', border: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {o.ItemPhoto
                      ? <img src={o.ItemPhoto.startsWith('data:') ? o.ItemPhoto : `data:image/jpeg;base64,${o.ItemPhoto}`} alt="item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <ImageIcon size={16} style={{ color: '#ced4da' }} />
                    }
                  </div>
                </td>
                <td style={{ padding: '16px 12px', textAlign: 'center', color: '#495057', fontSize: '0.75rem', border: '1px solid #d0e1f0' }}>{formatDate(o.OrdDate)}</td>
                <td style={{ padding: '16px 12px', textAlign: 'center', color: '#495057', fontSize: '0.75rem', border: '1px solid #d0e1f0' }}>{formatDate(o.DueDate)}</td>
                <td style={{ padding: '16px 12px', textAlign: 'center', color: '#495057', fontSize: '0.75rem', border: '1px solid #d0e1f0' }}>{formatDate(o.CustDueDate)}</td>
                <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 600, color: '#e67700', border: '1px solid #d0e1f0', background: '#fff9db' }}>{o.NumSKU || '-'}</td>
                <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 800, color: '#1971c2', border: '1px solid #d0e1f0', background: '#e7f5ff' }}>{formatQty(o.TotalQty)}</td>
                <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 800, color: '#099268', border: '1px solid #d0e1f0', background: '#ebfbee' }}>
                  {o.Amount != null ? `$${o.Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td style={{ padding: '16px 12px', textAlign: 'center', border: '1px solid #d0e1f0' }}>
                  <ChevronRight size={16} style={{ color: '#ced4da' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}