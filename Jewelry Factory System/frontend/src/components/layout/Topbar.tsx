import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, ChevronRight, ChevronLeft, Palette, Package, Gem, User } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { fetchSearch, type SearchResultItem } from '../../services/poTrackerAPI';
import { psPhotoUrl, attachPhotoFallback } from '../../utils/photoUrl';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface TopbarProps {
  breadcrumb: BreadcrumbItem[];
  hideSearch?: boolean;
  rightContent?: React.ReactNode;
  icon?: React.ReactNode;
}

// Using SearchResultItem from API

export default function Topbar({ breadcrumb, hideSearch, rightContent, icon }: TopbarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // ─── Universal Search State ───
  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'order' | 'item' | 'customer' | 'po'>('all');
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const scopeDropdownRef = useRef<HTMLDivElement>(null);

  const SCOPES = [
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
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
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

  return (
    <header
      className="flex items-center justify-between px-8 py-4"
      style={{
        background: 'var(--color-surface-0)',
        borderBottom: '1px solid var(--color-border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 20px color-mix(in srgb, var(--color-surface-900) 3%, transparent)',
      }}
    >
      {/* Left: Navigation & Branding */}
      <div className="flex items-center gap-5">
        {location.pathname !== '/' && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-light)', cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--color-surface-900) 8%, transparent)'
            }}
            className="hover:text-brand-600 hover:border-brand-300 hover:shadow-md active:scale-95 flex-shrink-0"
            title="Back"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Premium Titles Layout */}
        <div className="flex flex-col">
          {breadcrumb.length > 1 && (
            <div className="flex items-center gap-1.5 text-[0.65rem] font-extrabold capitalize tracking-[0.1em] text-[var(--color-brand-600)] mb-0.5">
              {breadcrumb.slice(0, -1).map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight size={10} className="text-[var(--color-text-tertiary)]" />}
                  {item.path ? (
                    <button onClick={() => navigate(item.path!)} className="hover:text-[var(--color-brand-800)] transition-colors">
                      {item.label}
                    </button>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="flex items-center gap-2 m-0 text-xl font-black text-[var(--color-text-primary)] tracking-tight font-display">
            {icon && <span className="text-[var(--color-warning-500)] flex items-center">{icon}</span>}
            {breadcrumb[breadcrumb.length - 1].label}
          </h1>
        </div>
      </div>

      {/* Right: Tools & Search */}
      <div className="flex items-center gap-4">
        {/* Universal Search Bar */}
        {!hideSearch && (
          <div className="relative w-64 lg:w-80" ref={searchRef}>
            <div
              className={`flex items-center gap-2 rounded-xl pl-1 pr-3 py-1.5 transition-all duration-200 ${isSearchFocused ? 'shadow-md border-[var(--color-brand-500)]' : 'border-[var(--color-border-light)]'}`}
              style={{
                background: 'var(--color-surface-0)',
                border: `1px solid ${isSearchFocused ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
              }}
            >
              {/* Scope Dropdown Custom */}
              <div className="relative" ref={scopeDropdownRef} style={{ borderRight: '1px solid var(--color-border-light)' }}>
                <button
                  onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
                  className="flex items-center gap-1.5 bg-transparent border-none text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)] outline-none cursor-pointer px-2 py-1.5 hover:text-[var(--color-brand-500)] transition-colors h-full"
                >
                  {SCOPES.find(s => s.value === searchScope)?.label}
                  <svg width="8" height="5" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isScopeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.6 }}>
                    <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                
                {isScopeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-3 w-32 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-1.5 z-[110] animate-fade-in-up" style={{ boxShadow: '0 10px 40px -10px color-mix(in srgb, var(--color-surface-900) 25%, transparent)' }}>
                    {SCOPES.map(sc => (
                      <button
                        key={sc.value}
                        onClick={() => { setSearchScope(sc.value as any); setIsScopeDropdownOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-black capitalize tracking-wider transition-colors border-none cursor-pointer text-left ${searchScope === sc.value ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]'}`}
                      >
                        {sc.label}
                        {searchScope === sc.value && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] ml-2 flex-shrink-0" style={{ boxShadow: '0 0 8px color-mix(in srgb, var(--color-brand-500) 60%, transparent)' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="Search anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="flex-1 bg-transparent border-none text-sm font-semibold text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] placeholder:font-medium min-w-0 px-2"
              />

              <div className="flex-shrink-0 flex items-center justify-center text-[var(--color-text-tertiary)]">
                {searching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-tertiary)] border-t-transparent" />
                ) : (
                  <Search size={16} />
                )}
              </div>
            </div>

            {/* Floating Dropdown Results */}
            {isSearchFocused && query.length >= 2 && results && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] shadow-xl z-[100] animate-fade-in-up overflow-hidden flex flex-col max-h-[60vh]">
                {results.length === 0 ? (
                  <div className="p-4 text-center text-sm font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface-0)]">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
                    {['order', 'item', 'customer'].map((type) => {
                      const typeResults = results.filter(r => r.type === type);
                      if (typeResults.length === 0) return null;

                      return (
                        <div key={type} className="mb-2 last:mb-0">
                          <div className="px-3 py-1 text-[10px] font-bold capitalize tracking-widest text-[var(--color-text-tertiary)] opacity-60">
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
                                <div className="text-sm font-bold text-[var(--color-text-primary)] truncate">{res.title}</div>
                                <div className="text-[11px] font-medium text-[var(--color-text-tertiary)] truncate">{res.sub}</div>
                              </div>
                              <ChevronRight size={14} className="text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="bg-[var(--color-surface-0)] px-4 py-2 text-[10px] font-bold tracking-wide text-center text-[var(--color-text-tertiary)] border-t border-[var(--color-border-light)] capitalize">
                  Press Enter for global results
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider if needed */}
        {(rightContent || !hideSearch) && <div className="w-[1px] h-6 bg-[var(--color-border-light)] mx-1" />}

        {/* Page Custom Actions */}
        {rightContent}

        {/* System Action Icons */}
        <div className="flex items-center gap-1.5 pl-2">
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]"
            title="Notifications"
          >
            <Bell size={20} />
            <span
              className="absolute top-2 right-2 h-2 w-2 rounded-full"
              style={{
                background: 'var(--color-danger-500)',
                border: '2px solid var(--color-surface-1)',
              }}
            />
          </button>

          <div className="relative z-[100]" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 ${showThemeMenu ? 'bg-[var(--color-surface-0)] text-[var(--color-brand-500)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]'}`}
              title="Change Theme"
            >
              <Palette size={20} />
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-2 shadow-xl z-[100] animate-fade-in-up">
                <div className="mb-2 px-3 pt-1 text-[10px] font-bold capitalize tracking-wider text-[var(--color-text-tertiary)]">
                  UI Themes
                </div>
                <button
                  onClick={() => { setTheme('royal-white'); setShowThemeMenu(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${theme === 'royal-white' ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)] font-semibold'}`}
                >
                  <span className="h-4 w-4 rounded-full bg-white border border-slate-300 shadow-sm"></span>
                  Royal White
                </button>
                <button
                  onClick={() => { setTheme('dark-gold'); setShowThemeMenu(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${theme === 'dark-gold' ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)] font-semibold'}`}
                >
                  <span className="h-4 w-4 rounded-full bg-amber-500 shadow-[0_0_8px_color-mix(in srgb, #f59e0b 50%, transparent)]"></span>
                  Dark Gold
                </button>
                <button
                  onClick={() => { setTheme('modern-dark'); setShowThemeMenu(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${theme === 'modern-dark' ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)] font-bold' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)] font-semibold'}`}
                >
                  <span className="h-4 w-4 rounded-full bg-sky-500 border border-slate-600"></span>
                  Modern Dark
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
