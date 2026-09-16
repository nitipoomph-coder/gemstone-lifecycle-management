const fs = require('fs');
const file = 'src/hooks/useCustomerDashboardLayout.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ getDefaultCompareYear.*?\n/, '');
code = code.replace(/export function parseMonths[\s\S]*?\}\n/, '');
code = code.replace(/export const MONTHS = \['Jan'[\s\S]*?\];\n\n/, '');

const newImports = `import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchCustomerSummary, fetchAvailableYears } from '../services/customerSummaryAPI';
import { CustomerSummaryRecord } from '../types/customerSummary';
import { ACTIVE_GROUP_IDS, ALL_GROUP_IDS, ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { parseListParam } from '../utils/periodUtils';
import { usePeriodSetup } from './usePeriodSetup';
`;
code = code.replace(/import \{ useState[\s\S]*?from '\.\.\/config\/customerGroups';\n/, newImports);

// Fix parseGroups to use parseListParam
code = code.replace(/export function parseGroups\(value: string \| null\) \{[\s\S]*?return csv\(value\)\.filter\(groupId => groupIds\.has\(groupId\)\);\n\}/, `export function parseGroups(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === 'all') return ALL_GROUP_IDS;
  if (normalized === 'none') return [];
  const groupIds = new Set(ALL_GROUP_IDS);
  return parseListParam(value).filter(groupId => groupIds.has(groupId));
}`);

// We need to inject usePeriodSetup and remove old period states
const hookStart = 'export function useCustomerDashboardLayout() {';
const hookReplaceStart = code.indexOf(hookStart);
const beforeHook = code.substring(0, hookReplaceStart);
let hookBody = code.substring(hookReplaceStart + hookStart.length);

hookBody = hookBody.replace(/const hasGroupsParam = searchParams\.has\('groups'\);\n[\s\S]*?const defaultGroups = ACTIVE_GROUP_IDS;/, `const hasGroupsParam = searchParams.has('groups');
  const requestedGroups = useMemo(() => parseGroups(searchParams.get('groups')), [searchParams]);
  const defaultGroups = ACTIVE_GROUP_IDS;`);

// Remove all period states from line 60 to 129, and replace with usePeriodSetup
const oldStateStart = hookBody.indexOf('const [availableYears, setAvailableYears] = useState<string[]>');
const effectEnd = hookBody.indexOf('const applyPeriodPresetLayout') + 'const applyPeriodPresetLayout ='.length;
const bodyBeforeOldState = hookBody.substring(0, oldStateStart);
const bodyAfterOldState = hookBody.substring(effectEnd);

const newPeriodSetup = `const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selGroups, setSelGroups] = useState<string[]>(hasGroupsParam ? requestedGroups : defaultGroups);
  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);

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

  const applyPeriodPresetLayout =`;

hookBody = bodyBeforeOldState + newPeriodSetup + bodyAfterOldState;

// Replace applyPeriodChangesLayout and applyPeriodPresetLayout
hookBody = hookBody.replace(/const applyPeriodPresetLayout = \(preset: typeof periodPreset\) => \{[\s\S]*?setShowPeriodPopover\(false\);\n  \};/, `const applyPeriodPresetLayout = (preset: any) => {
    matrixPeriod.actions.applyPreset(preset);
  };

  const applyPeriodChangesLayout = () => {
    matrixPeriod.actions.apply();
    setShowPeriodPopover(false);
  };`);

// Update resetFilters
hookBody = hookBody.replace(/const resetFilters = useCallback\(\(\) => \{[\s\S]*?\}, \[availableYears, setSearchParams\]\);/, `const resetFilters = useCallback(() => {
    matrixPeriod.actions.reset();
  }, [matrixPeriod.actions]);`);

// Update dynamicActiveGroups to depend on matrixPeriod
hookBody = hookBody.replace(/custData, selectedYears\]\);/g, 'custData, selectedYears]);');

