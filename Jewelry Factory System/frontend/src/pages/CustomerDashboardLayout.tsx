import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Outlet } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import CustomSelect from '../components/ui/CustomSelect';
import { CalendarDays, ChevronDown, Users, BarChart3, Table2, LineChart } from 'lucide-react';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchCustomerSummary, type CustomerSummaryRecord } from '../services/customerSummaryAPI';
import { ALL_GROUPS, ACTIVE_GROUP_IDS, getCustomerGroupId } from '../config/customerGroups';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import './CustomerDashboard.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_PARAM_IDS = MONTHS.map((_, index) => String(index + 1));
const ALL_GROUP_IDS = ALL_GROUPS.map(group => group.id);

function csv(value: string | null) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function parseMonths(value: string | null) {
  const months = csv(value).map(item => {
    const numeric = Number(item);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return String(numeric);
    const mIdx = MONTHS.findIndex(m => m.toLowerCase() === item.toLowerCase());
    return mIdx !== -1 ? String(mIdx + 1) : '';
  }).filter(Boolean);
  return Array.from(new Set(months));
}

function parseGroups(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === 'all') return ALL_GROUP_IDS;
  if (normalized === 'none') return [];
  const groupIds = new Set(ALL_GROUP_IDS);
  return csv(value).filter(groupId => groupIds.has(groupId));
}

