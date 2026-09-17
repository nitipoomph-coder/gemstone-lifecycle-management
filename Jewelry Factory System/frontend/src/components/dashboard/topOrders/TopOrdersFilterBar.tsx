import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Search, X, CalendarDays, Users, Tag, ChevronDown, Layers, ArrowLeftRight, FilterX } from 'lucide-react';
import { ALL_GROUPS } from '../../../config/customerGroups';
import { PERIOD_PRESETS, MONTHS, PRODUCT_TYPE_OPTIONS, type PerspectiveMode } from '../../../hooks/useTopOrdersGalleryData';
import CustomSelect from '../../ui/CustomSelect';
import { ErpSegmentedControl } from '../../ui/ErpButtons';
import PeriodSetupPanel from '../../period/PeriodSetupPanel';
import { usePeriodSetup } from '../../../hooks/usePeriodSetup';

interface PeriodSelectProps {
  label: string;
  value: string | number;
  options: Array<{ value: string | number; label: string }>;
  disabled?: boolean;
  className?: string;
  onChange: (value: string | number) => void;
}

function PeriodSelect({ label, value, options, disabled = false, className = "", onChange }: PeriodSelectProps) {
  const customOptions = options.map(opt => ({ value: String(opt.value), label: opt.label }));
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
        {label}
      </span>
      <CustomSelect
        value={String(value)}
        disabled={disabled}
        onChange={(val: string) => onChange(val)}
        options={customOptions}
        ariaLabel={label}
      />
    </div>
  );
}

interface TopOrdersFilterBarProps {
  analyticsPath?: string;
  productType: string;
  setProductType: (type: string) => void;
  selTypes?: string[];
  setSelTypes?: (types: string[]) => void;
  toggleType?: (type: string) => void;
  searchDraft: string;
  setSearchDraft: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  startFilterTransition: (duration?: number) => void;
  periodSetup: ReturnType<typeof usePeriodSetup>;
  availableYears: string[];
  baseYear?: string;
  compareYear?: string;
  periodButtonLabel: string;
  selectedPeriodLabel: string;
  selGroups: string[];
  setSelGroups: (g: string[]) => void;
  toggleGroup: (gId: string) => void;
  perspectiveMode: PerspectiveMode;
  setPerspectiveMode: (m: PerspectiveMode) => void;
  swapYears?: () => void;
  isFiltered?: boolean;
  onReset?: () => void;
}

