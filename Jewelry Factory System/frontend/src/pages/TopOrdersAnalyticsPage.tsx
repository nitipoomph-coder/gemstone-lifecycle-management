import { useMemo } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { useTopOrdersGalleryData } from "../hooks/useTopOrdersGalleryData";
import { TopOrdersFilterBar } from "../components/dashboard/topOrders/TopOrdersFilterBar";
import { TopAnalyticsTable } from "../components/dashboard/topAnalytics/TopAnalyticsTable";
import "../components/sales/SalesDenseTable.css";

export default function TopOrdersAnalyticsPage() {
  const dataProps = useTopOrdersGalleryData();

  const {
    isInitialLoading,
    isFilterLoading,
    selectedPeriodLabel,
    refreshData,
    items,
    baseYear,
    compareYear,
    compareEnabled,
  } = dataProps;

  const displayYears = useMemo(() => {
    if (compareEnabled && compareYear && compareYear !== baseYear) {
      // Sort descending so newer year is on the left
      return [baseYear, compareYear].sort((a, b) => b.localeCompare(a)); 
    }
    return [baseYear];
  }, [baseYear, compareYear, compareEnabled]);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--color-surface-1)]">
      <PageHeader
        breadcrumb={BREADCRUMBS.TOP_ORDERS_ANALYTICS}
        icon={<BarChart3 size={22} />}
        contentLayout="workspace"
        bottomContent={
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <TopOrdersFilterBar 
              {...dataProps} 
              onReset={dataProps.resetFilters} 
            />
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshData}
              style={{
                background: "none",
                border: "none",
                padding: "6px",
                color: "var(--color-brand-500)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                transition: "all 0.15s ease",
              }}
              className="hover:bg-[var(--color-surface-2)] active:scale-95"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={14} className={isFilterLoading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      <main className="content-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-[var(--app-page-gutter)] py-4">
        <section className={`sales-dense-panel flex flex-1 flex-col overflow-hidden transition-opacity duration-300 ${isFilterLoading || isInitialLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="sales-dense-panel__header">
            <div>
              <div className="sales-dense-panel__title">Top Item Qty Overview</div>
              <div className="sales-dense-panel__meta">{selectedPeriodLabel}</div>
            </div>
            <div className="sales-dense-panel__meta">
              {isFilterLoading ? "Updating..." : `${items.length.toLocaleString()} rows`}
            </div>
          </div>

          <div className="content-scrollbar sales-dense-scroll min-h-0 flex-1">
            <TopAnalyticsTable 
              rows={items} 
              loading={isInitialLoading} 
              displayYears={displayYears} 
              perspectiveMode={dataProps.perspectiveMode}
              compareEnabled={dataProps.compareEnabled}
            />
          </div>
        </section>
      </main>
    </div>
  );
}