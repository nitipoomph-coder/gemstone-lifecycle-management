import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Printer, Save } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
const mockSIRDocList = [
  { docNumber: 'SIR2406-0001', date: '01/06/2024' },
  { docNumber: 'SIR2406-0002', date: '02/06/2024' },
];

const mockSIRDocument = {
  docNumber: 'SIR2406-0001',
  date: '2024-06-01',
  refNumber: 'SRA2405-0120',
  category: 'A',
  supplierCode: 'V-001',
  supplierName: 'ABC Gems Co., Ltd.',
  currency: 'THB — บาท',
  exchangeRate: 1.0,
  items: [
    { seq: 1, stoneCode: 'RUBY-01', unit: 'ct', grade: 'A', weight: 1.5, returnQty: 10, price: 500, total: 5000, warehouse: 'W01' },
    { seq: 2, stoneCode: 'SAPPHIRE-02', unit: 'ct', grade: 'B', weight: 2.0, returnQty: 5, price: 800, total: 4000, warehouse: 'W01' },
  ]
};

export default function SIRPage() {
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState(mockSIRDocList[0].docNumber);
  const [searchDoc, setSearchDoc] = useState('');
  const doc = mockSIRDocument;

  const filteredDocs = mockSIRDocList.filter(d =>
    d.docNumber.toLowerCase().includes(searchDoc.toLowerCase())
  );

  const totalWeight = doc.items.reduce((sum, item) => sum + item.weight, 0);
  const totalQty = doc.items.reduce((sum, item) => sum + item.returnQty, 0);
  const totalAmount = doc.items.reduce((sum, item) => sum + item.total, 0);

  return (
    <>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'จัดซื้อและรับเข้า', path: '/procurement/purchase' },
        { label: 'บันทึกคืนพลอย (SIR)' },
      ]} />
      <div className="content-scrollbar flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="animate-fade-in-up mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              บันทึกคืนพลอย
            </h1>
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: 'var(--color-info-50)',
                color: 'var(--color-info-600)',
              }}
            >
              ● ฉบับร่าง
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <ArrowLeft size={16} /> ย้อนกลับ
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: 'var(--color-danger-100)',
                color: 'var(--color-danger-500)',
              }}
            >
              <Trash2 size={16} /> ลบ
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-primary)',
              }}
            >
              <Printer size={16} /> พิมพ์
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors hover:opacity-90"
              style={{
                background: 'var(--color-brand-500)',
                fontFamily: 'var(--font-display)',
              }}
            >
              <Save size={16} /> บันทึก
            </button>
          </div>
        </div>

        {/* Body: Doc List + Form */}
        <div className="grid grid-cols-[240px_1fr] gap-6">
          {/* Document List */}
          <div
            className="animate-fade-in-up stagger-1 flex max-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-xl"
            style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="p-3" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <input
                type="text"
                placeholder="ค้นหาเลขที่..."
                value={searchDoc}
                onChange={e => setSearchDoc(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-brand-500)]"
                style={{
                  background: 'var(--color-surface-0)',
                  borderColor: 'var(--color-border-light)',
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {filteredDocs.map(d => (
                <button
                  key={d.docNumber}
                  onClick={() => setActiveDoc(d.docNumber)}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition-all duration-150 ${
                    activeDoc === d.docNumber
                      ? 'bg-[var(--color-brand-100)]'
                      : 'hover:bg-[var(--color-surface-0)]'
                  }`}
                >
                  <span
                    className={`text-sm ${
                      activeDoc === d.docNumber
                        ? 'font-semibold text-[var(--color-brand-500)]'
                        : 'font-medium text-[var(--color-text-primary)]'
                    }`}
                  >
                    {d.docNumber}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">{d.date}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Detail */}
          <div className="flex flex-col gap-6">
            {/* Document Info */}
            <div
              className="animate-fade-in-up stagger-2 overflow-hidden rounded-xl"
              style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <div
                className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
                style={{
                  background: 'var(--color-surface-0)',
                  borderBottom: '1px solid var(--color-border-light)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                ข้อมูลเอกสาร
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-4 p-6">
                <FormField label="เลขที่" value={doc.docNumber} readOnly />
                <FormField label="วันที่เอกสาร" value={doc.date} type="date" />
                <FormField label="เลขที่อ้างอิง (SRA)" value={doc.refNumber} readOnly />
                <FormField label="ประเภท" value={doc.category} type="select" options={['A', 'B', 'C']} />
                <FormField label="ผู้ขาย" value={`${doc.supplierCode} — ${doc.supplierName}`} className="col-span-2" />
                <FormField label="สกุลเงิน" value={doc.currency} type="select" options={['THB — บาท', 'USD — ดอลลาร์']} />
                <FormField label="อัตราแลกเปลี่ยน" value={String(doc.exchangeRate.toFixed(2))} type="number" />
              </div>
            </div>

            {/* Items Table */}
            <div
              className="animate-fade-in-up stagger-3 overflow-hidden rounded-xl"
              style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <div
                className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
                style={{
                  background: 'var(--color-surface-0)',
                  borderBottom: '1px solid var(--color-border-light)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                รายการพลอย
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['ลำดับ', 'รหัสพลอย', 'หน่วย', 'สุง'].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]" style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)' }}>{h}</th>
                      ))}
                      {['น้ำหนัก', 'คืน', 'ราคา', 'รวม'].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]" style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)' }}>{h}</th>
                      ))}
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]" style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)' }}>คลัง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.items.map(item => (
                      <tr
                        key={item.seq}
                        className="bg-[var(--color-brand-100)] transition-colors duration-150"
                      >
                        <td className="px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--color-border-light)' }}>{item.seq}</td>
                        <td className="px-4 py-2 text-sm font-medium" style={{ borderBottom: '1px solid var(--color-border-light)' }}>{item.stoneCode}</td>
                        <td className="px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                          <span className="rounded bg-[var(--color-surface-0)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">{item.unit}</span>
                        </td>
                        <td className="px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--color-border-light)' }}>{item.grade}</td>
                        <td className="px-4 py-2 text-right text-sm font-medium tabular-nums" style={{ borderBottom: '1px solid var(--color-border-light)' }}>{item.weight.toFixed(4)}</td>
                        <td className="px-4 py-2 text-right text-sm font-medium tabular-nums" style={{ borderBottom: '1px solid var(--color-border-light)' }}>{item.returnQty}</td>
                        <td className="px-4 py-2 text-right text-sm font-medium tabular-nums" style={{ borderBottom: '1px solid var(--color-border-light)' }}>{item.price.toFixed(4)}</td>
                        <td className="px-4 py-2 text-right text-sm font-medium tabular-nums" style={{ borderBottom: '1px solid var(--color-border-light)' }}>{item.total.toFixed(4)}</td>
                        <td className="px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--color-border-light)' }}>{item.warehouse}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--color-surface-0)', borderTop: '2px solid var(--color-border-default)' }}>
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold"></td>
                      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{totalWeight.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{totalQty}</td>
                      <td className="px-4 py-3 text-sm"></td>
                      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{totalAmount.toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer Stats */}
              <div
                className="flex items-center justify-end gap-8 px-6 py-4"
                style={{
                  background: 'var(--color-surface-0)',
                  borderTop: '1px solid var(--color-border-light)',
                }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">รายการ</span>
                  <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>{doc.items.length}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">จำนวนรวม</span>
                  <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>{totalQty}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">มูลค่ารวม</span>
                  <span className="text-xl font-bold text-[var(--color-brand-500)]" style={{ fontFamily: 'var(--font-display)' }}>{totalAmount.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// Form Field Component (local to this page)
// ============================================
interface FormFieldProps {
  label: string;
  value: string;
  type?: 'text' | 'date' | 'number' | 'select';
  readOnly?: boolean;
  options?: string[];
  className?: string;
}

function FormField({ label, value, type = 'text', readOnly = false, options, className = '' }: FormFieldProps) {
  const inputStyles = {
    background: readOnly ? 'var(--color-surface-0)' : 'var(--color-surface-2)',
    border: '1px solid var(--color-border-light)',
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </label>
      {type === 'select' && options ? (
        <select
          defaultValue={value}
          className="rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-brand-500)]"
          style={inputStyles}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          defaultValue={value}
          readOnly={readOnly}
          className={`rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-brand-500)] ${readOnly ? 'text-[var(--color-text-secondary)]' : ''}`}
          style={inputStyles}
        />
      )}
    </div>
  );
}
