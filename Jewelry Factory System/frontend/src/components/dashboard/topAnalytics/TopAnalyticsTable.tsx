import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ImageOff, Minus } from "lucide-react";
import type { AnalyticsRow } from "../../../hooks/useTopOrdersAnalyticsData";
import { fmtQty, fmtSignedQty, fmtPct } from "../../../hooks/useTopOrdersAnalyticsData";

export function TopAnalyticsTable({ rows, loading }: { rows: AnalyticsRow[]; loading: boolean }) {
  return (
    <table className="sales-dense-table sales-dense-table--sticky-first" style={{ minWidth: 1040 }}>
      <thead>
        <tr>
          <Th style={{ width: 64 }}>No</Th>
          <Th style={{ width: 92 }}>Photo</Th>
          <Th>Item / Customer</Th>
          <Th align="right">Compare</Th>
          <Th align="right">Current</Th>
          <Th align="right">Total</Th>
          <Th align="right">Average</Th>
          <Th align="right">Up / Down</Th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} />)
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="sales-dense-empty">
              No rows match the current filters.
            </td>
          </tr>
        ) : (
          rows.map((row, index) => <AnalyticsTableRow key={row.id} row={row} index={index} />)
        )}
      </tbody>
    </table>
  );
}

function AnalyticsTableRow({ row, index }: { row: AnalyticsRow; index: number }) {
  const comparison = row.comparison;
  const diff = Number(comparison?.diff || 0);
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const DirectionIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const toneClass = direction === "up" ? "sales-dense-table__tone-up" : direction === "down" ? "sales-dense-table__tone-down" : "sales-dense-table__tone-muted";

  return (
    <tr style={{ animationDelay: `${Math.min(index * 12, 180)}ms` }}>
      <Td style={{ textAlign: "center", fontWeight: 900 }}>{index + 1}</Td>
      <Td>
        <PhotoThumb itemNo={row.itemNo} />
      </Td>
      <Td>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="sales-dense-table__code">{row.itemNo}</div>
          <div style={{ color: "var(--color-text-primary)", fontSize: "11px", fontWeight: 800 }}>{row.customer}</div>
        </div>
      </Td>
      <Td align="right">{fmtQty(comparison?.compareQty || 0)}</Td>
      <Td align="right" strong>{fmtQty(comparison?.baseQty || 0)}</Td>
      <Td align="right" strong>{fmtQty(comparison?.totalQty || 0)}</Td>
      <Td align="right">{fmtQty(Math.round(comparison?.avgQty || 0))}</Td>
      <Td align="right">
        <div className={toneClass} style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <DirectionIcon size={14} />
          <span>{fmtSignedQty(diff)}</span>
          <span style={{ fontSize: "11px", fontWeight: 850 }}>({fmtPct(comparison?.pct ?? null, Boolean(comparison?.isNew))})</span>
        </div>
      </Td>
    </tr>
  );
}

function PhotoThumb({ itemNo }: { itemNo: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={photoShellStyle}>
      {failed ? (
        <ImageOff size={18} style={{ color: "var(--color-text-tertiary)" }} />
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

function SkeletonRow() {
  const widths = [34, 52, 72, 50, 58, 62, 48, 66];
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, index) => (
        <td key={index}>
          <span className="sales-dense-skeleton" style={index === 1 ? { width: 52, height: 42 } : { width: `${widths[index]}%` }} />
        </td>
      ))}
    </tr>
  );
}

const photoShellStyle: React.CSSProperties = {
  width: 52,
  height: 42,
  border: "1px solid var(--color-border-light)",
  borderRadius: 6,
  background: "var(--color-product-canvas)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};
