import { useState, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { CalendarDays, Building2, RefreshCw, Users, ChevronDown, DollarSign, Hash, Table2 } from 'lucide-react';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import './CustomerDashboard.css';


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_PARAM_IDS = MONTHS.map((_, index) => String(index + 1));
const ALL_GROUP_IDS = ALL_GROUPS.map(group => group.id);
const SUMMARY_DEFAULT_GROUP_IDS = ALL_GROUP_IDS.slice(0, 4);
const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];


type Metric = 'amount' | 'qty';
type MonthlySummaryMap = Record<string, Record<string, number>>;
type CustomerSummaryRow = {
  id?: string;
  monthly?: MonthlySummaryMap;
  monthlyQty?: MonthlySummaryMap;
};
type RawSummary = Record<string, Record<string, Record<string, number>>>;
type ChartDatum = { label: string; sortKey?: string } & Record<string, string | number | undefined>;
type TooltipPayloadEntry = { value?: number; color?: string; dataKey?: string | number; name?: string };
type CustomTooltipProps = { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string; metric: Metric };
function defaultYearSelection(years: string[]) {
  const latest = years[years.length - 1];
  const prev = years[years.length - 2];
  return prev ? [prev, latest] : latest ? [latest] : [];
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label, metric }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border-light)', minWidth: 200 }}>
        <p style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 8, borderBottom: '1px solid var(--color-border-light)', paddingBottom: 6 }}>
          {label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payload.map((entry, index) => {
            if (entry.value === 0) return null;
            return (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--erp-text-control)', fontWeight: 800 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color }} />
                  {ALL_GROUPS.find(g => g.id === entry.dataKey)?.label || (String(entry.dataKey).length === 4 ? `Year ${entry.dataKey}` : entry.name)}
                </div>
                <span style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {metric === 'qty'
                    ? Number(entry.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : '$' + Number(entry.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function CustomerDashboard({ metric = 'amount' }: { metric?: Metric }) {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [custData, setCustData] = useState<CustomerSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New State mappings
  const [mode, setMode] = useState<'yearly' | 'monthly'>('yearly');
  const [monthlySeries, setMonthlySeries] = useState<'year' | 'group'>('year');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(MONTHS.map((_, i) => String(i + 1)));
  const [selGroups, setSelGroups] = useState<string[]>(SUMMARY_DEFAULT_GROUP_IDS);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Auto-hide labels when too many bars would crowd the chart.
  useEffect(() => {
    const labelTimer = window.setTimeout(() => {
      setShowLabels(selGroups.length <= 3);
    }, 0);
    return () => window.clearTimeout(labelTimer);
  }, [selGroups.length]);

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch available years on mount
  useEffect(() => {
    fetchAvailableYears().then(years => {
      const stringYears = years.map(String).sort((a, b) => parseInt(a) - parseInt(b));
      setAvailableYears(stringYears);
      if (stringYears.length > 0) {
        setSelectedYears(defaultYearSelection(stringYears));
      }
    }).catch(err => console.error(err));
  }, []);

  // Fetch all data for available years
  useEffect(() => {
    if (availableYears.length === 0) return;
    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      fetchCustomerSummary(availableYears)
        .then(data => {
          setCustData(data as CustomerSummaryRow[]);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [availableYears]);

  // Keep groups in ALL_GROUPS order for consistent colors
  const sortedSel = useMemo(
    () => ALL_GROUPS.filter(g => selGroups.includes(g.id)).map(g => g.id),
    [selGroups]
  );

  // Convert customer data into RAW[year][month][groupId] structure
  const RAW = useMemo(() => {
    const raw: RawSummary = {};
    availableYears.forEach(y => {
      raw[y] = {};
      MONTHS.forEach((m) => {
        raw[y][m] = {};
        ALL_GROUPS.forEach(g => { raw[y][m][g.id] = 0; });
      });
    });

    custData.forEach(cust => {
      const gId = getCustomerGroupId(cust.id || '');

      availableYears.forEach(y => {
        MONTHS.forEach((m, mi) => {
          const mStr = (mi + 1).toString();
          const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;
          const val = source?.[y]?.[mStr] || 0;
          raw[y][m][gId] += val;
        });
      });
    });
    return raw;
  }, [custData, availableYears, metric]);

  const activeYears = [...selectedYears].sort();
  const usesGroupSeriesColors = monthlySeries === 'group';

  // Build chartData based on mode
  const chartData = useMemo(() => {
    if (mode === "yearly") {
      if (monthlySeries === 'year') {
        return sortedSel.map(gId => {
          const g = ALL_GROUPS.find(x => x.id === gId)!;
          const r: ChartDatum = { label: g.label };
          activeYears.forEach(y => {
            r[y] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[gId] || 0), 0);
          });
          return r;
        });
      } else {
        return activeYears.map(y => {
          const r: ChartDatum = { label: String(y) };
          sortedSel.forEach(g => { r[g] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[g] || 0), 0); });
          return r;
        });
      }
    } else {
      const sortedMonths = [...selectedMonths].sort((a, b) => parseInt(a) - parseInt(b));
      if (monthlySeries === 'year') {
        // mode monthly: X-axis = Month, Series = Years (YoY Comparison)
        return sortedMonths.map(mStr => {
          const m = MONTHS[parseInt(mStr) - 1];
          const r: ChartDatum = { label: m };
          activeYears.forEach(y => {
            r[y] = sortedSel.reduce((sum, g) => sum + (RAW[y]?.[m]?.[g] || 0), 0);
          });
          return r;
        });
      } else {
        // mode monthly: Alternating Years for the same month (Jan 25, Jan 26, Feb 25...), Series = Groups
        const list: ChartDatum[] = [];
        sortedMonths.forEach(mStr => {
          activeYears.forEach(y => {
            const m = MONTHS[parseInt(mStr) - 1];
            const label = activeYears.length > 1 ? `${m} ${String(y).slice(2)}` : m;
            const r: ChartDatum = { label, sortKey: `${mStr.padStart(2, '0')}-${y}` };
            sortedSel.forEach(g => {
              r[g] = RAW[y]?.[m]?.[g] || 0;
            });
            list.push(r);
          });
        });
        return list;
      }
    }
  }, [mode, monthlySeries, activeYears, selectedMonths, sortedSel, RAW]);

  // Summary Cards computation
  const summaries = useMemo(() => {
    const maxYear = activeYears.length > 0 ? activeYears[activeYears.length - 1] : null;
    const minYear = activeYears.length > 0 ? activeYears[0] : null;

    return sortedSel.map(gId => {
      const g = ALL_GROUPS.find(x => x.id === gId)!;

      const yearTotals: Record<string, number> = {};
      activeYears.forEach(y => {
        yearTotals[y] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[gId] || 0), 0);
      });

      const latestYear = activeYears.length > 0 ? activeYears[activeYears.length - 1] : null;
      const totalLatestYear = latestYear ? (yearTotals[latestYear] || 0) : 0;

      let pct = null;
      if (maxYear && minYear && maxYear !== minYear) {
        const curr = yearTotals[maxYear] || 0;
        const prev = yearTotals[minYear] || 0;
        if (prev > 0) {
          pct = ((curr - prev) / prev) * 100;
        }
      }

      return { ...g, yearTotals, totalLatestYear, pct, maxYear, minYear, latestYear };
    });
  }, [sortedSel, activeYears, selectedMonths, RAW]);

  const openCustomerSalesAnalysis = () => {
    const params = new URLSearchParams();
    if (activeYears.length) params.set('years', activeYears.join(','));
    if (selectedMonths.length) params.set('months', selectedMonths.join(','));
    const salesGroups = sortedSel.filter(groupId => groupId !== 'General');
    if (salesGroups.length) params.set('groups', salesGroups.join(','));
    params.set('metric', metric);
    navigate(`/dashboard/sales-customer-groups?${params.toString()}`);
  };
  const openCustomerMatrix = () => {
    const params = new URLSearchParams();
    const selectedMonthIds = [...selectedMonths].sort((a, b) => Number(a) - Number(b));
    const isAllMonths = selectedMonthIds.length === MONTH_PARAM_IDS.length && MONTH_PARAM_IDS.every(monthId => selectedMonthIds.includes(monthId));
    const isSummaryDefaultGroups = sortedSel.length === SUMMARY_DEFAULT_GROUP_IDS.length && SUMMARY_DEFAULT_GROUP_IDS.every((groupId, index) => sortedSel[index] === groupId);
    const isAllGroups = sortedSel.length === ALL_GROUP_IDS.length && ALL_GROUP_IDS.every((groupId, index) => sortedSel[index] === groupId);

    if (metric !== 'amount') params.set('metric', metric);
    if (mode === 'monthly') params.set('view', 'monthly');
    if (activeYears.length) params.set('years', activeYears.join(','));
    if (!isAllMonths) params.set('months', selectedMonthIds.join(','));

    if (sortedSel.length === 0) {
      params.set('groups', 'none');
    } else if (isSummaryDefaultGroups) {
      params.set('src', 'summary');
    } else if (isAllGroups) {
      params.set('groups', 'all');
    } else {
      params.set('groups', sortedSel.join(','));
    }

    const query = params.toString().replaceAll('%2C', ',');
    navigate(query ? `/dashboard/customer-report?${query}` : '/dashboard/customer-report');
  };

  const switchMetric = (nextMetric: Metric) => {
    if (nextMetric === metric) return;
    navigate(nextMetric === 'qty' ? '/dashboard/qty' : '/dashboard/customer');
  };

  const resetSummaryView = () => {
    setMode('yearly');
    setMonthlySeries('year');
    setSelectedYears(defaultYearSelection(availableYears));
    setSelectedMonths(MONTH_PARAM_IDS);
    setSelGroups(SUMMARY_DEFAULT_GROUP_IDS);
    setShowMonthDropdown(false);
    setShowLabels(true);
  };

  // Grand Total computation
  const { grandTotal, grandYoy, grandLatestYear } = useMemo(() => {
    let gTotal = 0;

    const grandYearTotals: Record<string, number> = {};
    activeYears.forEach(y => {
      grandYearTotals[y] = 0;
    });

    summaries.forEach(g => {
      activeYears.forEach(y => {
        grandYearTotals[y] += (g.yearTotals[y] || 0);
      });
    });

    const reversedYears = [...activeYears].reverse();
    const latestYear = reversedYears.length > 0 ? reversedYears[0] : null;

    if (latestYear) {
      gTotal = grandYearTotals[latestYear] || 0;
    }

    const gYoy: { currYr: string, prevYr: string, pct: number | null }[] = [];
    for (let i = 0; i < reversedYears.length - 1; i++) {
      const currYr = reversedYears[i];
      const prevYr = reversedYears[i + 1];
      const currVal = grandYearTotals[currYr];
      const prevVal = grandYearTotals[prevYr];
      let pct = null;
      if (prevVal > 0) {
        pct = ((currVal - prevVal) / prevVal) * 100;
      }
      gYoy.push({ currYr, prevYr, pct });
    }

    return { grandTotal: gTotal, grandYoy: gYoy, grandLatestYear: latestYear };
  }, [summaries, activeYears]);

  const toggleGroup = (id: string) => {
    setSelGroups(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(x => x !== id) : prev
        : [...prev, id]
    );
  };

  const toggleYear = (y: string) => {
    setSelectedYears(prev =>
      prev.includes(y)
        ? prev.length > 1 ? prev.filter(v => v !== y) : prev
        : [...prev, y]
    );
  };

  const toggleMonth = (mStr: string) => {
    setSelectedMonths(prev =>
      prev.includes(mStr)
        ? prev.length > 1 ? prev.filter(v => v !== mStr) : prev
        : [...prev, mStr]
    );
  };

  const formatAxisValue = (value: number): string => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    if (metric === 'qty') return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const summaryTitle = 'Sales & Qty Summary';
  const summaryBreadcrumb = [
    { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
    { label: 'Sales Analytics' },
    { label: summaryTitle },
  ];

  if (loading) {
    return (
      <>
        <Topbar breadcrumb={summaryBreadcrumb} contentLayout="dashboard-wide" />
        <div className="app-content-frame app-content-frame--dashboard-wide app-page-content sales-summary-page sales-summary-page--loading" style={{ background: 'var(--color-surface-1)' }}>
          {/* Header Skeleton */}
          <div className="sales-summary-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="flex flex-col gap-2">
              <div className="animate-pulse rounded-lg" style={{ width: 300, height: 32, background: 'var(--color-surface-2)' }} />
              <div className="animate-pulse rounded-md" style={{ width: 200, height: 16, background: 'var(--color-surface-2)' }} />
            </div>
            <div className="animate-pulse rounded-2xl" style={{ width: 300, height: 48, background: 'var(--color-surface-2)' }} />
          </div>

          {/* Filters Skeleton */}
          <div className="sales-summary-filters" style={{ display: 'flex', gap: 16 }}>
            <div className="animate-pulse rounded-2xl" style={{ width: 250, height: 80, background: 'var(--color-surface-2)' }} />
            <div className="animate-pulse rounded-2xl flex-1" style={{ height: 80, background: 'var(--color-surface-2)' }} />
          </div>

          {/* Cards Skeleton */}
          <div className="sales-summary-cards">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse rounded-2xl" style={{ height: 180, background: 'var(--color-surface-2)' }} />
            ))}
          </div>

          {/* Chart Skeleton */}
          <div className="sales-summary-chart sales-summary-chart--loading animate-pulse rounded-3xl" style={{ background: 'var(--color-surface-2)' }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar breadcrumb={summaryBreadcrumb} contentLayout="dashboard-wide" />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--dashboard-wide app-page-content sales-summary-page">

          {/* Header & Control Bar */}
          <div className="sales-summary-header" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: 'var(--erp-text-page)', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: 0, lineHeight: 1.1, margin: 0 }}>
                  {summaryTitle}
                </h1>
                <p style={{ fontSize: 'var(--erp-text-control)', fontWeight: 800, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                  First view is chart focused, filtered by year, month, and customer group.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={openCustomerSalesAnalysis} style={compactSecondaryButton}><Users size={14} /> Customer Trends</button>
                <button onClick={openCustomerMatrix} style={compactSecondaryButton}><Table2 size={14} /> Matrix</button>
                <button onClick={resetSummaryView} style={compactGhostButton}><RefreshCw size={14} /> Reset</button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '8px 12px' }}>
              <div style={controlSection}>
                <span style={controlLabel}>Metric</span>
                <ErpSegmentedControl
                  ariaLabel="Metric selection"
                  value={metric}
                  onChange={(v) => switchMetric(v as Metric)}
                  options={[
                    { value: 'amount', label: 'Sales', icon: <DollarSign size={13} /> },
                    { value: 'qty', label: 'Qty', icon: <Hash size={13} /> },
                  ]}
                />
              </div>
              <div style={controlDivider} />
              <div style={controlSection}>
                <span style={controlLabel}>View</span>
                <ErpSegmentedControl
                  ariaLabel="View mode"
                  value={mode}
                  onChange={(v) => setMode(v as 'yearly' | 'monthly')}
                  options={[
                    { value: 'yearly', label: 'Yearly', icon: <Building2 size={13} /> },
                    { value: 'monthly', label: 'Monthly', icon: <CalendarDays size={13} /> },
                  ]}
                />
              </div>
              <div style={controlDivider} />
              <div style={controlSection}>
                <span style={controlLabel}>Series</span>
                <ErpSegmentedControl
                  ariaLabel="Series mode"
                  value={monthlySeries}
                  onChange={(v) => setMonthlySeries(v as 'year' | 'group')}
                  options={[
                    { value: 'year', label: 'By Year', icon: <CalendarDays size={13} /> },
                    { value: 'group', label: 'By Group', icon: <Users size={13} /> },
                  ]}
                />
              </div>
              <div style={controlDivider} />
              <div style={controlSection}>
                <span style={controlLabel}>Labels</span>
                <ErpSegmentedControl
                  ariaLabel="Labels toggle"
                  value={showLabels ? 'on' : 'off'}
                  onChange={(v) => setShowLabels(v === 'on')}
                  options={[
                    { value: 'on', label: 'ON' },
                    { value: 'off', label: 'OFF' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Filters Area */}
          <div className="sales-summary-filters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>

            {/* Multi-Year Picker */}
            <div style={{ background: 'var(--color-surface-0)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
              <div style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 800, textTransform: 'capitalize', color: 'var(--color-text-tertiary)', letterSpacing: 0 }}>
                Target Year(s)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {availableYears.map(y => {
                  const on = selectedYears.includes(y);
                  return (
                    <button key={y} onClick={() => toggleYear(y)} className="transition-all hover:-translate-y-0.5 active:scale-95" style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 'var(--erp-text-control)', fontWeight: 800,
                      border: `1.5px solid ${on ? 'var(--color-proc-polishing)' : 'var(--color-border-light)'}`,
                      background: on ? 'color-mix(in srgb, var(--color-proc-polishing) 12%, transparent)' : 'var(--color-surface-1)',
                      color: on ? 'var(--color-proc-polishing)' : 'var(--color-text-tertiary)',
                      cursor: 'pointer'
                    }}>{y}</button>
                  );
                })}
              </div>
            </div>

            {/* Month Filter */}
            {selectedMonths.length > 0 && (
              <div style={{ background: 'var(--color-surface-0)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', minWidth: 220 }} ref={dropdownRef}>
                <div style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 800, textTransform: 'capitalize', color: 'var(--color-text-tertiary)', letterSpacing: 0 }}>
                  Filter Months
                </div>
                <button
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                    background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border-light)',
                    borderRadius: 8, fontSize: 'var(--erp-text-control)', fontWeight: 800, color: 'var(--color-text-primary)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <CalendarDays size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                  {selectedMonths.length === 12 ? 'All 12 Months' : `${selectedMonths.length} Months Selected`}
                  <ChevronDown size={14} style={{ marginLeft: 4, color: 'var(--color-text-tertiary)' }} />
                </button>

                {/* Month Dropdown Menu */}
                {showMonthDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 8, width: 280,
                    background: 'var(--color-surface-0)', border: '1px solid var(--color-border-strong)',
                    borderRadius: 12, padding: 16, zIndex: 50, boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>Select Months</span>
                      <button
                        onClick={() => setSelectedMonths(MONTHS.map((_, i) => String(i + 1)))}
                        disabled={selectedMonths.length === 12}
                        style={{
                          fontSize: 'var(--erp-text-meta)', fontWeight: 800, background: 'none', border: 'none',
                          color: selectedMonths.length === 12 ? 'var(--color-text-quaternary)' : 'var(--color-proc-polishing)',
                          cursor: selectedMonths.length === 12 ? 'not-allowed' : 'pointer'
                        }}>
                        Select All
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {MONTHS.map((m, i) => {
                        const mStr = String(i + 1);
                        const on = selectedMonths.includes(mStr);
                        return (
                          <button key={m} onClick={() => toggleMonth(mStr)} className="transition-all hover:-translate-y-0.5 active:scale-95" style={{
                            padding: '6px 0', fontSize: 'var(--erp-text-dense)', fontWeight: 800, borderRadius: 6,
                            border: `1px solid ${on ? 'var(--color-proc-polishing)' : 'var(--color-border-light)'}`,
                            background: on ? 'color-mix(in srgb, var(--color-proc-polishing) 12%, transparent)' : 'var(--color-surface-1)',
                            color: on ? 'var(--color-proc-polishing)' : 'var(--color-text-tertiary)',
                            cursor: 'pointer'
                          }}>
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer Groups */}
            <div style={{ flex: 1, background: 'var(--color-surface-0)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--color-border-light)', minWidth: 300 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 800, textTransform: 'capitalize', color: 'var(--color-text-tertiary)', letterSpacing: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} /> Customer Groups
                </div>
                <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-tertiary)' }}>{selGroups.length}/{ALL_GROUPS.length} selected</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ALL_GROUPS.map(g => {
                  const on = selGroups.includes(g.id);
                  const groupAccent = usesGroupSeriesColors ? g.color : 'var(--color-brand-500)';
                  return (
                    <button key={g.id} onClick={() => toggleGroup(g.id)} className="transition-all hover:-translate-y-0.5 active:scale-95" style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 20, fontSize: 'var(--erp-text-control)', fontWeight: 800,
                      border: `1.5px solid ${on ? `color-mix(in srgb, ${groupAccent} 50%, transparent)` : 'var(--color-border-light)'}`,
                      background: on ? `color-mix(in srgb, ${groupAccent} 8%, transparent)` : 'var(--color-surface-1)',
                      color: on ? groupAccent : 'var(--color-text-tertiary)',
                      cursor: 'pointer'
                    }}>
                      {usesGroupSeriesColors && <span style={{ width: 10, height: 10, borderRadius: 3, background: on ? g.color : 'var(--color-border-light)' }} />}
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Summary Cards */}
          <div className="sales-summary-cards">
            {summaries.map((g, idx) => {
              const groupCardBorderTop = usesGroupSeriesColors ? `4px solid ${g.color}` : '1px solid var(--color-border-light)';
              return (
                <div key={g.id} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 16, padding: '20px', borderTop: groupCardBorderTop, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)', transition: 'all 0.3s ease', animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${idx * 0.05}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    {usesGroupSeriesColors && <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color }} />}
                    <span style={{ fontSize: 'var(--erp-text-control)', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>{g.label}</span>
                  </div>

                  {/* Years Breakdown & YoY */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...activeYears].reverse().map((yr, i, arr) => {
                      const prevYr = arr[i + 1];
                      const currVal = g.yearTotals[yr] || 0;
                      const prevVal = prevYr ? (g.yearTotals[prevYr] || 0) : null;
                      let pct = null;
                      if (prevVal !== null && prevVal > 0) {
                        pct = ((currVal - prevVal) / prevVal) * 100;
                      }

                      const isLatest = i === 0;
                      const itemColor = pct === null ? 'var(--color-text-primary)' : pct >= 0 ? 'var(--color-success-500)' : 'var(--color-danger-500)';
                      const valColor = isLatest ? itemColor : 'var(--color-text-primary)';

                      return (
                        <div key={yr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isLatest ? 'flex-end' : 'center', paddingBottom: isLatest ? 8 : 4, borderBottom: isLatest ? '2px solid var(--color-border-light)' : '1px dashed var(--color-border-light)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: isLatest ? 'var(--erp-text-panel)' : 'var(--erp-text-control)', fontWeight: 900, color: 'var(--color-text-secondary)' }}>{yr}</span>
                            {prevYr && (
                              <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 800, color: pct === null ? 'var(--color-text-tertiary)' : itemColor }}>
                                {pct === null ? 'No existing data' : `${pct >= 0 ? 'Up +' : 'Down '}${pct.toFixed(2)}%`}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: isLatest ? 'var(--erp-text-kpi)' : 'var(--erp-text-panel)', fontWeight: 900, color: valColor, transition: 'color 0.3s' }}>
                            {metric === 'qty'
                              ? currVal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                              : '$' + currVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            }
                          </span>
                        </div>
                      );
                    })}
                    {activeYears.length === 1 && (
                      <div style={{ fontSize: 'var(--erp-text-control)', fontWeight: 800, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 4 }}>
                        Add another year to compare
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Chart Section */}
          <div className="sales-summary-chart" style={{ background: 'var(--color-surface-0)', borderRadius: 8, padding: 18, border: '1px solid var(--color-border-light)', boxShadow: 'none', animation: 'fadeInUp 0.4s ease-out' }}>
            {/* Dynamic Chart Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 'var(--erp-text-section)', fontWeight: 900, color: 'var(--color-text-primary)', textTransform: 'capitalize', letterSpacing: 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {mode === 'yearly' ? (metric === 'qty' ? `Annual Quantity Comparison` : `Annual Sales Comparison`) : (metric === 'qty' ? `Monthly Quantity Breakdown` : `Monthly Sales Breakdown`)}

                </h2>
                <p style={{ margin: 0, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                  Unit: {metric === 'qty' ? 'PCS' : 'USD'} / Series Color: {usesGroupSeriesColors ? 'Customer Group' : 'Year'} {showLabels ? '/ Value Labels Displayed' : '/ Value Labels Hidden (select <= 3 groups)'}
                </p>

                {/* Chart Mode Toggles */}
                <div style={{ display: 'none', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setMonthlySeries('year')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 16, fontSize: 'var(--erp-text-dense)', fontWeight: 800, background: monthlySeries === 'year' ? 'color-mix(in srgb, var(--color-brand-500) 9%, var(--color-surface-0))' : 'var(--color-surface-1)', color: monthlySeries === 'year' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <CalendarDays size={14} /> Compare by Year
                  </button>
                  <button onClick={() => setMonthlySeries('group')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 16, fontSize: 'var(--erp-text-dense)', fontWeight: 800, background: monthlySeries === 'group' ? 'color-mix(in srgb, var(--color-brand-500) 9%, var(--color-surface-0))' : 'var(--color-surface-1)', color: monthlySeries === 'group' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Users size={14} /> Compare by Group
                  </button>
                </div>

                {/* Chart Legend */}
                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
                    {usesGroupSeriesColors ? 'Group Colors' : 'Year Colors'}
                  </span>
                  {usesGroupSeriesColors ? sortedSel.map(gId => {
                    const g = ALL_GROUPS.find(x => x.id === gId)!;
                    return (
                      <div key={gId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--erp-text-dense)', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: g.color }} />
                        {g.label}
                      </div>
                    );
                  }) : activeYears.map((y, idx) => {
                    const color = YEAR_COLORS[idx % YEAR_COLORS.length];
                    return (
                      <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--erp-text-dense)', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                        Year {y}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--erp-text-panel)', color: 'var(--color-text-primary)', fontWeight: 900, textTransform: 'capitalize', marginBottom: 2 }}>
                  Grand Total {grandLatestYear ? `(${grandLatestYear})` : ''}
                </div>
                <div style={{ fontSize: 'var(--erp-text-grand)', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                  {metric === 'qty'
                    ? grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : '$' + grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                </div>
                {grandYoy.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2, alignItems: 'flex-end' }}>
                    {grandYoy.slice(0, 1).map(({ currYr, prevYr, pct }) => (
                      <div key={`${currYr}-${prevYr}`} style={{ fontSize: 'var(--erp-text-body)', fontWeight: 800, color: pct === null ? 'var(--color-text-tertiary)' : pct >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)', background: pct === null ? 'transparent' : pct >= 0 ? 'var(--color-success-50)' : 'var(--color-danger-50)', padding: '4px 10px', borderRadius: 12 }}>
                        {pct === null ? `No prior data` : `${pct >= 0 ? 'Up +' : 'Down '}${pct.toFixed(2)}%`}
                        <span style={{ fontSize: 'var(--erp-text-dense)', color: pct === null ? 'var(--color-text-quaternary)' : pct >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)', opacity: 0.8, marginLeft: 6 }}>
                          Compared to {prevYr}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recharts Component */}
            <div className="sales-summary-chart-body" style={{ padding: '10px 8px 8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border-light)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 800 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tickFormatter={(val) => formatAxisValue(val)} tick={{ fontSize: 11, fill: 'var(--color-text-quaternary)', fontWeight: 700 }} axisLine={false} tickLine={false} dx={-5} width={70} />
                  <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ fill: 'var(--color-surface-1)', opacity: 0.4 }} />
                  {monthlySeries === 'group' ? sortedSel.map((gId) => {
                    const g = ALL_GROUPS.find(x => x.id === gId)!;
                    return (
                      <Bar key={gId} dataKey={gId} name={g.label} fill={g.color} radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {showLabels && (
                          <LabelList dataKey={gId} position="top" formatter={(val: unknown) => Number(val) > 0 ? formatAxisValue(Number(val)).replace('$', '') : ''} style={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 800 }} />
                        )}
                      </Bar>
                    );
                  }) : activeYears.map((y, idx) => {
                    const color = YEAR_COLORS[idx % YEAR_COLORS.length];
                    return (
                      <Bar key={y} dataKey={y} name={`Year ${y}`} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {showLabels && (
                          <LabelList dataKey={y} position="top" formatter={(val: unknown) => Number(val) > 0 ? formatAxisValue(Number(val)).replace('$', '') : ''} style={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 800 }} />
                        )}
                      </Bar>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
const controlSection: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const controlLabel: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, marginRight: 2 };
const controlDivider: CSSProperties = { width: 1, alignSelf: 'stretch', background: 'var(--color-border-light)', minHeight: 26 };
const compactSecondaryButton: CSSProperties = { height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', borderRadius: 6, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', fontSize: 'var(--erp-text-control)', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const compactGhostButton: CSSProperties = { height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', borderRadius: 6, border: '1px solid var(--color-border-light)', background: 'transparent', color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-control)', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
