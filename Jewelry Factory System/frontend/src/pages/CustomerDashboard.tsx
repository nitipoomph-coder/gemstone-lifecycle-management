import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { CalendarDays, Building2, RefreshCw, Users, Search, ChevronDown } from 'lucide-react';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border-light)', minWidth: 200 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 8, borderBottom: '1px solid var(--color-border-light)', paddingBottom: 6 }}>
          {label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payload.map((entry: any, index: number) => {
            if (entry.value === 0) return null;
            return (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color }} />
                  {ALL_GROUPS.find(g => g.id === entry.dataKey)?.label || (String(entry.dataKey).length === 4 ? `Year ${entry.dataKey}` : entry.name)}
                </div>
                <span style={{ color: entry.color }}>
                  {metric === 'qty' 
                    ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : '$' + entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

export default function CustomerDashboard({ metric = 'amount' }: { metric?: 'amount' | 'qty' }) {
  console.log('CustomerDashboard metric:', metric);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [custData, setCustData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New State mappings
  const [mode, setMode] = useState<'yearly' | 'monthly'>('yearly');
  const [monthlySeries, setMonthlySeries] = useState<'year' | 'group'>('year');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(MONTHS.map((_, i) => String(i + 1)));
  const [selGroups, setSelGroups] = useState<string[]>(ALL_GROUPS.slice(0, 4).map(g => g.id));
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Auto-hide labels when > 3 groups selected
  useEffect(() => {
    setShowLabels(selGroups.length <= 3);
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
        const latest = stringYears[stringYears.length - 1];
        const prev = stringYears.length > 1 ? stringYears[stringYears.length - 2] : null;
        setSelectedYears(prev ? [prev, latest] : [latest]);
      }
    }).catch(err => console.error(err));
  }, []);

  // Fetch all data for available years
  useEffect(() => {
    if (availableYears.length === 0) return;
    setLoading(true);
    fetchCustomerSummary(availableYears)
      .then(data => {
        setCustData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [availableYears]);

  // Keep groups in ALL_GROUPS order for consistent colors
  const sortedSel = useMemo(
    () => ALL_GROUPS.filter(g => selGroups.includes(g.id)).map(g => g.id),
    [selGroups]
  );

  // Convert customer data into RAW[year][month][groupId] structure
  const RAW = useMemo(() => {
    const raw: any = {};
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

  // Build chartData based on mode
  const chartData = useMemo(() => {
    if (mode === "yearly") {
      if (monthlySeries === 'year') {
        return sortedSel.map(gId => {
          const g = ALL_GROUPS.find(x => x.id === gId)!;
          const r: any = { label: g.label };
          activeYears.forEach(y => {
            r[y] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[gId] || 0), 0);
          });
          return r;
        });
      } else {
        return activeYears.map(y => {
          const r: any = { label: String(y) };
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
          const r: any = { label: m };
          activeYears.forEach(y => {
            r[y] = sortedSel.reduce((sum, g) => sum + (RAW[y]?.[m]?.[g] || 0), 0);
          });
          return r;
        });
      } else {
        // mode monthly: Alternating Years for the same month (Jan 25, Jan 26, Feb 25...), Series = Groups
        const list: any[] = [];
        sortedMonths.forEach(mStr => {
          activeYears.forEach(y => {
            const m = MONTHS[parseInt(mStr) - 1];
            const label = activeYears.length > 1 ? `${m} ${String(y).slice(2)}` : m;
            const r: any = { label, sortKey: `${mStr.padStart(2, '0')}-${y}` };
            sortedSel.forEach(g => {
              r[g] = RAW[y]?.[m]?.[g] || 0;
            });
            list.push(r);
          });
        });
        return list;
      }
    }
  }, [mode, activeYears, selectedMonths, sortedSel, RAW]);

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

  if (loading) {
    return (
      <>
        <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'SALES SUMMARY BY CUSTOMER' }]} />
        <div className="flex-1 p-6 flex flex-col gap-6 w-full h-full" style={{ background: 'var(--color-surface-1)' }}>
          {/* Header Skeleton */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="flex flex-col gap-2">
              <div className="animate-pulse rounded-lg" style={{ width: 300, height: 32, background: 'var(--color-surface-2)' }} />
              <div className="animate-pulse rounded-md" style={{ width: 200, height: 16, background: 'var(--color-surface-2)' }} />
            </div>
            <div className="animate-pulse rounded-2xl" style={{ width: 300, height: 48, background: 'var(--color-surface-2)' }} />
          </div>

          {/* Filters Skeleton */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="animate-pulse rounded-2xl" style={{ width: 250, height: 80, background: 'var(--color-surface-2)' }} />
            <div className="animate-pulse rounded-2xl flex-1" style={{ height: 80, background: 'var(--color-surface-2)' }} />
          </div>

          {/* Cards Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: 16 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse rounded-2xl" style={{ height: 180, background: 'var(--color-surface-2)' }} />
            ))}
          </div>

          {/* Chart Skeleton */}
          <div className="animate-pulse rounded-3xl" style={{ height: 400, background: 'var(--color-surface-2)' }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'SALES SUMMARY BY CUSTOMER' }]} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="p-6 flex flex-col gap-6 w-full">

          {/* Header & View Mode */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Sales Analytics <span style={{ color: 'var(--color-proc-polishing)' }}>By Customer Group</span>
              </h1>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'capitalize' }}>
                Client Account Growth Analysis
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={openCustomerSalesAnalysis}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, textTransform: 'capitalize',
                  color: 'var(--color-text-primary)', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                className="hover:-translate-y-0.5 active:scale-95"
              >
                <Users size={14} />
                Customer Sales Analysis
              </button>
              <button
                onClick={() => navigate('/dashboard/customer-report?metric=' + metric)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, textTransform: 'capitalize',
                  color: '#fff', background: 'var(--color-proc-polishing)', border: 'none',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-proc-polishing) 40%, transparent)'
                }}
                className="hover:-translate-y-0.5 active:scale-95"
              >
                <Search size={14} />
                Full Report Matrix
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, textTransform: 'capitalize',
                  color: 'var(--color-text-tertiary)', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                className="hover:text-red-500 hover:border-red-200 hover:bg-red-50"
              >
                <RefreshCw size={14} /> Reset All
              </button>

              <div style={{ display: 'flex', background: 'var(--color-surface-0)', padding: 4, borderRadius: 16, border: '1px solid var(--color-border-light)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)' }}>
                {[
                  { id: 'yearly', label: 'Yearly Comparison', icon: Building2 },
                  { id: 'monthly', label: 'Monthly Breakdown', icon: CalendarDays }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id as 'yearly' | 'monthly')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 20px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800,
                      color: mode === item.id ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)',
                      background: mode === item.id ? 'var(--color-proc-polishing)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: mode === item.id ? '0 2px 8px -2px rgba(0,0,0,0.2)' : 'none'
                    }}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters Area */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>

            {/* Multi-Year Picker */}
            <div style={{ background: 'var(--color-surface-0)', borderRadius: 16, padding: '14px 20px', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'capitalize', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
                Target Year(s)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {availableYears.map(y => {
                  const on = selectedYears.includes(y);
                  return (
                    <button key={y} onClick={() => toggleYear(y)} className="transition-all hover:-translate-y-0.5 active:scale-95" style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800,
                      border: `1.5px solid ${on ? 'var(--color-proc-polishing)' : 'var(--color-border-light)'}`,
                      background: on ? 'color-mix(in srgb, var(--color-proc-polishing) 12%, transparent)' : 'var(--color-surface-1)',
                      color: on ? 'var(--color-proc-polishing)' : 'var(--color-text-tertiary)',
                      cursor: 'pointer'
                    }}>{y}</button>
                  );
                })}
              </div>
            </div>

            {/* Month Filter (Monthly Mode Only) */}
            {mode === 'monthly' && (
              <div style={{ background: 'var(--color-surface-0)', borderRadius: 16, padding: '14px 20px', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }} ref={dropdownRef}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'capitalize', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
                  Filter Months
                </div>
                <button
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                    background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border-light)',
                    borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-primary)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  className="hover:border-blue-400 hover:bg-blue-50"
                >
                  <Search size={14} style={{ color: 'var(--color-text-tertiary)' }} />
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
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>Select Months</span>
                      <button
                        onClick={() => setSelectedMonths(MONTHS.map((_, i) => String(i + 1)))}
                        disabled={selectedMonths.length === 12}
                        style={{
                          fontSize: '0.65rem', fontWeight: 800, background: 'none', border: 'none',
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
                            padding: '6px 0', fontSize: '0.7rem', fontWeight: 800, borderRadius: 6,
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
            <div style={{ flex: 1, background: 'var(--color-surface-0)', borderRadius: 16, padding: '14px 20px', border: '1px solid var(--color-border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'capitalize', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} /> Customer Groups
                </div>
                <button onClick={() => setShowLabels(!showLabels)} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: showLabels ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : 'color-mix(in srgb, var(--color-warning-500) 15%, transparent)',
                  color: showLabels ? 'var(--color-success-500)' : 'var(--color-warning-500)',
                }}>
                  {showLabels ? "✓ Labels ON" : "Labels OFF"}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ALL_GROUPS.map(g => {
                  const on = selGroups.includes(g.id);
                  return (
                    <button key={g.id} onClick={() => toggleGroup(g.id)} className="transition-all hover:-translate-y-0.5 active:scale-95" style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800,
                      border: `1.5px solid ${on ? `color-mix(in srgb, ${g.color} 50%, transparent)` : 'var(--color-border-light)'}`,
                      background: on ? `color-mix(in srgb, ${g.color} 8%, transparent)` : 'var(--color-surface-1)',
                      color: on ? g.color : 'var(--color-text-tertiary)',
                      cursor: 'pointer'
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: on ? g.color : 'var(--color-border-light)' }} />
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: 16 }}>
            {summaries.map((g, idx) => {
              return (
                <div key={g.id} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 16, padding: '20px', borderTop: `4px solid ${g.color}`, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)', transition: 'all 0.3s ease', animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${idx * 0.05}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>{g.label}</span>
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
                            <span style={{ fontSize: isLatest ? '0.85rem' : '0.75rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>{yr}</span>
                            {prevYr && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: pct === null ? 'var(--color-text-tertiary)' : itemColor }}>
                                {pct === null ? '— No Existing Data' : `${pct >= 0 ? '↑ +' : '↓ '}${pct.toFixed(2)}%`}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: isLatest ? '1.3rem' : '0.95rem', fontWeight: 900, color: valColor, transition: 'color 0.3s' }}>
                            {metric === 'qty'
                              ? currVal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                              : '$' + currVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            }
                          </span>
                        </div>
                      );
                    })}
                    {activeYears.length === 1 && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 4 }}>
                        — Add another year to compare
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Chart Section */}
          <div style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 32, border: '1px solid var(--color-border-light)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.04)', animation: 'fadeInUp 0.4s ease-out' }}>
            {/* Dynamic Chart Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-primary)', textTransform: 'capitalize', letterSpacing: '0.05em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {mode === 'yearly' ? `Annual Sales Comparison` : `Monthly Sales Breakdown`}

                </h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                  Unit: {metric === 'qty' ? 'PCS' : 'USD'} · Grouped Layout {showLabels ? '· Value Labels Displayed' : '· Value Labels Hidden (select ≤ 3 groups)'}
                </p>

                {/* Chart Mode Toggles */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => setMonthlySeries('year')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 16, fontSize: '0.7rem', fontWeight: 800, background: monthlySeries === 'year' ? 'var(--color-brand-600)' : 'var(--color-surface-1)', color: monthlySeries === 'year' ? 'white' : 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <CalendarDays size={14} /> Compare by Year
                    </button>
                    <button onClick={() => setMonthlySeries('group')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 16, fontSize: '0.7rem', fontWeight: 800, background: monthlySeries === 'group' ? 'var(--color-brand-600)' : 'var(--color-surface-1)', color: monthlySeries === 'group' ? 'white' : 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <Users size={14} /> Compare by Group
                    </button>
                  </div>

                {/* Chart Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  {monthlySeries === 'group' ? sortedSel.map(gId => {
                    const g = ALL_GROUPS.find(x => x.id === gId)!;
                    return (
                      <div key={gId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: g.color }} />
                        {g.label}
                      </div>
                    );
                  }) : activeYears.map((y, idx) => {
                    const YEAR_COLORS = ['var(--color-brand-500)', 'var(--color-proc-polishing)', 'var(--color-proc-plating)', 'var(--color-proc-grinding)', 'var(--color-success-500)', 'var(--color-warning-500)'];
                    const color = YEAR_COLORS[idx % YEAR_COLORS.length];
                    return (
                      <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                        Year {y}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)', fontWeight: 900, textTransform: 'capitalize', marginBottom: 2 }}>
                  Grand Total {grandLatestYear ? `(${grandLatestYear})` : ''}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                  {metric === 'qty'
                    ? grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : '$' + grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                </div>
                {grandYoy.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2, alignItems: 'flex-end' }}>
                    {grandYoy.slice(0, 1).map(({ currYr, prevYr, pct }) => (
                      <div key={`${currYr}-${prevYr}`} style={{ fontSize: '0.8rem', fontWeight: 800, color: pct === null ? 'var(--color-text-tertiary)' : pct >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)', background: pct === null ? 'transparent' : pct >= 0 ? 'var(--color-success-50)' : 'var(--color-danger-50)', padding: '4px 10px', borderRadius: 12 }}>
                        {pct === null ? `— No prior data` : `${pct >= 0 ? '↑ +' : '↓ '}${pct.toFixed(2)}%`}
                        <span style={{ fontSize: '0.7rem', color: pct === null ? 'var(--color-text-quaternary)' : pct >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)', opacity: 0.8, marginLeft: 6 }}>
                          Compared to {prevYr}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recharts Component */}
            <div style={{ height: 420, padding: '20px 16px 16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border-light)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 800 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tickFormatter={(val) => formatAxisValue(val)} tick={{ fontSize: 11, fill: 'var(--color-text-quaternary)', fontWeight: 700 }} axisLine={false} tickLine={false} dx={-5} width={70} />
                  <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ fill: 'var(--color-surface-1)', opacity: 0.4 }} />
                  {monthlySeries === 'group' ? sortedSel.map((gId) => {
                    const g = ALL_GROUPS.find(x => x.id === gId)!;
                    return (
                      <Bar key={gId} dataKey={gId} fill={g.color} radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {showLabels && (
                          <LabelList dataKey={gId} position="top" formatter={(val: any) => val > 0 ? formatAxisValue(Number(val)).replace('$', '') : ''} style={{ fontSize: 10, fill: g.color, fontWeight: 800 }} />
                        )}
                      </Bar>
                    );
                  }) : activeYears.map((y, idx) => {
                    const YEAR_COLORS = ['var(--color-brand-500)', 'var(--color-proc-polishing)', 'var(--color-proc-plating)', 'var(--color-proc-grinding)', 'var(--color-success-500)', 'var(--color-warning-500)'];
                    const color = YEAR_COLORS[idx % YEAR_COLORS.length];
                    return (
                      <Bar key={y} dataKey={y} name={`Year ${y}`} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {showLabels && (
                          <LabelList dataKey={y} position="top" formatter={(val: any) => val > 0 ? formatAxisValue(Number(val)).replace('$', '') : ''} style={{ fontSize: 10, fill: color, fontWeight: 800 }} />
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
