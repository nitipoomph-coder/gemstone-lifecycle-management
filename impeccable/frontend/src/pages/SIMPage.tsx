import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { 
  FilePlus, 
  Save, 
  Edit3, 
  Search, 
  Trash2, 
  CornerUpLeft, 
  Printer, 
  List, 
  X,
  Search as SearchIcon,
  MinusCircle
} from 'lucide-react';

// --- Default Data ---
const dummyDocIds = [
  'SIM26040255', 'SIM26040256', 'SIM26040257', 'SIM26040258', 
  'SIM26040259', 'SIM26040260', 'SIM26040261', 'SIM26040262', 
  'SIM26040263', 'SIM26040264', 'SIM26040265', 'SIM26040266'
];

const dummyTableData = [
  { seq: 1, gem: '', color: '', shape: '', size: '', char: '', grade: '', height: '', set: '', whs: '', wgt: '', qty: '', price: '', total: '', highlighted: '' },
  { seq: 2, gem: '', color: '', shape: '', size: '', char: '', grade: '', height: '', set: '', whs: '', wgt: '', qty: '', price: '', total: '', highlighted: '' }
];

export default function SIMPage() {
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState('SIM26040261');

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface-0)]">
      {/* Topbar with Breadcrumb */}
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'ห้องตัวอย่าง' },
        { label: 'บันทึกส่งพลอย ห้องตัวอย่าง (SSA)' },
      ]} />

      {/* Action Toolbar */}
      <div className="flex h-12 w-full items-center gap-1 border-b border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-4">
        <button className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]">
          <FilePlus size={15} className="text-amber-400" /> สร้างใหม่
        </button>
        <button className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]">
          <Save size={15} /> บันทึก
        </button>
        <button className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]">
          <Edit3 size={15} className="text-emerald-400" /> แก้ไข
        </button>
        <button className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]">
          <Search size={15} className="text-yellow-400" /> ค้นหา
        </button>
        <div className="mx-1 h-5 w-px bg-[var(--color-border-default)]"></div>
        <button className="flex items-center gap-2 rounded bg-red-950/30 px-3 py-1.5 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-900/50">
          <Trash2 size={15} /> ลบ
        </button>
        <button className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]">
          <CornerUpLeft size={15} /> ยกเลิก
        </button>
        <div className="mx-1 h-5 w-px bg-[var(--color-border-default)]"></div>
        <button className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]">
          <Printer size={15} /> พิมพ์
        </button>
        <button className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]">
          <List size={15} /> รายการ
        </button>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-red-900/50 hover:text-red-400">
          <X size={15} /> ปิด
        </button>
      </div>

      {/* Main Split Content */}
      <div className="flex flex-1 overflow-hidden p-3 gap-3">
        
        {/* Left Pane: Document List */}
        <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-1)]">
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-2)] p-2">
            <span className="text-xs font-bold text-[var(--color-sidebar-accent)]">เลขที่</span>
            <div className="mt-2 flex h-8 w-full items-center gap-2 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-2">
              <input type="text" placeholder="ค้นหา..." className="w-full bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none" />
            </div>
          </div>
          <div className="content-scrollbar flex-1 overflow-y-auto bg-[var(--color-surface-0)] font-mono">
            {dummyDocIds.map(id => (
              <button
                key={id}
                onClick={() => setSelectedDoc(id)}
                className={`w-full border-b border-[var(--color-border-default)]/50 px-3 py-2 text-left text-[13px] transition-colors ${
                  id === selectedDoc 
                    ? 'bg-[var(--color-brand-600)] text-white font-bold tracking-wider' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Right Pane: Document Details */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-1)] shadow-sm">
          
          {/* Header Form Zone */}
          <div className="flex flex-col gap-3 border-b border-[var(--color-border-strong)] p-5">
            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-right text-xs font-medium text-[var(--color-text-tertiary)]">เลขที่</span>
                <input type="text" defaultValue="" className="h-8 w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-[13px] font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-right text-xs font-medium text-[var(--color-text-tertiary)]">วันที่เอกสาร</span>
                <input type="text" defaultValue="" className="h-8 w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 text-center text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-right text-xs font-medium text-[var(--color-text-tertiary)]">เลขที่บิล</span>
                <input type="text" defaultValue="" className="h-8 w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-[13px] font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-right text-xs font-medium text-[var(--color-text-tertiary)]">รวม</span>
                <input type="text" defaultValue="" className="h-8 w-24 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-right text-[13px] font-mono text-[var(--color-brand-500)] outline-none focus:border-[var(--color-brand-500)]" />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 flex items-center gap-2">
                <span className="w-20 shrink-0 text-right text-xs font-medium text-[var(--color-text-tertiary)]">รหัสลูกค้า</span>
                <input type="text" defaultValue="" className="h-8 w-16 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-center text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
                <div className="relative flex-1">
                  <input type="text" defaultValue="" className="h-8 w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
                  <button className="absolute right-1 top-1.5 flex h-5 w-8 items-center justify-center rounded bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]">
                    <SearchIcon size={12} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-right text-xs font-medium text-[var(--color-text-tertiary)]"></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-right text-xs font-medium text-[var(--color-text-tertiary)]">รวมเงิน</span>
                <input type="text" defaultValue="" className="h-8 w-24 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-right text-[13px] font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 flex items-center gap-2">
                <span className="w-20 shrink-0 text-right text-xs font-medium text-[var(--color-text-tertiary)]">เหตุผล</span>
                <input type="text" defaultValue="" className="h-8 w-16 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-center text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
                <input type="text" defaultValue="" className="h-8 flex-1 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-right text-xs font-medium text-[var(--color-text-tertiary)]">สกุลเงิน</span>
                <input type="text" defaultValue="" className="h-8 w-20 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-center text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
                <input type="text" defaultValue="" className="h-8 flex-1 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] px-3 text-right text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)]" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[var(--color-border-light)] bg-black/20 p-2 pl-4 pr-3">
             <span className="text-[14px] font-medium text-[var(--color-text-secondary)]">รายการ</span>
             <button className="flex h-6 w-10 border border-[var(--color-border-strong)] bg-[var(--color-surface-0)] items-center justify-center rounded-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]">
               <MinusCircle size={14} />
             </button>
          </div>

          {/* Grid Zone */}
          <div className="content-scrollbar flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[1200px] border-collapse text-left">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-[12px] font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border-strong)]">
                  <th className="w-12 px-3 py-2 text-center border-r border-[var(--color-border-default)]">ลำดับ</th>
                  <th className="px-3 py-2 border-r border-[var(--color-border-default)]">พลอย</th>
                  <th className="w-16 px-3 py-2 border-r border-[var(--color-border-default)]">สี</th>
                  <th className="w-16 px-3 py-2 border-r border-[var(--color-border-default)]">รูปทรง</th>
                  <th className="w-16 px-3 py-2 border-r border-[var(--color-border-default)]">ขนาด</th>
                  <th className="w-20 px-3 py-2 border-r border-[var(--color-border-default)]">ลักษณะ</th>
                  <th className="w-16 px-3 py-2 border-r border-[var(--color-border-default)]">เกรด</th>
                  <th className="w-16 px-3 py-2 border-r border-[var(--color-border-default)]">สูง</th>
                  <th className="w-16 px-3 py-2 border-r border-[var(--color-border-default)]">ฝัง</th>
                  <th className="w-16 px-3 py-2 border-r border-[var(--color-border-default)]">คลัง</th>
                  <th className="w-24 px-3 py-2 text-right border-r border-[var(--color-border-default)]">น้ำหนัก</th>
                  <th className="w-16 px-3 py-2 text-right border-r border-[var(--color-border-default)]">ใช้</th>
                  <th className="w-24 px-3 py-2 text-right border-r border-[var(--color-border-default)]">ราคา</th>
                  <th className="w-24 px-3 py-2 text-right">รวม</th>
                </tr>
              </thead>
              <tbody className="align-top font-mono text-[13px] text-[var(--color-text-primary)]">
                {dummyTableData.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-0)] hover:bg-[var(--color-surface-2)]">
                    <td className="px-3 py-2 text-center border-r border-[var(--color-border-default)] text-[var(--color-text-secondary)]">
                      {row.seq}
                    </td>
                    <td className="px-3 py-2 border-r border-[var(--color-border-default)]">
                      {row.gem}
                    </td>
                    <td className="px-3 py-2 border-r border-[var(--color-border-default)]">
                      {row.color}
                    </td>
                    <td className="px-3 py-2 border-r border-[var(--color-border-default)]">
                      {row.shape}
                    </td>
                    <td className={`px-3 py-2 border-r border-[var(--color-border-default)]`}>
                      {row.size}
                    </td>
                    <td className="px-3 py-2 border-r border-[var(--color-border-default)]">
                      {row.char}
                    </td>
                    <td className="px-3 py-2 border-r border-[var(--color-border-default)]">
                      {row.grade}
                    </td>
                    <td className="px-3 py-2 border-r border-[var(--color-border-default)]">
                      {row.height}
                    </td>
                    <td className="px-3 py-2 border-r border-[var(--color-border-default)]">
                      {row.set}
                    </td>
                    <td className="px-3 py-2 border-r border-[var(--color-border-default)]">
                      {row.whs}
                    </td>
                    <td className="px-3 py-2 text-right border-r border-[var(--color-border-default)] text-[var(--color-brand-400)]">
                      {row.wgt}
                    </td>
                    <td className="px-3 py-2 text-right border-r border-[var(--color-border-default)] text-[var(--color-success-500)]">
                      {row.qty}
                    </td>
                    <td className="px-3 py-2 text-right border-r border-[var(--color-border-default)] text-[var(--color-sidebar-accent)]">
                      {row.price}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--color-sidebar-accent)]">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Empty state padding for realism */}
            <div className="flex h-32 flex-col items-center justify-center gap-2 opacity-20">
              <span className="font-sans text-[12px] italic text-[var(--color-text-secondary)]">-- ไม่มีพิมพ์รายการเพิ่ม --</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
