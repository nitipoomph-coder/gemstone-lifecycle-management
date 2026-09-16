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
  const matrixPeriod = usePeriodSetup({
    availableYears,
    syncToUrl: true,
    presets: ['full-year', 'ytd', 'this-month', 'last-month', 'custom'],
    compareSlots: 2,
    allowWeekRange: false,
    onReset: () => {
      setSelGroups(ACTIVE_GROUP_IDS);
    }
  });

  const selectedYears = matrixPeriod.committed.selectedYears;
  const selectedMonths = matrixPeriod.committed.selectedMonths;

  const applyPeriodPresetLayout = (preset: any) => {
    matrixPeriod.actions.applyPreset(preset);
  };

  const applyPeriodChangesLayout = () => {
    matrixPeriod.actions.apply();
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

  const handleTabChange = (val: string) => {
    const baseParams = searchParams.toString();
    const query = baseParams ? `?${baseParams}` : '';
    if (val === 'dashboard') navigate(`/dashboard/customer${query}`);
    else if (val === 'trends') navigate(`/dashboard/customer/trends${query}`);
    else if (val === 'matrix') navigate(`/dashboard/customer/matrix${query}`);
  };

  const isFiltered = useMemo(() => {
    const isPeriodFiltered = matrixPeriod.committed.preset !== 'full-year' || matrixPeriod.committed.monthStart !== 1 || matrixPeriod.committed.monthEnd !== 12 || matrixPeriod.committed.compareActive1 || matrixPeriod.committed.compareActive2;
    const isGroupsFiltered = selGroups.length !== ACTIVE_GROUP_IDS.length || !ACTIVE_GROUP_IDS.every((id: any) => selGroups.includes(id));
    return isPeriodFiltered || isGroupsFiltered;
  }, [matrixPeriod.committed, selGroups]);

  const resetFilters = useCallback(() => {
    matrixPeriod.actions.reset();
  }, [matrixPeriod.actions]);

  return {
    activeTab,
    handleTabChange,
    selectedYears,
    selectedMonths,
    selGroups,
    availableYears,
    kpiCompareYear: matrixPeriod.committed.kpiCompareYear,
    setKpiCompareYear: (val: string) => matrixPeriod.actions.setDraftField({ kpiCompareYear: val }),
    monthStart: matrixPeriod.committed.monthStart,
    monthEnd: matrixPeriod.committed.monthEnd,
    periodPreset: matrixPeriod.committed.preset,
    draftPreset: matrixPeriod.draft.preset,
    setDraftPreset: (val: any) => matrixPeriod.actions.setDraftField({ preset: val }),
    draftStart: matrixPeriod.draft.monthStart,
    setDraftStart: (val: number) => matrixPeriod.actions.setDraftField({ monthStart: val }),
    draftEnd: matrixPeriod.draft.monthEnd,
    setDraftEnd: (val: number) => matrixPeriod.actions.setDraftField({ monthEnd: val }),
    baseYear: matrixPeriod.committed.baseYear,
    draftYear: matrixPeriod.draft.baseYear,
    setDraftYear: (val: string) => matrixPeriod.actions.setDraftField({ baseYear: val }),
    compareActive1: matrixPeriod.committed.compareActive1,
    compareYearVal1: matrixPeriod.committed.compareYear1,
    compareActive2: matrixPeriod.committed.compareActive2,
    compareYearVal2: matrixPeriod.committed.compareYear2,
    draftCompareActive1: matrixPeriod.draft.compareActive1,
    setDraftCompareActive1: (val: boolean) => matrixPeriod.actions.setDraftField({ compareActive1: val }),
    draftCompareYearVal1: matrixPeriod.draft.compareYear1,
    setDraftCompareYearVal1: (val: string) => matrixPeriod.actions.setDraftField({ compareYear1: val }),
    draftCompareActive2: matrixPeriod.draft.compareActive2,
    setDraftCompareActive2: (val: boolean) => matrixPeriod.actions.setDraftField({ compareActive2: val }),
    draftCompareYearVal2: matrixPeriod.draft.compareYear2,
    setDraftCompareYearVal2: (val: string) => matrixPeriod.actions.setDraftField({ compareYear2: val }),
    draftKpiCompareYear: matrixPeriod.draft.kpiCompareYear,
    setDraftKpiCompareYear: (val: string) => matrixPeriod.actions.setDraftField({ kpiCompareYear: val }),
    syncDraftPeriods: matrixPeriod.actions.syncDraft,
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
    setSelGroups,
    isFiltered,
    resetFilters
  };
}
