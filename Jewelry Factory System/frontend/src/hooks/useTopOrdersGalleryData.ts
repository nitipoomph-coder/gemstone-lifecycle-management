import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchTopItemsGallery, type TopGalleryItem, type TopGalleryResponse } from '../services/itemYearlySummaryAPI';
import { ALL_GROUPS, ACTIVE_GROUP_IDS } from '../config/customerGroups';

// --- Shared Constants & Types ---
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export type PeriodPreset = "full-year" | "ytd" | "this-month" | "last-month" | "custom";

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = [String(CURRENT_YEAR), String(CURRENT_YEAR - 1), String(CURRENT_YEAR - 2), String(CURRENT_YEAR - 3)];

export const PERIOD_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "full-year", label: "Full Year" },
  { id: "ytd", label: "YTD" },
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
];

export interface ProductTypeOption {
  value: string;
  label: string;
  fullLabel: string;
  description: string;
}

export const PRODUCT_TYPE_OPTIONS: ProductTypeOption[] = [
  { value: 'ALL', label: 'All', fullLabel: 'All Product Types', description: 'ทุกประเภทสินค้า' },
  { value: 'BBS', label: 'BBS', fullLabel: 'Bracelet & Bangle', description: 'สร้อยข้อมือ & กำไล' },
  { value: 'BANGLE', label: 'Bangles', fullLabel: 'Bangles', description: 'กำไลข้อแข็ง' },
  { value: 'NON_BANGLE', label: 'Non Bangles', fullLabel: 'Bracelet (Soft)', description: 'สร้อยข้อมือแบบนิ่ม/โซ่' },
  { value: 'BES', label: 'BES', fullLabel: 'Earring', description: 'ต่างหู' },
  { value: 'BNS', label: 'BNS', fullLabel: 'Necklace', description: 'สร้อยคอ / จี้' },
  { value: 'BRS', label: 'BRS', fullLabel: 'Ring', description: 'แหวน' },
  { value: 'OTH', label: 'Others', fullLabel: 'Others', description: 'เครื่องประดับอื่นๆ' },
];

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
  return [...sortedYears].reverse().find(year => Number(year) < Number(baseYear)) || (sortedYears[0] !== baseYear ? sortedYears[0] : '');
};

export const normalizeStyleNo = (value: unknown) => String(value || "").trim().toUpperCase();
export const normalizeCustomerCode = (value: unknown) => String(value || "").trim().toUpperCase();
export const customerItemKey = (customerCode: unknown, styleNo: unknown) => `${normalizeCustomerCode(customerCode)}|${normalizeStyleNo(styleNo)}`;

