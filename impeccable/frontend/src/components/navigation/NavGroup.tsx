import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  PackageCheck,
  ClipboardList,
  Factory,
  FlaskConical,
  BarChart3,
  Home,
} from 'lucide-react';
import type { NavMenuGroup } from '../../types';

const iconComponents: Record<string, React.ElementType> = {
  'package-check': PackageCheck,
  'clipboard-list': ClipboardList,
  'factory': Factory,
  'flask-conical': FlaskConical,
  'bar-chart-3': BarChart3,
  'home': Home,
};

interface NavGroupProps {
  group: NavMenuGroup;
  isOpen: boolean;
  onToggle: () => void;
  collapsed?: boolean;
}

export default function NavGroup({ group, isOpen, onToggle, collapsed = false }: NavGroupProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const items = group.items || [];
  const isGroupActive = group.path
    ? location.pathname === group.path
    : items.some(item => location.pathname === item.path);
  const IconComponent = iconComponents[group.icon] || PackageCheck;

  // Collapsed mode — icon only with tooltip
  if (collapsed) {
    return (
      <div className="mb-1 flex justify-center">
        <button
          onClick={() => {
            if (group.path) {
              navigate(group.path);
            } else {
              onToggle();
            }
          }}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] ${
            isGroupActive ? 'bg-[var(--color-sidebar-hover)]' : ''
          }`}
          title={group.label}
        >
          <IconComponent
            size={18}
            className={`transition-colors duration-150 ${
              isGroupActive
                ? 'text-[var(--color-sidebar-accent)]'
                : 'text-[var(--color-sidebar-text)]'
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      {/* Group Header */}
      <button
        onClick={() => {
          if (group.path) {
            navigate(group.path);
          } else {
            onToggle();
          }
        }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)]"
      >
        <span className="flex w-5 shrink-0 items-center justify-center">
          <IconComponent
            size={15}
            className={`transition-colors duration-150 ${
              isGroupActive || isOpen
                ? 'text-[var(--color-sidebar-accent)]'
                : 'text-[var(--color-sidebar-text)]'
            }`}
          />
        </span>
        <span
          className={`flex-1 text-[13px] font-medium transition-colors duration-150 ${
            isGroupActive || isOpen
              ? 'text-[var(--color-sidebar-text-active)]'
              : 'text-[var(--color-sidebar-text)]'
          }`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {group.label}
        </span>
        {items.length > 0 && (
          <ChevronRight
            size={12}
            className={`shrink-0 text-[var(--color-sidebar-text)] opacity-50 transition-transform duration-300 ${
              isOpen ? 'rotate-90' : ''
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        )}
      </button>

      {/* Group Items — accordion animation */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isOpen ? `${items.length * 36}px` : '0px',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {items.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-2 rounded py-1.5 pl-10 pr-3 text-left transition-all duration-150 ${
                isActive
                  ? 'bg-[oklch(0.30_0.025_75)]'
                  : 'hover:bg-[var(--color-sidebar-hover)]'
              }`}
            >
              <span
                className={`flex-1 truncate text-[12.5px] leading-relaxed transition-colors duration-150 ${
                  isActive
                    ? 'font-medium text-[var(--color-sidebar-accent)]'
                    : 'text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-active)]'
                }`}
                title={item.label}
              >
                {item.label}
              </span>
              {item.code && (
                <span className="shrink-0 text-[10px] text-[var(--color-sidebar-text)] opacity-40">
                  {item.code}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
