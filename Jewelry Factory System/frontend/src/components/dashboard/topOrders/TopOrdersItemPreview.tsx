import { X } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import type { PreviewItem } from '../../../hooks/useTopOrdersGalleryData';

// CompareSummary is from useTopOrdersGalleryData, but wait, it is not exported. Let me redefine it or I should export it.
// I will just define it locally and then I can update useTopOrdersGalleryData.ts later if needed, but actually I didn't export it in useTopOrdersGalleryData.ts!
// Let me just declare the interface here for now.
export interface CompareSummary {
  baseYear: string;
  compareYear: string;
  baseQty: number;
  compareQty: number;
  combinedQty: number;
  combinedLabel: string;
  diff: number;
  pct: number | null;
  isNew: boolean;
  isLowBase: boolean;
  hasAnyData: boolean;
}

export function EmptyFilterPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-border-light)",
        borderRadius: 8,
        background: "color-mix(in srgb, var(--color-surface-1) 68%, var(--color-surface-0))",
        padding: "10px 12px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: "0.68rem", color: "var(--color-text-tertiary)", fontWeight: 950, marginBottom: 3 }}>
        {label}
      </div>
      <div
        title={value}
        style={{
          fontSize: "0.84rem",
          color: "var(--color-text-primary)",
          fontWeight: 900,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ModalSummaryValue({
  label,
  value,
  color = "var(--color-text-primary)",
  strong = false,
}: {
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <div style={{ minWidth: strong ? 210 : 130 }}>
      <div style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)", fontWeight: 900, marginBottom: 3 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: strong ? "1.35rem" : "1rem",
          color,
          fontWeight: 950,
          fontFamily: "var(--font-display)",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ModalYearValue({ year, qty, fmtQty }: { year: string; qty: number; fmtQty: (value: number) => string }) {
  return (
    <div
      style={{
        minWidth: 150,
        border: "1px solid var(--color-border-light)",
        borderRadius: 8,
        padding: "9px 14px",
        background: "var(--color-surface-0)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)", fontWeight: 900 }}>{year}</div>
      <div style={{ fontSize: "1rem", color: "var(--color-text-primary)", fontWeight: 950, whiteSpace: "nowrap" }}>
        {fmtQty(qty)} pcs
      </div>
    </div>
  );
}

interface ModalDetailPanelProps {
  itemId: string;
  customer: string;
  customerLabel?: string;
  rank: number;
  comparison?: CompareSummary;
  loading: boolean;
  qty: number;
  total: number;
  fmt: (value: number) => string;
  fmtQty: (value: number) => string;
  fmtSignedQty: (value: number) => string;
}

function ModalDetailPanel({
  itemId,
  customer,
  customerLabel = "Customer",
  rank,
  comparison,
  loading,
  qty,
  total,
  fmt,
  fmtQty,
  fmtSignedQty,
}: ModalDetailPanelProps) {
  const detailRows = [
    { label: "Rank", value: `${rank}` },
    { label: customerLabel, value: customer },
    { label: "Item No", value: itemId, wide: true },
    { label: "Ordered Qty", value: `${fmtQty(qty || 0)} pcs`, strong: true },
    { label: "Total Value", value: fmt(total || 0), strong: true },
  ];

  const directionColor = comparison?.diff && comparison.diff < 0 ? "var(--color-danger-600)" : "var(--color-brand-600)";
  const pctLabel = !comparison?.hasAnyData
    ? "No data"
    : comparison.isNew
      ? "New"
      : comparison.isLowBase
        ? "Low base"
        : `${comparison.diff >= 0 ? "+" : "-"}${Math.abs(comparison.pct || 0).toFixed(1)}%`;

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "20px 24px",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div>
        <div
          style={{ width: 44, height: 4, background: "color-mix(in srgb, var(--color-brand-500) 72%, var(--color-surface-0))", borderRadius: 2, marginBottom: 10 }}
        />
        <div style={{ fontSize: "0.74rem", color: "var(--color-text-tertiary)", fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" }}>Detail</div>
        <div style={{ marginTop: 6, color: "var(--color-text-primary)", fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 950, lineHeight: 1.12, wordBreak: "break-word" }}>{itemId}</div>
        <div style={{ marginTop: 6, color: "var(--color-text-secondary)", fontSize: "0.88rem", fontWeight: 850 }}>{customer}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.75fr 1.25fr", gap: 8 }}>
        {detailRows.map((row) => (
          <div
            key={row.label}
            style={{
              border: "1px solid var(--color-border-light)",
              borderRadius: 8,
              background: "var(--color-surface-0)",
              padding: "10px 12px",
              gridColumn: row.wide ? "1 / -1" : undefined,
            }}
          >
            <div style={{ color: "var(--color-text-tertiary)", fontSize: "0.68rem", fontWeight: 900, marginBottom: 2 }}>{row.label}</div>
            <div
              title={row.value}
              style={{
                color: "var(--color-text-primary)",
                fontSize: row.strong ? "1rem" : "0.92rem",
                fontWeight: row.strong ? 950 : 900,
                fontFamily: row.strong ? "var(--font-display)" : undefined,
                overflowWrap: "anywhere",
              }}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid var(--color-border-default)", borderRadius: 8, background: "color-mix(in srgb, var(--color-surface-0) 72%, var(--color-surface-2))", padding: "12px", marginTop: 0 }}>
        <div style={{ color: "var(--color-text-tertiary)", fontSize: "0.68rem", fontWeight: 950, marginBottom: 8 }}>Comparison</div>
        {loading ? (
          <div style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", fontWeight: 850 }}>Loading comparison...</div>
        ) : !comparison?.hasAnyData ? (
          <div style={{ color: "var(--color-text-primary)", fontSize: "1rem", fontWeight: 900 }}>No comparison data</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <ModalSummaryValue label={`Combined ${comparison.combinedLabel}`} value={`${fmtQty(comparison.combinedQty)} pcs`} strong />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <ModalSummaryValue label="Diff" value={`${fmtSignedQty(comparison.diff)} pcs`} />
              <ModalSummaryValue label="%Change" value={pctLabel} color={directionColor} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <ModalYearValue year={comparison.baseYear} qty={comparison.baseQty} fmtQty={fmtQty} />
              <ModalYearValue year={comparison.compareYear} qty={comparison.compareQty} fmtQty={fmtQty} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

interface TopOrdersItemPreviewProps {
  previewItem: PreviewItem | null;
  previewRef: React.RefObject<HTMLDivElement | null>;
  setPreviewItem: (v: PreviewItem | null) => void;
  previewComparison?: CompareSummary;
  compareLoading: boolean;
  fmt: (value: number) => string;
  fmtQty: (value: number) => string;
  fmtSignedQty: (value: number) => string;
}

export function TopOrdersItemPreview({
  previewItem,
  previewRef,
  setPreviewItem,
  previewComparison,
  compareLoading,
  fmt,
  fmtQty,
  fmtSignedQty
}: TopOrdersItemPreviewProps) {
  if (!previewItem) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "color-mix(in srgb, var(--color-surface-900) 85%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        ref={previewRef}
        className="gallery-preview-shell"
        style={{
          background: "var(--color-surface-0)", borderRadius: 8,
          border: "1px solid color-mix(in srgb, var(--color-border-light) 50%, transparent)",
          boxShadow: "var(--shadow-modal), var(--shadow-inset-panel)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 32px", borderBottom: "1px solid var(--color-border-light)",
            background: "color-mix(in srgb, var(--color-surface-1) 80%, transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--color-text-secondary)", textTransform: 'capitalize', letterSpacing: "0.1em" }}>
                {previewItem.customerLabel === "Customer Group" ? "Customer Group Item" : "Customer Item"}
              </span>
              <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--color-text-primary)", fontFamily: "var(--font-display)", lineHeight: 1 }}>
                {previewItem.cust}
              </span>
            </div>
            <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
              - {previewItem.id}
            </span>
          </div>
          <button
            onClick={() => setPreviewItem(null)}
            style={{
              background: "var(--color-surface-2)", border: "1px solid var(--color-border-default)", borderRadius: 50,
              cursor: "pointer", padding: 8, color: "var(--color-text-secondary)", display: "flex", transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--color-surface-900) 10%, transparent)",
            }}
            className="hover:bg-danger-50 hover:text-danger-600 hover:border-danger-300 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="content-scrollbar gallery-preview-grid"
          style={{ display: "grid", flex: 1, minHeight: 0, overflow: "hidden", background: "var(--color-surface-0)" }}
        >
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, background: "var(--color-product-canvas)" }}>
            <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--color-product-canvas)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, height: "100%", padding: "24px" }}>
              <img
                src={`/api/photos/ps/${previewItem.id}`}
                alt={`${previewItem.id}`}
                className="gallery-preview-image"
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                onError={(event: SyntheticEvent<HTMLImageElement>) => {
                  const container = event.currentTarget.parentElement?.parentElement;
                  if (container) container.style.display = "none";
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, borderLeft: "1px solid var(--color-border-light)", background: "color-mix(in srgb, var(--color-surface-1) 82%, var(--color-surface-0))", overflow: "hidden" }}>
            <ModalDetailPanel
              itemId={previewItem.id}
              customer={previewItem.cust}
              customerLabel={previewItem.customerLabel}
              rank={previewItem.rank}
              comparison={previewComparison}
              loading={compareLoading}
              qty={previewItem.qty}
              total={previewItem.total}
              fmt={fmt}
              fmtQty={fmtQty}
              fmtSignedQty={fmtSignedQty}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
