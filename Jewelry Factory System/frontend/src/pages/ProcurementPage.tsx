import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { menuConfig } from '../config/menuConfig';
import { formConfigMap, type FormConfig, type TableColumnDef } from '../config/formConfigs';
import {
  FilePlus, Save, Edit3, Search, Trash2, CornerUpLeft, Printer, List, X,
  PlusCircle, MinusCircle, ChevronDown, Loader2, AlertCircle, FileText,
  Package, TrendingUp, Calendar, DollarSign, Hash
} from 'lucide-react';
import {
  fetchDocumentList, fetchDocumentDetail,
  type ProcDocListItem, type ProcDocDetail, type ProcDocLine
} from '../services/procurementAPI';

// ─── Route → docType mapping ──────────────────
const routeToDocType: Record<string, string> = {
  '/procurement/purchase': 'SPA',
  '/procurement/receive': 'SRA',
  '/procurement/receive-b': 'SRB',
  '/procurement/return': 'SIR',
};

// ─── Toolbar buttons ──────────────────────────
const toolbarButtons = [
  { id: 'new', label: 'สร้างใหม่', Icon: FilePlus, color: 'text-amber-400' },
  { id: 'save', label: 'บันทึก', Icon: Save, color: '' },
  { id: 'edit', label: 'แก้ไข', Icon: Edit3, color: 'text-emerald-400' },
  { id: 'search', label: 'ค้นหา', Icon: Search, color: 'text-yellow-400' },
  { id: 'sep1', label: '', Icon: null, color: '' },
  { id: 'delete', label: 'ลบ', Icon: Trash2, color: 'text-red-400', danger: true },
  { id: 'undo', label: 'ยกเลิก', Icon: CornerUpLeft, color: '' },
  { id: 'sep2', label: '', Icon: null, color: '' },
  { id: 'print', label: 'พิมพ์', Icon: Printer, color: '' },
  { id: 'list', label: 'รายการ', Icon: List, color: '' },
  { id: 'close', label: 'ปิด', Icon: X, color: '' },
];

