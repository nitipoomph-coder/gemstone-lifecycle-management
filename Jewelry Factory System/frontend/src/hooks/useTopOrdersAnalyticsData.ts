import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAvailableYearsMeta } from "../services/dashboardAPI";
import { fetchCustomerSummary } from "../services/customerSummaryAPI";
import { fetchItemCustomerYearlySummary } from "../services/itemYearlySummaryAPI";
import type { ItemCustomerYearlySummaryItem, ItemCustomerYearlySummaryPair } from "../services/itemYearlySummaryAPI";
import { getCustomerGroupId } from "../config/customerGroups";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const TOP_CUSTOMER_ITEM_LIMIT = 50;

export interface CompareSummary {
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

export interface CustomerTopItemSummary {
  topItem?: string;
  topItemQty?: number | string;
  productType?: string;
}

export interface CustomerSummaryRecord {
  id?: string;
  monthlyQty?: Record<string, Record<string, number | string>>;
  topItemsByYear?: Record<string, CustomerTopItemSummary>;
  topItem?: string;
  topItemQty?: number | string;
}

export interface AnalyticsRow {
  id: string;
  customer: string;
  itemNo: string;
  sortValue: number;
  fallbackCurrentQty: number;
  comparison?: CompareSummary;
}

export const normalizeStyleNo = (value: unknown) => String(value || "").trim().toUpperCase();
export const normalizeCustomerCode = (value: unknown) => String(value || "").trim().toUpperCase();
export const customerItemKey = (customerCode: unknown, styleNo: unknown) => `${normalizeCustomerCode(customerCode)}|${normalizeStyleNo(styleNo)}`;

export const parseQueryList = (value: string | null) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);



export const parseMonthParam = (value: string | null) => {
  const months = parseQueryList(value)
    .map(Number)
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);
  const uniqueMonths = Array.from(new Set(months)).sort((a, b) => a - b);
  return uniqueMonths.length ? uniqueMonths : MONTHS.map((_, index) => index + 1);
};

export const getDefaultCompareYear = (baseYear: string, years: string[]) => {
  const sortedYears = [...years].map(String).sort((a, b) => Number(a) - Number(b));
  return [...sortedYears].reverse().find((year) => Number(year) < Number(baseYear)) || sortedYears.find((year) => year !== baseYear) || "";
};

export const selectedMonthsLabel = (months: number[]) => {
  const sortedMonths = [...months].sort((a, b) => a - b);
  if (!sortedMonths.length || sortedMonths.length === 12) return "Full Year";
  const start = sortedMonths[0];
  const end = sortedMonths[sortedMonths.length - 1];
  return start === end ? MONTHS[start - 1] : `${MONTHS[start - 1]}-${MONTHS[end - 1]}`;
};

export const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
export const fmtSignedQty = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
export const fmtPct = (value: number | null, isNew = false) => (value === null ? (isNew ? "New" : "0.0%") : `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(1)}%`);