export function TopOrdersFilterBar({
  productType,
  setProductType,
  selTypes,
  setSelTypes,
  toggleType,
  searchDraft,
  setSearchDraft,
  searchQuery,
  setSearchQuery,
  startFilterTransition,
  periodSetup,
  availableYears,
  baseYear = '',
  compareYear = '',
  selectedPeriodLabel,
  selGroups,
  setSelGroups,
  toggleGroup,
  perspectiveMode,
  setPerspectiveMode,
  isFiltered = false,
  onReset,
}: TopOrdersFilterBarProps) {
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  // Separate active and inactive groups matching CustomerDashboard standard
  const activeCustomerGroups = ALL_GROUPS.filter(g => g.id !== 'N083');
  const inactiveCustomerGroups = ALL_GROUPS.filter(g => g.id === 'N083');

  const typeOptions = PRODUCT_TYPE_OPTIONS.filter(opt => opt.value !== 'ALL');
  const activeTypes = selTypes ?? (productType && productType !== 'ALL' ? productType.split(',') : []);

  const handleToggleType = (val: string) => {
    startFilterTransition();
    if (toggleType) {
      toggleType(val);
    } else if (setSelTypes) {
      setSelTypes(activeTypes.includes(val) ? activeTypes.filter(t => t !== val) : [...activeTypes, val]);
    } else if (setProductType) {
      const next = activeTypes.includes(val) ? activeTypes.filter(t => t !== val) : [...activeTypes, val];
      setProductType(next.length === 0 ? 'ALL' : next.join(','));
    }
  };

  const handleSelectAllTypes = () => {
    startFilterTransition();
    const next = activeTypes.length === typeOptions.length ? [] : typeOptions.map(t => t.value);
    if (setSelTypes) {
      setSelTypes(next);
    } else if (setProductType) {
      setProductType(next.length === 0 ? 'ALL' : next.join(','));
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setShowGroupMenu(false);
      }
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    };
    if (showGroupMenu || showTypeMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showGroupMenu, showTypeMenu]);

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase();
    setSearchDraft(nextSearch);
    startFilterTransition();
    setSearchQuery(nextSearch);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") applySearch();
    if (event.key === "Escape") setSearchDraft(searchQuery.toUpperCase());
  };

  return (
    <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center gap-2 pr-2">
      {/* Perspective Toggle: Combined (รวมสะสม) vs Compare (เทียบYear) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ErpSegmentedControl
          ariaLabel="Perspective Mode"
          value={perspectiveMode}
          onChange={(val) => {
            if (val !== perspectiveMode) {
              startFilterTransition();
              setPerspectiveMode(val);
            }
          }}
          options={[
            { value: 'combined', label: 'Combined', icon: <Layers size={13} /> },
            { value: 'compare', label: 'Compare', icon: <ArrowLeftRight size={13} /> },
          ]}
        />
        {perspectiveMode === 'compare' && (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: 'var(--color-surface-0)',
              color: 'var(--color-text-secondary)',
              fontWeight: 800,
              fontSize: 'var(--erp-text-control)',
              border: '1px solid var(--color-border-light)',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {baseYear} vs {compareYear}
          </span>
        )}
      </div>

      {/* Product Type Multi-Select Dropdown Popover */}
      <div className="relative z-[100]" ref={typeMenuRef}>
        <button
          type="button"
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: showTypeMenu ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 900,
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-display)',
            transition: 'background 0.15s'
          }}
          className="hover:bg-[var(--color-surface-1)]"
        >
          <Tag size={14} style={{ color: 'var(--color-brand-500)' }} />
          <span>Type: <strong>{activeTypes.length}/{typeOptions.length}</strong></span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--color-text-tertiary)',
              transform: showTypeMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {showTypeMenu && (
          <div
            className="sales-summary-popover"
            style={{ width: 250, right: 0, left: 'auto', zIndex: 110, padding: 8 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={{ fontWeight: 900, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-primary)' }}>
                Product Types
              </span>
              <button
                type="button"
                onClick={handleSelectAllTypes}
                style={{
                  fontSize: 'var(--erp-text-meta)',
                  fontWeight: 800,
                  background: 'none',
                  border: 'none',
                  color: activeTypes.length === typeOptions.length ? 'var(--color-danger-500)' : 'var(--color-ui-interactive)',
                  cursor: 'pointer'
                }}
              >
                {activeTypes.length === typeOptions.length ? 'None' : 'All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {typeOptions.map((opt) => {
                const on = activeTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleType(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 'var(--erp-text-control)',
                      fontWeight: 800,
                      border: `1px solid ${on ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                      background: on ? 'var(--color-brand-50)' : 'var(--color-surface-1)',
                      color: on ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                    className="hover:bg-[var(--color-surface-2)]"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--color-brand-600)', cursor: 'pointer', margin: 0 }}
                      />
                      <span>
                        {opt.label}{' '}
                        <span style={{ fontSize: '0.72rem', color: on ? 'var(--color-brand-700)' : 'var(--color-text-tertiary)', fontWeight: 600 }}>
                          ({opt.fullLabel})
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Universal Search Box */}
      <div style={{ position: "relative", flex: "0 1 260px", minWidth: 180, maxWidth: 320 }}>
        <Search
          size={14}
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }}
        />
        <input
          type="text"
          placeholder="Search Item No, Cust, or Desc..."
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value.toUpperCase())}
          onKeyDown={handleSearchKeyDown}
          style={{
            background: "var(--color-surface-0)",
            border: "1px solid var(--color-border-light)",
            borderRadius: 8,
            padding: "6px 14px 6px 30px",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            outline: "none",
            width: "100%",
            transition: "all 0.2s",
            boxShadow: "inset 0 1px 3px color-mix(in srgb, var(--color-surface-900) 6%, transparent)",
          }}
          className="focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
        {searchDraft && (
          <button
            onClick={() => { setSearchDraft(""); setSearchQuery(""); }}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-tertiary)", display: "flex",
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Standard Period Dropdown Popover */}
      <PeriodSetupPanel periodSetup={periodSetup} availableYears={availableYears} />

      {/* Customer Groups Dropdown Popover */}
      <div className="relative z-[100]" ref={groupMenuRef}>
        <button
          type="button"
          onClick={() => setShowGroupMenu(!showGroupMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: showGroupMenu ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 900,
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-display)',
            transition: 'background 0.15s'
          }}
          className="hover:bg-[var(--color-surface-1)]"
        >
          <Users size={14} style={{ color: 'var(--color-brand-500)' }} />
          <span>Groups: <strong>{selGroups.length}/{ALL_GROUPS.length}</strong></span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--color-text-tertiary)',
              transform: showGroupMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {showGroupMenu && (
          <div className="sales-summary-popover" style={{ width: 280, right: 0, left: 'auto', zIndex: 110 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 900, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-primary)' }}>Customer Groups</span>
              <button
                type="button"
                onClick={() => selGroups.length === ALL_GROUPS.length ? setSelGroups([]) : setSelGroups(ALL_GROUPS.map(g => g.id))}
                style={{
                  fontSize: 'var(--erp-text-meta)',
                  fontWeight: 800,
                  background: 'none',
                  border: 'none',
                  color: selGroups.length === ALL_GROUPS.length ? 'var(--color-danger-500)' : 'var(--color-ui-interactive)',
                  cursor: 'pointer'
                }}
              >
                {selGroups.length === ALL_GROUPS.length ? 'None' : 'All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Active Groups Section */}
              {activeCustomerGroups.map(g => {
                const on = selGroups.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 'var(--erp-text-control)',
                      fontWeight: 800,
                      border: `1px solid ${on ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                      background: on ? 'var(--color-brand-50)' : 'var(--color-surface-1)',
                      color: on ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
                    {g.label}
                  </button>
                );
              })}

              {/* Inactive Groups Divider */}
              <div style={{ marginTop: 8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ height: 1, flex: 1, background: 'var(--color-border-light)' }} />
                <span style={{ fontSize: 'var(--erp-text-meta)', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Inactive</span>
                <div style={{ height: 1, flex: 1, background: 'var(--color-border-light)' }} />
              </div>

              {/* Inactive Groups Section */}
              {inactiveCustomerGroups.map(g => {
                const on = selGroups.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 'var(--erp-text-control)',
                      fontWeight: 800,
                      border: `1px solid ${on ? 'var(--color-border-strong)' : 'transparent'}`,
                      background: on ? 'var(--color-surface-2)' : 'transparent',
                      color: on ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      opacity: on ? 1 : 0.7
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, opacity: 0.5 }} />
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reset Button (placed at the end of the filter toolbar) */}
      {isFiltered && onReset && (
        <button
          type="button"
          onClick={onReset}
          style={{
            background: "none",
            border: "none",
            padding: "6px",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
          className="hover:bg-[var(--color-surface-2)] active:scale-95"
          title="Reset filters"
          aria-label="Reset filters"
        >
          <FilterX size={14} />
        </button>
      )}
    </div>
  );
}
