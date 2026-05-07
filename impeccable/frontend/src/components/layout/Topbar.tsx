import { useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, ChevronRight, Palette, Package, Gem, User, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { fetchSearch, type SearchResultItem } from '../../services/orderTrackerAPI';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface TopbarProps {
  breadcrumb: BreadcrumbItem[];
}

// Using SearchResultItem from API

export default function Topbar({ breadcrumb }: TopbarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // ─── Universal Search State ───
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
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

    const timer = setTimeout(async () => {
      try {
        const data = await fetchSearch(query);
        setResults(data);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (path: string) => {
    navigate(path);
    setIsSearchFocused(false);
    setQuery('');
  };

  return (
    <header
      className="flex h-14 min-h-[56px] items-center gap-4 px-6"
      style={{
        background: 'var(--color-surface-1)',
        borderBottom: '1px solid var(--color-border-light)',
        position: 'relative',
        zIndex: 100,
      }}
    >
      {/* Breadcrumb */}
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

      <div className="flex-1" />

      {/* ─── Universal Search Bar ─── */}
      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200 ${isSearchFocused ? 'shadow-md border-[var(--color-brand-500)] scale-[1.02]' : 'border-[var(--color-border-light)]'}`}
          style={{
            background: 'var(--color-surface-0)',
            border: `1px solid ${isSearchFocused ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
          }}
        >
          <Search size={14} className={`${isSearchFocused ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-tertiary)]'}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search Orders, Items, Customers..."
            className="w-full border-none bg-transparent text-sm outline-none placeholder:text-[var(--color-text-tertiary)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchFocused && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] shadow-2xl z-[200] overflow-hidden animate-fade-in-up">
            {results === null || results.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                {results === null ? 'Searching...' : `No results found for "${query}"`}
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto p-2">
                {/* Categorized Results */}
                {['order', 'item', 'customer'].map(type => {
                  const typeResults = results.filter(r => r.type === type);
                  if (typeResults.length === 0) return null;
                  
                  return (
                    <div key={type} className="mb-2 last:mb-0">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] opacity-60">
                        {type === 'order' ? 'Orders' : type === 'item' ? 'Items' : 'Customers'}
                      </div>
                      {typeResults.map(res => (
                        <button
                          key={res.id}
                          onClick={() => handleResultClick(res.path)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-0)] group"
                        >
                          {res.photo ? (
                            <img src={res.photo} alt={res.title} className="h-12 w-12 rounded-lg object-cover flex-shrink-0 shadow-sm border border-[var(--color-border-light)]" />
                          ) : (
                            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-opacity-10 group-hover:bg-opacity-20 transition-colors ${type === 'order' ? 'bg-blue-500 text-blue-600' : type === 'item' ? 'bg-amber-500 text-amber-600' : 'bg-purple-500 text-purple-600'}`}>
                              {type === 'order' ? <Package size={20} /> : type === 'item' ? <Gem size={20} /> : <User size={20} />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-[var(--color-text-primary)] truncate">{res.title}</div>
                            <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{res.sub}</div>
                          </div>
                          <ChevronRight size={14} className="text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="bg-[var(--color-surface-0)] px-4 py-2 text-[10px] text-center text-[var(--color-text-tertiary)] border-top border-[var(--color-border-light)]">
              Press Enter for global results
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]"
          title="Notifications"
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
          title="Settings"
        >
          <Settings size={18} />
        </button>

        <div className="relative z-[100]" ref={themeMenuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 ${showThemeMenu ? 'bg-[var(--color-surface-0)] text-[var(--color-brand-500)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-0)] hover:text-[var(--color-text-primary)]'}`}
            title="Change Theme"
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
