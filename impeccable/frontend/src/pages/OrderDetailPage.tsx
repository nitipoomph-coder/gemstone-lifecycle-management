// src/pages/OrderDetailPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { fetchOrderDetail, fetchOrderByPo, type OrderDetail } from '../services/orderTrackerAPI';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const fQty = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());
const fAmt = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ViewMode = 'sales' | 'prod' | 'all';

// ─── Column Definitions ───────────────────────────────────────────────────────
// คอลัมน์ที่ตรึงอยู่เสมอ (ซ้ายสุด)
const FIXED_COLS = [
  { key: 'no',       label: 'No.',        w: 40  },
  { key: 'ItemNo',   label: 'Item No.',   w: 110 },
  { key: 'ItemDesc', label: 'Description',w: 160 },
  { key: 'ItemSize', label: 'Size',       w: 90  },
  { key: 'ItemMat',  label: 'Metal',      w: 70  },
];

// Customer Data columns
const COL_CUST = [
  { key: 'OrdDate',    label: 'Order Date',    w: 85,  group: 'cust', sales: true,  prod: true  },
  { key: 'DueDate',    label: 'Factory Due',   w: 85,  group: 'cust', sales: true,  prod: true  },
  { key: 'QCDate',     label: 'QC Date',       w: 85,  group: 'cust', sales: true,  prod: false },
  { key: 'CustDueDate',label: 'Cust Due Date', w: 85,  group: 'cust', sales: true,  prod: false },
  { key: 'Sales',      label: 'Sales',         w: 70,  group: 'cust', sales: true,  prod: false },
  { key: 'PONo',       label: 'PO Number',     w: 120, group: 'cust', sales: true,  prod: true  },
  { key: 'Destination',label: 'Destination',   w: 90,  group: 'cust', sales: true,  prod: false },
  { key: 'CustItem',   label: 'Cust Item',     w: 90,  group: 'cust', sales: true,  prod: false },
  {key: 'Stone',      label: 'Stone',         w: 100, group: 'cust', sales: true,  prod: true  },
  {key: 'Plating',    label: 'Plating',       w: 180, group: 'cust', sales: true,  prod: true  },
  {key: 'OrdRemark',  label: 'Order Remark',  w: 240, group: 'cust', sales: true,  prod: false },
  {key: 'Price',      label: 'Price',         w: 80,  group: 'cust', sales: true,  prod: false },
  {key: 'Amount',     label: 'Amount',        w: 90,  group: 'cust', sales: true,  prod: false },
];

// Shipping Data columns
const COL_SHIP = [
  { key: 'InvoiceNo',  label: 'Invoice No.',  w: 100, group: 'ship', sales: true,  prod: false },
  { key: 'InvoiceDate',label: 'Invoice Date', w: 85,  group: 'ship', sales: true,  prod: false },
  { key: 'AWB',        label: 'AWB',          w: 90,  group: 'ship', sales: true,  prod: false },
];

// Production Process columns (qty = pending qty)
const COL_PROD = [
  { key: 'StoneQty',   label: 'Stone',    w: 70, group: 'prod', sales: false, prod: true },
  { key: 'FindingQty', label: 'Finding',  w: 70, group: 'prod', sales: false, prod: true },
  { key: 'WaxQty',     label: 'Wax',      w: 60, group: 'prod', sales: false, prod: true },
  { key: 'WaxSetQty',  label: 'Wax Set',  w: 70, group: 'prod', sales: false, prod: true },
  { key: 'CastQty',    label: 'Cast',     w: 60, group: 'prod', sales: false, prod: true },
  { key: 'GrindQty',   label: 'Grind',    w: 65, group: 'prod', sales: false, prod: true },
  { key: 'EpoxQty',    label: 'Epoxy',    w: 60, group: 'prod', sales: false, prod: true },
  { key: 'FilingQty',  label: 'Filing',   w: 60, group: 'prod', sales: false, prod: true },
  { key: 'PolishQty',  label: 'Polish',   w: 65, group: 'prod', sales: false, prod: true },
  { key: 'PQCQty',     label: 'PQC',      w: 55, group: 'prod', sales: false, prod: true },
  { key: 'PlatingQty', label: 'Plating',  w: 65, group: 'prod', sales: false, prod: true },
  { key: 'AssemQty',   label: 'Assemble', w: 70, group: 'prod', sales: false, prod: true },
  { key: 'FQCQty',     label: 'FQC',      w: 55, group: 'prod', sales: false, prod: true },
  { key: 'PackQty',    label: 'Pack',     w: 60, group: 'prod', sales: false, prod: true },
  { key: 'GroupQty',   label: 'Group',    w: 60, group: 'prod', sales: false, prod: true },
  { key: 'BalQty',     label: 'Balance',  w: 65, group: 'prod', sales: false, prod: true },
];