export default function ProcurementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const docType = routeToDocType[location.pathname] || 'SPA';
  const formConfig = formConfigMap[docType];

  // ─── State ──────────────────────────────────
  const [docList, setDocList] = useState<ProcDocListItem[]>([]);
  const [selectedDocNo, setSelectedDocNo] = useState('');
  const [docDetail, setDocDetail] = useState<ProcDocDetail | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Breadcrumb ─────────────────────────────
  const groupLabel = 'จัดซื้อและรับเข้า';
  const itemLabel = formConfig?.titleTh || docType;

  // ─── Load document list ─────────────────────
  useEffect(() => {
    setLoading(true);
    setError('');
    setDocList([]);
    setDocDetail(null);
    setSelectedDocNo('');

    fetchDocumentList(docType)
      .then(data => {
        setDocList(data);
        if (data.length > 0) setSelectedDocNo(data[0].docNumber);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [docType]);

  // ─── Load document detail ───────────────────
  useEffect(() => {
    if (!selectedDocNo) return;
    setDetailLoading(true);
    fetchDocumentDetail(selectedDocNo)
      .then(setDocDetail)
      .catch(err => setError(err.message))
      .finally(() => setDetailLoading(false));
  }, [selectedDocNo]);

  // ─── Filtered doc list ──────────────────────
  const filteredDocs = docList.filter(d =>
    d.docNumber.toLowerCase().includes(searchText.toLowerCase())
  );

  // ─── Totals ─────────────────────────────────
  const lines = docDetail?.lines || [];
  const totalWeight = lines.reduce((s, l) => s + (l.weight || 0), 0);
  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
  const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0);

  // ─── Get table columns from config ──────────
  const tableColumns: TableColumnDef[] = formConfig?.tableColumns || [];

  // ─── Map line data to column key ────────────
  const getCellValue = (line: ProcDocLine, key: string): string | number => {
    const map: Record<string, string | number> = {
      seq: line.seq, stoneCode: line.stoneCode, stone: line.stoneName || line.stoneCode,
      color: line.color, shape: line.shape, size: line.size, char: line.characteristic,
      grade: line.grade, height: line.height, unit: line.unit, warehouse: line.warehouse,
      weight: line.weight, qty: line.qty, price: line.price, total: line.amount,
      order: line.orderNumber, customer: line.customer || '', gradeAmm: line.height,
      pricePerCt: line.ctPerPc, ctPerPc: line.ctPerPc, dollarCt: line.ctPerPc,
      returnQty: line.qty, wgt: line.weight, use: line.useStone,
      jobNo: line.jobNumber, seed: line.qty,
    };
    return map[key] ?? '';
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface-0)]">
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: groupLabel, path: '/procurement/purchase' },
        { label: `${itemLabel} (${docType})` },
      ]} />

      {/* ═══ Toolbar ═══ */}
      <div className="flex h-11 items-center gap-1 border-b border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-4">
        {toolbarButtons.map(btn => {
          if (btn.id.startsWith('sep'))
            return <span key={btn.id} className="mx-1 h-5 w-px bg-[var(--color-border-default)]" />;
          const Icon = btn.Icon!;
          return (
            <button key={btn.id}
              onClick={() => btn.id === 'close' && navigate('/')}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                (btn as any).danger
                  ? 'text-red-400 hover:bg-red-950/30'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]'
              }`}>
              <Icon size={15} className={btn.color} />
              <span className="hidden md:inline">{btn.label}</span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
          <FileText size={13} />
          <span>{docList.length} เอกสาร</span>
        </div>
      </div>

      {/* ═══ Main Split Panel ═══ */}
      <div className="flex flex-1 overflow-hidden gap-0">

        {/* ─── Left: Document List ─── */}
        <div className="flex w-56 shrink-0 flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface-1)]">
          {/* Search */}
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-2)] p-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-sidebar-accent)]">
              เลขที่เอกสาร
            </span>
            <div className="mt-1.5 flex items-center gap-1 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-2 h-7">
              <Search size={12} className="text-[var(--color-text-tertiary)]" />
              <input type="text" placeholder="ค้นหา..."
                value={searchText} onChange={e => setSearchText(e.target.value)}
                className="w-full bg-transparent text-[12px] text-[var(--color-text-primary)] outline-none" />
            </div>
          </div>

          {/* List */}
          <div className="content-scrollbar flex-1 overflow-y-auto bg-[var(--color-surface-0)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[var(--color-brand-500)]" />
              </div>
            ) : error ? (
              <div className="p-3 text-center text-xs text-[var(--color-danger-500)]">
                <AlertCircle size={16} className="mx-auto mb-1" />{error}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--color-text-tertiary)]">ไม่พบเอกสาร</div>
            ) : (
              filteredDocs.map(d => (
                <button key={d.docNumber}
                  onClick={() => setSelectedDocNo(d.docNumber)}
                  className={`w-full border-b border-[var(--color-border-default)]/40 px-3 py-2 text-left text-[12px] font-mono transition-colors ${
                    d.docNumber === selectedDocNo
                      ? 'bg-[var(--color-brand-500)] text-[var(--color-text-inverse)] font-bold'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
                  }`}>
                  <div>{d.docNumber}</div>
                  <div className={`text-[10px] mt-0.5 ${
                    d.docNumber === selectedDocNo ? 'opacity-80' : 'text-[var(--color-text-tertiary)]'
                  }`}>{d.docDate}</div>
                </button>
              ))
            )}
          </div>

          {/* Summary footer */}
          <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-2)] px-3 py-2">
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)]">
              <span>แสดง {filteredDocs.length} / {docList.length}</span>
              <span className="font-mono text-[var(--color-brand-500)]">{docType}</span>
            </div>
          </div>
        </div>

        {/* ─── Right: Document Detail ─── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {detailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={28} className="animate-spin text-[var(--color-brand-500)]" />
                <span className="text-sm text-[var(--color-text-tertiary)]">กำลังโหลดเอกสาร...</span>
              </div>
            </div>
          ) : !docDetail ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-[var(--color-text-tertiary)]">
                <Package size={40} className="opacity-30" />
                <span className="text-sm">เลือกเอกสารจากรายการด้านซ้าย</span>
              </div>
            </div>
          ) : (
            <>
              {/* ─── Header Form ─── */}
              <div key={docDetail.header.docNumber} className="border-b border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-4">
                {/* Summary Cards Row */}
                <div className="mb-4 grid grid-cols-4 gap-3">
                  <MiniCard icon={<Hash size={14}/>} label="เลขที่" value={docDetail.header.docNumber} accent="brand" />
                  <MiniCard icon={<Calendar size={14}/>} label="วันที่เอกสาร" value={docDetail.header.docDate} accent="info" />
                  <MiniCard icon={<DollarSign size={14}/>} label="มูลค่ารวม" value={docDetail.header.totalAmount.toLocaleString('th-TH', {minimumFractionDigits:2})} accent="success" />
                  <MiniCard icon={<TrendingUp size={14}/>} label="จำนวนรวม" value={String(docDetail.header.totalQty)} accent="accent" />
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-4 gap-x-4 gap-y-2.5">
                  {formConfig?.headerFields.map(f => (
                    <FieldRow key={f.name} label={f.label}
                      value={getHeaderValue(docDetail.header, f.name)}
                      type={f.type} readOnly={f.readOnly} options={f.options}
                      hasSearch={f.hasSearch}
                      colSpan={f.colSpan} />
                  ))}
                </div>

                {/* Stone Fields (if present) */}
                {formConfig?.stoneFields && (
                  <div className="mt-3 border-t border-[var(--color-border-light)] pt-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-sidebar-accent)]">
                        ข้อมูลพลอย
                      </span>
                      <div className="flex gap-1">
                        <button className="flex h-5 w-6 items-center justify-center rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]">
                          <PlusCircle size={12} />
                        </button>
                        <button className="flex h-5 w-6 items-center justify-center rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]">
                          <MinusCircle size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-x-3 gap-y-2">
                      {formConfig.stoneFields.map(f => (
                        <FieldRow key={f.name} label={f.label} value=""
                          type={f.type} options={f.options}
                          colSpan={f.colSpan === 2 ? 2 : undefined} compact />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Detail Table ─── */}
              <div className="flex items-center justify-between border-b border-[var(--color-border-light)] bg-[var(--color-surface-2)]/50 px-4 py-1.5">
                <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  รายการ ({lines.length})
                </span>
              </div>

              <div className="content-scrollbar flex-1 overflow-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[var(--color-surface-2)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {tableColumns.map(col => (
                        <th key={col.key}
                          className={`whitespace-nowrap border-b border-r border-[var(--color-border-default)] px-3 py-2 ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          }`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12px] text-[var(--color-text-primary)]">
                    {lines.map((line, i) => (
                      <tr key={i}
                        className="border-b border-[var(--color-border-default)]/50 bg-[var(--color-surface-0)] transition-colors hover:bg-[var(--color-surface-2)]/60">
                        {tableColumns.map(col => {
                          const val = getCellValue(line, col.key);
                          const isNum = col.align === 'right';
                          return (
                            <td key={col.key}
                              className={`whitespace-nowrap border-r border-[var(--color-border-default)]/30 px-3 py-1.5 ${
                                isNum ? 'text-right tabular-nums text-[var(--color-brand-400)]' : ''
                              }`}>
                              {isNum && typeof val === 'number' ? val.toFixed(val % 1 ? 4 : 0) : val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={tableColumns.length} className="py-10 text-center text-sm text-[var(--color-text-tertiary)] italic">
                          ไม่มีรายการ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ─── Footer ─── */}
              <div className="flex items-center justify-end gap-6 border-t border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-5 py-2.5">
                <FooterStat label="รายการ" value={String(lines.length)} />
                <FooterStat label="น้ำหนักรวม" value={totalWeight.toFixed(4)} />
                <FooterStat label="จำนวนรวม" value={String(totalQty)} />
                <FooterStat label="มูลค่ารวม" value={totalAmount.toLocaleString('th-TH', {minimumFractionDigits:2})} highlight />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════

function MiniCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  const colors: Record<string, string> = {
    brand: 'var(--color-brand-500)',
    info: 'var(--color-info-500)',
    success: 'var(--color-success-500)',
    accent: 'var(--color-accent-500)',
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-3 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md"
        style={{ background: `color-mix(in oklch, ${colors[accent]} 15%, transparent)`, color: colors[accent] }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{label}</div>
        <div className="truncate text-[13px] font-bold text-[var(--color-text-primary)]" style={{fontFamily:'var(--font-display)'}}>{value || '—'}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, type, readOnly, options, hasSearch, colSpan, compact }:
  { label: string; value: string; type?: string; readOnly?: boolean; options?: string[]; hasSearch?: boolean; colSpan?: number; compact?: boolean }) {
  const cls = colSpan === 2 ? 'col-span-2' : '';
  const h = compact ? 'h-6 text-[11px]' : 'h-7 text-[12px]';
  return (
    <div className={`flex items-center gap-1.5 ${cls}`}>
      <span className={`w-20 shrink-0 text-right ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-[var(--color-text-tertiary)]`}>
        {label}
      </span>
      <div className="relative flex-1">
        {type === 'select' && options ? (
          <select defaultValue={value}
            className={`${h} w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]`}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type === 'date' ? 'text' : type === 'number' ? 'text' : 'text'}
            defaultValue={value} readOnly={readOnly}
            className={`${h} w-full rounded border border-[var(--color-border-strong)] px-2 font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] ${
              readOnly ? 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]' : 'bg-[var(--color-surface-0)]'
            } ${type === 'number' ? 'text-right' : ''}`} />
        )}
        {hasSearch && (
          <button className="absolute right-0.5 top-0.5 flex h-5 w-6 items-center justify-center rounded bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <Search size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

function FooterStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{label}</span>
      <span className={`font-mono text-sm font-bold ${highlight ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-primary)]'}`}
        style={{fontFamily:'var(--font-display)'}}>
        {value}
      </span>
    </div>
  );
}

// ─── Header value getter ──────────────────────
function getHeaderValue(h: ProcDocDetail['header'], name: string): string {
  const map: Record<string, string> = {
    docNumber: h.docNumber, docDate: h.docDate, purchaseDate: h.purchaseDate,
    dueDate: h.dueDate, receiveDate: h.receiveDate,
    supplierCode: h.supplierCode, supplierName: h.supplierName,
    buyer: h.buyer, currency: h.currency,
    totalQty: String(h.totalQty), totalAmount: String(h.totalAmount),
    totalMoney: String(h.totalAmount), totalAmnt: String(h.totalAmount),
    refNumber: h.refNumber, receiptNumber: h.billNumber,
    billNumber: h.billNumber, invoiceNumber: h.invoiceNumber,
    remark: h.remark, exchangeRate: String(h.exchangeRate),
    category: h.category, status: h.status,
    reason: h.remark, deliveryNote: h.refNumber,
    total: String(h.totalQty), supplier: `${h.supplierCode} ${h.supplierName}`,
  };
  return map[name] ?? '';
}
