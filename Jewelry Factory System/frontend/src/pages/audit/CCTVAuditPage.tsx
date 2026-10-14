// CCTV IT Audit Report — fill the checks on screen, print, sign by hand.
// Route: /audit/cctv-report (admin) · Zero-DB: form kept as JSON (localStorage + Import/Export).
import { useMemo, useRef, useState } from 'react';
import { Download, Printer, Trash2, Upload, Sparkles } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import CctvAuditTable from '../../components/audit/CctvAuditTable';
import CustomSelect from '../../components/ui/CustomSelect';
import { ErpButton } from '../../components/ui/ErpButtons';
import { BREADCRUMBS } from '../../config/breadcrumbs';
import { THAI_MONTHS } from '../../config/cctvAuditConfig';
import { useCctvAuditForm } from '../../hooks/useCctvAuditForm';

export default function CCTVAuditPage() {
  const {
    form,
    isGenerating,
    generate,
    importFile,
    exportForm,
    clearForm,
    onCycleStatus,
    onSetCell,
    onToggleHoliday,
    onSetMeta,
  } = useCctvAuditForm();

  const today = new Date();
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [sundayIsHoliday, setSundayIsHoliday] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthOptions = useMemo(
    () => THAI_MONTHS.map((label, i) => ({ value: String(i + 1), label })),
    [],
  );
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1].map((y) => ({ value: String(y), label: `${y + 543} (${y})` }));
  }, []);

  const handleGenerate = () => {
    if (form && !window.confirm('ฟอร์มปัจจุบันจะถูกแทนที่ด้วยฟอร์มใหม่ ต้องการดำเนินการต่อหรือไม่?\n(แนะนำให้ Export JSON เก็บไว้ก่อน)')) {
      return;
    }
    void generate(Number(year), Number(month), sundayIsHoliday);
  };

  const handleClear = () => {
    if (window.confirm('ล้างฟอร์มปัจจุบันออกจากเบราว์เซอร์นี้?\n(ถ้ายังไม่ได้ Export JSON ข้อมูลจะหาย)')) clearForm();
  };

  return (
    <div className="erp-page-container flex flex-col h-full bg-[var(--color-ui-canvas)]">
      <div className="no-print">
        <PageHeader breadcrumb={BREADCRUMBS.AUDIT_CCTV_REPORT} contentLayout="workspace" />
      </div>

      <div className="app-page-scroll content-scrollbar p-2.5">
        <div className="app-content-frame app-content-frame--workspace flex flex-col gap-2.5">
          {/* ─── Toolbar (screen only) ─────────────────────────────────── */}
          <div className="no-print flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] p-2.5 shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = '';
              }}
            />
            <ErpButton icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()}>
              Import Form
            </ErpButton>

            <span className="mx-1 h-5 w-px bg-[var(--color-border-light)]" aria-hidden="true" />

            <CustomSelect value={month} onChange={setMonth} options={monthOptions} width={140} ariaLabel="เดือน" />
            <CustomSelect value={year} onChange={setYear} options={yearOptions} width={130} ariaLabel="ปี" />
            <label className="flex items-center gap-1.5 text-[length:var(--erp-text-control)] text-[var(--color-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={sundayIsHoliday}
                onChange={(e) => setSundayIsHoliday(e.target.checked)}
              />
              วันอาทิตย์เป็นวันหยุด
            </label>
            <ErpButton variant="primary" icon={<Sparkles size={14} />} loading={isGenerating} onClick={handleGenerate}>
              Generate
            </ErpButton>

            <div className="ml-auto flex items-center gap-2">
              <ErpButton icon={<Download size={14} />} disabled={!form} onClick={exportForm}>
                Export JSON
              </ErpButton>
              <ErpButton variant="primary" icon={<Printer size={14} />} disabled={!form} onClick={() => window.print()}>
                Print
              </ErpButton>
              <ErpButton variant="danger" icon={<Trash2 size={14} />} disabled={!form} onClick={handleClear}>
                Clear
              </ErpButton>
            </div>
          </div>

          <p className="no-print m-0 text-[length:var(--erp-text-dense)] text-[var(--color-text-tertiary)]">
            ฟอร์มถูกเก็บในเบราว์เซอร์เครื่องนี้ (ไม่บันทึกลงฐานข้อมูล) — กด Export JSON เก็บไว้เป็นหลักฐานก่อนพิมพ์ทุกครั้ง
          </p>

          {/* ─── Sheet ─────────────────────────────────────────────────── */}
          {form ? (
            <div className={isGenerating ? 'opacity-50 pointer-events-none' : ''}>
              <CctvAuditTable
                form={form}
                onCycleStatus={onCycleStatus}
                onSetCell={onSetCell}
                onToggleHoliday={onToggleHoliday}
                onSetMeta={onSetMeta}
              />
            </div>
          ) : (
            <div className="no-print rounded-lg border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-0)] p-8 text-center text-[length:var(--erp-text-body)] text-[var(--color-text-secondary)]">
              ยังไม่มีฟอร์ม — เลือกเดือน/ปีแล้วกด Generate (ใช้คอลัมน์เริ่มต้น) หรือ Import ไฟล์ JSON ที่เคยใช้
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
