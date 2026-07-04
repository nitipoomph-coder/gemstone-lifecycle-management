// src/components/ui/CustomSelect.tsx
import { useState, useEffect, useRef } from 'react';

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  width?: string | number;
  icon?: React.ReactNode;
}

export default function CustomSelect({ value, onChange, options, placeholder = "Select...", width = '100%', icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const selectedOpt = options.find(o => String(o.value) === String(value));

  return (
    <div className={`relative ${isOpen ? 'z-[9999]' : 'z-[10]'}`} ref={menuRef} style={{ width }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 10,
          border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)',
          color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 700,
          outline: 'none', cursor: 'pointer',
          boxShadow: '0 2px 6px color-mix(in srgb, var(--color-surface-900) 5%, transparent)',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
        }}
        className="hover:border-brand-400 focus:border-brand-500"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {icon && <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-brand-600)' }}>{icon}</span>}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{selectedOpt ? selectedOpt.label : placeholder}</span>
        </div>
        <div style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }} className="text-[var(--color-text-tertiary)] flex-shrink-0">
          <svg width="10" height="6" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-1.5 shadow-xl z-[100] animate-fade-in-up custom-scrollbar" style={{ maxHeight: 200, overflowY: 'auto', minWidth: '120px' }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors font-bold ${String(value) === String(opt.value) ? "bg-[var(--color-brand-100)] text-[var(--color-brand-600)]" : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]"}`}
              style={{ border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{opt.label}</span>
              {String(value) === String(opt.value) && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] shadow-[0_0_8px_rgba(var(--color-brand-500),0.6)] ml-2 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
