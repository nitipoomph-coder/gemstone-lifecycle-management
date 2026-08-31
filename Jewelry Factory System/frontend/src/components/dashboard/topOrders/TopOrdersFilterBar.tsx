import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CalendarDays, Users, Tag, ChevronDown, BarChart3 } from 'lucide-react';
import { ALL_GROUPS } from '../../../config/customerGroups';
import {
  PERIOD_PRESETS,
  MONTHS,
  PRODUCT_TYPE_OPTIONS,
  type PeriodPreset,
  type PeriodDraft
} from '../../../hooks/useTopOrdersGalleryData';
import CustomSelect from '../../ui/CustomSelect';

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
  analyticsPath: string;
  productType: string;
  setProductType: (type: string) => void;
  searchDraft: string;
  setSearchDraft: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  startFilterTransition: (duration?: number) => void;
  periodDraft: PeriodDraft | null;
  setPeriodDraft: (d: PeriodDraft | null) => void;
  buildPeriodDraft: () => PeriodDraft;
  applyPeriodPreset: (p: PeriodPreset) => void;
  updatePeriodDraft: (patch: Partial<PeriodDraft>) => void;
  applyPeriodDraft: () => void;
  getDefaultCompareYear: (baseYear: string, years: string[]) => string;
  availableYears: string[];
  periodButtonLabel: string;
  selectedPeriodLabel: string;
  selGroups: string[];
  setSelGroups: (g: string[]) => void;
  toggleGroup: (gId: string) => void;
}

