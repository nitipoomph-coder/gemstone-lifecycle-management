import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import NavGroup from '../navigation/NavGroup';
import { menuConfig } from '../../config/menuConfig';
import { getActiveGroupId } from '../../utils/navigationUtils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState<'top' | 'middle' | 'bottom'>('top');

  const role = (localStorage.getItem('auth_role') || 'sales').toLowerCase();
  const filteredMenu = menuConfig.filter(g => !g.roles || g.roles.includes(role));

  // Pure derived active group id directly from current route
  const activeGroupId = getActiveGroupId(filteredMenu, location.pathname, location.search);

  // Track if user manually toggled an accordion group on the current page
  const [userToggledGroupId, setUserToggledGroupId] = useState<{ pathname: string; groupId: string | null } | null>(null);

  // When pathname changes or on initial render, openGroupId automatically equals activeGroupId.
  // If user toggled a group on the current pathname, respect that toggle.
  const openGroupId = userToggledGroupId && userToggledGroupId.pathname === location.pathname
    ? userToggledGroupId.groupId
    : activeGroupId;

  const handleGroupToggle = (groupId: string) => {
    setUserToggledGroupId({
      pathname: location.pathname,
      groupId: openGroupId === groupId ? null : groupId,
    });
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

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Collapsed state Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
            title="Expand Menu"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>

        <div className="brand-accent-line mx-3 w-8 mb-2" />

        {/* Icons only — click to expand sidebar + open group */}
        <nav className="flex flex-1 flex-col items-center gap-1.5 py-2 w-full px-2">
          {filteredMenu.map((group, index) => {
            const isNewSection = index > 0 && group.section !== filteredMenu[index - 1].section;
            return (
              <div key={group.id} className="w-full flex flex-col items-center">
                {isNewSection && (
                  <div className="w-6 h-[1px] my-1.5 bg-[var(--color-border-light)] opacity-30" />
                )}
                <NavGroup
                  key={group.id}
                  group={group}
                  isOpen={false}
                  isActive={group.id === activeGroupId}
                  onToggle={() => {
                    setUserToggledGroupId({ pathname: location.pathname, groupId: group.id });
                    onToggle(); // expand sidebar
                  }}
                  collapsed
                />
              </div>
            );
          })}
        </nav>
      </aside>
    );
  }

  // ——— Expanded state ———
  return (
    <aside
      className="flex h-screen w-[270px] min-w-[270px] flex-col transition-all duration-300 relative z-20 shadow-xl"
      style={{ background: 'var(--color-sidebar)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <button
          onClick={() => navigate('/')}
          className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80 select-none cursor-pointer"
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
          <div className="text-[10px] font-bold text-[var(--color-text-secondary)] tracking-[0.15em] font-sans mt-0.5 capitalize" style={{ lineHeight: '1.2' }}>
            Factory System
          </div>
        </button>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-sidebar-text)] opacity-60 transition-all hover:bg-[var(--color-sidebar-hover)] hover:opacity-100"
          title="Collapse Menu"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--color-border-light)', margin: '0 20px 12px 20px', opacity: 0.5 }} />

      {/* Navigation with scroll fade wrapper */}
      <div className={`flex-1 overflow-hidden scroll-fade-container ${scrollState !== 'top' ? 'fade-top' : ''} ${scrollState !== 'bottom' ? 'fade-bottom' : ''}`}>
        <nav
          ref={scrollRef}
          onScroll={handleScroll}
          className="custom-scrollbar h-full overflow-y-auto px-3 py-1 flex flex-col gap-0.5"
        >
          {filteredMenu.map((group, index) => {
            const isNewSection = index === 0 || group.section !== filteredMenu[index - 1].section;
            return (
              <div key={group.id}>
                {isNewSection && group.section && (
                  <div className={`px-3 select-none ${index === 0 ? 'pt-1.5 pb-1' : 'pt-4 pb-1'}`}>
                    {index > 0 && (
                      <div className="mb-2.5 h-[1px] bg-[var(--color-border-light)] opacity-20" />
                    )}
                    <div className="text-[11px] font-bold text-[var(--color-sidebar-text)] opacity-45 tracking-wide">
                      {group.section}
                    </div>
                  </div>
                )}
                <NavGroup
                  group={group}
                  isOpen={openGroupId === group.id}
                  isActive={group.id === activeGroupId}
                  onToggle={() => handleGroupToggle(group.id)}
                  collapsed={false}
                  onNavigate={() => {
                    if (window.matchMedia('(max-width: 819px)').matches) {
                      onToggle();
                    }
                  }}
                />
              </div>
            );
          })}
          {/* Spacer for bottom padding */}
          <div className="h-6"></div>
        </nav>
      </div>
    </aside>
  );
}
