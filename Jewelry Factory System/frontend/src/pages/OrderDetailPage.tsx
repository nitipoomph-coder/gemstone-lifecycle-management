// src/pages/OrderDetailPage.tsx
import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, ChevronDown, Search, Package, DollarSign, FileSpreadsheet, Image, X, Layers } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { fetchOrderDetail, fetchOrderByPo, fetchOrderByGroup, type OrderDetail } from '../services/poTrackerAPI';
import { PhotoGalleryModal } from '../components/orderDetail/PhotoGalleryModal';
import OrderLineTable from '../components/orderDetail/OrderLineTable';
import LineDetailDrawer from '../components/orderDetail/LineDetailDrawer';
import { exportOrderDetailExcel } from '../utils/exportOrderDetailExcel';
import { ORDER_DETAIL_COLUMNS, COLUMN_GROUP_PRESETS, type ColGroup, type ColumnPreset } from '../config/orderDetailColumns';
import { fQty, fAmt } from '../components/orderDetail/format';

const PRESET_BUTTONS: { key: ColumnPreset; label: string; icon: ReactNode }[] = [
  { key: 'Sales', label: 'Sales View', icon: <DollarSign size={14} /> },
  { key: 'Production', label: 'Production View', icon: <Package size={14} /> },
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
const LBL: CSSProperties = { fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' };
const ACT_ICON: CSSProperties = { width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease' };
const ACT_BTN: CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease', letterSpacing: 0 };
const ACT_NEUTRAL: CSSProperties = { border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', color: 'var(--color-text-primary)' };
const ACT_DANGER: CSSProperties = { border: '1px solid color-mix(in srgb, var(--color-danger-500) 35%, transparent)', background: 'color-mix(in srgb, var(--color-danger-500) 10%, var(--color-surface-0))', color: 'var(--color-danger-600)' };

// ── Segmented pill toggle (เข้าชุดกับ PO Tracker list) ──
function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="order-detail-segmented" style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
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
function Stat({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: color || 'var(--color-text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function OrderDetailLoading() {
  return (
    <div className="order-detail-loading" aria-busy="true" aria-label="Loading order details">
      <div className="order-detail-loading__row order-detail-loading__row--header">
        {Array.from({ length: 8 }).map((_, index) => <div key={index} className="app-skeleton" />)}
      </div>
      {Array.from({ length: 10 }).map((_, rowIndex) => (
        <div key={rowIndex} className="order-detail-loading__row">
          {Array.from({ length: 8 }).map((__, cellIndex) => <div key={cellIndex} className="app-skeleton" />)}
        </div>
      ))}
    </div>
  );
}

// ── Unified Filter (Status + Group in one bar) ──
function UnifiedFilter({
  status, prefix, onChange
}: {
  status: string, prefix: string, onChange: (s: string, p: string) => void
}) {
  const mainOpts = ['Pending', 'Finish', 'Export', 'ALL'];
  const groupOpts = ['BBC', 'BBF', 'BBQ', 'BBR', 'BBE'];

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const activeIsGroup = prefix !== 'ALL';

  return (
    <div className="order-detail-segmented" style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
      {mainOpts.map(o => {
        const active = (prefix === 'ALL' && status.toLowerCase() === o.toLowerCase());
        return (
          <button
            key={o}
            onClick={() => onChange(o, 'ALL')}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, border: 'none',
              background: active ? 'var(--color-surface-0)' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: active ? '0 2px 8px color-mix(in srgb, var(--color-surface-900) 6%, transparent), 0 0 0 1px var(--color-border-light)' : 'none',
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >{o === 'ALL' ? 'All' : o}</button>
        );
      })}

      <div className={`relative ${isOpen ? 'z-[9999]' : 'z-[10]'}`} ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            marginLeft: '4px',
            padding: '6px 12px 6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, border: 'none',
            background: activeIsGroup ? 'var(--color-surface-0)' : 'transparent',
            color: activeIsGroup ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            boxShadow: activeIsGroup ? '0 2px 8px color-mix(in srgb, var(--color-surface-900) 6%, transparent), 0 0 0 1px var(--color-border-light)' : 'none',
            cursor: 'pointer', outline: 'none', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          {activeIsGroup ? prefix : 'Groups'}
          <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-32 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-1.5" style={{ zIndex: 9999, boxShadow: 'var(--shadow-dropdown)' }}>
            {groupOpts.map(o => (
              <button
                key={o}
                onClick={() => { onChange('ALL', o); setIsOpen(false); }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors font-bold ${prefix === o ? "bg-[var(--color-brand-100)] text-[var(--color-brand-600)]" : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]"}`}
                style={{ border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                {o}
                {prefix === o && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] ml-2 flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
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

  const [refreshVersion, setRefreshVersion] = useState(0);
  const [detailState, setDetailState] = useState<{
    key: string;
    detail: OrderDetail | null;
    error: string | null;
  }>({ key: '', detail: null, error: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Locked date range (carried from PO Tracker list) + current status filter
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const statusFilter = searchParams.get('status') || 'ALL';
  const prefixFilter = searchParams.get('prefix') || 'ALL';
  const queryKey = searchParams.toString();
  const detailKey = `${rawKey}:${queryKey}:${refreshVersion}`;
  const hasCurrentDetail = detailState.key === detailKey;
  const detail = hasCurrentDetail ? detailState.detail : null;
  const error = hasCurrentDetail ? detailState.error : null;
  const loading = !hasCurrentDetail;

  const updateCombinedFilter = (s: string, p: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('status', s);
    params.set('prefix', p);
    setSearchParams(params, { replace: true });
  };

  const applyPreset = (preset: ColumnPreset) => {
    setActivePreset(preset);
    setVisibleKeys(COLUMN_GROUP_PRESETS[preset]);
  };

  const toggleColumn = (key: string) => {
    setActivePreset(null);
    setVisibleKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  useEffect(() => {
    if (!rawKey) return;
    let cancelled = false;
    const requestParams = new URLSearchParams(queryKey);
    const request = isGroup
      ? fetchOrderByGroup(cust!, decodeURIComponent(addr!), kind!, mat!, duedate!, requestParams) as unknown as Promise<OrderDetail>
      : isPo
        ? fetchOrderByPo(decodeURIComponent(rawKey), requestParams) as unknown as Promise<OrderDetail>
        : fetchOrderDetail(decodeURIComponent(rawKey), requestParams);

    request
      .then(nextDetail => {
        if (!cancelled) setDetailState({ key: detailKey, detail: nextDetail, error: null });
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setDetailState({
            key: detailKey,
            detail: null,
            error: requestError instanceof Error ? requestError.message : 'Failed to load data',
          });
        }
      });
    return () => { cancelled = true; };
  }, [rawKey, isGroup, isPo, cust, addr, kind, mat, duedate, queryKey, detailKey]);

  const h = (detail?.header ?? {}) as unknown as Record<string, unknown>;
  const rawLines = (detail?.lines ?? []) as unknown as Record<string, unknown>[];

  // High-fidelity statistics calculations
  const uniqueOrders = new Set(rawLines.map(l => String(l.OrdNo || l.PONo || '')).filter(Boolean));
  const ordersCount = uniqueOrders.size;
  const totalQtySum = rawLines.reduce((sum, l) => sum + Number(l.TotalQty || l.Qty || 0), 0);
  const totalAmountSum = rawLines.reduce((sum, l) => sum + Number(l.Amount || l.SumAmnt || 0), 0);
  const headerTotalQty = typeof h.TotalQty === 'number' || typeof h.TotalQty === 'string' ? h.TotalQty : totalQtySum;
  const displayAmount = typeof h.TotalAmount === 'number' || typeof h.TotalAmount === 'string'
    ? h.TotalAmount
    : typeof h.SumAmnt === 'number' || typeof h.SumAmnt === 'string' ? h.SumAmnt : totalAmountSum;

  // Filter lines locally
  const lines = rawLines.filter(line => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return Object.values(line).some(v => String(v).toLowerCase().includes(s));
  });

  const pageTitle = isGroup
    ? String(h.PONo || 'Group Detail')
    : (isPo ? String(h.PONo || decodeURIComponent(rawKey)) : decodeURIComponent(rawKey));

  return (
    <div className="app-page order-detail-page">
      <PageHeader
        breadcrumb={[
          { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
          { label: 'PO TRACKER', path: '/po-tracker' },
          { label: pageTitle },
        ]}
        contentLayout="workspace"
      />

      {/* ══ Toolbar Row 1 — identity · KPIs · actions ══ */}
      <div className="order-detail-summarybar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        padding: '10px 20px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)',
      }}>
        <div className="order-detail-summarybar__identity" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {isGroup ? (searchParams.get('po') ? 'Purchase Order' : 'Grouped Orders') : (isPo ? 'Purchase Order' : 'Order Document')}
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
              {pageTitle}
            </div>
          </div>

          {h && (
            <>
              <div style={{ width: '1px', height: '28px', background: 'var(--color-border-light)' }} />
              <Stat label="Customer" value={String(h.CustCode ?? '')} />
              <Stat label="Total Qty" value={<>{fQty(headerTotalQty)} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>pcs</span></>} />
              <Stat label="Orders" value={<>{ordersCount.toLocaleString()} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>docs</span></>} />
              <Stat label="Amount (USD)" value={`$${fAmt(displayAmount)}`} />
            </>
          )}
        </div>

        <div className="order-detail-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setRefreshVersion(version => version + 1)} title="Refresh Data" style={ACT_ICON}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => exportOrderDetailExcel(lines, h as unknown as Record<string, unknown>, pageTitle, (filePath) => {
              setToastMessage(`Exported successfully to: ${filePath}`);
              setTimeout(() => setToastMessage(null), 5000);
            })}
            disabled={loading || lines.length === 0}
            title="Export to Excel"
            style={{ ...ACT_BTN, ...ACT_NEUTRAL, cursor: loading || lines.length === 0 ? 'not-allowed' : 'pointer', opacity: loading || lines.length === 0 ? 0.5 : 1 }}
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
      <div className="order-detail-filterbar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
        padding: '10px 20px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)', zIndex: 50,
      }}>
        <div className="order-detail-filterbar__left" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={LBL}>View</span>
            <Segmented
              options={PRESET_BUTTONS.map(t => ({ value: t.key, label: t.label.replace(' View', '').replace(' Details', '') }))}
              value={activePreset ?? ''}
              onChange={(v) => applyPreset(v as ColumnPreset)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={LBL}>Filter</span>
            <UnifiedFilter
              status={statusFilter}
              prefix={prefixFilter}
              onChange={updateCombinedFilter}
            />
          </div>
          {dateFrom && dateTo && (
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-brand-600)', background: 'var(--color-brand-100)', padding: '4px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
              Locked: {dateFrom} → {dateTo}
            </span>
          )}
        </div>

        <div className="order-detail-filterbar__right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Internal Search */}
          <div className="order-detail-search" style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search items, metals, plating..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px',
                background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand-500)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-ui-focus-ring)'; }}
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
                padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)',
                color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 700,
                outline: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Layers size={16} style={{ color: 'var(--color-text-tertiary)' }} />
              <span>View Columns</span>
              <ChevronDown size={13} style={{ transform: showColPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
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
                    background: 'var(--color-ui-surface)', borderRadius: '8px',
                    boxShadow: 'var(--shadow-dropdown)',
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
      <div className="order-detail-table-region" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'auto' }}>
        {loading ? (
          <OrderDetailLoading />
        ) : lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--color-text-tertiary)' }}>
            <Package size={28} style={{ margin: '0 auto 14px', opacity: 0.35 }} />
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

      {toastMessage && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 200, padding: '12px 16px', borderRadius: 10, background: 'var(--color-surface-0)', border: '1px solid var(--color-success-500)', color: 'var(--color-success-600)', fontSize: '0.8rem', fontWeight: 800, boxShadow: '0 12px 32px color-mix(in srgb, var(--color-surface-900) 18%, transparent)' }}>
          {toastMessage}
        </div>
      )}

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