export default function CustomerDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine current active view from pathname
  const currentPath = location.pathname;
  const activeTab = currentPath.includes('/matrix') ? 'matrix'
    : currentPath.includes('/trends') ? 'trends'
      : 'dashboard';

  // Global Filter States
  // @ts-ignore
  const source = searchParams.get('src');
  const hasGroupsParam = searchParams.has('groups');
  const requestedYears = useMemo(() => csv(searchParams.get('years')), [searchParams]);
  const requestedMonths = useMemo(() => parseMonths(searchParams.get('months')), [searchParams]);
  const requestedGroups = useMemo(() => parseGroups(searchParams.get('groups')), [searchParams]);
  const defaultGroups = ACTIVE_GROUP_IDS;

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>(requestedYears);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(requestedMonths.length ? requestedMonths : MONTH_PARAM_IDS);
  const [selGroups, setSelGroups] = useState<string[]>(hasGroupsParam ? requestedGroups : defaultGroups);
  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);

  // Period Filter Setup states สำหรับหน้า Matrix บน Topbar
  const [monthStart, setMonthStart] = useState<number>(() => {
    if (!requestedMonths.length) return 1;
    const sorted = [...requestedMonths].map(Number).sort((a, b) => a - b);
    return sorted[0];
  });
  const [monthEnd, setMonthEnd] = useState<number>(() => {
    if (!requestedMonths.length) return 12;
    const sorted = [...requestedMonths].map(Number).sort((a, b) => a - b);
    return sorted[sorted.length - 1];
  });
  const [periodPreset, setPeriodPreset] = useState<'full-year' | 'ytd' | 'this-month' | 'last-month' | 'custom'>(() => {
    if (!requestedMonths.length || requestedMonths.length === 12) return 'full-year';
    return 'custom';
  });

  const [draftPreset, setDraftPreset] = useState<typeof periodPreset>(periodPreset);
  const [draftStart, setDraftStart] = useState<number>(monthStart);
  const [draftEnd, setDraftEnd] = useState<number>(monthEnd);
  const [draftYear, setDraftYear] = useState<string>('');

  // States สำหรับ Compare Years
  const [compareActive1, setCompareActive1] = useState<boolean>(() => requestedYears.length > 1);
  const [compareYearVal1, setCompareYearVal1] = useState<string>(() => requestedYears[1] || '');

  const [compareActive2, setCompareActive2] = useState<boolean>(() => requestedYears.length > 2);
  const [compareYearVal2, setCompareYearVal2] = useState<string>(() => requestedYears[2] || '');

  const [draftCompareActive1, setDraftCompareActive1] = useState<boolean>(compareActive1);
  const [draftCompareYearVal1, setDraftCompareYearVal1] = useState<string>(compareYearVal1);

  const [draftCompareActive2, setDraftCompareActive2] = useState<boolean>(compareActive2);
  const [draftCompareYearVal2, setDraftCompareYearVal2] = useState<string>(compareYearVal2);

  // States สำหรับสลับปีที่นำมาเปรียบเทียบใน KPI การ์ด
  const [kpiCompareYear, setKpiCompareYear] = useState<string>(() => {
    const fromParam = searchParams.get('kpiCompare');
    return fromParam || requestedYears[1] || '';
  });
  const [draftKpiCompareYear, setDraftKpiCompareYear] = useState<string>(kpiCompareYear);

  useEffect(() => {
    if (availableYears.length > 0) {
      if (!draftYear) {
        setDraftYear(selectedYears[0] || availableYears[0]);
      }
      if (!draftCompareYearVal1) {
        setDraftCompareYearVal1(selectedYears[1] || availableYears[1] || availableYears[0]);
      }
      if (!draftCompareYearVal2) {
        setDraftCompareYearVal2(selectedYears[2] || availableYears[2] || 'none');
      }
    }
  }, [availableYears, selectedYears, draftYear, draftCompareYearVal1, draftCompareYearVal2]);

  // Sync draft เมื่อ Popover เปิด
  const syncDraftPeriods = () => {
    setDraftPreset(periodPreset);
    setDraftStart(monthStart);
    setDraftEnd(monthEnd);
    setDraftYear(selectedYears[0] || availableYears[0] || '');

    setDraftCompareActive1(compareActive1);
    setDraftCompareYearVal1(compareYearVal1 || selectedYears[1] || availableYears[1] || '');

    setDraftCompareActive2(compareActive2);
    setDraftCompareYearVal2(compareYearVal2 || selectedYears[2] || 'none');

    setDraftKpiCompareYear(kpiCompareYear || selectedYears[1] || availableYears[1] || '');
  };

  const applyPeriodPresetLayout = (preset: typeof periodPreset) => {
    setDraftPreset(preset);
    const current = new Date().getMonth() + 1;
    if (preset === 'ytd') {
      setDraftStart(1);
      setDraftEnd(current);
    } else if (preset === 'this-month') {
      setDraftStart(current);
      setDraftEnd(current);
    } else if (preset === 'last-month') {
      const last = current === 1 ? 12 : current - 1;
      setDraftStart(last);
      setDraftEnd(last);
    } else {
      setDraftStart(1);
      setDraftEnd(12);
    }
  };

  const applyPeriodChangesLayout = () => {
    setPeriodPreset(draftPreset);
    setMonthStart(draftStart);
    setMonthEnd(draftEnd);

    setCompareActive1(draftCompareActive1);
    setCompareYearVal1(draftCompareYearVal1);

    setCompareActive2(draftCompareActive2);
    setCompareYearVal2(draftCompareYearVal2);

    setKpiCompareYear(draftKpiCompareYear);

    const nextYears: string[] = [];
    if (draftYear) nextYears.push(draftYear);
    if (draftCompareActive1 && draftCompareYearVal1 && draftCompareYearVal1 !== 'none') nextYears.push(draftCompareYearVal1);
    if (draftCompareActive2 && draftCompareYearVal2 && draftCompareYearVal2 !== 'none') nextYears.push(draftCompareYearVal2);

    setSelectedYears(Array.from(new Set(nextYears)));

    const start = Math.min(draftStart, draftEnd);
    const end = Math.max(draftStart, draftEnd);
    const newMonths = Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
    setSelectedMonths(newMonths);

    // อัปเดต SearchParams ด้วยค่าใหม่
    const newParams = new URLSearchParams(searchParams);
    newParams.set('kpiCompare', draftKpiCompareYear);
    setSearchParams(newParams);

    setShowPeriodPopover(false);
  };

  // Calculate dynamic active groups based on data in selectedYears
  const dynamicActiveGroups = useMemo(() => {
    if (custData.length === 0) return ACTIVE_GROUP_IDS; // fallback while loading

    const groupTotals: Record<string, number> = {};
    ALL_GROUPS.forEach(g => groupTotals[g.id] = 0);

    custData.forEach(customer => {
      const gId = getCustomerGroupId(customer.id);
      selectedYears.forEach(y => {
        const yData = customer.monthly?.[y];
        const yQtyData = customer.monthlyQty?.[y];
        if (yData) {
          Object.values(yData).forEach(val => {
            groupTotals[gId] += Number(val);
          });
        }
        if (yQtyData) {
          Object.values(yQtyData).forEach(val => {
            groupTotals[gId] += Number(val);
          });
        }
      });
    });

    const active = ALL_GROUPS.filter(g => groupTotals[g.id] > 0).map(g => g.id);
    return active.length > 0 ? active : ACTIVE_GROUP_IDS; // fallback if no data
  }, [custData, selectedYears]);

  // Update default groups if URL has no groups param
  useEffect(() => {
    if (!hasGroupsParam && custData.length > 0) {
      setSelGroups(dynamicActiveGroups);
    }
    // We explicitly don't want this to run every time dynamicActiveGroups changes
    // if the user has manually interacted with the filter, but since hasGroupsParam 
    // will be true once they interact, it's safe.
  }, [hasGroupsParam, custData.length, dynamicActiveGroups]);

  // Popover States
  const [showPeriodPopover, setShowPeriodPopover] = useState(false);
  const [showGroupPopover, setShowGroupPopover] = useState(false);
  const periodPopoverRef = useRef<HTMLDivElement>(null);
  const groupPopoverRef = useRef<HTMLDivElement>(null);

  // Fetch available years on mount
  useEffect(() => {
    fetchAvailableYears().then(years => {
      const stringYears = years.map(String).sort((a, b) => b.localeCompare(a));
      setAvailableYears(stringYears);
      if (selectedYears.length === 0 && stringYears.length > 0) {
        setSelectedYears([stringYears[0]]);
      }

      // Fetch summary to calculate dynamic active groups
      fetchCustomerSummary(stringYears).then(setCustData).catch(console.error);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync state to URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    // Years
    if (selectedYears.length > 0) params.set('years', selectedYears.join(','));
    else params.delete('years');

    // Months
    const isAllMonths = selectedMonths.length === MONTH_PARAM_IDS.length;
    if (isAllMonths) params.delete('months');
    else params.set('months', selectedMonths.sort((a, b) => Number(a) - Number(b)).join(','));

    // Groups
    const isAllGroups = selGroups.length === ALL_GROUP_IDS.length;
    if (selGroups.length === 0) params.set('groups', 'none');
    else if (isAllGroups) params.set('groups', 'all');
    else params.set('groups', selGroups.join(','));

    // Only update if changed to avoid loop
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedYears, selectedMonths, selGroups, searchParams, setSearchParams]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodPopoverRef.current && !periodPopoverRef.current.contains(event.target as Node)) {
        setShowPeriodPopover(false);
      }
      if (groupPopoverRef.current && !groupPopoverRef.current.contains(event.target as Node)) {
        setShowGroupPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleGroup = (id: string) => {
    setSelGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Breadcrumbs based on active tab
  const summaryBreadcrumb = [
    { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
    { label: 'Sales Analytics' },
    { label: activeTab === 'matrix' ? 'Customer Matrix' : activeTab === 'trends' ? 'Order Volume Summary' : 'Customer Dashboard' }
  ];

  const handleTabChange = (val: string) => {
    const baseParams = searchParams.toString();
    const query = baseParams ? `?${baseParams}` : '';
    if (val === 'dashboard') navigate(`/dashboard/customer${query}`);
    else if (val === 'trends') navigate(`/dashboard/customer/trends${query}`);
    else if (val === 'matrix') navigate(`/dashboard/customer/matrix${query}`);
  };

  return (
    <>
      <Topbar
        breadcrumb={summaryBreadcrumb}
        contentLayout="workspace"
        hideSearch
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

            <div style={{ width: 1, height: 24, background: 'var(--color-border-light)', margin: '0 4px' }} />

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
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  background: showPeriodPopover ? 'var(--color-surface-1)' : 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)', borderRadius: 8,
                  fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-primary)',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
                  boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 3%, transparent)"
                }}
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
                /* ตัวกรองตัวใหม่: Period Setup สำหรับทุกหน้าจอ */
                <div className="sales-gallery-period-menu absolute right-0 z-[110] mt-2 period-popover-animate" style={{ width: 480, position: 'absolute', top: '100%' }}>
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
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  background: showGroupPopover ? 'var(--color-surface-1)' : 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)', borderRadius: 8,
                  fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-primary)',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
                  boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 3%, transparent)"
                }}
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
                      onClick={() => selGroups.length === dynamicActiveGroups.length && dynamicActiveGroups.every(id => selGroups.includes(id)) ? setSelGroups([]) : setSelGroups(dynamicActiveGroups)}
                      style={{ fontSize: 'var(--erp-text-meta)', fontWeight: 800, background: 'none', border: 'none', color: selGroups.length === dynamicActiveGroups.length && dynamicActiveGroups.every(id => selGroups.includes(id)) ? 'var(--color-danger-500)' : 'var(--color-ui-interactive)', cursor: 'pointer' }}>
                      {selGroups.length === dynamicActiveGroups.length && dynamicActiveGroups.every(id => selGroups.includes(id)) ? 'None' : 'All'}
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
