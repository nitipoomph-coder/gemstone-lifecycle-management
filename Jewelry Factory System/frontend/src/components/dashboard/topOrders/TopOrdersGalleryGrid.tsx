import type { SyntheticEvent } from 'react';
import type { TopGalleryItem } from '../../../services/itemYearlySummaryAPI';
import type { PerspectiveMode } from '../../../hooks/useTopOrdersGalleryData';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TopOrdersGalleryGridProps {
  items: TopGalleryItem[];
  metric: 'qty' | 'amount';
  compareEnabled: boolean;
  baseYear: string;
  compareYear: string;
  perspectiveMode?: PerspectiveMode;
  openPreview: (item: TopGalleryItem) => void;
  fmt: (value: number) => string;
  fmtQty: (value: number) => string;
}

export function TopOrdersGalleryGrid({
  items,
  metric,
  compareEnabled,
  baseYear,
  compareYear,
  perspectiveMode = 'combined',
  openPreview,
  fmt,
  fmtQty,
}: TopOrdersGalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: 320 }}>
        <p className="text-sm font-bold text-[var(--color-text-secondary)]">
          No items found matching the selected filters.
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          Try adjusting product types, customer groups, or period range.
        </p>
      </div>
    );
  }

  return (
    <div className="gallery-grid" style={{ padding: '16px 20px' }}>
      {items.map((item) => {
        const isTop3 = item.rank <= 3;
        const sharePct = metric === 'amount' ? item.shareOfPortfolioAmntPct : item.shareOfPortfolioQtyPct;
        const isCompare = perspectiveMode === 'compare';

        return (
          <div
            key={item.itemNo}
            className="gallery-card-clean group"
            onClick={() => openPreview(item)}
            style={{
              background: 'var(--color-surface-0)',
              borderRadius: 8,
              border: isTop3 ? '1px solid var(--color-border-strong)' : '1px solid var(--color-border-light)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            }}
          >
            {/* Header Meta: Rank + Category + % Share or YoY Badge */}
            <div
              style={{
                padding: '10px 12px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontWeight: 950,
                    color: isTop3 ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                  }}
                >
                  #{item.rank}
                </span>
                <span style={{ color: 'var(--color-border-default)' }}>•</span>
                <span style={{ fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                  {item.productTypeLabel}
                </span>
              </div>

              {isCompare && compareEnabled && compareYear && item.yoyGrowthPct !== null ? (
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    color: item.yoyGrowthPct >= 0 ? 'var(--color-brand-600)' : 'var(--color-danger-500)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  {item.yoyGrowthPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{item.yoyGrowthPct >= 0 ? '+' : ''}{item.yoyGrowthPct.toFixed(1)}%</span>
                </div>
              ) : (
                <div style={{ fontWeight: 900, color: 'var(--color-brand-600)', fontSize: '0.75rem' }}>
                  {sharePct}% <span style={{ fontWeight: 600, color: 'var(--color-text-tertiary)', fontSize: '0.7rem' }}>Share</span>
                </div>
              )}
            </div>

            {/* Product Image Canvas (Clean, no nested borders) */}
            <div
              style={{
                height: 190,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                padding: '8px 12px',
              }}
            >
              <img
                src={`/api/photos/ps/${item.itemNo}`}
                alt={item.itemNo}
                style={{
                  objectFit: 'contain',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  transition: 'transform 0.2s ease',
                }}
                className="group-hover:scale-105"
                onError={(event: SyntheticEvent<HTMLImageElement>) => {
                  const image = event.currentTarget;
                  if (!image.dataset.triedCad) {
                    image.dataset.triedCad = 'true';
                    image.src = `/api/photos/cad/${item.itemNo}`;
                  } else {
                    image.style.display = 'none';
                  }
                }}
              />

              {/* Minimal Hover Overlay */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{
                  background: 'color-mix(in srgb, var(--color-surface-900) 80%, transparent)',
                  backdropFilter: 'blur(2px)',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: 'var(--color-overlay-text-muted)', fontWeight: 700 }}>
                  {isCompare ? `${baseYear} vs ${compareYear}` : `Combined (${baseYear}${compareEnabled && compareYear ? ` & ${compareYear}` : ''})`}
                </span>
                <span style={{ fontSize: '1.25rem', color: 'var(--color-overlay-text)', fontWeight: 950, fontFamily: 'var(--font-display)' }}>
                  {fmtQty(isCompare ? item.baseYearQty : item.totalCombinedQty)} pcs
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-brand-400)', fontWeight: 800 }}>
                  {fmt(isCompare ? item.baseYearAmnt : item.totalCombinedAmnt)}
                </span>

                {compareEnabled && compareYear && item.yoyGrowthPct !== null && (
                  <div
                    style={{
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: item.yoyGrowthPct >= 0 ? '#4ade80' : '#f87171',
                    }}
                  >
                    <span>
                      {baseYear}: {fmtQty(item.baseYearQty)} pcs ({item.yoyGrowthPct >= 0 ? '▲ +' : '▼ '}{item.yoyGrowthPct.toFixed(1)}% | {item.qtyDiff >= 0 ? '+' : ''}{fmtQty(item.qtyDiff)} pcs vs {compareYear})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Summary: Item No + Customer + Metric */}
            <div
              style={{
                padding: '6px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 950,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-display)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.itemNo}
                >
                  {item.itemNo}
                </span>

                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    color: 'var(--color-brand-600)',
                    fontFamily: 'var(--font-display)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isCompare
                    ? (metric === 'amount' ? fmt(item.baseYearAmnt) : `${fmtQty(item.baseYearQty)} pcs`)
                    : (metric === 'amount' ? fmt(item.totalCombinedAmnt) : `${fmtQty(item.totalCombinedQty)} pcs`)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                <span>{item.primaryGroupLabel}</span>
                {compareEnabled && compareYear && (
                  isCompare ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                      vs {compareYear}: <strong style={{ color: 'var(--color-text-secondary)' }}>{fmtQty(item.compareYearQty)}</strong>
                    </span>
                  ) : (
                    item.yoyGrowthPct !== null && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          color: item.yoyGrowthPct >= 0 ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                          background: item.yoyGrowthPct >= 0 ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                        title={`ปี ${baseYear} (${fmtQty(item.baseYearQty)} pcs) เทียบ ${compareYear} (${fmtQty(item.compareYearQty)} pcs): ${item.qtyDiff >= 0 ? '+' : ''}${fmtQty(item.qtyDiff)} pcs (${item.yoyGrowthPct >= 0 ? '+' : ''}${item.yoyGrowthPct.toFixed(1)}%)`}
                      >
                        {item.yoyGrowthPct >= 0 ? '▲ +' : '▼ '}{item.yoyGrowthPct.toFixed(1)}% ({item.qtyDiff >= 0 ? '+' : ''}{fmtQty(item.qtyDiff)} pcs)
                      </span>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
