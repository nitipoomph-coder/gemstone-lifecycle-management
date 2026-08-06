import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Outlet } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
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

  const toggleYear = (y: string) => {
    setSelectedYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y]);
  };

  const toggleMonth = (mStr: string) => {
    setSelectedMonths(prev => prev.includes(mStr) ? prev.filter(x => x !== mStr) : [...prev, mStr]);
  };

  const toggleGroup = (id: string) => {
    setSelGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Period Label
  const periodButtonLabel = selectedYears.length === 1 && selectedMonths.length === 12
    ? selectedYears[0]
    : selectedYears.length === 0
      ? 'Select Year'
      : `${selectedYears.length} Yrs, ${selectedMonths.length} Mos`;

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
                  { value: 'trends', label: 'Trends', icon: <LineChart size={13} /> },
                  { value: 'matrix', label: 'Matrix', icon: <Table2 size={13} /> }
                ]}
              />
            </div>

            <div style={{ width: 1, height: 24, background: 'var(--color-border-light)', margin: '0 4px' }} />

            {/* Period Dropdown Popover */}
            <div style={{ position: 'relative' }} ref={periodPopoverRef}>
              <button
                type="button"
                onClick={() => setShowPeriodPopover(!showPeriodPopover)}
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
                <span>Period: <strong>{periodButtonLabel}</strong></span>
                <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
              </button>

              {showPeriodPopover && (
                <div className="sales-summary-popover" style={{ width: 320, zIndex: 100 }}>
                  <div style={{ fontWeight: 900, fontSize: 'var(--erp-text-control)', marginBottom: 8, color: 'var(--color-text-primary)' }}>Target Years</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {availableYears.map(y => {
                      const on = selectedYears.includes(y);
                      return (
                        <button key={y} onClick={() => toggleYear(y)} style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 'var(--erp-text-dense)', fontWeight: 800,
                          border: `1px solid ${on ? 'var(--color-ui-interactive)' : 'var(--color-border-light)'}`,
                          background: on ? 'var(--color-ui-selected)' : 'var(--color-ui-surface)',
                          color: on ? 'var(--color-ui-interactive)' : 'var(--color-text-tertiary)',
                          cursor: 'pointer'
                        }}>{y}</button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 900, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-primary)' }}>Months ({selectedMonths.length}/12)</span>
                    <button
                      onClick={() => selectedMonths.length === 12 ? setSelectedMonths([]) : setSelectedMonths(MONTHS.map((_, i) => String(i + 1)))}
                      style={{ fontSize: 'var(--erp-text-meta)', fontWeight: 800, background: 'none', border: 'none', color: selectedMonths.length === 12 ? 'var(--color-danger-500)' : 'var(--color-ui-interactive)', cursor: 'pointer' }}>
                      {selectedMonths.length === 12 ? 'None' : 'All'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                    {MONTHS.map((m, i) => {
                      const mStr = String(i + 1);
                      const on = selectedMonths.includes(mStr);
                      return (
                        <button key={m} onClick={() => toggleMonth(mStr)} style={{
                          padding: '4px 0', fontSize: 'var(--erp-text-meta)', fontWeight: 800, borderRadius: 5,
                          border: `1px solid ${on ? 'var(--color-ui-interactive)' : 'var(--color-border-light)'}`,
                          background: on ? 'var(--color-ui-selected)' : 'var(--color-ui-surface)',
                          color: on ? 'var(--color-ui-interactive)' : 'var(--color-text-tertiary)',
                          cursor: 'pointer'
                        }}>
                          {m}
                        </button>
                      );
                    })}
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
      <Outlet context={{ selectedYears, selectedMonths, selGroups, availableYears }} />
    </>
  );
}
