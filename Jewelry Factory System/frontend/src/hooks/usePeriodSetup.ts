import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDefaultCompareYear, monthRange, parseMonths } from '../utils/periodUtils';

export type PeriodPreset = 'full-year' | 'ytd' | 'this-month' | 'last-month' | 'month' | 'week' | 'custom';

export interface PeriodSetupConfig {
  presets: PeriodPreset[];
  allowWeekRange?: boolean;
  compareSlots: 1 | 2;
  syncToUrl?: boolean;
  availableYears: string[]; // Needs to be passed in to compute default compare years
  initialValues?: {
    preset?: PeriodPreset;
    monthStart?: number;
    monthEnd?: number;
    weekStart?: number;
    weekEnd?: number;
    baseYear?: string;
    compareActive1?: boolean;
    compareYear1?: string;
    compareActive2?: boolean;
    compareYear2?: string;
    kpiCompareYear?: string;
  };
  onReset?: () => void;
}

export interface PeriodState {
  preset: PeriodPreset;
  monthStart: number;
  monthEnd: number;
  weekStart?: number;
  weekEnd?: number;
  baseYear: string;
  compareActive1: boolean;
  compareYear1: string;
  compareActive2: boolean;
  compareYear2: string;
  kpiCompareYear: string;
  selectedYears: string[];
  selectedMonths: string[];
  selectedWeeks?: string[];
}

/**
 * usePeriodSetup - A central hook to manage period filtering states.
 * 
 * Decision on compareSlots = 1:
 * We define compareActive2 and compareYear2 as ALWAYS present in the PeriodState type (not optional).
 * If compareSlots === 1, these fields will simply stay false/empty and UI won't render the second compare slot.
 * Reason: This avoids messy undefined checks (?.compareActive2) throughout the codebase. The consumer can just ignore it safely.
 */
