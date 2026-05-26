import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentLayout from '../components/document/DocumentLayout';
import type { DocListItem, BreadcrumbItem } from '../components/document/DocumentLayout';
import { formConfigMap } from '../config/formConfigs';

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
  
  const [loading, setLoading] = useState(false);
  const detailLoading = false;
  const [error, setError] = useState<string | null>(null);

  const groupLabel = formConfig?.groupLabel || 'ห้องตัวอย่าง';
  const itemLabel = formConfig?.titleTh || docType;
  
  const breadcrumb: BreadcrumbItem[] = [
    { label: 'JEWELRY SMART FACTORY', path: '/' },
    { label: groupLabel },
    { label: `${itemLabel} (${docType})` },
  ];

  // Currently, Sample module doesn't have backend API yet.
  // We will just show an empty list.
  useEffect(() => {
    setLoading(true);
    setError(null);
    setDocList([]);
    setSelectedDocNo('');
    setDocDetail(null);
    setLoading(false);
  }, [docType]);

  const handleClear = () => {
    setSelectedDocNo('');
    setDocDetail(null);
    setError(null);
  };

  const handleSave = () => {
    alert('ระบบนี้อยู่ในช่วงพัฒนา (UI Only)');
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
      onNew={handleClear}
      onSave={handleSave}
      onCancel={handleClear}
    />
  );
}
