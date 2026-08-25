import type { SyntheticEvent } from 'react';
import type { GalleryRow } from '../../../hooks/useTopOrdersGalleryData';
import type { CompareSummary } from './TopOrdersItemPreview';

type CompareDensity = "full" | "medium" | "compact";

function YearQtyCell({ year, qty, fmtQty }: { year: string; qty: number; fmtQty: (value: number) => string }) {
  return (
    <div style={{ border: "1px solid color-mix(in srgb, var(--color-overlay-text) 18%, transparent)", borderRadius: 8, padding: "7px 8px" }}>
      <div style={{ fontSize: "0.72rem", color: "var(--color-overlay-text-muted)", fontWeight: 800 }}>{year}</div>
      <div style={{ fontSize: "0.9rem", color: "var(--color-overlay-text)", fontWeight: 900, whiteSpace: "nowrap" }}>{fmtQty(qty)} pcs</div>
    </div>
  );
}

function LegacyCardOverlay({ row, fmt, compact }: { row: GalleryRow; fmt: (value: number) => string; compact: boolean }) {
  return (
    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex flex-col items-center gap-2 text-center">
      <span style={{ fontSize: compact ? "0.82rem" : "1.05rem", color: "var(--color-overlay-text-muted)", fontWeight: 700 }}>
        Ordered Qty
      </span>
      <span style={{ fontSize: compact ? "1.35rem" : "2rem", color: "var(--color-overlay-text)", fontWeight: 900, fontFamily: "var(--font-display)", lineHeight: 1 }}>
        {(row.topItemQty || 0).toLocaleString()} <span style={{ fontSize: compact ? "0.72rem" : "1rem", fontWeight: 700, color: "var(--color-overlay-text-muted)" }}>pcs</span>
      </span>
      {!compact && <div style={{ width: 40, height: 2, background: "color-mix(in srgb, var(--color-overlay-text) 45%, transparent)", margin: "6px 0" }} />}
      <span style={{ fontSize: compact ? "0.72rem" : "0.9rem", color: "var(--color-overlay-text-muted)", fontWeight: 700 }}>
        Total Value
      </span>
      <span style={{ fontSize: compact ? "0.95rem" : "1.5rem", color: "var(--color-brand-400)", fontWeight: 800, whiteSpace: "nowrap" }}>
        {fmt(row.yrTotal)}
      </span>
    </div>
  );
}

interface CompareCardOverlayProps {
  comparison?: CompareSummary;
  density: CompareDensity;
  loading: boolean;
  row: GalleryRow;
  fmt: (value: number) => string;
  fmtQty: (value: number) => string;
  fmtSignedQty: (value: number) => string;
}