export function useTopOrdersAnalyticsData() {
  const [searchParams] = useSearchParams();
  const monthParam = searchParams.get("months");
  const groupParam = searchParams.get("groups");
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
  const [itemsYearlyByPair, setItemsYearlyByPair] = useState<Record<string, ItemCustomerYearlySummaryItem>>({});

  const selectedMonthNumbers = useMemo(() => parseMonthParam(monthParam), [monthParam]);
  const selectedMonthNames = useMemo(() => selectedMonthNumbers.map((month) => MONTHS[month - 1]), [selectedMonthNumbers]);
  const selectedPeriodLabel = selectedMonthsLabel(selectedMonthNumbers);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setSelGroups(parseQueryList(groupParam));
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [groupParam]);

  const [refreshVersion, setRefreshVersion] = useState(0);

  const refreshData = useCallback(() => {
    setRefreshVersion((v) => v + 1);
  }, []);

  const loadAnalyticsData = useCallback(async (cancelled: () => boolean) => {
    setLoading(true);
    try {
      const { years, firstDataYear } = await fetchAvailableYearsMeta();
      const sortedYears = years.map(String).sort((a: any, b: any) => Number(a) - Number(b));
      if (cancelled()) return;
      setFirstDataYear(firstDataYear);
      setAvailableYears(sortedYears);

      const nextBaseYear = requestedYearParam && sortedYears.includes(requestedYearParam) ? requestedYearParam : sortedYears[sortedYears.length - 1] || "";
      const nextCompareYear = requestedCompareYearParam && sortedYears.includes(requestedCompareYearParam) && requestedCompareYearParam !== nextBaseYear
        ? requestedCompareYearParam
        : getDefaultCompareYear(nextBaseYear, sortedYears);

      setBaseYear((current) => current || nextBaseYear);
      setCompareYear((current) => current || nextCompareYear);
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
  }, [loadAnalyticsData, refreshVersion]);

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
      const yearlyTopItem = cust.topItemsByYear?.[baseYear];
      const topItem = yearlyTopItem?.topItem || (cust.topItemsByYear ? null : cust.topItem);
      const topItemQty = Number(yearlyTopItem?.topItemQty || (cust.topItemsByYear ? 0 : cust.topItemQty) || 0);

      const customerCode = cust.id || "";
      if (customerCode && yearQty > 0 && topItem && topItemQty > 0) {
        rows.push({
          id: `${customerCode}-${topItem}`,
          customer: customerCode,
          itemNo: topItem,
          sortValue: topItemQty,
          fallbackCurrentQty: topItemQty,
        });
      }
    });

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter((row) => [row.customer, row.itemNo].join(" ").toLowerCase().includes(q));
    }

    return rows.sort((a, b) => b.sortValue - a.sortValue).slice(0, TOP_CUSTOMER_ITEM_LIMIT);
  }, [baseYear, custData, searchQuery, selGroups, selectedMonthNumbers]);

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
        .then((result: any) => {
          if (cancelled) return;
          const next: Record<string, ItemCustomerYearlySummaryItem> = {};
          (result.data || []).forEach((item: any) => {
            const key = customerItemKey(item.normalizedCustomerCode || item.customerCode, item.normalizedStyleNo || item.styleNo);
            if (key) next[key] = item;
          });
          setItemsYearlyByPair(next);
        })
        .catch((err: any) => {
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
  }, [baseYear, compareYear, comparisonYears, selectedMonthNames, visibleItemPairs, refreshVersion]);

  const comparisonsByPair = useMemo(() => {
    const next: Record<string, CompareSummary> = {};
    if (!baseYear || !compareYear || baseYear === compareYear) return next;

    Object.values(itemsYearlyByPair).forEach((item) => {
      const rowsByYear = new Map(item.data.map((row: any) => [String(row.year), row]));
      const baseQty = Number(rowsByYear.get(baseYear)?.qty || 0);
      const compareQty = Number(rowsByYear.get(compareYear)?.qty || 0);
      const diff = baseQty - compareQty;
      const totalQty = baseQty + compareQty;
      const activeYears = Number(baseQty > 0) + Number(compareQty > 0);
      const avgQty = activeYears > 0 ? totalQty / activeYears : 0;
      const pct = compareQty > 0 ? (diff / compareQty) * 100 : null;
      const key = customerItemKey(item.normalizedCustomerCode || item.customerCode, item.normalizedStyleNo || item.styleNo);
      if (key) {
        const isNew = baseQty > 0 && Array.from(rowsByYear.entries()).every(([year, row]: [string, any]) => firstDataYear === null || Number(year) < firstDataYear || Number(year) >= Number(baseYear) || Number(row.qty || 0) <= 0);
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

  return {
    availableYears,
    loading,
    compareLoading,
    baseYear,
    setBaseYear,
    compareYear,
    setCompareYear,
    searchDraft,
    setSearchDraft,
    searchQuery,
    setSearchQuery,
    selGroups,
    setSelGroups,
    selectedPeriodLabel,
    applySearch,
    handleSearchKeyDown,
    rows,
    summary,
    toggleGroup,
    setCurrentYear,
    isBusy: loading || compareLoading,
    refreshData,
  };
}