export function TopOrdersFilterBar({
  analyticsPath,
  productType,
  setProductType,
  searchDraft,
  setSearchDraft,
  searchQuery,
  setSearchQuery,
  startFilterTransition,
  periodDraft,
  setPeriodDraft,
  buildPeriodDraft,
  applyPeriodPreset,
  updatePeriodDraft,
  applyPeriodDraft,
  getDefaultCompareYear,
  availableYears,
  periodButtonLabel,
  selectedPeriodLabel,
  selGroups,
  setSelGroups,
  toggleGroup
}: TopOrdersFilterBarProps) {
  const navigate = useNavigate();
  const [showYearMenu, setShowYearMenu] = useState(false);
  const yearMenuRef = useRef<HTMLDivElement>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  // Separate active and inactive groups matching CustomerDashboard standard
  const activeCustomerGroups = ALL_GROUPS.filter(g => g.id !== 'N083');
  const inactiveCustomerGroups = ALL_GROUPS.filter(g => g.id === 'N083');

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(e.target as Node)) {
        setShowYearMenu(false);
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setShowGroupMenu(false);
      }
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    };
    if (showYearMenu || showGroupMenu || showTypeMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showYearMenu, showGroupMenu, showTypeMenu]);

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

  const openPeriodMenu = () => {
    if (showYearMenu) {
      setShowYearMenu(false);
      return;
    }
    setPeriodDraft(buildPeriodDraft());
    setShowYearMenu(true);
  };

  const currentPresetLabel = (() => {
    if (periodDraft) {
      if (periodDraft.preset === 'full-year') return 'Full Year';
      if (periodDraft.preset === 'ytd') return 'YTD';
      if (periodDraft.preset === 'this-month') return 'This Month';
      if (periodDraft.preset === 'last-month') return 'Last Month';
      return 'Custom';
    }
    return selectedPeriodLabel === 'Full Year' ? 'Full Year' : 'Custom';
  })();

  const currentTypeOption = PRODUCT_TYPE_OPTIONS.find(p => p.value === productType) || PRODUCT_TYPE_OPTIONS[0];

  return (
    <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center justify-end gap-2 pr-2">
      {/* Qty Analysis Action Button */}
      <button
        type="button"
        onClick={() => navigate(analyticsPath)}
        style={{
          background: "var(--color-surface-0)",
          border: "1px solid var(--color-border-light)",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: "0.82rem",
          fontWeight: 800,
          color: "var(--color-text-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-display)",
          boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 3%, transparent)",
        }}
        className="hover:bg-[var(--color-surface-1)] hover:border-[var(--color-border-default)]"
      >
        <BarChart3 size={14} style={{ color: 'var(--color-brand-600)' }} />
        Qty Analysis
      </button>

      {/* Product Type Custom Dropdown Selector */}
      <div className="relative z-[100]" ref={typeMenuRef}>
        <button
          type="button"
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 11px',
            background: showTypeMenu || productType !== 'ALL' ? 'var(--color-brand-50)' : 'var(--color-surface-0)',
            border: `1px solid ${showTypeMenu || productType !== 'ALL' ? 'var(--color-brand-400)' : 'var(--color-border-light)'}`,
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 800,
            color: showTypeMenu || productType !== 'ALL' ? 'var(--color-brand-700)' : 'var(--color-text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-display)',
            boxShadow: '0 2px 4px color-mix(in srgb, var(--color-surface-900) 3%, transparent)',
            transition: 'all 0.15s ease'
          }}
          className="hover:bg-[var(--color-surface-1)] hover:border-[var(--color-border-default)]"
        >
          <Tag size={13} style={{ color: 'var(--color-brand-600)' }} />
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.74rem', fontWeight: 700 }}>Type:</span>
          <span>{currentTypeOption.label}</span>
          <ChevronDown
            size={13}
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
            style={{ width: 230, right: 0, left: 'auto', zIndex: 110, padding: 8 }}
          >
            <div style={{ padding: '4px 8px 8px', fontSize: 'var(--erp-text-meta)', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)', marginBottom: 6 }}>
              Product Type (หมวดสินค้า)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {PRODUCT_TYPE_OPTIONS.map((opt) => {
                const active = productType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      startFilterTransition();
                      setProductType(opt.value);
                      setShowTypeMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      border: `1px solid ${active ? 'var(--color-brand-400)' : 'transparent'}`,
                      background: active ? 'var(--color-brand-50)' : 'transparent',
                      color: active ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                    className="hover:bg-[var(--color-surface-2)]"
                  >
                    <span>
                      {opt.label}{' '}
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                        ({opt.fullLabel})
                      </span>
                    </span>
                    {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-brand-500)' }} />}
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

      {/* Period Dropdown Popover */}
      <div className="relative z-[100]" ref={yearMenuRef}>
        <button
          type="button"
          onClick={openPeriodMenu}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: showYearMenu ? 'var(--color-surface-2)' : 'transparent',
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
          <CalendarDays size={14} style={{ color: 'var(--color-brand-500)' }} />
          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.76rem", fontWeight: 700 }}>
            Period:
          </span>
          <span>{currentPresetLabel}</span>
          <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.72rem", fontWeight: 800 }}>
            ({periodButtonLabel} {selectedPeriodLabel})
          </span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--color-text-tertiary)',
              transform: showYearMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {showYearMenu && periodDraft && (
          <div
            className="sales-gallery-period-menu absolute right-0 z-[110] mt-2 period-popover-animate"
            style={{ width: 480, position: 'absolute', top: '100%' }}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2.5 mb-3">
              <span className="text-xs font-black capitalize tracking-wider text-[var(--color-text-primary)]">
                Period Setup
              </span>
              <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                {periodDraft.baseYear} {periodDraft.startMonth === 1 && periodDraft.endMonth === 12 ? 'Full Year' : `(${MONTHS[periodDraft.startMonth - 1]}-${MONTHS[periodDraft.endMonth - 1]})`}
                {periodDraft.compareEnabled && periodDraft.compareYear && ` vs ${periodDraft.compareYear}`}
              </span>
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-4">
              {/* Left: Quick Presets */}
              <div className="flex flex-col gap-2 border-r border-[var(--color-border-light)] pr-3">
                <div className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                  Quick Presets
                </div>
                <div className="flex flex-col gap-1.5">
                  {PERIOD_PRESETS.map((preset) => {
                    const active = periodDraft.preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPeriodPreset(preset.id)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-black transition-colors ${active ? "border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_9%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "border-[var(--color-border-light)] bg-[var(--color-surface-0)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]"}`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Custom Options & Base Year */}
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                  Custom Month Range
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <PeriodSelect
                    label="Start Month"
                    value={periodDraft.startMonth}
                    options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
                    onChange={(value) => {
                      updatePeriodDraft({ preset: "custom", startMonth: Number(value) });
                    }}
                  />
                  <PeriodSelect
                    label="End Month"
                    value={periodDraft.endMonth}
                    options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
                    onChange={(value) => {
                      updatePeriodDraft({ preset: "custom", endMonth: Number(value) });
                    }}
                  />
                </div>

                <PeriodSelect
                  label="Year (Base Year)"
                  value={periodDraft.baseYear || availableYears[0] || '2026'}
                  options={availableYears.map((yr) => ({ value: yr, label: yr }))}
                  onChange={(value) => {
                    const nextBaseYear = String(value);
                    updatePeriodDraft({
                      baseYear: nextBaseYear,
                      compareYear: periodDraft.compareEnabled ? getDefaultCompareYear(nextBaseYear, availableYears) : periodDraft.compareYear,
                    });
                  }}
                />
              </div>
            </div>

            {/* Compare Target Years Section */}
            <div className="mt-4 pt-3.5 border-t border-[var(--color-border-light)]">
              <div className="mb-2.5 text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                Compare Target Years
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Compare Year 1 */}
                <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={periodDraft.compareEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        const currentBase = periodDraft.baseYear || availableYears[0] || '2026';
                        updatePeriodDraft({
                          compareEnabled: enabled,
                          compareYear: enabled ? (periodDraft.compareYear || getDefaultCompareYear(currentBase, availableYears)) : periodDraft.compareYear,
                        });
                      }}
                      className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
                    />
                    <span className="text-[10px] font-black text-[var(--color-text-secondary)]">Compare 1</span>
                  </label>
                  <div className="mt-1">
                    <CustomSelect
                      value={periodDraft.compareYear || getDefaultCompareYear(periodDraft.baseYear || availableYears[0], availableYears)}
                      disabled={!periodDraft.compareEnabled}
                      onChange={(val: string) => updatePeriodDraft({ compareYear: val })}
                      options={availableYears.filter((yr) => yr !== (periodDraft.baseYear || availableYears[0])).map((yr) => ({ value: yr, label: yr }))}
                      ariaLabel="Compare Year 1"
                    />
                  </div>
                </div>

                {/* Compare Year 2 (Matching visual standard) */}
                <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)] opacity-65">
                  <label className="flex items-center gap-1.5 cursor-default">
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                      className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)]"
                    />
                    <span className="text-[10px] font-black text-[var(--color-text-tertiary)]">Compare 2</span>
                  </label>
                  <div className="mt-1">
                    <CustomSelect
                      value="none"
                      disabled
                      onChange={() => {}}
                      options={[{ value: 'none', label: 'None' }]}
                      ariaLabel="Compare Year 2"
                    />
                  </div>
                </div>

                {/* KPI YoY Base (Matching visual standard) */}
                <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)] opacity-65">
                  <span className="text-[10px] font-black text-[var(--color-text-tertiary)]">KPI YoY Base</span>
                  <div className="mt-4">
                    <CustomSelect
                      value="select"
                      disabled
                      onChange={() => {}}
                      options={[{ value: 'select', label: 'Select...' }]}
                      ariaLabel="KPI YoY Base Year"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--color-border-light)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowYearMenu(false)}
                className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-4 py-2 text-xs font-black text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  applyPeriodDraft();
                  setShowYearMenu(false);
                }}
                className="rounded-lg border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,var(--color-surface-0))] px-4 py-2 text-xs font-black text-[var(--color-brand-600)] hover:bg-[color-mix(in_srgb,var(--color-brand-500)_16%,var(--color-surface-0))]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
