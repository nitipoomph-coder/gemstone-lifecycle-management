// src/components/orderDetail/LineDetailDrawer.tsx
// Right-side slide-over opened by clicking a row in OrderLineTable. Relocates (verbatim
// behavior, not rewritten) the photo zoom/pan lightbox and the remarks edit form that used to
// live inline inside the old per-line card — a dense table row has no room for either.
import { useState } from 'react';
import { X, DollarSign, Package, ClipboardList, Check } from 'lucide-react';
import { updateOrderRemarks } from '../../services/poTrackerAPI';
import { ORDER_DETAIL_COLUMNS } from '../../config/orderDetailColumns';
import { formatV, formatColumnValue } from './format';
import { SpecItem, DataPair } from './shared';
import { psPhotoUrl, attachPhotoFallback } from '../../utils/photoUrl';

const PRODUCTION_COLS = ORDER_DETAIL_COLUMNS.filter((c) => c.group === 'production');

const REMARK_FIELDS: { key: string; label: string }[] = [
  { key: 'RecRemark', label: 'Receive (รับงาน)' },
  { key: 'EnaRemark', label: 'Enamel (ทาสี)' },
  { key: 'CryRemark', label: 'Crystal (ติดคริสตัล)' },
  { key: 'AsmRemark', label: 'Assembly (ประกอบ)' },
  { key: 'ShfRemark', label: 'Shelf (ขึ้นชั้น)' },
  { key: 'PkRemark', label: 'Pack (แพ็ค)' },
  { key: 'ProdRemark', label: 'Prod Remark (หมายเหตุ)' },
];

interface LineDetailDrawerProps {
  line: Record<string, unknown>;
  index: number;
  onClose: () => void;
  onSaved: (updated: Record<string, unknown>) => void;
}

