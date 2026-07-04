// src/pages/OrderDetailPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, Search, Package, DollarSign, ClipboardList, FileSpreadsheet, Image, X, Layers } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { fetchOrderDetail, fetchOrderByPo, fetchOrderByGroup, type OrderDetail } from '../services/poTrackerAPI';
import { PhotoGalleryModal } from '../components/orderDetail/PhotoGalleryModal';
import OrderLineTable from '../components/orderDetail/OrderLineTable';
import LineDetailDrawer from '../components/orderDetail/LineDetailDrawer';
import { exportOrderDetailExcel } from '../utils/exportOrderDetailExcel';
import { ORDER_DETAIL_COLUMNS, COLUMN_GROUP_PRESETS, type ColGroup, type ColumnPreset } from '../config/orderDetailColumns';
import { fQty, fAmt } from '../components/orderDetail/format';

const PRESET_BUTTONS: { key: ColumnPreset; label: string; icon: React.ReactNode }[] = [
  { key: 'Sales', label: 'Sales View', icon: <DollarSign size={14} /> },
  { key: 'Production', label: 'Production View', icon: <Package size={14} /> },
  { key: 'Remarks', label: 'Remarks', icon: <ClipboardList size={14} /> },
  { key: 'All', label: 'All Details', icon: <Layers size={14} /> },
];

const TOGGLEABLE_GROUPS: { group: ColGroup; label: string }[] = [
  { group: 'info', label: 'Item & Dates' },
  { group: 'sales', label: 'Sales & Shipping' },
  { group: 'production', label: 'Production' },
  { group: 'remark', label: 'Remarks' },
];

const VIEW_PARAM_TO_PRESET: Record<string, ColumnPreset> = { sales: 'Sales', prod: 'Production', all: 'All' };

