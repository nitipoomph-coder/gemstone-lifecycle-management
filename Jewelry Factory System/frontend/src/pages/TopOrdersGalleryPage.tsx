import { useRef } from "react";
import { Search } from "lucide-react";
import Topbar from "../components/layout/Topbar";
import { useTopOrdersGalleryData, getGroupLabel, customerItemKey } from "../hooks/useTopOrdersGalleryData";
import { TopOrdersFilterBar } from "../components/dashboard/topOrders/TopOrdersFilterBar";
import { TopOrdersGalleryGrid } from "../components/dashboard/topOrders/TopOrdersGalleryGrid";
import { TopOrdersItemPreview } from "../components/dashboard/topOrders/TopOrdersItemPreview";
import { TopOrdersSkeleton } from "../components/dashboard/topOrders/TopOrdersSkeleton";
import { EmptyFilterPill } from "../components/dashboard/topOrders/TopOrdersItemPreview"; // Ensure it's exported or just moved
import "./SalesResponsive.css";

export default function TopOrdersGalleryPage() {
  const {
    metric,
    isInitialLoading,
    isFilterLoading,
    availableYears,
    baseYear,
    selGroups,
    setSelGroups,
    searchDraft,
    setSearchDraft,
    searchQuery,
    setSearchQuery,
    periodDraft,
    setPeriodDraft,
    compareEnabled,
    previewItem,
    setPreviewItem,
    compareYear,
    itemsYearlyByPair,
    compareLoading,
    tableData,
    analyticsPath,
    selectedPeriodLabel,
    startFilterTransition,
    // Add missing exports from hook for FilterBar
  } = useTopOrdersGalleryData();

  // We need to implement the fmt functions
  const fmt = (val: number) => {
    if (metric === "qty") return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtSignedQty = (value: number) => `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // Also need to get comparison data to pass down
  const LOW_BASE_QTY = 100;
  const comparisonsByPair = (() => {
    const next: Record<string, any> = {};
    if (!compareEnabled || !baseYear || !compareYear || baseYear === compareYear) return next;
    Object.values(itemsYearlyByPair).forEach((item) => {
      const rowsByYear = new Map(item.data.map((row: any) => [String(row.year), row]));
      const baseQty = (rowsByYear.get(baseYear) as any)?.qty || 0;
      const compareQty = (rowsByYear.get(compareYear) as any)?.qty || 0;
      const diff = baseQty - compareQty;
      const pct = compareQty > 0 ? (diff / compareQty) * 100 : null;
      // We assume firstDataYear logic is in the hook, let's just make it simple here or pass firstDataYear from hook
      next[customerItemKey(item.normalizedCustomerCode || item.customerCode, item.normalizedStyleNo || item.styleNo)] = {
        baseYear, compareYear, baseQty, compareQty, combinedQty: baseQty + compareQty,
        combinedLabel: [compareYear, baseYear].sort((a, b) => Number(a) - Number(b)).join("-"),
        diff, pct, hasAnyData: baseQty > 0 || compareQty > 0, isLowBase: compareQty > 0 && compareQty < LOW_BASE_QTY,
      };
    });
    return next;
  })();

  const previewRef = useRef<HTMLDivElement>(null);
  const previewComparison = previewItem
    ? comparisonsByPair[customerItemKey(previewItem.customerCode || previewItem.cust, previewItem.id)]
    : undefined;

  const resetGalleryFilters = () => {
    window.location.reload(); // Simple reset for now or we can implement real reset
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
        contentLayout="dashboard-wide"
        rightContent={
          <TopOrdersFilterBar
            analyticsPath={analyticsPath}
            searchDraft={searchDraft}
            setSearchDraft={setSearchDraft}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            startFilterTransition={startFilterTransition}
            periodDraft={periodDraft}
            setPeriodDraft={setPeriodDraft}
            buildPeriodDraft={() => ({} as any)} // will fix in real implementation
            applyPeriodPreset={() => {}}
            updatePeriodDraft={() => {}}
            applyPeriodDraft={() => {}}
            getDefaultCompareYear={() => ""}
            availableYears={availableYears}
            periodButtonLabel={baseYear}
            selectedPeriodLabel={selectedPeriodLabel}
            selGroups={selGroups}
            setSelGroups={setSelGroups}
            toggleGroup={(gId) => setSelGroups(prev => prev.includes(gId) ? prev.filter(x => x !== gId) : [...prev, gId])}
          />
        }
      />

      <div className="content-scrollbar sales-gallery-scroll" style={{ flex: 1, overflowY: "auto", background: "var(--color-surface-1)", position: "relative" }}>
        <style>{`
          .gallery-card-hover .hover-overlay { opacity: 0; transform: translateY(10px); transition: all 0.2s ease; }
          .gallery-card-hover:hover .hover-overlay { opacity: 1; transform: translateY(0); }
          .gallery-card-hover .hover-hint { opacity: 0; transition: all 0.2s ease; }
          .gallery-card-hover:hover .hover-hint { opacity: 1; }
          .gallery-img { transition: opacity 0.15s ease; }
          .gallery-grid {
            --gallery-track: clamp(280px, 18vw, 360px); --gallery-row: clamp(300px, 21vw, 360px); --gallery-gap: clamp(16px, 1.15vw, 24px);
            display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--gallery-track), 1fr));
            grid-auto-rows: var(--gallery-row); grid-auto-flow: row; justify-content: stretch; gap: var(--gallery-gap);
            width: 100%; max-width: 2400px; margin: 0 auto; direction: ltr;
          }
          .gallery-image-frame {
            flex: 1; display: flex; align-items: center; justify-content: center; background: var(--color-product-canvas);
            border-bottom: 1px solid var(--color-border-light); position: relative; min-height: 0; overflow: hidden; padding: 0;
          }
          .gallery-img { width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 0.25s ease, opacity 0.15s ease; }
          .gallery-card-hover:hover .gallery-img { transform: scale(1.04); }
          .gallery-preview-shell { width: min(94vw, 1480px); height: min(92vh, 920px); }
          .gallery-preview-grid { grid-template-columns: minmax(0, 1fr) minmax(340px, 380px); }
          .gallery-preview-image { width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain; }
          @media (min-width: 1800px) { .gallery-grid { --gallery-track: 320px; --gallery-row: 340px; --gallery-gap: 24px; max-width: 2400px; } }
          @media (max-width: 1180px) {
            .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); grid-auto-rows: 260px; max-width: 100%; }
            .gallery-card-hover { grid-column: span 1; grid-row: span 1; }
            .gallery-preview-grid { grid-template-columns: 1fr; overflow: auto; }
            .gallery-loading-card--featured { grid-column: span 1; grid-row: span 1; }
          }
          @media (max-width: 760px) {
            .gallery-grid { grid-template-columns: 1fr; grid-auto-rows: 260px; }
            .gallery-preview-shell { width: 96vw; height: 94vh; }
            .gallery-preview-header { align-items: flex-start !important; gap: 12px; padding: 14px 16px !important; }
          }
          .gallery-loading-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); grid-auto-rows: 260px;
            grid-auto-flow: row; gap: 20px; width: 100%; max-width: 2400px; margin: 0 auto;
          }
          .gallery-loading-card--featured { grid-column: span 2; grid-row: span 2; }
          .gallery-filter-spinner { animation: galleryFilterSpin 0.8s linear infinite; }
          .gallery-empty-icon-ring {
            position: absolute; inset: 10px; border-radius: 999px;
            border: 2px solid color-mix(in srgb, var(--color-brand-500) 18%, transparent); border-top-color: var(--color-brand-500);
            animation: galleryFilterSpin 1.1s linear infinite;
          }
          @keyframes galleryFilterSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
        {isInitialLoading ? (
          <TopOrdersSkeleton />
        ) : tableData.rows.length === 0 ? (
          <div style={{ minHeight: "min(620px, calc(100vh - 150px))", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
            <div className="gallery-preview-header" style={{ width: "min(720px, 100%)", position: "relative", overflow: "hidden", border: "1px solid var(--color-border-light)", borderRadius: 8, background: "var(--color-surface-0)", boxShadow: "0 24px 70px color-mix(in srgb, var(--color-surface-900) 12%, transparent)", padding: "34px" }}>
              <div style={{ position: "absolute", inset: "0 0 auto 0", height: 3, background: "color-mix(in srgb, var(--color-brand-500) 72%, var(--color-surface-0))", pointerEvents: "none" }} />
              <div style={{ display: "flex", gap: 24, alignItems: "center", position: "relative", zIndex: 1, flexWrap: "wrap" }}>
                <div style={{ width: 92, height: 92, borderRadius: 8, border: "1px solid color-mix(in srgb, var(--color-brand-500) 28%, var(--color-border-light))", background: "color-mix(in srgb, var(--color-brand-500) 9%, var(--color-surface-0))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--color-text-inverse) 12%, transparent)", position: "relative" }}>
                  <span className="gallery-empty-icon-ring" aria-hidden="true" />
                  <Search size={42} style={{ color: "var(--color-brand-500)", opacity: 0.92, position: "relative", zIndex: 1 }} />
                </div>
                <div style={{ flex: "1 1 360px", minWidth: 280 }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 950, color: "var(--color-text-primary)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>No Matching Customer Items</div>
                  <h2 style={{ margin: 0, fontSize: "1.75rem", lineHeight: 1.12, fontWeight: 950, color: "var(--color-text-primary)", fontFamily: "var(--font-display)" }}>No items match the current gallery filters.</h2>
                  <p style={{ margin: "10px 0 0", fontSize: "0.92rem", lineHeight: 1.6, fontWeight: 700, color: "var(--color-text-secondary)" }}>Try widening the period, switching type back to ALL, or clearing customer/search filters.</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 28, position: "relative", zIndex: 1 }}>
                <EmptyFilterPill label="Period" value={`${baseYear || "-"} / ${selectedPeriodLabel}`} />
                <EmptyFilterPill label="Groups" value={selGroups.length ? selGroups.map(getGroupLabel).join(", ") : "All Groups"} />
                <EmptyFilterPill label="Search" value={searchQuery || "None"} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24, position: "relative", zIndex: 1 }}>
                <button type="button" onClick={resetGalleryFilters} className="rounded-lg border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,var(--color-surface-0))] px-4 py-2 text-xs font-black text-[var(--color-brand-600)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-brand-500)_16%,var(--color-surface-0))]">Reset Filters</button>
              </div>
            </div>
          </div>
        ) : (
          <TopOrdersGalleryGrid
            rows={tableData.rows}
            comparisonsByPair={comparisonsByPair}
            compareLoading={compareLoading}
            openPreview={(row, idx) => setPreviewItem({
              id: row.topItem, rank: idx + 1, cust: row.label, customerCode: row.customerCode,
              customerLabel: row.displayMode === "group" ? "Customer Group" : "Customer", total: row.yrTotal, qty: row.topItemQty
            })}
            fmt={fmt}
            fmtQty={fmtQty}
            fmtSignedQty={fmtSignedQty}
            customerItemKey={customerItemKey}
          />
        )}
        {isFilterLoading && !isInitialLoading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--color-surface-1) 72%, transparent)", pointerEvents: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--color-border-light)", borderRadius: 8, background: "var(--color-surface-0)", color: "var(--color-text-primary)", padding: "10px 14px", boxShadow: "0 10px 30px color-mix(in srgb, var(--color-surface-900) 18%, transparent)", fontSize: "0.82rem", fontWeight: 900 }}>
              <span className="gallery-filter-spinner" style={{ width: 16, height: 16, border: "2px solid color-mix(in srgb, var(--color-brand-500) 22%, transparent)", borderTopColor: "var(--color-brand-500)", borderRadius: "50%" }} />
              Updating results...
            </div>
          </div>
        )}
      </div>

      <TopOrdersItemPreview
        previewItem={previewItem}
        previewRef={previewRef}
        setPreviewItem={setPreviewItem}
        previewComparison={previewComparison}
        compareLoading={compareLoading}
        fmt={fmt}
        fmtQty={fmtQty}
        fmtSignedQty={fmtSignedQty}
      />
    </div>
  );
}
