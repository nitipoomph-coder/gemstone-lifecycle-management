import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FilePlus, Save, Pencil, Search, Trash2, Printer, FileSpreadsheet, X,
  Construction, SearchIcon, Undo2,
} from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { menuConfig } from '../config/menuConfig';
import { formConfigMap, type FormFieldDef, type TableColumnDef, type FormConfig } from '../config/formConfigs';

// Map group id to first item's path for breadcrumb (4 กลุ่มตาม DFD)
const groupFirstPath: Record<string, string> = {
  procurement: '/procurement/purchase',
  orders: '/orders/create',
  sample: '/sample/order',
  inventory: '/inventory/check-dispatch',
};

// Toolbar buttons
const toolbarButtons = [
  { id: 'new', label: 'สร้างใหม่', icon: FilePlus, variant: 'primary' as const },
  { id: 'save', label: 'บันทึก', icon: Save, variant: 'default' as const },
  { id: 'edit', label: 'แก้ไข', icon: Pencil, variant: 'default' as const },
  { id: 'search', label: 'ค้นหา', icon: Search, variant: 'default' as const },
  { id: 'sep', label: '', icon: null, variant: 'default' as const },
  { id: 'delete', label: 'ลบ', icon: Trash2, variant: 'danger' as const },
  { id: 'undo', label: 'ยกเลิก', icon: Undo2, variant: 'default' as const },
  { id: 'sep2', label: '', icon: null, variant: 'default' as const },
  { id: 'print', label: 'พิมพ์', icon: Printer, variant: 'default' as const },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, variant: 'default' as const },
  { id: 'close', label: 'ปิด', icon: X, variant: 'default' as const },
];

// Check page toolbar (no create/save/edit/delete)
const checkToolbarButtons = [
  { id: 'search', label: 'ค้นหา', icon: Search, variant: 'primary' as const },
  { id: 'sep', label: '', icon: null, variant: 'default' as const },
  { id: 'print', label: 'พิมพ์', icon: Printer, variant: 'default' as const },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, variant: 'default' as const },
  { id: 'close', label: 'ปิด', icon: X, variant: 'default' as const },
];

const variantStyles = {
  primary: 'bg-[var(--color-brand-500)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-600)]',
  default: 'bg-[var(--color-surface-1)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]',
  danger: 'bg-[var(--color-danger-50)] text-[var(--color-danger-500)] hover:bg-[var(--color-danger-100)]',
};

