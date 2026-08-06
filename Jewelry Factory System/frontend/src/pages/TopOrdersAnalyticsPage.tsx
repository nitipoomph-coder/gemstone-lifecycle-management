import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  ImageOff,
  Minus,
  Search,
  X,
} from "lucide-react";
import { fetchAvailableYearsMeta } from "../services/dashboardAPI";
import { fetchCustomerSummary } from "../services/customerSummaryAPI";
import { fetchItemCustomerYearlySummary } from "../services/itemYearlySummaryAPI";
import type { ItemCustomerYearlySummaryItem, ItemCustomerYearlySummaryPair } from "../services/itemYearlySummaryAPI";
import { ALL_GROUPS, getCustomerGroupId } from "../config/customerGroups";
import Topbar from "../components/layout/Topbar";
import CompareYearDropdown from "../components/topOrders/CompareYearDropdown";
import "../components/sales/SalesDenseTable.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRODUCT_TYPE_OPTIONS = ["ALL", "BBS", "BES", "BNS", "BRS"] as const;
type ProductTypeFilter = typeof PRODUCT_TYPE_OPTIONS[number];

interface CompareSummary {
  baseYear: string;
  compareYear: string;
  baseQty: number;
  compareQty: number;
  totalQty: number;
  avgQty: number;
  diff: number;
  pct: number | null;
  isNew: boolean;
  hasAnyData: boolean;
}

interface CustomerTopItemSummary {
  topItem?: string;
  topItemQty?: number | string;
  productType?: string;
}

interface CustomerSummaryRecord {
  id?: string;
  monthlyQty?: Record<string, Record<string, number | string>>;
  topItemsByYear?: Record<string, CustomerTopItemSummary>;
  topItemsByYearByType?: Record<string, Partial<Record<ProductTypeFilter, CustomerTopItemSummary>>>;
  topItem?: string;
  topItemQty?: number | string;
}
interface AnalyticsRow {
  id: string;
  customer: string;
  itemNo: string;
  productType: string;
  sortValue: number;
  fallbackCurrentQty: number;
  comparison?: CompareSummary;
}

const TOP_CUSTOMER_ITEM_LIMIT = 50;
const normalizeStyleNo = (value: unknown) => String(value || "").trim().toUpperCase();
const normalizeCustomerCode = (value: unknown) => String(value || "").trim().toUpperCase();
const customerItemKey = (customerCode: unknown, styleNo: unknown) => `${normalizeCustomerCode(customerCode)}|${normalizeStyleNo(styleNo)}`;

const parseQueryList = (value: string | null) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseProductType = (value: string | null): ProductTypeFilter =>
  PRODUCT_TYPE_OPTIONS.includes(value as ProductTypeFilter) ? (value as ProductTypeFilter) : "ALL";

const parseMonthParam = (value: string | null) => {
  const months = parseQueryList(value)
    .map(Number)
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);
  const uniqueMonths = Array.from(new Set(months)).sort((a, b) => a - b);
  return uniqueMonths.length ? uniqueMonths : MONTHS.map((_, index) => index + 1);
};

const getDefaultCompareYear = (baseYear: string, years: string[]) => {
  const sortedYears = [...years].map(String).sort((a, b) => Number(a) - Number(b));
  return [...sortedYears].reverse().find((year) => Number(year) < Number(baseYear)) || sortedYears.find((year) => year !== baseYear) || "";
};

const selectedMonthsLabel = (months: number[]) => {
  const sortedMonths = [...months].sort((a, b) => a - b);
  if (!sortedMonths.length || sortedMonths.length === 12) return "Full Year";
  const start = sortedMonths[0];
  const end = sortedMonths[sortedMonths.length - 1];
  return start === end ? MONTHS[start - 1] : `${MONTHS[start - 1]}-${MONTHS[end - 1]}`;
};

const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtSignedQty = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtPct = (value: number | null, isNew = false) => (value === null ? (isNew ? "New" : "0.0%") : `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(1)}%`);

