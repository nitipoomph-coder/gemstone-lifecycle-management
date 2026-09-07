import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

type ContentLayout = 'dashboard' | 'dashboard-wide' | 'workspace';

interface PageHeaderProps {
  breadcrumb: BreadcrumbItem[];
  contentLayout?: ContentLayout;
  rightContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function PageHeader({ breadcrumb, contentLayout = 'workspace', rightContent, bottomContent, icon }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const frameClassName = `app-content-frame app-content-frame--${contentLayout}`;

  return (
    <header className="flex flex-col py-3.5 bg-[var(--color-ui-canvas)]">
      <div className={`${frameClassName} app-page-inline flex flex-wrap items-start justify-between gap-4`}>
        {/* Left: Navigation & Branding */}
        <div className="flex min-w-0 items-center gap-4 flex-1">
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 8,
                background: 'var(--color-ui-surface)', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-light)', cursor: 'pointer',
                transition: 'color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
              }}
              className="flex-shrink-0 hover:border-[var(--color-brand-600)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]"
              title="Back"
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Premium Titles Layout */}
          <div className="flex min-w-0 flex-col">
            {breadcrumb.length > 1 && (
              <div className="mb-1 flex flex-wrap min-w-0 items-center gap-1.5 text-[length:var(--erp-text-dense)] font-bold leading-none text-[var(--color-brand-600)]">
                {breadcrumb.slice(0, -1).map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight size={10} className="text-[var(--color-brand-600)] opacity-55" />}
                    {item.path ? (
                      <button onClick={() => navigate(item.path!)} className="truncate transition-colors hover:text-[var(--color-brand-600)] cursor-pointer bg-transparent border-none p-0 outline-none font-bold">
                        {item.label}
                      </button>
                    ) : (
                      <span className="truncate">{item.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
            <h1 className="m-0 flex flex-wrap min-w-0 items-center gap-2 text-[length:var(--erp-text-page)] font-extrabold leading-tight text-[var(--color-text-primary)] font-display">
              {icon && <span className="flex items-center text-[var(--color-brand-600)]">{icon}</span>}
              <span className="truncate">{breadcrumb[breadcrumb.length - 1].label}</span>
            </h1>
          </div>
        </div>

        {/* Right: Tools / Actions */}
        {rightContent && (
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {rightContent}
          </div>
        )}
      </div>

      {/* Bottom Content / Filters */}
      {bottomContent && (
        <div className={`${frameClassName} app-page-inline mt-4`}>
          {bottomContent}
        </div>
      )}
    </header>
  );
}