// Remark columns — แสดงทั้ง sales & prod
const COL_REMARK = [
  { key: 'RecRemark',  label: 'Receive Remark',   w: 120, group: 'remark', sales: true, prod: true },
  { key: 'EnaRemark',  label: 'Enamel Remark',    w: 120, group: 'remark', sales: true, prod: true },
  { key: 'CryRemark',  label: 'Crystal Remark',   w: 120, group: 'remark', sales: true, prod: true },
  { key: 'AsmRemark',  label: 'Assembly Remark',  w: 130, group: 'remark', sales: true, prod: true },
  { key: 'ShfRemark',  label: 'Shelf Remark',     w: 110, group: 'remark', sales: true, prod: true },
  { key: 'PkRemark',   label: 'Pack Remark',      w: 110, group: 'remark', sales: true, prod: true },
  { key: 'ProdRemark', label: 'Production Remark',w: 130, group: 'remark', sales: true, prod: true },
];

const ALL_EXTRA_COLS = [...COL_CUST, ...COL_SHIP, ...COL_PROD, ...COL_REMARK];

function getVisibleCols(view: ViewMode) {
  if (view === 'all') return ALL_EXTRA_COLS;
  return ALL_EXTRA_COLS.filter(c => view === 'sales' ? c.sales : c.prod);
}

// Group header spans
function buildGroupHeaders(cols: typeof ALL_EXTRA_COLS) {
  const groups: { label: string; span: number; color: string }[] = [];
  let current = '';
  const COLORS: Record<string, string> = {
    cust: '#d0ebff', ship: '#d3f9d8', prod: '#fff3bf', remark: '#ffe8cc',
  };
  const LABELS: Record<string, string> = {
    cust: 'Customer Data', ship: 'Shipping Data', prod: 'Production Process', remark: 'Remarks',
  };
  for (const c of cols) {
    if (c.group !== current) {
      groups.push({ label: LABELS[c.group] || c.group, span: 1, color: COLORS[c.group] || '#f8f9fa' });
      current = c.group;
    } else {
      groups[groups.length - 1].span++;
    }
  }
  return groups;
}

// ─── View Tabs ─────────────────────────────────────────────────────────────────
const VIEW_TABS: { key: ViewMode; label: string; color: string }[] = [
  { key: 'sales', label: '📋 Sales View',      color: '#1971c2' },
  { key: 'prod',  label: '⚙️ Production View', color: '#c92a2a' },
  { key: 'all',   label: '🔍 All View',         color: '#5c5f66' },
];

// ─── Cell renderer ─────────────────────────────────────────────────────────────
const DATE_KEYS = new Set(['OrdDate','DueDate','QCDate','CustDueDate','InvoiceDate']);

