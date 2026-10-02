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
    metric,
    rowLimit,
    setRowLimit,
  } = dataProps;

  const fmtQty = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmt = (val: number) => {
    if (metric === "qty") return fmtQty(val);
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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
    return items.reduce((sum, item) => {
      return sum + displayYears.reduce((yrSum, yr) => yrSum + (item.yearlyTotals?.[yr]?.qty || 0), 0);
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
      const itQty = displayYears.reduce((s, yr) => s + (it.yearlyTotals?.[yr]?.qty || 0), 0);
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
        {/* Top 3 KPI Summary Cards matching design tokens and English ERP standard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
          {isInitialLoading ? (
            <>
              <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="app-skeleton" style={{ width: 140, height: 16, borderRadius: 4 }} />
                <div className="app-skeleton" style={{ width: 180, height: 32, borderRadius: 6 }} />
              </div>
              <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="app-skeleton" style={{ width: 160, height: 16, borderRadius: 4 }} />
                <div className="app-skeleton" style={{ width: 150, height: 32, borderRadius: 6 }} />
              </div>
              <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="app-skeleton" style={{ width: 110, height: 16, borderRadius: 4 }} />
                <div className="app-skeleton" style={{ width: 190, height: 32, borderRadius: 6 }} />
              </div>
            </>
          ) : (
            <>
              {/* Card 1: Total */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 800 }}>
                  {metric === 'amount'
                    ? `Total Amount (${displayYears.length} ${displayYears.length === 1 ? 'Year' : 'Years'})`
                    : `Total Volume (${displayYears.length} ${displayYears.length === 1 ? 'Year' : 'Years'})`}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                    {fmt(grandTotalQty)}
                  </span>
                  {metric === 'qty' && (
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>
                      pcs
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Average */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 800 }}>
                  {metric === 'amount' ? 'Avg Amount / Item / Year' : 'Avg per Item / Year'}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                    {fmt(avgPerItemPerYear)}
                  </span>
                  {metric === 'qty' && (
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>
                      pcs / year
                    </span>
                  )}
                </div>
              </div>

              {/* Card 3: Best Seller */}
              <div
                onClick={() => bestSellingItem && setPreviewItem(bestSellingItem.item)}
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  cursor: bestSellingItem ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
                title={bestSellingItem ? `Click to preview ${bestSellingItem.item.itemNo}` : undefined}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--color-brand-600)', fontWeight: 900 }}>
                  Top Best Seller
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                    {bestSellingItem ? bestSellingItem.item.itemNo : '-'}
                  </span>
                  {bestSellingItem && (
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-brand-600)' }}>
                      {fmt(bestSellingItem.totalQty)} {metric === 'qty' ? 'pcs' : ''}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <section className={`sales-dense-panel flex flex-1 flex-col overflow-hidden transition-opacity duration-300 ${isFilterLoading || isInitialLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="sales-dense-panel__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="sales-dense-panel__title">Top Item Qty Overview</div>
              <div className="sales-dense-panel__meta">{selectedPeriodLabel}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Row Limit Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 800 }}>Rows:</span>
                {(['50', '100', '250', 'all'] as const).map(limitOpt => {
                  const optVal = limitOpt === 'all' ? 'all' : Number(limitOpt);
                  const isSel = rowLimit === optVal;
                  return (
                    <button
                      key={limitOpt}
                      type="button"
                      onClick={() => setRowLimit(optVal)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        fontWeight: isSel ? 900 : 700,
                        border: isSel ? '1px solid var(--color-brand-600)' : '1px solid var(--color-border-light)',
                        background: isSel ? 'var(--color-brand-600)' : 'var(--color-surface-0)',
                        color: isSel ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {limitOpt === 'all' ? 'All' : limitOpt}
                    </button>
                  );
                })}
              </div>
              <div className="sales-dense-panel__meta" style={{ fontWeight: 800 }}>
                {isFilterLoading ? "Updating..." : `${items.length.toLocaleString()} rows`}
              </div>
            </div>
          </div>

          <div className="content-scrollbar sales-dense-scroll min-h-0 flex-1">
            <TopAnalyticsTable 
              rows={items} 
              loading={isInitialLoading} 
              displayYears={displayYears} 
              onPhotoClick={(item) => setPreviewItem(item)}
            />
          </div>
        </section>
      </main>

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