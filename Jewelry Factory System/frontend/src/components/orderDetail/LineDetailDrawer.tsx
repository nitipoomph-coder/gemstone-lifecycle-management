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

  // รูปดึงจาก network path อย่างเดียว (ps ก่อน, onError fallback ไป cad)
  const itemNo = line.ItemNo as string | undefined;
  const photoUrl = itemNo ? psPhotoUrl(itemNo) : '';

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
              width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--color-border-light)',
              background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-2)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-0)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.transform = 'scale(1)';
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
              background: photoUrl ? '#FFFFFF' : 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          onClick={() => setIsImageOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        >
          {/* Floating Close Button */}
          <button
            onClick={() => setIsImageOpen(false)}
            style={{
              position: 'absolute', top: 32, right: 32, background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '50%', cursor: 'pointer',
              padding: 12, color: '#fff', display: 'flex', transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
              zIndex: 10001,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={28} />
          </button>

          {/* Full Image */}
          <img
            onClick={(e) => e.stopPropagation()}
            src={psPhotoUrl(itemNo)}
            alt={`${itemNo} Photo`}
            loading="lazy"
            onError={(e) => attachPhotoFallback(e, itemNo)}
            style={{
              maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
              animation: 'zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
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
