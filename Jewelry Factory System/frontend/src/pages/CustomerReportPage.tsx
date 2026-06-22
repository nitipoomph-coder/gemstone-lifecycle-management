import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Filter, X, Users, CheckSquare, Square, DollarSign } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { fetchCustomerSummary, fetchAvailableYears } from '../services/dashboardAPI';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';

// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


const thBase: React.CSSProperties = {
  padding: '10px 10px',
  textAlign: 'right' as const,
  fontWeight: 900,
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface-1)',
  borderRight: '1px solid var(--color-border-strong)',
  whiteSpace: 'nowrap' as const,
  fontSize: '0.72rem',
  letterSpacing: '0.02em',
  textTransform: 'uppercase' as const,
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
};

// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const metric = searchParams.get('metric') || 'amount';

  const fmt = (val: number) => {
    if (metric === 'qty') return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtCurr = fmt;

  // ── DATA STATE ──
  const [custData, setCustData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ── FILTER MODAL STATE ──
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // ── FILTER STATE ──
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [baseYear, setBaseYear] = useState<string>('');
  const [compareYear, setCompareYear] = useState<string>('none');
  const [compareYear2, setCompareYear2] = useState<string>('none');
  const [selGroups, setSelGroups] = useState<string[]>([]);
  const [selCustomers, setSelCustomers] = useState<string[]>([]); // empty means all valid customers in selGroups
  const [selMonths, setSelMonths] = useState<string[]>(MONTHS); // default all 12 months
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');


  const renderGrowthAmt = useCallback((baseVal: number, compVal: number) => {
    if (compVal === 0 && baseVal === 0) return <span style={{ color: 'var(--color-text-quaternary)' }}>-</span>;
    const diff = baseVal - compVal;
    const isUp = diff > 0;
    const isDown = diff < 0;
    const color = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
    const arrow = isUp ? '▲' : isDown ? '▼' : '';
    return <span style={{ color, fontWeight: 900, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>{arrow} {fmt(Math.abs(diff))}</span>;
  }, [fmt]);

  const renderGrowthPct = useCallback((baseVal: number, compVal: number) => {
    if (compVal === 0 && baseVal === 0) return <span style={{ color: 'var(--color-text-quaternary)' }}>-</span>;
    if (compVal === 0) return <span style={{ color: 'var(--color-success-500)', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>+100.0%</span>;
    const pct = ((baseVal - compVal) / compVal) * 100;
    const isUp = pct > 0;
    const isDown = pct < 0;
    const color = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
    const sign = isUp ? '+' : '';
    return <span style={{ color, fontWeight: 900, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>{sign}{pct.toFixed(1)}%</span>;
  }, []);

  // ── FETCH DATA ──
  useEffect(() => {
    setLoading(true);
    fetchAvailableYears()
      .then(yrs => {
        const sortedYrs = yrs.map(String).sort((a, b) => Number(a) - Number(b));
        setAvailableYears(sortedYrs);
        if (sortedYrs.length > 0) {
          const latest = sortedYrs[sortedYrs.length - 1];
          const prev = sortedYrs.length > 1 ? sortedYrs[sortedYrs.length - 2] : 'none';
          setBaseYear(latest);
          setCompareYear(prev);
        }
        return fetchCustomerSummary(sortedYrs);
      })
      .then(cData => {
        setCustData(cData);
      })
      .catch(err => console.error("Error fetching report data:", err))
      .finally(() => setLoading(false));
  }, []);

  // ── COMPUTE CUSTOMER LIST ──
  // All customers that belong to selected groups
  const groupCustomers = useMemo(() => {
    return custData
      .filter(c => selGroups.includes(getCustomerGroupId(c.id || '')))
      .map(c => c.id as string)
      .sort();
  }, [custData, selGroups]);

  // If selCustomers is empty, we treat it as "All group customers selected"
  const activeCustomers = selCustomers.length > 0 ? selCustomers : groupCustomers;

  // Handle group toggle in modal
  const toggleGroup = (gId: string) => {
    setSelGroups(prev => prev.includes(gId) ? prev.filter(g => g !== gId) : [...prev, gId]);
    setSelCustomers([]); // reset customer selection when groups change
  };

  // Handle customer toggle in modal
  const toggleCustomer = (cId: string) => {
    setSelCustomers(prev => {
      // If currently "All", populate with all EXCEPT the unselected one
      if (prev.length === 0) {
        return groupCustomers.filter(id => id !== cId);
      }
      const isSelected = prev.includes(cId);
      const newSel = isSelected ? prev.filter(id => id !== cId) : [...prev, cId];
      // If newSel has all customers, reset to empty (which means All)
      if (newSel.length === groupCustomers.length) return [];
      return newSel;
    });
  };

  const toggleAllCustomers = () => {
    if (selCustomers.length === 0) {
      setSelCustomers(['__NONE__']);
    } else {
      setSelCustomers([]);
    }
  };

  const toggleMonth = (m: string) => {
    setSelMonths(prev => {
      if (prev.includes(m)) return prev.filter(x => x !== m);
      return [...prev, m];
    });
  };



  // ── DATE UTILS ──
  const currentDate = useMemo(() => new Date(), []);
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthIdx = currentDate.getMonth();

  const displayMonths = useMemo(() => {
    return MONTHS.filter(m => selMonths.includes(m));
  }, [selMonths]);

  // ── ACTIVE YEARS (ordered) ──
  const activeYears = useMemo(() => {
    const yrs = [baseYear];
    if (compareYear !== 'none') yrs.push(compareYear);
    if (compareYear2 !== 'none') yrs.push(compareYear2);
    return yrs.filter(Boolean);
  }, [baseYear, compareYear, compareYear2]);

  // ── GROWTH COMPARISON STATE ──
  const [growthComparisons, setGrowthComparisons] = useState<{a: string, b: string}[]>([]);
  const displayYears = activeYears;

  useEffect(() => {
    if (activeYears.length > 0 && growthComparisons.length === 0) {
      if (activeYears.length > 1) {
        setGrowthComparisons([{ a: activeYears[0], b: activeYears[1] }]);
      } else {
        setGrowthComparisons([{ a: activeYears[0], b: activeYears[0] }]);
      }
    }
  }, [activeYears, growthComparisons]);

  // ── TABLE DATA COMPUTATION ──
  const tableData = useMemo(() => {
    if (!baseYear || activeYears.length === 0) return { rows: [], colTotals: {} as Record<string, number>, activeYears: [] as string[] };

    let rows: any[] = [];

    custData.forEach(cust => {
      if (!activeCustomers.includes(cust.id)) return;
      if (activeCustomers.includes('__NONE__')) return;

      const row: any = {
        id: cust.id,
        label: cust.id,
        topItem: cust.topItem,
        topItemQty: cust.topItemQty
      };
      activeYears.forEach(yr => {
        let yrTotal = 0;
        displayMonths.forEach(m => {
          const idx = MONTHS.indexOf(m);
          const mStr = String(idx + 1);
          const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;
          const val = source?.[yr]?.[mStr] || 0;
          row[`${yr}_${m}`] = val;
          yrTotal += val;
        });
        row[`${yr}_total`] = yrTotal;
      });

      rows.push(row);
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r: any) => r.label.toLowerCase().includes(q));
    }

    // Sort by first year total
    rows.sort((a, b) => {
      const valA = a[`${activeYears[0]}_total`] || 0;
      const valB = b[`${activeYears[0]}_total`] || 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    // Compute column totals
    const colTotals: Record<string, number> = {};
    activeYears.forEach(yr => {
      colTotals[`${yr}_total`] = 0;
      displayMonths.forEach(m => { colTotals[`${yr}_${m}`] = 0; });
    });
    rows.forEach(r => {
      activeYears.forEach(yr => {
        colTotals[`${yr}_total`] += r[`${yr}_total`] || 0;
        displayMonths.forEach(m => {
          colTotals[`${yr}_${m}`] += r[`${yr}_${m}`] || 0;
        });
      });
    });

    return { rows, colTotals, activeYears };
  }, [custData, baseYear, activeYears, activeCustomers, searchQuery, displayMonths, metric, sortOrder]);

  // ── KPI SUMMARY ──
  const kpi = useMemo(() => {
    const bTotal = tableData.colTotals[`${activeYears[0]}_total`] || 0;
    const cTotal = activeYears.length > 1 ? (tableData.colTotals[`${activeYears[1]}_total`] || 0) : 0;
    const pct = cTotal > 0 ? ((bTotal - cTotal) / cTotal) * 100 : null;
    return { bTotal, cTotal, pct, count: tableData.rows.length };
  }, [tableData, activeYears]);

  // Year colors for visual grouping
  const yearColors = [
    { bg: 'var(--color-surface-1)', text: 'var(--color-text-primary)', totalBg: 'var(--color-surface-2)', totalText: 'var(--color-brand-600)' },
    { bg: 'color-mix(in srgb, var(--color-accent-500) 10%, var(--color-surface-1))', text: 'var(--color-text-primary)', totalBg: 'color-mix(in srgb, var(--color-accent-500) 15%, var(--color-surface-2))', totalText: 'var(--color-accent-500)' },
    { bg: 'color-mix(in srgb, var(--color-warning-500) 10%, var(--color-surface-1))', text: 'var(--color-text-primary)', totalBg: 'color-mix(in srgb, var(--color-warning-500) 15%, var(--color-surface-2))', totalText: 'var(--color-warning-500)' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: metric === 'qty' ? 'Quantity Analytics' : 'Sales Analytics', path: metric === 'qty' ? '/dashboard/qty' : '/dashboard/customer' },
        { label: metric === 'qty' ? 'Full Quantity Matrix' : 'Full Report Matrix' }
      ]} />

      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100%', paddingBottom: 40 }}>

          {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
          <div style={{
            padding: '16px 28px',
            background: 'var(--color-surface-0)',
            borderBottom: '1px solid var(--color-border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => navigate(metric === 'qty' ? '/dashboard/qty' : '/dashboard/customer')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700,
                  color: 'var(--color-text-tertiary)', background: 'transparent',
                  border: '1px solid var(--color-border-light)', cursor: 'pointer', transition: 'all 0.15s'
                }}
                className="hover:text-brand-500 hover:border-brand-300 active:scale-95"
              >
                <ArrowLeft size={13} /> Back
              </button>
              <div style={{ width: 1, height: 20, background: 'var(--color-border-light)' }} />
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 4, borderRadius: 8, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                <button
                  onClick={() => setViewMode('year')}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: viewMode === 'year' ? 'var(--color-surface-0)' : 'transparent',
                    color: viewMode === 'year' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    boxShadow: viewMode === 'year' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  className="active:scale-95"
                >
                  Group by Year
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: viewMode === 'month' ? 'var(--color-surface-0)' : 'transparent',
                    color: viewMode === 'month' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  className="active:scale-95"
                >
                  Group by Month
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  type="text" placeholder="Search Customer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                    borderRadius: 7, padding: '6px 12px 6px 30px', fontSize: '0.72rem', color: 'var(--color-text-primary)', outline: 'none', width: 180, transition: 'all 0.15s'
                  }}
                />
              </div>
              <button
                onClick={() => setIsFilterOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 800,
                  background: 'var(--color-brand-500)', color: 'var(--color-surface-0)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--color-brand-500) 40%, transparent)'
                }}
                className="hover:brightness-110 active:scale-95"
              >
                <Filter size={13} />
                Filters
              </button>
            </div>
          </div>

          {/* ── KPI STRIP ─────────────────────────────────────────────────────── */}
          {!loading && (
            <div style={{ padding: '16px 28px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {displayYears.map((yr, yIdx) => (
                <div key={yr} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 10, padding: '12px 18px', flex: '1 1 min-content', minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                    <DollarSign size={14} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Year {yr}</span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: yIdx === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                    {fmtCurr(tableData.colTotals[`${yr}_total`] || 0)}
                  </div>
                </div>
              ))}

              <div style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 10, padding: '12px 18px', flex: '1 1 min-content', minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                  <Users size={14} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customers</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                  {kpi.count}
                </div>
              </div>
            </div>
          )}

          {/* ── TABLE AREA ────────────────────────────────────────────────────── */}
          <div className="content-scrollbar" style={{ flex: 1, padding: '0 28px 32px', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: '100%', marginTop: 24 }}>
                {/* Skeleton KPI Strip */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  {[1, 2, 3].map(i => (
                    <div key={`kpi_skel_${i}`} className="animate-pulse" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-light)', borderRadius: 10, padding: '12px 18px', flex: '1 1 min-content', minWidth: 200, height: 76 }} />
                  ))}
                </div>
                {/* Skeleton Table */}
                <div className="animate-pulse" style={{ border: '1px solid var(--color-border-strong)', borderRadius: 12, background: 'var(--color-surface-0)', width: '100%', overflow: 'hidden' }}>
                  <div style={{ height: 48, borderBottom: '1px solid var(--color-border-strong)', background: 'var(--color-surface-2)', display: 'flex' }}>
                    <div style={{ width: 160, height: '100%', borderRight: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)' }}></div>
                    <div style={{ flex: 1 }}></div>
                  </div>
                  {[...Array(8)].map((_, i) => (
                    <div key={`row_skel_${i}`} style={{ height: 40, borderBottom: '1px solid var(--color-border-light)', display: 'flex' }}>
                      <div style={{ width: 160, height: '100%', borderRight: '1px solid var(--color-border-strong)' }}>
                        <div style={{ height: 16, width: '60%', background: 'var(--color-surface-2)', margin: '12px 16px', borderRadius: 4 }}></div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 20 }}>
                        <div style={{ height: 16, width: '8%', background: 'var(--color-surface-2)', borderRadius: 4 }}></div>
                        <div style={{ height: 16, width: '6%', background: 'var(--color-surface-2)', borderRadius: 4 }}></div>
                        <div style={{ height: 16, width: '10%', background: 'var(--color-surface-2)', borderRadius: 4 }}></div>
                        <div style={{ height: 16, width: '7%', background: 'var(--color-surface-2)', borderRadius: 4 }}></div>
                        <div style={{ height: 16, width: '9%', background: 'var(--color-surface-2)', borderRadius: 4 }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            ) : !baseYear ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', gap: 8 }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 700 }}>No base year selected. Please apply filters.</p>
              </div>
            ) : (
              <div className="content-scrollbar" style={{ border: '1px solid var(--color-border-strong)', borderRadius: 12, background: 'var(--color-surface-0)', width: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {viewMode === 'year' ? (
                    <>
                      <thead>
                        {/* Year group header */}
                        <tr>
                          <th rowSpan={2} style={{ ...thBase, minWidth: 160, textAlign: 'left', padding: '12px 16px', zIndex: 12, left: 0, position: 'sticky', top: 0, borderBottom: '1px solid var(--color-border-strong)', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                              <span>Customer ID</span>
                              <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                                style={{
                                  alignSelf: 'flex-start',
                                  marginTop: 8,
                                  fontSize: '0.65rem',
                                  padding: '2px 4px',
                                  borderRadius: 4,
                                  background: 'var(--color-surface-2)',
                                  border: '1px solid var(--color-border-strong)',
                                  color: 'var(--color-text-secondary)',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="desc">Highest to Lowest</option>
                                <option value="asc">Lowest to Highest</option>
                              </select>
                            </div>
                          </th>
                          {displayYears.map((yr, yIdx) => {
                            const yc = yearColors[yIdx] || yearColors[0];
                            return (
                              <React.Fragment key={yr}>
                                <th colSpan={displayMonths.length + 1} style={{
                                  ...thBase,
                                  background: yc.bg,
                                  color: yc.totalText,
                                  textAlign: 'center',
                                  fontSize: '0.8rem',
                                  fontWeight: 900,
                                  letterSpacing: '0.05em',
                                  position: 'sticky',
                                  top: 0,
                                  zIndex: 10,
                                  borderBottom: 'none',
                                  borderRight: '2px solid var(--color-border-strong)'
                                }}>
                                  {yr}
                                </th>

                              </React.Fragment>
                            );
                          })}
                          {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                            <th key={`growth_hdr_top_${idx}`} colSpan={2} style={{
                              ...thBase,
                              background: 'var(--color-surface-2)',
                              color: 'var(--color-brand-600)',
                              textAlign: 'center',
                              fontSize: '0.8rem',
                              fontWeight: 900,
                              letterSpacing: '0.05em',
                              position: 'sticky',
                              top: 0,
                              zIndex: 10,
                              borderBottom: 'none',
                              borderRight: idx === growthComparisons.length - 1 ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span>Growth</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-600)', fontWeight: 700, opacity: 0.8 }}>({comp.a} vs {comp.b})</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                        {/* Month sub-header */}
                        <tr>
                          {displayYears.map((yr, yIdx) => {
                            const yc = yearColors[yIdx] || yearColors[0];
                            return displayMonths.map((m) => {
                              const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                              return (
                                <th key={`${yr}_${m}`} style={{
                                  ...thBase,
                                  minWidth: 100,
                                  background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-1))' : yc.bg,
                                  color: isCurrent ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                                  position: 'sticky',
                                  top: 34,
                                  zIndex: 10,
                                  borderBottom: '1px solid var(--color-border-strong)',
                                  borderRight: '1px solid var(--color-border-light)',
                                  fontSize: '0.68rem'
                                }}>
                                  {m}
                                </th>
                              );
                            }).concat(
                              <th key={`${yr}_total`} style={{
                                ...thBase,
                                minWidth: 120,
                                background: yc.totalBg,
                                color: yc.totalText,
                                position: 'sticky',
                                top: 34,
                                zIndex: 10,
                                borderBottom: '1px solid var(--color-border-strong)',
                                borderRight: '2px solid var(--color-border-strong)',
                                fontSize: '0.7rem'
                              }}>
                                Total
                              </th>
                            );
                          })}
                          {displayYears.length > 1 && growthComparisons.map((_, idx) => (
                            <React.Fragment key={`growth_hdr_sub_${idx}`}>
                              <th style={{
                                ...thBase,
                                minWidth: 90,
                                background: 'var(--color-surface-2)',
                                color: 'var(--color-text-primary)',
                                position: 'sticky',
                                top: 34,
                                zIndex: 10,
                                borderBottom: '1px solid var(--color-border-strong)',
                                borderRight: '1px solid var(--color-border-light)',
                                fontSize: '0.7rem'
                              }}>
                                Growth
                              </th>
                              <th style={{
                                ...thBase,
                                minWidth: 80,
                                background: 'var(--color-surface-2)',
                                color: 'var(--color-text-primary)',
                                position: 'sticky',
                                top: 34,
                                zIndex: 10,
                                borderBottom: '1px solid var(--color-border-strong)',
                                borderRight: idx === growthComparisons.length - 1 ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)',
                                fontSize: '0.7rem'
                              }}>
                                %
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.length === 0 ? (
                          <tr><td colSpan={1 + displayYears.length * (displayMonths.length + 1) + (displayYears.length > 1 ? growthComparisons.length * 2 : 0)} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 700 }}>No customers match the current filter.</td></tr>
                        ) : tableData.rows.map((row: any, idx: number) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border-light)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }} className="hover:bg-brand-50">
                            <td style={{ padding: '10px 16px', borderRight: '1px solid var(--color-border-light)', fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', fontSize: '0.78rem', position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)', zIndex: 2 }}>
                              {row.label}
                            </td>
                            {displayYears.map((yr, yIdx) => {
                              const yc = yearColors[yIdx] || yearColors[0];
                              return displayMonths.map(m => {
                                const val = row[`${yr}_${m}`] || 0;
                                const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                                return (
                                  <td key={`${yr}_${m}`} style={{ padding: '8px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-light)', whiteSpace: 'nowrap', background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)' : 'inherit' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                                      {fmt(val)}
                                    </div>
                                  </td>
                                );
                              }).concat(
                                <td key={`${yr}_total`} style={{ padding: '8px 12px', textAlign: 'right', background: 'inherit', whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border-strong)' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: yc.totalText }}>
                                    {fmt(row[`${yr}_total`] || 0)}
                                  </span>
                                </td>
                              );
                            })}
                            {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                              <React.Fragment key={`growth_row_${idx}`}>
                                <td style={{ padding: '8px 10px', textAlign: 'right', background: 'inherit', borderRight: '1px solid var(--color-border-light)' }}>
                                  {renderGrowthAmt(row[`${comp.a}_total`] || 0, row[`${comp.b}_total`] || 0)}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', background: 'inherit', borderRight: idx === growthComparisons.length - 1 ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)' }}>
                                  {renderGrowthPct(row[`${comp.a}_total`] || 0, row[`${comp.b}_total`] || 0)}
                                </td>
                              </React.Fragment>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      {tableData.rows.length > 0 && (
                        <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                          <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border-strong)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 900, color: 'var(--color-text-primary)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.78rem', position: 'sticky', left: 0, background: 'var(--color-surface-2)', zIndex: 12 }}>
                              GRAND TOTAL
                            </td>
                            {displayYears.map((yr, yIdx) => {
                              const yc = yearColors[yIdx] || yearColors[0];
                              return displayMonths.map(m => {
                                const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                                return (
                                  <td key={`${yr}_${m}`} style={{ padding: '10px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-strong)', whiteSpace: 'nowrap', background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-2))' : 'inherit' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                                      {fmt(tableData.colTotals[`${yr}_${m}`] || 0)}
                                    </div>
                                  </td>
                                );
                              }).concat(
                                <td key={`${yr}_total`} style={{ padding: '10px 12px', textAlign: 'right', background: 'color-mix(in srgb, var(--color-brand-500) 15%, var(--color-surface-2))', whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border-strong)' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: yc.totalText }}>
                                    {fmt(tableData.colTotals[`${yr}_total`] || 0)}
                                  </span>
                                </td>
                              );
                            })}
                            {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                              <React.Fragment key={`growth_foot_${idx}`}>
                                <td style={{ padding: '10px 12px', textAlign: 'right', background: 'color-mix(in srgb, var(--color-brand-500) 15%, var(--color-surface-2))', whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border-light)' }}>
                                  {renderGrowthAmt(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', background: 'color-mix(in srgb, var(--color-brand-500) 15%, var(--color-surface-2))', whiteSpace: 'nowrap', borderRight: idx === growthComparisons.length - 1 ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)' }}>
                                  {renderGrowthPct(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0)}
                                </td>
                              </React.Fragment>
                            ))}
                          </tr>
                        </tfoot>
                      )}
                    </>
                  ) : (
                    <>
                      <thead>
                        {/* Month group header */}
                        <tr>
                          <th rowSpan={2} style={{ ...thBase, minWidth: 160, textAlign: 'left', padding: '12px 16px', zIndex: 12, left: 0, position: 'sticky', top: 0, borderBottom: '1px solid var(--color-border-strong)', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                              <span>Customer ID</span>
                              <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                                style={{
                                  alignSelf: 'flex-start',
                                  marginTop: 8,
                                  fontSize: '0.65rem',
                                  padding: '2px 4px',
                                  borderRadius: 4,
                                  background: 'var(--color-surface-2)',
                                  border: '1px solid var(--color-border-strong)',
                                  color: 'var(--color-text-secondary)',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="desc">Highest to Lowest</option>
                                <option value="asc">Lowest to Highest</option>
                              </select>
                            </div>
                          </th>
                          {displayMonths.map((m) => {
                            return (
                              <th key={m} colSpan={displayYears.length + (displayYears.length > 1 ? growthComparisons.length * 2 : 0)} style={{
                                ...thBase,
                                background: 'var(--color-surface-1)',
                                color: 'var(--color-text-primary)',
                                textAlign: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 900,
                                letterSpacing: '0.05em',
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                                borderBottom: 'none',
                                borderRight: '2px solid var(--color-border-strong)'
                              }}>
                                {m}
                              </th>
                            );
                          })}
                          <th colSpan={displayYears.length + (displayYears.length > 1 ? growthComparisons.length * 2 : 0)} style={{
                            ...thBase,
                            background: 'var(--color-surface-2)',
                            color: 'var(--color-brand-600)',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 900,
                            letterSpacing: '0.05em',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                            borderBottom: 'none',
                            borderRight: 'none'
                          }}>
                            {metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales'}
                          </th>
                        </tr>
                        {/* Year sub-header */}
                        <tr>
                          {displayMonths.map((m) => {
                            return (
                              <React.Fragment key={m}>
                                {displayYears.map((yr, yIdx) => {
                                  const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                                  const yc = yearColors[yIdx] || yearColors[0];
                                  return (
                                    <th key={`${m}_${yr}`} style={{
                                      ...thBase,
                                      minWidth: 100,
                                      background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-1))' : yc.bg,
                                      color: isCurrent ? 'var(--color-brand-600)' : yc.text,
                                      position: 'sticky',
                                      top: 34,
                                      zIndex: 10,
                                      borderBottom: '1px solid var(--color-border-strong)',
                                      borderRight: yIdx === displayYears.length - 1 && !(displayYears.length > 1) ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)',
                                      fontSize: '0.68rem'
                                    }}>
                                      {yr}
                                    </th>
                                  );
                                })}
                                {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                                  <React.Fragment key={`growth_m_hdr_${idx}`}>
                                    <th style={{ ...thBase, minWidth: 100, background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-light)', fontSize: '0.65rem' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                        <span>Growth</span>
                                        <span style={{ fontSize: '0.55rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>({comp.a} vs {comp.b})</span>
                                      </div>
                                    </th>
                                    <th style={{ ...thBase, minWidth: 70, background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: idx === growthComparisons.length - 1 ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)', fontSize: '0.65rem' }}>
                                      %
                                    </th>
                                  </React.Fragment>
                                ))}
                              </React.Fragment>
                            );
                          })}
                          {displayYears.map((yr, yIdx) => {
                            const yc = yearColors[yIdx] || yearColors[0];
                            return (
                              <React.Fragment key={`total_${yr}`}>
                                <th style={{
                                  ...thBase,
                                  minWidth: 120,
                                  background: yc.totalBg,
                                  color: yc.totalText,
                                  position: 'sticky',
                                  top: 34,
                                  zIndex: 10,
                                  borderBottom: '1px solid var(--color-border-strong)',
                                  borderRight: '2px solid var(--color-border-strong)',
                                  fontSize: '0.7rem'
                                }}>
                                  {yr} Total
                                </th>
                              </React.Fragment>
                            );
                          })}
                          {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                            <React.Fragment key={`growth_m_tot_hdr_${idx}`}>
                              <th style={{ ...thBase, minWidth: 100, background: 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-2))', color: 'var(--color-brand-600)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-light)', fontSize: '0.65rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                  <span>Growth</span>
                                  <span style={{ fontSize: '0.55rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>({comp.a} vs {comp.b})</span>
                                </div>
                              </th>
                              <th style={{ ...thBase, minWidth: 80, background: 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-2))', color: 'var(--color-brand-600)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: idx === growthComparisons.length - 1 ? 'none' : '1px solid var(--color-border-strong)', fontSize: '0.65rem' }}>
                                %
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.length === 0 ? (
                          <tr><td colSpan={1 + (displayMonths.length + 1) * (displayYears.length + (displayYears.length > 1 ? growthComparisons.length * 2 : 0))} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 700 }}>No customers match the current filter.</td></tr>
                        ) : tableData.rows.map((row: any, idx: number) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border-light)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }} className="hover:bg-brand-50">
                            <td style={{ padding: '10px 16px', borderRight: '1px solid var(--color-border-light)', fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', fontSize: '0.78rem', position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)', zIndex: 2 }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{row.label}</span>
                                {metric === 'qty' && row.topItem && (
                                  <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-500)', marginTop: 2, fontWeight: 700, letterSpacing: '0.02em' }}>
                                    Top: {row.topItem} ({fmt(row.topItemQty)} pcs)
                                  </span>
                                )}
                              </div>
                            </td>
                            {displayMonths.map((m) => {
                              return (
                                <React.Fragment key={m}>
                                  {displayYears.map((yr, yIdx) => {
                                    const val = row[`${yr}_${m}`] || 0;
                                    const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                                    return (
                                      <td key={`${m}_${yr}`} style={{ padding: '8px 10px', textAlign: 'right', borderRight: yIdx === displayYears.length - 1 && !(displayYears.length > 1) ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)', whiteSpace: 'nowrap', background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)' : 'inherit' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                                          {fmt(val)}
                                        </div>
                                      </td>
                                    );
                                  })}
                                  {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                                    <React.Fragment key={`growth_m_row_${m}_${idx}`}>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', background: 'inherit', borderRight: '1px solid var(--color-border-light)' }}>
                                        {renderGrowthAmt(row[`${comp.a}_${m}`] || 0, row[`${comp.b}_${m}`] || 0)}
                                      </td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', background: 'inherit', borderRight: idx === growthComparisons.length - 1 ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)' }}>
                                        {renderGrowthPct(row[`${comp.a}_${m}`] || 0, row[`${comp.b}_${m}`] || 0)}
                                      </td>
                                    </React.Fragment>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                            {displayYears.map((yr, yIdx) => {
                              const yc = yearColors[yIdx] || yearColors[0];
                              return (
                                <React.Fragment key={`total_${yr}`}>
                                  <td style={{ padding: '8px 12px', textAlign: 'right', background: 'inherit', whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border-strong)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: yc.totalText }}>
                                      {fmt(row[`${yr}_total`] || 0)}
                                    </span>
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                              <React.Fragment key={`growth_m_row_tot_${idx}`}>
                                <td style={{ padding: '8px 10px', textAlign: 'right', background: 'inherit', borderRight: '1px solid var(--color-border-light)' }}>
                                  {renderGrowthAmt(row[`${comp.a}_total`] || 0, row[`${comp.b}_total`] || 0)}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', background: 'inherit', borderRight: idx === growthComparisons.length - 1 ? 'none' : '1px solid var(--color-border-strong)' }}>
                                  {renderGrowthPct(row[`${comp.a}_total`] || 0, row[`${comp.b}_total`] || 0)}
                                </td>
                              </React.Fragment>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      {tableData.rows.length > 0 && (
                        <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                          <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border-strong)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 900, color: 'var(--color-text-primary)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.78rem', position: 'sticky', left: 0, background: 'var(--color-surface-2)', zIndex: 12 }}>
                              GRAND TOTAL
                            </td>
                            {displayMonths.map((m) => {
                              return (
                                <React.Fragment key={m}>
                                  {displayYears.map((yr, yIdx) => {
                                    const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                                    return (
                                      <td key={`${m}_${yr}`} style={{ padding: '10px 10px', textAlign: 'right', borderRight: yIdx === displayYears.length - 1 && !(displayYears.length > 1) ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)', whiteSpace: 'nowrap', background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-2))' : 'inherit' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                                          {fmt(tableData.colTotals[`${yr}_${m}`] || 0)}
                                        </div>
                                      </td>
                                    );
                                  })}
                                  {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                                    <React.Fragment key={`growth_m_foot_${m}_${idx}`}>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', background: 'var(--color-surface-2)', borderRight: '1px solid var(--color-border-light)' }}>
                                        {renderGrowthAmt(tableData.colTotals[`${comp.a}_${m}`] || 0, tableData.colTotals[`${comp.b}_${m}`] || 0)}
                                      </td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', background: 'var(--color-surface-2)', borderRight: idx === growthComparisons.length - 1 ? '2px solid var(--color-border-strong)' : '1px solid var(--color-border-light)' }}>
                                        {renderGrowthPct(tableData.colTotals[`${comp.a}_${m}`] || 0, tableData.colTotals[`${comp.b}_${m}`] || 0)}
                                      </td>
                                    </React.Fragment>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                            {displayYears.map((yr, yIdx) => {
                              const yc = yearColors[yIdx] || yearColors[0];
                              return (
                                <React.Fragment key={`total_${yr}`}>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', background: 'color-mix(in srgb, var(--color-brand-500) 15%, var(--color-surface-2))', whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border-strong)' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: yc.totalText }}>
                                      {fmt(tableData.colTotals[`${yr}_total`] || 0)}
                                    </span>
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                              <React.Fragment key={`growth_m_foot_tot_${idx}`}>
                                <td style={{ padding: '8px 10px', textAlign: 'right', background: 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-2))', borderRight: '1px solid var(--color-border-light)' }}>
                                  {renderGrowthAmt(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0)}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', background: 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-2))', borderRight: idx === growthComparisons.length - 1 ? 'none' : '1px solid var(--color-border-strong)' }}>
                                  {renderGrowthPct(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0)}
                                </td>
                              </React.Fragment>
                            ))}
                          </tr>
                        </tfoot>
                      )}
                    </>
                  )}
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── FILTER MODAL ──────────────────────────────────────────────────── */}
      {isFilterOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--color-surface-900) 60%, transparent)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--color-surface-0)', width: '900px', maxWidth: '95%', maxHeight: '90vh', borderRadius: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px color-mix(in srgb, var(--color-surface-900) 40%, transparent)', border: '1px solid var(--color-border-strong)', animation: 'fadeInUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--color-border-light)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, margin: 0, color: 'var(--color-text-primary)' }}>Report Filters</h3>
              <button onClick={() => setIsFilterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="content-scrollbar" style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Year Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 6 }}>Base Year</label>
                  <select value={baseYear} onChange={e => setBaseYear(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 6 }}>Compare Year 1</label>
                  <select value={compareYear} onChange={e => setCompareYear(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}>
                    <option value="none">-- None --</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 6 }}>Compare Year 2</label>
                  <select value={compareYear2} onChange={e => setCompareYear2(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}>
                    <option value="none">-- None --</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Growth Comparison Selectors */}
              <div style={{ marginTop: 0 }}>                
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 6 }}>Growth Comparison Years</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {growthComparisons.map((comp, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <select 
                        value={comp.a} 
                        onChange={e => {
                          const newComps = [...growthComparisons];
                          newComps[idx].a = e.target.value;
                          setGrowthComparisons(newComps);
                        }} 
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}
                      >
                        {activeYears.map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>VS</span>
                      <select 
                        value={comp.b} 
                        onChange={e => {
                          const newComps = [...growthComparisons];
                          newComps[idx].b = e.target.value;
                          setGrowthComparisons(newComps);
                        }} 
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}
                      >
                        {activeYears.map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                      {growthComparisons.length > 1 && (
                        <button 
                          onClick={() => setGrowthComparisons(comps => comps.filter((_, i) => i !== idx))}
                          style={{ padding: '8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border-light)', borderRadius: 8, cursor: 'pointer', color: 'var(--color-danger-500)' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => setGrowthComparisons(comps => [...comps, { a: activeYears[0], b: activeYears[1] || activeYears[0] }])}
                    style={{ padding: '6px 12px', background: 'var(--color-surface-2)', border: '1px dashed var(--color-brand-300)', borderRadius: 8, cursor: 'pointer', color: 'var(--color-brand-600)', fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-start' }}
                  >
                    + Add Comparison
                  </button>
                </div>
              </div>

              {/* Month Selectors */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)' }}>Select Months ({selMonths.length})</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setSelMonths([])}
                      disabled={selMonths.length === 0}
                      style={{ background: 'none', border: 'none', color: selMonths.length === 0 ? 'var(--color-text-quaternary)' : 'var(--color-danger-500)', fontSize: '0.7rem', fontWeight: 800, cursor: selMonths.length === 0 ? 'not-allowed' : 'pointer' }}>
                      Clear All
                    </button>
                    <button
                      onClick={() => setSelMonths(MONTHS)}
                      disabled={selMonths.length === MONTHS.length}
                      style={{ background: 'none', border: 'none', color: selMonths.length === MONTHS.length ? 'var(--color-text-quaternary)' : 'var(--color-brand-500)', fontSize: '0.7rem', fontWeight: 800, cursor: selMonths.length === MONTHS.length ? 'not-allowed' : 'pointer' }}>
                      Select All
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                  {MONTHS.map(m => {
                    const on = selMonths.includes(m);
                    return (
                      <button key={m} onClick={() => toggleMonth(m)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800,
                        border: `1px solid ${on ? 'var(--color-brand-500)' : 'var(--color-border-strong)'}`,
                        background: on ? 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)' : 'var(--color-surface-1)',
                        color: on ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group Selectors */}
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 10 }}>Select Customer Groups</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ALL_GROUPS.map(g => {
                    const on = selGroups.includes(g.id);
                    return (
                      <button key={g.id} onClick={() => toggleGroup(g.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 800,
                        border: `1px solid ${on ? g.color : 'var(--color-border-strong)'}`,
                        background: on ? `color-mix(in srgb, ${g.color} 15%, transparent)` : 'var(--color-surface-1)',
                        color: on ? g.color : 'var(--color-text-tertiary)',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: on ? g.color : 'var(--color-border-strong)', flexShrink: 0 }} />
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Selectors */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)' }}>Select Customers ({selCustomers.length === 0 ? (groupCustomers.length > 0 ? 'All' : '0') : selCustomers.length} selected)</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

                    <button onClick={toggleAllCustomers} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-brand-500)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {selCustomers.length === 0 ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6,
                  maxHeight: 250, overflowY: 'auto', padding: '12px', background: 'var(--color-surface-1)', borderRadius: 8, border: '1px solid var(--color-border-light)'
                }} className="content-scrollbar">
                  {groupCustomers.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', gridColumn: '1 / -1' }}>Please select at least one Customer Group above.</div>
                  ) : groupCustomers
                    .map(cId => {
                      const on = selCustomers.length === 0 || selCustomers.includes(cId);
                      return (
                        <div key={cId} onClick={() => toggleCustomer(cId)} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px', borderRadius: 6, cursor: 'pointer',
                          background: on ? 'var(--color-surface-0)' : 'transparent'
                        }}>
                          {on ? <CheckSquare size={14} style={{ color: 'var(--color-brand-500)' }} /> : <Square size={14} style={{ color: 'var(--color-border-strong)' }} />}
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: on ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{cId}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsFilterOpen(false)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, background: 'var(--color-brand-500)', color: 'var(--color-surface-0)', border: 'none', cursor: 'pointer' }}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
