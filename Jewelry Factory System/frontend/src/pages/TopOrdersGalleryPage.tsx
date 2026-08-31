import { RefreshCw } from "lucide-react";
import Topbar from "../components/layout/Topbar";
import { useTopOrdersGalleryData } from "../hooks/useTopOrdersGalleryData";
import { TopOrdersFilterBar } from "../components/dashboard/topOrders/TopOrdersFilterBar";
import { TopOrdersGalleryGrid } from "../components/dashboard/topOrders/TopOrdersGalleryGrid";
import { TopOrdersItemPreview } from "../components/dashboard/topOrders/TopOrdersItemPreview";
import { TopOrdersSkeleton } from "../components/dashboard/topOrders/TopOrdersSkeleton";
import "./SalesResponsive.css";

export default function TopOrdersGalleryPage() {
  const {
    metric,
    isInitialLoading,
    isFilterLoading,
    availableYears,
    baseYear,
    compareYear,
    compareEnabled,
    selGroups,
    setSelGroups,
    toggleGroup,
    productType,
    setProductType,
    searchDraft,
    setSearchDraft,
    searchQuery,
    setSearchQuery,
    periodDraft,
    setPeriodDraft,
    buildPeriodDraft,
    applyPeriodPreset,
    updatePeriodDraft,
    applyPeriodDraft,
    getDefaultCompareYear,
    items,
    summary,
    previewItem,
    setPreviewItem,
    analyticsPath,
    selectedPeriodLabel,
    startFilterTransition,
  } = useTopOrdersGalleryData();

  const fmt = (val: number) => {
    if (metric === "qty") return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const resetGalleryFilters = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-surface-1)]">
      <Topbar
        breadcrumb={[
          { label: "JEWELRY FACTORY SYSTEM", path: "/" },
          { label: "Sales Analytics" },
          { label: "Top Item Gallery" },
        ]}
        hideSearch={true}
        contentLayout="workspace"
        rightContent={
          <div className="flex items-center gap-2">
            <TopOrdersFilterBar
              analyticsPath={analyticsPath}
              productType={productType}
              setProductType={setProductType}
              searchDraft={searchDraft}
              setSearchDraft={setSearchDraft}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              startFilterTransition={startFilterTransition}
              periodDraft={periodDraft}
              setPeriodDraft={setPeriodDraft}
              buildPeriodDraft={buildPeriodDraft}
              applyPeriodPreset={applyPeriodPreset}
              updatePeriodDraft={updatePeriodDraft}
              applyPeriodDraft={applyPeriodDraft}
              getDefaultCompareYear={getDefaultCompareYear}
              availableYears={availableYears}
              periodButtonLabel={baseYear}
              selectedPeriodLabel={selectedPeriodLabel}
              selGroups={selGroups}
              setSelGroups={setSelGroups}
              toggleGroup={toggleGroup}
            />
            <div style={{ width: 1, height: 16, background: 'var(--color-border-light)', margin: '0 4px' }} />
            <button
              onClick={resetGalleryFilters}
              style={{ background: "none", border: "none", padding: "6px", color: "var(--color-text-tertiary)", cursor: "pointer" }}
              title="Reset Filters"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      <div className="content-scrollbar sales-gallery-scroll" style={{ flex: 1, overflowY: "auto", background: "var(--color-surface-1)", position: "relative" }}>
        <style>{`
          .gallery-card-hover .hover-overlay { opacity: 0; transform: translateY(10px); transition: all 0.2s ease; }
          .gallery-card-hover:hover .hover-overlay { opacity: 1; transform: translateY(0); }
          .gallery-img { transition: transform 0.25s ease, opacity 0.15s ease; }
          .gallery-card-hover:hover .gallery-img { transform: scale(1.04); }
          .gallery-grid {
            --gallery-track: clamp(260px, 16vw, 320px);
            --gallery-gap: clamp(14px, 1vw, 20px);
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(var(--gallery-track), 1fr));
            gap: var(--gallery-gap);
            width: 100%;
            max-width: 2400px;
            margin: 0 auto;
            direction: ltr;
          }
          .gallery-filter-spinner { animation: galleryFilterSpin 0.8s linear infinite; }
          @keyframes galleryFilterSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>

        {/* Clean Portfolio Summary Sub-header */}
        {summary.totalItemsCount > 0 && (
          <div
            style={{
              padding: '10px 20px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span>
                Ranked: <strong style={{ color: 'var(--color-text-primary)' }}>{items.length}</strong> items
              </span>
              <span>•</span>
              <span>
                Volume: <strong style={{ color: 'var(--color-brand-600)' }}>{fmtQty(summary.portfolioTotalQty)}</strong> pcs
              </span>
              <span>•</span>
              <span>
                Value: <strong style={{ color: 'var(--color-brand-600)' }}>{fmt(summary.portfolioTotalAmnt)}</strong>
              </span>
            </div>
          </div>
        )}

        {isInitialLoading ? (
          <TopOrdersSkeleton />
        ) : (
          <TopOrdersGalleryGrid
            items={items}
            metric={metric}
            compareEnabled={compareEnabled}
            baseYear={baseYear}
            compareYear={compareYear}
            openPreview={(item) => setPreviewItem(item)}
            fmt={fmt}
            fmtQty={fmtQty}
          />
        )}

        {isFilterLoading && !isInitialLoading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--color-surface-1) 72%, transparent)", pointerEvents: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--color-border-light)", borderRadius: 8, background: "var(--color-surface-0)", color: "var(--color-text-primary)", padding: "10px 14px", boxShadow: "0 10px 30px color-mix(in srgb, var(--color-surface-900) 18%, transparent)", fontSize: "0.82rem", fontWeight: 900 }}>
              <span className="gallery-filter-spinner" style={{ width: 16, height: 16, border: "2px solid color-mix(in srgb, var(--color-brand-500) 22%, transparent)", borderTopColor: "var(--color-brand-500)", borderRadius: "50%" }} />
              Updating portfolio results...
            </div>
          </div>
        )}
      </div>

      <TopOrdersItemPreview
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        baseYear={baseYear}
        compareYear={compareYear}
        compareEnabled={compareEnabled}
        metric={metric}
        fmt={fmt}
        fmtQty={fmtQty}
      />
    </div>
  );
}
