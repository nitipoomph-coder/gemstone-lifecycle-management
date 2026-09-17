import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ImageOff, Minus } from "lucide-react";
import type { TopGalleryItem } from "../../../services/itemYearlySummaryAPI";
import type { PerspectiveMode } from "../../../hooks/useTopOrdersGalleryData";

const fmtQty = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtSignedQty = (val: number) => (val > 0 ? `+${fmtQty(val)}` : fmtQty(val));
const fmtPct = (val: number | null, isNew: boolean = false) => {
  if (isNew) return "New";
  if (val === null) return "-";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
};

export function TopAnalyticsTable({ 
  rows, 
  loading, 
  displayYears,
  perspectiveMode,
  compareEnabled
}: { 
  rows: TopGalleryItem[]; 
  loading: boolean;
  displayYears: string[];
  perspectiveMode: PerspectiveMode;
  compareEnabled: boolean;
}) {
  const isCompare = perspectiveMode === 'compare' && compareEnabled;

  return (
    <table className="sales-dense-table sales-dense-table--sticky-first" style={{ minWidth: 1040 }}>
      <thead>
        <tr>
          <Th style={{ width: 56 }}>No</Th>
          <Th style={{ width: 84 }}>Photo</Th>
          <Th>Item Details</Th>
          <Th>Customer / Group</Th>
          
          {/* Dynamic Year Columns (Matrix Style) */}
          {displayYears.map(yr => (
            <Th key={yr} align="right">{yr}</Th>
          ))}

          <Th align="right">Total All Years</Th>
          <Th align="right">Avg per Year</Th>
          
          {/* Keep Up/Down only if we are specifically comparing 2 periods */}
          {isCompare && <Th align="right">Up / Down</Th>}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 15 }).map((_, index) => <SkeletonRow key={index} numCols={6 + displayYears.length + (isCompare ? 1 : 0)} />)
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={6 + displayYears.length + (isCompare ? 1 : 0)} className="sales-dense-empty">
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
              isCompare={isCompare}
            />
          ))
        )}
      </tbody>
    </table>
  );
}

function AnalyticsTableRow({ 
  row, 
  index, 
  displayYears,
  isCompare
}: { 
  row: TopGalleryItem; 
  index: number;
  displayYears: string[];
  isCompare: boolean;
}) {
  // Compare values logic
  const diff = row.qtyDiff;
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const DirectionIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const toneClass = direction === "up" ? "sales-dense-table__tone-up" : direction === "down" ? "sales-dense-table__tone-down" : "sales-dense-table__tone-muted";

  // Compute average based on total divided by number of available years
  const avgQty = displayYears.length > 0 ? Math.round(row.totalCombinedQty / displayYears.length) : 0;

  return (
    <tr style={{ animationDelay: `${Math.min(index * 10, 150)}ms` }}>
      <Td style={{ textAlign: "center", fontWeight: 900 }}>{row.rank}</Td>
      <Td>
        <PhotoThumb itemNo={row.itemNo} />
      </Td>
      <Td>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div className="sales-dense-table__code">{row.itemNo}</div>
          <div style={{ color: "var(--color-text-tertiary)", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            {row.productTypeLabel}
          </div>
        </div>
      </Td>
      <Td>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ color: "var(--color-text-primary)", fontSize: "11px", fontWeight: 800 }}>
            {row.primaryCustCode || '-'}
          </div>
          <div style={{ color: "var(--color-text-tertiary)", fontSize: "10px", fontWeight: 800 }}>
            {row.primaryGroupLabel || row.primaryGroupId || '-'}
          </div>
        </div>
      </Td>

      {/* Dynamic Year Values mapped from yearlyTotals */}
      {displayYears.map(yr => {
        const qtyForYear = row.yearlyTotals?.[yr]?.qty || 0;
        return (
          <Td key={yr} align="right" strong={qtyForYear > 0} style={{ color: qtyForYear === 0 ? "var(--color-text-tertiary)" : "inherit" }}>
            {fmtQty(qtyForYear)}
          </Td>
        );
      })}

      <Td align="right" style={{ color: "var(--color-text-secondary)" }}>
        {fmtQty(row.totalCombinedQty || 0)}
      </Td>
      <Td align="right" style={{ color: "var(--color-text-secondary)" }}>
        {fmtQty(avgQty)}
      </Td>

      {isCompare && (
        <Td align="right">
          <div className={toneClass} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 900 }}>
              <DirectionIcon size={12} strokeWidth={3} />
              <span>{fmtSignedQty(diff)}</span>
            </div>
            <div style={{ fontSize: "10px", fontWeight: 850, opacity: 0.85 }}>
              {fmtPct(row.yoyGrowthPct, row.compareYearQty === 0 && row.baseYearQty > 0)}
            </div>
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
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: 2 }}
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
  return <th className={align === "right" ? "sales-dense-table__number" : undefined} style={{ textAlign: align, ...style }}>{children}</th>;
}

function Td({ children, align = "left", strong = false, style = {} }: { children: React.ReactNode; align?: "left" | "right"; strong?: boolean; style?: React.CSSProperties }) {
  return <td className={align === "right" ? "sales-dense-table__number" : undefined} style={{ textAlign: align, fontWeight: strong ? 900 : 800, ...style }}>{children}</td>;
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
  width: 44,
  height: 36,
  border: "1px solid var(--color-border-light)",
  borderRadius: 4,
  background: "var(--color-product-canvas)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  margin: "0 auto",
};