function cellVal(colKey: string, line: Record<string, unknown>): string {
  const v = line[colKey];
  if (v == null || v === '') return '—';
  if (DATE_KEYS.has(colKey)) return fDate(v as string);
  if (typeof v === 'number') {
    if (colKey === 'Price' || colKey === 'Amount') return fAmt(v);
    return fQty(v);
  }
  return String(v);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  // รองรับ /po/:poNo, /ord/:ordNo และ legacy /:ordNo
  const { poNo, ordNo } = useParams<{ poNo?: string; ordNo?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isPo = Boolean(poNo);
  const rawKey = isPo ? poNo! : ordNo!;

  const viewParam = (searchParams.get('view') as ViewMode) || 'prod';
  const [view, setView] = useState<ViewMode>(viewParam);

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    if (!rawKey) return;
    setLoading(true); setError(null);
    try {
      let data: OrderDetail;
      if (isPo) {
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

  const h = detail?.header;
  const rawLines = (detail?.lines ?? []) as Record<string, unknown>[];
  
  // Filter lines locally
  const lines = rawLines.filter(line => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return Object.values(line).some(v => String(v).toLowerCase().includes(s));
  });

  const visibleCols = getVisibleCols(view);
  const groupHeaders = buildGroupHeaders(visibleCols);

  const pageTitle = isPo
    ? (h as any)?.PONo || decodeURIComponent(rawKey)
    : decodeURIComponent(rawKey);

  // ─── Th/Td style helpers ─────────────────────────────────────────────────
  const thBase: React.CSSProperties = {
    padding: '6px 8px', fontSize: '0.68rem', fontWeight: 700,
    border: '1px solid #b0c4de', whiteSpace: 'nowrap', textAlign: 'center',
    position: 'sticky', top: 0, zIndex: 2,
  };
  const tdBase: React.CSSProperties = {
    padding: '5px 7px', fontSize: '0.72rem', border: '1px solid #cdd5e0',
    whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-surface-1)' }}>
      <Topbar 
        hideSearch
        breadcrumb={[
          { label: 'JEWELRY SMART FACTORY', path: '/' },
          { label: 'ORDER TRACKER', path: '/order-tracker' },
          { label: pageTitle },
        ]} 
      />

      {/* ── Top Bar (Relocated Info & Search) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)',
        boxShadow: '0 4px 20px -12px rgba(0,0,0,0.1)', zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button
            onClick={() => navigate('/order-tracker')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', 
              border: '1px solid var(--color-border-light)', borderRadius: '14px', 
              background: 'var(--color-surface-1)', cursor: 'pointer', fontSize: '0.75rem', 
              fontWeight: 800, color: 'var(--color-text-secondary)', transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={18} /> BACK
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {isPo ? 'Purchase Order' : 'Order Document'}
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                {pageTitle}
              </div>
            </div>

            {h && (
              <>
                <div style={{ width: '1px', height: '32px', background: 'var(--color-border-light)' }} />
                <div style={{ display: 'flex', gap: '40px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>CUSTOMER</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>{h.CustCode}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>TOTAL QUANTITY</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-brand-600)' }}>{fQty(h.TotalQty)} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>PCS</span></span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Internal Table Search */}
          <div style={{ position: 'relative', width: '320px' }}>
             <input 
               type="text"
               placeholder="Search items, metals, plating..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               style={{
                 width: '100%', padding: '12px 16px 12px 42px', borderRadius: '14px',
                 background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                 fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)',
                 outline: 'none', transition: 'all 0.2s',
                 boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
               }}
               onFocus={e => {
                 e.currentTarget.style.borderColor = 'var(--color-brand-500)';
                 e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--color-brand-500), transparent 90%)';
               }}
               onBlur={e => {
                 e.currentTarget.style.borderColor = 'var(--color-border-light)';
                 e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
               }}
             />
             <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}>
               <Search size={18} />
             </div>
          </div>

          <div style={{ display: 'flex', padding: '4px', borderRadius: '14px', background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
            {VIEW_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                style={{
                  padding: '8px 18px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, 
                  background: view === t.key ? 'var(--color-surface-0)' : 'transparent',
                  color: view === t.key ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                  boxShadow: view === t.key ? '0 4px 12px -2px rgba(0,0,0,0.08)' : 'none',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase'
                }}
              >
                {t.label.split(' ')[1]}
              </button>
            ))}
          </div>

          <button
            onClick={load}
            style={{ 
              width: 42, height: 42, borderRadius: '12px', border: '1px solid var(--color-border-light)', 
              background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: '8px 16px', background: '#ffe3e3', borderBottom: '1px solid #ffc9c9', color: '#c92a2a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Table (full-screen, scrollable) ── */}
      <div className="custom-scrollbar" style={{ 
        flex: 1, 
        overflow: 'auto', 
        background: 'var(--color-surface-0)',
        position: 'relative'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--color-text-tertiary)' }}>
             <RefreshCw size={32} className="animate-spin" style={{ opacity: 0.2, marginBottom: '16px' }} />
             <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading world-class data...</div>
          </div>
        ) : lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--color-text-tertiary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}>📦</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>No item data available</div>
          </div>
        ) : (
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 'max-content', tableLayout: 'fixed' }}>
            <colgroup>
              {/* Fixed cols */}
              {FIXED_COLS.map(c => <col key={c.key} style={{ width: `${c.w}px` }} />)}
              {/* Photo */}
              <col style={{ width: '65px' }} />
              {/* Extra cols */}
              {visibleCols.map(c => <col key={c.key} style={{ width: `${c.w}px` }} />)}
            </colgroup>

            <thead style={{ position: 'sticky', top: 0, zIndex: 100 }}>
              {/* Row 1: Group headers */}
              <tr>
                <th colSpan={FIXED_COLS.length + 1} style={{
                  background: 'color-mix(in srgb, var(--color-surface-1), transparent 5%)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  borderBottom: '1px solid var(--color-border-light)',
                }} />
                {groupHeaders.map((g, i) => (
                  <th key={i} colSpan={g.span} style={{
                    background: `color-mix(in srgb, ${g.color}, transparent 60%)`,
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    padding: '12px 14px', fontSize: '0.65rem', fontWeight: 900,
                    color: 'var(--color-text-primary)', textAlign: 'center',
                    borderBottom: '1px solid var(--color-border-light)',
                    borderRight: '1px solid var(--color-border-light)',
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                  }}>
                    {g.label}
                  </th>
                ))}
              </tr>
              {/* Row 2: Column labels */}
              <tr>
                {FIXED_COLS.map((c, idx) => {
                  return (
                    <th key={c.key} style={{
                      background: 'color-mix(in srgb, var(--color-surface-1), transparent 5%)',
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      padding: '14px', fontSize: '0.62rem', fontWeight: 800,
                      color: 'var(--color-text-tertiary)', textAlign: 'center',
                      borderBottom: '2px solid var(--color-border-light)',
                      position: 'sticky', top: '38px', zIndex: 110,
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>{c.label}</th>
                  );
                })}
                <th style={{
                  background: 'color-mix(in srgb, var(--color-surface-1), transparent 5%)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  padding: '14px', fontSize: '0.62rem', fontWeight: 800,
                  color: 'var(--color-text-tertiary)', textAlign: 'center',
                  borderBottom: '2px solid var(--color-border-light)',
                  position: 'sticky', top: '38px', zIndex: 110,
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>Pic</th>
                {visibleCols.map(c => (
                  <th key={c.key} style={{
                    background: 'color-mix(in srgb, var(--color-surface-1), transparent 5%)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    padding: '14px', fontSize: '0.62rem', fontWeight: 800,
                    color: 'var(--color-text-tertiary)', textAlign: 'center',
                    borderBottom: '2px solid var(--color-border-light)',
                    borderRight: '1px solid color-mix(in srgb, var(--color-border-light), transparent 80%)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    position: 'sticky', top: '38px',
                  }}>{c.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {lines.map((line, i) => {
                const rowBg = i % 2 === 0 ? 'var(--color-surface-0)' : 'color-mix(in srgb, var(--color-surface-1), transparent 60%)';
                return (
                  <tr key={i} className="detail-row-hover" style={{ background: rowBg, transition: 'all 0.2s' }}>
                    {/* Fixed Cells */}
                    {FIXED_COLS.map((c, idx) => {
                      return (
                        <td key={c.key} style={{
                          padding: '12px 14px', fontSize: '0.75rem', fontWeight: idx === 1 ? 800 : 600,
                          color: idx === 1 ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
                          borderBottom: '1px solid var(--color-border-light)',
                          background: rowBg,
                          textAlign: idx === 0 ? 'center' : 'left'
                        }}>
                          {idx === 0 ? i + 1 : idx === 1 ? (
                            <>
                              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>{String(line.OrdNo || '')}/{String(line.LineNo || '1')}</div>
                              {String(line.ItemNo || '—')}
                            </>
                          ) : String(line[c.key] || '—')}
                        </td>
                      );
                    })}
                    {/* Photo */}
                    <td style={{
                      padding: '6px', borderBottom: '1px solid var(--color-border-light)',
                      background: rowBg, textAlign: 'center'
                    }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '8px', 
                        background: 'var(--color-surface-2)', overflow: 'hidden',
                        border: '1px solid var(--color-border-light)', margin: '0 auto'
                      }}>
                        {line.ItemPhoto ? (
                          <img src={String(line.ItemPhoto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: 'var(--color-text-quaternary)' }}>NO IMG</div>
                        )}
                      </div>
                    </td>
                    {/* Dynamic cells */}
                    {visibleCols.map(c => {
                      const val = cellVal(c.key, line);
                      const isProd = c.group === 'prod';
                      const numVal = Number(val.replace(/,/g, ''));
                      const isRed = isProd && val !== '—' && !isNaN(numVal) && numVal < 0;
                      const isGreen = isProd && val !== '—' && !isNaN(numVal) && numVal === 0;
                      return (
                        <td key={c.key} style={{
                          padding: '12px 14px', fontSize: '0.72rem', fontWeight: isRed ? 800 : 500,
                          textAlign: c.key.endsWith('Remark') ? 'left' : 'center',
                          color: isRed ? 'var(--color-accent-600)' : isGreen ? '#2b8a3e' : 'var(--color-text-secondary)',
                          borderBottom: '1px solid var(--color-border-light)',
                          borderRight: '1px solid color-mix(in srgb, var(--color-border-light), transparent 85%)',
                          background: isRed ? 'color-mix(in srgb, var(--color-accent-500), transparent 96%)' : 'transparent',
                        }}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}