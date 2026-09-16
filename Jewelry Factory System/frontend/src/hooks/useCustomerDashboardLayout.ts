import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchCustomerSummary, type CustomerSummaryRecord } from '../services/customerSummaryAPI';
import { ALL_GROUPS, ACTIVE_GROUP_IDS, getCustomerGroupId } from '../config/customerGroups';
import { parseListParam } from '../utils/periodUtils';
import { usePeriodSetup } from './usePeriodSetup';

export const ALL_GROUP_IDS = ALL_GROUPS.map((group: any) => group.id);

export function parseGroups(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === 'all') return ALL_GROUP_IDS;
  if (normalized === 'none') return [];
  const groupIds = new Set(ALL_GROUP_IDS);
  return parseListParam(value).filter(groupId => groupIds.has(groupId));
}

export function useCustomerDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine current active view from pathname
  const currentPath = location.pathname;
  const activeTab = currentPath.includes('/matrix') ? 'matrix'
    : currentPath.includes('/trends') ? 'trends'
      : 'dashboard';

  // Global Filter States
  const hasGroupsParam = searchParams.has('groups');
  const requestedGroups = useMemo(() => parseGroups(searchParams.get('groups')), [searchParams]);
  const defaultGroups = ACTIVE_GROUP_IDS;

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selGroups, setSelGroups] = useState<string[]>(hasGroupsParam ? requestedGroups : defaultGroups);
  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);

  // Initialize unified Period Setup Hook
  const periodSetupConfig = useMemo(() => ({
    availableYears,
    syncToUrl: true,
    presets: ['ytd', 'custom', 'month', 'week', 'day'] as any,
    compareSlots: 2 as const,
    allowWeekRange: true,
    onReset: () => {
      setSelGroups(ACTIVE_GROUP_IDS);
    }
  }), [availableYears]);

  const periodSetup = usePeriodSetup(periodSetupConfig);

  const selectedYears = periodSetup.committed.selectedYears;
  const selectedMonths = periodSetup.committed.selectedMonths;

  const applyPeriodPresetLayout = (preset: any) => {
    periodSetup.actions.applyPreset(preset);
  };

  const applyPeriodChangesLayout = () => {
    periodSetup.actions.apply();
    setShowPeriodPopover(false);
  };

  // Calculate dynamic active groups based on data in selectedYears
  const dynamicActiveGroups = useMemo(() => {
    if (custData.length === 0) return ACTIVE_GROUP_IDS; // fallback while loading

    const groupTotals: Record<string, number> = {};
    ALL_GROUPS.forEach((g: any) => groupTotals[g.id] = 0);

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

    const active = ALL_GROUPS.filter((g: any) => groupTotals[g.id] > 0).map((g: any) => g.id);
    return active.length > 0 ? active : ACTIVE_GROUP_IDS;
  }, [custData, selectedYears]);

  useEffect(() => {
    if (!hasGroupsParam) {
      setSelGroups(ACTIVE_GROUP_IDS);
    }
  }, [hasGroupsParam]);

  // Popover States
  const [showPeriodPopover, setShowPeriodPopover] = useState(false);
  const [showGroupPopover, setShowGroupPopover] = useState(false);
  const periodPopoverRef = useRef<HTMLDivElement>(null);
  const groupPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAvailableYears().then((years: any) => {
      const stringYears = years.map(String).sort((a: any, b: any) => b.localeCompare(a));
      setAvailableYears(stringYears);

      fetchCustomerSummary(stringYears).then(setCustData).catch(console.error);
    });
  }, []);

  useEffect(() => {
    // Only URL sync groups here since period is handled by usePeriodSetup
    const isAllGroups = selGroups.length === ALL_GROUP_IDS.length;
    const currentGroups = searchParams.get('groups') || '';
    const targetGroups = selGroups.length === 0 ? 'none' : isAllGroups ? 'all' : selGroups.join(',');

    if (currentGroups !== targetGroups) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (targetGroups) next.set('groups', targetGroups);
        else next.delete('groups');
        return next;
      }, { replace: true });
    }
  }, [selGroups, searchParams, setSearchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      
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

  const handleTabChange = (val: string) => {
    const baseParams = searchParams.toString();
    const query = baseParams ? `?${baseParams}` : '';
    if (val === 'dashboard') navigate(`/dashboard/customer${query}`);
    else if (val === 'trends') navigate(`/dashboard/customer/trends${query}`);
    else if (val === 'matrix') navigate(`/dashboard/customer/matrix${query}`);
  };

  const isFiltered = useMemo(() => {
    const isPeriodFiltered = periodSetup.committed.preset !== 'full-year' || periodSetup.committed.monthFrom !== 1 || periodSetup.committed.monthTo !== 12 || periodSetup.committed.compareActive1 || periodSetup.committed.compareActive2;
    const isGroupsFiltered = selGroups.length !== ACTIVE_GROUP_IDS.length || !ACTIVE_GROUP_IDS.every((id: any) => selGroups.includes(id));
    return isPeriodFiltered || isGroupsFiltered;
  }, [periodSetup.committed, selGroups]);

  const resetFilters = useCallback(() => {
    periodSetup.actions.reset();
  }, [periodSetup.actions]);

  return {
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
  };
}

