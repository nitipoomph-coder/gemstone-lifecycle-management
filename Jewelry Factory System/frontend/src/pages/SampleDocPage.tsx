import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentLayout from '../components/document/DocumentLayout';
import type { DocListItem, BreadcrumbItem } from '../components/document/DocumentLayout';
import { formConfigMap } from '../config/formConfigs';
import {
  fetchSampleDocuments,
  fetchSampleDocument,
} from '../services/sampleAPI';

// ─── Route → docType mapping ──────────────────
const routeToDocType: Record<string, string> = {
  '/sample/order': 'SSA',
  '/sample/dispatch': 'SIM',
};

export default function SampleDocPage() {
  const location = useLocation();
  const docType = routeToDocType[location.pathname] || 'SSA';
  const formConfig = formConfigMap[docType];

  const [docList, setDocList] = useState<DocListItem[]>([]);
  const [selectedDocNo, setSelectedDocNo] = useState('');
  const [docDetail, setDocDetail] = useState<any | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupLabel = formConfig?.groupLabel || 'ห้องตัวอย่าง';
  const itemLabel = formConfig?.titleTh || docType;

  const breadcrumb: BreadcrumbItem[] = [
    { label: 'JEWELRY SMART FACTORY', path: '/' },
    { label: groupLabel },
    { label: `${itemLabel} (${docType})` },
  ];

  // ─── Load document list ─────────────────────
  const loadDocList = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchSampleDocuments(docType, { page, limit: 50, search });
      const mappedList = response.data.map((d: any) => ({
        no: d.DocuNo,
        date: d.DocuDate ? new Date(d.DocuDate).toLocaleDateString('th-TH') : ''
      }));
      setDocList(mappedList);
      setTotalPages(response.totalPages || 1);
      
      if (mappedList.length > 0 && !selectedDocNo) {
        setSelectedDocNo(mappedList[0].no);
      }
    } catch (err: any) {
      console.warn(`Failed to load list for ${docType}:`, err);
      if (err.message && !err.message.includes('404')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // เมื่อเปลี่ยน docType → รีเซ็ตหน้าแล้วโหลดใหม่
  useEffect(() => {
    handleClear();
    setPage(1);
    setSearch('');
  }, [docType]);

  useEffect(() => {
    loadDocList();
  }, [docType, page, search]);

  // เมื่อเลือกเอกสาร → โหลดรายละเอียด
  useEffect(() => {
    if (selectedDocNo) {
      handleSearchDoc(selectedDocNo);
    } else {
      setDocDetail(null);
    }
  }, [selectedDocNo]);

  // ─── Load document detail ───────────────────
  const handleSearchDoc = async (docNo: string) => {
    if (!docNo.trim()) return;
    setDetailLoading(true);
    setError(null);
    try {
      const data = await fetchSampleDocument(docNo);
      setDocDetail(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Document');
      setDocDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedDocNo('');
    setDocDetail(null);
    setError(null);
  };

  const handleSave = () => {
    alert('ระบบนี้อยู่ในช่วงพัฒนา (Read-Only)');
  };

  return (
    <DocumentLayout
      docType={docType}
      formConfig={formConfig}
      breadcrumb={breadcrumb}
      docList={docList}
      selectedDocNo={selectedDocNo}
      onSelectDoc={setSelectedDocNo}
      onSearchList={(text) => {
        setSearch(text);
        setPage(1);
      }}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      docDetail={docDetail}
      loading={loading}
      detailLoading={detailLoading}
      error={error}
      onClearError={() => setError(null)}
      hasPhoto={formConfig?.hasPhoto}
      onNew={handleClear}
      onSave={handleSave}
      onCancel={handleClear}
    />
  );
}
