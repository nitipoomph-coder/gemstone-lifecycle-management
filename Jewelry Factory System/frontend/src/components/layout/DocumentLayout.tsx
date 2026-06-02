import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from './Topbar';
import type { FormConfig, TableColumnDef } from '../../config/formConfigs';
import {
  FilePlus, Save, Edit3, Search, Trash2, CornerUpLeft, Printer, X, FileText,
  Package, TrendingUp, Calendar, DollarSign, Hash, RefreshCw, FileSpreadsheet
} from 'lucide-react';

export interface DocListItem {
  no: string;
  date: string;
  status?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface DocumentLayoutProps {
  docType: string;
  formConfig: FormConfig;
  breadcrumb: BreadcrumbItem[];

  docList: DocListItem[];
  selectedDocNo: string;
  onSelectDoc: (docNo: string) => void;
  onSearchList?: (text: string) => void;
  docDetail: any | null;
  isEditing?: boolean;

  // ✅ Edit draft support
  editDraft?: Record<string, string>;
  onFieldChange?: (name: string, val: string) => void;

  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  onClearError: () => void;

  hasPhoto?: boolean;
  printTemplate?: React.ReactNode;

  onNew?: () => void;
  onSave?: () => void;
  onEdit?: () => void;
  onSearchClick?: () => void;
  onSearchSubmit?: (text: string) => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onFetchRef?: (refNo: string) => void;

  // Pagination & Server-Side Search
  page?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
}

export default function DocumentLayout({
  docType: _docType,
  formConfig,
  breadcrumb,
  docList,
  selectedDocNo,
  onSelectDoc,
  docDetail,
  isEditing = false,
  editDraft = {},
  onFieldChange,
  loading,
  detailLoading,
  error,
  onClearError,
  hasPhoto,
  printTemplate,
  onNew,
  onSave,
  onEdit,
  onSearchClick,
  onSearchSubmit,
  onDelete,
  onCancel,
  onFetchRef,
  page = 1,
  totalPages = 1,
  onPageChange
}: DocumentLayoutProps) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [refInput, setRefInput] = useState('');

  const [showToolbarSearch, setShowToolbarSearch] = useState(false);
  const [toolbarSearchText, setToolbarSearchText] = useState('');