export default function LineDetailDrawer({ line, index, onClose, onSaved }: LineDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [remarks, setRemarks] = useState({
    RecRemark: (line.RecRemark as string) || '',
    EnaRemark: (line.EnaRemark as string) || '',
    CryRemark: (line.CryRemark as string) || '',
    AsmRemark: (line.AsmRemark as string) || '',
    ShfRemark: (line.ShfRemark as string) || '',
    PkRemark: (line.PkRemark as string) || '',
    ProdRemark: (line.ProdRemark as string) || '',
  });
  const [showToast, setShowToast] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // รูปดึงจาก network path อย่างเดียว (ps ก่อน, onError fallback ไป cad)
  const itemNo = line.ItemNo as string | undefined;
  const photoUrl = itemNo ? psPhotoUrl(itemNo) : '';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const hasChanges =
    remarks.RecRemark !== ((line.RecRemark as string) || '') ||
    remarks.EnaRemark !== ((line.EnaRemark as string) || '') ||
    remarks.CryRemark !== ((line.CryRemark as string) || '') ||
    remarks.AsmRemark !== ((line.AsmRemark as string) || '') ||
    remarks.ShfRemark !== ((line.ShfRemark as string) || '') ||
    remarks.PkRemark !== ((line.PkRemark as string) || '') ||
    remarks.ProdRemark !== ((line.ProdRemark as string) || '');

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }
    try {
      await updateOrderRemarks({
        OrdNo: String(line.OrdNo),
        LineNo: Number(line.LineNo),
        ...remarks,
      });
      setIsEditing(false);

      // Direct-mutation update, same pattern the old card used — `lines` isn't behind a
      // memoized derivation that would miss this, and the search filter re-runs every render.
      const updated = { ...line, ...remarks };
      Object.assign(line, remarks);
      onSaved(updated);

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to save remarks:', err);
      alert('Failed to save remarks. Please try again.');
    }
  };

  const handleCancel = () => {
    setRemarks({
      RecRemark: (line.RecRemark as string) || '',
      EnaRemark: (line.EnaRemark as string) || '',
      CryRemark: (line.CryRemark as string) || '',
      AsmRemark: (line.AsmRemark as string) || '',
      ShfRemark: (line.ShfRemark as string) || '',
      PkRemark: (line.PkRemark as string) || '',
      ProdRemark: (line.ProdRemark as string) || '',
    });
    setIsEditing(false);
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)', zIndex: 9000, animation: 'fadeIn 0.2s ease-out forwards',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: '520px', maxWidth: '92vw',
          background: 'var(--color-surface-0)', boxShadow: '-20px 0 50px rgba(0,0,0,0.25)',
          zIndex: 9001, display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          fontFamily: 'var(--font-body, "Prompt", sans-serif)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: '1px solid var(--color-border-light)',
          background: 'var(--color-surface-1)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize', letterSpacing: '0.08em' }}>
              Line #{index + 1}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              {(line.ItemNo as string) || 'Unknown Item'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '10px', border: '1px solid var(--color-border-light)',
              background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Photo */}
          <div
            onClick={() => photoUrl && setIsImageOpen(true)}
            style={{
              width: '100%', height: '180px', borderRadius: '12px', border: '1px solid var(--color-border-light)',
              background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', cursor: photoUrl ? 'pointer' : 'default', marginBottom: '16px',
            }}
            title={photoUrl ? 'Click to enlarge' : ''}
          >
            {photoUrl ? (
              <img
                key={itemNo}
                src={photoUrl}
                alt="Item"
                loading="lazy"
                onError={(e) => attachPhotoFallback(e, itemNo)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-quaternary)', fontWeight: 700 }}>NO IMAGE</span>
            )}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '12px' }}>
            {(line.ItemDesc as string) || '—'}
          </div>

          {/* Specs */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: '16px',
            padding: '12px 16px', background: 'var(--color-surface-1)', borderRadius: '12px',
            border: '1px solid var(--color-border-light)',
          }}>
            <SpecItem label="Size" value={line.ItemSize} />
            <SpecItem label="Metal" value={line.ItemMat} />
            <SpecItem label="Stone" value={line.Stone} />
            <SpecItem label="Plating" value={line.Plating} />
            <SpecItem label="Cust Item" value={line.CustItem} />
            <SpecItem label="Silver Wt." value={line.SilverWt != null ? `${line.SilverWt}g` : undefined} />
            <SpecItem label="Finish Wt." value={line.FinishWt != null ? `${line.FinishWt}g` : undefined} />
            <SpecItem label="Order Date" value={formatV('OrdDate', line.OrdDate)} />
            <SpecItem label="Factory Due" value={formatV('DueDate', line.DueDate)} />
            <SpecItem label="Cust Due" value={formatV('CustDueDate', line.CustDueDate)} />
            <SpecItem label="QC Date" value={formatV('QCDate', line.QCDate)} />
            <SpecItem label="Qty" value={formatV('Qty', line.Qty)} />
          </div>

          {/* Sales & Shipping */}
          <div style={{ padding: '16px', marginBottom: '16px', background: 'color-mix(in srgb, #1971c2, transparent 94%)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#1971c2', fontWeight: 800, fontSize: '0.72rem', textTransform: 'capitalize', letterSpacing: '0.05em' }}>
              <DollarSign size={14} /> Sales &amp; Shipping
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
              <DataPair label="Sales" value={line.Sales} />
              <DataPair label="Destination" value={line.Destination} />
              <DataPair label="PO Number" value={line.PONo} />
              <DataPair label="Price" value={formatV('Price', line.Price)} />
              <DataPair label="Amount" value={formatV('Amount', line.Amount)} />
              <DataPair label="Invoice No." value={line.InvoiceNo} />
              <DataPair label="Invoice Date" value={formatV('InvoiceDate', line.InvoiceDate)} />
              <DataPair label="AWB" value={line.AWB} />
            </div>
          </div>

          {/* Production pipeline — read-only mini grid, driven by the shared column registry */}
          <div style={{ padding: '16px', marginBottom: '16px', background: 'color-mix(in srgb, #e67700, transparent 92%)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#e67700', fontWeight: 800, fontSize: '0.72rem', textTransform: 'capitalize', letterSpacing: '0.05em' }}>
              <Package size={14} /> Production Pipeline
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 12px' }}>
              {PRODUCTION_COLS.map((col) => {
                const raw = line[col.key];
                const isNegative = Number(raw) < 0;
                return (
                  <div key={col.key} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'capitalize' }}>{col.label}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: col.key === 'BalQty' ? 900 : 700, color: isNegative ? 'var(--color-danger-500)' : 'var(--color-text-primary)' }}>
                      {formatColumnValue(col, raw)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div style={{ padding: '16px', background: 'color-mix(in srgb, var(--color-success-500), transparent 94%)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success-700)', fontWeight: 800, fontSize: '0.72rem', textTransform: 'capitalize', letterSpacing: '0.05em' }}>
                <ClipboardList size={14} /> Remarks (Sales &amp; Production)
              </div>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--color-success-500)', color: 'var(--color-success-500)', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}>
                  EDIT REMARKS
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCancel} style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--color-border-dark)', color: 'var(--color-text-secondary)', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}>
                    CANCEL
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', background: 'var(--color-success-500)',
                      border: 'none', color: '#fff', fontSize: '0.68rem', fontWeight: 800,
                      cursor: hasChanges ? 'pointer' : 'not-allowed', opacity: hasChanges ? 1 : 0.5,
                    }}
                  >
                    SAVE CHANGES
                  </button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <DataPair label="Receive (รับงาน)" value={line.RecRemark} />
                <DataPair label="Enamel (ทาสี)" value={line.EnaRemark} />
                <DataPair label="Crystal (ติดคริสตัล)" value={line.CryRemark} />
                <DataPair label="Assembly (ประกอบ)" value={line.AsmRemark} />
                <DataPair label="Shelf (ขึ้นชั้น)" value={line.ShfRemark} />
                <DataPair label="Pack (แพ็ค)" value={line.PkRemark} />
                <DataPair label="Prod Remark (หมายเหตุ)" value={line.ProdRemark} />
                <DataPair label="Order Remark" value={line.OrdRemark} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {REMARK_FIELDS.map((field) => (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'capitalize' }}>{field.label}</label>
                    <input
                      type="text"
                      value={(remarks as any)[field.key]}
                      onChange={(e) => setRemarks((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={`Enter ${field.label}...`}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', fontSize: '0.75rem', color: 'var(--color-text-primary)', outline: 'none' }}
                    />
                  </div>
                ))}
                <DataPair label="Order Remark (Read-only)" value={line.OrdRemark} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo lightbox */}
      {isImageOpen && photoUrl && (
        <div
          onClick={() => { setIsImageOpen(false); setIsZoomed(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
            animation: 'fadeIn 0.2s ease-out forwards', fontFamily: 'var(--font-body, "Prompt", sans-serif)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative', background: 'var(--color-surface-0)', borderRadius: '20px',
              border: '1px solid var(--color-border-light)', boxShadow: '0 30px 70px rgba(0,0,0,0.45)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              width: '780px', height: '700px',
              maxWidth: '92vw', maxHeight: '88vh', animation: 'zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-brand-600)', letterSpacing: '0.05em', fontFamily: 'var(--font-display, monospace)' }}>
                :: {(line.ItemNo as string) || 'ITEM DETAIL'} ::
              </span>
              <button onClick={() => setIsImageOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px 8px', lineHeight: 1, borderRadius: '6px' }}>
                ✕
              </button>
            </div>

            <div style={{ flex: 1, padding: '20px', background: 'var(--color-surface-0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px',
                fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.03em', marginBottom: '14px', border: '1px solid',
                background: 'color-mix(in srgb, var(--color-success-500), transparent 90%)',
                borderColor: 'var(--color-success-500)',
                color: 'var(--color-success-500)',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                🌐 HIGH-RES FILE SERVER
              </div>

              <div
                onMouseMove={handleMouseMove}
                onMouseLeave={() => !isZoomed && setZoomPos({ x: 50, y: 50 })}
                style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-border-light)', overflow: 'hidden', padding: '12px', position: 'relative' }}
              >
                <img
                  src={photoUrl}
                  alt="Enlarged Item"
                  onError={(e) => attachPhotoFallback(e, itemNo, () => setIsImageOpen(false))}
                  onClick={() => setIsZoomed(!isZoomed)}
                  style={{
                    maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                    transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    cursor: isZoomed ? 'zoom-out' : 'zoom-in',
                    transition: isZoomed ? 'transform-origin 0.08s ease-out, transform 0.2s ease-out' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform-origin 0.3s',
                    borderRadius: '8px', boxShadow: isZoomed ? '0 12px 36px rgba(0,0,0,0.15)' : 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', width: '100%', justifyContent: 'center' }}>
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-brand-600)', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🔍 {isZoomed ? 'ZOOM OUT' : 'ZOOM IN (ขยาย 2.5 เท่า)'}
                </button>
              </div>

              {(line.ItemDesc as string) && (
                <div style={{ marginTop: '12px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'center', letterSpacing: '0.02em', maxWidth: '500px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {line.ItemDesc as string}
                </div>
              )}

              <div style={{ marginTop: '10px', fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>
                {isZoomed ? 'คลิกที่รูปภาพอีกครั้งเพื่อย่อขนาด หรือเลื่อนเมาส์/ทัชแพดเพื่อสำรวจรายละเอียด' : 'คลิกที่รูปภาพเพื่อซูมขยาย หรือกด ✕ เพื่อปิดกล่อง'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div style={{
          position: 'fixed', bottom: '32px', right: '32px', background: 'var(--color-surface-0)',
          border: '1px solid var(--color-success-500)', borderRadius: '12px', padding: '16px 24px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 10002, display: 'flex', alignItems: 'center', gap: '16px',
          animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards', color: 'var(--color-text-primary)',
        }}>
          <div style={{ background: 'var(--color-success-100)', color: 'var(--color-success-700)', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={20} strokeWidth={3} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Saved Successfully</span>
            <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Remarks for Line #{index + 1} updated.</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}