// ── Shared flat styles (theme-variable, no gradients/hardcoded hex) ──
const LBL: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' };
const ACT_ICON: React.CSSProperties = { width: 40, height: 40, borderRadius: '10px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' };
const ACT_BTN: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em' };
const ACT_SUCCESS: React.CSSProperties = { border: '1px solid color-mix(in srgb, var(--color-success-500) 35%, transparent)', background: 'color-mix(in srgb, var(--color-success-500) 12%, var(--color-surface-0))', color: 'var(--color-success-600)' };
const ACT_NEUTRAL: React.CSSProperties = { border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', color: 'var(--color-text-primary)' };
const ACT_DANGER: React.CSSProperties = { border: '1px solid color-mix(in srgb, var(--color-danger-500) 35%, transparent)', background: 'color-mix(in srgb, var(--color-danger-500) 10%, var(--color-surface-0))', color: 'var(--color-danger-600)' };

// ── Segmented pill toggle (เข้าชุดกับ PO Tracker list) ──
function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
      {options.map((o) => {
        const active = value.toLowerCase() === o.value.toLowerCase();
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, border: 'none',
              background: active ? 'var(--color-surface-0)' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: active ? '0 2px 8px color-mix(in srgb, var(--color-surface-900) 6%, transparent), 0 0 0 1px var(--color-border-light)' : 'none',
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

// ── KPI stat (label เล็ก + ค่าใหญ่) ──
function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: color || 'var(--color-text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// --- Main Page ----------------------------------------------------------------
export default function OrderDetailPage() {
  const { poNo, ordNo, cust, addr, kind, mat, duedate } = useParams<{ poNo?: string; ordNo?: string; cust?: string; addr?: string; kind?: string; mat?: string; duedate?: string; }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const isGroup = Boolean(cust && addr && kind && mat && duedate);
  const isPo = Boolean(poNo);
  const rawKey = isGroup ? 'Group' : (isPo ? poNo! : ordNo!);

  const initialPreset = VIEW_PARAM_TO_PRESET[searchParams.get('view') ?? ''] || 'Production';
  const [activePreset, setActivePreset] = useState<ColumnPreset | null>(initialPreset);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(COLUMN_GROUP_PRESETS[initialPreset]);
  const [showColPicker, setShowColPicker] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const [selectedLine, setSelectedLine] = useState<{ line: Record<string, unknown>; index: number } | null>(null);

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  // Locked date range (carried from PO Tracker list) + current status filter
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const statusFilter = searchParams.get('status') || 'ALL';

  const updateFilter = (key: 'prefix' | 'status', value: string) => {
    const p = new URLSearchParams(searchParams);
    p.set(key, value);
    setSearchParams(p, { replace: true });
  };

  const applyPreset = (preset: ColumnPreset) => {
    setActivePreset(preset);
    setVisibleKeys(COLUMN_GROUP_PRESETS[preset]);
  };

  const toggleColumn = (key: string) => {
    setActivePreset(null);
    setVisibleKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const load = useCallback(async () => {
    if (!rawKey) return;
    setLoading(true); setError(null);
    try {
      let data: OrderDetail;
      if (isGroup) {
        data = await fetchOrderByGroup(cust!, decodeURIComponent(addr!), kind!, mat!, duedate!, searchParams) as unknown as OrderDetail;
      } else if (isPo) {
        data = await fetchOrderByPo(decodeURIComponent(rawKey), searchParams) as unknown as OrderDetail;
      } else {
        data = await fetchOrderDetail(decodeURIComponent(rawKey), searchParams);
      }
      setDetail(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [rawKey, isGroup, isPo, cust, addr, kind, mat, duedate, searchParams]);

  useEffect(() => { load(); }, [load]);

  const h = detail?.header;
  const rawLines = (detail?.lines ?? []) as unknown as Record<string, unknown>[];

  // High-fidelity statistics calculations
  const uniqueOrders = new Set(rawLines.map(l => String(l.OrdNo || l.PONo || '')).filter(Boolean));
  const ordersCount = uniqueOrders.size;
  const totalQtySum = rawLines.reduce((sum, l) => sum + Number(l.TotalQty || l.Qty || 0), 0);
  const totalAmountSum = rawLines.reduce((sum, l) => sum + Number(l.Amount || l.SumAmnt || 0), 0);
  const displayAmount = (h as any)?.TotalAmount || (h as any)?.SumAmnt || totalAmountSum;

  // Filter lines locally
  const lines = rawLines.filter(line => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return Object.values(line).some(v => String(v).toLowerCase().includes(s));
  });

  const pageTitle = isGroup
    ? ((h as any)?.PONo || 'Group Detail')
    : (isPo ? (h as any)?.PONo || decodeURIComponent(rawKey) : decodeURIComponent(rawKey));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-surface-1)' }}>
      <Topbar
        hideSearch
        breadcrumb={[
          { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
          { label: 'PO TRACKER', path: '/po-tracker' },
          { label: pageTitle },
        ]}
      />

      {/* ══ Toolbar Row 1 — identity · KPIs · actions ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
        padding: '14px 24px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {isGroup ? (searchParams.get('po') ? 'Purchase Order' : 'Grouped Orders') : (isPo ? 'Purchase Order' : 'Order Document')}
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.35rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
              {pageTitle}
            </div>
          </div>

          {h && (
            <>
              <div style={{ width: '1px', height: '34px', background: 'var(--color-border-light)' }} />
              <Stat label="Customer" value={h.CustCode} />
              <Stat label="Total Qty" value={<>{fQty(h.TotalQty || totalQtySum)} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>pcs</span></>} color="var(--color-brand-600)" />
              <Stat label="Orders" value={<>{ordersCount.toLocaleString()} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>docs</span></>} />
              <Stat label="Amount (USD)" value={`$${fAmt(displayAmount)}`} color="var(--color-success-600)" />
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={load} title="Refresh Data" style={ACT_ICON}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => exportOrderDetailExcel(lines, h as unknown as Record<string, unknown>, pageTitle)}
            disabled={loading || lines.length === 0}
            title="Export to Excel"
            style={{ ...ACT_BTN, ...ACT_SUCCESS, cursor: loading || lines.length === 0 ? 'not-allowed' : 'pointer', opacity: loading || lines.length === 0 ? 0.5 : 1 }}
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            onClick={() => setShowPhotoGallery(true)}
            disabled={loading}
            title="View All Photos"
            style={{ ...ACT_BTN, ...ACT_NEUTRAL, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            <Image size={16} /> Photo
          </button>
          <button
            onClick={() => navigate('/po-tracker')}
            title="Close & return to PO Tracker"
            style={{ ...ACT_BTN, ...ACT_DANGER }}
          >
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {/* ══ Toolbar Row 2 — view mode · status · search · columns ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
        padding: '12px 24px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)', zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={LBL}>View</span>
            <Segmented
              options={PRESET_BUTTONS.map(t => ({ value: t.key, label: t.label.replace(' View', '').replace(' Details', '') }))}
              value={activePreset ?? ''}
              onChange={(v) => applyPreset(v as ColumnPreset)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={LBL}>Status</span>
            <Segmented
              options={[
                { value: 'Pending', label: 'Pending' },
                { value: 'Finish', label: 'Finish' },
                { value: 'Export', label: 'Export' },
                { value: 'ALL', label: 'All' },
              ]}
              value={statusFilter}
              onChange={(v) => updateFilter('status', v)}
            />
          </div>
          {dateFrom && dateTo && (
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-brand-600)', background: 'var(--color-brand-100)', padding: '4px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
              Locked: {dateFrom} → {dateTo}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Internal Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search items, metals, plating..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px 9px 38px', borderRadius: '12px',
                background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand-500)'; e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--color-brand-500), transparent 90%)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}>
              <Search size={16} />
            </div>
          </div>

          {/* View Columns popover */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowColPicker(!showColPicker); }}
              style={{
                padding: '9px 14px', borderRadius: 10,
                border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)',
                color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 700,
                outline: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Layers size={16} style={{ color: 'var(--color-text-tertiary)' }} />
              <span>View Columns</span>
              <div style={{ transform: showColPicker ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <svg width="10" height="6" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {showColPicker && (
              <>
                <div
                  onClick={() => { setShowColPicker(false); setColSearch(''); }}
                  style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'transparent' }}
                />
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--color-surface-1)', borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.25), 0 0 0 1px var(--color-border-light)',
                    padding: '8px', zIndex: 101,
                    width: '260px', display: 'flex', flexDirection: 'column', gap: '8px',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-quaternary)' }} />
                    <input
                      autoFocus
                      placeholder="Find column..."
                      value={colSearch}
                      onChange={(e) => setColSearch(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px 8px 30px', borderRadius: '8px',
                        background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)',
                        fontSize: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div className="custom-scrollbar" style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                    {TOGGLEABLE_GROUPS.map(({ group, label }) => {
                      const cols = ORDER_DETAIL_COLUMNS.filter((c) => c.group === group && c.label.toLowerCase().includes(colSearch.toLowerCase()));
                      if (cols.length === 0) return null;
                      return (
                        <div key={group}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-quaternary)', textTransform: 'capitalize', letterSpacing: '0.08em', padding: '6px 8px 2px' }}>
                            {label}
                          </div>
                          {cols.map((col) => (
                            <button
                              key={col.key}
                              onClick={() => toggleColumn(col.key)}
                              style={{ border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors font-bold ${visibleKeys.includes(col.key) ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)]' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]'}`}
                            >
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.label}</span>
                              {visibleKeys.includes(col.key) && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] ml-2 flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* -- Error -- */}
      {error && (
        <div style={{
          padding: '12px 24px',
          background: 'color-mix(in srgb, var(--color-danger-500) 12%, var(--color-surface-0))',
          borderBottom: '1px solid color-mix(in srgb, var(--color-danger-500) 30%, transparent)',
          color: 'var(--color-danger-600)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600,
        }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* -- Main Content: Excel-style grid table -- */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--color-text-tertiary)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ opacity: 0.2, marginBottom: '16px' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading order details…</div>
          </div>
        ) : lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--color-text-tertiary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}>📦</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>No item data available</div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.6 }}>Try adjusting the status filter or search keywords</div>
          </div>
        ) : (
          <OrderLineTable
            lines={lines}
            visibleKeys={visibleKeys}
            onRowClick={(line, index) => setSelectedLine({ line, index })}
          />
        )}
      </div>

      {/* Photo Gallery Modal */}
      {showPhotoGallery && (
        <PhotoGalleryModal lines={lines} onClose={() => setShowPhotoGallery(false)} />
      )}

      {/* Line Detail Drawer */}
      {selectedLine && (
        <LineDetailDrawer
          line={selectedLine.line}
          index={selectedLine.index}
          onClose={() => setSelectedLine(null)}
          onSaved={(updated) => setSelectedLine((prev) => (prev ? { ...prev, line: updated } : prev))}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
