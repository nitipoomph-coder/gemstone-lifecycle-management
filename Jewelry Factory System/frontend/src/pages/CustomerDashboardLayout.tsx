import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import CustomSelect from '../components/ui/CustomSelect';
import { Users, BarChart3, Table2, LineChart, FilterX, RefreshCw, ChevronDown } from 'lucide-react';
import { ALL_GROUPS } from '../config/customerGroups';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import './CustomerDashboard.css';
import { useCustomerDashboardLayout } from '../hooks/useCustomerDashboardLayout';
import PeriodSetupPanel from '../components/period/PeriodSetupPanel';
import { MONTHS } from '../utils/periodUtils';

export default function CustomerDashboardLayout() {
  const {
    activeTab,
    handleTabChange,
    selectedYears,
    selectedMonths,
    selGroups,
    availableYears,
    periodSetup,
    dynamicActiveGroups,
    showGroupPopover,
    setShowGroupPopover,
    groupPopoverRef,
    toggleGroup,
    setSelGroups,
    isFiltered,
    resetFilters
  } = useCustomerDashboardLayout();

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setRefreshCounter(c => c + 1);
  };

  return (
    <>
      <PageHeader
        breadcrumb={BREADCRUMBS.CUSTOMER_DASHBOARD_TAB(activeTab)}
        contentLayout="workspace"
        hideTitle={true}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(activeTab === 'dashboard' || activeTab === 'matrix') && (
              <button
                type="button"
                onClick={triggerRefresh}
                className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent hover:bg-[var(--color-surface-2)] transition-colors shrink-0 cursor-pointer p-0"
                title="Refresh Data"
                aria-label="Refresh Data"
              >
                <RefreshCw size={16} strokeWidth={1.75} className={`text-[var(--color-brand-600)] ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
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
          <div className="sales-global-filters flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">

              {/* Period Dropdown Popover */}
              <PeriodSetupPanel periodSetup={periodSetup} availableYears={availableYears} />

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

              {/* Reset Filters Button (placed at the end of the filter cluster) */}
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetFilters}
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
          </div>
        }
      />

      {/* Shared Layout Main Content Area */}
      <Outlet context={{ 
        periodSetup,
        selGroups, 
        availableYears, 
        refreshCounter, 
        isRefreshing, 
        triggerRefresh, 
        setIsRefreshing, 
        resetFilters 
      }} />
    </>
  );
}

