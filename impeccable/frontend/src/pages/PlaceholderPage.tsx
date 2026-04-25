import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FilePlus, Save, Pencil, Search, Trash2, Printer, FileSpreadsheet, X,
  Undo2, AlertTriangle,
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
    { label: 'JEWELRY SMART FACTORY', path: '/' },
    { label: groupLabel, path: groupFirstPath[groupId] || '/' },
    { label: itemCode ? `${itemLabel} (${itemCode})` : itemLabel },
  ];

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
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)' }}>
            <div className="flex items-center justify-center mb-6 w-20 h-20 rounded-full" style={{ background: 'var(--color-warning-50)', border: '2px solid var(--color-warning-100)' }}>
               <AlertTriangle size={36} className="text-[var(--color-warning-600)]" />
            </div>
            <h2 className="text-2xl font-bold tracking-[0.1em] text-[var(--color-text-primary)] mb-3 text-center" style={{ fontFamily: 'var(--font-logo)' }}>
              SYSTEM INTEGRATION PENDING
            </h2>
            <div className="text-center px-6">
              <p className="text-[15px] font-medium text-[var(--color-text-secondary)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {itemLabel ? (
                  <>เมนู <span className="text-[var(--color-brand-600)] font-bold">{itemCode ? `${itemLabel} (${itemCode})` : itemLabel}</span></>
                ) : (
                  <>หน้านี้</>
                )} อยู่ระหว่างการพัฒนา
              </p>
              <p className="text-[13px] text-[var(--color-text-tertiary)] max-w-md mx-auto leading-relaxed">
                สถานะตอนนี้ยังไม่ได้เชื่อมต่อกับฐานข้อมูลระบบ <strong className="text-[var(--color-text-secondary)]">CLL Jewelry</strong> <br />
                ฟังก์ชันนี้จะเปิดให้ใช้งานอย่างเต็มรูปแบบในเฟสถัดไป
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/')}
              className="mt-8 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95 flex items-center gap-2"
              style={{ background: 'var(--color-brand-600)', color: 'var(--color-text-inverse)', fontFamily: 'var(--font-display)' }}
            >
              <Undo2 size={16} />
              กลับหน้าภาพรวม
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


