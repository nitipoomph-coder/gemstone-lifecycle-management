const API_BASE = '/api/requisition';

export async function fetchRequisitionDocuments(docType: string) {
  const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(docType)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export async function fetchRequisitionDocument(docuNo: string) {
  const res = await fetch(`${API_BASE}/document/${encodeURIComponent(docuNo)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { header: json.header, lines: json.lines };
}

export async function fetchOrderForRequisition(ordNo: string) {
  const res = await fetch(`${API_BASE}/order/${encodeURIComponent(ordNo)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return { header: json.header, lines: json.lines };
}

export async function saveRequisitionDocument(data: any) {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json;
}
