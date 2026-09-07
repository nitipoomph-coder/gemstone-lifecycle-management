import { Outlet } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import CustomSelect from '../components/ui/CustomSelect';
import { CalendarDays, ChevronDown, Users, BarChart3, Table2, LineChart } from 'lucide-react';
import { ALL_GROUPS } from '../config/customerGroups';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import './CustomerDashboard.css';
import { useCustomerDashboardLayout, MONTHS } from '../hooks/useCustomerDashboardLayout';

export default function CustomerDashboardLayout() {
  const {
    activeTab,
    handleTabChange,
    selectedYears,
    selectedMonths,
    selGroups,
    availableYears,
    kpiCompareYear,
    setKpiCompareYear,
    monthStart,
    monthEnd,
    draftPreset,
    setDraftPreset,
    draftStart,
    setDraftStart,
    draftEnd,
    setDraftEnd,
    draftYear,
    setDraftYear,
    compareActive1,
    compareYearVal1,
    draftCompareActive1,
    setDraftCompareActive1,
    draftCompareYearVal1,
    setDraftCompareYearVal1,
    draftCompareActive2,
    setDraftCompareActive2,
    draftCompareYearVal2,
    setDraftCompareYearVal2,
    draftKpiCompareYear,
    setDraftKpiCompareYear,
    syncDraftPeriods,
    applyPeriodPresetLayout,
    applyPeriodChangesLayout,
    dynamicActiveGroups,
    showPeriodPopover,
    setShowPeriodPopover,
    showGroupPopover,
    setShowGroupPopover,
    periodPopoverRef,
    groupPopoverRef,
    toggleGroup,
    setSelGroups
  } = useCustomerDashboardLayout();

  const summaryBreadcrumb = [
    { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
    { label: 'Sales Analytics' },
    { label: activeTab === 'matrix' ? 'Customer Report Matrix' : activeTab === 'trends' ? 'Order Trends' : 'Sales Summary' }
  ];

  return (
    <>
      <PageHeader
        breadcrumb={summaryBreadcrumb}
        contentLayout="workspace"
        rightContent={
          <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center justify-end gap-3 pr-2">

            {/* View Switcher Tab */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 4 }}>
              <ErpSegmentedControl
                ariaLabel="View Mode"
                value={activeTab}
                onChange={(v) => handleTabChange(v as string)}
                options={[
                  { value: 'dashboard', label: 'Chart', icon: <BarChart3 size={13} /> },
                  { value: 'trends', label: 'Order Trends', icon: <LineChart size={13} /> },
                  { value: 'matrix', label: 'Matrix', icon: <Table2 size={13} /> }
                ]}
              />
            </div>


          </div>
        }
        bottomContent={
          <div className="sales-global-filters flex items-center flex-wrap gap-2 py-1 px-4 w-full">
            <div className="flex items-center gap-2">

              {/* Period Dropdown Popover */}
              <div style={{ position: 'relative' }} ref={periodPopoverRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!showPeriodPopover) {
                      syncDraftPeriods();
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
                    <span>{draftPreset === 'full-year' ? 'Full Year' : draftPreset === 'ytd' ? 'YTD' : draftPreset === 'this-month' ? 'This Month' : draftPreset === 'last-month' ? 'Last Month' : 'Custom'}</span>
                    <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.72rem", fontWeight: 800 }}>
                      ({selectedYears[0] || ''} {monthStart === 1 && monthEnd === 12 ? 'Full Year' : `${MONTHS[monthStart - 1]}-${MONTHS[monthEnd - 1]}`})
                    </span>
                  </>
                  <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                </button>

                {showPeriodPopover && (
                  <div className="sales-gallery-period-menu absolute left-0 z-[110] mt-2 period-popover-animate" style={{ width: 480, position: 'absolute', top: '100%' }}>
                    {/* ตัวกรองตัวใหม่: Period Setup สำหรับทุกหน้าจอ */}
                    <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2.5 mb-3">
                      <span className="text-xs font-black capitalize tracking-wider text-[var(--color-text-primary)]">
                        Period Setup
                      </span>
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                        {selectedYears[0]} {monthStart === 1 && monthEnd === 12 ? 'Full Year' : `(${MONTHS[monthStart - 1]}-${MONTHS[monthEnd - 1]})`}
                        {compareActive1 && ` vs ${compareYearVal1}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-[140px_1fr] gap-4">
                      {/* Left: Quick Presets */}
                      <div className="flex flex-col gap-2 border-r border-[var(--color-border-light)] pr-3">
                        <div className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                          Quick Presets
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {[
                            { id: 'full-year', label: 'Full Year' },
                            { id: 'ytd', label: 'YTD' },
                            { id: 'this-month', label: 'This Month' },
                            { id: 'last-month', label: 'Last Month' }
                          ].map((preset) => {
                            const active = draftPreset === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyPeriodPresetLayout(preset.id as any)}
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
                            value={draftStart}
                            options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
                            onChange={(value) => {
                              setDraftPreset('custom');
                              setDraftStart(Number(value));
                            }}
                          />
                          <PeriodSelect
                            label="End Month"
                            value={draftEnd}
                            options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
                            onChange={(value) => {
                              setDraftPreset('custom');
                              setDraftEnd(Number(value));
                            }}
                          />
                        </div>

                        <PeriodSelect
                          label="Year (Base Year)"
                          value={draftYear}
                          options={availableYears.filter(yr => {
                            if (draftCompareActive1 && yr === draftCompareYearVal1) return false;
                            if (draftCompareActive2 && yr === draftCompareYearVal2 && yr !== 'none') return false;
                            return true;
                          }).map(yr => ({ value: yr, label: yr }))}
                          onChange={(value) => setDraftYear(String(value))}
                        />
                      </div>
                    </div>

                    {/* Compare Years Section (แถวแนวนอนเดียวกันเพื่อประหยัดพื้นที่อย่างคุ้มค่า) */}
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
                              checked={draftCompareActive1}
                              onChange={(e) => setDraftCompareActive1(e.target.checked)}
                              className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
                            />
                            <span className="text-[10px] font-black text-[var(--color-text-secondary)]">Compare 1</span>
                          </label>
                          <div className="mt-1">
                            <CustomSelect
                              value={draftCompareYearVal1}
                              disabled={!draftCompareActive1}
                              onChange={(val: string) => {
                                setDraftCompareYearVal1(val);
                                setDraftKpiCompareYear(val);
                              }}
                              options={availableYears.filter(yr => {
                                if (yr === draftYear) return false;
                                if (draftCompareActive2 && yr === draftCompareYearVal2 && yr !== 'none') return false;
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
                              checked={draftCompareActive2}
                              onChange={(e) => setDraftCompareActive2(e.target.checked)}
                              className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
                            />
                            <span className="text-[10px] font-black text-[var(--color-text-secondary)]">Compare 2</span>
                          </label>
                          <div className="mt-1">
                            <CustomSelect
                              value={draftCompareYearVal2}
                              disabled={!draftCompareActive2}
                              onChange={(val: string) => {
                                setDraftCompareYearVal2(val);
                                if (val !== 'none') setDraftKpiCompareYear(val);
                              }}
                              options={[
                                { value: 'none', label: 'None' },
                                ...availableYears.filter(yr => {
                                  if (yr === draftYear) return false;
                                  if (draftCompareActive1 && yr === draftCompareYearVal1) return false;
                                  return true;
                                }).map(yr => ({ value: yr, label: yr }))
                              ]}
                              ariaLabel="Compare Year 2"
                            />
                          </div>
                        </div>

                        {/* KPI YoY Base (ตัวสลับปีเปรียบเทียบของ KPI) */}
                        <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)]">
                          <span className="text-[10px] font-black text-[var(--color-text-secondary)]">KPI YoY Base</span>
                          <div className="mt-4">
                            <CustomSelect
                              value={draftKpiCompareYear}
                              disabled={!draftCompareActive1 && !draftCompareActive2}
                              onChange={(val: string) => setDraftKpiCompareYear(val)}
                              options={[
                                ...(draftCompareActive1 && draftCompareYearVal1 && draftCompareYearVal1 !== 'none' ? [{ value: draftCompareYearVal1, label: draftCompareYearVal1 }] : []),
                                ...(draftCompareActive2 && draftCompareYearVal2 && draftCompareYearVal2 !== 'none' ? [{ value: draftCompareYearVal2, label: draftCompareYearVal2 }] : [])
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
                        onClick={applyPeriodChangesLayout}
                        className="rounded-lg border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,var(--color-surface-0))] px-4 py-2 text-xs font-black text-[var(--color-brand-600)] hover:bg-[color-mix(in_srgb,var(--color-brand-500)_16%,var(--color-surface-0))]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Groups Dropdown Popover */}
              <div style={{ position: 'relative' }} ref={groupPopoverRef}>
                <button
                  type="button"
                  onClick={() => setShowGroupPopover(!showGroupPopover)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                    background: showGroupPopover ? 'var(--color-surface-2)' : 'transparent',
                    border: 'none', borderRadius: 6,
                    fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-primary)',
                    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
                    transition: 'background 0.15s'
                  }}
                  className="hover:bg-[var(--color-surface-1)]"
                >
                  <Users size={14} style={{ color: 'var(--color-brand-500)' }} />
                  <span>Groups: <strong>{selGroups.length}/{ALL_GROUPS.length}</strong></span>
                  <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                </button>

                {showGroupPopover && (
                  <div className="sales-summary-popover" style={{ width: 280, zIndex: 100 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 900, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-primary)' }}>Customer Groups</span>
                      <button
                        onClick={() => selGroups.length === dynamicActiveGroups.length && dynamicActiveGroups.every((id: any) => selGroups.includes(id)) ? setSelGroups([]) : setSelGroups(dynamicActiveGroups)}
                        style={{ fontSize: 'var(--erp-text-meta)', fontWeight: 800, background: 'none', border: 'none', color: selGroups.length === dynamicActiveGroups.length && dynamicActiveGroups.every((id: any) => selGroups.includes(id)) ? 'var(--color-danger-500)' : 'var(--color-ui-interactive)', cursor: 'pointer' }}>
                        {selGroups.length === dynamicActiveGroups.length && dynamicActiveGroups.every((id: any) => selGroups.includes(id)) ? 'None' : 'All'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {/* Active Groups Section */}
                      {ALL_GROUPS.filter(g => dynamicActiveGroups.includes(g.id)).map(g => {
                        const on = selGroups.includes(g.id);
                        return (
                          <button key={g.id} onClick={() => toggleGroup(g.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', borderRadius: 6, fontSize: 'var(--erp-text-control)', fontWeight: 800,
                            border: `1px solid ${on ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                            background: on ? 'var(--color-brand-50)' : 'var(--color-surface-1)',
                            color: on ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                            cursor: 'pointer', textAlign: 'left'
                          }}>
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
                      {ALL_GROUPS.filter(g => !dynamicActiveGroups.includes(g.id)).map(g => {
                        const on = selGroups.includes(g.id);
                        return (
                          <button key={g.id} onClick={() => toggleGroup(g.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', borderRadius: 6, fontSize: 'var(--erp-text-control)', fontWeight: 800,
                            border: `1px solid ${on ? 'var(--color-border-strong)' : 'transparent'}`,
                            background: on ? 'var(--color-surface-2)' : 'transparent',
                            color: on ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                            cursor: 'pointer', textAlign: 'left',
                            opacity: on ? 1 : 0.7
                          }}>
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
          </div>
        }
      />

      {/* Shared Layout Main Content Area */}
      <Outlet context={{ selectedYears, selectedMonths, selGroups, availableYears, kpiCompareYear, setKpiCompareYear }} />
    </>
  );
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