export default function TopOrdersAnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const monthParam = searchParams.get("months");
  const groupParam = searchParams.get("groups");
  const typeParam = searchParams.get("type");
  const requestedYearParam = searchParams.get("year");
  const requestedCompareYearParam = searchParams.get("compareYear");

  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [firstDataYear, setFirstDataYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);
  const [baseYear, setBaseYear] = useState("");
  const [compareYear, setCompareYear] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selGroups, setSelGroups] = useState<string[]>(() => parseQueryList(groupParam));
  const [selectedProductType, setSelectedProductType] = useState<ProductTypeFilter>(() => parseProductType(typeParam));
  const [itemsYearlyByPair, setItemsYearlyByPair] = useState<Record<string, ItemCustomerYearlySummaryItem>>({});

  const selectedMonthNumbers = useMemo(() => parseMonthParam(monthParam), [monthParam]);
  const selectedMonthNames = useMemo(() => selectedMonthNumbers.map((month) => MONTHS[month - 1]), [selectedMonthNumbers]);
  const selectedPeriodLabel = selectedMonthsLabel(selectedMonthNumbers);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setSelGroups(parseQueryList(groupParam));
      setSelectedProductType(parseProductType(typeParam));
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [groupParam, typeParam]);

  const loadAnalyticsData = useCallback(async (cancelled: () => boolean) => {
    setLoading(true);
    try {
      const { years, firstDataYear } = await fetchAvailableYearsMeta();
      const sortedYears = years.map(String).sort((a, b) => Number(a) - Number(b));
      if (cancelled()) return;
      setFirstDataYear(firstDataYear);
      setAvailableYears(sortedYears);

      const nextBaseYear = requestedYearParam && sortedYears.includes(requestedYearParam) ? requestedYearParam : sortedYears[sortedYears.length - 1] || "";
      const nextCompareYear = requestedCompareYearParam && sortedYears.includes(requestedCompareYearParam) && requestedCompareYearParam !== nextBaseYear
        ? requestedCompareYearParam
        : getDefaultCompareYear(nextBaseYear, sortedYears);

      setBaseYear(nextBaseYear);
      setCompareYear(nextCompareYear);
      const data = await fetchCustomerSummary(sortedYears, selectedMonthNames);
      if (!cancelled()) setCustData(data);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, [requestedCompareYearParam, requestedYearParam, selectedMonthNames]);

  useEffect(() => {
    let cancelled = false;
    const loadTimer = window.setTimeout(() => { void loadAnalyticsData(() => cancelled); }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [loadAnalyticsData]);

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase();
    setSearchDraft(nextSearch);
    setSearchQuery(nextSearch);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") applySearch();
    if (event.key === "Escape") setSearchDraft(searchQuery.toUpperCase());
  };
  const baseRows = useMemo(() => {
    if (!baseYear) return [];
    let rows: AnalyticsRow[] = [];

    custData.forEach((cust) => {
      const groupId = getCustomerGroupId(cust.id || "");
      if (selGroups.length > 0 && !selGroups.includes(groupId)) return;

      const source = cust.monthlyQty;
      const yearQty = selectedMonthNumbers.reduce((sum, month) => sum + Number(source?.[baseYear]?.[String(month)] || 0), 0);
      const yearlyTopItem = selectedProductType === "ALL"
        ? cust.topItemsByYear?.[baseYear]
        : cust.topItemsByYearByType?.[baseYear]?.[selectedProductType];
      const topItem = yearlyTopItem?.topItem || (cust.topItemsByYear ? null : cust.topItem);
      const topItemQty = Number(yearlyTopItem?.topItemQty || (cust.topItemsByYear ? 0 : cust.topItemQty) || 0);
      const productType = yearlyTopItem?.productType || selectedProductType;

      const customerCode = cust.id || "";
      if (customerCode && yearQty > 0 && topItem && topItemQty > 0) {
        rows.push({
          id: `${customerCode}-${topItem}`,
          customer: customerCode,
          itemNo: topItem,
          productType,
          sortValue: topItemQty,
          fallbackCurrentQty: topItemQty,
        });
      }
    });

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter((row) => [row.customer, row.itemNo, row.productType].join(" ").toLowerCase().includes(q));
    }

    return rows.sort((a, b) => b.sortValue - a.sortValue).slice(0, TOP_CUSTOMER_ITEM_LIMIT);
  }, [baseYear, custData, searchQuery, selGroups, selectedMonthNumbers, selectedProductType]);

  const visibleItemPairs = useMemo<ItemCustomerYearlySummaryPair[]>(() => {
    const pairs = new Map<string, ItemCustomerYearlySummaryPair>();
    baseRows.forEach((row) => {
      const customerCode = normalizeCustomerCode(row.customer);
      const styleNo = normalizeStyleNo(row.itemNo);
      const key = customerItemKey(customerCode, styleNo);
      if (customerCode && styleNo && !pairs.has(key)) pairs.set(key, { customerCode, styleNo });
    });
    return Array.from(pairs.values());
  }, [baseRows]);

  const comparisonYears = useMemo(() => {
    const base = Number(baseYear);
    const start = Number(firstDataYear);
    if (Number.isFinite(start) && Number.isFinite(base) && base >= start) {
      return Array.from({ length: base - start + 1 }, (_, index) => String(start + index));
    }
    return availableYears.filter((year) => !base || Number(year) <= base).map(String);
  }, [availableYears, baseYear, firstDataYear]);

  useEffect(() => {
    let cancelled = false;
    const loadTimer = window.setTimeout(() => {
      if (!visibleItemPairs.length || !baseYear || !compareYear || baseYear === compareYear) {
        setItemsYearlyByPair({});
        setCompareLoading(false);
        return;
      }

      setCompareLoading(true);
      fetchItemCustomerYearlySummary(visibleItemPairs, comparisonYears, selectedMonthNames)
        .then((result) => {
          if (cancelled) return;
          const next: Record<string, ItemCustomerYearlySummaryItem> = {};
          (result.data || []).forEach((item) => {
            const key = customerItemKey(item.normalizedCustomerCode || item.customerCode, item.normalizedStyleNo || item.styleNo);
            if (key) next[key] = item;
          });
          setItemsYearlyByPair(next);
        })
        .catch((err) => {
          console.error("Error fetching item customer comparisons:", err);
          if (!cancelled) setItemsYearlyByPair({});
        })
        .finally(() => {
          if (!cancelled) setCompareLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [baseYear, compareYear, comparisonYears, selectedMonthNames, visibleItemPairs]);

  const comparisonsByPair = useMemo(() => {
    const next: Record<string, CompareSummary> = {};
    if (!baseYear || !compareYear || baseYear === compareYear) return next;

    Object.values(itemsYearlyByPair).forEach((item) => {
      const rowsByYear = new Map(item.data.map((row) => [String(row.year), row]));
      const baseQty = Number(rowsByYear.get(baseYear)?.qty || 0);
      const compareQty = Number(rowsByYear.get(compareYear)?.qty || 0);
      const diff = baseQty - compareQty;
      const totalQty = baseQty + compareQty;
      const activeYears = Number(baseQty > 0) + Number(compareQty > 0);
      const avgQty = activeYears > 0 ? totalQty / activeYears : 0;
      const pct = compareQty > 0 ? (diff / compareQty) * 100 : null;
      const key = customerItemKey(item.normalizedCustomerCode || item.customerCode, item.normalizedStyleNo || item.styleNo);
      if (key) {
        const isNew = baseQty > 0 && Array.from(rowsByYear.entries()).every(([year, row]) => firstDataYear === null || Number(year) < firstDataYear || Number(year) >= Number(baseYear) || Number(row.qty || 0) <= 0);
        next[key] = { baseYear, compareYear, baseQty, compareQty, totalQty, avgQty, diff, pct, isNew, hasAnyData: totalQty > 0 };
      }
    });

    return next;
  }, [baseYear, compareYear, firstDataYear, itemsYearlyByPair]);

  const rows = useMemo(() => baseRows.map((row) => {
    const comparison = comparisonsByPair[customerItemKey(row.customer, row.itemNo)];
    if (comparison) return { ...row, comparison };
    const fallbackComparison: CompareSummary = {
      baseYear,
      compareYear,
      baseQty: row.fallbackCurrentQty,
      compareQty: 0,
      totalQty: row.fallbackCurrentQty,
      avgQty: row.fallbackCurrentQty,
      diff: row.fallbackCurrentQty,
      pct: null,
      isNew: false,
      hasAnyData: row.fallbackCurrentQty > 0,
    };
    return { ...row, comparison: fallbackComparison };
  }), [baseRows, baseYear, compareYear, comparisonsByPair]);

  const summary = useMemo(() => {
    const currentQty = rows.reduce((sum, row) => sum + Number(row.comparison?.baseQty || 0), 0);
    const compareQty = rows.reduce((sum, row) => sum + Number(row.comparison?.compareQty || 0), 0);
    const totalQty = currentQty + compareQty;
    const avgQty = rows.length ? totalQty / rows.length : 0;
    const avgDiff = rows.length ? rows.reduce((sum, row) => sum + Number(row.comparison?.diff || 0), 0) / rows.length : 0;
    const upCount = rows.filter((row) => Number(row.comparison?.diff || 0) > 0).length;
    const downCount = rows.filter((row) => Number(row.comparison?.diff || 0) < 0).length;
    return { currentQty, compareQty, totalQty, avgQty, avgDiff, upCount, downCount };
  }, [rows]);

  const toggleGroup = (groupId: string) => {
    setSelGroups((prev) => prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]);
  };

  const setCurrentYear = (year: string) => {
    setBaseYear(year);
    if (year === compareYear) setCompareYear(getDefaultCompareYear(year, availableYears));
  };

  const isBusy = loading || compareLoading;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-1)]">
      <Topbar
        breadcrumb={[{ label: "JEWELRY FACTORY SYSTEM", path: "/" }, { label: "Sales Analytics" }, { label: "Top Item Gallery", path: "/dashboard/top-orders" }, { label: "Top Items Qty" }]}
        icon={<BarChart3 size={22} />}
        hideSearch
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
        <section style={reportHeaderStyle}>
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
            <span style={filterRailLabelStyle}>Type</span>
            {PRODUCT_TYPE_OPTIONS.map((type) => (
              <button key={type} type="button" onClick={() => setSelectedProductType(type)} style={chipStyle(selectedProductType === type)}>
                {type === "ALL" ? "All types" : type}
              </button>
            ))}
            <div style={filterDividerStyle} />
            <span style={filterRailLabelStyle}>Group</span>
            {ALL_GROUPS.map((group) => (
              <button key={group.id} type="button" onClick={() => toggleGroup(group.id)} style={chipStyle(selGroups.includes(group.id))}>
                {group.label}
              </button>
            ))}
            {(selGroups.length > 0 || selectedProductType !== "ALL") && (
              <button type="button" onClick={() => { setSelGroups([]); setSelectedProductType("ALL"); }} style={resetButtonStyle}>
                Reset
              </button>
            )}
          </div>
        </section>

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
            <table className="sales-dense-table sales-dense-table--sticky-first" style={{ minWidth: 1040 }}>
              <thead>
                <tr>
                  <Th style={{ width: 64 }}>No</Th>
                  <Th style={{ width: 92 }}>Photo</Th>
                  <Th>Item / Customer</Th>
                  <Th align="right">{compareYear || "Compare"}</Th>
                  <Th align="right">{baseYear || "Current"}</Th>
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
          </div>
        </section>
      </main>
    </div>
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
          <div style={{ color: "var(--color-text-primary)", fontSize: "11px", fontWeight: 800 }}>{row.customer} / {row.productType || "Type unknown"}</div>
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
          style={{ width: "100%", height: "100%", objectFit: "cover", padding: 7 }}
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

const filterDividerStyle: React.CSSProperties = {
  width: 1,
  height: 22,
  background: "var(--color-border-light)",
  margin: "0 2px",
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