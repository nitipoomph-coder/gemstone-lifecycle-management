// src/pages/OrderDetailPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, AlertTriangle } from 'lucide-react';
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
  { key: 'PONo',       label: 'PO1',           w: 100, group: 'cust', sales: true,  prod: false },
  { key: 'Destination',label: 'Destination',   w: 90,  group: 'cust', sales: true,  prod: false },
  { key: 'CustItem',   label: 'Cust Item',     w: 90,  group: 'cust', sales: true,  prod: false },
  { key: 'Stone',      label: 'Stone',         w: 80,  group: 'cust', sales: true,  prod: true  },
  { key: 'Plating',    label: 'Plating',       w: 70,  group: 'cust', sales: true,  prod: true  },
  { key: 'OrdRemark',  label: 'Order Remark',  w: 120, group: 'cust', sales: true,  prod: false },
  { key: 'Price',      label: 'Price',         w: 80,  group: 'cust', sales: true,  prod: false },
  { key: 'Amount',     label: 'Amount',        w: 90,  group: 'cust', sales: true,  prod: false },
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
  const lines = (detail?.lines ?? []) as Record<string, unknown>[];
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f4f8' }}>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'ORDER TRACKER', path: '/order-tracker' },
        { label: pageTitle },
      ]} />

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: '#fff', borderBottom: '1px solid #dee2e6',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}>
        {/* Left: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/order-tracker')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', border: '1px solid #ced4da', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#495057' }}
          >
            <ChevronLeft size={14} /> กลับ
          </button>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#004b8d' }}>
            {isPo ? 'PO: ' : 'Order: '}{pageTitle}
          </div>
          {isPo && (h as any)?.OrdNos && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {((h as any).OrdNos as string[]).map((o: string) => (
                <span key={o} style={{ background: '#e7f5ff', color: '#1971c2', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', fontFamily: 'monospace', fontWeight: 700 }}>{o}</span>
              ))}
            </div>
          )}
        </div>

        {/* Center: View Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {VIEW_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              style={{
                padding: '5px 14px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                background: view === t.key ? t.color : '#f1f3f5',
                color: view === t.key ? '#fff' : '#495057',
                border: `1px solid ${view === t.key ? t.color : '#dee2e6'}`,
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Right: refresh + meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {h && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: '#495057' }}>
              <span><b style={{ color: '#868e96' }}>Customer:</b> {h.CustCode} {h.CustName}</span>
              <span><b style={{ color: '#868e96' }}>Due:</b> <span style={{ color: '#c92a2a', fontWeight: 700 }}>{fDate(h.DueDate)}</span></span>
              <span><b style={{ color: '#868e96' }}>Qty:</b> <span style={{ color: '#1971c2', fontWeight: 800 }}>{fQty(h.TotalQty)}</span></span>
              <span><b style={{ color: '#868e96' }}>Lines:</b> {detail?.lineCount ?? '—'}</span>
            </div>
          )}
          <button
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', border: '1px solid #ced4da', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.72rem', color: '#495057' }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> รีเฟรช
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
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#adb5bd', fontSize: '0.85rem' }}>กำลังโหลดข้อมูล...</div>
        ) : lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#adb5bd', fontSize: '0.85rem' }}>ไม่พบข้อมูล</div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 'max-content', tableLayout: 'fixed', fontSize: '0.72rem' }}>
            <colgroup>
              {/* Fixed cols */}
              {FIXED_COLS.map(c => <col key={c.key} style={{ width: `${c.w}px`, minWidth: `${c.w}px` }} />)}
              {/* Photo */}
              <col style={{ width: '60px', minWidth: '60px' }} />
              {/* Dynamic cols */}
              {visibleCols.map(c => <col key={c.key} style={{ width: `${c.w}px`, minWidth: `${c.w}px` }} />)}
            </colgroup>

            <thead>
              {/* Row 1: Group headers */}
              <tr>
                {/* Fixed group */}
                <th colSpan={FIXED_COLS.length + 1} style={{ ...thBase, background: '#e3e8ef', color: '#364155' }}>
                  Item Information
                </th>
                {groupHeaders.map((g, i) => (
                  <th key={i} colSpan={g.span} style={{ ...thBase, background: g.color, color: '#333' }}>
                    {g.label}
                  </th>
                ))}
              </tr>
              {/* Row 2: Column labels */}
              <tr>
                {FIXED_COLS.map(c => (
                  <th key={c.key} style={{ ...thBase, background: '#e9ecef', color: '#495057' }}>{c.label}</th>
                ))}
                <th style={{ ...thBase, background: '#e9ecef', color: '#495057' }}>Pic</th>
                {visibleCols.map(c => (
                  <th key={c.key} style={{ ...thBase, background: '#f1f3f5', color: '#495057' }}>{c.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {lines.map((line, i) => {
                const even = i % 2 === 0;
                const rowBg = even ? '#fff' : '#f8fafc';
                return (
                  <tr
                    key={i}
                    style={{ background: rowBg }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                  >
                    {/* Fixed cells */}
                    <td style={{ ...tdBase, color: '#868e96', background: '#f8f9fa' }}>{i + 1}</td>
                    <td style={{ ...tdBase, fontWeight: 700, color: '#004b8d', fontFamily: 'monospace', fontSize: '0.68rem' }}>
                      {String(line.OrdNo || '')}
                      {line.LineNo != null && <span style={{ color: '#868e96', fontWeight: 400 }}>/{String(line.LineNo)}</span>}
                      <div style={{ fontWeight: 800, color: '#212529', fontFamily: 'inherit', fontSize: '0.7rem' }}>{String(line.ItemNo || '—')}</div>
                    </td>
                    <td style={{ ...tdBase, textAlign: 'left' }}>{String(line.ItemDesc || '—')}</td>
                    <td style={{ ...tdBase }}>{String(line.ItemSize || '—')}</td>
                    <td style={{ ...tdBase, fontWeight: 700, color: '#862e9c' }}>{String(line.ItemMat || '—')}</td>
                    {/* Photo */}
                    <td style={{ ...tdBase, padding: '2px' }}>
                      {line.ItemPhoto ? (
                        <img src={String(line.ItemPhoto)} alt="" style={{ width: '50px', height: '50px', objectFit: 'contain', display: 'block', margin: '0 auto', mixBlendMode: 'darken' }} />
                      ) : (
                        <div style={{ width: '50px', height: '50px', background: '#f1f3f5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#ced4da', fontSize: '0.55rem' }}>
                          No Img
                        </div>
                      )}
                    </td>
                    {/* Dynamic cells */}
                    {visibleCols.map(c => {
                      const val = cellVal(c.key, line);
                      const isProd = c.group === 'prod';
                      const isRed = isProd && val !== '—' && !isNaN(Number(val.replace(/,/g, ''))) && Number(val.replace(/,/g, '')) < 0;
                      const isGreen = isProd && val !== '—' && !isNaN(Number(val.replace(/,/g, ''))) && Number(val.replace(/,/g, '')) === 0;
                      return (
                        <td key={c.key} style={{
                          ...tdBase,
                          color: isRed ? '#c92a2a' : isGreen ? '#2b8a3e' : c.key.endsWith('Remark') ? '#495057' : undefined,
                          fontWeight: isRed ? 700 : undefined,
                          background: isRed ? 'rgba(201,42,42,0.05)' : undefined,
                          textAlign: c.key.endsWith('Remark') ? 'left' : 'center',
                          whiteSpace: c.key.endsWith('Remark') ? 'normal' : 'nowrap',
                          maxWidth: c.key.endsWith('Remark') ? `${c.w}px` : undefined,
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