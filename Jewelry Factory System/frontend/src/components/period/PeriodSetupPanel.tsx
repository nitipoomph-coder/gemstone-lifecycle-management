import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { MONTHS } from '../../utils/periodUtils';
import { usePeriodSetup } from '../../hooks/usePeriodSetup';
import { useToast } from '../../contexts/ToastContext';

interface PeriodSetupPanelProps {
  periodSetup: ReturnType<typeof usePeriodSetup>;
  availableYears: string[];
}

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

export default function PeriodSetupPanel({ periodSetup, availableYears }: PeriodSetupPanelProps) {
  const { showToast } = useToast();
  const [showPeriodPopover, setShowPeriodPopover] = useState(false);
  const periodPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodPopoverRef.current && !periodPopoverRef.current.contains(event.target as Node)) {
        setShowPeriodPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedYears = periodSetup.committed.selectedYears;

  return (
    <div style={{ position: 'relative' }} ref={periodPopoverRef}>
      <button
        type="button"
        onClick={() => {
          if (!showPeriodPopover) {
            periodSetup.actions.syncDraft();
          }
          setShowPeriodPopover(!showPeriodPopover);
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          background: showPeriodPopover ? 'var(--color-surface-2)' : 'transparent',
          border: 'none', borderRadius: 6,
          fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-primary)',
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
          transition: 'background 0.15s'
        }}
        className="hover:bg-[var(--color-surface-1)]"
      >
        <CalendarDays size={14} style={{ color: 'var(--color-brand-500)' }} />
        <>
          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.76rem", fontWeight: 700 }}>
            Period:
          </span>
          <span>{periodSetup.draft.preset === 'ytd' ? 'Year' : periodSetup.draft.preset === 'custom' ? 'Month' : periodSetup.draft.preset === 'week' ? 'Week' : periodSetup.draft.preset === 'day' ? 'Day' : 'Year'}</span>
          <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.72rem", fontWeight: 800 }}>
            ({selectedYears[0] || ''} 
             {periodSetup.committed.preset === 'week' 
               ? ` W${periodSetup.committed.weekFrom}-W${periodSetup.committed.weekTo}` 
               : (periodSetup.committed.monthFrom === 1 && periodSetup.committed.monthTo === 12 
                   ? ' Full Year' 
                   : ` ${MONTHS[periodSetup.committed.monthFrom - 1]}-${MONTHS[periodSetup.committed.monthTo - 1]}`)})
          </span>
        </>
        <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
      </button>

      {showPeriodPopover && (
        <div className="sales-gallery-period-menu absolute left-0 z-[110] mt-2 period-popover-animate" style={{ width: 480, position: 'absolute', top: '100%' }}>
          {/* New Filter: Period Setup for all screens */}
          <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2.5 mb-3">
            <span className="text-xs font-black capitalize tracking-wider text-[var(--color-text-primary)]">
              Period Setup
            </span>
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
              {selectedYears[0]} 
              {periodSetup.committed.preset === 'week' 
               ? ` (W${periodSetup.committed.weekFrom}-W${periodSetup.committed.weekTo})` 
               : (periodSetup.committed.monthFrom === 1 && periodSetup.committed.monthTo === 12 ? ' Full Year' : ` (${MONTHS[periodSetup.committed.monthFrom - 1]}-${MONTHS[periodSetup.committed.monthTo - 1]})`)}
              {periodSetup.committed.compareActive1 && ` vs ${periodSetup.committed.compareYear1}`}
            </span>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-4">
            {/* Left: Quick Presets (Modes) */}
            <div className="flex flex-col gap-2 border-r border-[var(--color-border-light)] pr-3">
              <div className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                Mode
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: 'ytd', label: 'Year' },
                  { id: 'custom', label: 'Month' },
                  { id: 'week', label: 'Week' },
                    { id: 'day', label: 'Day' }
                ].map((preset) => {
                  const active = periodSetup.draft.preset === preset.id || (preset.id === 'ytd' && periodSetup.draft.preset === 'full-year');
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (preset.id === 'ytd') {
                          periodSetup.actions.setDraftField({ preset: 'ytd', monthFrom: 1, monthTo: 12 });
                        } else if (preset.id === 'custom') {
                          periodSetup.actions.setDraftField({ preset: 'custom' });
                        } else if (preset.id === 'week') {
                          periodSetup.actions.setDraftField({ preset: 'week' });
                        } else if (preset.id === 'day') {
                          periodSetup.actions.setDraftField({ preset: 'day' });
                        }
                      }}
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
                Period Range
              </div>

                            {/* Dynamic Range Form */}
              {periodSetup.draft.preset === 'day' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--color-text-secondary)]">From Date</label>
                    <input 
                      type="date"
                      className="rounded border border-[var(--color-border-light)] p-1.5 text-xs focus:border-[var(--color-brand-400)] focus:ring-1 focus:ring-[var(--color-brand-400)] outline-none"
                      value={periodSetup.draft.dateFrom || ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const dateStart = new Date(newDate);
                        const dateEnd = new Date(periodSetup.draft.dateTo || newDate);
                        const diffTime = Math.abs(dateEnd.getTime() - dateStart.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        
                        let finalDateTo = periodSetup.draft.dateTo || newDate;
                        if (diffDays > 30) {
                          showToast("Maximum 31 days allowed. Consider using Month or Week mode.", "warning");
                          const maxDateEnd = new Date(dateStart);
                          maxDateEnd.setDate(dateStart.getDate() + 30);
                          finalDateTo = maxDateEnd.toISOString().split('T')[0];
                        }
                        
                        periodSetup.actions.setDraftField({ 
                          dateFrom: newDate, 
                          dateTo: finalDateTo,
                          baseYear: String(dateStart.getFullYear())
                        });
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--color-text-secondary)]">To Date</label>
                    <input 
                      type="date"
                      className="rounded border border-[var(--color-border-light)] p-1.5 text-xs focus:border-[var(--color-brand-400)] focus:ring-1 focus:ring-[var(--color-brand-400)] outline-none"
                      value={periodSetup.draft.dateTo || ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const dateEnd = new Date(newDate);
                        const dateStart = new Date(periodSetup.draft.dateFrom || newDate);
                        const diffTime = Math.abs(dateEnd.getTime() - dateStart.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        
                        let finalDateFrom = periodSetup.draft.dateFrom || newDate;
                        if (diffDays > 30) {
                          showToast("Maximum 31 days allowed. Consider using Month or Week mode.", "warning");
                          const maxDateStart = new Date(dateEnd);
                          maxDateStart.setDate(dateEnd.getDate() - 30);
                          finalDateFrom = maxDateStart.toISOString().split('T')[0];
                        }
                        
                        periodSetup.actions.setDraftField({ 
                          dateTo: newDate, 
                          dateFrom: finalDateFrom,
                          baseYear: String(dateEnd.getFullYear())
                        });
                      }}
                    />
                  </div>
                </div>
              )}
              {(periodSetup.draft.preset === 'custom' || periodSetup.draft.preset === 'month') && (
                <div className="grid grid-cols-2 gap-2.5">
                  <PeriodSelect
                    label="From Month"
                    value={periodSetup.draft.monthFrom}
                    options={MONTHS.map((month: string, index: number) => ({ value: index + 1, label: month }))}
                    onChange={(value) => {
                      periodSetup.actions.setDraftField({ monthFrom: Number(value) });
                    }}
                  />
                  <PeriodSelect
                    label="To Month"
                    value={periodSetup.draft.monthTo}
                    options={MONTHS.map((month: string, index: number) => ({ value: index + 1, label: month }))}
                    onChange={(value) => {
                      periodSetup.actions.setDraftField({ monthTo: Number(value) });
                    }}
                  />
                </div>
              )}

              {periodSetup.draft.preset === 'week' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <PeriodSelect
                    label="From Wk"
                    value={periodSetup.draft.weekFrom || 1}
                    options={Array.from({ length: 53 }, (_, i) => ({ value: i + 1, label: `W${i + 1}` }))}
                    onChange={(value) => {
                      const newFrom = Number(value);
                      const currentTo = periodSetup.draft.weekTo || 53;
                      let finalTo = currentTo;
                      if (currentTo < newFrom) {
                        finalTo = newFrom;
                      } else if (currentTo - newFrom + 1 > 12) {
                        showToast("Maximum 12 weeks allowed. Consider using Month mode.", "warning");
                        finalTo = newFrom + 11;
                      }
                      periodSetup.actions.setDraftField({ weekFrom: newFrom, weekTo: finalTo });
                    }}
                  />
                  <PeriodSelect
                    label="To Wk"
                    value={periodSetup.draft.weekTo || 53}
                    options={Array.from({ length: 53 }, (_, i) => ({ value: i + 1, label: `W${i + 1}` }))}
                    onChange={(value) => {
                      const newTo = Number(value);
                      const currentFrom = periodSetup.draft.weekFrom || 1;
                      let finalFrom = currentFrom;
                      if (newTo < currentFrom) {
                        finalFrom = newTo;
                      } else if (newTo - currentFrom + 1 > 12) {
                        showToast("Maximum 12 weeks allowed. Consider using Month mode.", "warning");
                        finalFrom = newTo - 11;
                      }
                      periodSetup.actions.setDraftField({ weekTo: newTo, weekFrom: finalFrom });
                    }}
                  />
                </div>
              )}

              <PeriodSelect
                label="Year (Base Year)"
                value={periodSetup.draft.baseYear}
                options={availableYears.filter(yr => {
                  if (periodSetup.draft.compareActive1 && yr === periodSetup.draft.compareYear1) return false;
                  if (periodSetup.draft.compareActive2 && yr === periodSetup.draft.compareYear2 && yr !== 'none') return false;
                  return true;
                }).map(yr => ({ value: yr, label: yr }))}
                onChange={(value) => periodSetup.actions.setDraftField({ baseYear: String(value) })}
              />
            </div>
          </div>

          {/* Compare Years Section (Horizontal row for space efficiency) */}
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
                    checked={periodSetup.draft.compareActive1}
                    onChange={(e) => periodSetup.actions.setDraftField({ compareActive1: e.target.checked })}
                    className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
                  />
                  <span className="text-[10px] font-black text-[var(--color-text-secondary)]">Compare 1</span>
                </label>
                <div className="mt-1">
                  <CustomSelect
                    value={periodSetup.draft.compareYear1}
                    disabled={!periodSetup.draft.compareActive1}
                    onChange={(val: string) => {
                      periodSetup.actions.setDraftField({ compareYear1: val });
                      periodSetup.actions.setDraftField({ kpiCompareYear: val });
                    }}
                    options={availableYears.filter(yr => {
                      if (yr === periodSetup.draft.baseYear) return false;
                      if (periodSetup.draft.compareActive2 && yr === periodSetup.draft.compareYear2 && yr !== 'none') return false;
                      return true;
                    }).map(yr => ({ value: yr, label: yr }))}
                    ariaLabel="Compare Year 1"
                  />
                </div>
              </div>

              {/* Compare Year 2 */}
              <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={periodSetup.draft.compareActive2}
                    onChange={(e) => periodSetup.actions.setDraftField({ compareActive2: e.target.checked })}
                    className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
                  />
                  <span className="text-[10px] font-black text-[var(--color-text-secondary)]">Compare 2</span>
                </label>
                <div className="mt-1">
                  <CustomSelect
                    value={periodSetup.draft.compareYear2}
                    disabled={!periodSetup.draft.compareActive2}
                    onChange={(val: string) => {
                      periodSetup.actions.setDraftField({ compareYear2: val });
                      if (val !== 'none') periodSetup.actions.setDraftField({ kpiCompareYear: val });
                    }}
                    options={[
                      { value: 'none', label: 'None' },
                      ...availableYears.filter(yr => {
                        if (yr === periodSetup.draft.baseYear) return false;
                        if (periodSetup.draft.compareActive1 && yr === periodSetup.draft.compareYear1) return false;
                        return true;
                      }).map(yr => ({ value: yr, label: yr }))
                    ]}
                    ariaLabel="Compare Year 2"
                  />
                </div>
              </div>

              {/* KPI YoY Base (KPI compare year toggle) */}
              <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)]">
                <span className="text-[10px] font-black text-[var(--color-text-secondary)]">KPI YoY Base</span>
                <div className="mt-4">
                  <CustomSelect
                    value={periodSetup.draft.kpiCompareYear}
                    disabled={!periodSetup.draft.compareActive1 && !periodSetup.draft.compareActive2}
                    onChange={(val: string) => periodSetup.actions.setDraftField({ kpiCompareYear: val })}
                    options={[
                      ...(periodSetup.draft.compareActive1 && periodSetup.draft.compareYear1 && periodSetup.draft.compareYear1 !== 'none' ? [{ value: periodSetup.draft.compareYear1, label: periodSetup.draft.compareYear1 }] : []),
                      ...(periodSetup.draft.compareActive2 && periodSetup.draft.compareYear2 && periodSetup.draft.compareYear2 !== 'none' ? [{ value: periodSetup.draft.compareYear2, label: periodSetup.draft.compareYear2 }] : [])
                    ].filter((opt, index, self) => self.findIndex(t => t.value === opt.value) === index)}
                    ariaLabel="KPI YoY Base Year"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-border-light)] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPeriodPopover(false)}
              className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-4 py-2 text-xs font-black text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { periodSetup.actions.apply(); setShowPeriodPopover(false); }}
              className="rounded-lg border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,var(--color-surface-0))] px-4 py-2 text-xs font-black text-[var(--color-brand-600)] hover:bg-[color-mix(in_srgb,var(--color-brand-500)_16%,var(--color-surface-0))]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}






