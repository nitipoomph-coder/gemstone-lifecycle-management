import { useMemo, useEffect } from "react";
import { BarChart3, RefreshCw, Award, TrendingUp, Package } from "lucide-react";
import { useTopOrdersGalleryData } from "../hooks/useTopOrdersGalleryData";
import { TopOrdersFilterBar } from "../components/dashboard/topOrders/TopOrdersFilterBar";
import { TopAnalyticsTable } from "../components/dashboard/topAnalytics/TopAnalyticsTable";
import { TopOrdersItemPreview } from "../components/dashboard/topOrders/TopOrdersItemPreview";
import { useTopbarActions } from "../contexts/TopbarActionContext";

export default function TopOrdersAnalyticsPage() {
  const dataProps = useTopOrdersGalleryData();

  const {
    isInitialLoading,
    isFilterLoading,
    selectedPeriodLabel,
    refreshData,
    items,
    previewItem,
    setPreviewItem,
    baseYear,
    compareYear,
    compareEnabled,
    rowLimit,
    setRowLimit,
  } = dataProps;

  const fmtQty = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // Display all selected comparison years in chronological ascending order (e.g. 2024, 2025, 2026)
  const displayYears = useMemo(() => {
    const years = [
      dataProps.periodSetup.committed.baseYear,
      dataProps.periodSetup.committed.compareActive1 ? dataProps.periodSetup.committed.compareYear1 : null,
      dataProps.periodSetup.committed.compareActive2 && dataProps.periodSetup.committed.compareYear2 !== 'none' ? dataProps.periodSetup.committed.compareYear2 : null,
    ].filter(Boolean) as string[];

    return [...new Set(years)].sort((a, b) => Number(a) - Number(b));
  }, [
    dataProps.periodSetup.committed.baseYear,
    dataProps.periodSetup.committed.compareActive1,
    dataProps.periodSetup.committed.compareYear1,
    dataProps.periodSetup.committed.compareActive2,
    dataProps.periodSetup.committed.compareYear2,
  ]);

  // Grand total quantity across all loaded items for the active displayYears
  const grandTotalQty = useMemo(() => {
    return items.reduce((sum: number, item) => {
      return sum + displayYears.reduce((yrSum: number, yr: string) => yrSum + (item.yearlyTotals?.[yr]?.qty || 0), 0);
    }, 0);
  }, [items, displayYears]);

  // Average quantity per item per year
  const avgPerItemPerYear = useMemo(() => {
    if (items.length === 0 || displayYears.length === 0) return 0;
    return Math.round(grandTotalQty / (items.length * displayYears.length));
  }, [grandTotalQty, items.length, displayYears.length]);

  // Best selling item in the selected period
  const bestSellingItem = useMemo(() => {
    if (items.length === 0) return null;
    let best = items[0];
    let maxQty = -1;
    for (const it of items) {
      const itQty = displayYears.reduce((s: number, yr: string) => s + (it.yearlyTotals?.[yr]?.qty || 0), 0);
      if (itQty > maxQty) {
        maxQty = itQty;
        best = it;
      }
    }
    return {
      item: best,
      totalQty: maxQty,
    };
  }, [items, displayYears]);

  const { setTopbarActions } = useTopbarActions();
  useEffect(() => {
    setTopbarActions(
      <button 
        onClick={refreshData} 
        className="w-9 h-9 rounded-xl border-0 bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors flex items-center justify-center cursor-pointer"
        title="Refresh"
        aria-label="Refresh"
      >
        <RefreshCw size={17} className={isFilterLoading ? 'animate-spin text-indigo-600' : ''} />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, refreshData, isFilterLoading]);

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 lg:p-8 w-full">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full text-[var(--color-text-primary)] pb-16">
        {/* ─── Top Header Bar (Hero) ───────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/10 flex items-center justify-center text-blue-500 shadow-xs">
              <BarChart3 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] m-0">
                  Top Items Quantity Analytics
                </h1>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 font-semibold">
                  {selectedPeriodLabel}
                </span>
              </div>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center self-start md:self-auto">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-xs">
              <a
                href="/dashboard/top-orders"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all no-underline"
              >
                <Package size={13} />
                <span>Gallery</span>
              </a>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs">
                <BarChart3 size={13} />
                <span>Qty Table</span>
              </span>
            </div>
          </div>
        </div>

        {/* ─── Filter Bar Card (Modern Clean) ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-3 shadow-xs border border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          <TopOrdersFilterBar
            periodButtonLabel={selectedPeriodLabel} 
            {...dataProps} 
            onReset={dataProps.resetFilters} 
          />
        </div>

        {/* ─── 3 KPI Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Volume */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-5 shadow-xs border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                Total Volume ({displayYears.length} {displayYears.length === 1 ? 'Year' : 'Years'})
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Package size={16} />
              </div>
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-display">
                  {fmtQty(grandTotalQty)}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  pcs
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span>Selected Period</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                {displayYears.join(', ') || 'Current'}
              </span>
            </div>
          </div>

          {/* Card 2: Average */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-5 shadow-xs border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                Avg Volume / Item / Year
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <TrendingUp size={16} />
              </div>
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-display">
                  {fmtQty(avgPerItemPerYear)}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  pcs / yr
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span>Item Portfolio Count</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                {items.length.toLocaleString()} Items
              </span>
            </div>
          </div>

          {/* Card 3: Best Seller */}
          <div 
            onClick={() => bestSellingItem && setPreviewItem(bestSellingItem.item)}
            className="bg-white dark:bg-slate-900/60 rounded-2xl p-5 shadow-xs border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-amber-500/5 via-transparent to-transparent cursor-pointer hover:border-indigo-500/40 hover:shadow-sm transition-all"
            title={bestSellingItem ? `Click to inspect ${bestSellingItem.item.itemNo}` : undefined}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">
                Top Best Seller
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Award size={16} />
              </div>
            </div>

            <div className="my-2.5 flex items-baseline justify-between gap-3">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-mono">
                {bestSellingItem ? bestSellingItem.item.itemNo : '-'}
              </span>
              {bestSellingItem && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                  {fmtQty(bestSellingItem.totalQty)} pcs
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span>Product Type</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-[11px]">
                {bestSellingItem?.item.productTypeLabel || 'Click to Preview'} →
              </span>
            </div>
          </div>
        </div>

        {/* ─── Main Table Section (Clean Frameless & Proportional) ─────────────────── */}
        <div className={`bg-white dark:bg-slate-900/60 rounded-2xl shadow-xs overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50 transition-opacity duration-200 ${isFilterLoading || isInitialLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {/* Table Header Bar */}
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/70 dark:bg-slate-900/80">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
                Top Item Volume Breakdown ({items.length.toLocaleString()} Items)
              </h2>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Detailed yearly rankings, customer allocations, and portfolio volume contributions
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Row Limit Selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl text-xs border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-400 px-2 font-medium text-[11px]">Rows:</span>
                {(['50', '100', '250', 'all'] as const).map(limitOpt => {
                  const optVal = limitOpt === 'all' ? 'all' : Number(limitOpt);
                  const isSel = rowLimit === optVal;
                  return (
                    <button
                      key={limitOpt}
                      type="button"
                      onClick={() => setRowLimit(optVal)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0 ${
                        isSel
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {limitOpt === 'all' ? 'All' : limitOpt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table Body */}
          <TopAnalyticsTable 
            rows={items} 
            loading={isInitialLoading} 
            displayYears={displayYears} 
            grandTotalQty={grandTotalQty}
            onPhotoClick={(item) => setPreviewItem(item)}
          />
        </div>
      </div>

      {/* Item Quick Preview Modal */}
      {previewItem && (
        <TopOrdersItemPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          baseYear={baseYear}
          compareYear={compareYear || ''}
          compareEnabled={compareEnabled}
          fmtQty={fmtQty}
        />
      )}
    </div>
  );
}