  const [selectedLineIdx, setSelectedLineIdx] = useState<number>(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const [psUrl, setPsUrl] = useState<string>('');
  const [cadUrl, setCadUrl] = useState<string>('');
  const [psLoading, setPsLoading] = useState<boolean>(true);
  const [cadLoading, setCadLoading] = useState<boolean>(true);

  const lines = docDetail?.lines || [];
  const header = docDetail?.header || {};

  const activeItemNo = lines[selectedLineIdx]?.ItemNo;
  const dbPhoto = lines[selectedLineIdx]?.ItemPhoto;

  React.useEffect(() => {
    if (!isPhotoModalOpen || !activeItemNo) {
      setPsUrl('');
      setCadUrl('');
      return;
    }

    setPsLoading(true);
    setCadLoading(true);

    const psTargetUrl = `http://localhost:3001/api/photos/ps/${activeItemNo}`;
    const imgPs = new window.Image();
    imgPs.src = psTargetUrl;
    imgPs.onload = () => { setPsUrl(psTargetUrl); setPsLoading(false); };
    imgPs.onerror = () => {
      if (dbPhoto) {
        const dbSrc = String(dbPhoto).startsWith('data:') ? dbPhoto : `data:image/jpeg;base64,${dbPhoto}`;
        setPsUrl(dbSrc);
      } else {
        setPsUrl('');
      }
      setPsLoading(false);
    };

    const cadTargetUrl = `http://localhost:3001/api/photos/cad/${activeItemNo}`;
    const imgCad = new window.Image();
    imgCad.src = cadTargetUrl;
    imgCad.onload = () => { setCadUrl(cadTargetUrl); setCadLoading(false); };
    imgCad.onerror = () => { setCadUrl(''); setCadLoading(false); };
  }, [isPhotoModalOpen, activeItemNo, dbPhoto]);

  const isServerSide = !!onPageChange;
  const filteredDocs = isServerSide
    ? docList
    : docList.filter(d => d.no.toLowerCase().includes(searchText.toLowerCase()));

  const totalWeight = lines.reduce((s: number, l: any) => s + Number(l.weight || 0), 0);
  const totalQty = lines.reduce((s: number, l: any) => s + Number(l.qty || l.ItemQty || l.GoodQty || 0), 0);
  const totalAmount = lines.reduce((s: number, l: any) => s + Number(l.amount || l.total || 0), 0);

  const tableColumns: TableColumnDef[] = formConfig?.tableColumns || [];

  const getCellValue = (line: any, key: string, idx: number): string | number => {
    if (key === 'seq') return idx + 1;
    const colDef = formConfig?.tableColumns?.find(c => c.key === key);
    const label = colDef?.label || '';
    const isHeightLabel = label.includes('สูง') || label.includes('สุง');
    const val = line[key] ??
      (key === 'stone' || key === 'stoneName' ? (line.stoneName || line.stoneCode || line.ItemStone || line.GoodCode) :
        key === 'color' ? (line.color || line.GoodColorCode) :
          key === 'shape' ? (line.shape || line.GoodShapeCode) :
            key === 'size' ? (line.size || line.GoodSizeCode) :
              key === 'char' || key === 'characteristic' ? (line.characteristic || line.specName || line.GoodSpecCode) :
                key === 'grade' ? (isHeightLabel ? (line.GoodThick || line.grade || line.GoodGradeCode) : (line.grade || line.GoodGradeCode)) :
                  key === 'gradeAmm' ? (line.gradeAmm || line.GoodThick) :
                    key === 'height' ? (line.height || line.GoodThick) :
                      key === 'warehouse' ? (line.warehouse || line.InveCode) :
                        key === 'dollarCt' || key === 'dollarPerCt' ? (line.dollarCt || line.ctPerPc || line.GoodExchPrice || line.GoodPriceEx) :
                          key === 'weight' ? (line.weight || line.GoodWeight) :
                            key === 'qty' ? (line.qty || line.ItemQty || line.GoodQty) :
                              key === 'use' || key === 'useStone' ? (line.useStone || line.GoodQty || line.ItemQty) :
                                key === 'order' || key === 'orderNumber' ? (line.orderNumber || line.OrdNo || line.OrderNo) :
                                  key === 'item' ? (line.OrdLineNo || line.OrderLineNo) :
                                    key === 'group' ? (line.OrderGroup) :
                                      key === 'jobNo' || key === 'jobNumber' ? (line.jobNumber || line.ItemNo) :
                                        key === 'type' ? (line.GoodSetType) :
                                          key === 'unit' ? (line.unit || line.GoodUnitCode) :
                                            key === 'total' || key === 'subTotal' || key === 'amount' ? (line.total || line.amount || line.GoodAmnt || line.GoodExchAmnt || line.GoodAmntEx) :
                                              key === 'price' ? (line.price || line.GoodPrice) :
                                                key === 'department' ? (line.department || line.DeptCode) :
                                                  key === 'reason' ? (line.reason || line.ResCode || line.GoodRemark) :
                                                    key === 'refNo' ? (line.refNo || line.RefNo) :
                                                      key === 'detail' ? (line.detail || line.ItemDesc) :
                                                        key === 'note' ? (line.note || line.GoodRemark) :
                                                          line[key]);
    return (val === null || val === undefined || val === '') ? '-' : val;
  };

  const getHeaderValue = (h: any, name: string): string => {
    const map: Record<string, string> = {
      docNumber: h.docNumber || h.DocuNo,
      docDate: h.docDate || (h.DocuDate ? new Date(h.DocuDate).toLocaleDateString('th-TH') : ''),
      purchaseDate: h.purchaseDate,
      dueDate: h.dueDate || (h.DueDate ? new Date(h.DueDate).toLocaleDateString('th-TH') : ''),
      receiveDate: h.receiveDate,
      supplierCode: h.supplierCode || h.CustCode || h.VendorCode || '',
      supplierName: h.supplierName || h.CustName || '',
      buyer: h.buyer,
      currency: h.currency || h.CurrCode || 'THB',
      exchangeRate: String(h.exchangeRate || h.ExchRate || 1),
      totalQty: String(h.totalQty || h.SumGoodQty || h.SumOrdQty || 0),
      totalAmount: String(h.totalAmount || h.TotalAmnt || h.SumGoodQty || 0),
      totalMoney: String(h.totalMoney || h.SumGoodAmnt || h.TotalAmnt || 0),
      total: String(h.total || h.SumGoodQty || h.SumGoodAmnt || 0),
      refNumber: h.refNumber || h.RefNo || h.RefDocuNo || '',
      receiptNumber: h.billNumber,
      orderNumber: h.orderNumber || h.OrdNo || h.OrderNo || '',
      orderDate: h.orderDate || (h.OrdDate || h.OrderDate ? new Date(h.OrdDate || h.OrderDate).toLocaleDateString('th-TH') : ''),
      poNumber: h.poNumber || h.PONo || '',
      itemCount: String(lines.length),
      jobNumber: h.jobNumber || h.JobNo || '',
      qty: String(h.qty || h.SumGoodQty || h.SumOrdQty || 0),
      reason: h.reason || h.ResCode || h.SenRemark || '',
      note: h.note || h.SenRemark || '',
      department: h.department || h.DeptCode || '',
      status: (h.status === 'N' || h.DocuStatus === 'N') ? 'ปกติ' :
        (h.status === 'C' || h.DocuStatus === 'C') ? 'ยกเลิก' :
          (h.status === 'A' || h.DocuStatus === 'A') ? 'อนุมัติ' :
            (h.status || h.DocuStatus || h.SenStatus || ''),
    };
    const finalVal = map[name] ?? h[name];
    return (finalVal === null || finalVal === undefined || finalVal === '') ? '-' : finalVal;
  };

  const isEditingRef = !selectedDocNo;

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface-0)] relative font-body text-[var(--color-text-primary)]">
      <div className="screen-only flex h-full flex-col overflow-hidden">
        <Topbar breadcrumb={breadcrumb} />

        {/* Toolbar */}
        <div className="flex h-14 items-center gap-1 border-b border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-4 shrink-0 overflow-x-auto shadow-sm z-10">
          <button onClick={onNew} className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-900)] text-white px-3 py-1.5 text-[13px] font-bold transition-all hover:bg-[var(--color-surface-800)] shadow-md shadow-black/10">
            <FilePlus size={15} /> <span className="hidden md:inline">สร้างใหม่</span>
          </button>
          <button onClick={onSave} disabled={detailLoading || !docDetail || (!isEditing && !!selectedDocNo)} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-1)] disabled:opacity-50 text-[var(--color-text-secondary)] bg-[var(--color-surface-0)] ml-2">
            <Save size={15} /> <span className="hidden md:inline">บันทึก</span>
          </button>
          <button onClick={onEdit} disabled={!docDetail || isEditing} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-1)] disabled:opacity-50 text-[var(--color-text-secondary)] bg-[var(--color-surface-0)]">
            <Edit3 size={15} /> <span className="hidden md:inline">แก้ไข</span>
          </button>

          <span className="mx-2 h-6 w-px bg-[var(--color-border-light)]" />

          {showToolbarSearch ? (
            <div className="flex items-center bg-[var(--color-surface-1)] border border-[var(--color-brand-500)] rounded-lg px-2 py-1.5 ml-1 mr-1 transition-all focus-within:ring-2 focus-within:ring-[var(--color-brand-500)]/20 shadow-inner">
              <Search size={13} className="text-[var(--color-brand-500)] mr-1.5" />
              <input
                type="text"
                autoFocus
                placeholder="ระบุเลขที่เอกสาร..."
                value={toolbarSearchText}
                onChange={e => setToolbarSearchText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (onSearchSubmit) onSearchSubmit(toolbarSearchText);
                    setShowToolbarSearch(false);
                    setToolbarSearchText('');
                  } else if (e.key === 'Escape') {
                    setShowToolbarSearch(false);
                  }
                }}
                onBlur={() => setShowToolbarSearch(false)}
                className="bg-transparent border-none outline-none text-[12px] w-48 text-[var(--color-text-primary)] font-medium"
              />
            </div>
          ) : (
            <button onClick={() => {
              if (onSearchSubmit) {
                setShowToolbarSearch(true);
              } else if (onSearchClick) {
                onSearchClick();
              }
            }} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] bg-[var(--color-surface-0)]">
              <Search size={15} /> <span className="hidden md:inline">ค้นหา</span>
            </button>
          )}

          <button onClick={onDelete} disabled={!docDetail} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-danger-200)] px-3 py-1.5 text-[13px] font-medium transition-colors text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)] bg-[var(--color-surface-0)] disabled:opacity-50 ml-1">
            <Trash2 size={15} /> <span className="hidden md:inline">ลบ</span>
          </button>
          <button onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] bg-[var(--color-surface-0)]">
            <CornerUpLeft size={15} /> <span className="hidden md:inline">ยกเลิก</span>
          </button>

          <div className="flex-1"></div>

          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] bg-[var(--color-surface-0)]">
            <Printer size={15} /> <span className="hidden md:inline">พิมพ์</span>
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-[#107C41]/30 px-3 py-1.5 text-[13px] font-medium transition-colors text-[#107C41] hover:bg-[#107C41]/5 bg-[var(--color-surface-0)]">
            <FileSpreadsheet size={15} /> <span className="hidden md:inline">Excel</span>
          </button>

          <span className="mx-2 h-6 w-px bg-[var(--color-border-light)]" />

          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] bg-[var(--color-surface-0)]">
            <X size={15} /> <span className="hidden md:inline">ปิด</span>
          </button>

          <div className="flex flex-col text-right ml-2 mr-2">
            <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">{docList.length} เอกสาร</span>
            {isServerSide && totalPages > 1 && (
              <span className="text-[10px] text-[var(--color-text-tertiary)]">{page} / {totalPages}</span>
            )}
          </div>
        </div>

        {/* TOP Document List (Horizontal) */}
        <div className="flex items-center bg-[var(--color-surface-0)] border-b border-[var(--color-border-light)] overflow-x-auto h-[64px] shrink-0 px-2 gap-2 content-scrollbar-x shadow-[inset_0_-2px_4px_rgba(0,0,0,0.02)]">
          {loading ? (
            <div className="flex items-center justify-center w-full text-[var(--color-text-tertiary)] text-xs gap-2">
              <RefreshCw size={14} className="animate-spin" /> โหลดข้อมูล...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex items-center justify-center w-full text-[var(--color-text-tertiary)] text-xs">
              ไม่พบเอกสาร
            </div>
          ) : (
            <>
              {isServerSide && page > 1 && (
                <button onClick={() => onPageChange!(page - 1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-1)] transition-colors">
                  <CornerUpLeft size={16} className="rotate-[-90deg]" />
                </button>
              )}
              {filteredDocs.map(d => {
                const isActive = d.no === selectedDocNo;
                return (
                  <button key={d.no}
                    onClick={() => onSelectDoc(d.no)}
                    className={`shrink-0 flex flex-col justify-center h-[46px] min-w-[140px] px-4 rounded-xl border transition-all ${isActive ? 'border-[var(--color-surface-900)] bg-[var(--color-surface-900)]/5 shadow-sm relative' : 'border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-1)] hover:border-[var(--color-border-light)]'}`}>
                    {isActive && <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-6 h-1 rounded-b-full bg-[var(--color-surface-900)]"></div>}
                    <span className={`text-[13px] font-mono font-black ${isActive ? 'text-[var(--color-surface-900)]' : 'text-[var(--color-text-primary)]'}`}>
                      {d.no}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] opacity-80">
                      {d.date}
                    </span>
                  </button>
                );
              })}
              {isServerSide && page < totalPages && (
                <button onClick={() => onPageChange!(page + 1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-1)] transition-colors">
                  <CornerUpLeft size={16} className="rotate-[90deg]" />
                </button>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="bg-[var(--color-danger-50)] border-l-4 border-[var(--color-danger-500)] text-[var(--color-danger-700)] p-3 mx-4 mt-4 rounded shadow-sm text-sm font-semibold flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button onClick={onClearError}><X size={16} /></button>
          </div>
        )}

        {/* MAIN Split View */}
        <div className="flex flex-1 overflow-hidden bg-[var(--color-surface-2)]">
          {/* Left Dark Sidebar (Active Doc Summary) */}
          <div className="w-[280px] shrink-0 bg-[var(--color-surface-900)] text-white flex flex-col overflow-y-auto z-10 shadow-2xl relative border-r border-[var(--color-surface-900)]">
            {!docDetail && !isEditingRef ? (
              <div className="p-8 flex flex-col items-center justify-center h-full text-white/40 text-center">
                <Package size={48} className="mb-4 opacity-50" />
                <p className="text-sm font-medium">กรุณาเลือกเอกสารจากรายการด้านบน</p>
              </div>
            ) : (
              <>
                {/* Header Section */}
                <div className="p-6 flex flex-col border-b border-white/10 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 text-white/5">
                    <Package size={120} strokeWidth={1} />
                  </div>

                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-brand-400)] mb-1 z-10">
                    {formConfig?.titleTh || _docType}
                  </span>
                  <span className="text-2xl font-mono font-black text-white leading-none z-10 tracking-tight">
                    {getHeaderValue(header, 'docNumber') || selectedDocNo || 'NEW'}
                  </span>
                  <span className="text-[11px] font-medium text-white/60 mt-2 z-10 flex items-center gap-1.5">
                    <Calendar size={12} /> {getHeaderValue(header, 'docDate')}
                  </span>

                  <div className="mt-5 inline-flex items-center gap-2 bg-[#2ecc71]/10 text-[#2ecc71] px-3 py-1.5 rounded-full self-start border border-[#2ecc71]/20 z-10 shadow-lg shadow-[#2ecc71]/5 backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2ecc71] shadow-[0_0_8px_#2ecc71]"></div>
                    <span className="text-[10px] font-black tracking-widest uppercase">
                      {header.status === 'C' ? 'Canceled' : header.status === 'A' ? 'Approved' : 'Normal'}
                    </span>
                  </div>
                </div>

                {/* Metrics Section */}
                <div className="p-6 flex flex-col gap-6 flex-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">มูลค่ารวม - Total Value</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[28px] font-black text-[#f1c40f] font-mono tracking-tight drop-shadow-md">
                        {Number(getHeaderValue(header, 'totalAmount') || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-white/50">{getHeaderValue(header, 'currency') || 'Thai Baht (THB)'}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">จำนวนรวม - Quantity</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white font-mono tracking-tight">
                        {Number(getHeaderValue(header, 'totalQty') || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-white/50">กิโลกรัม (KG)</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">น้ำหนักสุทธิ - Net Weight</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white font-mono tracking-tight">
                        {totalWeight.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-white/50">KG per unit</span>
                  </div>

                  {/* GEM INFO BOX */}
                  {lines[selectedLineIdx] && (
                    <div className="mt-auto flex flex-col pt-6 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest mb-3">ข้อมูลพลอย - GEM</span>
                      <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col gap-3 shadow-inner">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white leading-tight">
                            {lines[selectedLineIdx]?.stoneName || lines[selectedLineIdx]?.GoodCode || lines[selectedLineIdx]?.ItemNo}
                          </span>
                          {(lines[selectedLineIdx]?.shapeName || lines[selectedLineIdx]?.specName) && (
                            <span className="text-[11px] font-bold text-white/70 mt-1">
                              {lines[selectedLineIdx]?.specName || ''} {lines[selectedLineIdx]?.shapeName || ''}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {lines[selectedLineIdx]?.GoodColorCode && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f1c40f]/20 text-[#f1c40f] border border-[#f1c40f]/20">{lines[selectedLineIdx].GoodColorCode}</span>}
                          {lines[selectedLineIdx]?.GoodShapeCode && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/10">{lines[selectedLineIdx].GoodShapeCode} Shape</span>}
                          {lines[selectedLineIdx]?.GoodSizeCode && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/80 border border-white/10">Size {lines[selectedLineIdx].GoodSizeCode}</span>}
                          {lines[selectedLineIdx]?.GoodGradeCode && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e67e22]/20 text-[#e67e22] border border-[#e67e22]/20">Grade {lines[selectedLineIdx].GoodGradeCode}</span>}
                          {lines[selectedLineIdx]?.InveCode && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/80 border border-white/10 tracking-wider">{lines[selectedLineIdx].InveCode}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TIMELINE */}
                <div className="p-6 border-t border-white/10 flex flex-col gap-3 bg-black/20">
                  <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Timeline</span>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2ecc71] shadow-[0_0_10px_#2ecc71]"></div>
                      <div className="w-px flex-1 bg-white/20 my-1"></div>
                    </div>
                    <div className="flex flex-col pb-2">
                      <span className="text-xs font-bold text-white tracking-wide">สร้างเอกสาร</span>
                      <span className="text-[11px] font-medium text-white/50 mt-0.5 font-mono">{getHeaderValue(header, 'docDate')} - 12:00</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Main Form Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative content-scrollbar bg-[var(--color-surface-2)] flex justify-center">
            {detailLoading && (
              <div className="absolute inset-0 bg-[var(--color-surface-2)]/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-[var(--color-surface-0)] p-5 rounded-2xl shadow-xl flex items-center gap-4 border border-[var(--color-border-light)]">
                  <RefreshCw size={24} className="animate-spin text-[var(--color-brand-500)]" />
                  <span className="text-sm font-bold text-[var(--color-text-primary)] tracking-wide">กำลังโหลดข้อมูล...</span>
                </div>
              </div>
            )}

            {!docDetail && !isEditingRef ? (
              <div className="flex items-center justify-center h-full w-full max-w-5xl">
                {/* Empty state handled in left sidebar */}
              </div>
            ) : (
              <div className="w-full max-w-5xl flex flex-col gap-6 pb-20">

                {/* Section 01: Header */}
                <div className="bg-[var(--color-surface-0)] rounded-2xl shadow-sm border border-[var(--color-border-light)] overflow-visible">
                  <div className="border-b border-[var(--color-border-light)] px-6 py-4 flex items-center gap-4 bg-[var(--color-surface-0)] rounded-t-2xl">
                    <div className="bg-[var(--color-surface-900)] text-white text-xs font-black w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">01</div>
                    <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-wide">ข้อมูลเอกสาร <span className="text-[var(--color-text-tertiary)] font-medium text-sm ml-2">Order Information</span></h2>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    {formConfig?.headerFields.map(f => {
                      const dbVal = getHeaderValue(header, f.name);
                      const val = (isEditing && !f.readOnly && editDraft[f.name] !== undefined) ? editDraft[f.name] : dbVal;

                      return (
                        <div key={f.name} className={`flex flex-col gap-2 relative ${f.colSpan ?\`col-span-\${f.colSpan}\` : ''}`}>
                    <label className="text-[12px] font-bold text-[var(--color-text-tertiary)] uppercase flex items-center gap-1 z-10 bg-[var(--color-surface-0)] px-1 absolute -top-2.5 left-2">
                      {f.label} {(!f.readOnly || f.name === 'docNumber') && <span className="text-[var(--color-danger-500)]">*</span>}
                    </label>
                    {f.type === 'select' && f.options ? (
                      <select
                        value={String(val)}
                        disabled={f.readOnly || !isEditing}
                        onChange={e => onFieldChange?.(f.name, e.target.value)}
                        className="h-[46px] w-full rounded-xl border border-[var(--color-border-default)] bg-transparent px-3 text-[14px] font-bold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 disabled:bg-[var(--color-surface-1)] disabled:text-[var(--color-text-secondary)] transition-all pt-1"
                      >
                        <option value="">{val !== '' ? val : '-- เลือก --'}</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={val}
                        readOnly={f.readOnly || !isEditing}
                        onChange={e => onFieldChange?.(f.name, e.target.value)}
                        className={`h-[46px] w-full rounded-xl border border-[var(--color-border-default)] bg-transparent px-3 text-[14px] font-bold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 read-only:bg-[var(--color-surface-1)]/50 read-only:text-[var(--color-text-secondary)] transition-all pt-1 ${(f.name === 'docNumber' || f.name === 'totalAmount') ? 'font-mono text-[15px]' : ''} ${f.type === 'number' ? 'text-right' : ''}`}
                      />
                    )}
                  </div>
                  );
                     })}
                </div>
              </div>

                 {/* Section 02: Stone Info */}
            {!hasPhoto && formConfig?.stoneFields && lines.length > 0 && (
              <div className="bg-[var(--color-surface-0)] rounded-2xl shadow-sm border border-[var(--color-border-light)] overflow-visible">
                <div className="border-b border-[var(--color-border-light)] px-6 py-4 flex items-center gap-4 bg-[var(--color-surface-0)] rounded-t-2xl">
                  <div className="bg-[var(--color-surface-900)] text-white text-xs font-black w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">02</div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-wide">ข้อมูลพลอย <span className="text-[var(--color-text-tertiary)] font-medium text-sm ml-2">Gemstone Specification</span></h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-6">
                  {formConfig.stoneFields.map(f => {
                    const val = getCellValue(lines[selectedLineIdx] || {}, f.name, selectedLineIdx);
                    return (
                      <div key={f.name} className={`flex flex-col gap-2 relative ${f.name === 'stoneName' ? 'col-span-2' : ''}`}>
                        <label className="text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase flex items-center gap-1 z-10 bg-[var(--color-surface-0)] px-1 absolute -top-2.5 left-2">{f.label}</label>
                        <input
                          type="text"
                          value={val}
                          readOnly
                          className="h-[42px] w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-1)]/30 px-3 text-[13px] font-bold text-[var(--color-text-secondary)] outline-none transition-all pt-1"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 03: Notes */}
            {!hasPhoto && (
              <div className="bg-[var(--color-surface-0)] rounded-2xl shadow-sm border border-[var(--color-border-light)] overflow-visible">
                <div className="border-b border-[var(--color-border-light)] px-6 py-4 flex items-center gap-4 bg-[var(--color-surface-0)] rounded-t-2xl">
                  <div className="bg-[var(--color-surface-900)] text-white text-xs font-black w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">03</div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-wide">หมายเหตุ <span className="text-[var(--color-text-tertiary)] font-medium text-sm ml-2">Notes & Remarks</span></h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-col gap-2 relative">
                    <label className="text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase flex items-center gap-1 z-10 bg-[var(--color-surface-0)] px-1 absolute -top-2.5 left-2">หมายเหตุ 1</label>
                    <textarea
                      value={(isEditing && editDraft['note'] !== undefined) ? editDraft['note'] : getHeaderValue(header, 'note')}
                      readOnly={!isEditing}
                      onChange={e => onFieldChange?.('note', e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-[var(--color-border-default)] bg-transparent p-4 text-[14px] font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 read-only:bg-[var(--color-surface-1)]/50 read-only:text-[var(--color-text-secondary)] transition-all resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* Section 04: Detail Table */}
            <div className="bg-[var(--color-surface-0)] rounded-2xl shadow-sm border border-[var(--color-border-light)] overflow-hidden flex flex-col">
              <div className="border-b border-[var(--color-border-light)] px-6 py-4 flex items-center justify-between bg-[var(--color-surface-0)] rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="bg-[var(--color-surface-900)] text-white text-xs font-black w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">04</div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-wide">รายการสั่งซื้อ <span className="text-[var(--color-text-tertiary)] font-medium text-sm ml-2">Line Items • {lines.length} รายการ</span></h2>
                </div>
                {!isEditing && (
                  <button className="px-4 py-2 rounded-xl border border-[var(--color-border-default)] text-[13px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-1)] transition-colors flex items-center gap-1.5 shadow-sm">
                    + เพิ่มรายการ
                  </button>
                )}
              </div>

              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="bg-[var(--color-surface-1)]/50">
                    <tr>
                      {tableColumns.map((col, idx) => (
                        <th key={col.key} className={`whitespace-nowrap border-b border-[var(--color-border-default)] px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[var(--color-text-tertiary)] ${col.align === 'right' ? 'text-right' : 'text-center'} ${idx === 0 ? 'rounded-tl-lg' : ''} ${idx === tableColumns.length - 1 ? 'rounded-tr-lg' : ''}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[13px] font-medium">
                    {lines.map((line: any, i: number) => {
                      const isSelected = selectedLineIdx === i;
                      return (
                        <tr key={i}
                          onClick={() => setSelectedLineIdx(i)}
                          className={`border-b border-[var(--color-border-default)]/30 transition-colors cursor-pointer ${isSelected ? 'bg-[var(--color-brand-50)]' : 'bg-transparent hover:bg-[var(--color-surface-1)]/50'}`}>
                          {tableColumns.map(col => {
                            const val = getCellValue(line, col.key, i);
                            const isNum = col.align === 'right';
                            return (
                              <td key={col.key} className={`whitespace-nowrap px-4 py-3.5 ${isNum ? 'text-right font-mono font-bold text-[var(--color-text-primary)]' : 'text-center text-[var(--color-text-secondary)]'} ${isSelected && col.key === 'stoneName' ? 'text-[var(--color-brand-600)] font-bold' : ''}`}>
                                {isNum && typeof val === 'number' ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={tableColumns.length} className="py-16 text-center text-sm font-medium text-[var(--color-text-tertiary)] bg-[var(--color-surface-1)]/30 rounded-b-lg">
                          ไม่มีรายการสินค้า
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
            )}
        </div>
      </div>
    </div>

      {/* Photo Modal */ }
  {
    isPhotoModalOpen && activeItemNo && (
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300"
        onClick={() => setIsPhotoModalOpen(false)}
      >
        <div
          className="relative max-w-[96vw] max-h-[95vh] w-full md:max-w-[1200px] bg-[var(--color-surface-0)] p-5 rounded-2xl border border-[var(--color-border-light)] shadow-2xl flex flex-col items-center overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-full flex items-center justify-between border-b border-[var(--color-border-light)] pb-2 mb-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-tertiary)]">เปรียบเทียบรูปชิ้นงานและแบบต้นแบบ (PS vs CAD)</span>
              <span className="text-base font-black text-[var(--color-text-primary)] font-mono">{activeItemNo}</span>
            </div>
            <button
              onClick={() => setIsPhotoModalOpen(false)}
              className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-500)] hover:text-white transition-all shadow-sm">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[350px] md:min-h-[500px] lg:min-h-[600px] overflow-hidden">
            <div className="flex flex-col border border-[var(--color-border-light)] rounded-xl bg-[var(--color-surface-1)] overflow-hidden">
              <div className="bg-[var(--color-surface-2)] px-3 py-1.5 border-b border-[var(--color-border-light)] font-bold text-[11px] text-[var(--color-text-primary)] flex justify-between items-center">
                <span>PS (รูปถ่ายชิ้นงานจริง)</span>
                <span className="text-[9px] font-black uppercase bg-[var(--color-success-500)]/10 text-[var(--color-success-600)] border border-[var(--color-success-500)]/20 px-2 py-0.5 rounded">REAL PHOTO</span>
              </div>
              <div className="flex-1 p-3 flex items-center justify-center overflow-hidden min-h-[250px] bg-[var(--color-surface-2)]/30">
                {psLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                    <RefreshCw size={14} className="animate-spin" /> โหลดรูป PS...
                  </div>
                ) : psUrl ? (
                  <img src={psUrl} alt="PS Item" className="max-w-full max-h-[62vh] object-contain rounded drop-shadow-md select-none" />
                ) : (
                  <div className="text-[var(--color-text-tertiary)] text-[10px] flex flex-col items-center gap-2">
                    <div className="w-20 h-20 border-2 border-dashed border-[var(--color-border-light)] rounded-xl flex items-center justify-center bg-[var(--color-surface-1)]">
                      <span className="opacity-50 font-bold">NO PS</span>
                    </div>
                    <span>ไม่พบรูปชิ้นงานจริง</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col border border-[var(--color-border-light)] rounded-xl bg-[var(--color-surface-1)] overflow-hidden">
              <div className="bg-[var(--color-surface-2)] px-3 py-1.5 border-b border-[var(--color-border-light)] font-bold text-[11px] text-[var(--color-text-primary)] flex justify-between items-center">
                <span>CAD (แบบดีไซน์ 3D / แม่พิมพ์)</span>
                <span className="text-[9px] font-black uppercase bg-[var(--color-brand-500)]/10 text-[var(--color-brand-600)] border border-[var(--color-brand-500)]/20 px-2 py-0.5 rounded">3D BLUEPRINT</span>
              </div>
              <div className="flex-1 p-3 flex items-center justify-center overflow-hidden min-h-[250px] bg-[var(--color-surface-2)]/30">
                {cadLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                    <RefreshCw size={14} className="animate-spin" /> โหลดแบบ CAD...
                  </div>
                ) : cadUrl ? (
                  <img src={cadUrl} alt="CAD Item" className="max-w-full max-h-[62vh] object-contain rounded drop-shadow-md select-none" />
                ) : (
                  <div className="text-[var(--color-text-tertiary)] text-[10px] flex flex-col items-center gap-2">
                    <div className="w-20 h-20 border-2 border-dashed border-[var(--color-border-light)] rounded-xl flex items-center justify-center bg-[var(--color-surface-1)]">
                      <span className="opacity-50 font-bold">NO CAD</span>
                    </div>
                    <span>ไม่พบแบบดีไซน์ CAD (Mold)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full mt-3 pt-2 border-t border-[var(--color-border-light)] flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>เบอร์งาน: <strong className="font-mono text-[var(--color-text-primary)] font-extrabold">{activeItemNo}</strong></span>
            <span>พลอย: <strong className="text-[var(--color-brand-600)] font-extrabold">{lines[selectedLineIdx]?.GoodCode || '—'}</strong></span>
            <span>จำนวนใช้พลอย: <strong className="text-[var(--color-danger-600)] font-extrabold">{lines[selectedLineIdx]?.GoodQty || lines[selectedLineIdx]?.ItemQty || 0}</strong></span>
          </div>
        </div>
      </div>
    )
  }

  { printTemplate }
    </div >
  );
}

// ═══════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════

export function MiniCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  const colors: Record<string, string> = {
    brand: 'var(--color-brand-500)',
    info: 'var(--color-info-500)',
    success: 'var(--color-success-500)',
    accent: 'var(--color-accent-500)',
    danger: 'var(--color-danger-500)',
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-3 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md"
        style={{ background: `color-mix(in oklch, ${colors[accent]} 15%, transparent)`, color: colors[accent] }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{label}</div>
        <div className="truncate text-[13px] font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>{value || '—'}</div>
      </div>
    </div>
  );
}
