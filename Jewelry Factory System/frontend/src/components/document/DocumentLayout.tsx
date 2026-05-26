import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../layout/Topbar';
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

  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  onClearError: () => void;

  hasPhoto?: boolean;
  printTemplate?: React.ReactNode;

  onNew?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onFetchRef?: (refNo: string) => void;
}

export default function DocumentLayout({
  docType,
  formConfig,
  breadcrumb,
  docList,
  selectedDocNo,
  onSelectDoc,
  docDetail,
  loading,
  detailLoading,
  error,
  onClearError,
  hasPhoto,
  printTemplate,
  onNew,
  onSave,
  onCancel,
  onFetchRef
}: DocumentLayoutProps) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [refInput, setRefInput] = useState('');
  
  const [selectedLineIdx, setSelectedLineIdx] = useState<number>(0);

  const filteredDocs = docList.filter(d =>
    d.no.toLowerCase().includes(searchText.toLowerCase())
  );

  const lines = docDetail?.lines || [];
  const header = docDetail?.header || {};

  const totalWeight = lines.reduce((s: number, l: any) => s + Number(l.weight || 0), 0);
  const totalQty = lines.reduce((s: number, l: any) => s + Number(l.qty || l.ItemQty || l.GoodQty || 0), 0);
  const totalAmount = lines.reduce((s: number, l: any) => s + Number(l.amount || l.total || 0), 0);

  const tableColumns: TableColumnDef[] = formConfig?.tableColumns || [];

  const getCellValue = (line: any, key: string, idx: number): string | number => {
    if (key === 'seq') return idx + 1;
    
    const val = line[key] ?? 
      (key === 'stone' ? (line.stoneName || line.stoneCode || line.ItemStone || line.GoodCode) :
       key === 'color' ? (line.color || line.GoodColorCode) :
       key === 'shape' ? (line.shape || line.GoodShapeCode) :
       key === 'size' ? (line.size || line.GoodSizeCode) :
       key === 'char' ? (line.characteristic || line.GoodSpecCode) :
       key === 'grade' ? (line.grade || line.GoodGradeCode) :
       key === 'qty' ? (line.qty || line.ItemQty || line.GoodQty) :
       key === 'order' ? (line.orderNumber || line.OrdNo || line.OrderNo) :
       key === 'item' ? (line.OrdLineNo || line.OrderLineNo) :
       key === 'group' ? (line.OrderGroup) :
       key === 'jobNo' ? (line.jobNumber || line.ItemNo) :
       key === 'type' ? (line.GoodSetType) :
       key === 'use' ? (line.useStone || line.GoodQty || line.ItemQty) :
       line[key]);
    return val ?? '';
  };

  const getHeaderValue = (h: any, name: string): string => {
    const map: Record<string, string> = {
      docNumber: h.docNumber || h.DocuNo,
      docDate: h.docDate || (h.DocuDate ? new Date(h.DocuDate).toLocaleDateString('th-TH') : ''),
      purchaseDate: h.purchaseDate,
      dueDate: h.dueDate || (h.DueDate ? new Date(h.DueDate).toLocaleDateString('th-TH') : ''),
      receiveDate: h.receiveDate,
      supplierCode: h.supplierCode || h.CustCode,
      supplierName: h.supplierName || h.CustName,
      buyer: h.buyer,
      currency: h.currency,
      totalQty: String(h.totalQty || h.SumOrdQty || 0),
      totalAmount: String(h.totalAmount || h.TotalAmnt || 0),
      totalMoney: String(h.totalAmount || h.TotalAmnt || 0),
      refNumber: h.refNumber || h.RefNo,
      receiptNumber: h.billNumber,
      orderNumber: h.orderNumber || h.OrdNo || h.OrderNo,
      orderDate: h.orderDate || (h.OrdDate || h.OrderDate ? new Date(h.OrdDate || h.OrderDate).toLocaleDateString('th-TH') : ''),
      poNumber: h.poNumber || h.PONo,
      itemCount: String(lines.length),
      jobNumber: h.jobNumber || h.JobNo,
      qty: String(h.qty || h.SumOrdQty || 0),
      status: h.status === 'N' ? 'ปกติ' : h.status === 'C' ? 'ยกเลิก' : h.status === 'A' ? 'อนุมัติ' : (h.status || ''),
    };
    return map[name] ?? (h[name] || '');
  };

  const isEditingRef = !selectedDocNo;

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface-0)] relative">
      <div className="screen-only flex h-full flex-col overflow-hidden">
        <Topbar breadcrumb={breadcrumb} />

        {/* Toolbar */}
        <div className="flex h-11 items-center gap-1 border-b border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-4 shrink-0 overflow-x-auto">
          <button onClick={onNew} className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors text-[var(--color-accent-500)] hover:bg-[var(--color-surface-2)]">
            <FilePlus size={15} /> <span className="hidden md:inline">สร้างใหม่</span>
          </button>
          <button onClick={onSave} disabled={detailLoading || !docDetail} className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-2)] disabled:opacity-50">
            <Save size={15} /> <span className="hidden md:inline">บันทึก</span>
          </button>
          <button className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors text-[var(--color-success-500)] hover:bg-[var(--color-surface-2)]">
            <Edit3 size={15} /> <span className="hidden md:inline">แก้ไข</span>
          </button>
          <button className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors text-[var(--color-accent-500)] hover:bg-[var(--color-surface-2)]">
            <Search size={15} /> <span className="hidden md:inline">ค้นหา</span>
          </button>
          
          <span className="mx-1 h-5 w-px bg-[var(--color-border-default)]" />
          
          <button className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors text-[var(--color-danger-500)] hover:bg-[var(--color-danger-500)]/10">
            <Trash2 size={15} /> <span className="hidden md:inline">ลบ</span>
          </button>
          <button onClick={onCancel} className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-2)]">
            <CornerUpLeft size={15} /> <span className="hidden md:inline">ยกเลิก</span>
          </button>
          
          <span className="mx-1 h-5 w-px bg-[var(--color-border-default)]" />
          
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-2)]">
            <Printer size={15} /> <span className="hidden md:inline">พิมพ์</span>
          </button>
          <button className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors text-[#107C41] hover:bg-[#107C41]/10">
            <FileSpreadsheet size={15} /> <span className="hidden md:inline">Excel</span>
          </button>
          
          <span className="mx-1 h-5 w-px bg-[var(--color-border-default)]" />

          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-2)]">
            <X size={15} /> <span className="hidden md:inline">ปิด</span>
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] shrink-0">
            <FileText size={13} />
            <span>{docList.length} เอกสาร</span>
          </div>
        </div>

        {error && (
          <div className="bg-[var(--color-danger-50)] border-l-4 border-[var(--color-danger-500)] text-[var(--color-danger-700)] p-3 mx-4 mt-4 rounded shadow-sm text-sm font-semibold flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button onClick={onClearError}><X size={16}/></button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden gap-0 mt-2">
          
          {/* Left: Document List */}
          <div className="flex w-64 shrink-0 flex-col border border-[var(--color-border-light)] bg-[var(--color-surface-1)] rounded-tr-xl shadow-sm ml-4 mb-4">
            <div className="border-b border-[var(--color-border-light)] p-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input type="text" placeholder="ค้นหาเลขที่..."
                  value={searchText} onChange={e => setSearchText(e.target.value)}
                  className="w-full bg-[var(--color-surface-0)] border border-[var(--color-border-light)] rounded pl-8 pr-2 py-1.5 text-[12px] outline-none focus:border-[var(--color-brand-500)] transition-colors text-[var(--color-text-primary)]" />
              </div>
            </div>

            <div className="content-scrollbar flex-1 overflow-y-auto bg-[var(--color-surface-0)]">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-[var(--color-text-tertiary)] text-xs gap-2">
                  <RefreshCw size={14} className="animate-spin" /> โหลดข้อมูล...
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--color-text-tertiary)]">ไม่พบเอกสาร</div>
              ) : (
                filteredDocs.map(d => (
                  <button key={d.no}
                    onClick={() => onSelectDoc(d.no)}
                    className={`w-full border-b border-[var(--color-border-default)]/40 px-4 py-2.5 text-left transition-colors flex justify-between items-center ${
                      d.no === selectedDocNo
                        ? 'bg-[var(--color-brand-100)] border-l-4 border-l-[var(--color-brand-500)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] border-l-4 border-l-transparent'
                    }`}>
                    <span className={`text-[12px] font-mono font-bold ${d.no === selectedDocNo ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-text-primary)]'}`}>
                      {d.no}
                    </span>
                    <span className="text-[10px] mt-0.5 text-[var(--color-text-tertiary)]">
                      {d.date}
                    </span>
                  </button>
                ))
              )}
            </div>
            
            <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-2)] px-3 py-2 rounded-br-xl">
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)]">
                <span>แสดง {filteredDocs.length} / {docList.length}</span>
                <span className="font-mono text-[var(--color-brand-500)]">{docType}</span>
              </div>
            </div>
          </div>

          {/* Right: Document Detail */}
          <div className="flex flex-1 flex-col overflow-hidden px-4 mb-4 relative min-w-0">
            {detailLoading && (
              <div className="absolute inset-0 bg-[var(--color-surface-1)]/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-[var(--color-surface-0)] p-4 rounded-xl shadow-lg flex items-center gap-3 border border-[var(--color-border-light)]">
                  <RefreshCw size={24} className="animate-spin text-[var(--color-brand-500)]" />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">กำลังประมวลผล...</span>
                </div>
              </div>
            )}
            
            {!docDetail && !isEditingRef ? (
              <div className="flex flex-1 items-center justify-center bg-[var(--color-surface-0)] rounded-xl border border-[var(--color-border-light)] shadow-sm">
                <div className="flex flex-col items-center gap-3 text-[var(--color-text-tertiary)]">
                  <Package size={40} className="opacity-30" />
                  <span className="text-sm">เลือกเอกสารจากรายการด้านซ้าย หรือกดสร้างใหม่</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-4 overflow-auto min-w-0 pr-1">
                <div className="flex gap-4 flex-col xl:flex-row">
                  {/* Header Form */}
                  <div className="flex-1 border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] p-4 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    
                    {!hasPhoto && docDetail && (
                      <div className="mb-4 grid grid-cols-5 gap-3">
                        <MiniCard icon={<Hash size={14}/>} label="เลขที่" value={getHeaderValue(header, 'docNumber')} accent="brand" />
                        <MiniCard icon={<Calendar size={14}/>} label="วันที่เอกสาร" value={getHeaderValue(header, 'docDate')} accent="info" />
                        <MiniCard icon={<DollarSign size={14}/>} label="มูลค่ารวม" value={getHeaderValue(header, 'totalAmount')} accent="success" />
                        <MiniCard icon={<TrendingUp size={14}/>} label="จำนวนรวม" value={getHeaderValue(header, 'totalQty')} accent="accent" />
                        <MiniCard 
                          icon={<FileText size={14}/>} 
                          label="สถานะ" 
                          value={getHeaderValue(header, 'status') || 'N/A'} 
                          accent={header.status === 'C' ? 'danger' : header.status === 'A' ? 'success' : 'info'} 
                        />
                      </div>
                    )}

                    {/* Form Fields Grid */}
                    <div className={`grid gap-x-4 gap-y-3 ${hasPhoto ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-4'}`}>
                      {formConfig?.headerFields.map(f => {
                        const val = getHeaderValue(header, f.name);
                        
                        if (isEditingRef && f.name === 'orderNumber' && hasPhoto && onFetchRef) {
                          return (
                            <div key={f.name} className="flex items-center gap-3">
                              <span className="text-xs font-bold text-[var(--color-text-tertiary)] w-20 text-right">{f.label}</span>
                              <input 
                                value={refInput}
                                onChange={e => setRefInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && onFetchRef(refInput)}
                                placeholder="พิมพ์แล้วกด Enter..."
                                className="flex-1 h-7 bg-[var(--color-surface-0)] border border-[var(--color-brand-300)] rounded px-2 font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 transition-all text-xs" 
                              />
                            </div>
                          );
                        }
                        
                        return (
                          <FieldRow key={f.name} label={f.label}
                            value={val}
                            type={f.type} readOnly={f.readOnly || isEditingRef} options={f.options}
                            hasSearch={f.hasSearch}
                            colSpan={f.colSpan} 
                            compact={hasPhoto} />
                        );
                      })}
                    </div>

                    {/* Stone Fields */}
                    {!hasPhoto && formConfig?.stoneFields && (
                      <div className="mt-4 border-t border-[var(--color-border-light)] pt-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-sidebar-accent)]">ข้อมูลพลอย</span>
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
                    
                    {/* Sub-item Details (SOA Style) */}
                    {hasPhoto && docDetail && (
                       <div className="mt-5 border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-0)] overflow-hidden">
                        <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border-default)] px-4 py-2 text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                          รายละเอียดรายการที่เลือก
                        </div>
                        <div className="p-4 flex flex-col gap-4">
                          {/* Row 1 */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-[var(--color-text-tertiary)] w-16 text-right">ลำดับ</span>
                              <input readOnly value={lines[selectedLineIdx]?.OrdLineNo || lines[selectedLineIdx]?.OrderLineNo || ''} className="flex-1 bg-[var(--color-surface-1)] border border-[var(--color-border-light)] rounded px-2 py-1.5 text-xs font-bold text-[var(--color-text-primary)]" />
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-[var(--color-text-tertiary)] w-16 text-right">เบอร์งาน</span>
                              <input readOnly value={lines[selectedLineIdx]?.ItemNo || ''} className="flex-1 bg-[var(--color-surface-1)] border border-[var(--color-border-light)] rounded px-2 py-1.5 text-xs font-bold text-[var(--color-text-primary)]" />
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-[var(--color-text-tertiary)] w-16 text-right">พลอย</span>
                              <input readOnly value={lines[selectedLineIdx]?.GoodCode || ''} className="flex-1 bg-[var(--color-surface-1)] border border-[var(--color-border-light)] rounded px-2 py-1.5 text-xs font-bold text-[var(--color-brand-600)]" />
                            </div>
                          </div>

                          {/* Row 2: Specs */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] w-10 text-right">สี</span>
                              <input readOnly value={lines[selectedLineIdx]?.GoodColorCode || ''} className="flex-1 min-w-0 bg-[var(--color-surface-1)] border border-[var(--color-border-light)] rounded px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)]" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] w-10 text-right">รูปทรง</span>
                              <input readOnly value={lines[selectedLineIdx]?.GoodShapeCode || ''} className="flex-1 min-w-0 bg-[var(--color-surface-1)] border border-[var(--color-border-light)] rounded px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)]" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] w-10 text-right">ขนาด</span>
                              <input readOnly value={lines[selectedLineIdx]?.GoodSizeCode || ''} className="flex-1 min-w-0 bg-[var(--color-surface-1)] border border-[var(--color-border-light)] rounded px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)]" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] w-12 text-right">ลักษณะ</span>
                              <input readOnly value={lines[selectedLineIdx]?.GoodSpecCode || ''} className="flex-1 min-w-0 bg-[var(--color-surface-1)] border border-[var(--color-border-light)] rounded px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)]" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] w-10 text-right">เกรด</span>
                              <input readOnly value={lines[selectedLineIdx]?.GoodGradeCode || ''} className="flex-1 min-w-0 bg-[var(--color-surface-1)] border border-[var(--color-border-light)] rounded px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)]" />
                            </div>
                          </div>

                          {/* Row 3: Usage */}
                          <div className="flex justify-end pt-2 border-t border-[var(--color-border-light)]">
                            <div className="flex items-center gap-3 bg-[var(--color-surface-1)] border border-[var(--color-danger-200)] px-3 py-1.5 rounded">
                              <span className="text-xs font-bold text-[var(--color-danger-600)] uppercase tracking-wider">จำนวนใช้พลอย</span>
                              <input readOnly value={lines[selectedLineIdx]?.GoodQty || lines[selectedLineIdx]?.ItemQty || 0} className="w-24 bg-[var(--color-surface-0)] border border-[var(--color-border-light)] text-[var(--color-danger-600)] rounded px-2 py-1 text-sm font-bold text-right shadow-inner" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Photo Panel */}
                  {hasPhoto && (
                    <div className="w-full xl:w-64 bg-[var(--color-surface-0)] rounded-xl border border-[var(--color-border-light)] flex flex-col overflow-hidden shadow-sm shrink-0">
                      <div className="p-2 bg-[var(--color-surface-1)] border-b border-[var(--color-border-light)] font-bold text-xs text-[var(--color-text-primary)] flex justify-between items-center">
                        <span>รูปภาพชิ้นงาน</span>
                        <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded">
                          {lines[selectedLineIdx]?.ItemNo || '—'}
                        </span>
                      </div>
                      
                      <div className="flex-1 p-2 flex flex-col items-center justify-center bg-[var(--color-surface-2)] min-h-[160px]">
                        {lines[selectedLineIdx]?.ItemPhoto ? (
                          <img 
                            src={lines[selectedLineIdx].ItemPhoto.startsWith('data:') ? lines[selectedLineIdx].ItemPhoto : `data:image/jpeg;base64,${lines[selectedLineIdx].ItemPhoto}`} 
                            alt="Item" 
                            className="max-w-full max-h-[160px] object-contain rounded drop-shadow-sm border border-[var(--color-border-light)] bg-[var(--color-surface-0)] p-1"
                          />
                        ) : (
                          <div className="text-[var(--color-text-tertiary)] text-[10px] flex flex-col items-center gap-2">
                            <div className="w-20 h-20 border-2 border-dashed border-[var(--color-border-light)] rounded-lg flex items-center justify-center bg-[var(--color-surface-1)]">
                              <span className="opacity-50 font-bold">NO IMAGE</span>
                            </div>
                            <span>ไม่พบรูปภาพชิ้นงาน</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── Detail Table ─── */}
                <div className="flex-1 bg-[var(--color-surface-0)] rounded-xl border border-[var(--color-border-light)] flex flex-col overflow-hidden shadow-sm min-h-0">
                  <div className="flex items-center justify-between border-b border-[var(--color-border-light)] bg-[var(--color-surface-2)]/50 px-4 py-1.5">
                    <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                      รายการ ({lines.length})
                    </span>
                  </div>

                  <div className="content-scrollbar flex-1 overflow-auto">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-[var(--color-surface-1)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                          {tableColumns.map(col => (
                            <th key={col.key}
                              className={`whitespace-nowrap border-b border-r border-[var(--color-border-default)] px-3 py-2 ${
                                col.align === 'right' ? 'text-right' : 'text-center'
                              }`}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[12px] text-[var(--color-text-primary)]">
                        {lines.map((line: any, i: number) => {
                          const isSelected = selectedLineIdx === i;
                          return (
                          <tr key={i}
                            onClick={() => setSelectedLineIdx(i)}
                            className={`border-b border-[var(--color-border-default)]/50 transition-colors cursor-pointer ${
                              isSelected && hasPhoto ? 'bg-[var(--color-brand-50)]' : 'bg-[var(--color-surface-0)] hover:bg-[var(--color-surface-2)]/60'
                            }`}>
                            {tableColumns.map(col => {
                              const val = getCellValue(line, col.key, i);
                              const isNum = col.align === 'right';
                              return (
                                <td key={col.key}
                                  className={`whitespace-nowrap border-r border-[var(--color-border-default)]/30 px-3 py-1.5 ${
                                    isNum ? 'text-right tabular-nums font-semibold' : 'text-center'
                                  }`}>
                                  {isNum && typeof val === 'number' ? val.toFixed(val % 1 ? 4 : 0) : val}
                                </td>
                              );
                            })}
                          </tr>
                        )})}
                        {lines.length === 0 && (
                          <tr>
                            <td colSpan={tableColumns.length} className="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
                              ไม่มีรายการ
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ─── Footer ─── */}
                  {!hasPhoto && (
                    <div className="flex items-center justify-end gap-6 border-t border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-5 py-2.5">
                      <FooterStat label="รายการ" value={String(lines.length)} />
                      <FooterStat label="น้ำหนักรวม" value={totalWeight.toFixed(4)} />
                      <FooterStat label="จำนวนรวม" value={String(totalQty)} />
                      <FooterStat label="มูลค่ารวม" value={totalAmount.toLocaleString('th-TH', {minimumFractionDigits:2})} highlight />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {printTemplate}
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
        <div className="truncate text-[13px] font-bold text-[var(--color-text-primary)]" style={{fontFamily:'var(--font-display)'}}>{value || '—'}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, type, readOnly, options, hasSearch, colSpan, compact }:
  { label: string; value: string; type?: string; readOnly?: boolean; options?: string[]; hasSearch?: boolean; colSpan?: number; compact?: boolean }) {
  const cls = colSpan === 2 ? 'col-span-2' : '';
  const h = compact ? 'h-7 text-[12px]' : 'h-7 text-[12px]';
  return (
    <div className={`flex items-center gap-2 ${cls}`}>
      <span className={`w-24 shrink-0 text-right ${compact ? 'text-[11px] font-bold' : 'text-[11px] font-medium'} text-[var(--color-text-tertiary)]`}>
        {label}
      </span>
      <div className="relative flex-1">
        {type === 'select' && options ? (
          <select defaultValue={value} disabled={readOnly}
            className={`${h} w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]`}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type === 'date' ? 'text' : type === 'number' ? 'text' : 'text'}
            value={value} readOnly={readOnly} onChange={() => {}}
            className={`${h} w-full rounded border border-[var(--color-border-strong)] px-2 font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] ${
              readOnly ? 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] font-semibold' : 'bg-[var(--color-surface-0)]'
            } ${type === 'number' ? 'text-right' : ''}`} />
        )}
        {hasSearch && !readOnly && (
          <button className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <Search size={12} />
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
