import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAvailableYearsMeta } from '../services/dashboardAPI';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { fetchItemCustomerYearlySummary } from '../services/itemYearlySummaryAPI';
import type { ItemCustomerYearlySummaryItem, ItemCustomerYearlySummaryPair } from '../services/itemYearlySummaryAPI';
import { getCustomerGroupId, ALL_GROUPS, ACTIVE_GROUP_IDS } from '../config/customerGroups';

// --- Shared Constants & Types ---
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const PRODUCT_TYPE_OPTIONS = ["ALL", "BBS", "BES", "BNS", "BRS"] as const;
export type ProductTypeFilter = typeof PRODUCT_TYPE_OPTIONS[number];
export type GalleryDisplayMode = "group" | "list";
export type PeriodPreset = "full-year" | "ytd" | "this-month" | "last-month" | "custom";

export const PERIOD_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "full-year", label: "Full Year" },
  { id: "ytd", label: "YTD" },
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
];

export const LOW_BASE_QTY = 100;
export const TOP_CUSTOMER_ITEM_LIMIT = 50;
export const TOP_ITEMS_PER_GROUP_IN_ALL = 10;

export interface PreviewItem {
  id: string;
  rank: number;
  cust: string;
  customerCode: string;
  customerLabel: string;
  total: number;
  qty: number;
}

