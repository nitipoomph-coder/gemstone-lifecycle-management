import { useNavigate } from "react-router-dom";
import { Award, BarChart3, Search, X } from "lucide-react";
import { ALL_GROUPS } from "../config/customerGroups";
import PageHeader from '../components/layout/PageHeader';
import CompareYearDropdown from "../components/topOrders/CompareYearDropdown";
import "../components/sales/SalesDenseTable.css";
import { useTopOrdersAnalyticsData, fmtQty, fmtSignedQty, TOP_CUSTOMER_ITEM_LIMIT } from "../hooks/useTopOrdersAnalyticsData";
import { TopAnalyticsTable } from "../components/dashboard/topAnalytics/TopAnalyticsTable";

export default function TopOrdersAnalyticsPage() {
  const navigate = useNavigate();
  const {
    availableYears,
    loading,
    baseYear,
    compareYear,
    setCompareYear,
    searchDraft,
    setSearchDraft,
    setSearchQuery,
    selGroups,
    setSelGroups,
    selectedPeriodLabel,
    handleSearchKeyDown,
    rows,
    summary,
    toggleGroup,
    setCurrentYear,
    isBusy,
  } = useTopOrdersAnalyticsData();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-1)]">
      <PageHeader
        breadcrumb={[{ label: "JEWELRY FACTORY SYSTEM", path: "/" }, { label: "Sales Analytics" }, { label: "Top Item Gallery", path: "/dashboard/top-orders" }, { label: "Top Items Qty" }]}
        icon={<BarChart3 size={22} />}
        rightContent={
          <div className="flex items-center gap-2 pr-2">
            <button type="button" onClick={() => navigate("/dashboard/top-orders")} style={toolbarButtonStyle}>
              <Award size={15} /> Gallery
            </button>
            <span style={periodPillStyle}>{selectedPeriodLabel}</span>
          </div>
        }
      />

      <main className="content-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <header className="no-print" style={reportHeaderStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 style={reportTitleStyle}>Top Items Qty</h1>
              <div style={reportMetaStyle}>{selectedPeriodLabel} / Top {TOP_CUSTOMER_ITEM_LIMIT} rows / Qty only</div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2" style={controlClusterStyle}>
              <div style={searchShellStyle}>
                <Search size={14} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value.toUpperCase())}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search customer or item"
                  style={searchInputStyle}
                />
                {searchDraft && (
                  <button type="button" onClick={() => { setSearchDraft(""); setSearchQuery(""); }} style={iconButtonStyle} aria-label="Clear search">
                    <X size={13} />
                  </button>
                )}
              </div>
              <YearSelect label="Current" value={baseYear} options={availableYears} onChange={setCurrentYear} />
              <CompareYearDropdown availableYears={availableYears} baseYear={baseYear} compareYear={compareYear} onChange={setCompareYear} />
            </div>
          </div>

          <div style={summaryStripStyle}>
            <SummaryCell label={`${compareYear || "Compare"} Qty`} value={fmtQty(summary.compareQty)} />
            <SummaryCell label={`${baseYear || "Current"} Qty`} value={fmtQty(summary.currentQty)} />
            <SummaryCell label="Total" value={fmtQty(summary.totalQty)} strong />
            <SummaryCell label="Avg Qty" value={fmtQty(Math.round(summary.avgQty))} />
            <SummaryCell label="Avg Up / Down" value={`${fmtSignedQty(Math.round(summary.avgDiff))} pcs`} tone={summary.avgDiff} />
          </div>

          <div className="content-scrollbar" style={filterRailStyle}>
            <span style={filterRailLabelStyle}>Group</span>
            {ALL_GROUPS.map((group) => (
              <button key={group.id} type="button" onClick={() => toggleGroup(group.id)} style={chipStyle(selGroups.includes(group.id))}>
                {group.label}
              </button>
            ))}
            {selGroups.length > 0 && (
              <button type="button" onClick={() => { setSelGroups([]); }} style={resetButtonStyle}>
                Reset
              </button>
            )}
          </div>
        </header>

        <section className={["sales-dense-panel flex min-h-[520px] flex-1 flex-col overflow-hidden", searchDraft.trim() ? "sales-dense-panel--searching" : ""].filter(Boolean).join(" ")}>
          <div className="sales-dense-panel__header">
            <div>
              <div className="sales-dense-panel__title">Item Qty Comparison</div>
              <div className="sales-dense-panel__meta">{selectedPeriodLabel} / {compareYear || "Compare"} vs {baseYear || "Current"}</div>
            </div>
            <div className="sales-dense-panel__meta">
              {isBusy ? "Updating..." : `${fmtQty(rows.length)} rows`}
            </div>
          </div>

          <div className="content-scrollbar sales-dense-scroll min-h-0 flex-1">
            <TopAnalyticsTable rows={rows} loading={loading} />
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCell({ label, value, strong = false, tone = 0 }: { label: string; value: string; strong?: boolean; tone?: number }) {
  const toneColor = tone > 0 ? "var(--color-success-500)" : tone < 0 ? "var(--color-danger-500)" : "var(--color-text-primary)";
  return (
    <div style={summaryCellStyle}>
      <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.72rem", fontWeight: 850 }}>{label}</span>
      <span style={{ color: strong || tone !== 0 ? toneColor : "var(--color-text-primary)", fontSize: "0.95rem", fontWeight: 950, fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
}
function YearSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface-0)", border: "1px solid var(--color-border-light)", borderRadius: 12, padding: "7px 10px" }}>
      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.78rem", fontWeight: 850 }}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={{ background: "transparent", color: "var(--color-text-primary)", border: 0, outline: 0, fontWeight: 950, fontFamily: "var(--font-display)" }}>
        {options.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </label>
  );
}

const reportHeaderStyle: React.CSSProperties = {
  background: "var(--color-surface-0)",
  border: "1px solid var(--color-border-light)",
  borderRadius: 8,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const reportTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-text-primary)",
  fontSize: "1.08rem",
  fontWeight: 950,
  fontFamily: "var(--font-display)",
};

