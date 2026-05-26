import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentLayout from '../components/document/DocumentLayout';
import type { DocListItem, BreadcrumbItem } from '../components/document/DocumentLayout';
import { formConfigMap } from '../config/formConfigs';
import {
  fetchDocumentList, fetchDocumentDetail
} from '../services/procurementAPI';
import type { ProcDocDetail, ProcDocLine } from '../services/procurementAPI';

// ─── Route → docType mapping ──────────────────
const routeToDocType: Record<string, string> = {
  '/procurement/purchase': 'SPA',
  '/procurement/receive': 'SRA',
  '/procurement/receive-b': 'SRB',
  '/procurement/return': 'SIR',
};

export default function ProcurementDocPage() {
  const location = useLocation();
  const docType = routeToDocType[location.pathname] || 'SPA';
  const formConfig = formConfigMap[docType];

  const [docList, setDocList] = useState<DocListItem[]>([]);
  const [selectedDocNo, setSelectedDocNo] = useState('');
  const [docDetail, setDocDetail] = useState<ProcDocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupLabel = formConfig?.groupLabel || 'จัดซื้อและรับเข้า';
  const itemLabel = formConfig?.titleTh || docType;
  
  const breadcrumb: BreadcrumbItem[] = [
    { label: 'JEWELRY SMART FACTORY', path: '/' },
    { label: groupLabel, path: '/procurement/purchase' },
    { label: `${itemLabel} (${docType})` },
  ];

  // ─── Load document list ─────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    setDocList([]);
    setDocDetail(null);
    setSelectedDocNo('');

    fetchDocumentList(docType)
      .then(data => {
        // Map data to expected DocumentLayout format
        const mappedList = data.map(d => ({
          no: d.docNumber,
          date: d.docDate,
          status: d.status
        }));
        setDocList(mappedList);
        if (mappedList.length > 0) setSelectedDocNo(mappedList[0].no);
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

  // ─── Print Template ──────────────────────────
  const getPrintTemplate = () => {
    if (!docDetail) return null;
    const lines = docDetail.lines || [];
    const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
    const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0);
    
    return (
      <div className="print-only" style={{ color: '#000000', backgroundColor: '#ffffff', padding: '0px', fontFamily: '"Arial", "Prompt", sans-serif' }}>
        {/* Header Grid Table (Company Header, Supply, Doc Info) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ border: '1.5px solid #000000', padding: '12px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
                  Chong Lerdlum Co.,Ltd. &nbsp;บริษัท จงเลิศล้ำ จำกัด
                </div>
              </td>
              <td style={{ border: '1px solid #000000', width: '30%', padding: '10px', textAlign: 'center', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  {docType === 'SPA' ? 'Purchase Order' : (docType === 'SRA' || docType === 'SRB') ? 'Goods Receipt' : 'Goods Return'}
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000000', width: '70px', padding: '6px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#f0f0f0', fontSize: '11px', fontWeight: 'bold' }}>
                Supply
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px 12px', verticalAlign: 'middle', fontSize: '12px', fontWeight: 'bold' }}>
                <span style={{ fontFamily: 'monospace', letterSpacing: '1px', marginRight: '24px' }}>
                  {docDetail.header.supplierCode}
                </span>
                <span>{docDetail.header.supplierName}</span>
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px 12px', verticalAlign: 'middle', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                Order No : {docDetail.header.docNumber}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Metadata Grid Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', borderTop: 'none', tableLayout: 'fixed', textAlign: 'center', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '12.5%' }}>
                {docType === 'SPA' ? 'Order Date' : (docType === 'SIR' ? 'Return Date' : 'Rec Date')}
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '12.5%' }}>
                {docType === 'SPA' ? 'Due Date' : 'Doc Date'}
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '15%' }}>
                {docType === 'SPA' ? 'Ship Via' : 'Ref No'}
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '10%' }}>
                {docType === 'SPA' ? 'Order By' : (docType === 'SIR' ? 'Return By' : 'Rec By')}
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '12.5%' }}>
                Approved By
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '12.5%' }}>
                Total Qty
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '15%' }}>
                Total Amount
              </td>
              <td style={{ border: '1px solid #000000', borderTop: 'none', padding: '5px', width: '10%' }}>
                Currency
              </td>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 'bold', fontSize: '11px', height: '24px' }}>
              <td style={{ border: '1px solid #000000', padding: '4px' }}>{docDetail.header.docDate}</td>
              <td style={{ border: '1px solid #000000', padding: '4px' }}>
                {docType === 'SPA' ? (docDetail.header.dueDate || docDetail.header.docDate) : docDetail.header.docDate}
              </td>
              <td style={{ border: '1px solid #000000', padding: '4px', fontFamily: 'monospace' }}>
                {docType === 'SPA' ? '' : (docDetail.header.refNumber || '')}
              </td>
              <td style={{ border: '1px solid #000000', padding: '4px' }}>{docDetail.header.buyer || 'POR'}</td>
              <td style={{ border: '1px solid #000000', padding: '4px' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000000', padding: '4px', fontFamily: 'monospace' }}>
                {totalQty.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td style={{ border: '1px solid #000000', padding: '4px', fontFamily: 'monospace' }}>
                {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
              </td>
              <td style={{ border: '1px solid #000000', padding: '4px', fontFamily: 'monospace' }}>{docDetail.header.currency}</td>
            </tr>
          </tbody>
        </table>

        {/* Details Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', borderTop: 'none', tableLayout: 'fixed', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center', height: '22px' }}>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '3.5%', padding: '2px' }}>No</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '23%', padding: '2px' }}>Color</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '12%', padding: '2px' }}>Shape</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '6%', padding: '2px' }}>Size</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '15%', padding: '2px' }}>Cut</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '5%', padding: '2px' }}>Grade</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '7%', padding: '2px' }}>Quantity</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '5%', padding: '2px' }}>Unit</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '8%', padding: '2px' }}>Price</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '10%', padding: '2px' }}>CLL PO</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '8%', padding: '2px' }}>Ct Wt</th>
              <th style={{ border: '1px solid #000000', borderTop: 'none', width: '8%', padding: '2px' }}>Price/Ct</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line: ProcDocLine, idx: number) => {
              const currency = docDetail.header.currency || 'THB';
              const curSymbol = currency === 'USD' ? '$' : currency === 'THB' ? '฿' : currency === 'EUR' ? '€' : currency;
              return (
                <tr key={idx} style={{ height: '36px', verticalAlign: 'middle' }}>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '4px 2px' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #000000', padding: '4px 6px', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{line.stoneCode}</div>
                    <div style={{ fontSize: '9px', color: '#333333' }}>{line.stoneName || line.stoneCode}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '4px 6px', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: 'bold' }}>{line.shape}</div>
                    <div style={{ fontSize: '8.5px', color: '#333333', textTransform: 'uppercase' }}>{line.shapeName || '—'}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '4px 2px', fontWeight: 'bold' }}>{line.size || '—'}</td>
                  <td style={{ border: '1px solid #000000', padding: '4px 6px', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{line.characteristic}</div>
                    <div style={{ fontSize: '8.5px', color: '#333333' }}>{line.specName || '—'}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '4px 2px', fontWeight: 'bold' }}>{line.grade || '—'}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace' }}>{(line.qty || 0).toLocaleString()}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '4px 2px' }}>{line.unit || 'PCS'}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    <span style={{ float: 'left', marginRight: '2px', fontSize: '9px', fontWeight: 'normal' }}>{curSymbol}</span>
                    <span>{Number(line.price || 0).toFixed(4)}</span>
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '4px 6px', lineHeight: '1.2', fontFamily: 'monospace' }}>
                    <div style={{ fontWeight: 'bold' }}>{line.orderNumber || ''}</div>
                    <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#333333' }}>{line.customer || ''}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace' }}>{Number(line.weight || 0).toFixed(4)}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontFamily: 'monospace' }}>{Number(line.ctPerPc || 0).toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom Footers Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px' }}>
          <div>( R75-413-A1 )</div>
          <div style={{ fontFamily: 'monospace' }}>Page &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1 / 1</div>
        </div>
      </div>
    );
  };

  return (
    <DocumentLayout
      docType={docType}
      formConfig={formConfig}
      breadcrumb={breadcrumb}
      docList={docList}
      selectedDocNo={selectedDocNo}
      onSelectDoc={setSelectedDocNo}
      docDetail={docDetail}
      loading={loading}
      detailLoading={detailLoading}
      error={error}
      onClearError={() => setError(null)}
      hasPhoto={false}
      printTemplate={getPrintTemplate()}
    />
  );
}
