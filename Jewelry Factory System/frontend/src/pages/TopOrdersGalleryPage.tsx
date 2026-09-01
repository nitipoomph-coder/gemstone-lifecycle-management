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
    perspectiveMode,
    setPerspectiveMode,
    swapYears,
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
              perspectiveMode={perspectiveMode}
              setPerspectiveMode={setPerspectiveMode}
              swapYears={swapYears}
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

        {/* WCAG 2.1 AA — Portfolio Summary Sub-header with Accessible KPI Cards */}
        {summary.totalItemsCount > 0 && (
          <div
            role="banner"
            aria-label="Portfolio summary and key performance indicators"
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              borderBottom: '1px solid var(--color-border-light)',
              background: 'var(--color-surface-0)',
            }}
          >
            {/* Left Side: Scope & Ranked Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  role="status"
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-700)',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    border: '1px solid var(--color-brand-200)',
                  }}
                >
                  {perspectiveMode === 'compare' ? `Compare: ${baseYear} vs ${compareYear}` : 'Combined All Years'}
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                  Top Ranked ({items.length.toLocaleString()} Items)
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                {perspectiveMode === 'compare'
                  ? `Ranked by ${baseYear} metric • Comparing head-to-head with ${compareYear}`
                  : `Cumulative volume & value across all selected years in portfolio`}
              </span>
            </div>

            {/* Right Side: KPI Cards for Volume & Value */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* KPI Card 1: Volume */}
              {(() => {
                const volLabel = perspectiveMode === 'compare' ? `${baseYear} Volume` : 'Total Volume';
                const volValue = perspectiveMode === 'compare' ? summary.baseYearTotalQty : summary.portfolioTotalQty;
                const hasVolDelta = summary.compareYearTotalQty > 0 && summary.baseYearTotalQty > 0;
                const volUp = summary.baseYearTotalQty >= summary.compareYearTotalQty;
                const volDeltaPct = hasVolDelta ? (((summary.baseYearTotalQty - summary.compareYearTotalQty) / summary.compareYearTotalQty) * 100).toFixed(1) : '0';
                const volDeltaAbs = summary.baseYearTotalQty - summary.compareYearTotalQty;
                return (
                  <div
                    role="region"
                    aria-label={`${volLabel}: ${fmtQty(volValue)} pieces${hasVolDelta ? `, ${volUp ? 'increased' : 'decreased'} ${volDeltaPct} percent year over year` : ''}`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: 'var(--color-surface-1)',
                      border: '1px solid var(--color-border-light)',
                      minWidth: 190,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {volLabel}
                      </span>
                      {hasVolDelta && (
                        <span
                          aria-hidden="true"
                          style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            background: volUp ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                            color: volUp ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                          }}
                          title={`${baseYear} (${fmtQty(summary.baseYearTotalQty)} pcs) vs ${compareYear} (${fmtQty(summary.compareYearTotalQty)} pcs): ${volUp ? '+' : ''}${fmtQty(volDeltaAbs)} pcs`}
                        >
                          {volUp ? '▲ +' : '▼ '}{volDeltaPct}%
                        </span>
                      )}
                      {/* WCAG 1.4.1: Screen reader text — not relying on color alone */}
                      {hasVolDelta && (
                        <span className="sr-only">
                          Volume {volUp ? 'increased' : 'decreased'} by {volDeltaPct} percent compared to {compareYear}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span aria-live="polite" style={{ fontSize: '1.2rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                        {fmtQty(volValue)}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>pcs</span>
                    </div>
                    {perspectiveMode === 'combined' && summary.compareYearTotalQty > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                        {baseYear}: {fmtQty(summary.baseYearTotalQty)} pcs ({volUp ? '+' : ''}{fmtQty(volDeltaAbs)} pcs vs {compareYear})
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* KPI Card 2: Value */}
              {(() => {
                const valLabel = perspectiveMode === 'compare' ? `${baseYear} Value` : 'Total Value';
                const valValue = perspectiveMode === 'compare' ? summary.baseYearTotalAmnt : summary.portfolioTotalAmnt;
                const hasValDelta = summary.compareYearTotalAmnt > 0 && summary.baseYearTotalAmnt > 0;
                const valUp = summary.baseYearTotalAmnt >= summary.compareYearTotalAmnt;
                const valDeltaPct = hasValDelta ? (((summary.baseYearTotalAmnt - summary.compareYearTotalAmnt) / summary.compareYearTotalAmnt) * 100).toFixed(1) : '0';
                return (
                  <div
                    role="region"
                    aria-label={`${valLabel}: ${fmt(valValue)}${hasValDelta ? `, ${valUp ? 'increased' : 'decreased'} ${valDeltaPct} percent year over year` : ''}`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: 'var(--color-surface-1)',
                      border: '1px solid var(--color-border-light)',
                      minWidth: 190,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {valLabel}
                      </span>
                      {hasValDelta && (
                        <span
                          aria-hidden="true"
                          style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            background: valUp ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                            color: valUp ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                          }}
                        >
                          {valUp ? '▲ +' : '▼ '}{valDeltaPct}%
                        </span>
                      )}
                      {hasValDelta && (
                        <span className="sr-only">
                          Value {valUp ? 'increased' : 'decreased'} by {valDeltaPct} percent compared to {compareYear}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span aria-live="polite" style={{ fontSize: '1.2rem', fontWeight: 950, color: 'var(--color-brand-600)', fontFamily: 'var(--font-display)' }}>
                        {fmt(valValue)}
                      </span>
                    </div>
                    {perspectiveMode === 'combined' && summary.compareYearTotalAmnt > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                        {baseYear}: {fmt(summary.baseYearTotalAmnt)}
                      </span>
                    )}
                  </div>
                );
              })()}
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
            perspectiveMode={perspectiveMode}
            openPreview={(item) => setPreviewItem(item)}
            fmt={fmt}
            fmtQty={fmtQty}
          />
        )}

        {isFilterLoading && !isInitialLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in srgb, var(--color-surface-0) 65%, transparent)",
              backdropFilter: "blur(2px)",
              cursor: "wait",
              userSelect: "none",
              pointerEvents: "all",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid var(--color-border-light)",
                borderRadius: 8,
                background: "var(--color-surface-0)",
                color: "var(--color-text-primary)",
                padding: "10px 16px",
                boxShadow: "0 10px 30px color-mix(in srgb, var(--color-surface-900) 18%, transparent)",
                fontSize: "0.82rem",
                fontWeight: 900,
                cursor: "wait",
              }}
            >
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
        perspectiveMode={perspectiveMode}
        fmt={fmt}
        fmtQty={fmtQty}
      />
    </div>
  );
}