// Update useCustomerDashboardLayout Return object
const returnStart = hookBody.indexOf('return {');
const returnObj = `return {
    activeTab,
    handleTabChange,
    selectedYears,
    selectedMonths,
    selGroups,
    availableYears,
    kpiCompareYear: matrixPeriod.committed.kpiCompareYear,
    setKpiCompareYear: (val: string) => matrixPeriod.actions.setDraftField('kpiCompareYear', val),
    monthStart: matrixPeriod.committed.startMonth,
    monthEnd: matrixPeriod.committed.endMonth,
    periodPreset: matrixPeriod.committed.preset,
    draftPreset: matrixPeriod.draft.preset,
    setDraftPreset: (val: any) => matrixPeriod.actions.setDraftField('preset', val),
    draftStart: matrixPeriod.draft.startMonth,
    setDraftStart: (val: number) => matrixPeriod.actions.setDraftField('startMonth', val),
    draftEnd: matrixPeriod.draft.endMonth,
    setDraftEnd: (val: number) => matrixPeriod.actions.setDraftField('endMonth', val),
    draftYear: matrixPeriod.draft.baseYear,
    setDraftYear: (val: string) => matrixPeriod.actions.setDraftField('baseYear', val),
    compareActive1: matrixPeriod.draft.compareActive1, // Using draft for popover state UI sync
    compareYearVal1: matrixPeriod.draft.compareYear1,
    compareActive2: matrixPeriod.draft.compareActive2,
    compareYearVal2: matrixPeriod.draft.compareYear2,
    draftCompareActive1: matrixPeriod.draft.compareActive1,
    setDraftCompareActive1: (val: boolean) => matrixPeriod.actions.setDraftField('compareActive1', val),
    draftCompareYearVal1: matrixPeriod.draft.compareYear1,
    setDraftCompareYearVal1: (val: string) => matrixPeriod.actions.setDraftField('compareYear1', val),
    draftCompareActive2: matrixPeriod.draft.compareActive2,
    setDraftCompareActive2: (val: boolean) => matrixPeriod.actions.setDraftField('compareActive2', val),
    draftCompareYearVal2: matrixPeriod.draft.compareYear2,
    setDraftCompareYearVal2: (val: string) => matrixPeriod.actions.setDraftField('compareYear2', val),
    draftKpiCompareYear: matrixPeriod.draft.kpiCompareYear,
    setDraftKpiCompareYear: (val: string) => matrixPeriod.actions.setDraftField('kpiCompareYear', val),
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
`;
hookBody = hookBody.substring(0, returnStart) + returnObj;

// Update URL sync useEffect
hookBody = hookBody.replace(/useEffect\(\(\) => \{\n    const currentYears = searchParams\.get\('years'\) \|\| '';[\s\S]*?\}, \[selectedYears, selectedMonths, selGroups, searchParams, setSearchParams\]\);/, `useEffect(() => {
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
  }, [selGroups, searchParams, setSearchParams]);`);

// Fix isFiltered to use matrixPeriod
hookBody = hookBody.replace(/const isFiltered = useMemo\(\(\) => \{[\s\S]*?\}, \[periodPreset, monthStart, monthEnd, compareActive1, compareActive2, selGroups\]\);/, `const isFiltered = useMemo(() => {
    const isPeriodFiltered = matrixPeriod.committed.preset !== 'full-year' || matrixPeriod.committed.startMonth !== 1 || matrixPeriod.committed.endMonth !== 12 || matrixPeriod.committed.compareActive1 || matrixPeriod.committed.compareActive2;
    const isGroupsFiltered = selGroups.length !== ACTIVE_GROUP_IDS.length || !ACTIVE_GROUP_IDS.every((id: any) => selGroups.includes(id));
    return isPeriodFiltered || isGroupsFiltered;
  }, [matrixPeriod.committed, selGroups]);`);

fs.writeFileSync(file, beforeHook + hookStart + hookBody);
console.log('Rewrite complete');
