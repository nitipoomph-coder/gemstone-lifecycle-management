import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import NavGroup from '../navigation/NavGroup';
import { menuConfig } from '../../config/menuConfig';
import { getActiveGroupId } from '../../utils/navigationUtils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const scrollRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState<'top' | 'middle' | 'bottom'>('top');

  const role = (localStorage.getItem('auth_role') || 'sales').toLowerCase();
  const filteredMenu = menuConfig
    .filter(g => !g.roles || g.roles.includes(role))
    .map(g => ({
      ...g,
      items: g.items?.filter(item => !item.roles || item.roles.includes(role)),
    }));

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

  return (
    <aside
      className="flex h-full flex-col relative z-20 overflow-hidden"
      style={{
        width: isOpen ? 260 : 60,
        minWidth: isOpen ? 260 : 60,
        maxWidth: isOpen ? 260 : 60,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border-light)',
      }}
    >
      {!isOpen ? (
        /* Icons only — click to expand sidebar + open group */
        <nav className="flex flex-1 flex-col items-center gap-1.5 py-3 w-[60px] px-2 animate-fadeIn">
          {filteredMenu.map((group, index) => {
            const isNewSection = index > 0 && group.section !== filteredMenu[index - 1].section;
            return (
              <div key={group.id} className="w-full flex flex-col items-center">
                {isNewSection && (
                  <div className="w-6 h-[1px] my-1.5 bg-[var(--color-border-light)] opacity-40" />
                )}
                <NavGroup
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
      ) : (
        /* Expanded state: Navigation with scroll fade wrapper */
        <div className={`flex-1 overflow-hidden scroll-fade-container w-[260px] animate-fadeIn ${scrollState !== 'top' ? 'fade-top' : ''} ${scrollState !== 'bottom' ? 'fade-bottom' : ''}`}>
          <nav
            ref={scrollRef}
            onScroll={handleScroll}
            className="custom-scrollbar h-full overflow-y-auto px-3 py-2 flex flex-col gap-0.5"
          >
            {filteredMenu.map((group, index) => {
              const isNewSection = index === 0 || group.section !== filteredMenu[index - 1].section;
              return (
                <div key={group.id}>
                  {isNewSection && group.section && (
                    <div className={`px-3 select-none ${index === 0 ? 'pt-1.5 pb-1' : 'pt-3 pb-1'}`}>
                      {index > 0 && (
                        <div className="mb-2 h-[1px] bg-[var(--color-border-light)] opacity-30" />
                      )}
                      <div className="text-[11px] font-bold text-[var(--color-sidebar-text)] opacity-45 tracking-wide uppercase">
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
      )}
    </aside>
  );
}
