import { Palette, Printer, FileSpreadsheet, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useState, useRef, useEffect } from 'react';
import NotificationDropdown from './NotificationDropdown';
import UserAvatarDropdown from './UserAvatarDropdown';

export default function GlobalTopbar() {
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrintPDF = () => {
    setShowExportMenu(false);
    window.dispatchEvent(new CustomEvent('app-print'));
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => {
      window.print();
    });
  };

  const handleExportExcel = () => {
    setShowExportMenu(false);
    const event = new CustomEvent('app-export', {
      detail: { type: 'excel' },
      cancelable: true,
    });
    const handled = !window.dispatchEvent(event);
    if (!handled) {
      // Generic table fallback
      const table = document.querySelector('table');
      if (table) {
        const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
          Array.from(tr.querySelectorAll('th, td')).map(td => `"${td.textContent?.trim().replace(/"/g, '""') || ''}"`).join(',')
        );
        const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Export_${document.title || 'Data'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleExportCSV = () => {
    setShowExportMenu(false);
    const event = new CustomEvent('app-export', {
      detail: { type: 'csv' },
      cancelable: true,
    });
    const handled = !window.dispatchEvent(event);
    if (!handled) {
      const table = document.querySelector('table');
      if (table) {
        const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
          Array.from(tr.querySelectorAll('th, td')).map(td => `"${td.textContent?.trim().replace(/"/g, '""') || ''}"`).join(',')
        );
        const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Export_${document.title || 'Data'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <header
      className="app-global-topbar flex items-center justify-between h-11 sm:h-12 px-4 sm:px-6 w-full"
      style={{
        background: 'var(--color-ui-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-panel)',
      }}
    >
      {/* Left: System Status / Context Badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider uppercase font-mono truncate">
            Factory ERP
          </span>
        </div>
      </div>

      {/* Right: [Print / Export Dropdown] -> [Notification Bell] -> [Theme Palette] -> [User Avatar Dropdown] */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* 1. Print / Export Dropdown */}
        <div className="relative z-[100]" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center border-none cursor-pointer justify-center rounded-lg transition-colors duration-150 ${
              showExportMenu
                ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]'
            }`}
            title="ส่งออกหน้านี้"
            aria-label="Export or Print this page"
          >
            <Printer size={18} />
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 z-[100] mt-2 w-48 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-2 animate-in fade-in zoom-in-95 duration-100"
              style={{ boxShadow: 'var(--shadow-dropdown)' }}
            >
              <div className="mb-1 px-3 pt-1 text-[length:var(--erp-text-meta)] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                ส่งออกหน้านี้
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold"
              >
                <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                <span>Export to Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold"
              >
                <FileText size={16} className="text-blue-600 shrink-0" />
                <span>Export to CSV</span>
              </button>
              <div className="my-1.5 h-px w-full bg-[var(--color-border-light)]" />
              <button
                type="button"
                onClick={handlePrintPDF}
                className="flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold"
              >
                <Printer size={16} className="text-[var(--color-brand-600)] shrink-0" />
                <span>Print / PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Notification Dropdown */}
        <NotificationDropdown />

        {/* 2. Theme Palette Switcher */}
        <div className="relative z-[100]" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center border-none cursor-pointer justify-center rounded-lg transition-colors duration-150 ${
              showThemeMenu
                ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]'
            }`}
            title="เปลี่ยนธีมสี (Theme)"
            aria-label="Change theme"
          >
            <Palette size={18} />
          </button>

          {showThemeMenu && (
            <div
              className="absolute right-0 z-[100] mt-2 w-48 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-2 animate-in fade-in zoom-in-95 duration-100"
              style={{ boxShadow: 'var(--shadow-dropdown)' }}
            >
              <div className="mb-1 px-3 pt-1 text-[length:var(--erp-text-meta)] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                UI Themes
              </div>
              <button
                type="button"
                onClick={() => {
                  setTheme('royal-white');
                  setShowThemeMenu(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors ${
                  theme === 'royal-white'
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold'
                    : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[var(--color-border-default)]"
                  style={{ background: 'var(--color-theme-preview-royal)' }}
                />
                Royal White
              </button>
              <button
                type="button"
                onClick={() => {
                  setTheme('dark-gold');
                  setShowThemeMenu(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors ${
                  theme === 'dark-gold'
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold'
                    : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[var(--color-border-default)]"
                  style={{ background: 'var(--color-theme-preview-gold)' }}
                />
                Dark Gold
              </button>
              <button
                type="button"
                onClick={() => {
                  setTheme('modern-dark');
                  setShowThemeMenu(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors ${
                  theme === 'modern-dark'
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold'
                    : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[var(--color-border-default)]"
                  style={{ background: 'var(--color-theme-preview-dark)' }}
                />
                Modern Dark
              </button>
            </div>
          )}
        </div>

        {/* Subtle separator */}
        <div className="h-4 w-px bg-[var(--color-border-light)] mx-0.5 hidden sm:block" />

        {/* 3. User Avatar Dropdown */}
        <UserAvatarDropdown />
      </div>
    </header>
  );
}