export const getGroupLabel = (groupId: string) => ALL_GROUPS.find((group: any) => group.id === groupId)?.label || groupId;

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
  const metric = (searchParams.get("metric") || "amount") as 'qty' | 'amount';

  const [availableYears, setAvailableYears] = useState<string[]>(DEFAULT_YEARS);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  const [baseYear, setBaseYear] = useState<string>(String(CURRENT_YEAR));
  const [compareYear, setCompareYear] = useState<string>(String(CURRENT_YEAR - 1));
  const [compareEnabled, setCompareEnabled] = useState(true);

  const [selGroups, setSelGroups] = useState<string[]>(() => {
    const urlGroups = searchParams.get("groups");
    return urlGroups ? urlGroups.split(",").filter(Boolean) : ACTIVE_GROUP_IDS;
  });

  const [productType, setProductType] = useState<string>(() => {
    return searchParams.get("type") || "ALL";
  });

  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [monthStart, setMonthStart] = useState(1);
  const [monthEnd, setMonthEnd] = useState(12);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("full-year");
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft | null>(null);

  const [galleryResponse, setGalleryResponse] = useState<TopGalleryResponse | null>(null);
  const [previewItem, setPreviewItem] = useState<TopGalleryItem | null>(null);

  const filterTransitionTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const hasLoadedInitialRef = useRef(false);

  const selectedMonthNumbers = useMemo(() => monthRange(monthStart, monthEnd), [monthStart, monthEnd]);
  const selectedPeriodLabel = monthRangeLabel(monthStart, monthEnd);
  const selectedGroupsKey = selGroups.join(",");

  const analyticsPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set("metric", metric);
    if (baseYear) params.set("year", baseYear);
    if (compareEnabled && compareYear) params.set("compareYear", compareYear);
    if (selectedMonthNumbers.length) params.set("months", selectedMonthNumbers.join(","));
    if (selectedGroupsKey) params.set("groups", selectedGroupsKey);
    if (productType && productType !== 'ALL') params.set("type", productType);
    return `/dashboard/top-orders/analytics?${params.toString()}`;
  }, [baseYear, compareEnabled, compareYear, metric, productType, selectedGroupsKey, selectedMonthNumbers]);

  const startFilterTransition = (duration = 600) => {
    setFilterLoading(true);
    if (filterTransitionTimer.current) window.clearTimeout(filterTransitionTimer.current);
    filterTransitionTimer.current = window.setTimeout(() => setFilterLoading(false), duration);
  };

  useEffect(() => {
    return () => {
      if (filterTransitionTimer.current) window.clearTimeout(filterTransitionTimer.current);
    };
  }, []);

  // 1. Initial years load
  useEffect(() => {
    let cancelled = false;
    fetchAvailableYears()
      .then((years: any) => {
        if (cancelled) return;
        const stringYears = (years || []).map(String).sort((a: any, b: any) => b.localeCompare(a));
        if (stringYears.length > 0) {
          setAvailableYears(stringYears);
          setBaseYear((prev) => (prev && stringYears.includes(prev) ? prev : stringYears[0]));
          setCompareYear((prev) => (prev && stringYears.includes(prev) ? prev : (stringYears[1] || '')));
        }
      })
      .catch((err) => {
        console.error("Error fetching available years:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);


  // 2. Fetch Top Gallery items from API
  useEffect(() => {
    if (!baseYear || availableYears.length === 0) return;

    let cancelled = false;
    if (hasLoadedInitialRef.current) {
      setFilterLoading(true);
    }
    setLoading(true);

    const yearsToFetch = compareEnabled && compareYear && compareYear !== baseYear
      ? [compareYear, baseYear]
      : [baseYear];

    const monthsToFetch = selectedMonthNumbers.map(String);

    fetchTopItemsGallery({
      years: yearsToFetch,
      months: monthsToFetch,
      baseYear,
      compareYear: compareEnabled ? compareYear : undefined,
      groups: selGroups.length === ALL_GROUPS.length ? ['all'] : selGroups,
      productType,
      metric,
      search: searchQuery,
      limit: 100,
    })
      .then((data) => {
        if (cancelled) return;
        setGalleryResponse(data);
        hasLoadedInitialRef.current = true;
      })
      .catch((err) => {
        console.error("Error fetching top gallery items:", err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setFilterLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [availableYears, baseYear, compareEnabled, compareYear, metric, productType, searchQuery, selGroups, selectedMonthNumbers]);

  const items = galleryResponse?.items || [];
  const summary = galleryResponse?.summary || {
    totalItemsCount: 0,
    portfolioTotalQty: 0,
    portfolioTotalAmnt: 0,
    baseYearTotalQty: 0,
    compareYearTotalQty: 0,
  };

  const buildPeriodDraft = (): PeriodDraft => {
    const activeBase = baseYear || availableYears[0] || String(CURRENT_YEAR);
    const activeComp = compareYear || getDefaultCompareYear(activeBase, availableYears);
    return {
      preset: periodPreset,
      baseYear: activeBase,
      startMonth: monthStart,
      endMonth: monthEnd,
      compareEnabled,
      compareYear: activeComp,
    };
  };

  const applyPeriodPreset = (preset: PeriodPreset) => {
    const range = presetRange(preset);
    setPeriodDraft((prev) =>
      prev
        ? { ...prev, preset, startMonth: range.startMonth, endMonth: range.endMonth }
        : {
            preset,
            baseYear,
            startMonth: range.startMonth,
            endMonth: range.endMonth,
            compareEnabled,
            compareYear: compareYear || getDefaultCompareYear(baseYear, availableYears),
          }
    );
  };

  const updatePeriodDraft = (patch: Partial<PeriodDraft>) => {
    setPeriodDraft((prev) => {
      const base = prev || buildPeriodDraft();
      const next = { ...base, ...patch };
      if (patch.startMonth !== undefined || patch.endMonth !== undefined) {
        next.preset = 'custom';
      }
      return next;
    });
  };

  const applyPeriodDraft = () => {
    if (!periodDraft) return;
    startFilterTransition();
    setPeriodPreset(periodDraft.preset);
    setMonthStart(periodDraft.startMonth);
    setMonthEnd(periodDraft.endMonth);
    setBaseYear(periodDraft.baseYear);
    setCompareEnabled(periodDraft.compareEnabled);
    setCompareYear(periodDraft.compareYear);
  };

  const toggleGroup = (gId: string) => {
    startFilterTransition();
    setSelGroups((prev) =>
      prev.includes(gId) ? prev.filter((x) => x !== gId) : [...prev, gId]
    );
  };

  return {
    metric,
    isInitialLoading: loading && !galleryResponse,
    isFilterLoading: filterLoading || (loading && !!galleryResponse),
    availableYears,
    baseYear,
    setBaseYear,
    compareYear,
    setCompareYear,
    compareEnabled,
    setCompareEnabled,
    selGroups,
    setSelGroups,
    toggleGroup,
    productType,
    setProductType,
    searchDraft,
    setSearchDraft,
    searchQuery,
    setSearchQuery,
    monthStart,
    setMonthStart,
    monthEnd,
    setMonthEnd,
    periodPreset,
    setPeriodPreset,
    periodDraft,
    setPeriodDraft,
    buildPeriodDraft,
    applyPeriodPreset,
    updatePeriodDraft,
    applyPeriodDraft,
    getDefaultCompareYear,
    items,
    summary,
    previewItem,
    setPreviewItem,
    analyticsPath,
    selectedMonthNumbers,
    selectedPeriodLabel,
    startFilterTransition,
  };
}
