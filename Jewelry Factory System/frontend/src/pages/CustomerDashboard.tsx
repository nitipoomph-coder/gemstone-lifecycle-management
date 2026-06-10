import { useState, useMemo, useEffect, useRef } from 'react';
import Topbar from '../components/layout/Topbar';
import { CalendarDays, DollarSign, Building2, RefreshCw, Users, Search, ChevronDown } from 'lucide-react';
import { fetchCustomerSummary, fetchAvailableYears } from '../services/dashboardAPI';

const ALL_GROUPS = [
  { id: 'N008', label: 'N008 Group', color: 'var(--color-brand-500)' },
  { id: 'MLT', label: 'MLT Group', color: 'var(--color-proc-polishing)' },
  { id: 'N083', label: 'N083 Group', color: 'var(--color-proc-plating)' },
  { id: 'N044', label: 'N044 Group', color: 'var(--color-proc-grinding)' },
  { id: 'N051', label: 'N051 Group', color: 'var(--color-proc-packing)' },
  { id: 'General', label: 'General', color: 'var(--color-text-tertiary)' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fullMONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


export default function CustomerDashboard() {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [custData, setCustData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New State mappings
  const [mode, setMode] = useState<'yearly' | 'monthly'>('yearly');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(MONTHS.map((_, i) => String(i + 1)));
  const [selGroups, setSelGroups] = useState<string[]>(ALL_GROUPS.map(g => g.id));
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [searchCustId, setSearchCustId] = useState('');

  // Auto-hide labels when > 3 groups selected
  useEffect(() => {
    setShowLabels(selGroups.length <= 3);
  }, [selGroups.length]);

  // Close dropdown on outside click
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
      const custId = (cust.id || '').toUpperCase();
      let gId = 'General';
      if (custId.startsWith('N008')) gId = 'N008';
      else if (custId.startsWith('MLT')) gId = 'MLT';
      else if (custId.startsWith('N083')) gId = 'N083';
      else if (custId.startsWith('N044')) gId = 'N044';
      else if (custId.startsWith('N051')) gId = 'N051';

      availableYears.forEach(y => {
        MONTHS.forEach((m, mi) => {
          const mStr = (mi + 1).toString();
          const val = cust.monthly?.[y]?.[mStr] || 0;
          raw[y][m][gId] += val;
        });
      });
    });
    return raw;
  }, [custData, availableYears]);

  const activeYears = [...selectedYears].sort();

  // Build chartData based on mode
  const chartData = useMemo(() => {
    if (mode === "yearly") {
      return activeYears.map(y => {
        const r: any = { label: String(y) };
        sortedSel.forEach(g => { r[g] = selectedMonths.reduce((s, mStr) => s + (RAW[y]?.[MONTHS[parseInt(mStr) - 1]]?.[g] || 0), 0); });
        return r;
      });
    } else {
      const sortedMonths = [...selectedMonths].sort((a, b) => parseInt(a) - parseInt(b));
      return sortedMonths.map(mStr => {
        const m = MONTHS[parseInt(mStr) - 1];
        const r: any = { label: m };
        sortedSel.forEach(g => {
          r[g] = activeYears.reduce((sum, y) => sum + (RAW[y]?.[m]?.[g] || 0), 0);
        });
        return r;
      });
    }
  }, [mode, activeYears, selectedMonths, sortedSel, RAW]);

  // Compute CSS chart scales dynamically
  const { maxVal, gridTicks } = useMemo(() => {
    let rawMax = 0;
    chartData.forEach(row => {
      sortedSel.forEach(g => {
        if ((row[g] || 0) > rawMax) rawMax = row[g] || 0;
      });
    });
    rawMax = Math.max(rawMax, 1000);

    const targets = [
      1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500,
      1000, 2000, 2500, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
      100000, 200000, 300000, 400000, 500000, 1000000, 2000000, 5000000, 10000000
    ];
    const roughStep = rawMax / 5;
    const niceStep = targets.find(t => t >= roughStep) || 10000000;
    const computedMax = Math.ceil(rawMax / niceStep) * niceStep;

    const ticks: number[] = [];
    const numSteps = Math.round(computedMax / niceStep);
    for (let i = 0; i <= numSteps + 1; i++) {
      ticks.push(i * niceStep);
    }
    return { maxVal: (numSteps + 1) * niceStep, gridTicks: ticks };
  }, [chartData, sortedSel]);

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

      const totalAllSelected = activeYears.reduce((sum, y) => sum + yearTotals[y], 0);

      let pct = null;
      if (maxYear && minYear && maxYear !== minYear) {
        const curr = yearTotals[maxYear] || 0;
        const prev = yearTotals[minYear] || 0;
        if (prev > 0) {
          pct = ((curr - prev) / prev) * 100;
        }
      }

      return { ...g, yearTotals, totalAllSelected, pct, maxYear, minYear };
    });
  }, [sortedSel, activeYears, selectedMonths, RAW]);

  // Grand Total computation
  const { grandTotal, grandYoy, grandPct } = useMemo(() => {
    let gTotal = 0;
    
    const grandYearTotals: Record<string, number> = {};
    activeYears.forEach(y => {
      grandYearTotals[y] = 0;
    });

    summaries.forEach(g => {
      gTotal += g.totalAllSelected;
      activeYears.forEach(y => {
        grandYearTotals[y] += (g.yearTotals[y] || 0);
      });
    });

    const gYoy: { currYr: string, prevYr: string, pct: number | null }[] = [];
    const reversedYears = [...activeYears].reverse();
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

    let gPct = null; // Used for the Total text color
    if (reversedYears.length > 1) {
       const currVal = grandYearTotals[reversedYears[0]];
       const prevVal = grandYearTotals[reversedYears[reversedYears.length - 1]];
       if (prevVal > 0) {
         gPct = ((currVal - prevVal) / prevVal) * 100;
       }
    }

    return { grandTotal: gTotal, grandYoy: gYoy, grandPct: gPct };
  }, [summaries, activeYears]);

  // Filter individual customers for the Details Table
  const tableData = useMemo(() => {
    return custData.filter(cust => {
      const custId = (cust.id || '').toUpperCase();
      let gId = 'General';
      if (custId.startsWith('N008')) gId = 'N008';
      else if (custId.startsWith('MLT')) gId = 'MLT';
      else if (custId.startsWith('N083')) gId = 'N083';
      else if (custId.startsWith('N044')) gId = 'N044';
      else if (custId.startsWith('N051')) gId = 'N051';
      const groupMatch = selGroups.includes(gId);
      const searchMatch = searchCustId === '' || custId.includes(searchCustId.toUpperCase());
      return groupMatch && searchMatch;
    });
  }, [custData, selGroups, searchCustId]);

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
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <>
        <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'SALES SUMMARY BY CUSTOMER' }]} />
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
      <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'SALES SUMMARY BY CUSTOMER' }]} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="p-6 flex flex-col gap-6 w-full">

          {/* Header & View Mode */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Sales Analytics <span style={{ color: 'var(--color-proc-polishing)' }}>By Customer Group</span>
              </h1>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Client Account Growth Analysis
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
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
                      color: mode === item.id ? '#fff' : 'var(--color-text-tertiary)',
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
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
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
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
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
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Select Months</span>
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
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
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
              const pos = g.pct !== null && g.pct >= 0;
              const titleColor = g.pct === null ? 'var(--color-text-primary)' : pos ? 'var(--color-success-500)' : 'var(--color-danger-500)';
              return (
                <div key={g.id} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 16, padding: '20px', borderTop: `4px solid ${g.color}`, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)', transition: 'all 0.3s ease', animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${idx * 0.05}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>{g.label}</span>
                  </div>

                  {/* Individual Year Totals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    {[...activeYears].reverse().map(yr => (
                      <div key={yr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, borderBottom: '1px solid var(--color-border-light)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>{yr}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          ${g.yearTotals[yr].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Overall Total across selected years */}
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: titleColor, letterSpacing: '-0.5px', marginBottom: 6, textAlign: 'right', transition: 'color 0.3s' }}>
                    ${g.totalAllSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  {/* Percentage Comparisons */}
                  {activeYears.length > 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, alignItems: 'flex-end' }}>
                      {[...activeYears].reverse().map((yr, i, arr) => {
                        const prevYr = arr[i + 1];
                        if (!prevYr) return null;
                        
                        const currVal = g.yearTotals[yr] || 0;
                        const prevVal = g.yearTotals[prevYr] || 0;
                        let yoyPct = null;
                        if (prevVal > 0) {
                          yoyPct = ((currVal - prevVal) / prevVal) * 100;
                        }
                        
                        return (
                          <div key={`${yr}-vs-${prevYr}`} style={{ fontSize: '0.75rem', fontWeight: 800, color: yoyPct === null ? 'var(--color-text-tertiary)' : yoyPct >= 0 ? 'var(--color-success-500)' : 'var(--color-danger-500)' }}>
                            {yoyPct === null ? `— No prior data` : `${yoyPct >= 0 ? '↑ +' : '↓ '}${yoyPct.toFixed(2)}%`}
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-quaternary)' }}> ({yr} vs {prevYr})</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 8 }}>
                      — Add another year to compare
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Main Chart Section */}
          <div style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 32, border: '1px solid var(--color-border-light)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.04)', animation: 'fadeInUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {mode === 'yearly' ? <Building2 size={18} /> : <CalendarDays size={18} />}
                  {mode === 'yearly' ? `Annual Sales Comparison` : `Monthly Sales Breakdown`}
                </h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                  Unit: USD · Grouped Layout {showLabels ? '· Value Labels Displayed' : '· Value Labels Hidden (select ≤ 3 groups)'}
                </p>

                {/* Chart Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  {sortedSel.map(gId => {
                    const g = ALL_GROUPS.find(x => x.id === gId)!;
                    return (
                      <div key={gId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: g.color }} />
                        {g.label}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                  Grand Total (Selected Range)
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: grandPct === null ? 'var(--color-text-primary)' : grandPct >= 0 ? 'var(--color-success-500)' : 'var(--color-danger-500)', transition: 'color 0.3s' }}>
                  ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {grandYoy.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, alignItems: 'flex-end' }}>
                    {grandYoy.map(({ currYr, prevYr, pct }) => (
                      <div key={`${currYr}-${prevYr}`} style={{ fontSize: '0.8rem', fontWeight: 800, color: pct === null ? 'var(--color-text-tertiary)' : pct >= 0 ? 'var(--color-success-500)' : 'var(--color-danger-500)' }}>
                        {pct === null ? `— No prior data` : `${pct >= 0 ? '↑ +' : '↓ '}${pct.toFixed(2)}%`}
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-quaternary)' }}> ({currYr} vs {prevYr})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pure CSS Dynamic Chart */}
            <div style={{ display: 'flex', height: 400 }}>
              {/* Y-Axis */}
              <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', paddingRight: 16, paddingBottom: 30, zIndex: 10 }}>
                {gridTicks.map((tick, i) => (
                  <div key={i} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-quaternary)', textAlign: 'right' }}>
                    {formatAxisValue(tick)}
                  </div>
                ))}
              </div>

              {/* Chart Body */}
              <div className="content-scrollbar" style={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
                <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingBottom: 40, minWidth: mode === 'yearly' ? 'auto' : 800 }}>

                  {/* Grid Lines */}
                  <div style={{ position: 'absolute', inset: '0 0 40px 0', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                    {gridTicks.map((_, i) => (
                      <div key={i} style={{ borderTop: '1px dashed var(--color-border-light)', width: '100%', transition: 'all 0.4s ease-out' }} />
                    ))}
                  </div>

                  {chartData.map((row) => (
                    <div key={row.label} className="group" style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 1 }}>

                      {/* GROUPED BARS */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: '100%' }}>
                        {sortedSel.map(gId => {
                          const g = ALL_GROUPS.find(x => x.id === gId)!;
                          const val = row[gId] || 0;
                          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                          return (
                            <div key={gId} style={{
                              flex: 1, maxWidth: 40, height: `${pct}%`, background: g.color,
                              borderRadius: '6px 6px 0 0', position: 'relative',
                              transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              transformOrigin: 'bottom'
                            }}>
                              {showLabels && val > 0 && (
                                <div style={{
                                  position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                                  fontSize: '0.65rem', fontWeight: 800, color: g.color, pointerEvents: 'none'
                                }}>
                                  {formatAxisValue(val).replace('$', '')}
                                </div>
                              )}
                              {/* Tooltip */}
                              <div className="opacity-0 hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[0.65rem] py-1 px-2 rounded pointer-events-none whitespace-nowrap transition-opacity z-10 font-bold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* X-Axis Label */}
                      <div style={{ position: 'absolute', bottom: -30, left: 0, width: '100%', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                        {row.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 24, border: '1px solid var(--color-border-light)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.03)', animation: 'fadeInUp 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={16} style={{ color: 'var(--color-proc-polishing)' }} /> Active Customers Breakdown
              </h3>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input 
                  type="text" 
                  placeholder="Search Cust ID..." 
                  value={searchCustId} 
                  onChange={e => setSearchCustId(e.target.value)} 
                  style={{ padding: '8px 12px 8px 34px', borderRadius: 10, border: '1px solid var(--color-border-light)', fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', width: 220, transition: 'all 0.2s', outline: 'none' }} 
                  className="focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>
            <div style={{ overflowX: 'auto', paddingBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '200px', minWidth: '200px', textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)', whiteSpace: 'nowrap' }}>Cust ID</th>
                    <th style={{ width: '150px', minWidth: '150px', textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)' }}>Customer Group</th>
                    {mode === 'yearly' ? activeYears.map(yr => (
                      <th key={yr} style={{ width: '150px', minWidth: '120px', textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)' }}>{yr} Total</th>
                    )) : selectedMonths.map(mStr => (
                      <th key={mStr} style={{ width: '120px', minWidth: '100px', textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)' }}>{fullMONTHS[parseInt(mStr) - 1]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.length === 0 ? (
                    <tr>
                      <td colSpan={15} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>
                        No customers found for the selected groups.
                      </td>
                    </tr>
                  ) : tableData.map((cust, idx) => {
                    const custId = (cust.id || '').toUpperCase();
                    let gId = 'General';
                    if (custId.startsWith('N008')) gId = 'N008';
                    else if (custId.startsWith('MLT')) gId = 'MLT';
                    else if (custId.startsWith('N083')) gId = 'N083';
                    else if (custId.startsWith('N044')) gId = 'N044';
                    else if (custId.startsWith('N051')) gId = 'N051';

                    const groupColor = ALL_GROUPS.find(g => g.id === gId)?.color || 'var(--color-text-tertiary)';

                    return (
                      <tr key={cust.id} style={{ borderBottom: idx === tableData.length - 1 ? 'none' : '1px solid var(--color-border-light)' }}>
                        <td style={{ padding: '16px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: groupColor }} />
                            {cust.id}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '4px', paddingLeft: 16 }}>
                            {cust.custStatus ? `Status: ${cust.custStatus}` : ''} {cust.salesName ? `· Sales: ${cust.salesName}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, color: groupColor, textTransform: 'uppercase' }}>
                          {ALL_GROUPS.find(g => g.id === gId)?.label || 'General'}
                        </td>
                        {mode === 'yearly' ? activeYears.map(yr => {
                          const val = selectedMonths.reduce((s, mStr) => s + (cust.monthly?.[yr]?.[mStr] || 0), 0);
                          return (
                            <td key={yr} style={{ padding: '16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif', color: val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-quaternary)' }}>
                              {val > 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </td>
                          );
                        }) : selectedMonths.map(mStr => {
                          const val = activeYears.reduce((sum, y) => sum + (cust.monthly?.[y]?.[mStr] || 0), 0);
                          return (
                            <td key={mStr} style={{ padding: '16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif', color: val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-quaternary)' }}>
                              {val > 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