const reportMetaStyle: React.CSSProperties = {
  marginTop: 4,
  color: "var(--color-text-secondary)",
  fontSize: "0.78rem",
  fontWeight: 750,
};

const controlClusterStyle: React.CSSProperties = {
  flex: "1 1 560px",
};

const filterRailStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  overflowX: "auto",
  padding: "2px 0 4px",
};

const filterRailLabelStyle: React.CSSProperties = {
  color: "var(--color-text-tertiary)",
  fontSize: "0.7rem",
  fontWeight: 950,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  flexShrink: 0,
};



const summaryStripStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 0,
  margin: 0,
  border: "1px solid var(--color-border-light)",
  borderRadius: 8,
  overflow: "hidden",
  background: "color-mix(in srgb, var(--color-surface-1) 54%, var(--color-surface-0))",
};

const summaryCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  minWidth: 0,
  padding: "9px 12px",
  borderRight: "1px solid var(--color-border-light)",
};

const toolbarButtonStyle: React.CSSProperties = {
  background: "var(--color-surface-0)",
  border: "1px solid var(--color-border-light)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: "0.82rem",
  fontWeight: 900,
  color: "var(--color-text-primary)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-display)",
};

const periodPillStyle: React.CSSProperties = {
  border: "1px solid var(--color-border-light)",
  borderRadius: 10,
  background: "var(--color-surface-0)",
  color: "var(--color-text-secondary)",
  fontSize: "0.78rem",
  fontWeight: 850,
  padding: "7px 10px",
  whiteSpace: "nowrap",
};

const searchShellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "min(320px, 32vw)",
  background: "var(--color-surface-0)",
  border: "1px solid var(--color-border-light)",
  borderRadius: 12,
  padding: "8px 10px",
};

const searchInputStyle: React.CSSProperties = {
  minWidth: 0,
  flex: 1,
  background: "transparent",
  border: 0,
  outline: 0,
  color: "var(--color-text-primary)",
  fontSize: "0.84rem",
  fontWeight: 800,
};

const iconButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "var(--color-text-tertiary)",
  cursor: "pointer",
  display: "flex",
  padding: 2,
};

const resetButtonStyle: React.CSSProperties = {
  border: "1px solid var(--color-border-light)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--color-text-secondary)",
  padding: "6px 10px",
  fontSize: "0.76rem",
  fontWeight: 850,
  cursor: "pointer",
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  border: active ? "1px solid var(--color-brand-300)" : "1px solid var(--color-border-light)",
  borderRadius: 8,
  background: active ? "color-mix(in srgb, var(--color-brand-500) 9%, var(--color-surface-0))" : "var(--color-surface-0)",
  color: active ? "var(--color-brand-600)" : "var(--color-text-secondary)",
  padding: "6px 10px",
  fontSize: "0.76rem",
  fontWeight: 900,
  cursor: "pointer",
});