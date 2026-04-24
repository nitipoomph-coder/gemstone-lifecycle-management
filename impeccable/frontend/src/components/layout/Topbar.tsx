import { useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, ChevronRight, Palette } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useRef, useEffect } from 'react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface TopbarProps {
  breadcrumb: BreadcrumbItem[];
}

export default function Topbar({ breadcrumb }: TopbarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="flex h-14 min-h-[56px] items-center gap-4 px-6"
      style={{
        background: 'var(--color-surface-1)',
        borderBottom: '1px solid var(--color-border-light)',
      }}
    >
      {/* Breadcrumb — clickable */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumb.map((item, i) => {
          const isLast = i === breadcrumb.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight size={12} className="text-[var(--color-text-tertiary)] opacity-40" />
              )}
              {item.path && !isLast ? (
                <button
                  onClick={() => navigate(item.path!)}
                  className="rounded px-1 py-0.5 text-[var(--color-text-tertiary)] transition-colors duration-150 hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)]"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={
                    isLast
                      ? 'font-medium text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-tertiary)]'
                  }
                >
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div
        className="flex min-w-[220px] items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-150 focus-within:border-[var(--color-brand-500)]"
        style={{
          background: 'var(--color-surface-0)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <Search size={14} className="text-[var(--color-text-tertiary)]" />
        <input
          type="text"
          placeholder="ค้นหาเอกสาร, รหัสพลอย..."
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-[var(--color-text-tertiary)]"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]"
          title="การแจ้งเตือน"
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
            style={{
              background: 'var(--color-danger-500)',
              border: '2px solid var(--color-surface-1)',
            }}
          />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]"
          title="ตั้งค่า"
        >
          <Settings size={18} />
        </button>

        {/* Theme Switcher */}
        <div className="relative z-[100]" ref={themeMenuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 ${showThemeMenu ? 'bg-[var(--color-surface-0)] text-[var(--color-brand-500)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]'}`}
            title="เปลี่ยนธีม"
          >
            <Palette size={18} />
          </button>
          
          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-2 shadow-lg z-[100] animate-fade-in-up">
              <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                UI Themes
              </div>
              <button
                onClick={() => { setTheme('royal-white'); setShowThemeMenu(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${theme === 'royal-white' ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]'}`}
              >
                <span className="h-3 w-3 rounded-full bg-white border border-slate-300 shadow-sm"></span>
                Royal White
              </button>
              <button
                onClick={() => { setTheme('dark-gold'); setShowThemeMenu(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${theme === 'dark-gold' ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]'}`}
              >
                <span className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                Dark Gold
              </button>
              <button
                onClick={() => { setTheme('modern-dark'); setShowThemeMenu(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${theme === 'modern-dark' ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]'}`}
              >
                <span className="h-3 w-3 rounded-full bg-sky-500 border border-slate-600"></span>
                Modern Dark
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
