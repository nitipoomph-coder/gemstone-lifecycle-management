import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Filter,
  Search,
  Award,
  X,
  BarChart3,
} from "lucide-react";
import { fetchAvailableYears } from "../services/dashboardAPI";
import { fetchCustomerSummary } from "../services/customerSummaryAPI";
import { fetchItemCustomerYearlySummary } from "../services/itemYearlySummaryAPI";
import type { ItemCustomerYearlySummaryItem, ItemCustomerYearlySummaryPair } from "../services/itemYearlySummaryAPI";
import { getCustomerGroupId, ALL_GROUPS } from "../config/customerGroups";
import Topbar from "../components/layout/Topbar";
import CompareYearDropdown from "../components/topOrders/CompareYearDropdown";

// -----------------------------------------------------------------------------
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const getDefaultCompareYear = (baseYear: string, years: string[]) => {
  const sortedYears = [...years].map(String).sort((a, b) => Number(a) - Number(b));
  const previousYear = [...sortedYears].reverse().find(year => Number(year) < Number(baseYear));
  if (previousYear) return previousYear;
  return sortedYears.find(year => year !== baseYear) || '';
};

type CompareDensity = "full" | "medium" | "compact";
const LOW_BASE_QTY = 100;
const TOP_CUSTOMER_ITEM_LIMIT = 50;

interface CompareSummary {
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

const normalizeStyleNo = (value: unknown) => String(value || "").trim().toUpperCase();
const normalizeCustomerCode = (value: unknown) => String(value || "").trim().toUpperCase();
const customerItemKey = (customerCode: unknown, styleNo: unknown) => `${normalizeCustomerCode(customerCode)}|${normalizeStyleNo(styleNo)}`;

const PRODUCT_TYPE_OPTIONS = ["ALL", "BBS", "BES", "BNS", "BRS"] as const;
type ProductTypeFilter = typeof PRODUCT_TYPE_OPTIONS[number];

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

const selectedMonthsLabel = (months: number[]) => {
  const sortedMonths = [...months].sort((a, b) => a - b);
  if (!sortedMonths.length || sortedMonths.length === 12) return "Full Year";
  const start = sortedMonths[0];
  const end = sortedMonths[sortedMonths.length - 1];
  return start === end ? MONTHS[start - 1] : `${MONTHS[start - 1]}-${MONTHS[end - 1]}`;
};

export default function TopOrdersAnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const metric = searchParams.get("metric") || "amount";
  const queryKey = searchParams.toString();

