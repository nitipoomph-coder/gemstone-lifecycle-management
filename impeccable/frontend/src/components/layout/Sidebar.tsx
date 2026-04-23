import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import NavGroup from '../navigation/NavGroup';
import { menuConfig } from '../../config/menuConfig';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Accordion: only one group open at a time
  const activeGroupId = menuConfig.find(g =>
    g.path ? g.path === location.pathname : (g.items || []).some(item => item.path === location.pathname)
  )?.id || 'procurement';

  const [openGroupId, setOpenGroupId] = useState<string>(activeGroupId);

  useEffect(() => {
    const found = menuConfig.find(g =>
      g.path ? g.path === location.pathname : (g.items || []).some(item => item.path === location.pathname)
    );
    if (found) {
      setOpenGroupId(found.id);
    }
  }, [location.pathname]);

  const handleGroupToggle = (groupId: string) => {
    setOpenGroupId(prev => (prev === groupId ? '' : groupId));
  };

  // ─── Collapsed state ───
  if (!isOpen) {
    return (
      <aside
        className="flex h-screen w-[56px] min-w-[56px] flex-col items-center transition-all duration-300"
        style={{ background: 'var(--color-sidebar)' }}
      >
        {/* Toggle button */}
        <div className="flex w-full justify-center pt-4 pb-3">
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-sidebar-text)] opacity-60 transition-all hover:bg-[var(--color-sidebar-hover)] hover:opacity-100"
            title="ขยายแถบเมนู"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>

        <div className="mx-3 w-8" style={{ borderBottom: '1px solid var(--color-sidebar-divider)' }} />

        {/* Icons only — click to expand sidebar + open group */}
        <nav className="flex flex-1 flex-col items-center gap-1 py-2">
          {menuConfig.map(group => (
            <NavGroup
              key={group.id}
              group={group}
              isOpen={false}
              onToggle={() => {
                setOpenGroupId(group.id);
                onToggle(); // expand sidebar
              }}
              collapsed
            />
          ))}
        </nav>

        {/* User avatar only */}
        <div className="py-3" style={{ borderTop: '1px solid var(--color-sidebar-divider)' }}>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-[var(--color-sidebar-text-active)]"
            style={{ background: 'var(--color-sidebar-hover)' }}
            title="สมชาย วงศ์อัญมณี — ฝ่ายจัดซื้อ"
          >
            สม
          </div>
        </div>
      </aside>
    );
  }

  // ─── Expanded state ───
  return (
    <aside
      className="flex h-screen w-[260px] min-w-[260px] flex-col transition-all duration-300"
      style={{ background: 'var(--color-sidebar)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate('/')}
          className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
        >
          <div
            className="truncate text-[18px] font-bold tracking-wider text-[var(--color-brand-400)]"
            style={{ fontFamily: 'var(--font-logo)', lineHeight: '1.1' }}
          >
            JEWELRY
          </div>
          <div className="text-[10.5px] font-semibold text-[var(--color-text-secondary)] tracking-[0.1em] font-sans" style={{ lineHeight: '1.2' }}>
            SMART FACTORY
          </div>
        </button>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-sidebar-text)] opacity-60 transition-all hover:bg-[var(--color-sidebar-hover)] hover:opacity-100"
          title="ย่อแถบเมนู"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="mx-3 mb-1" style={{ borderBottom: '1px solid var(--color-sidebar-divider)' }} />

      {/* Navigation */}
      <nav className="custom-scrollbar flex-1 overflow-y-auto px-2 py-1">
        {menuConfig.map(group => (
          <NavGroup
            key={group.id}
            group={group}
            isOpen={openGroupId === group.id}
            onToggle={() => handleGroupToggle(group.id)}
            collapsed={false}
          />
        ))}
      </nav>

      {/* Footer */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderTop: '1px solid var(--color-sidebar-divider)' }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[var(--color-sidebar-text-active)]"
          style={{ background: 'var(--color-sidebar-hover)' }}
        >
          สม
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-[var(--color-sidebar-text-active)]">
            สมชาย วงศ์อัญมณี
          </div>
          <div className="text-[11px] text-[var(--color-sidebar-text)] opacity-60">ฝ่ายจัดซื้อ</div>
        </div>
      </div>
    </aside>
  );
}
