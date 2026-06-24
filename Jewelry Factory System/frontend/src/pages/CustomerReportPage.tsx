import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Users, DollarSign } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { fetchCustomerSummary, fetchAvailableYears } from '../services/dashboardAPI';
import { getCustomerGroupId } from '../config/customerGroups';

import CustomerReportTable from '../components/report/CustomerReportTable';
import CustomerReportFilters from '../components/report/CustomerReportFilters';

// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const [selCustomers, setSelCustomers] = useState<string[]>([]);
  const [selMonths, setSelMonths] = useState<string[]>(MONTHS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // ── GROWTH HELPERS ──
  const renderGrowthAmt = useCallback((baseVal: number, compVal: number) => {
    if (compVal === 0 && baseVal === 0) return <span style={{ color: 'var(--color-text-quaternary)' }}>-</span>;
    const diff = baseVal - compVal;
    const isUp = diff > 0;
    const isDown = diff < 0;
    const color = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
    const arrow = isUp ? '▲' : isDown ? '▼' : '';
    return <span style={{ color, fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>{arrow} {fmt(Math.abs(diff))}</span>;
  }, [fmt]);

  const renderGrowthPct = useCallback((baseVal: number, compVal: number, isTrulyNew?: boolean) => {
    if (compVal === 0 && baseVal === 0) return <span style={{ color: 'var(--color-text-quaternary)' }}>-</span>;
    if (isTrulyNew && compVal === 0) return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ background: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)', color: 'var(--color-brand-600)', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.05em' }}>NEW</span>
      </div>
    );
    if (compVal === 0) return <span style={{ color: 'var(--color-success-500)', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>+100.0%</span>;
    const pct = ((baseVal - compVal) / compVal) * 100;
    const isUp = pct > 0;
    const isDown = pct < 0;
    const color = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
    const sign = isUp ? '+' : '';
    return <span style={{ color, fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>{sign}{pct.toFixed(1)}%</span>;
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
      .then(cData => setCustData(cData))
      .catch(err => console.error('Error fetching report data:', err))
      .finally(() => setLoading(false));
  }, []);

  // ── CUSTOMER LIST ──
  const groupCustomers = useMemo(() => {
    return custData
      .filter(c => selGroups.includes(getCustomerGroupId(c.id || '')))
      .map(c => c.id as string)
      .sort();
  }, [custData, selGroups]);

  const activeCustomers = selCustomers.length > 0 ? selCustomers.filter(id => id !== '__NONE__') : groupCustomers;

  const toggleGroup = (gId: string) => {
    setSelGroups(prev => prev.includes(gId) ? prev.filter(g => g !== gId) : [...prev, gId]);
    setSelCustomers([]);
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
  const [growthComparisons, setGrowthComparisons] = useState<{ a: string; b: string }[]>([]);
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
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: metric === 'qty' ? 'Quantity Analytics' : 'Sales Analytics', path: metric === 'qty' ? '/dashboard/qty' : '/dashboard/customer' },
        { label: metric === 'qty' ? 'Full Quantity Matrix' : 'Full Report Matrix' }
      ]} />

      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100%', paddingBottom: 40 }}>

          {/* ── PAGE HEADER ── */}
          <div style={{
            padding: '16px 28px', background: 'var(--color-surface-0)',
            borderBottom: '1px solid var(--color-border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => navigate(metric === 'qty' ? '/dashboard/qty' : '/dashboard/customer')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-light)', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 2px 5px color-mix(in srgb, var(--color-surface-900) 12%, transparent)'
                }}
                className="hover:text-brand-600 hover:border-brand-300 active:scale-95"
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* View Mode Toggle */}
              <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 4, borderRadius: 8, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                <button
                  onClick={() => setViewMode('year')}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
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
                    padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: viewMode === 'month' ? 'var(--color-surface-0)' : 'transparent',
                    color: viewMode === 'month' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  className="active:scale-95"
                >
                  Group by Month
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

          {/* ── MAIN CONTENT: TABLE ── */}
          <div style={{ flex: 1, padding: '0 28px 32px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Table Area */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <CustomerReportTable
                loading={loading}
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
