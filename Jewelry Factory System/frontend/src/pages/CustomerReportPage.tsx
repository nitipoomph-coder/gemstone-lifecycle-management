import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Users, DollarSign } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { getCustomerGroupId } from '../config/customerGroups';

import CustomerReportTable from '../components/report/CustomerReportTable';
import CustomerReportFilters from '../components/report/CustomerReportFilters';
import { useTheme } from '../contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerReportPage() {
  const { theme } = useTheme();
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
  const [isFiltering, setIsFiltering] = useState(false);

  // ── FILTER MODAL STATE ──
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // ── FILTER STATE ──
  const [viewMode, setViewMode] = useState<'ytd' | 'monthly'>('ytd');
  const [baseYear, setBaseYear] = useState<string>('');
  const [compareYear, setCompareYear] = useState<string>('none');
  const [compareYear2, setCompareYear2] = useState<string>('none');
  const [selGroups, setSelGroups] = useState<string[]>([]);
  const [selCustomers, setSelCustomers] = useState<string[]>([]);
  const [selMonths, setSelMonths] = useState<string[]>(MONTHS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [growthComparisons, setGrowthComparisons] = useState<{ a: string; b: string }[]>([]);

  // ── GROWTH HELPERS ──
  const renderGrowthAmt = useCallback((baseVal: number, compVal: number) => {
    if (compVal === 0 && baseVal === 0) return {
      bgColor: 'transparent',
      node: <div style={{ textAlign: 'right', color: 'var(--color-text-quaternary)' }}>-</div>
    };
    const diff = baseVal - compVal;
    const isUp = diff > 0;
    const isDown = diff < 0;
    const bgColor = theme === 'royal-white'
      ? (isUp ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : isDown ? 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)' : 'transparent')
      : 'transparent';
    const textColor = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
    const arrow = isUp ? '▲' : isDown ? '▼' : '';
    const isAmt = metric === 'amount';
    return {
      bgColor,
      node: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', gap: 4, fontWeight: 900, color: textColor, opacity: 0.8, fontSize: '0.85rem' }}>
            {isAmt && <span>$</span>}
            <span>{arrow}</span>
          </div>
          <span style={{ color: textColor, fontWeight: 900, fontSize: '0.9rem' }}>{fmt(Math.abs(diff)).replace('$', '')}</span>
        </div>
      )
    };
  }, [fmt, metric, theme]);

  const renderGrowthPct = useCallback((baseVal: number, compVal: number) => {
    if (compVal === 0 && baseVal === 0) return {
      bgColor: 'transparent',
      node: <div style={{ textAlign: 'right', color: 'var(--color-text-quaternary)' }}>-</div>
    };
    if (compVal === 0 && baseVal > 0) return {
      bgColor: theme === 'royal-white' ? 'var(--color-success-50)' : 'transparent',
      node: (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <span style={{ background: 'var(--color-success-500)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.05em' }}>NEW</span>
        </div>
      )
    };
    const pct = ((baseVal - compVal) / compVal) * 100;
    const isUp = pct > 0;
    const isDown = pct < 0;
    const bgColor = theme === 'royal-white'
      ? (isUp ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : isDown ? 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)' : 'transparent')
      : 'transparent';
    const textColor = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
    const sign = isUp ? '+' : '';
    return {
      bgColor,
      node: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
          <span style={{ color: textColor, fontWeight: 900, fontSize: '0.9rem' }}>{sign}{pct.toFixed(1)}%</span>
        </div>
      )
    };
  }, [theme]);

  // ── FETCH AVAILABLE YEARS ──
  useEffect(() => {
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
      })
      .catch(err => console.error('Error fetching available years:', err));
  }, []);

  // ── FETCH CUSTOMER SUMMARY DATA ──
  useEffect(() => {
    if (activeYears.length === 0) return;
    setLoading(true);
    fetchCustomerSummary(activeYears, selMonths)
      .then(cData => setCustData(cData))
      .catch(err => console.error('Error fetching customer summary data:', err))
      .finally(() => setLoading(false));
  }, [baseYear, compareYear, compareYear2, selMonths]);

  // ── FILTER LOADING EFFECT ──
  useEffect(() => {
    if (!loading) {
      setIsFiltering(true);
      const t = setTimeout(() => setIsFiltering(false), 400);
      return () => clearTimeout(t);
    }
  }, [baseYear, compareYear, compareYear2, selGroups, selCustomers, selMonths, searchQuery, sortOrder, growthComparisons]);

  // ── CUSTOMER LIST ──
  const groupCustomers = useMemo(() => {
    return custData
      .filter(c => selGroups.includes(getCustomerGroupId(c.id || '')))
      .map(c => c.id as string)
      .sort();
  }, [custData, selGroups]);

  const activeCustomers = selCustomers.length > 0 ? selCustomers.filter(id => id !== '__NONE__') : groupCustomers;

  const toggleGroup = (gId: string) => {
    setSelGroups(prevGroups => {
      const isAdding = !prevGroups.includes(gId);
      const newGroups = isAdding ? [...prevGroups, gId] : prevGroups.filter(g => g !== gId);

      setSelCustomers(prevCusts => {
        if (prevCusts.length === 0) return []; // "Select All" remains "Select All"

        if (isAdding) {
          const newGroupCusts = custData
            .filter(c => getCustomerGroupId(c.id || '') === gId)
            .map(c => c.id as string);

          let newSel = [...prevCusts.filter(id => id !== '__NONE__'), ...newGroupCusts];
          newSel = Array.from(new Set(newSel));

          const allNewGroupCusts = custData
            .filter(c => newGroups.includes(getCustomerGroupId(c.id || '')))
            .map(c => c.id as string);

          if (newSel.length >= allNewGroupCusts.length) return [];
          return newSel;
        } else {
          const removedGroupCusts = new Set(
            custData
              .filter(c => getCustomerGroupId(c.id || '') === gId)
              .map(c => c.id as string)
          );
          const newSel = prevCusts.filter(id => !removedGroupCusts.has(id) && id !== '__NONE__');
          if (newSel.length === 0 && prevCusts.length > 0) return ['__NONE__'];
          return newSel;
        }
      });

      return newGroups;
    });
  };

  const toggleCustomer = (cId: string) => {
    setSelCustomers(prev => {
      let newSel = prev.length === 0 ? groupCustomers.filter(id => id !== cId) : (prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]);
      newSel = newSel.filter(id => id !== '__NONE__');
      if (newSel.length === 0) return ['__NONE__'];
      if (newSel.length === groupCustomers.length) return [];
      return newSel;
    });
  };

  const toggleAllCustomers = () => {
    setSelCustomers(prev => prev.length === 0 ? ['__NONE__'] : []);
  };

  // ── DATE UTILS ──
  const currentDate = useMemo(() => new Date(), []);
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthIdx = currentDate.getMonth();

  const displayMonths = useMemo(() => MONTHS.filter(m => selMonths.includes(m)), [selMonths]);

  // ── ACTIVE YEARS ──
  const activeYears = useMemo(() => {
    const yrs = [baseYear];
    if (compareYear !== 'none') yrs.push(compareYear);
    if (compareYear2 !== 'none') yrs.push(compareYear2);
    return yrs.filter(Boolean);
  }, [baseYear, compareYear, compareYear2]);

  // ── GROWTH COMPARISONS ──
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

  // ── TABLE DATA ──
  const tableData = useMemo(() => {
    if (!baseYear || activeYears.length === 0) return { rows: [], colTotals: {} as Record<string, number>, activeYears: [] as string[] };

    let rows: any[] = [];
    custData.forEach(cust => {
      if (activeCustomers.length === 0) return;
      if (!activeCustomers.includes(cust.id)) return;

      const row: any = { id: cust.id, label: cust.id, topItem: cust.topItem, topItemQty: cust.topItemQty };
      const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;
      const allYearsInSource = source ? Object.keys(source).map(Number) : [];

      activeYears.forEach(yr => {
        let yrTotal = 0;
        const numYr = Number(yr);
        let sumBeforeYr = 0;
        allYearsInSource.forEach(y => {
          if (y < numYr) Object.values(source[String(y)] || {}).forEach(v => sumBeforeYr += Number(v) || 0);
        });
        row[`isTrulyNew_${yr}`] = (sumBeforeYr === 0);
        displayMonths.forEach(m => {
          const idx = MONTHS.indexOf(m);
          const val = source?.[yr]?.[String(idx + 1)] || 0;
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

    rows.sort((a, b) => {
      const valA = a[`${activeYears[0]}_total`] || 0;
      const valB = b[`${activeYears[0]}_total`] || 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    const colTotals: Record<string, number> = {};
    activeYears.forEach(yr => {
      colTotals[`${yr}_total`] = 0;
      displayMonths.forEach(m => { colTotals[`${yr}_${m}`] = 0; });
    });
    rows.forEach(r => {
      activeYears.forEach(yr => {
        colTotals[`${yr}_total`] += r[`${yr}_total`] || 0;
        displayMonths.forEach(m => { colTotals[`${yr}_${m}`] += r[`${yr}_${m}`] || 0; });
      });
    });

    return { rows, colTotals, activeYears };
  }, [custData, baseYear, activeYears, activeCustomers, searchQuery, displayMonths, metric, sortOrder]);

  // ── KPI ──
  const kpi = useMemo(() => {
    const bTotal = tableData.colTotals[`${activeYears[0]}_total`] || 0;
    const cTotal = activeYears.length > 1 ? (tableData.colTotals[`${activeYears[1]}_total`] || 0) : 0;
    const pct = cTotal > 0 ? ((bTotal - cTotal) / cTotal) * 100 : null;
    return { bTotal, cTotal, pct, count: tableData.rows.length };
  }, [tableData, activeYears]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Topbar breadcrumb={[
        { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
        { label: metric === 'qty' ? 'Quantity Analytics' : 'Sales Analytics', path: metric === 'qty' ? '/dashboard/qty' : '/dashboard/customer' },
        { label: metric === 'qty' ? 'Full Quantity Matrix' : 'Full Report Matrix' }
      ]} />

      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100%', paddingBottom: 40 }}>

          {/* ── PAGE HEADER ── */}
          <div style={{
            padding: '16px 28px', background: 'var(--color-surface-0)',
            borderBottom: '1px solid var(--color-border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, flexWrap: 'wrap'
          }}>

            {/* Right controls */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* View Mode Toggle */}
              <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 4, borderRadius: 8, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                <button
                  onClick={() => setViewMode('ytd')}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: viewMode === 'ytd' ? 'var(--color-surface-0)' : 'transparent',
                    color: viewMode === 'ytd' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    boxShadow: viewMode === 'ytd' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  className="active:scale-95"
                >
                  YTD View
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: viewMode === 'monthly' ? 'var(--color-surface-0)' : 'transparent',
                    color: viewMode === 'monthly' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    boxShadow: viewMode === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  className="active:scale-95"
                >
                  Monthly Comparison
                </button>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  type="text" placeholder="Search Customer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                    borderRadius: 7, padding: '6px 12px 6px 30px', fontSize: '0.75rem', color: 'var(--color-text-primary)', outline: 'none', width: 180, transition: 'all 0.15s'
                  }}
                />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setIsFilterOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 800,
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

          {/* ── KPI STRIP ── */}
          {(!loading && !isFiltering) && (
            <div style={{ padding: '16px 28px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {displayYears.map((yr, yIdx) => (
                <div key={yr} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 10, padding: '12px 18px', flex: '1 1 min-content', minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                    <DollarSign size={14} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'capitalize', letterSpacing: '0.04em' }}>Year {yr}</span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: yIdx === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                    {fmtCurr(tableData.colTotals[`${yr}_total`] || 0)}
                  </div>
                </div>
              ))}
              <div style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 10, padding: '12px 18px', flex: '1 1 min-content', minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                  <Users size={14} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'capitalize', letterSpacing: '0.04em' }}>Customers</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                  {kpi.count}
                </div>
              </div>
            </div>
          )}

          {/* ── MAIN CONTENT: TABLE ── */}
          <div style={{ flex: 1, padding: '0 28px 32px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Table Area */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <CustomerReportTable
                loading={loading || isFiltering}
                baseYear={baseYear}
                viewMode={viewMode}
                tableData={tableData}
                displayYears={displayYears}
                displayMonths={displayMonths}
                currentYearStr={currentYearStr}
                currentMonthIdx={currentMonthIdx}
                growthComparisons={growthComparisons}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                metric={metric}
                fmt={fmt}
                renderGrowthAmt={renderGrowthAmt}
                renderGrowthPct={renderGrowthPct}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── FILTER MODAL ── */}
      <CustomerReportFilters
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        availableYears={availableYears}
        baseYear={baseYear}
        setBaseYear={setBaseYear}
        compareYear={compareYear}
        setCompareYear={setCompareYear}
        compareYear2={compareYear2}
        setCompareYear2={setCompareYear2}
        activeYears={activeYears}
        growthComparisons={growthComparisons}
        setGrowthComparisons={setGrowthComparisons}
        selMonths={selMonths}
        setSelMonths={setSelMonths}
        selGroups={selGroups}
        toggleGroup={toggleGroup}
        groupCustomers={groupCustomers}
        selCustomers={selCustomers}
        toggleCustomer={toggleCustomer}
        toggleAllCustomers={toggleAllCustomers}
      />
    </>
  );
}
