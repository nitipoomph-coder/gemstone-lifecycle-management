import { useState, useMemo, useEffect, useRef, type KeyboardEvent, type SyntheticEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Filter,
  Search,
  Award,
  X,
  BarChart3,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { fetchAvailableYearsMeta } from "../services/dashboardAPI";
import { fetchCustomerSummary } from "../services/customerSummaryAPI";
import { fetchItemCustomerYearlySummary } from "../services/itemYearlySummaryAPI";
import type { ItemCustomerYearlySummaryItem, ItemCustomerYearlySummaryPair } from "../services/itemYearlySummaryAPI";
import { getCustomerGroupId, ALL_GROUPS } from "../config/customerGroups";
import Topbar from "../components/layout/Topbar";
import "./SalesResponsive.css";

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
  return [...sortedYears].reverse().find(year => Number(year) < Number(baseYear)) || '';
};

type CompareDensity = "full" | "medium" | "compact";
const LOW_BASE_QTY = 100;
const TOP_CUSTOMER_ITEM_LIMIT = 50;
const TOP_ITEMS_PER_GROUP_IN_ALL = 10;

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

type GalleryDisplayMode = "group" | "list";


interface CustomerTopItemSummary {
  topItem?: string;
  topItemQty?: number | string;
  productType?: string;
}

interface CustomerSummaryRecord {
  id?: string;
  name?: string;
  monthly?: Record<string, Record<string, number | string>>;
  monthlyQty?: Record<string, Record<string, number | string>>;
  topItemsByYear?: Record<string, CustomerTopItemSummary>;
  topItemsByYearByType?: Record<string, Partial<Record<ProductTypeFilter, CustomerTopItemSummary>>>;
  topItem?: string;
  topItemQty?: number | string;
}

interface PreviewItem {
  id: string;
  rank: number;
  cust: string;
  customerCode: string;
  customerLabel: string;
  total: number;
  qty: number;
}

interface GalleryRow {
  rowKey: string;
  id: string;
  label: string;
  customerCode: string;
  customerName: string;
  groupId: string;
  groupLabel: string;
  topItem: string;
  topItemQty: number;
  productType: string;
  yrTotal: number;
  sortValue: number;
  displayMode: GalleryDisplayMode;
}

const getGroupLabel = (groupId: string) =>
  ALL_GROUPS.find((group) => group.id === groupId)?.label || groupId;

const galleryRowSearchText = (row: GalleryRow) =>
  [row.label, row.customerCode, row.customerName, row.groupId, row.groupLabel, row.topItem, row.productType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

type PeriodPreset = "full-year" | "ytd" | "this-month" | "last-month" | "custom";

interface PeriodDraft {
  preset: PeriodPreset;
  baseYear: string;
  startMonth: number;
  endMonth: number;
  compareEnabled: boolean;
  compareYear: string;
}

interface SelectOption {
  value: string | number;
  label: string;
}

const PERIOD_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "full-year", label: "Full Year" },
  { id: "ytd", label: "YTD" },
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
];

const currentMonthNumber = () => new Date().getMonth() + 1;
const clampMonth = (month: number) => Math.min(12, Math.max(1, Number(month) || 1));
const monthRange = (startMonth: number, endMonth: number) => {
  const start = clampMonth(Math.min(startMonth, endMonth));
  const end = clampMonth(Math.max(startMonth, endMonth));
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};
const monthRangeLabel = (startMonth: number, endMonth: number) => {
  const start = clampMonth(Math.min(startMonth, endMonth));
  const end = clampMonth(Math.max(startMonth, endMonth));
  return start === 1 && end === 12 ? "Full Year" : `${MONTHS[start - 1]}-${MONTHS[end - 1]}`;
};
const presetRange = (preset: PeriodPreset) => {
  const current = currentMonthNumber();
  if (preset === "ytd") return { startMonth: 1, endMonth: current };
  if (preset === "this-month") return { startMonth: current, endMonth: current };
  if (preset === "last-month") {
    const last = current === 1 ? 12 : current - 1;
    return { startMonth: last, endMonth: last };
  }
  return { startMonth: 1, endMonth: 12 };
};