  const fmt = (val: number) => {
    if (metric === "qty")
      return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Data state
  const [custData, setCustData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [baseYear, setBaseYear] = useState<string>("");
  const [selGroups, setSelGroups] = useState<string[]>(() => parseQueryList(searchParams.get("groups")));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<ProductTypeFilter>(() => parseProductType(searchParams.get("type")));

  // Preview state
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const yearMenuRef = useRef<HTMLDivElement>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const [compareYear, setCompareYear] = useState<string>("");
  const [itemsYearlyByPair, setItemsYearlyByPair] = useState<Record<string, ItemCustomerYearlySummaryItem>>({});
  const [compareLoading, setCompareLoading] = useState(false);

  const selectedMonthNumbers = useMemo(() => parseMonthParam(searchParams.get("months")), [queryKey]);
  const selectedMonthNames = useMemo(() => selectedMonthNumbers.map((month) => MONTHS[month - 1]), [selectedMonthNumbers]);
  const selectedMonthKey = selectedMonthNumbers.join(",");
  const selectedPeriodLabel = selectedMonthsLabel(selectedMonthNumbers);

  useEffect(() => {
    setSelGroups(parseQueryList(searchParams.get("groups")));
    setSelectedProductType(parseProductType(searchParams.get("type")));
  }, [queryKey]);
  // Close menus on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        yearMenuRef.current &&
        !yearMenuRef.current.contains(e.target as Node)
      ) {
        setShowYearMenu(false);
      }
      if (
        groupMenuRef.current &&
        !groupMenuRef.current.contains(e.target as Node)
      ) {
        setShowGroupMenu(false);
      }
    };
    if (showYearMenu || showGroupMenu)
      document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showYearMenu, showGroupMenu]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAvailableYears()
      .then((yrs) => {
        const sortedYrs = yrs.map(String).sort((a, b) => Number(a) - Number(b));
        if (cancelled) return [];
        setAvailableYears(sortedYrs);

        const requestedYear = searchParams.get("year");
        const nextBaseYear = requestedYear && sortedYrs.includes(requestedYear)
          ? requestedYear
          : sortedYrs[sortedYrs.length - 1] || "";
        if (nextBaseYear) setBaseYear(nextBaseYear);

        const requestedCompareYear = searchParams.get("compareYear");
        if (requestedCompareYear && sortedYrs.includes(requestedCompareYear) && requestedCompareYear !== nextBaseYear) {
          setCompareYear(requestedCompareYear);
        } else if (nextBaseYear) {
          setCompareYear(getDefaultCompareYear(nextBaseYear, sortedYrs));
        }

        return fetchCustomerSummary(sortedYrs, selectedMonthNames);
      })
      .then((cData) => {
        if (!cancelled) setCustData(cData);
      })
      .catch((err) => console.error("Error fetching report data:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey, selectedMonthKey]);
  // Close preview on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        previewRef.current &&
        !previewRef.current.contains(e.target as Node)
      ) {
        setPreviewItem(null);
      }
    };
    if (previewItem) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [previewItem]);

  // Table data computation
  const tableData = useMemo(() => {
    if (!baseYear) return { rows: [], totalRows: 0 };

    let rows: any[] = [];
    custData.forEach((cust) => {
      const gId = getCustomerGroupId(cust.id || "");
      if (selGroups.length > 0 && !selGroups.includes(gId)) return;

      const source = metric === "qty" ? cust.monthlyQty : cust.monthly;
      let yrTotal = 0;

      selectedMonthNumbers.forEach((month) => {
        const val = source?.[baseYear]?.[String(month)] || 0;
        yrTotal += val;
      });

      const yearlyTopItem = selectedProductType === "ALL"
        ? cust.topItemsByYear?.[baseYear]
        : cust.topItemsByYearByType?.[baseYear]?.[selectedProductType];
      const topItem = yearlyTopItem?.topItem || (cust.topItemsByYear ? null : cust.topItem);
      const topItemQty = Number(yearlyTopItem?.topItemQty || (cust.topItemsByYear ? 0 : cust.topItemQty) || 0);
      const productType = yearlyTopItem?.productType || selectedProductType;

      if (yrTotal > 0 && topItem && topItemQty > 0) {
        rows.push({
          id: cust.id,
          label: cust.id,
          topItem,
          topItemQty,
          productType,
          yrTotal: yrTotal,
          sortValue: selectedProductType === "ALL" ? yrTotal : topItemQty,
        });
      }
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r: any) => [r.label, r.topItem].filter(Boolean).join(" ").toLowerCase().includes(q));
    }

    rows.sort((a, b) => (b.sortValue || 0) - (a.sortValue || 0));

    const totalRows = rows.length;
    return { rows: rows.slice(0, TOP_CUSTOMER_ITEM_LIMIT), totalRows };
  }, [custData, baseYear, selGroups, searchQuery, metric, selectedProductType, selectedMonthKey]);

  useEffect(() => {
    if (!baseYear || availableYears.length === 0) return;
    if (!compareYear || compareYear === baseYear || !availableYears.includes(compareYear)) {
      setCompareYear(getDefaultCompareYear(baseYear, availableYears));
    }
  }, [availableYears, baseYear, compareYear]);

  const visibleItemPairs = useMemo<ItemCustomerYearlySummaryPair[]>(() => {
    const pairs = new Map<string, ItemCustomerYearlySummaryPair>();
    tableData.rows.forEach((row: any) => {
      const customerCode = normalizeCustomerCode(row.label);
      const styleNo = normalizeStyleNo(row.topItem);
      const key = customerItemKey(customerCode, styleNo);
      if (customerCode && styleNo && !pairs.has(key)) {
        pairs.set(key, { customerCode, styleNo });
      }
    });
    return Array.from(pairs.values());
  }, [tableData.rows]);

  const visiblePairKey = useMemo(
    () => visibleItemPairs.map(pair => customerItemKey(pair.customerCode, pair.styleNo)).join("|"),
    [visibleItemPairs],
  );

  useEffect(() => {
    if (!visibleItemPairs.length || !baseYear || !compareYear || baseYear === compareYear) {
      setItemsYearlyByPair({});
      setCompareLoading(false);
      return;
    }

    let cancelled = false;
    setCompareLoading(true);

    fetchItemCustomerYearlySummary(visibleItemPairs, [compareYear, baseYear], selectedMonthNames)
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

    return () => {
      cancelled = true;
    };
  }, [visiblePairKey, baseYear, compareYear, selectedMonthKey]);

  const comparisonsByPair = useMemo(() => {
    const next: Record<string, CompareSummary> = {};
    if (!baseYear || !compareYear || baseYear === compareYear) return next;

    Object.values(itemsYearlyByPair).forEach((item) => {
      const rowsByYear = new Map(item.data.map((row) => [String(row.year), row]));
      const baseQty = rowsByYear.get(baseYear)?.qty || 0;
      const compareQty = rowsByYear.get(compareYear)?.qty || 0;
      const diff = baseQty - compareQty;
      const pct = compareQty > 0 ? (diff / compareQty) * 100 : null;
      const summary: CompareSummary = {
        baseYear,
        compareYear,
        baseQty,
        compareQty,
        combinedQty: baseQty + compareQty,
        combinedLabel: [compareYear, baseYear].sort((a, b) => Number(a) - Number(b)).join("-"),
        diff,
        pct,
        isNew: compareQty <= 0 && baseQty > 0,
        isLowBase: compareQty > 0 && compareQty < LOW_BASE_QTY,
        hasAnyData: baseQty > 0 || compareQty > 0,
      };

      const key = customerItemKey(item.normalizedCustomerCode || item.customerCode, item.normalizedStyleNo || item.styleNo);
      if (key) next[key] = summary;
    });

    return next;
  }, [baseYear, compareYear, itemsYearlyByPair]);

  const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtSignedQty = (value: number) => `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const toggleGroup = (gId: string) => {
    setSelGroups((prev) =>
      prev.includes(gId) ? prev.filter((g) => g !== gId) : [...prev, gId],
    );
  };

  // Rank colors

  const buildPreviewItem = (row: any, idx: number) => ({
    id: row.topItem,
    rank: idx + 1,
    cust: row.label,
    total: row.yrTotal,
    qty: row.topItemQty,
  });

  const openPreview = (row: any, idx: number) => {
    setPreviewItem(buildPreviewItem(row, idx));
  };


  const getRankStyle = (idx: number) => {
    if (idx === 0) return { bg: "#F59E0B", text: "#FFFFFF" }; // Gold
    if (idx === 1) return { bg: "#9CA3AF", text: "#FFFFFF" }; // Silver
    if (idx === 2) return { bg: "#B45309", text: "#FFFFFF" }; // Bronze
    return { bg: "var(--color-surface-2)", text: "var(--color-text-primary)" };
  };

  // -----------------------------------------------------------------------------
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-1)]">
        <Topbar
          breadcrumb={[
            { label: "JEWELRY FACTORY SYSTEM", path: "/" },
            { label: "Top Item by Customer Analytics" },
          ]}
          icon={<BarChart3 size={22} />}
          hideSearch={true}
          rightContent={
            <div className="flex items-center gap-2 pr-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard/top-orders")}
                style={{
                  background: "var(--color-surface-0)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 12,
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 900,
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-display)",
                  boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)",
                }}
              >
                <Award size={15} />
                Gallery
              </button>
              <span
                style={{
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 10,
                  background: "var(--color-surface-0)",
                  color: "var(--color-text-secondary)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  padding: "7px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedPeriodLabel}
              </span>
              {/* Local Search */}
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-tertiary)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search Customer or Item No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "var(--color-surface-0)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: 10,
                    padding: "8px 16px 8px 34px",
                    fontSize: "0.85rem",
                    color: "var(--color-text-primary)",
                    outline: "none",
                    width: 200,
                    transition: "all 0.2s",
                    boxShadow:
                      "inset 0 1px 3px color-mix(in srgb, var(--color-surface-900) 6%, transparent)",
                  }}
                  className="focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      color: "var(--color-text-tertiary)",
                      display: "flex",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Custom Year Dropdown */}
              <div className="relative z-[100]" ref={yearMenuRef}>
                <button
                  onClick={() => setShowYearMenu(!showYearMenu)}
                  style={{
                    background: "var(--color-surface-0)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: 12,
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    outline: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "var(--font-display)",
                    boxShadow:
                      "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)",
                    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                  className="hover:border-brand-300 hover:text-brand-600 hover:shadow-md"
                >
                  <span className="text-[var(--color-text-secondary)] font-medium text-[0.8rem] capitalize tracking-wider">
                    Year
                  </span>
                  {baseYear}
                  <div
                    style={{
                      transform: showYearMenu
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition:
                        "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                    className="text-[var(--color-text-tertiary)]"
                  >
                    <svg
                      width="12"
                      height="7"
                      viewBox="0 0 12 7"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 1L6 6L11 1"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </button>

                {showYearMenu && (
                  <div className="absolute right-0 mt-2 w-36 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-2 shadow-xl z-[100] animate-fade-in-up">
                    {availableYears.map((yr) => (
                      <button
                        key={yr}
                        onClick={() => {
                          setBaseYear(yr);
                          setShowYearMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm transition-colors font-display font-bold ${baseYear === yr ? "bg-[var(--color-brand-100)] text-[var(--color-brand-600)]" : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]"}`}
                      >
                        <span>{yr}</span>
                        {baseYear === yr && (
                          <div className="w-2 h-2 rounded-full bg-[var(--color-brand-500)] shadow-[0_0_8px_rgba(var(--color-brand-500),0.6)]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <CompareYearDropdown
                availableYears={availableYears}
                baseYear={baseYear}
                compareYear={compareYear}
                onChange={setCompareYear}
              />
              <div
                role="group"
                aria-label="Item type filter"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 4,
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 12,
                  background: "var(--color-surface-0)",
                  boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)",
                }}
              >
                <span style={{ padding: "0 8px", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                  Type
                </span>
                {PRODUCT_TYPE_OPTIONS.map((type) => {
                  const active = selectedProductType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedProductType(type)}
                      style={{
                        minWidth: type === "ALL" ? 42 : 48,
                        height: 30,
                        border: "none",
                        borderRadius: 8,
                        background: active ? "var(--color-brand-500)" : "transparent",
                        color: active ? "var(--color-surface-0)" : "var(--color-text-primary)",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: 900,
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              {/* Custom Group Dropdown */}
              <div className="relative z-[100]" ref={groupMenuRef}>
                <button
                  onClick={() => setShowGroupMenu(!showGroupMenu)}
                  style={{
                    background:
                      selGroups.length > 0
                        ? "var(--color-brand-50)"
                        : "var(--color-surface-0)",
                    border: `1px solid ${selGroups.length > 0 ? "var(--color-brand-400)" : "var(--color-border-light)"}`,
                    borderRadius: 12,
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    color:
                      selGroups.length > 0
                        ? "var(--color-brand-700)"
                        : "var(--color-text-primary)",
                    outline: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "var(--font-display)",
                    boxShadow:
                      "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)",
                    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                  className="hover:border-brand-300 hover:text-brand-600 hover:shadow-md"
                >
                  <Filter size={16} />
                  <span className="font-medium text-[0.8rem] capitalize tracking-wider">
                    Groups
                  </span>
                  {selGroups.length > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-brand-500)] text-[var(--color-text-inverse)] text-[10px] shadow-sm">
                      {selGroups.length}
                    </span>
                  )}
                </button>

                {showGroupMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-4 shadow-2xl z-[100] animate-fade-in-up">
                    <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border-light)] pb-2">
                      <span className="text-[10px] font-bold capitalize tracking-wider text-[var(--color-text-tertiary)]">
                        Filter by Group
                      </span>
                      {selGroups.length > 0 && (
                        <button
                          onClick={() => setSelGroups([])}
                          className="text-[10px] font-bold capitalize text-[var(--color-danger-500)] hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_GROUPS.map((group) => {
                        const gId = group.id;
                        const isActive = selGroups.includes(gId);
                        return (
                          <button
                            key={gId}
                            onClick={() => toggleGroup(gId)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${isActive ? "bg-[var(--color-brand-500)] text-[var(--color-text-inverse)] shadow-md scale-105" : "bg-[var(--color-surface-0)] text-[var(--color-text-primary)] border border-[var(--color-border-light)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] hover:-translate-y-0.5"}`}
                          >
                            {gId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />

        {/* Main gallery grid */}
        <div
          className="content-scrollbar"
          style={{
            flex: 1,
            padding: "32px",
            overflowY: "auto",
            background: "var(--color-surface-1)",
          }}
        >
          <style>{`
          .gallery-card-hover .hover-overlay {
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s ease;
          }
          .gallery-card-hover:hover .hover-overlay {
            opacity: 1;
            transform: translateY(0);
          }
          .gallery-card-hover .hover-hint {
            opacity: 0;
            transition: all 0.2s ease;
          }
          .gallery-card-hover:hover .hover-hint {
            opacity: 1;
          }
          .gallery-img {
            transition: all 0.3s ease;
          }
          .gallery-card-hover:hover .gallery-img {
            transform: scale(1.02);
          }
        `}</style>
          {loading ? (
            /* Shimmer skeleton */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gridAutoRows: "260px",
                gridAutoFlow: "dense",
                gap: "20px",
                maxWidth: "2000px",
                margin: "0 auto",
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    gridColumn: i < 3 ? "span 2" : "span 1",
                    gridRow: i < 3 ? "span 2" : "span 1",
                    background: "var(--color-surface-0)",
                    borderRadius: 24,
                    overflow: "hidden",
                    border: "1px solid var(--color-border-light)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background:
                        "linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-1) 50%, var(--color-surface-2) 75%)",
                      backgroundSize: "200% 100%",
                      animation: "skeletonShimmer 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : tableData.rows.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "100px 0",
                color: "var(--color-text-tertiary)",
                gap: 12,
              }}
            >
              <Search size={40} style={{ opacity: 0.25 }} />
              <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                No items match your filter.
              </span>
              <span
                style={{ fontSize: "0.85rem", fontWeight: 500, opacity: 0.7 }}
              >
                Try adjusting your search or group filters.
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gridAutoRows: "280px",
                gridAutoFlow: "dense",
                gap: "32px",
                maxWidth: "2400px",
                margin: "0 auto",
                direction: "ltr",
              }}
            >
              {tableData.rows.map((row, idx) => {


                // Enterprise Dashboard Size Logic
                let colSpan = 1;
                let rowSpan = 1;
                if (idx === 0) {
                  colSpan = 3;
                  rowSpan = 2;
                } // Rank 1: Massive
                else if (idx === 1) {
                  colSpan = 2;
                  rowSpan = 2;
                } // Rank 2: Medium
                else if (idx === 2) {
                  colSpan = 1;
                  rowSpan = 2;
                } // Rank 3: Tall
                else if (idx === 3 || idx === 4) {
                  colSpan = 2;
                  rowSpan = 1;
                }

                const rankStyle = getRankStyle(idx);
                const comparison = comparisonsByPair[customerItemKey(row.label, row.topItem)];
                const compareDensity: CompareDensity = colSpan >= 2 && rowSpan >= 2
                  ? "full"
                  : colSpan >= 2 || rowSpan >= 2
                    ? "medium"
                    : "compact";

                return (
                  <div
                    key={`gallery_${row.id}`}
                    className="gallery-card-hover group"
                    onClick={() => openPreview(row, idx)}
                    style={{
                      gridColumn: `span ${colSpan}`,
                      gridRow: `span ${rowSpan}`,
                      background: "var(--color-surface-0)",
                      borderRadius: 8 /* Enterprise Clean Geometry */,
                      overflow: "hidden",
                      position: "relative",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                      border: "1px solid var(--color-border-light)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.2s ease",
                      animation: `fadeInUp 0.3s ease ${Math.min(idx * 30, 300)}ms both`,
                      direction: "ltr",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)";
                      e.currentTarget.style.borderColor =
                        "var(--color-brand-300)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)";
                      e.currentTarget.style.borderColor =
                        "var(--color-border-light)";
                    }}
                  >

                    {/* Enterprise Image Container */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--color-product-canvas)",
                        borderBottom: "1px solid var(--color-border-light)",
                        position: "relative",
                        minHeight: 0,
                      }}
                    >
                      <img
                        src={`/api/photos/ps/${row.topItem}`}
                        alt={row.topItem}
                        className="gallery-img"
                        style={{
                          maxWidth: "90%",
                          maxHeight: "90%",
                          objectFit: "contain",
                        }}
                        onError={(e: any) => {
                          if (!e.target.dataset.triedCad) {
                            e.target.dataset.triedCad = "true";
                            e.target.src = `/api/photos/cad/${row.topItem}`;
                          } else {
                            e.target.style.display = "none";
                          }
                        }}
                      />
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
                        style={{
                          background:
                            "color-mix(in srgb, var(--color-surface-900) 80%, transparent)",
                          backdropFilter: "blur(4px)",
                        }}
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

                    {/* Static Bottom Bar */}
                    <div
                      style={{
                        padding: idx === 0 ? "20px 24px" : "16px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        background: "var(--color-surface-0)",
                        zIndex: 10,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        <Award
                          size={idx === 0 ? 24 : 18}
                          style={{ color: rankStyle.bg, flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: idx === 0 ? "1.35rem" : "1.05rem",
                            fontWeight: 900,
                            color: "var(--color-text-primary)",
                            flexShrink: 0,
                          }}
                        >
                          {row.label}
                        </span>
                        <span
                          title={row.topItem}
                          style={{
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: idx === 0 ? "1rem" : "0.82rem",
                            fontWeight: 800,
                            color: "var(--color-brand-600)",
                          }}
                        >
                          {row.topItem}
                        </span>
                      </span>
                      <span
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-brand-600)",
                          fontWeight: 800,
                          textTransform: 'capitalize',
                          letterSpacing: "0.05em",
                          flexShrink: 0,
                        }}
                      >
                        Click to View
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Photo preview modal */}
        {previewItem && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background:
                "color-mix(in srgb, var(--color-surface-900) 85%, transparent)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              ref={previewRef}
              style={{
                background: "var(--color-surface-0)",
                borderRadius: 32,
                border:
                  "1px solid color-mix(in srgb, var(--color-border-light) 50%, transparent)",
                boxShadow:
                  "0 32px 100px color-mix(in srgb, var(--color-surface-900) 60%, transparent), inset 0 2px 4px rgba(255,255,255,0.1)",
                width: "98vw",
                maxWidth: 1800,
                height: "98vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Modal Title Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 32px",
                  borderBottom: "1px solid var(--color-border-light)",
                  background:
                    "color-mix(in srgb, var(--color-surface-1) 80%, transparent)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: "var(--color-text-secondary)",
                        textTransform: 'capitalize',
                        letterSpacing: "0.1em",
                      }}
                    >
                      Customer Item
                    </span>
                    <span
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 900,
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-display)",
                        lineHeight: 1,
                      }}
                    >
                      {previewItem.cust}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 900,
                      color: "var(--color-text-tertiary)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    - {previewItem.id}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: 50,
                    cursor: "pointer",
                    padding: 8,
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                    boxShadow:
                      "0 2px 8px color-mix(in srgb, var(--color-surface-900) 10%, transparent)",
                  }}
                  className="hover:bg-danger-50 hover:text-danger-600 hover:border-danger-300 hover:scale-110"
                >
                  <X size={20} />
                </button>
              </div>


              <div
                className="content-scrollbar"
                style={{
                  display: "flex",
                  flex: 1,
                  overflowY: "auto",
                  background: "var(--color-surface-0)",
                  flexWrap: "wrap",
                  alignContent: "flex-start",
                }}
              >
                {/* Product Shot Pane */}
                <div
                  style={{
                    flex: "1 1 500px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "24px 32px 0 32px",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 4,
                        background: "var(--color-brand-500)",
                        borderRadius: 2,
                      }}
                    />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.2rem",
                        fontWeight: 800,
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.05em",
                        textTransform: 'capitalize',
                      }}
                    >
                      Product Shot
                    </h3>
                  </div>

                  {/* Lightbox Canvas */}
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      overflow: "hidden",
                      background: "var(--color-product-canvas)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 0,
                      maxHeight: "calc(90vh - 150px)",
                    }}
                  >
                    <img
                      src={`/api/photos/ps/${previewItem.id}`}
                      alt={`${previewItem.id} Product Shot`}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e: any) => {
                        const container = e.target.parentElement.parentElement;
                        if (container) container.style.display = "none";
                      }}
                    />
                  </div>
                </div>

                {/* CAD Design Pane */}
                <div
                  style={{
                    flex: "1 1 500px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "24px 32px 0 32px",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 4,
                        background: "var(--color-border-strong)",
                        borderRadius: 2,
                      }}
                    />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.2rem",
                        fontWeight: 800,
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.05em",
                        textTransform: 'capitalize',
                      }}
                    >
                      Computer-Aided Design
                    </h3>
                  </div>

                  {/* Lightbox Canvas */}
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      overflow: "hidden",
                      background: "var(--color-product-canvas)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 0,
                      maxHeight: "calc(90vh - 150px)",
                    }}
                  >
                    <img
                      src={`/api/photos/cad/${previewItem.id}`}
                      alt={`${previewItem.id} CAD`}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e: any) => {
                        const container = e.target.parentElement.parentElement;
                        if (container) container.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}
interface CompareCardOverlayProps {
  comparison?: CompareSummary;
  density: CompareDensity;
  loading: boolean;
  row: any;
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

function YearQtyCell({ year, qty, fmtQty }: { year: string; qty: number; fmtQty: (value: number) => string }) {
  return (
    <div style={{ border: "1px solid color-mix(in srgb, var(--color-overlay-text) 18%, transparent)", borderRadius: 8, padding: "7px 8px" }}>
      <div style={{ fontSize: "0.72rem", color: "var(--color-overlay-text-muted)", fontWeight: 800 }}>{year}</div>
      <div style={{ fontSize: "0.9rem", color: "var(--color-overlay-text)", fontWeight: 900, whiteSpace: "nowrap" }}>{fmtQty(qty)} pcs</div>
    </div>
  );
}

function LegacyCardOverlay({ row, fmt, compact }: { row: any; fmt: (value: number) => string; compact: boolean }) {
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
