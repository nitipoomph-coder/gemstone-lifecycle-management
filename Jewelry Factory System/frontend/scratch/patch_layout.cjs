const fs = require('fs');

// Patch useCustomerDashboardLayout.ts
let useHookPath = 'src/hooks/useCustomerDashboardLayout.ts';
let useHook = fs.readFileSync(useHookPath, 'utf8');

useHook = useHook.replace(
  /const matrixPeriod = usePeriodSetup\(\{\s*availableYears,\s*syncToUrl: true,\s*presets: \['full-year', 'ytd', 'this-month', 'last-month', 'custom'\],\s*compareSlots: 2,\s*allowWeekRange: false,\s*onReset: \(\) => \{\s*setSelGroups\(ACTIVE_GROUP_IDS\);\s*\}\s*\}\);/,
`const periodSetupConfig = useMemo(() => ({
    availableYears,
    syncToUrl: true,
    presets: ['full-year', 'ytd', 'this-month', 'last-month', 'custom'] as any,
    compareSlots: 2 as const,
    allowWeekRange: false,
    onReset: () => {
      setSelGroups(ACTIVE_GROUP_IDS);
    }
  }), [availableYears]);

  const periodSetup = usePeriodSetup(periodSetupConfig);`
);

useHook = useHook.replace(/matrixPeriod/g, 'periodSetup');

useHook = useHook.replace(
  /kpiCompareYear: periodSetup\.committed\.kpiCompareYear,[\s\S]*?applyPeriodPresetLayout,[\s\S]*?applyPeriodChangesLayout,/,
  'periodSetup,'
);

fs.writeFileSync(useHookPath, useHook);

// Patch CustomerDashboardLayout.tsx
let uiPath = 'src/pages/CustomerDashboardLayout.tsx';
let ui = fs.readFileSync(uiPath, 'utf8');

// The destructuring part
ui = ui.replace(
  /kpiCompareYear,\s*setKpiCompareYear,\s*monthStart,\s*monthEnd,\s*periodPreset,\s*draftPreset,\s*setDraftPreset,\s*draftStart,\s*setDraftStart,\s*draftEnd,\s*setDraftEnd,\s*baseYear,\s*draftYear,\s*setDraftYear,\s*compareActive1,\s*compareYearVal1,\s*compareActive2,\s*compareYearVal2,\s*draftCompareActive1,\s*setDraftCompareActive1,\s*draftCompareYearVal1,\s*setDraftCompareYearVal1,\s*draftCompareActive2,\s*setDraftCompareActive2,\s*draftCompareYearVal2,\s*setDraftCompareYearVal2,\s*draftKpiCompareYear,\s*setDraftKpiCompareYear,\s*syncDraftPeriods,\s*applyPeriodPresetLayout,\s*applyPeriodChangesLayout,/,
  'periodSetup,'
);

ui = ui.replace(/draftPreset/g, 'periodSetup.draft.preset');
ui = ui.replace(/monthStart/g, 'periodSetup.committed.monthStart');
ui = ui.replace(/monthEnd/g, 'periodSetup.committed.monthEnd');
ui = ui.replace(/compareActive1/g, 'periodSetup.committed.compareActive1');
ui = ui.replace(/compareYearVal1/g, 'periodSetup.committed.compareYear1');
ui = ui.replace(/compareActive2/g, 'periodSetup.committed.compareActive2');
ui = ui.replace(/compareYearVal2/g, 'periodSetup.committed.compareYear2');

ui = ui.replace(/draftStart/g, 'periodSetup.draft.monthStart');
ui = ui.replace(/setDraftStart\((.*?)\)/g, 'periodSetup.actions.setDraftField({ monthStart: $1 })');
ui = ui.replace(/draftEnd/g, 'periodSetup.draft.monthEnd');
ui = ui.replace(/setDraftEnd\((.*?)\)/g, 'periodSetup.actions.setDraftField({ monthEnd: $1 })');
ui = ui.replace(/draftYear/g, 'periodSetup.draft.baseYear');
ui = ui.replace(/setDraftYear\((.*?)\)/g, 'periodSetup.actions.setDraftField({ baseYear: $1 })');
ui = ui.replace(/setDraftPreset\((.*?)\)/g, 'periodSetup.actions.setDraftField({ preset: $1 })');
ui = ui.replace(/draftCompareActive1/g, 'periodSetup.draft.compareActive1');
ui = ui.replace(/setDraftCompareActive1\((.*?)\)/g, 'periodSetup.actions.setDraftField({ compareActive1: $1 })');
ui = ui.replace(/draftCompareYearVal1/g, 'periodSetup.draft.compareYear1');
ui = ui.replace(/setDraftCompareYearVal1\((.*?)\)/g, 'periodSetup.actions.setDraftField({ compareYear1: $1 })');
ui = ui.replace(/draftCompareActive2/g, 'periodSetup.draft.compareActive2');
ui = ui.replace(/setDraftCompareActive2\((.*?)\)/g, 'periodSetup.actions.setDraftField({ compareActive2: $1 })');
ui = ui.replace(/draftCompareYearVal2/g, 'periodSetup.draft.compareYear2');
ui = ui.replace(/setDraftCompareYearVal2\((.*?)\)/g, 'periodSetup.actions.setDraftField({ compareYear2: $1 })');
ui = ui.replace(/draftKpiCompareYear/g, 'periodSetup.draft.kpiCompareYear');
ui = ui.replace(/setDraftKpiCompareYear\((.*?)\)/g, 'periodSetup.actions.setDraftField({ kpiCompareYear: $1 })');

ui = ui.replace(/applyPeriodPresetLayout\((.*?)\)/g, 'periodSetup.actions.applyPreset($1)');
ui = ui.replace(/applyPeriodChangesLayout\(\)/g, '{ periodSetup.actions.apply(); setShowPeriodPopover(false); }');
ui = ui.replace(/syncDraftPeriods\(\)/g, 'periodSetup.actions.syncDraft()');

// Fix the onClick arrow function for apply Period Setup
ui = ui.replace(/onClick=\{applyPeriodChangesLayout\}/g, 'onClick={() => { periodSetup.actions.apply(); setShowPeriodPopover(false); }}');

// Update Context!
ui = ui.replace(/context=\{\{\s*selectedYears,\s*selectedMonths,\s*selGroups,\s*availableYears,\s*kpiCompareYear,\s*setKpiCompareYear,\s*refreshCounter,\s*isRefreshing,\s*triggerRefresh,\s*setIsRefreshing,\s*draftYear: baseYear,\s*compareYearVal1,\s*compareYearVal2,\s*compareActive1,\s*compareActive2,\s*monthStart,\s*monthEnd,\s*periodPreset,\s*resetFilters\s*\}\}/,
`context={{
  periodSetup,
  selectedYears,
  selectedMonths,
  selGroups,
  availableYears,
  kpiCompareYear: periodSetup.committed.kpiCompareYear,
  setKpiCompareYear: (v) => periodSetup.actions.setDraftField({ kpiCompareYear: v }),
  refreshCounter,
  isRefreshing,
  triggerRefresh,
  setIsRefreshing,
  draftYear: periodSetup.committed.baseYear,
  compareYearVal1: periodSetup.committed.compareYear1,
  compareYearVal2: periodSetup.committed.compareYear2,
  compareActive1: periodSetup.committed.compareActive1,
  compareActive2: periodSetup.committed.compareActive2,
  monthStart: periodSetup.committed.monthStart,
  monthEnd: periodSetup.committed.monthEnd,
  periodPreset: periodSetup.committed.preset,
  resetFilters
}}`);

fs.writeFileSync(uiPath, ui);