export function usePeriodSetup(config: PeriodSetupConfig) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialization: read from URL if syncToUrl is true, otherwise use initialValues
  const initializeState = (): PeriodState => {
    let preset: PeriodPreset = config.initialValues?.preset || 'full-year';
    let monthStart = config.initialValues?.monthStart || 1;
    let monthEnd = config.initialValues?.monthEnd || 12;
    let weekStart = config.initialValues?.weekStart || 1;
    let weekEnd = config.initialValues?.weekEnd || 53;
    let baseYear = config.initialValues?.baseYear || (config.availableYears.length > 0 ? config.availableYears[0] : String(new Date().getFullYear()));
    let compareActive1 = config.initialValues?.compareActive1 || false;
    let compareYear1 = config.initialValues?.compareYear1 || getDefaultCompareYear(baseYear, config.availableYears);
    let compareActive2 = config.initialValues?.compareActive2 || false;
    let compareYear2 = config.initialValues?.compareYear2 || (config.compareSlots === 2 && config.availableYears.length > 2 ? config.availableYears[2] : 'none');
    let kpiCompareYear = config.initialValues?.kpiCompareYear || compareYear1;

    if (config.syncToUrl) {
      const urlYears = searchParams.get('years')?.split(',').filter(Boolean) || [];
      const urlMonths = parseMonths(searchParams.get('months'));
      const urlKpi = searchParams.get('kpiCompare');

      if (urlYears.length > 0) {
        baseYear = urlYears[0];
        if (urlYears.length > 1) {
          compareActive1 = true;
          compareYear1 = urlYears[1];
        }
        if (urlYears.length > 2) {
          compareActive2 = true;
          compareYear2 = urlYears[2];
        }
      }
      
      if (urlKpi) {
        kpiCompareYear = urlKpi;
      } else if (compareActive1) {
        kpiCompareYear = compareYear1;
      }

      if (urlMonths.length > 0) {
        const numMonths = urlMonths.map(Number).sort((a, b) => a - b);
        monthStart = numMonths[0];
        monthEnd = numMonths[numMonths.length - 1];
        preset = urlMonths.length === 12 ? 'full-year' : 'custom';
      } else {
        preset = 'full-year';
      }
    }

    // Compute derived selections
    const selectedYears = [baseYear];
    if (compareActive1 && compareYear1 && compareYear1 !== 'none') selectedYears.push(compareYear1);
    if (config.compareSlots === 2 && compareActive2 && compareYear2 && compareYear2 !== 'none') selectedYears.push(compareYear2);
    
    const selectedMonths = monthRange(monthStart, monthEnd).map(String);
    const selectedWeeks = config.allowWeekRange ? Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => String(weekStart + i)) : undefined;

    return {
      preset, monthStart, monthEnd, weekStart, weekEnd,
      baseYear, compareActive1, compareYear1, compareActive2, compareYear2, kpiCompareYear,
      selectedYears, selectedMonths, selectedWeeks
    };
  };

  const [committed, setCommitted] = useState<PeriodState>(initializeState);
  const [draft, setDraft] = useState<PeriodState>(committed);

  // Sync state if availableYears changes or URL changes (if syncToUrl)
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once when availableYears first becomes available (from [] -> populated)
    // We don't want to overwrite user's manual selections if the parent re-renders and passes a new array reference
    if (config.availableYears.length === 0 || isInitialized.current) return;
    
    setCommitted(prev => {
      let changed = false;
      const next = { ...prev };
      
      // If baseYear is still the fallback (current year) and it's not in the real availableYears, update it
      if (config.availableYears.length > 0 && !config.availableYears.includes(next.baseYear)) {
        next.baseYear = next.selectedYears[0] || config.availableYears[0];
        changed = true;
      }
      
      // If compareYear1 is not valid according to real availableYears, recalculate it
      if (!next.compareYear1 || next.compareYear1 === 'none' || !config.availableYears.includes(next.compareYear1)) {
        next.compareYear1 = next.selectedYears[1] || getDefaultCompareYear(next.baseYear, config.availableYears);
        changed = true;
      }

      // If compareYear2 is not valid, reset it
      if (config.compareSlots === 2) {
        if (!next.compareYear2 || next.compareYear2 === 'none' || !config.availableYears.includes(next.compareYear2)) {
          next.compareYear2 = next.selectedYears[2] || (config.availableYears.length > 2 ? config.availableYears[2] : 'none');
          changed = true;
        }
      }
      
      // Update derived arrays if changed
      if (changed) {
        const newSelected = [next.baseYear];
        if (next.compareActive1 && next.compareYear1 && next.compareYear1 !== 'none') newSelected.push(next.compareYear1);
        if (config.compareSlots === 2 && next.compareActive2 && next.compareYear2 && next.compareYear2 !== 'none') newSelected.push(next.compareYear2);
        next.selectedYears = newSelected;
        
        // Also update draft so it doesn't get out of sync
        setDraft(prevDraft => ({ ...prevDraft, ...next }));
      }
      
      return changed ? next : prev;
    });

    isInitialized.current = true;
  }, [config.availableYears, config.compareSlots]);

  const setDraftField = useCallback((patch: Partial<PeriodState>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const applyPreset = useCallback((preset: PeriodPreset) => {
    const currentMonth = new Date().getMonth() + 1;
    let newStart = draft.monthStart;
    let newEnd = draft.monthEnd;
    
    if (preset === 'ytd') {
      newStart = 1;
      newEnd = currentMonth;
    } else if (preset === 'this-month') {
      newStart = currentMonth;
      newEnd = currentMonth;
    } else if (preset === 'last-month') {
      newStart = currentMonth === 1 ? 12 : currentMonth - 1;
      newEnd = newStart;
    } else if (preset === 'full-year') {
      newStart = 1;
      newEnd = 12;
    }
    
    setDraft(prev => ({
      ...prev,
      preset,
      monthStart: newStart,
      monthEnd: newEnd
    }));
  }, [draft.monthStart, draft.monthEnd]);

  const syncDraft = useCallback(() => {
    setDraft(committed);
  }, [committed]);

  const apply = useCallback(() => {
    // Recompute derived arrays based on draft
    const selectedYears = [draft.baseYear];
    if (draft.compareActive1 && draft.compareYear1 && draft.compareYear1 !== 'none') selectedYears.push(draft.compareYear1);
    if (config.compareSlots === 2 && draft.compareActive2 && draft.compareYear2 && draft.compareYear2 !== 'none') selectedYears.push(draft.compareYear2);
    
    const selectedMonths = monthRange(draft.monthStart, draft.monthEnd).map(String);
    const selectedWeeks = config.allowWeekRange && draft.weekStart && draft.weekEnd 
      ? Array.from({ length: draft.weekEnd - draft.weekStart + 1 }, (_, i) => String(draft.weekStart! + i)) 
      : undefined;

    const newCommitted = {
      ...draft,
      selectedYears,
      selectedMonths,
      selectedWeeks
    };
    
    setCommitted(newCommitted);

    if (config.syncToUrl) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('years', selectedYears.join(','));
        if (selectedMonths.length === 12) {
          next.delete('months');
        } else {
          next.set('months', selectedMonths.join(','));
        }
        if (draft.kpiCompareYear && draft.kpiCompareYear !== 'none') {
          next.set('kpiCompare', draft.kpiCompareYear);
        } else {
          next.delete('kpiCompare');
        }
        return next;
      }, { replace: true });
    }
  }, [draft, config.compareSlots, config.allowWeekRange, config.syncToUrl, setSearchParams]);

  const reset = useCallback(() => {
    const newState = initializeState();
    setCommitted(newState);
    setDraft(newState);
    if (config.syncToUrl) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('years');
        next.delete('months');
        next.delete('kpiCompare');
        return next;
      }, { replace: true });
    }
    
    // Allow caller to wipe other states (like groups)
    if (config.onReset) {
      config.onReset();
    }
  }, [config.syncToUrl, setSearchParams, config.availableYears, config.onReset, initializeState]);

  return {
    committed,
    draft,
    actions: {
      setDraftField,
      applyPreset,
      syncDraft,
      apply,
      reset
    }
  };
}

// ============================================================================
// TYPE SANITY CHECKS (Examples of usage as requested)
// ============================================================================

// 1. Dashboard / Trends usage
// const dashboardPeriod = usePeriodSetup({ 
//   presets: ['full-year','ytd','this-month','last-month'], 
//   compareSlots: 2, 
//   syncToUrl: true,
//   availableYears: ['2026', '2025', '2024'] 
// });

// 2. Matrix usage
// const matrixPeriod = usePeriodSetup({ 
//   presets: ['full-year','month','week'], 
//   allowWeekRange: true, 
//   compareSlots: 2, 
//   syncToUrl: false,
//   availableYears: ['2026', '2025', '2024']
// });
