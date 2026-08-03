import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ChevronDown, ChevronRight, ChevronLeft, Palette, Package, Gem, User } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useState, useRef, useEffect } from 'react';
import { fetchSearch, type SearchResultItem } from '../../services/poTrackerAPI';
import { psPhotoUrl, attachPhotoFallback } from '../../utils/photoUrl';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

type SearchScope = 'all' | 'order' | 'item' | 'customer' | 'po';
type ContentLayout = 'dashboard' | 'dashboard-wide' | 'workspace';

interface TopbarProps {
  breadcrumb: BreadcrumbItem[];
  hideSearch?: boolean;
  contentLayout?: ContentLayout;
  rightContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  icon?: React.ReactNode;
}

// Using SearchResultItem from API

export default function Topbar({ breadcrumb, hideSearch, contentLayout = 'workspace', rightContent, bottomContent, icon }: TopbarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Universal search state
  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const scopeDropdownRef = useRef<HTMLDivElement>(null);

  const SCOPES: Array<{ value: SearchScope; label: string }> = [
    { value: 'all', label: 'ALL' },
    { value: 'order', label: 'ORDER' },
    { value: 'po', label: 'PO NO' },
    { value: 'item', label: 'ITEM' },
    { value: 'customer', label: 'CUST' },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (scopeDropdownRef.current && !scopeDropdownRef.current.contains(event.target as Node)) {
        setIsScopeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Connect to API for Global Search
  useEffect(() => {
    if (query.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await fetchSearch(query, searchScope);
        setResults(data);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchScope]);

  const handleResultClick = (path: string) => {
    navigate(path);
    setIsSearchFocused(false);
    setQuery('');
  };

  const frameClassName = `app-content-frame app-content-frame--${contentLayout}`;

  return (
    <header
      className="app-topbar flex flex-col py-3.5"
      style={{
        background: 'var(--color-ui-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-panel)',
      }}
    >
      <div className={`${frameClassName} app-page-inline app-topbar__row flex items-center justify-between gap-4`}>
      {/* Left: Navigation & Branding */}
      <div className="app-topbar__left flex min-w-0 items-center gap-4">
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
            className="app-topbar__back flex-shrink-0 hover:border-[var(--color-brand-600)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]"
            title="Back"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Premium Titles Layout */}
        <div className="flex min-w-0 flex-col">
          {breadcrumb.length > 1 && (
            <div className="app-topbar__breadcrumbs mb-1 flex min-w-0 items-center gap-1.5 text-[length:var(--erp-text-dense)] font-bold leading-none text-[var(--color-brand-600)]">
              {breadcrumb.slice(0, -1).map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight size={10} className="text-[var(--color-brand-600)] opacity-55" />}
                  {item.path ? (
                    <button onClick={() => navigate(item.path!)} className="truncate transition-colors hover:text-[var(--color-brand-600)]">
                      {item.label}
                    </button>
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="m-0 flex min-w-0 items-center gap-2 truncate text-[length:var(--erp-text-section)] font-extrabold leading-tight text-[var(--color-text-primary)] font-display">
            {icon && <span className="flex items-center text-[var(--color-brand-600)]">{icon}</span>}
            <span className="truncate">{breadcrumb[breadcrumb.length - 1].label}</span>
          </h1>
        </div>
      </div>

      {/* Right: Tools & Search */}
      <div className="app-topbar__right flex min-w-0 items-center gap-4">
        {/* Universal Search Bar */}
        {!hideSearch && (
          <div className="app-topbar__search relative" ref={searchRef}>
            <div
              className="flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-3 transition-[border-color,box-shadow] duration-150"
              style={{
                background: 'var(--color-ui-surface)',
                border: `1px solid ${isSearchFocused ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                boxShadow: isSearchFocused ? '0 0 0 3px var(--color-ui-focus-ring)' : 'none',
              }}
            >
              {/* Scope Dropdown Custom */}
              <div className="relative" ref={scopeDropdownRef} style={{ borderRight: '1px solid var(--color-border-light)' }}>
                <button
                  type="button"
                  onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
                  className="flex items-center gap-1.5 bg-transparent border-none text-[length:var(--erp-text-meta)] font-black capitalize text-[var(--color-text-tertiary)] outline-none cursor-pointer px-2 py-1.5 hover:text-[var(--color-brand-600)] transition-colors h-full"
                >
                  {SCOPES.find(s => s.value === searchScope)?.label}
                  <ChevronDown size={12} style={{ transform: isScopeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', opacity: 0.65 }} />
                </button>

                {isScopeDropdownOpen && (
                  <div className="absolute left-0 top-full z-[110] mt-2 w-32 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-1.5" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
                    {SCOPES.map(sc => (
                      <button
                        key={sc.value}
                        onClick={() => { setSearchScope(sc.value); setIsScopeDropdownOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[length:var(--erp-text-meta)] font-black capitalize transition-colors border-none cursor-pointer text-left ${searchScope === sc.value ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]'}`}
                      >
                        {sc.label}
                        {searchScope === sc.value && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] ml-2 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="Search anything..."
                value={query}
                onChange={(e) => {
                  const nextQuery = e.target.value;
                  setQuery(nextQuery);
                  if (nextQuery.trim().length < 2) {
                    setResults(null);
                    setSearching(false);
                  }
                }}
                onFocus={() => setIsSearchFocused(true)}
                className="flex-1 bg-transparent border-none text-[length:var(--erp-text-body)] font-semibold text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] placeholder:font-medium min-w-0 px-2"
              />

              <div className="flex-shrink-0 flex items-center justify-center text-[var(--color-text-tertiary)]">
                {searching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-brand-500)] border-t-transparent" />
                ) : (
                  <Search size={16} />
                )}
              </div>
            </div>

            {/* Floating Dropdown Results */}
            {isSearchFocused && query.length >= 2 && results && (
              <div className="absolute left-0 right-0 top-full z-[100] mt-2 flex max-h-[60vh] flex-col overflow-hidden rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)]" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
                {results.length === 0 ? (
                  <div className="p-4 text-center text-[length:var(--erp-text-body)] font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface-0)]">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
                    {['order', 'item', 'customer'].map((type) => {
                      const typeResults = results.filter(r => r.type === type);
                      if (typeResults.length === 0) return null;

                      return (
                        <div key={type} className="mb-2 last:mb-0">
                          <div className="px-3 py-1 text-[length:var(--erp-text-meta)] font-bold capitalize text-[var(--color-text-tertiary)] opacity-60">
                            {type === 'order' ? 'Orders' : type === 'item' ? 'Items' : 'Customers'}
                          </div>
                          {typeResults.map(res => (
                            <button
                              key={res.id}
                              onClick={() => handleResultClick(res.path)}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-0)] group"
                            >
                              {res.itemNo ? (
                                <img
                                  src={psPhotoUrl(res.itemNo)}
                                  alt={res.title}
                                  loading="lazy"
                                  onError={(e) => attachPhotoFallback(e, res.itemNo)}
                                  className="h-12 w-12 rounded-lg object-cover flex-shrink-0 shadow-sm border border-[var(--color-border-light)]"
                                />
                              ) : (
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] transition-colors">
                                  {type === 'order' ? <Package size={20} /> : type === 'item' ? <Gem size={20} /> : <User size={20} />}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-[length:var(--erp-text-body)] font-bold text-[var(--color-text-primary)] truncate">{res.title}</div>
                                <div className="text-[length:var(--erp-text-dense)] font-medium text-[var(--color-text-tertiary)] truncate">{res.sub}</div>
                              </div>
                              <ChevronRight size={14} className="text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Divider if needed */}
        {(rightContent || !hideSearch) && <div className="app-topbar__divider mx-1 h-6 w-px bg-[var(--color-border-light)]" />}

        {/* Page Custom Actions */}
        {rightContent && <div className="app-topbar__page-actions">{rightContent}</div>}

        {/* System Action Icons */}
        <div className="app-topbar__system-actions flex shrink-0 items-center gap-1.5 pl-2">
          <div className="relative z-[100]" ref={themeMenuRef}>
            <button
              type="button"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 ${showThemeMenu ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]'}`}
              title="Change Theme"
              aria-label="Change theme"
            >
              <Palette size={18} />
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 z-[100] mt-2 w-48 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-2" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
                <div className="mb-2 px-3 pt-1 text-[length:var(--erp-text-meta)] font-bold capitalize text-[var(--color-text-tertiary)]">
                  UI Themes
                </div>
                <button
                  onClick={() => { setTheme('royal-white'); setShowThemeMenu(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[length:var(--erp-text-body)] transition-colors ${theme === 'royal-white' ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'}`}
                >
                  <span className="h-4 w-4 rounded-full border border-[var(--color-border-default)]" style={{ background: 'var(--color-theme-preview-royal)' }} />
                  Royal White
                </button>
                <button
                  onClick={() => { setTheme('dark-gold'); setShowThemeMenu(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[length:var(--erp-text-body)] transition-colors ${theme === 'dark-gold' ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'}`}
                >
                  <span className="h-4 w-4 rounded-full border border-[var(--color-border-default)]" style={{ background: 'var(--color-theme-preview-gold)' }} />
                  Dark Gold
                </button>
                <button
                  onClick={() => { setTheme('modern-dark'); setShowThemeMenu(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[length:var(--erp-text-body)] transition-colors ${theme === 'modern-dark' ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'}`}
                >
                  <span className="h-4 w-4 rounded-full border border-[var(--color-border-default)]" style={{ background: 'var(--color-theme-preview-dark)' }} />
                  Modern Dark
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      {bottomContent && (
        <div className={`${frameClassName} app-page-inline`}>
          <div className="app-topbar__bottom mt-3 w-full border-t border-[var(--color-border-light)] pt-3">
            {bottomContent}
          </div>
        </div>
      )}
    </header>
  );
}
