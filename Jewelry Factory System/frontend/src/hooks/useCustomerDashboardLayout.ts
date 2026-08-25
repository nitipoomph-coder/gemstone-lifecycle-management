import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchCustomerSummary, type CustomerSummaryRecord } from '../services/customerSummaryAPI';
import { ALL_GROUPS, ACTIVE_GROUP_IDS, getCustomerGroupId } from '../config/customerGroups';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_PARAM_IDS = MONTHS.map((_, index) => String(index + 1));
export const ALL_GROUP_IDS = ALL_GROUPS.map((group: any) => group.id);

export function csv(value: string | null) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

export function parseMonths(value: string | null) {
  const months = csv(value).map(item => {
    const numeric = Number(item);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return String(numeric);
    const mIdx = MONTHS.findIndex(m => m.toLowerCase() === item.toLowerCase());
    return mIdx !== -1 ? String(mIdx + 1) : '';
  }).filter(Boolean);
  return Array.from(new Set(months));
}

export function parseGroups(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === 'all') return ALL_GROUP_IDS;
  if (normalized === 'none') return [];
  const groupIds = new Set(ALL_GROUP_IDS);
  return csv(value).filter(groupId => groupIds.has(groupId));
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
  const requestedYears = useMemo(() => csv(searchParams.get('years')), [searchParams]);
  const requestedMonths = useMemo(() => parseMonths(searchParams.get('months')), [searchParams]);
  const requestedGroups = useMemo(() => parseGroups(searchParams.get('groups')), [searchParams]);
  const defaultGroups = ACTIVE_GROUP_IDS;

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>(requestedYears);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(requestedMonths.length ? requestedMonths : MONTH_PARAM_IDS);
  const [selGroups, setSelGroups] = useState<string[]>(hasGroupsParam ? requestedGroups : defaultGroups);
  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);

  // Period Filter Setup states
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

    const newParams = new URLSearchParams(searchParams);
    newParams.set('kpiCompare', draftKpiCompareYear);
    setSearchParams(newParams);

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
      if (selectedYears.length === 0 && stringYears.length > 0) {
        setSelectedYears([stringYears[0]]);
      }

      fetchCustomerSummary(stringYears).then(setCustData).catch(console.error);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const currentYears = searchParams.get('years') || '';
    const targetYears = selectedYears.length > 0 ? selectedYears.join(',') : '';

    const isAllMonths = selectedMonths.length === MONTH_PARAM_IDS.length;
    const currentMonths = searchParams.get('months') || '';
    const targetMonths = isAllMonths ? '' : selectedMonths.slice().sort((a, b) => Number(a) - Number(b)).join(',');

    const isAllGroups = selGroups.length === ALL_GROUP_IDS.length;
    const currentGroups = searchParams.get('groups') || '';
    const targetGroups = selGroups.length === 0 ? 'none' : isAllGroups ? 'all' : selGroups.join(',');

    if (currentYears !== targetYears || currentMonths !== targetMonths || currentGroups !== targetGroups) {
      const newParams = new URLSearchParams(searchParams);
      if (targetYears) newParams.set('years', targetYears); else newParams.delete('years');
      if (targetMonths) newParams.set('months', targetMonths); else newParams.delete('months');
      if (targetGroups) newParams.set('groups', targetGroups); else newParams.delete('groups');
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedYears, selectedMonths, selGroups, searchParams, setSearchParams]);

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

  return {
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
    periodPreset,
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
    compareActive2,
    compareYearVal2,
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
  };
}
