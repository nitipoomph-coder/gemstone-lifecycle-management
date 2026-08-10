import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { RefreshCw, DollarSign, Hash, Calendar, CalendarDays, Layers, Users, Eye, EyeOff } from 'lucide-react';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
  // @ts-ignore
import { buildCustomerTrendsPath } from '../utils/customerTrendsUrl';
import { useTheme } from '../contexts/useTheme';
import './CustomerDashboard.css';


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // @ts-ignore
const MONTH_PARAM_IDS = MONTHS.map((_, index) => String(index + 1));
const ALL_GROUP_IDS = ALL_GROUPS.map(group => group.id);
  // @ts-ignore
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
  // @ts-ignore
function defaultYearSelection(years: string[]) {
  const latest = years[years.length - 1];
  const prev = years[years.length - 2];
  return prev ? [prev, latest] : latest ? [latest] : [];
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label, metric }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--color-border-light)', minWidth: 200, background: 'var(--color-ui-surface)', boxShadow: 'var(--shadow-dropdown)' }}>
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

export default function CustomerDashboard({ metric: propMetric = 'amount' }: { metric?: Metric }) {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const metric = (searchParams.get('metric') as Metric) || propMetric;
  const { selectedYears, selectedMonths, selGroups, availableYears } = useOutletContext<any>();
  const [custData, setCustData] = useState<CustomerSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New State mappings
  const [mode, setMode] = useState<'yearly' | 'monthly'>('yearly');
  const [monthlySeries, setMonthlySeries] = useState<'year' | 'group'>('year');
  const [showLabels, setShowLabels] = useState(true);

  // Auto-hide labels when switching to Group series due to overlapping
  useEffect(() => {
    if (monthlySeries === 'group') {
      setShowLabels(false);
    }
  }, [monthlySeries]);

  const navigate = useNavigate();


  // Fetch all data for available years
  useEffect(() => {
    if (availableYears.length === 0) {
      return;
    }
    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      fetchCustomerSummary(availableYears)
        .then(data => {
          setCustData(data as CustomerSummaryRow[]);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching customer summary:', err);
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
  // @ts-ignore
    availableYears.forEach(y => {
      raw[y] = {};
      MONTHS.forEach((m) => {
        raw[y][m] = {};
        ALL_GROUPS.forEach(g => { raw[y][m][g.id] = 0; });
      });
    });

    custData.forEach(cust => {
      const gId = getCustomerGroupId(cust.id || '');

  // @ts-ignore
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
  // @ts-ignore
            r[y] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[gId] || 0), 0);
          });
          return r;
        });
      } else {
        return activeYears.map(y => {
          const r: ChartDatum = { label: String(y) };
  // @ts-ignore
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
  // @ts-ignore
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

  const switchMetric = (nextMetric: Metric) => {
    if (nextMetric === metric) return;
    navigate(`/dashboard/customer${nextMetric === 'qty' ? '?metric=qty' : ''}`);
  };

  const resetSummaryView = () => {
    setMode('yearly');
    setMonthlySeries('year');
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

  const formatAxisValue = (value: number): string => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    if (metric === 'qty') return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // @ts-ignore
  const summaryTitle = 'Sales Summary';





  // @ts-ignore
  const periodButtonLabel = useMemo(() => {
    const monthText = selectedMonths.length === 12 ? 'All Months' : `${selectedMonths.length} Mths`;
    return `(${monthText})`;
  }, [selectedMonths]);

  if (loading) {
    return (
      <>
          <div className="app-page-scroll content-scrollbar">
          <div className="app-content-frame app-content-frame--workspace app-page-content sales-summary-page sales-summary-page--loading">
            {/* Header Skeleton */}
            <div className="sales-summary-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="app-skeleton" style={{ width: 280, height: 28, borderRadius: 6 }} />
                <div className="app-skeleton" style={{ width: 180, height: 16, borderRadius: 4 }} />
              </div>
              <div className="app-skeleton" style={{ width: 240, height: 40, borderRadius: 8 }} />
            </div>

            {/* KPI Cards Skeleton Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 12, padding: 20, height: 160 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div className="app-skeleton" style={{ width: 120, height: 18, borderRadius: 4 }} />
                    <div className="app-skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                  </div>
                  <div className="app-skeleton" style={{ width: '60%', height: 36, marginBottom: 12, borderRadius: 6 }} />
                  <div className="app-skeleton" style={{ width: '40%', height: 14, borderRadius: 4 }} />
                </div>
              ))}
            </div>
            
            {/* Main Chart Skeleton */}
            <div className="app-skeleton rounded-lg" style={{ width: '100%', height: 400, borderRadius: 12 }} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>


      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--workspace app-page-content sales-summary-page" style={{ paddingTop: 16 }}>
          
          {/* Internal Dashboard Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)', borderRadius: '8px 8px 0 0', marginBottom: 16 }}>
            <h2 style={{ fontSize: 'var(--erp-text-section)', fontWeight: 900, color: 'var(--color-text-primary)', margin: 0 }}>
              Sales Summary
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ErpSegmentedControl ariaLabel="Metric" value={metric} onChange={(v) => switchMetric(v as Metric)} options={[ { value: 'amount', label: 'Sales', icon: <DollarSign size={13} /> }, { value: 'qty', label: 'Qty', icon: <Hash size={13} /> } ]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="View" value={mode} onChange={(v) => setMode(v as 'yearly' | 'monthly')} options={[ { value: 'yearly', label: 'Year', icon: <CalendarDays size={13} /> }, { value: 'monthly', label: 'Month', icon: <Calendar size={13} /> } ]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="Series" value={monthlySeries} onChange={(v) => setMonthlySeries(v as 'year' | 'group')} options={[ { value: 'year', label: 'By Year', icon: <Layers size={13} /> }, { value: 'group', label: 'By Group', icon: <Users size={13} /> } ]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="Labels" value={showLabels ? 'on' : 'off'} onChange={(v) => setShowLabels(v === 'on')} options={[ { value: 'on', label: 'Show Labels', icon: <Eye size={13} /> }, { value: 'off', label: 'Hide Labels', icon: <EyeOff size={13} /> } ]} />
              <button onClick={resetSummaryView} style={{ background: "none", border: "none", padding: "6px", color: "var(--color-text-tertiary)", cursor: "pointer", marginLeft: 8 }}><RefreshCw size={14} /></button>
            </div>
          </div>
          {/* Main Content Grid: Chart on Left, YoY Cards on Right */}
          <div className="sales-summary-main-grid">

            {/* Main Chart Section */}
            <div className="sales-summary-chart" style={{ background: 'var(--color-surface-0)', borderRadius: 8, padding: 18, border: '1px solid var(--color-border-light)', boxShadow: 'none' }}>
              {/* Dynamic Chart Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--erp-text-section)', fontWeight: 900, color: 'var(--color-text-primary)', textTransform: 'capitalize', letterSpacing: 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {mode === 'yearly' ? (metric === 'qty' ? `Annual Quantity Comparison` : `Annual Sales Comparison`) : (metric === 'qty' ? `Monthly Quantity Breakdown` : `Monthly Sales Breakdown`)}
                  </h2>
                  <p style={{ margin: 0, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                    Unit: {metric === 'qty' ? 'PCS' : 'USD'} / Series Color: {usesGroupSeriesColors ? 'Customer Group' : 'Year'} {showLabels ? '/ Value Labels Displayed' : '/ Value Labels Hidden'}
                  </p>

                  {/* Chart Legend */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
                      {grandYoy.slice(0, 1).map(({ currYr, prevYr, pct }) => {
                        const isRoyalTheme = theme === 'royal-white';
                        const isUp = pct !== null && pct >= 0;
                        return (
                          <div
                            key={`${currYr}-${prevYr}`}
                            style={{
                              fontSize: 'var(--erp-text-body)',
                              fontWeight: 800,
                              color: pct === null ? 'var(--color-text-tertiary)' : isUp ? 'var(--color-success-500)' : 'var(--color-danger-500)',
                              background: pct === null ? 'transparent' : (isRoyalTheme ? (isUp ? 'var(--color-success-50)' : 'var(--color-danger-50)') : 'transparent'),
                              padding: isRoyalTheme ? '4px 10px' : '0',
                              borderRadius: 12
                            }}
                          >
                            {pct === null ? `No prior data` : `${isUp ? 'Up +' : 'Down '}${pct.toFixed(2)}%`}
                            <span style={{ fontSize: 'var(--erp-text-dense)', color: pct === null ? 'var(--color-text-quaternary)' : isUp ? 'var(--color-success-500)' : 'var(--color-danger-500)', opacity: 0.8, marginLeft: 6 }}>
                              vs {prevYr}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Recharts Component */}
              <div className="sales-summary-chart-body" style={{ padding: '10px 8px 8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border-light)" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 800 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tickFormatter={(val) => formatAxisValue(val)} tick={{ fontSize: 10, fill: 'var(--color-text-quaternary)', fontWeight: 700 }} axisLine={false} tickLine={false} dx={-5} width={70} />
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

            {/* Side-by-Side Summary Cards */}
            <div className="sales-summary-cards">
              {summaries.map((g) => {
                const groupInfo = ALL_GROUPS.find(x => x.id === g.id);
                const bTotal = g.yearTotals[activeYears[0]] || 0;
                const cTotal = activeYears.length > 1 ? (g.yearTotals[activeYears[1]] || 0) : 0;
                const pct = cTotal > 0 ? ((bTotal - cTotal) / cTotal) * 100 : null;
                const isUp = pct !== null && pct > 0;
                const isDown = pct !== null && pct < 0;

                const isRoyalTheme = theme === 'royal-white';
                return (
                  <div
                    key={g.id}
                    style={{
                      background: 'var(--color-surface-0)',
                      border: '1px solid var(--color-border-light)',
                      borderLeft: `4px solid ${groupInfo?.color || 'var(--color-border-light)'}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{g.label}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>({activeYears[0]})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
                      <span style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
                        {metric === 'qty'
                          ? bTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                          : '$' + bTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }
                      </span>
                      {pct !== null && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            color: isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)',
                            background: isRoyalTheme ? (isUp ? 'color-mix(in srgb, var(--color-success-500) 12%, transparent)' : isDown ? 'color-mix(in srgb, var(--color-danger-500) 12%, transparent)' : 'transparent') : 'transparent',
                            padding: isRoyalTheme ? '2px 6px' : '0',
                            borderRadius: isRoyalTheme ? 4 : 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            flexWrap: 'nowrap'
                          }}
                        >
                          <span>{isUp ? '↑' : isDown ? '↓' : ''} {Math.abs(pct).toFixed(2)}%</span>
                          {activeYears.length > 1 && (
                            <span style={{ fontSize: '0.62rem', opacity: 0.75, color: 'var(--color-text-quaternary)', fontWeight: 800 }}>
                              vs {activeYears[1]}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