function CompareCardOverlay({
  comparison,
  density,
  loading,
  row,
  fmt,
  fmtQty,
  fmtSignedQty,
}: CompareCardOverlayProps) {
  const isFull = density === "full";
  const isCompact = density === "compact";

  const shellStyle = {
    width: isCompact ? "86%" : "min(360px, 86%)",
    gap: isCompact ? 5 : 8,
  };

  if (loading) {
    return (
      <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex flex-col items-center text-center" style={shellStyle}>
        <span style={{ fontSize: isCompact ? "0.76rem" : "0.9rem", color: "var(--color-overlay-text-muted)", fontWeight: 800 }}>
          Loading comparison...
        </span>
      </div>
    );
  }

  if (!comparison?.hasAnyData) {
    return <LegacyCardOverlay row={row} fmt={fmt} compact={isCompact} />;
  }

  const directionIcon = comparison.diff >= 0 ? "\u25B2" : "\u25BC";
  const directionColor = comparison.diff >= 0 ? "var(--color-brand-400)" : "var(--color-danger-500)";
  const pctLabel = comparison.isNew
    ? "%Change: New"
    : comparison.isLowBase
      ? "%Change: Low base"
      : `%Change: ${directionIcon} ${comparison.diff >= 0 ? "+" : "-"}${Math.abs(comparison.pct || 0).toFixed(1)}%`;

  return (
    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex flex-col items-center text-center" style={shellStyle}>
      <span style={{ fontSize: isCompact ? "0.68rem" : "0.9rem", color: "var(--color-overlay-text-muted)", fontWeight: 800 }}>
        Combined {comparison.combinedLabel}
      </span>
      <span
        style={{
          fontSize: isFull ? "2rem" : isCompact ? "1.25rem" : "1.55rem",
          color: "var(--color-overlay-text)",
          fontWeight: 900,
          fontFamily: "var(--font-display)",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {fmtQty(comparison.combinedQty)} <span style={{ fontSize: isCompact ? "0.68rem" : "0.9rem", fontWeight: 700, color: "var(--color-overlay-text-muted)" }}>pcs</span>
      </span>
      {!isCompact && <div style={{ width: 40, height: 2, background: "color-mix(in srgb, var(--color-overlay-text) 45%, transparent)", margin: isFull ? "4px 0" : "2px 0" }} />}
      <span style={{ fontSize: isCompact ? "0.75rem" : "0.96rem", color: "var(--color-overlay-text)", fontWeight: 900 }}>
        Diff: {fmtSignedQty(comparison.diff)} pcs
      </span>
      <span style={{ fontSize: isCompact ? "0.82rem" : "1.05rem", color: directionColor, fontWeight: 900, whiteSpace: "nowrap" }}>
        {pctLabel}
      </span>
      {isFull ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%", marginTop: 4 }}>
          <YearQtyCell year={comparison.baseYear} qty={comparison.baseQty} fmtQty={fmtQty} />
          <YearQtyCell year={comparison.compareYear} qty={comparison.compareQty} fmtQty={fmtQty} />
        </div>
      ) : (
        <span style={{ fontSize: isCompact ? "0.66rem" : "0.78rem", color: "var(--color-overlay-text-muted)", fontWeight: 800, whiteSpace: "nowrap" }}>
          {comparison.baseYear}: {fmtQty(comparison.baseQty)} | {comparison.compareYear}: {fmtQty(comparison.compareQty)}
        </span>
      )}
    </div>
  );
}

interface TopOrdersGalleryGridProps {
  rows: GalleryRow[];
  comparisonsByPair: Record<string, CompareSummary>;
  compareLoading: boolean;
  openPreview: (row: GalleryRow, idx: number) => void;
  fmt: (value: number) => string;
  fmtQty: (value: number) => string;
  fmtSignedQty: (value: number) => string;
  customerItemKey: (customerCode: unknown, styleNo: unknown) => string;
}

export function TopOrdersGalleryGrid({
  rows,
  comparisonsByPair,
  compareLoading,
  openPreview,
  fmt,
  fmtQty,
  fmtSignedQty,
  customerItemKey
}: TopOrdersGalleryGridProps) {
  
  const getRankStyle = (idx: number) => {
    if (idx === 0) return { bg: "var(--color-rank-1)", text: "var(--color-on-rank)" };
    if (idx === 1) return { bg: "var(--color-rank-2)", text: "var(--color-on-rank)" };
    if (idx === 2) return { bg: "var(--color-rank-3)", text: "var(--color-on-rank)" };
    return { bg: "var(--color-surface-2)", text: "var(--color-text-primary)" };
  };

  return (
    <div className="gallery-grid">
      {rows.map((row, idx) => {
        const isFeaturedRank = idx < 3;
        const colSpan = 1;
        const rowSpan = 1;
        const rankStyle = getRankStyle(idx);
        const displayRank = idx + 1;
        const featuredBorder = isFeaturedRank
          ? `1px solid color-mix(in srgb, ${rankStyle.bg} 46%, var(--color-border-light))`
          : "1px solid var(--color-border-light)";
        const featuredShadow = isFeaturedRank
          ? "0 14px 34px color-mix(in srgb, var(--color-surface-900) 16%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-brand-500) 8%, transparent)"
          : "var(--shadow-panel)";
        const comparison = comparisonsByPair[customerItemKey(row.customerCode, row.topItem)];
        const compareDensity: CompareDensity = isFeaturedRank ? "medium" : "compact";

        return (
          <div
            key={`gallery_${row.rowKey}`}
            className="gallery-card-hover group"
            onClick={() => openPreview(row, idx)}
            style={{
              "--card-col-span": colSpan,
              "--card-row-span": rowSpan,
              "--gallery-image-max-width": isFeaturedRank ? "520px" : "300px",
              "--gallery-image-max-height": isFeaturedRank ? "300px" : "230px",
              background: isFeaturedRank
                ? "color-mix(in srgb, var(--color-brand-500) 5%, var(--color-surface-0))"
                : "var(--color-surface-0)",
              borderRadius: 8,
              overflow: "hidden",
              position: "relative",
              boxShadow: featuredShadow,
              border: featuredBorder,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              direction: "ltr",
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isFeaturedRank
                ? "0 18px 42px color-mix(in srgb, var(--color-surface-900) 20%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-brand-500) 14%, transparent)"
                : "var(--shadow-floating)";
              e.currentTarget.style.borderColor = isFeaturedRank
                ? `color-mix(in srgb, ${rankStyle.bg} 58%, var(--color-brand-300))`
                : "var(--color-brand-300)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = featuredShadow;
              e.currentTarget.style.borderColor = isFeaturedRank
                ? `color-mix(in srgb, ${rankStyle.bg} 46%, var(--color-border-light))`
                : "var(--color-border-light)";
            }}
          >
            <div className="gallery-image-frame">
              <img
                src={`/api/photos/ps/${row.topItem}`}
                alt={row.topItem}
                className="gallery-img"
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                onError={(event: SyntheticEvent<HTMLImageElement>) => {
                  const image = event.currentTarget;
                  if (!image.dataset.triedCad) {
                    image.dataset.triedCad = "true";
                    image.src = `/api/photos/cad/${row.topItem}`;
                  } else {
                    image.style.display = "none";
                  }
                }}
              />
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
                style={{ background: "color-mix(in srgb, var(--color-surface-900) 80%, transparent)" }}
              >
                <CompareCardOverlay
                  comparison={comparison}
                  density={compareDensity}
                  loading={compareLoading}
                  row={row}
                  fmt={fmt}
                  fmtQty={fmtQty}
                  fmtSignedQty={fmtSignedQty}
                />
              </div>
            </div>

            <div
              style={{
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                background: isFeaturedRank
                  ? "color-mix(in srgb, var(--color-brand-500) 4%, var(--color-surface-0))"
                  : "var(--color-surface-0)",
                borderTop: "1px solid var(--color-border-light)",
                zIndex: 10,
                position: "relative",
              }}
            >
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", flexWrap: "nowrap", overflow: "hidden" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: isFeaturedRank ? "var(--color-brand-500)" : "color-mix(in srgb, var(--color-surface-2) 80%, var(--color-surface-1))",
                    color: isFeaturedRank ? "var(--color-text-inverse)" : "var(--color-text-primary)",
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    lineHeight: 1.2,
                    flexShrink: 0,
                  }}
                >
                  #{displayRank}
                </span>

                <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                  {row.label}
                </span>

                <span style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}>•</span>

                <span
                  title={row.topItem}
                  style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {row.topItem}
                </span>
              </div>

              <span
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ fontSize: "0.78rem", color: "var(--color-brand-600)", fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}
              >
                View Detail
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
