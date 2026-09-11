import { useMemo, type CSSProperties } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, BarChart3, RefreshCw } from "lucide-react";
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { ErpSegmentedControl } from "../components/ui/ErpButtons";
import { useTopOrdersGalleryData } from "../hooks/useTopOrdersGalleryData";
import { TopOrdersFilterBar } from "../components/dashboard/topOrders/TopOrdersFilterBar";
import { TopOrdersGalleryGrid } from "../components/dashboard/topOrders/TopOrdersGalleryGrid";
import { TopOrdersItemPreview } from "../components/dashboard/topOrders/TopOrdersItemPreview";
import { TopOrdersSkeleton } from "../components/dashboard/topOrders/TopOrdersSkeleton";
import { comparisonTextStyle, formatSignedPct } from "../components/dashboard/topOrders/galleryComparison";
import "./SalesResponsive.css";

export default function TopOrdersGalleryPage() {
  const {
    metric,
    isInitialLoading,
    isFilterLoading,
    availableYears,
    baseYear,
    setBaseYear,
    compareYear,
    setCompareYear,
    compareEnabled,
    setCompareEnabled,
    selGroups,
    setSelGroups,
    toggleGroup,
    periodPreset,
    periodDraft,
    setPeriodDraft,
    buildPeriodDraft,
    applyPeriodPreset,
    updatePeriodDraft,
    applyPeriodDraft,
    getDefaultCompareYear,
    productType,
    setProductType,
    perspectiveMode,
    setPerspectiveMode,
    swapYears,
    selectedPeriodLabel,
    searchDraft,
    setSearchDraft,
    searchQuery,
    setSearchQuery,
    startFilterTransition,
    summary,
    items,
    previewItem,
    setPreviewItem,
    resetFilters,
    isFiltered,
    refreshData,
    analyticsPath,
  } = useTopOrdersGalleryData();

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.startsWith("/dashboard/top-orders/analytics") ? "qty" : "gallery";

  const fmt = (val: number) => {
    if (metric === "qty") return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // Compute Product Type Significance KPI
  const typeSignificance = useMemo(() => {
    if (!items || items.length === 0) return null;
    const typeMap: Record<string, { label: string; totalQty: number; totalAmnt: number; count: number }> = {};
    let grandQty = 0;
    let grandAmnt = 0;

    for (const it of items) {
      const label = it.productTypeLabel || it.productType || 'Other';
      if (!typeMap[label]) {
        typeMap[label] = { label, totalQty: 0, totalAmnt: 0, count: 0 };
      }
      const qty = perspectiveMode === 'compare' ? it.baseYearQty : it.totalCombinedQty;
      const amnt = perspectiveMode === 'compare' ? it.baseYearAmnt : it.totalCombinedAmnt;
      typeMap[label].totalQty += qty;
      typeMap[label].totalAmnt += amnt;
      typeMap[label].count += 1;
      grandQty += qty;
      grandAmnt += amnt;
    }

    const sorted = Object.values(typeMap).sort((a, b) =>
      metric === 'amount' ? b.totalAmnt - a.totalAmnt : b.totalQty - a.totalQty
    );

    const leader = sorted[0];
    if (!leader) return null;

    const leaderVal = metric === 'amount' ? leader.totalAmnt : leader.totalQty;
    const grandVal = metric === 'amount' ? grandAmnt : grandQty;
    const leaderSharePct = grandVal > 0 ? (leaderVal / grandVal) * 100 : 0;

    // Top runner-ups summary footnote
    const runnerUps = sorted.slice(1, 4).map(t => {
      const share = grandVal > 0 ? ((metric === 'amount' ? t.totalAmnt : t.totalQty) / grandVal) * 100 : 0;
      return `${t.label}: ${share.toFixed(0)}%`;
    }).join(' · ');

    return {
      leaderLabel: leader.label,
      leaderSharePct,
      leaderCount: leader.count,
      runnerUps,
    };
  }, [items, metric, perspectiveMode]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-surface-1)]">
      <PageHeader
        breadcrumb={BREADCRUMBS.TOP_ORDERS_GALLERY}
        contentLayout="workspace"
        bottomContent={
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <TopOrdersFilterBar
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
              baseYear={baseYear}
              compareYear={compareYear}
              periodButtonLabel={baseYear}
              selectedPeriodLabel={selectedPeriodLabel}
              selGroups={selGroups}
              setSelGroups={setSelGroups}
              toggleGroup={toggleGroup}
              perspectiveMode={perspectiveMode}
              setPerspectiveMode={setPerspectiveMode}
              swapYears={swapYears}
              isFiltered={isFiltered}
              onReset={resetFilters}
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
            <div style={{ width: 1, height: 16, background: 'var(--color-border-light)', margin: '0 2px' }} />
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 4 }}>
              <ErpSegmentedControl
                ariaLabel="View Mode"
                value={activeTab}
                onChange={(val) => {
                  if (val === "qty") navigate(analyticsPath);
                }}
                options={[
                  { value: "gallery", label: "Gallery", icon: <LayoutGrid size={13} /> },
                  { value: "qty", label: "Qty", icon: <BarChart3 size={13} /> }
                ]}
              />
            </div>
          </div>
        }
      />

      {/* Main Responsive Grid Area */}
      <div className="flex-1 overflow-y-auto min-h-0 relative" style={{ scrollBehavior: 'smooth' }}>
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
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .gallery-card-clean {
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.3s ease;
            animation: galleryCardAppear 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
          }
          @keyframes galleryCardAppear {
            from {
              opacity: 0.6;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .gallery-filter-spinner { animation: galleryFilterSpin 0.8s linear infinite; }
          @keyframes galleryFilterSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .gallery-card-clean:hover .gallery-overlay {
            opacity: 1 !important;
          }
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {perspectiveMode === 'combined' && (
                  <>
                    <span
                      style={{
                        fontSize: 'var(--erp-text-section)',
                        fontWeight: 800,
                        color: 'var(--color-brand-600)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      Combined All Years
                    </span>
                    <span style={{ fontSize: 'var(--erp-text-section)', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>
                      ·
                    </span>
                  </>
                )}
                <span style={{ fontSize: 'var(--erp-text-section)', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                  Top Ranked ({items.length > 0 ? items.length : 50} Items)
                </span>
              </div>
              <span style={{ fontSize: 'var(--erp-text-control)', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                {perspectiveMode === 'compare'
                  ? `Ranked by ${baseYear} metric • Comparing head-to-head with ${compareYear}`
                  : `Cumulative volume & value across all selected years in portfolio`}
              </span>
            </div>

            {/* Right Side: KPI Cards for Volume, Value & Product Type Significance */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {(() => {
                const isCompare = perspectiveMode === 'compare';
                const hasVolDelta = summary.compareYearTotalQty > 0 && summary.baseYearTotalQty > 0;
                const volDeltaPct = hasVolDelta
                  ? ((summary.baseYearTotalQty - summary.compareYearTotalQty) / summary.compareYearTotalQty) * 100
                  : null;
                const volValue = isCompare ? summary.baseYearTotalQty : summary.portfolioTotalQty;
                const volLabel = isCompare ? `${baseYear} Volume` : 'Total Volume';

                const hasValDelta = summary.compareYearTotalAmnt > 0 && summary.baseYearTotalAmnt > 0;
                const valDeltaPct = hasValDelta
                  ? ((summary.baseYearTotalAmnt - summary.compareYearTotalAmnt) / summary.compareYearTotalAmnt) * 100
                  : null;
                const valValue = isCompare ? summary.baseYearTotalAmnt : summary.portfolioTotalAmnt;
                const valLabel = isCompare ? `${baseYear} Value` : 'Total Value';

                return (
                  <>
                    <GallerySummaryKpi
                      label={volLabel}
                      value={`${fmtQty(volValue)} pcs`}
                      ariaLabel={`${volLabel}: ${fmtQty(volValue)} pieces${hasVolDelta ? `, ${formatSignedPct(volDeltaPct ?? 0)} versus ${compareYear}` : ''}`}
                      deltaPct={volDeltaPct}
                      deltaVsYear={compareYear}
                      showHeaderDelta={isCompare && hasVolDelta}
                      deltaTitle={hasVolDelta
                        ? `${baseYear} ${fmtQty(summary.baseYearTotalQty)} pcs vs ${compareYear} ${fmtQty(summary.compareYearTotalQty)} pcs`
                        : undefined}
                      footnote={!isCompare && hasVolDelta
                        ? `${baseYear}: ${fmtQty(summary.baseYearTotalQty)} pcs · ${formatSignedPct(volDeltaPct ?? 0)} vs ${compareYear}`
                        : undefined}
                    />
                    <GallerySummaryKpi
                      label={valLabel}
                      value={fmt(valValue)}
                      ariaLabel={`${valLabel}: ${fmt(valValue)}${hasValDelta ? `, ${formatSignedPct(valDeltaPct ?? 0)} versus ${compareYear}` : ''}`}
                      deltaPct={valDeltaPct}
                      deltaVsYear={compareYear}
                      showHeaderDelta={isCompare && hasValDelta}
                      deltaTitle={hasValDelta
                        ? `${baseYear} ${fmt(summary.baseYearTotalAmnt)} vs ${compareYear} ${fmt(summary.compareYearTotalAmnt)}`
                        : undefined}
                      footnote={!isCompare && hasValDelta
                        ? `${baseYear}: ${fmt(summary.baseYearTotalAmnt)} · ${formatSignedPct(valDeltaPct ?? 0)} vs ${compareYear}`
                        : undefined}
                    />
                    {typeSignificance && (
                      <GallerySummaryKpi
                        label="Top Product Type"
                        value={typeSignificance.leaderLabel}
                        unit={`${typeSignificance.leaderSharePct.toFixed(1)}% Share`}
                        ariaLabel={`Top Product Type: ${typeSignificance.leaderLabel}, ${typeSignificance.leaderSharePct.toFixed(1)}% share`}
                        deltaPct={null}
                        deltaVsYear=""
                        showHeaderDelta={false}
                        footnote={typeSignificance.runnerUps ? typeSignificance.runnerUps : `${typeSignificance.leaderCount} items`}
                      />
                    )}
                  </>
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

const kpiTileStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "var(--color-surface-1)",
  border: "1px solid var(--color-border-light)",
  minWidth: 190,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

function GallerySummaryKpi({
  label,
  value,
  unit,
  ariaLabel,
  deltaPct,
  deltaVsYear,
  showHeaderDelta,
  deltaTitle,
  footnote,
}: {
  label: string;
  value: string;
  unit?: string;
  ariaLabel: string;
  deltaPct: number | null;
  deltaVsYear: string;
  showHeaderDelta: boolean;
  deltaTitle?: string;
  footnote?: string;
}) {
  return (
    <div role="region" aria-label={ariaLabel} style={kpiTileStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: "var(--erp-text-control)", fontWeight: 800, color: "var(--color-text-tertiary)" }}>
          {label}
        </span>
        {showHeaderDelta && deltaPct !== null && (
          <span title={deltaTitle} style={comparisonTextStyle(deltaPct)}>
            {formatSignedPct(deltaPct)} vs {deltaVsYear}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          aria-live="polite"
          style={{
            fontSize: "var(--erp-text-kpi)",
            fontWeight: 800,
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-display)",
            letterSpacing: 0,
          }}
        >
          {value}
        </span>
        {unit ? (
          <span style={{ fontSize: "var(--erp-text-control)", fontWeight: 800, color: "var(--color-text-tertiary)" }}>
            {unit}
          </span>
        ) : null}
      </div>
      {footnote ? (
        <span style={{ fontSize: "var(--erp-text-dense)", color: "var(--color-text-tertiary)", fontWeight: 700 }}>
          {footnote}
        </span>
      ) : null}
    </div>
  );
}
