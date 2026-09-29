import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { TopGalleryItem } from "../../../services/itemYearlySummaryAPI";


const fmtQty = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function TopAnalyticsTable({ 
  rows, 
  loading, 
  displayYears,
  onPhotoClick
}: { 
  rows: TopGalleryItem[]; 
  loading: boolean;
  displayYears: string[];
  onPhotoClick?: (item: TopGalleryItem) => void;
}) {
  const showAvg = displayYears.length > 0;
  const colSpanCount = 4 + displayYears.length + (showAvg ? 2 : 0);

  return (
    <table className="sales-dense-table sales-dense-table--sticky-first" style={{ width: '100%', minWidth: 1020, '--sales-table-row-height': '88px' } as React.CSSProperties}>
      <thead>
        <tr>
          <Th style={{ width: 50, textAlign: 'center' }}>No</Th>
          <Th style={{ width: 140 }}>Item</Th>
          <Th style={{ width: 140, textAlign: 'center' }}>Photo</Th>
          <Th style={{ width: 110 }}>Customer</Th>
          
          {/* Dynamic Year Columns in chronological order */}
          {displayYears.map(yr => (
            <Th key={yr} align="right" style={{ minWidth: 90 }}>{yr}</Th>
          ))}

          {/* Summary Headers: Total & Avg */}
          {showAvg && (
            <Th
              align="right"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-primary)',
                fontWeight: 950,
                fontSize: '14px',
                minWidth: 105,
              }}
            >
              Total
            </Th>
          )}
          {showAvg && (
            <Th
              align="right"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-primary)',
                fontWeight: 950,
                fontSize: '14px',
                minWidth: 105,
              }}
            >
              Avg
            </Th>
          )}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 15 }).map((_, index) => <SkeletonRow key={index} numCols={colSpanCount} />)
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={colSpanCount} className="sales-dense-empty">
              No items match the current filters.
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <AnalyticsTableRow 
              key={`${row.primaryCustCode}-${row.itemNo}`} 
              row={row}
              index={index}
              displayYears={displayYears}
              showAvg={showAvg}
              onPhotoClick={() => onPhotoClick?.(row)}
            />
          ))
        )}
      </tbody>
      {rows.length > 0 && !loading && (
        <tfoot>
          <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border-strong)', borderBottom: '2px solid var(--color-border-strong)' }}>
            <Td style={{ textAlign: 'center', fontWeight: 900 }}>Σ</Td>
            <Td style={{ fontWeight: 900, color: 'var(--color-text-primary)' }}>Grand Total</Td>
            <Td></Td>
            <Td style={{ color: 'var(--color-text-tertiary)', fontSize: '12px', fontWeight: 800 }}>{rows.length} Items</Td>
            {displayYears.map(yr => {
              const yrTotal = rows.reduce((s, r) => s + (r.yearlyTotals?.[yr]?.qty || 0), 0);
              return (
                <Td key={yr} align="right" style={{ fontWeight: 900, color: 'var(--color-text-primary)' }}>
                  {fmtQty(yrTotal)}
                </Td>
              );
            })}
            {showAvg && (
              <Td align="right" style={{ background: 'color-mix(in srgb, var(--color-surface-2) 50%, transparent)', fontWeight: 950, color: 'var(--color-text-primary)' }}>
                {fmtQty(rows.reduce((s, r) => s + displayYears.reduce((ys, yr) => ys + (r.yearlyTotals?.[yr]?.qty || 0), 0), 0))}
              </Td>
            )}
            {showAvg && (
              <Td align="right" style={{ background: 'color-mix(in srgb, var(--color-surface-2) 50%, transparent)', fontWeight: 950, color: 'var(--color-text-primary)' }}>
                {fmtQty(Math.round(rows.reduce((s, r) => s + displayYears.reduce((ys, yr) => ys + (r.yearlyTotals?.[yr]?.qty || 0), 0), 0) / (displayYears.length || 1)))}
              </Td>
            )}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function AnalyticsTableRow({ 
  row, 
  index, 
  displayYears,
  showAvg,
  onPhotoClick
}: { 
  row: TopGalleryItem; 
  index: number;
  displayYears: string[];
  showAvg: boolean;
  onPhotoClick?: () => void;
}) {
  // Compute exact displayed sum and average for the active years
  const rowDisplayedTotal = displayYears.reduce((sum, yr) => sum + (row.yearlyTotals?.[yr]?.qty || 0), 0);
  const rowDisplayedAvg = displayYears.length > 0 ? Math.round(rowDisplayedTotal / displayYears.length) : 0;

  // Compute trend indicator comparing latest year to previous year
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (displayYears.length >= 2) {
    const latestYr = displayYears[displayYears.length - 1];
    const prevYr = displayYears[displayYears.length - 2];
    const latestQty = row.yearlyTotals?.[latestYr]?.qty || 0;
    const prevQty = row.yearlyTotals?.[prevYr]?.qty || 0;
    if (latestQty > prevQty) trend = 'up';
    else if (latestQty < prevQty) trend = 'down';
    else trend = 'flat';
  }

  return (
    <tr style={{ animationDelay: `${Math.min(index * 10, 150)}ms` }}>
      <Td style={{ textAlign: "center", fontWeight: 900, color: "var(--color-text-tertiary)" }}>{row.rank}</Td>
      <Td>
        <div style={{ color: "var(--color-text-primary)", fontSize: "14.5px", fontWeight: 950, letterSpacing: '0.01em' }}>
          {row.itemNo}
        </div>
      </Td>
      <Td style={{ textAlign: "center" }}>
        <div style={{ cursor: onPhotoClick ? "pointer" : "default" }} onClick={onPhotoClick}>
          <PhotoThumb itemNo={row.itemNo} />
        </div>
      </Td>
      <Td>
        <div style={{ color: "var(--color-text-primary)", fontSize: "14px", fontWeight: 800 }}>
          {row.primaryCustCode || '-'}
        </div>
      </Td>

      {/* Dynamic Year Values */}
      {displayYears.map(yr => {
        const qtyForYear = row.yearlyTotals?.[yr]?.qty || 0;
        return (
          <Td key={yr} align="right" strong={qtyForYear > 0} style={{ color: qtyForYear === 0 ? "var(--color-text-tertiary)" : "inherit" }}>
            {fmtQty(qtyForYear)}
          </Td>
        );
      })}

      {/* Harmonious Total and Average Columns */}
      {showAvg && (
        <Td align="right" style={{ background: "color-mix(in srgb, var(--color-surface-2) 30%, transparent)", color: "var(--color-text-primary)", fontWeight: 950, fontSize: "14.5px" }}>
          {fmtQty(rowDisplayedTotal)}
        </Td>
      )}
      {showAvg && (
        <Td align="right" style={{ background: "color-mix(in srgb, var(--color-surface-2) 30%, transparent)", color: "var(--color-text-primary)", fontWeight: 900, fontSize: "14.5px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end", width: "100%" }}>
            <span>{fmtQty(rowDisplayedAvg)}</span>
            {trend === 'up' && <span style={{ color: 'var(--color-success-600)', fontSize: '11px', fontWeight: 950 }}>▲</span>}
            {trend === 'down' && <span style={{ color: 'var(--color-danger-600)', fontSize: '11px', fontWeight: 950 }}>▼</span>}
            {trend === 'flat' && <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>–</span>}
          </div>
        </Td>
      )}
    </tr>
  );
}

function PhotoThumb({ itemNo }: { itemNo: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={photoShellStyle}>
      {failed ? (
        <ImageOff size={16} style={{ color: "var(--color-text-tertiary)" }} />
      ) : (
        <img
          src={`/api/photos/ps/${itemNo}`}
          alt={itemNo}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
            const image = event.currentTarget;
            if (!image.dataset.triedCad) {
              image.dataset.triedCad = "true";
              image.src = `/api/photos/cad/${itemNo}`;
            } else {
              setFailed(true);
            }
          }}
        />
      )}
    </div>
  );
}

function Th({ children, align = "left", style = {} }: { children: React.ReactNode; align?: "left" | "right"; style?: React.CSSProperties }) {
  return <th className={align === "right" ? "sales-dense-table__number" : undefined} style={{ textAlign: align, fontSize: '14px', ...style }}>{children}</th>;
}

function Td({ children, align = "left", strong = false, style = {} }: { children?: React.ReactNode; align?: "left" | "right"; strong?: boolean; style?: React.CSSProperties }) {
  return <td className={align === "right" ? "sales-dense-table__number" : undefined} style={{ textAlign: align, fontWeight: strong ? 900 : 800, fontSize: '14px', ...style }}>{children}</td>;
}

function SkeletonRow({ numCols }: { numCols: number }) {
  return (
    <tr>
      {Array.from({ length: numCols }).map((_, index) => (
        <td key={index}>
          <span className="sales-dense-skeleton" style={index === 1 ? { width: 44, height: 36 } : { width: `${Math.random() * 40 + 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

const photoShellStyle: React.CSSProperties = {
  width: 112,
  height: 76,
  borderRadius: 8,
  border: "1px solid var(--color-border-light)",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  margin: "0 auto",
  padding: 4,
  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.12)",
  transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
};

