import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FilePlus, Save, Pencil, Search, Trash2, Printer, FileSpreadsheet, X,
  Undo2, Blocks, ArrowLeft, Loader2
} from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { menuConfig } from '../config/menuConfig';

// Map group id to first item's path for breadcrumb (4 กลุ่มตาม DFD)
const groupFirstPath: Record<string, string> = {
  procurement: '/procurement/purchase',
  orders: '/orders/create',
  sample: '/sample/order',
  inventory: '/inventory/check-dispatch',
  'spare-parts': '/spare-parts/order',
  subcontract: '/subcontract/vendor-performance',
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  let groupLabel = '';
  let groupId = '';
  let itemLabel = '';
  let itemCode = '';

  for (const group of menuConfig) {
    const found = (group.items || []).find(item => item.path === location.pathname);
    if (found) {
      groupLabel = group.label;
      groupId = group.id;
      itemLabel = found.label;
      itemCode = found.code || '';
      break;
    }
  }

  const isCheckPage = itemLabel.includes('ตรวจสอบ') || itemLabel.includes('Confirm');

  const breadcrumb = [
    { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
    { label: groupLabel, path: groupFirstPath[groupId] || '/' },
    { label: itemCode ? `${itemLabel} (${itemCode})` : itemLabel },
  ];

  // Determine which toolbar to use
  const activeToolbar = isCheckPage ? checkToolbarButtons : toolbarButtons;

  return (
    <>
      <Topbar breadcrumb={breadcrumb} />
      <div className="content-scrollbar flex flex-1 flex-col overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-5 py-2 bg-[var(--color-surface-0)] border-b border-[var(--color-border-light)] z-10" style={{ boxShadow: '0 2px 12px -4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)' }}>
          {activeToolbar.map(btn => {
            if (btn.id.startsWith('sep')) {
              return <span key={btn.id} className="mx-1 h-5 w-px bg-[var(--color-border-default)]" />;
            }
            if (btn.id === 'search' && showSearch) {
              return (
                <div key="search-input" className="flex items-center bg-[var(--color-surface-0)] border border-[var(--color-brand-500)] rounded-lg px-2.5 py-1.5 mx-1 shadow-sm transition-all animate-fade-in">
                  <Search size={14} className="text-[var(--color-brand-500)] mr-2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="ค้นหา..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setShowSearch(false);
                        setSearchText('');
                      }
                    }}
                    onBlur={() => setShowSearch(false)}
                    className="bg-transparent border-none outline-none text-[12px] font-semibold w-48 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] placeholder:font-medium"
                  />
                </div>
              );
            }
            return (
              <button
                key={btn.id}
                onClick={() => {
                  if (btn.id === 'close') navigate(-1);
                  else if (btn.id === 'search') setShowSearch(true);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold capitalize tracking-wider transition-colors duration-200 cursor-not-allowed opacity-50 ${variantStyles[btn.variant]} ${btn.variant === 'default' ? 'border border-[var(--color-border-light)]' : 'border-none'}`}
                title="ฟังก์ชันนี้อยู่ระหว่างการพัฒนา"
                disabled
              >
                {btn.icon && <btn.icon size={14} />}
                <span className="hidden sm:inline">{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div 
            className="flex flex-col items-center justify-center p-12 max-w-2xl w-full text-center relative overflow-hidden"
            style={{
              background: 'var(--color-surface-0)',
              borderRadius: '24px',
              border: '1px dashed var(--color-border-strong)',
              boxShadow: '0 10px 40px -10px color-mix(in srgb, var(--color-surface-900) 8%, transparent)'
            }}
          >
            {/* Background Pattern subtle */}
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(var(--color-text-primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Icon Container */}
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-[var(--color-brand-500)] opacity-10 rounded-3xl blur-xl animate-pulse"></div>
                <div 
                  className="flex items-center justify-center w-24 h-24 rounded-3xl relative z-10"
                  style={{
                    background: 'var(--color-surface-0)',
                    border: '1px solid var(--color-border-light)',
                    boxShadow: '0 4px 20px color-mix(in srgb, var(--color-surface-900) 5%, transparent)'
                  }}
                >
                  <Blocks size={40} className="text-[var(--color-brand-500)] opacity-80" />
                </div>
                {/* Small spinning loader badge */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-surface-0)] border border-[var(--color-border-light)] shadow-sm flex items-center justify-center z-20">
                  <Loader2 size={14} className="text-[var(--color-text-tertiary)] animate-spin" />
                </div>
              </div>

              {/* Badges */}
              <div 
                className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border"
                style={{ 
                  background: 'color-mix(in srgb, var(--color-warning-500) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-warning-500) 30%, transparent)'
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning-500)] animate-pulse shadow-[0_0_8px_var(--color-warning-500)]"></span>
                <span 
                  className="text-[10px] font-black tracking-widest capitalize"
                  style={{ color: 'var(--color-warning-500)' }}
                >
                  In Development
                </span>
              </div>

              <h2 className="text-[2rem] font-black tracking-tight text-[var(--color-text-primary)] mb-4 font-display leading-none">
                {itemLabel ? (
                  <>โมดูล <span className="text-[var(--color-brand-600)]">{itemLabel}</span></>
                ) : (
                  <>ฟังก์ชันกำลังพัฒนา</>
                )}
              </h2>
              
              <p className="text-[14px] font-medium text-[var(--color-text-tertiary)] max-w-md mx-auto leading-relaxed mb-8">
                โมดูล {itemCode && <strong className="text-[var(--color-text-secondary)]">{itemCode}</strong>} นี้ถูกวางโครงสร้างไว้เรียบร้อยแล้ว และอยู่ในแผนการเชื่อมต่อระบบ API และฐานข้อมูลในระยะถัดไป
              </p>
              
              <button 
                onClick={() => navigate(-1)}
                className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 overflow-hidden cursor-pointer border-none"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-text-primary)';
                  e.currentTarget.style.color = 'var(--color-surface-0)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--color-surface-2)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
              >
                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                ย้อนกลับ
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
