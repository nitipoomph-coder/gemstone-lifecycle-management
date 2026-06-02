import { useState, useEffect, useRef } from 'react';
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
  const scrollRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState<'top' | 'middle' | 'bottom'>('top');

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

  // Handle scroll events to show/hide fade gradients
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    if (scrollTop === 0) {
      setScrollState('top');
    } else if (Math.ceil(scrollTop + clientHeight) >= scrollHeight) {
      setScrollState('bottom');
    } else {
      setScrollState('middle');
    }
  };

  // ─── Collapsed state ───
  if (!isOpen) {
    return (
      <aside
        className="flex h-screen w-[60px] min-w-[60px] flex-col items-center transition-all duration-300 relative z-20 shadow-lg"
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

        <div className="brand-accent-line mx-3 w-8 mb-2" />

        {/* Icons only — click to expand sidebar + open group */}
        <nav className="flex flex-1 flex-col items-center gap-1.5 py-2 w-full px-2">
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
        <div className="py-3 w-full flex justify-center" style={{ borderTop: '1px solid var(--color-sidebar-divider)' }}>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm"
            style={{ 
              background: 'var(--color-brand-500)',
              color: 'var(--color-text-inverse)'
            }}
            title="มหาเศรษฐี ศรีมงคล — ฝ่ายขาย"
          >
            อิชิ
          </div>
        </div>
      </aside>
    );
  }

  // ─── Expanded state ───
  return (
    <aside
      className="flex h-screen w-[270px] min-w-[270px] flex-col transition-all duration-300 relative z-20 shadow-xl"
      style={{ background: 'var(--color-sidebar)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <button
          onClick={() => navigate('/')}
          className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
        >
          <div
            className="truncate text-[20px] font-bold tracking-wider"
            style={{ 
              fontFamily: 'var(--font-logo)', 
              lineHeight: '1.1',
              background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-300))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            JEWELRY
          </div>
          <div className="text-[10px] font-bold text-[var(--color-text-secondary)] tracking-[0.15em] font-sans mt-0.5 uppercase" style={{ lineHeight: '1.2' }}>
            Smart Factory
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

      <div className="brand-accent-line mx-5 mb-3" />

      {/* Navigation with scroll fade wrapper */}
      <div className={`flex-1 overflow-hidden scroll-fade-container ${scrollState !== 'top' ? 'fade-top' : ''} ${scrollState !== 'bottom' ? 'fade-bottom' : ''}`}>
        <nav 
          ref={scrollRef}
          onScroll={handleScroll}
          className="custom-scrollbar h-full overflow-y-auto px-3 py-1"
        >
          {menuConfig.map(group => (
            <NavGroup
              key={group.id}
              group={group}
              isOpen={openGroupId === group.id}
              onToggle={() => handleGroupToggle(group.id)}
              collapsed={false}
            />
          ))}
          {/* Spacer for bottom padding */}
          <div className="h-6"></div>
        </nav>
      </div>

      {/* Footer (User Profile + Hero Background) */}
      <div
        className="sidebar-hero-bg flex items-center gap-3 px-5 py-4 mt-auto"
        style={{ 
          borderTop: '1px solid var(--color-sidebar-divider)',
          '--hero-bg-url': 'url(/src/assets/hero.png)' 
        } as React.CSSProperties}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold relative z-10 shadow-sm"
          style={{ 
            background: 'var(--color-brand-500)',
            color: 'var(--color-text-inverse)'
          }}
        >
          อิชิ
        </div>
        <div className="min-w-0 flex-1 relative z-10">
          <div className="truncate text-[13.5px] font-bold text-[var(--color-sidebar-text-active)] drop-shadow-sm">
            มหาเศรษฐี ศรีมงคล
          </div>
          <div className="text-[11px] font-medium text-[var(--color-sidebar-text)] opacity-80 mt-0.5">
            ฝ่ายขาย
          </div>
        </div>
      </div>
    </aside>
  );
}