export default function TopOrdersGalleryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const metric = searchParams.get("metric") || "amount";

  const fmt = (val: number) => {
    if (metric === "qty")
      return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Data state
  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [firstDataYear, setFirstDataYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  // Filter state
  const [baseYear, setBaseYear] = useState<string>("");
  const [selGroups, setSelGroups] = useState<string[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<ProductTypeFilter>("ALL");
  const [monthStart, setMonthStart] = useState(1);
  const [monthEnd, setMonthEnd] = useState(12);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("full-year");
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft | null>(null);

  // Preview state
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const yearMenuRef = useRef<HTMLDivElement>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const [compareYear, setCompareYear] = useState<string>("");
  const [itemsYearlyByPair, setItemsYearlyByPair] = useState<Record<string, ItemCustomerYearlySummaryItem>>({});
  const [compareLoading, setCompareLoading] = useState(false);
  const filterTransitionTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const hasLoadedCustomerDataRef = useRef(false);

  const selectedMonthNumbers = useMemo(() => monthRange(monthStart, monthEnd), [monthStart, monthEnd]);
  const selectedMonthNames = useMemo(() => selectedMonthNumbers.map((month) => MONTHS[month - 1]), [selectedMonthNumbers]);
  const selectedMonthKey = selectedMonthNumbers.join(",");
  const selectedPeriodLabel = monthRangeLabel(monthStart, monthEnd);
  const selectedGroupsKey = selGroups.join(",");
  const analyticsPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set("metric", metric);
    if (baseYear) params.set("year", baseYear);
    if (compareEnabled && compareYear) params.set("compareYear", compareYear);
    if (selectedMonthKey) params.set("months", selectedMonthKey);
    if (selectedProductType !== "ALL") params.set("type", selectedProductType);
    if (selectedGroupsKey) params.set("groups", selectedGroupsKey);
    return `/dashboard/top-orders/analytics?${params.toString()}`;
  }, [baseYear, compareEnabled, compareYear, metric, selectedGroupsKey, selectedMonthKey, selectedProductType]);
  const isInitialLoading = loading && custData.length === 0;
  const isFilterLoading = filterLoading || (loading && custData.length > 0);
  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase();
    setSearchDraft(nextSearch);
    startFilterTransition();
    setSearchQuery(nextSearch);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") applySearch();
    if (event.key === "Escape") setSearchDraft(searchQuery.toUpperCase());
  };
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

  useEffect(() => {
    return () => {
      if (filterTransitionTimer.current) window.clearTimeout(filterTransitionTimer.current);
    };
  }, []);

  // Fetch available years once, then refetch summary whenever the selected month range changes.
  useEffect(() => {
    let cancelled = false;
    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      fetchAvailableYearsMeta()
        .then(({ years, firstDataYear }) => {
          if (cancelled) return;
          const sortedYrs = years.map(String).sort((a, b) => Number(a) - Number(b));
          setFirstDataYear(firstDataYear);
          setAvailableYears(sortedYrs);
          if (sortedYrs.length > 0) {
            setBaseYear(sortedYrs[sortedYrs.length - 1]);
          }
        })
        .catch((err) => {
          console.error("Error fetching available years:", err);
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, []);

  // Refetch Customer Summary when the period/month filter changes.
  useEffect(() => {
    if (availableYears.length === 0) return;
    let cancelled = false;
    const loadTimer = window.setTimeout(() => {
      if (hasLoadedCustomerDataRef.current) setFilterLoading(true);
      setLoading(true);
      fetchCustomerSummary(availableYears, selectedMonthNames)
        .then((cData) => {
          if (cancelled) return;
          setCustData(cData);
          hasLoadedCustomerDataRef.current = true;
        })
        .catch((err) => console.error("Error fetching report data:", err))
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
            if (!filterTransitionTimer.current) setFilterLoading(false);
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [availableYears, selectedMonthNames]);
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
    if (!baseYear) return { rows: [] as GalleryRow[], totalRows: 0 };

    const selectedGroupSet = new Set(selGroups);
    let sourceRows: GalleryRow[] = [];

    custData.forEach((cust) => {
      const customerCode = normalizeCustomerCode(cust.id || "");
      const groupId = getCustomerGroupId(customerCode);
      const source = metric === "qty" ? cust.monthlyQty : cust.monthly;
      let yrTotal = 0;

      selectedMonthNumbers.forEach((month) => {
        const val = source?.[baseYear]?.[String(month)] || 0;
        yrTotal += Number(val) || 0;
      });

      const yearlyTopItem = selectedProductType === "ALL"
        ? cust.topItemsByYear?.[baseYear]
        : cust.topItemsByYearByType?.[baseYear]?.[selectedProductType];
      const topItem = yearlyTopItem?.topItem || (cust.topItemsByYear ? null : cust.topItem);
      const topItemQty = Number(yearlyTopItem?.topItemQty || (cust.topItemsByYear ? 0 : cust.topItemQty) || 0);
      const productType = yearlyTopItem?.productType || selectedProductType;

      if (yrTotal > 0 && topItem && topItemQty > 0) {
        const groupLabel = getGroupLabel(groupId);
        sourceRows.push({
          rowKey: `list-${customerCode}-${normalizeStyleNo(topItem)}-${baseYear}-${selectedProductType}`,
          id: customerCode,
          label: customerCode,
          customerCode,
          customerName: String(cust.name || ""),
          groupId,
          groupLabel,
          topItem,
          topItemQty,
          productType,
          yrTotal,
          sortValue: selectedProductType === "ALL" ? yrTotal : topItemQty,
          displayMode: "list",
        });
      }
    });

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      sourceRows = sourceRows.filter((row) => galleryRowSearchText(row).includes(query));
    }

    sourceRows.sort((a, b) => (b.sortValue || 0) - (a.sortValue || 0));

    if (selectedGroupSet.size === 0) {
      const rowsByGroup = new Map<string, GalleryRow[]>();
      sourceRows.forEach((row) => {
        if (!rowsByGroup.has(row.groupId)) rowsByGroup.set(row.groupId, []);
        rowsByGroup.get(row.groupId)!.push(row);
      });

      const rows = ALL_GROUPS.flatMap((group) => {
        const groupRows = rowsByGroup.get(group.id) || [];
        return groupRows.slice(0, TOP_ITEMS_PER_GROUP_IN_ALL).map((row, index) => ({
          ...row,
          rowKey: `all-${row.groupId}-${row.customerCode}-${normalizeStyleNo(row.topItem)}-${index}`,
          label: row.groupLabel,
          displayMode: "group" as GalleryDisplayMode,
        }));
      }).sort((a, b) => (b.sortValue || 0) - (a.sortValue || 0));

      return { rows, totalRows: rows.length };
    }

    const rows = sourceRows.filter((row) => selectedGroupSet.has(row.groupId));
    const totalRows = rows.length;
    return { rows: rows.slice(0, TOP_CUSTOMER_ITEM_LIMIT), totalRows };
  }, [custData, baseYear, selGroups, searchQuery, metric, selectedProductType, selectedMonthNumbers]);

  // Load yearly comparison only for rows currently visible on screen.
  useEffect(() => {
    if (!compareEnabled || !baseYear || availableYears.length === 0) return;
    if (compareYear && compareYear !== baseYear && availableYears.includes(compareYear)) return;
    const syncTimer = window.setTimeout(() => {
      setCompareYear(getDefaultCompareYear(baseYear, availableYears));
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [availableYears, baseYear, compareEnabled, compareYear]);

  // Build customer+item pairs for the comparison API.
  const visibleItemPairs = useMemo<ItemCustomerYearlySummaryPair[]>(() => {
    const pairs = new Map<string, ItemCustomerYearlySummaryPair>();
    tableData.rows.forEach((row) => {
      const customerCode = normalizeCustomerCode(row.customerCode);
      const styleNo = normalizeStyleNo(row.topItem);
      const key = customerItemKey(customerCode, styleNo);
      if (customerCode && styleNo && !pairs.has(key)) {
        pairs.set(key, { customerCode, styleNo });
      }
    });
    return Array.from(pairs.values());
  }, [tableData.rows]);

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
      if (!compareEnabled || !visibleItemPairs.length || !baseYear || !compareYear || baseYear === compareYear) {
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
  }, [baseYear, compareEnabled, compareYear, comparisonYears, selectedMonthNames, visibleItemPairs]);

  const comparisonsByPair = useMemo(() => {
    const next: Record<string, CompareSummary> = {};
    if (!compareEnabled || !baseYear || !compareYear || baseYear === compareYear) return next;

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
        isNew: baseQty > 0 && Array.from(rowsByYear.entries()).every(([year, row]) => firstDataYear === null || Number(year) < firstDataYear || Number(year) >= Number(baseYear) || Number(row.qty || 0) <= 0),
        isLowBase: compareQty > 0 && compareQty < LOW_BASE_QTY,
        hasAnyData: baseQty > 0 || compareQty > 0,
      };

      const key = customerItemKey(item.normalizedCustomerCode || item.customerCode, item.normalizedStyleNo || item.styleNo);
      if (key) next[key] = summary;
    });

    return next;
  }, [baseYear, compareEnabled, compareYear, firstDataYear, itemsYearlyByPair]);

  const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtSignedQty = (value: number) => `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const startFilterTransition = (duration = 280) => {
    if (filterTransitionTimer.current) window.clearTimeout(filterTransitionTimer.current);
    setFilterLoading(true);
    filterTransitionTimer.current = window.setTimeout(() => {
      setFilterLoading(false);
      filterTransitionTimer.current = null;
    }, duration);
  };
  const toggleGroup = (gId: string) => {
    startFilterTransition();
    setSelGroups((prev) =>
      prev.includes(gId) ? prev.filter((g) => g !== gId) : [...prev, gId],
    );
  };

  // Rank colors

  const buildPreviewItem = (row: GalleryRow, idx: number) => ({
    id: row.topItem,
    rank: idx + 1,
    cust: row.label,
    customerCode: row.customerCode,
    customerLabel: row.displayMode === "group" ? "Customer Group" : "Customer",
    total: row.yrTotal,
    qty: row.topItemQty,
  });

  const openPreview = (row: GalleryRow, idx: number) => {
    setPreviewItem(buildPreviewItem(row, idx));
  };


  const getRankStyle = (idx: number) => {
    if (idx === 0) return { bg: "var(--color-rank-1)", text: "var(--color-on-rank)" };
    if (idx === 1) return { bg: "var(--color-rank-2)", text: "var(--color-on-rank)" };
    if (idx === 2) return { bg: "var(--color-rank-3)", text: "var(--color-on-rank)" };
    return { bg: "var(--color-surface-2)", text: "var(--color-text-primary)" };
  };
  const previewComparison = previewItem
    ? comparisonsByPair[customerItemKey(previewItem.customerCode || previewItem.cust, previewItem.id)]
    : undefined;

  const buildPeriodDraft = (): PeriodDraft => ({
    preset: periodPreset,
    baseYear,
    startMonth: monthStart,
    endMonth: monthEnd,
    compareEnabled,
    compareYear: compareYear || getDefaultCompareYear(baseYear, availableYears),
  });

  const openPeriodMenu = () => {
    if (showYearMenu) {
      setShowYearMenu(false);
      return;
    }
    setPeriodDraft(buildPeriodDraft());
    setShowYearMenu(true);
  };

  const updatePeriodDraft = (patch: Partial<PeriodDraft>) => {
    setPeriodDraft((draft) => (draft ? { ...draft, ...patch } : draft));
  };

  const applyPeriodPreset = (preset: PeriodPreset) => {
    const range = presetRange(preset);
    updatePeriodDraft({ preset, ...range });
  };

  const applyPeriodDraft = () => {
    if (!periodDraft) return;
    startFilterTransition(420);
    const start = Math.min(periodDraft.startMonth, periodDraft.endMonth);
    const end = Math.max(periodDraft.startMonth, periodDraft.endMonth);
    const nextCompareYear = periodDraft.compareEnabled
      ? (periodDraft.compareYear && periodDraft.compareYear !== periodDraft.baseYear
        ? periodDraft.compareYear
        : getDefaultCompareYear(periodDraft.baseYear, availableYears))
      : "";

    setBaseYear(periodDraft.baseYear);
    setMonthStart(start);
    setMonthEnd(end);
    setPeriodPreset(periodDraft.preset);
    setCompareEnabled(periodDraft.compareEnabled);
    setCompareYear(nextCompareYear);
    setShowYearMenu(false);
  };

  const periodButtonLabel = compareEnabled && compareYear
    ? `${baseYear || "-"} vs ${compareYear}`
    : `${baseYear || "-"}`;

  const resetGalleryFilters = () => {
    startFilterTransition();
    setSearchDraft("");
    setSearchQuery("");
    setSelGroups([]);
    setSelectedProductType("ALL");
    setMonthStart(1);
    setMonthEnd(12);
    setPeriodPreset("full-year");
    setCompareEnabled(true);
    setCompareYear(getDefaultCompareYear(baseYear, availableYears));
  };

  // -----------------------------------------------------------------------------
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-surface-1)]">
      <Topbar
        breadcrumb={[
          { label: "JEWELRY FACTORY SYSTEM", path: "/" },
          { label: "Sales Analytics" },
          { label: "Top Items Gallery" },
        ]}
        hideSearch={true}
        contentLayout="dashboard-wide"
        rightContent={
          <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center gap-2 pr-2">
            <button
              type="button"
              onClick={() => navigate(analyticsPath)}
              style={{
                background: "var(--color-surface-0)",
                border: "1px solid var(--color-border-light)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: "0.85rem",
                fontWeight: 900,
                color: "var(--color-text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-display)",
                boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 3%, transparent)",
              }}
            >
              <BarChart3 size={15} />
              Qty Analysis
            </button>
            {/* Local Search */}
            <div style={{ position: "relative", flex: "1 1 280px", minWidth: 220, maxWidth: 520 }}>
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
                placeholder="Search Group, List, or Item No..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value.toUpperCase())}
                onKeyDown={handleSearchKeyDown}
                style={{
                  background: "var(--color-surface-0)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 8,
                  padding: "8px 16px 8px 34px",
                  fontSize: "0.85rem",
                  color: "var(--color-text-primary)",
                  outline: "none",
                  width: "100%",
                  transition: "all 0.2s",
                  boxShadow:
                    "inset 0 1px 3px color-mix(in srgb, var(--color-surface-900) 6%, transparent)",
                }}
                className="focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              />
              {searchDraft && (
                <button
                  onClick={() => { setSearchDraft(""); setSearchQuery(""); }}
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

            <div className="relative z-[100]" ref={yearMenuRef}>
              <button
                onClick={openPeriodMenu}
                style={{
                  background: "var(--color-surface-0)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: "0.86rem",
                  fontWeight: 900,
                  color: "var(--color-text-primary)",
                  outline: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-display)",
                  boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)",
                  whiteSpace: "nowrap",
                }}
                className="hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-1)]"
              >
                <CalendarDays size={15} />
                <span style={{ color: "var(--color-text-secondary)", fontSize: "0.78rem", fontWeight: 700 }}>
                  Period
                </span>
                <span>{periodButtonLabel}</span>
                <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.72rem", fontWeight: 800 }}>
                  {selectedPeriodLabel}
                </span>
                <span
                  style={{
                    transform: showYearMenu ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  <svg width="10" height="6" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>

              {showYearMenu && periodDraft && (
                <div className="sales-gallery-period-menu absolute right-0 z-[100] mt-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-4" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
                  <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border-light)] pb-3">
                    <span className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                      Period Setup
                    </span>
                    <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                      {periodDraft.baseYear}{periodDraft.compareEnabled && periodDraft.compareYear ? ` vs ${periodDraft.compareYear}` : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-[180px_1fr] gap-5">
                    <div>
                      <div className="mb-2 text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                        Quick Presets
                      </div>
                      <div className="flex flex-col gap-2">
                        {PERIOD_PRESETS.map((preset) => {
                          const active = periodDraft.preset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => applyPeriodPreset(preset.id)}
                              className={`rounded-lg border px-3 py-2 text-left text-xs font-black transition-colors ${active ? "border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_9%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "border-[var(--color-border-light)] bg-[var(--color-surface-0)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]"}`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                        Custom Month Range
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <PeriodSelect
                          label="Start Month"
                          value={periodDraft.startMonth}
                          options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
                          onChange={(value) => updatePeriodDraft({ preset: "custom", startMonth: Number(value) })}
                        />
                        <PeriodSelect
                          label="End Month"
                          value={periodDraft.endMonth}
                          options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
                          onChange={(value) => updatePeriodDraft({ preset: "custom", endMonth: Number(value) })}
                        />
                      </div>
                      <PeriodSelect
                        label="Year"
                        value={periodDraft.baseYear}
                        options={availableYears.map((yr) => ({ value: yr, label: yr }))}
                        className="mt-3"
                        onChange={(value) => {
                          const nextBaseYear = String(value);
                          updatePeriodDraft({
                            baseYear: nextBaseYear,
                            compareYear: periodDraft.compareEnabled ? getDefaultCompareYear(nextBaseYear, availableYears) : periodDraft.compareYear,
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="my-4 border-t border-[var(--color-border-light)]" />

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-black text-[var(--color-text-primary)]">
                      <input
                        type="checkbox"
                        checked={periodDraft.compareEnabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          updatePeriodDraft({
                            compareEnabled: enabled,
                            compareYear: enabled ? getDefaultCompareYear(periodDraft.baseYear, availableYears) : periodDraft.compareYear,
                          });
                        }}
                      />
                      Compare with Previous Year
                    </label>
                    <PeriodSelect
                      value={periodDraft.compareYear}
                      disabled={!periodDraft.compareEnabled}
                      options={[
                        ...(!periodDraft.compareYear ? [{ value: "", label: "No previous year" }] : []),
                        ...availableYears.filter((yr) => yr !== periodDraft.baseYear).map((yr) => ({ value: yr, label: yr })),
                      ]}
                      className="min-w-[170px]"
                      onChange={(value) => updatePeriodDraft({ compareYear: String(value) })}
                    />
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowYearMenu(false)}
                      className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-4 py-2 text-xs font-black text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyPeriodDraft}
                      className="rounded-lg border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,var(--color-surface-0))] px-4 py-2 text-xs font-black text-[var(--color-brand-600)] hover:bg-[color-mix(in_srgb,var(--color-brand-500)_16%,var(--color-surface-0))]"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Custom Group Dropdown */}
            <div className="relative z-[100]" ref={groupMenuRef}>
              <button
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                style={{
                  background:
                    selGroups.length > 0 || selectedProductType !== "ALL"
                      ? "var(--color-brand-50)"
                      : "var(--color-surface-0)",
                  border: `1px solid ${selGroups.length > 0 || selectedProductType !== "ALL" ? "var(--color-brand-400)" : "var(--color-border-light)"}`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color:
                    selGroups.length > 0 || selectedProductType !== "ALL"
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
                className="hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-1)]"
              >
                <Filter size={16} />
                <span className="font-medium text-[0.8rem] capitalize tracking-wider">
                  Filters
                </span>
                {(selGroups.length > 0 || selectedProductType !== "ALL") && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_10%,var(--color-surface-0))] text-[var(--color-brand-600)] text-[10px]">
                    {selGroups.length + (selectedProductType !== "ALL" ? 1 : 0)}
                  </span>
                )}
              </button>

              {showGroupMenu && (
                <div className="absolute right-0 z-[100] mt-2 w-80 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-4" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
                  <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border-light)] pb-2">
                    <span className="text-[10px] font-bold capitalize tracking-wider text-[var(--color-text-tertiary)]">
                      Filters
                    </span>
                    {(selGroups.length > 0 || selectedProductType !== "ALL") && (
                      <button
                        onClick={() => { setSelGroups([]); setSelectedProductType("ALL"); }}
                        className="text-[10px] font-bold capitalize text-[var(--color-danger-500)] hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="mb-4">
                    <div className="mb-2 text-[10px] font-bold capitalize tracking-wider text-[var(--color-text-tertiary)]">
                      Item Type
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {PRODUCT_TYPE_OPTIONS.map((type) => {
                        const active = selectedProductType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => { startFilterTransition(); setSelectedProductType(type); }}
                            className={`rounded-lg px-2 py-2 text-[11px] font-black transition-colors ${active ? "border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_10%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "border border-[var(--color-border-light)] bg-[var(--color-surface-0)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]"}`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mb-2 text-[10px] font-bold capitalize tracking-wider text-[var(--color-text-tertiary)]">
                    Customer Groups
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_GROUPS.map((group) => {
                      const gId = group.id;
                      const isActive = selGroups.includes(gId);
                      return (
                        <button
                          key={gId}
                          onClick={() => toggleGroup(gId)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${isActive ? "border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_10%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "bg-[var(--color-surface-0)] text-[var(--color-text-primary)] border border-[var(--color-border-light)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)] "}`}
                        >
                          {group.label}
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
        className="content-scrollbar sales-gallery-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--color-surface-1)",
          position: "relative",
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
            transition: opacity 0.15s ease;
          }
          .gallery-grid {
            --gallery-track: clamp(280px, 18vw, 360px);
            --gallery-row: clamp(300px, 21vw, 360px);
            --gallery-gap: clamp(16px, 1.15vw, 24px);
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(var(--gallery-track), 1fr));
            grid-auto-rows: var(--gallery-row);
            grid-auto-flow: row;
            justify-content: stretch;
            gap: var(--gallery-gap);
            width: 100%;
            max-width: 2400px;
            margin: 0 auto;
            direction: ltr;
          }
          .gallery-card-hover {
            grid-column: span var(--card-col-span);
            grid-row: span var(--card-row-span);
          }
          .gallery-image-frame {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--color-product-canvas);
            border-bottom: 1px solid var(--color-border-light);
            position: relative;
            min-height: 0;
            overflow: hidden;
            padding: clamp(18px, 2.2vw, 34px);
          }
          .gallery-img {
            width: min(88%, var(--gallery-image-max-width, 520px));
            height: min(88%, var(--gallery-image-max-height, 420px));
            object-fit: contain;
          }
          .gallery-preview-shell {
            width: min(94vw, 1480px);
            height: min(92vh, 920px);
          }
          .gallery-preview-grid {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 380px);
          }
          .gallery-preview-image {
            width: min(92%, 920px);
            height: min(88%, 700px);
            object-fit: contain;
          }
          @media (min-width: 1800px) {
            .gallery-grid {
              --gallery-track: 320px;
              --gallery-row: 340px;
              --gallery-gap: 24px;
              max-width: 2400px;
            }
          }
          @media (max-width: 1180px) {
            .gallery-grid {
              grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
              grid-auto-rows: 260px;
              max-width: 100%;
            }
            .gallery-card-hover {
              grid-column: span 1;
              grid-row: span 1;
            }
            .gallery-preview-grid {
              grid-template-columns: 1fr;
              overflow: auto;
            }
            .gallery-loading-card--featured {
              grid-column: span 1;
              grid-row: span 1;
            }
          }
          @media (max-width: 760px) {
            .gallery-grid {
              grid-template-columns: 1fr;
              grid-auto-rows: 260px;
            }
            .gallery-preview-shell {
              width: 96vw;
              height: 94vh;
            }
            .gallery-preview-header {
              align-items: flex-start !important;
              gap: 12px;
              padding: 14px 16px !important;
            }
          }
          .gallery-loading-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            grid-auto-rows: 260px;
            grid-auto-flow: row;
            gap: 20px;
            width: 100%;
            max-width: 2400px;
            margin: 0 auto;
          }
          .gallery-loading-card--featured {
            grid-column: span 2;
            grid-row: span 2;
          }
          @media (max-width: 1180px) {
            .gallery-loading-card--featured {
              grid-column: span 1;
              grid-row: span 1;
            }
          }
          .gallery-filter-spinner {
            animation: galleryFilterSpin 0.8s linear infinite;
          }
          .gallery-empty-icon-ring {
            position: absolute;
            inset: 10px;
            border-radius: 999px;
            border: 2px solid color-mix(in srgb, var(--color-brand-500) 18%, transparent);
            border-top-color: var(--color-brand-500);
            animation: galleryFilterSpin 1.1s linear infinite;
          }
          @keyframes galleryFilterSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        {isInitialLoading ? (
          /* Shimmer skeleton */
          <div
            className="gallery-loading-grid"
            style={{
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={i < 3 ? "gallery-loading-card gallery-loading-card--featured" : "gallery-loading-card"}
                style={{
                  background: "var(--color-surface-0)",
                  borderRadius: 8,
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
              minHeight: "min(620px, calc(100vh - 150px))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 16px",
            }}
          >
            <div
              className="gallery-preview-header"
              style={{
                width: "min(720px, 100%)",
                position: "relative",
                overflow: "hidden",
                border: "1px solid var(--color-border-light)",
                borderRadius: 8,
                background: "var(--color-surface-0)",
                boxShadow: "0 24px 70px color-mix(in srgb, var(--color-surface-900) 12%, transparent)",
                padding: "34px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "0 0 auto 0",
                  height: 3,
                  background: "color-mix(in srgb, var(--color-brand-500) 72%, var(--color-surface-0))",
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", gap: 24, alignItems: "center", position: "relative", zIndex: 1, flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 8,
                    border: "1px solid color-mix(in srgb, var(--color-brand-500) 28%, var(--color-border-light))",
                    background: "color-mix(in srgb, var(--color-brand-500) 9%, var(--color-surface-0))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--color-text-inverse) 12%, transparent)",
                    position: "relative",
                  }}
                >
                  <span className="gallery-empty-icon-ring" aria-hidden="true" />
                  <Search size={42} style={{ color: "var(--color-brand-500)", opacity: 0.92, position: "relative", zIndex: 1 }} />
                </div>
                <div style={{ flex: "1 1 360px", minWidth: 280 }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 950, color: "var(--color-text-primary)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                    No Matching Customer Items
                  </div>
                  <h2 style={{ margin: 0, fontSize: "1.75rem", lineHeight: 1.12, fontWeight: 950, color: "var(--color-text-primary)", fontFamily: "var(--font-display)" }}>
                    No items match the current gallery filters.
                  </h2>
                  <p style={{ margin: "10px 0 0", fontSize: "0.92rem", lineHeight: 1.6, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                    Try widening the period, switching type back to ALL, or clearing customer/search filters.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 10,
                  marginTop: 28,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <EmptyFilterPill label="Period" value={`${baseYear || "-"} / ${selectedPeriodLabel}`} />
                <EmptyFilterPill label="Type" value={selectedProductType} />
                <EmptyFilterPill label="Groups" value={selGroups.length ? selGroups.map(getGroupLabel).join(", ") : "All Groups"} />
                <EmptyFilterPill label="Search" value={searchQuery || "None"} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24, position: "relative", zIndex: 1 }}>
                <button
                  type="button"
                  onClick={resetGalleryFilters}
                  className="rounded-lg border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,var(--color-surface-0))] px-4 py-2 text-xs font-black text-[var(--color-brand-600)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-brand-500)_16%,var(--color-surface-0))]"
                >
                  Reset Filters
                </button>
                {searchDraft && (
                  <button
                    type="button"
                    onClick={() => { startFilterTransition(); setSearchDraft(""); setSearchQuery(""); }}
                    className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-4 py-2 text-xs font-black text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)]"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="gallery-grid">
            {tableData.rows.map((row, idx) => {


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
                    borderRadius: 8 /* Enterprise Clean Geometry */,
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

                  {/* Enterprise Image Container */}
                  <div className="gallery-image-frame">
                    <div
                      style={{
                        position: "absolute",
                        top: isFeaturedRank ? 18 : 14,
                        left: isFeaturedRank ? 18 : 14,
                        zIndex: 30,
                        width: isFeaturedRank ? 42 : 34,
                        height: isFeaturedRank ? 42 : 34,
                        borderRadius: 999,
                        border: "1px solid var(--color-border-light)",
                        background: "color-mix(in srgb, var(--color-surface-0) 92%, transparent)",
                        color: "var(--color-text-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: isFeaturedRank ? "1.12rem" : "0.92rem",
                        fontWeight: 950,
                        lineHeight: 1,
                        boxShadow: "0 8px 18px color-mix(in srgb, var(--color-surface-900) 12%, transparent)",
                        pointerEvents: "none",
                      }}
                    >
                      {displayRank}
                    </div>
                    <img
                      src={`/api/photos/ps/${row.topItem}`}
                      alt={row.topItem}
                      className="gallery-img"
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
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
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-surface-900) 80%, transparent)",
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
                      padding: isFeaturedRank ? "18px 22px" : "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      background: isFeaturedRank
                      ? "color-mix(in srgb, var(--color-brand-500) 5%, var(--color-surface-0))"
                      : "var(--color-surface-0)",
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
                        size={isFeaturedRank ? 22 : 18}
                        style={{ color: rankStyle.bg, flexShrink: 0 }}
                      />
                      <span
                        style={{
                          fontSize: isFeaturedRank ? "1.18rem" : "1.05rem",
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
                          fontSize: isFeaturedRank ? "0.9rem" : "0.82rem",
                          fontWeight: 800,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {row.topItem}
                      </span>
                    </span>
                    <span
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--color-text-primary)",
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
        {isFilterLoading && !isInitialLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in srgb, var(--color-surface-1) 72%, transparent)",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid var(--color-border-light)",
                borderRadius: 8,
                background: "var(--color-surface-0)",
                color: "var(--color-text-primary)",
                padding: "10px 14px",
                boxShadow: "0 10px 30px color-mix(in srgb, var(--color-surface-900) 18%, transparent)",
                fontSize: "0.82rem",
                fontWeight: 900,
              }}
            >
              <span
                className="gallery-filter-spinner"
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid color-mix(in srgb, var(--color-brand-500) 22%, transparent)",
                  borderTopColor: "var(--color-brand-500)",
                  borderRadius: "50%",
                }}
              />
              Updating results...
            </div>
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            ref={previewRef}
            className="gallery-preview-shell"
            style={{
              background: "var(--color-surface-0)",
              borderRadius: 8,
              border:
                "1px solid color-mix(in srgb, var(--color-border-light) 50%, transparent)",
              boxShadow: "var(--shadow-modal), var(--shadow-inset-panel)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
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
                    {previewItem.customerLabel === "Customer Group" ? "Customer Group Item" : "Customer Item"}
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
              className="content-scrollbar gallery-preview-grid"
              style={{
                display: "grid",
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                background: "var(--color-surface-0)",
              }}
            >
              {/* Main image pane */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  minHeight: 0,
                  background: "var(--color-product-canvas)",
                }}
              >
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
                    height: "100%",
                    padding: "24px",
                  }}
                >
                  <img
                    src={`/api/photos/ps/${previewItem.id}`}
                    alt={`${previewItem.id}`}
                    className="gallery-preview-image"
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    onError={(event: SyntheticEvent<HTMLImageElement>) => {
                      const container = event.currentTarget.parentElement?.parentElement;
                      if (container) container.style.display = "none";
                    }}
                  />
                </div>
              </div>

              {/* Detail pane */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  borderLeft: "1px solid var(--color-border-light)",
                  background: "color-mix(in srgb, var(--color-surface-1) 82%, var(--color-surface-0))",
                  overflow: "hidden",
                }}
              >
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
      )}
    </div>
  );
}
function EmptyFilterPill({ label, value }: { label: string; value: string }) {
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
interface PeriodSelectProps {
  label?: string;
  value: string | number;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}

function PeriodSelect({ label, value, options, disabled = false, className = "", onChange }: PeriodSelectProps) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={selectRef} className={`relative text-[10px] font-bold text-[var(--color-text-tertiary)] ${className}`}>
      {label && <div>{label}</div>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={`${label ? "mt-1" : ""} flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-3 text-left text-xs font-black text-[var(--color-text-primary)] outline-none transition-all hover:border-[var(--color-brand-300)] focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand-500)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-45`}
        style={{ boxShadow: "inset 0 1px 2px color-mix(in srgb, var(--color-surface-900) 6%, transparent)" }}
      >
        <span className="truncate">{selected?.label || "Select"}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--color-text-tertiary)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && !disabled && (
        <div
          className="absolute left-0 top-full z-[140] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] p-1 shadow-2xl"
          style={{ boxShadow: "0 14px 34px color-mix(in srgb, var(--color-surface-900) 20%, transparent)" }}
        >
          {options.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(String(option.value));
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-black transition-colors ${active ? "border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_10%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]"}`}
              >
                <span className="truncate">{option.label}</span>
                {active && <span style={{ fontSize: "0.7rem" }}>*</span>}
              </button>
            );
          })}
        </div>
      )}
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
          style={{
            width: 44,
            height: 4,
            background: "color-mix(in srgb, var(--color-brand-500) 72%, var(--color-surface-0))",
            borderRadius: 2,
            marginBottom: 10,
          }}
        />
        <div
          style={{
            fontSize: "0.74rem",
            color: "var(--color-text-tertiary)",
            fontWeight: 950,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Detail
        </div>
        <div
          style={{
            marginTop: 6,
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-display)",
            fontSize: "1.35rem",
            fontWeight: 950,
            lineHeight: 1.12,
            wordBreak: "break-word",
          }}
        >
          {itemId}
        </div>
        <div
          style={{
            marginTop: 6,
            color: "var(--color-text-secondary)",
            fontSize: "0.88rem",
            fontWeight: 850,
          }}
        >
          {customer}
        </div>
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
            <div style={{ color: "var(--color-text-tertiary)", fontSize: "0.68rem", fontWeight: 900, marginBottom: 2 }}>
              {row.label}
            </div>
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

      <div
        style={{
          border: "1px solid var(--color-border-default)",
          borderRadius: 8,
          background: "color-mix(in srgb, var(--color-surface-0) 72%, var(--color-surface-2))",
          padding: "12px",
          marginTop: 0,
        }}
      >
        <div style={{ color: "var(--color-text-tertiary)", fontSize: "0.68rem", fontWeight: 950, marginBottom: 8 }}>
          Comparison
        </div>
        {loading ? (
          <div style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", fontWeight: 850 }}>
            Loading comparison...
          </div>
        ) : !comparison?.hasAnyData ? (
          <div style={{ color: "var(--color-text-primary)", fontSize: "1rem", fontWeight: 900 }}>
            No comparison data
          </div>
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
