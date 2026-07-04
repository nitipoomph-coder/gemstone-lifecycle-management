import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentLayout from '../../components/layout/DocumentLayout';
import type { DocListItem, BreadcrumbItem } from '../../components/layout/DocumentLayout';
import { formConfigMap } from '../../config/formConfigs';
import {
  fetchRequisitionDocuments,
  fetchRequisitionDocument,
  fetchOrderForRequisition,
  saveRequisitionDocument,
  generateNextDocumentNumber
} from '../../services/requisitionAPI';

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
  const [isEditing, setIsEditing] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupLabel = formConfig?.groupLabel || 'ออเดอร์และการเบิก';
  const itemLabel = formConfig?.titleTh || docType;

  const breadcrumb: BreadcrumbItem[] = [
    { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
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
      const response = await fetchRequisitionDocuments(docType, { page, limit: 50, search });
      const mappedList = response.data.map((d: any) => ({
        no: d.DocuNo,
        date: d.DocuDate ? new Date(d.DocuDate).toLocaleDateString('th-TH') : '',
        status: d.DocuStatus
      }));
      setDocList(mappedList);
      setTotalPages(response.totalPages || 1);

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
    setPage(1);
    setSearch('');
  }, [docType]);

  useEffect(() => {
    loadDocList();
  }, [docType, page, search]);

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

  const handleClear = async () => {
    if (isEditing && selectedDocNo) {
      await fetch('/api/lock/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNo: selectedDocNo, user: 'Staff' })
      }).catch(e => console.error(e));
    }
    setIsEditing(false);
    setSelectedDocNo('');
    setDocDetail(null);
    setError(null);
  };

  const handleNew = async () => {
    setDetailLoading(true);
    try {
      const nextNo = await generateNextDocumentNumber(docType);
      setSelectedDocNo('');
      setDocDetail({
        header: {
          DocuNo: nextNo,
          DocuDate: new Date().toISOString(),
          DocuStatus: 'N'
        },
        lines: []
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate new document');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDocNo) return;
    setDetailLoading(true);
    try {
      const res = await fetch('/api/lock/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNo: selectedDocNo, user: 'Staff' })
      });
      const json = await res.json();
      if (!json.ok) {
        alert(`ไม่สามารถแก้ไขได้: ${json.error} (Locked by ${json.lockedBy || 'someone'})`);
        return;
      }
      setIsEditing(true);
    } catch (err: any) {
      alert('Failed to acquire lock: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
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
      onSearchList={(text) => {
        setSearch(text);
        setPage(1);
      }}
      onSearchSubmit={(text) => {
        if (text.trim()) {
          setSelectedDocNo(text.trim());
        }
      }}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      docDetail={docDetail}
      loading={loading}
      detailLoading={detailLoading}
      error={error}
      onClearError={() => setError(null)}
      hasPhoto={hasPhoto}
      isEditing={isEditing}
      onNew={handleNew}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleClear}
      onFetchRef={handleFetchRef}
    />
  );
}
