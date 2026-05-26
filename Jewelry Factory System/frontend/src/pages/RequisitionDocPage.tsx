import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentLayout from '../components/document/DocumentLayout';
import type { DocListItem, BreadcrumbItem } from '../components/document/DocumentLayout';
import { formConfigMap } from '../config/formConfigs';
import { 
  fetchRequisitionDocuments, 
  fetchRequisitionDocument,
  fetchOrderForRequisition,
  saveRequisitionDocument
} from '../services/requisitionAPI';

const routeToDocType: Record<string, string> = {
  '/orders/create': 'SOA',
  '/orders/issue': 'SIA',
  '/orders/issue-b': 'SIB',
  '/orders/repair': 'SIP',
  '/orders/dispatch-order': 'SIS',
};

export default function RequisitionDocPage() {
  const location = useLocation();
  const docType = routeToDocType[location.pathname] || 'SOA';
  const formConfig = formConfigMap[docType];

  const [docList, setDocList] = useState<DocListItem[]>([]);
  const [selectedDocNo, setSelectedDocNo] = useState('');
  const [docDetail, setDocDetail] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupLabel = formConfig?.groupLabel || 'ออเดอร์และการเบิก';
  const itemLabel = formConfig?.titleTh || docType;
  
  const breadcrumb: BreadcrumbItem[] = [
    { label: 'JEWELRY SMART FACTORY', path: '/' },
    { label: groupLabel },
    { label: `${itemLabel} (${docType})` },
  ];

  const hasPhoto = formConfig?.hasPhoto;

  const loadDocList = async () => {
    setLoading(true);
    setError(null);
    setDocList([]);
    
    // For UI Only modules, just show empty
    if (formConfig?.apiType === 'none') {
      setLoading(false);
      return;
    }

    try {
      const data = await fetchRequisitionDocuments(docType);
      const mappedList = data.map((d: any) => ({
        no: d.DocuNo,
        date: d.DocuDate ? new Date(d.DocuDate).toLocaleDateString('th-TH') : ''
      }));
      setDocList(mappedList);
      if (mappedList.length > 0 && !selectedDocNo) {
        setSelectedDocNo(mappedList[0].no);
      }
    } catch (err: any) {
      console.warn(`Failed to load list for ${docType}:`, err);
      // Don't show blocking error for UI-only/WIP endpoints
      if (err.message && !err.message.includes('404')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleClear();
    loadDocList();
  }, [docType]);

  useEffect(() => {
    if (selectedDocNo) {
      handleSearchDoc(selectedDocNo);
    } else {
      setDocDetail(null);
    }
  }, [selectedDocNo]);

  const handleSearchDoc = async (docNo: string) => {
    if (!docNo.trim()) return;
    setDetailLoading(true);
    setError(null);
    try {
      const data = await fetchRequisitionDocument(docNo);
      setDocDetail(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Document');
      setDocDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFetchRef = async (refNo: string) => {
    if (!refNo.trim()) return;
    setDetailLoading(true);
    setError(null);
    try {
      const data = await fetchOrderForRequisition(refNo);
      setDocDetail({
        header: {
          ...data.header,
          DocuDate: new Date().toISOString(),
          DocuNo: 'NEW',
        },
        lines: data.lines.map((l: any, i: number) => ({
          ...l,
          ListNo: i + 1,
          GoodQty: l.ItemQty || 0,
        }))
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reference');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedDocNo('');
    setDocDetail(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!docDetail?.header) return;
    
    if (formConfig?.apiType === 'none') {
      alert('ระบบนี้อยู่ในช่วงพัฒนา (UI Only)');
      return;
    }

    setDetailLoading(true);
    try {
      const payload = {
        docType: docType,
        header: docDetail.header,
        lines: docDetail.lines
      };
      await saveRequisitionDocument(payload);
      alert('บันทึกเอกสารสำเร็จ!');
      handleClear();
      loadDocList();
    } catch (err: any) {
      setError(err.message || 'Failed to save document');
    } finally {
      setDetailLoading(false);
    }
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
      hasPhoto={hasPhoto}
      onNew={handleClear}
      onSave={handleSave}
      onCancel={handleClear}
      onFetchRef={handleFetchRef}
    />
  );
}