export interface GalleryRow {
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

export interface PeriodDraft {
  preset: PeriodPreset;
  baseYear: string;
  startMonth: number;
  endMonth: number;
  compareEnabled: boolean;
  compareYear: string;
}

// --- Helper Functions ---
export const getDefaultCompareYear = (baseYear: string, years: string[]) => {
  const sortedYears = [...years].map(String).sort((a, b) => Number(a) - Number(b));
  return [...sortedYears].reverse().find(year => Number(year) < Number(baseYear)) || '';
};

export const normalizeStyleNo = (value: unknown) => String(value || "").trim().toUpperCase();
export const normalizeCustomerCode = (value: unknown) => String(value || "").trim().toUpperCase();
export const customerItemKey = (customerCode: unknown, styleNo: unknown) => `${normalizeCustomerCode(customerCode)}|${normalizeStyleNo(styleNo)}`;

export const getGroupLabel = (groupId: string) => ALL_GROUPS.find((group: any) => group.id === groupId)?.label || groupId;

export const galleryRowSearchText = (row: GalleryRow) =>
  [row.label, row.customerCode, row.customerName, row.groupId, row.groupLabel, row.topItem, row.productType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const currentMonthNumber = () => new Date().getMonth() + 1;
export const clampMonth = (month: number) => Math.min(12, Math.max(1, Number(month) || 1));
export const monthRange = (startMonth: number, endMonth: number) => {
  const start = clampMonth(Math.min(startMonth, endMonth));
  const end = clampMonth(Math.max(startMonth, endMonth));
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};
export const monthRangeLabel = (startMonth: number, endMonth: number) => {
  const start = clampMonth(Math.min(startMonth, endMonth));
  const end = clampMonth(Math.max(startMonth, endMonth));
  return start === 1 && end === 12 ? "Full Year" : `${MONTHS[start - 1]}-${MONTHS[end - 1]}`;
};
export const presetRange = (preset: PeriodPreset) => {
  const current = currentMonthNumber();
  if (preset === "ytd") return { startMonth: 1, endMonth: current };
  if (preset === "this-month") return { startMonth: current, endMonth: current };
  if (preset === "last-month") {
    const last = current === 1 ? 12 : current - 1;
    return { startMonth: last, endMonth: last };
  }
  return { startMonth: 1, endMonth: 12 };
};

// --- Custom Hook ---
export function useTopOrdersGalleryData() {
  const [searchParams] = useSearchParams();
  const metric = searchParams.get("metric") || "amount";

  const [custData, setCustData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [firstDataYear, setFirstDataYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  const [baseYear, setBaseYear] = useState<string>("");
  const [selGroups, setSelGroups] = useState<string[]>(() => {
    const urlGroups = searchParams.get("groups");
    return urlGroups ? urlGroups.split(",").filter(Boolean) : ACTIVE_GROUP_IDS;
  });
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<ProductTypeFilter>("ALL");
  const [monthStart, setMonthStart] = useState(1);
  const [monthEnd, setMonthEnd] = useState(12);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("full-year");
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft | null>(null);

  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
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

  const startFilterTransition = () => {
    setFilterLoading(true);
    if (filterTransitionTimer.current) window.clearTimeout(filterTransitionTimer.current);
    filterTransitionTimer.current = window.setTimeout(() => setFilterLoading(false), 800);
  };

  useEffect(() => {
    return () => {
      if (filterTransitionTimer.current) window.clearTimeout(filterTransitionTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      fetchAvailableYearsMeta()
        .then(({ years, firstDataYear }: any) => {
          if (cancelled) return;
          const sortedYrs = years.map(String).sort((a: any, b: any) => Number(a) - Number(b));
          setFirstDataYear(firstDataYear);
          setAvailableYears(sortedYrs);
          if (sortedYrs.length > 0) {
            setBaseYear(sortedYrs[sortedYrs.length - 1]);
          }
        })
        .catch((err: any) => {
          console.error("Error fetching available years:", err);
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, []);

  useEffect(() => {
    if (availableYears.length === 0) return;
    let cancelled = false;
    const loadTimer = window.setTimeout(() => {
      if (hasLoadedCustomerDataRef.current) setFilterLoading(true);
      setLoading(true);
      fetchCustomerSummary(availableYears, selectedMonthNames)
        .then((cData: any) => {
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

      if (yrTotal > 0) {
        const groupLabel = getGroupLabel(groupId);
        if (selectedProductType === "ALL") {
          const typeMap = cust.topItemsByYearByType?.[baseYear] || {};
          const typeKeys = Object.keys(typeMap);
          if (typeKeys.length > 0) {
            typeKeys.forEach((pType) => {
              const itemInfo = typeMap[pType as ProductTypeFilter];
              const tItem = itemInfo?.topItem;
              const tQty = Number(itemInfo?.topItemQty || 0);
              if (tItem && tQty > 0) {
                sourceRows.push({
                  rowKey: `list-${customerCode}-${normalizeStyleNo(tItem)}-${baseYear}-${pType}`,
                  id: customerCode,
                  label: customerCode,
                  customerCode,
                  customerName: String(cust.name || ""),
                  groupId,
                  groupLabel,
                  topItem: tItem,
                  topItemQty: tQty,
                  productType: pType,
                  yrTotal,
                  sortValue: tQty,
                  displayMode: "list",
                });
              }
            });
          } else if (cust.topItemsByYear?.[baseYear]?.topItem) {
            const yearlyTopItem = cust.topItemsByYear[baseYear];
            const tItem = yearlyTopItem.topItem;
            const tQty = Number(yearlyTopItem.topItemQty || 0);
            if (tItem && tQty > 0) {
              sourceRows.push({
                rowKey: `list-${customerCode}-${normalizeStyleNo(tItem)}-${baseYear}-ALL`,
                id: customerCode,
                label: customerCode,
                customerCode,
                customerName: String(cust.name || ""),
                groupId,
                groupLabel,
                topItem: tItem,
                topItemQty: tQty,
                productType: yearlyTopItem.productType || "ALL",
                yrTotal,
                sortValue: tQty,
                displayMode: "list",
              });
            }
          }
        } else {
          const yearlyTopItem = cust.topItemsByYearByType?.[baseYear]?.[selectedProductType];
          const topItem = yearlyTopItem?.topItem;
          const topItemQty = Number(yearlyTopItem?.topItemQty || 0);
          if (topItem && topItemQty > 0) {
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
              productType: selectedProductType,
              yrTotal,
              sortValue: topItemQty,
              displayMode: "list",
            });
          }
        }
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

      const rows = ALL_GROUPS.flatMap((group: any) => {
        const groupRows = rowsByGroup.get(group.id) || [];
        return groupRows.slice(0, TOP_ITEMS_PER_GROUP_IN_ALL).map((row, index) => ({
          ...row,
          rowKey: `all-${row.groupId}-${row.customerCode}-${normalizeStyleNo(row.topItem)}-${index}`,
          label: row.groupLabel,
          displayMode: "group" as GalleryDisplayMode,
        }));
      }).sort((a: any, b: any) => (b.sortValue || 0) - (a.sortValue || 0));

      return { rows, totalRows: rows.length };
    }

    const rows = sourceRows.filter((row) => selectedGroupSet.has(row.groupId));
    const totalRows = rows.length;
    return { rows: rows.slice(0, TOP_CUSTOMER_ITEM_LIMIT), totalRows };
  }, [custData, baseYear, selGroups, searchQuery, metric, selectedProductType, selectedMonthNumbers]);

  useEffect(() => {
    if (!compareEnabled || !baseYear || availableYears.length === 0) return;
    if (compareYear && compareYear !== baseYear && availableYears.includes(compareYear)) return;
    const syncTimer = window.setTimeout(() => {
      setCompareYear(getDefaultCompareYear(baseYear, availableYears));
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [availableYears, baseYear, compareEnabled, compareYear]);

  const visibleItemPairs = useMemo<ItemCustomerYearlySummaryPair[]>(() => {
    const pairs = new Map<string, ItemCustomerYearlySummaryPair>();
    tableData.rows.forEach((row: any) => {
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
      fetchItemCustomerYearlySummary(visibleItemPairs, [baseYear, compareYear])
        .then((result: any) => {
          if (cancelled) return;
          const dict: Record<string, ItemCustomerYearlySummaryItem> = {};
          (result.data || []).forEach((it: any) => {
            if (it.customerCode && it.styleNo) {
              const key = customerItemKey(it.customerCode, it.styleNo);
              dict[key] = it;
            }
          });
          setItemsYearlyByPair(dict);
        })
        .catch((err: any) => console.error("Error fetching comparison data", err))
        .finally(() => {
          if (!cancelled) setCompareLoading(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [baseYear, compareYear, visibleItemPairs, compareEnabled]);

  return {
    metric,
    isInitialLoading,
    isFilterLoading,
    availableYears,
    baseYear,
    setBaseYear,
    selGroups,
    setSelGroups,
    searchDraft,
    setSearchDraft,
    searchQuery,
    setSearchQuery,
    selectedProductType,
    setSelectedProductType,
    monthStart,
    setMonthStart,
    monthEnd,
    setMonthEnd,
    periodPreset,
    setPeriodPreset,
    compareEnabled,
    setCompareEnabled,
    periodDraft,
    setPeriodDraft,
    previewItem,
    setPreviewItem,
    compareYear,
    setCompareYear,
    itemsYearlyByPair,
    compareLoading,
    tableData,
    comparisonYears,
    analyticsPath,
    selectedMonthNumbers,
    selectedPeriodLabel,
    startFilterTransition
  };
}
