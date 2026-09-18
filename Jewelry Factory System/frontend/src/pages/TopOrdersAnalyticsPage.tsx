import { useMemo, useEffect } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { useTopOrdersGalleryData } from "../hooks/useTopOrdersGalleryData";
import { TopOrdersFilterBar } from "../components/dashboard/topOrders/TopOrdersFilterBar";
import { TopAnalyticsTable } from "../components/dashboard/topAnalytics/TopAnalyticsTable";
import { TopOrdersItemPreview } from "../components/dashboard/topOrders/TopOrdersItemPreview";
import { useTopbarActions } from "../contexts/TopbarActionContext";
import "../components/sales/SalesDenseTable.css";

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
    availableYears,
    metric,
  } = dataProps;

  const fmtQty = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmt = (val: number) => {
    if (metric === "qty") return fmtQty(val);
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const displayYears = useMemo(() => {
    return [...availableYears].sort((a, b) => b.localeCompare(a));
  }, [availableYears]);

  const { setTopbarActions } = useTopbarActions();
  useEffect(() => {
    setTopbarActions(
      <button onClick={refreshData} style={{ width:36, height:36, borderRadius:8, border:'none', background:'transparent', color:'var(--color-text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--color-surface-2)'; e.currentTarget.style.color='var(--color-brand-600)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--color-text-secondary)'; }}
        title="Refresh"
        aria-label="Refresh"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={isFilterLoading ? 'animate-spin text-[var(--color-brand-600)]' : ''} />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, refreshData, isFilterLoading]);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--color-surface-1)]">
      <PageHeader
        breadcrumb={BREADCRUMBS.TOP_ORDERS_ANALYTICS}
        icon={<BarChart3 size={22} />}
        contentLayout="workspace"
        bottomContent={
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <TopOrdersFilterBar
              periodButtonLabel={selectedPeriodLabel} 
              {...dataProps} 
              onReset={dataProps.resetFilters} 
            />
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
              onPhotoClick={(item) => setPreviewItem(item)}
            />
          </div>
        </section>
      </main>

      {previewItem && (
        <TopOrdersItemPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          metric={metric}
          baseYear={baseYear}
          compareYear={compareYear || ''}
          compareEnabled={compareEnabled}
          perspectiveMode={dataProps.perspectiveMode}
          fmt={fmt}
          fmtQty={fmtQty}
        />
      )}
    </div>
  );
}