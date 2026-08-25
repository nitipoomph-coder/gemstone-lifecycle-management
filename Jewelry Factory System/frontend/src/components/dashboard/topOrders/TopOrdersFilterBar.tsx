import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CalendarDays, Filter, ChevronDown, BarChart3 } from 'lucide-react';
import { ALL_GROUPS } from '../../../config/customerGroups';
import {
  PERIOD_PRESETS,
  MONTHS,
  PRODUCT_TYPE_OPTIONS,
  type PeriodPreset,
  type PeriodDraft,
  type ProductTypeFilter
} from '../../../hooks/useTopOrdersGalleryData';

interface SelectOption {
  value: string | number;
  label: string;
}

interface PeriodSelectProps {
  label?: string;
  value: string | number;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}

function PeriodSelect({ label, value, options, disabled = false, className = "", onChange }: PeriodSelectProps) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={selectRef} className={`relative text-[10px] font-bold text-[var(--color-text-tertiary)] ${className}`}>
      {label && <div>{label}</div>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={`${label ? "mt-1" : ""} flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-3 text-left text-xs font-black text-[var(--color-text-primary)] outline-none transition-all hover:border-[var(--color-brand-300)] focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand-500)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-45`}
        style={{ boxShadow: "inset 0 1px 2px color-mix(in srgb, var(--color-surface-900) 6%, transparent)" }}
      >
        <span className="truncate">{selected?.label || "Select"}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--color-text-tertiary)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && !disabled && (
        <div
          className="absolute left-0 top-full z-[140] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] p-1 shadow-2xl"
          style={{ boxShadow: "0 14px 34px color-mix(in srgb, var(--color-surface-900) 20%, transparent)" }}
        >
          {options.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(String(option.value));
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-black transition-colors ${active ? "border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_10%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]"}`}
              >
                <span className="truncate">{option.label}</span>
                {active && <span style={{ fontSize: "0.7rem" }}>*</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TopOrdersFilterBarProps {
  analyticsPath: string;
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
  selectedProductType: ProductTypeFilter;
  setSelectedProductType: (t: ProductTypeFilter) => void;
  toggleGroup: (gId: string) => void;
}

export function TopOrdersFilterBar({
  analyticsPath,
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
  selectedProductType,
  setSelectedProductType,
  toggleGroup
}: TopOrdersFilterBarProps) {
  const navigate = useNavigate();
  const [showYearMenu, setShowYearMenu] = useState(false);
  const yearMenuRef = useRef<HTMLDivElement>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(e.target as Node)) {
        setShowYearMenu(false);
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setShowGroupMenu(false);
      }
    };
    if (showYearMenu || showGroupMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showYearMenu, showGroupMenu]);

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

  return (
    <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center gap-2 pr-2">
      <button
        type="button"
        onClick={() => navigate(analyticsPath)}
        style={{
          background: "var(--color-surface-0)",
          border: "1px solid var(--color-border-light)",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: "0.85rem",
          fontWeight: 900,
          color: "var(--color-text-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-display)",
          boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 3%, transparent)",
        }}
      >
        <BarChart3 size={15} />
        Qty Analysis
      </button>

      <div style={{ position: "relative", flex: "1 1 280px", minWidth: 220, maxWidth: 520 }}>
        <Search
          size={14}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }}
        />
        <input
          type="text"
          placeholder="Search Group, List, or Item No..."
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value.toUpperCase())}
          onKeyDown={handleSearchKeyDown}
          style={{
            background: "var(--color-surface-0)",
            border: "1px solid var(--color-border-light)",
            borderRadius: 8,
            padding: "8px 16px 8px 34px",
            fontSize: "0.85rem",
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

      <div className="relative z-[100]" ref={yearMenuRef}>
        <button
          onClick={openPeriodMenu}
          style={{
            background: "var(--color-surface-0)", border: "1px solid var(--color-border-light)", borderRadius: 8,
            padding: "8px 14px", fontSize: "0.86rem", fontWeight: 900, color: "var(--color-text-primary)", outline: "none",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)",
            boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)", whiteSpace: "nowrap",
          }}
          className="hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-1)]"
        >
          <CalendarDays size={15} />
          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.78rem", fontWeight: 700 }}>Period</span>
          <span>{periodButtonLabel}</span>
          <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.72rem", fontWeight: 800 }}>{selectedPeriodLabel}</span>
          <span style={{ transform: showYearMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--color-text-tertiary)" }}>
            <svg width="10" height="6" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {showYearMenu && periodDraft && (
          <div className="sales-gallery-period-menu absolute right-0 z-[100] mt-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-4" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border-light)] pb-3">
              <span className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">Period Setup</span>
              <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                {periodDraft.baseYear}{periodDraft.compareEnabled && periodDraft.compareYear ? ` vs ${periodDraft.compareYear}` : ""}
              </span>
            </div>

            <div className="grid grid-cols-[180px_1fr] gap-5">
              <div>
                <div className="mb-2 text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">Quick Presets</div>
                <div className="flex flex-col gap-2">
                  {PERIOD_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPeriodPreset(preset.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs font-black transition-colors ${periodDraft.preset === preset.id ? "border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_9%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "border-[var(--color-border-light)] bg-[var(--color-surface-0)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]"}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">Custom Month Range</div>
                <div className="grid grid-cols-2 gap-3">
                  <PeriodSelect
                    label="Start Month"
                    value={periodDraft.startMonth}
                    options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
                    onChange={(value) => updatePeriodDraft({ preset: "custom", startMonth: Number(value) })}
                  />
                  <PeriodSelect
                    label="End Month"
                    value={periodDraft.endMonth}
                    options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
                    onChange={(value) => updatePeriodDraft({ preset: "custom", endMonth: Number(value) })}
                  />
                </div>
                <PeriodSelect
                  label="Year"
                  value={periodDraft.baseYear}
                  options={availableYears.map((yr) => ({ value: yr, label: yr }))}
                  className="mt-3"
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

            <div className="my-4 border-t border-[var(--color-border-light)]" />

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-black text-[var(--color-text-primary)]">
                <input
                  type="checkbox"
                  checked={periodDraft.compareEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    updatePeriodDraft({
                      compareEnabled: enabled,
                      compareYear: enabled ? getDefaultCompareYear(periodDraft.baseYear, availableYears) : periodDraft.compareYear,
                    });
                  }}
                />
                Compare with Previous Year
              </label>
              <PeriodSelect
                value={periodDraft.compareYear}
                disabled={!periodDraft.compareEnabled}
                options={[
                  ...(!periodDraft.compareYear ? [{ value: "", label: "No previous year" }] : []),
                  ...availableYears.filter((yr) => yr !== periodDraft.baseYear).map((yr) => ({ value: yr, label: yr })),
                ]}
                className="min-w-[170px]"
                onChange={(value) => updatePeriodDraft({ compareYear: String(value) })}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowYearMenu(false)}
                className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-4 py-2 text-xs font-black text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { applyPeriodDraft(); setShowYearMenu(false); }}
                className="rounded-lg border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,var(--color-surface-0))] px-4 py-2 text-xs font-black text-[var(--color-brand-600)] hover:bg-[color-mix(in_srgb,var(--color-brand-500)_16%,var(--color-surface-0))]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-[100]" ref={groupMenuRef}>
        <button
          onClick={() => setShowGroupMenu(!showGroupMenu)}
          style={{
            background: selGroups.length > 0 || selectedProductType !== "ALL" ? "var(--color-brand-50)" : "var(--color-surface-0)",
            border: `1px solid ${selGroups.length > 0 || selectedProductType !== "ALL" ? "var(--color-brand-400)" : "var(--color-border-light)"}`,
            borderRadius: 8, padding: "8px 16px", fontSize: "0.9rem", fontWeight: 800,
            color: selGroups.length > 0 || selectedProductType !== "ALL" ? "var(--color-brand-700)" : "var(--color-text-primary)",
            outline: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)",
            boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)", transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
          className="hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-1)]"
        >
          <Filter size={16} />
          <span className="font-medium text-[0.8rem] capitalize tracking-wider">Filters</span>
          {(selGroups.length > 0 || selectedProductType !== "ALL") && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_10%,var(--color-surface-0))] text-[var(--color-brand-600)] text-[10px]">
              {selGroups.length + (selectedProductType !== "ALL" ? 1 : 0)}
            </span>
          )}
        </button>

        {showGroupMenu && (
          <div className="absolute right-0 z-[100] mt-2 w-80 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-4" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
            <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border-light)] pb-2">
              <span className="text-[10px] font-bold capitalize tracking-wider text-[var(--color-text-tertiary)]">Filters</span>
              {(selGroups.length > 0 || selectedProductType !== "ALL") && (
                <button
                  onClick={() => { setSelGroups([]); setSelectedProductType("ALL"); }}
                  className="text-[10px] font-bold capitalize text-[var(--color-danger-500)] hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="mb-4">
              <div className="mb-2 text-[10px] font-bold capitalize tracking-wider text-[var(--color-text-tertiary)]">Item Type</div>
              <div className="grid grid-cols-5 gap-1.5">
                {PRODUCT_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { startFilterTransition(); setSelectedProductType(type); }}
                    className={`rounded-lg px-2 py-2 text-[11px] font-black transition-colors ${selectedProductType === type ? "border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_10%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "border border-[var(--color-border-light)] bg-[var(--color-surface-0)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-2 text-[10px] font-bold capitalize tracking-wider text-[var(--color-text-tertiary)]">Customer Groups</div>
            <div className="flex flex-wrap gap-2">
              {ALL_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${selGroups.includes(group.id) ? "border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_10%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "bg-[var(--color-surface-0)] text-[var(--color-text-primary)] border border-[var(--color-border-light)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]"}`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