export default function PlaceholderPage() {
  const location = useLocation();
  const navigate = useNavigate();

  let groupLabel = '';
  let groupId = '';
  let itemLabel = '';
  let itemCode = '';

  for (const group of menuConfig) {
    const found = group.items.find(item => item.path === location.pathname);
    if (found) {
      groupLabel = group.label;
      groupId = group.id;
      itemLabel = found.label;
      itemCode = found.code || '';
      break;
    }
  }

  const config: FormConfig | undefined = itemCode ? formConfigMap[itemCode] : undefined;
  const isCheckPage = itemLabel.includes('ตรวจสอบ') || itemLabel.includes('Confirm');
  const isConfirmStock = itemCode === 'CFM-STK';

  const breadcrumb = [
    { label: 'JEWELRY SMART FACTORY', path: '/' },
    { label: groupLabel, path: groupFirstPath[groupId] || '/' },
    { label: itemCode ? `${itemLabel} (${itemCode})` : itemLabel },
  ];

  const [searchDoc, setSearchDoc] = useState('');

  // Determine which toolbar to use
  const activeToolbar = isCheckPage ? checkToolbarButtons : toolbarButtons;

  return (
    <>
      <Topbar breadcrumb={breadcrumb} />
      <div className="content-scrollbar flex flex-1 flex-col overflow-y-auto">
        {/* Toolbar */}
        <div
          className="flex items-center gap-1 px-5 py-1.5"
          style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)' }}
        >
          {activeToolbar.map(btn => {
            if (btn.id.startsWith('sep')) {
              return <span key={btn.id} className="mx-1 h-5 w-px" style={{ background: 'var(--color-border-default)' }} />;
            }
            return (
              <button
                key={btn.id}
                onClick={() => { if (btn.id === 'close') navigate('/'); }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${variantStyles[btn.variant]}`}
                style={{ border: btn.variant === 'default' ? '1px solid var(--color-border-light)' : 'none', fontFamily: 'var(--font-display)' }}
                title={btn.label}
              >
                {btn.icon && <btn.icon size={13} />}
                <span className="hidden sm:inline">{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex flex-1 gap-4 p-5">
          {/* Document List — empty, waiting for DB connection */}
          {!isCheckPage && (
            <div
              className="animate-fade-in-up flex w-[180px] min-w-[180px] flex-col overflow-hidden rounded-xl"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', maxHeight: 'calc(100vh - 170px)' }}
            >
              <div className="px-2 py-2" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <div className="px-2 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-display)' }}>
                  เลขที่
                </div>
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={searchDoc}
                  onChange={e => setSearchDoc(e.target.value)}
                  className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none transition-colors focus:border-[var(--color-brand-500)]"
                  style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-border-light)' }}
                />
              </div>
              <div className="custom-scrollbar flex flex-1 items-center justify-center overflow-y-auto p-4">
                <span className="text-center text-[11px] text-[var(--color-text-tertiary)]">
                  รอเชื่อมต่อฐานข้อมูล
                </span>
              </div>
            </div>
          )}

          {/* Form Area */}
          <div className="flex flex-1 flex-col gap-4">

            {/* ─── Confirm Stock: Special Layout ─── */}
            {isConfirmStock ? (
              <ConfirmStockLayout config={config} />
            ) : (
              <>
                {/* ─── Header Fields ─── */}
                <FormSection title="ข้อมูลเอกสาร">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-4 gap-y-3 p-4">
                    {(config?.headerFields || defaultHeaderFields(isCheckPage)).map(field => (
                      <div key={field.name} className={field.colSpan === 2 ? 'col-span-2' : ''}>
                        <FormField field={field} />
                      </div>
                    ))}
                  </div>
                </FormSection>

                {/* ─── Stone Fields (if configured) ─── */}
                {config?.stoneFields && (
                  <FormSection title="ข้อมูลพลอย">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-4 gap-y-3 p-4">
                      {config.stoneFields.map(field => (
                        <div key={field.name} className={field.colSpan === 2 ? 'col-span-2' : ''}>
                          <FormField field={field} />
                        </div>
                      ))}
                    </div>
                  </FormSection>
                )}

                {/* ─── Data Table ─── */}
                <DataTable config={config} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="animate-fade-in-up overflow-hidden rounded-xl"
      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)' }}
    >
      <div
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
        style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)', fontFamily: 'var(--font-display)' }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function FormField({ field }: { field: FormFieldDef }) {
  const inputStyles = {
    background: field.readOnly ? 'var(--color-surface-0)' : 'var(--color-surface-2)',
    border: '1px solid var(--color-border-light)',
  };

  // Skip rendering if label is empty (spacer field)
  if (field.label === '') return <div />;

  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">{field.label}</label>
      <div className="relative">
        {field.type === 'select' && field.options ? (
          <select
            className="w-full rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-[var(--color-brand-500)]"
            style={inputStyles}
          >
            <option value="">—</option>
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type={field.type || 'text'}
            readOnly={field.readOnly}
            placeholder={field.readOnly ? '' : undefined}
            className={`w-full rounded-lg py-1.5 text-sm outline-none transition-colors focus:border-[var(--color-brand-500)] ${
              field.readOnly ? 'text-[var(--color-text-secondary)]' : ''
            } ${field.hasSearch ? 'pl-2.5 pr-8' : 'px-2.5'}`}
            style={inputStyles}
          />
        )}
        {field.hasSearch && (
          <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)]">
            <SearchIcon size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function DataTable({ config }: { config?: FormConfig }) {
  const cols = config?.tableColumns || defaultTableColumns;

  return (
    <FormSection title="รายการ">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {cols.map(col => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={cols.length} className="px-4 py-10 text-center text-sm text-[var(--color-text-tertiary)]">
                <div className="flex flex-col items-center gap-2">
                  <Construction size={22} className="text-[var(--color-text-tertiary)] opacity-30" />
                  <span>ไม่มีข้อมูล — รอเชื่อมต่อฐานข้อมูล</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Footer Stats */}
      <div
        className="flex items-center justify-end gap-6 px-4 py-2.5"
        style={{ background: 'var(--color-surface-0)', borderTop: '1px solid var(--color-border-light)' }}
      >
        {(config?.footerStats || ['รายการ', 'จำนวนรวม', 'มูลค่ารวม']).map((stat, i, arr) => (
          <div key={stat} className="flex items-baseline gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{stat}</span>
            <span
              className={`font-bold ${i === arr.length - 1 ? 'text-base text-[var(--color-brand-500)]' : 'text-sm'}`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              —
            </span>
          </div>
        ))}
      </div>
    </FormSection>
  );
}

// ─── Confirm Stock special layout ───

function ConfirmStockLayout({ config }: { config?: FormConfig }) {
  const [stockFilter, setStockFilter] = useState('all');

  const filterOptions = [
    { value: 'all', label: 'สต๊อกทั้งหมด' },
    { value: 'nonzero', label: 'สต๊อกไม่เป็น 0' },
    { value: 'negative', label: 'สต๊อกติดลบ' },
    { value: 'positive', label: 'สต๊อกไม่ติดลบ' },
  ];

  const summaryFields = [
    { label: 'Stone', value: '' },
    { label: 'Total List', value: '—' },
    { label: 'In Qty', value: '—' },
    { label: 'In Amnt', value: '—' },
    { label: 'Out Qty', value: '—' },
    { label: 'Out Amnt', value: '—' },
    { label: 'Return Qty', value: '—' },
    { label: 'Return Amnt', value: '—' },
    { label: 'Stock Qty', value: '—' },
    { label: 'Stock Amnt', value: '—' },
  ];

  return (
    <>
      {/* Summary & Filters */}
      <FormSection title="Confirm Stock">
        <div className="p-4">
          {/* Radio Filters */}
          <div className="mb-4 flex flex-wrap gap-4">
            {filterOptions.map(opt => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
                <input
                  type="radio"
                  name="stockFilter"
                  value={opt.value}
                  checked={stockFilter === opt.value}
                  onChange={e => setStockFilter(e.target.value)}
                  className="accent-[var(--color-brand-500)]"
                />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Search + Summary Grid */}
          <div className="grid grid-cols-[200px_1fr] gap-4">
            {/* Stone Search */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">Stone</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-lg py-1.5 pl-2.5 pr-8 text-sm outline-none transition-colors focus:border-[var(--color-brand-500)]"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-light)' }}
                />
                <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)]">
                  <SearchIcon size={13} />
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
              {summaryFields.map(sf => (
                <div key={sf.label} className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-semibold text-[var(--color-brand-500)]">{sf.label} :</span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{sf.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormSection>

      {/* Data Table */}
      <DataTable config={config} />
    </>
  );
}

// ─── Defaults when no config ───

function defaultHeaderFields(isCheck: boolean): FormFieldDef[] {
  const base: FormFieldDef[] = [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
  ];
  if (isCheck) {
    return [...base, { name: 'item', label: 'รายการ' }, { name: 'jobNo', label: 'เบอร์งาน' }, { name: 'detail', label: 'รายละเอียด', colSpan: 2 }];
  }
  return [...base, { name: 'ref', label: 'เลขที่อ้างอิง' }, { name: 'customer', label: 'รหัสลูกค้า / ผู้ขาย' }, { name: 'detail', label: 'รายละเอียด', colSpan: 2 }];
}

const defaultTableColumns: TableColumnDef[] = [
  { key: 'seq', label: 'ลำดับ' },
  { key: 'stoneCode', label: 'รหัสพลอย' },
  { key: 'unit', label: 'หน่วย' },
  { key: 'grade', label: 'สุง' },
  { key: 'weight', label: 'น้ำหนัก', align: 'right' },
  { key: 'qty', label: 'จำนวน', align: 'right' },
  { key: 'price', label: 'ราคา', align: 'right' },
  { key: 'total', label: 'รวม', align: 'right' },
  { key: 'warehouse', label: 'คลัง' },
];
