import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, DollarSign } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import './SalesResponsive.css';
import { fetchAvailableYearsMeta } from '../services/dashboardAPI';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';

import CustomerReportTable from '../components/report/CustomerReportTable';
import CustomerReportFilters from '../components/report/CustomerReportFilters';
import { useTheme } from '../contexts/useTheme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALL_GROUP_IDS = ALL_GROUPS.map(group => group.id);
const SUMMARY_DEFAULT_GROUP_IDS = ALL_GROUP_IDS.slice(0, 4);

interface CustomerSummaryRecord {
  id: string;
  topItem?: string;
  topItemQty?: number | string;
  monthly?: Record<string, Record<string, number | string>>;
  monthlyQty?: Record<string, Record<string, number | string>>;
}

interface CustomerReportMatrixRow extends Record<string, unknown> {
  id: string;
  label: string;
  topItem?: string;
  topItemQty?: number;
}

function csv(value: string | null) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseMonths(value: string | null) {
  const months = csv(value)
    .map(item => {
      const numeric = Number(item);
      if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return MONTHS[numeric - 1];
      return MONTHS.find(month => month.toLowerCase() === item.toLowerCase()) || '';
    })
    .filter(Boolean);
  return Array.from(new Set(months));
}

function parseGroups(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === 'all') return ALL_GROUP_IDS;
  if (normalized === 'none') return [];

  const groupIds = new Set(ALL_GROUP_IDS);
  return csv(value).filter(groupId => groupIds.has(groupId));
}

export default function CustomerReportPage() {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const metric = searchParams.get('metric') || 'amount';
  const source = searchParams.get('src');
  const hasGroupsParam = searchParams.has('groups');
  const requestedYears = useMemo(() => csv(searchParams.get('years')), [searchParams]);
  const requestedMonths = useMemo(() => parseMonths(searchParams.get('months')), [searchParams]);
  const requestedGroups = useMemo(() => parseGroups(searchParams.get('groups')), [searchParams]);
  const defaultGroups = source === 'summary' ? SUMMARY_DEFAULT_GROUP_IDS : ALL_GROUP_IDS;
  const requestedCustomers = useMemo(() => csv(searchParams.get('customers')).map(customer => customer.toUpperCase()), [searchParams]);
  const requestedViewMode = searchParams.get('view') === 'monthly' ? 'monthly' : 'ytd';

  const fmt = useCallback((val: number) => {
    if (metric === 'qty') return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [metric]);
  const fmtCurr = fmt;

  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [firstDataYear, setFirstDataYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const [viewMode, setViewMode] = useState<'ytd' | 'monthly'>(requestedViewMode);
  const [baseYear, setBaseYear] = useState<string>('');
  const [compareYear, setCompareYear] = useState<string>('none');
  const [compareYear2, setCompareYear2] = useState<string>('none');
  const [compareYear3, setCompareYear3] = useState<string>('none');
  const [selGroups, setSelGroups] = useState<string[]>(() => hasGroupsParam ? requestedGroups : defaultGroups);
  const [selCustomers, setSelCustomers] = useState<string[]>(() => requestedCustomers);
  const [selMonths, setSelMonths] = useState<string[]>(() => requestedMonths.length ? requestedMonths : MONTHS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [growthComparisons, setGrowthComparisons] = useState<{ a: string; b: string }[]>([]);
  const resetMatrixView = useCallback(() => {
    setSearchQuery('');
    setSortOrder('desc');
    setViewMode('ytd');
  }, []);

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
    const sign = isUp ? '+' : isDown ? '\u2212' : '';
    const signedValue = `${sign}${fmt(Math.abs(diff))}`;
    return {
      bgColor,
      node: (
        <div style={{ width: '100%', textAlign: 'right' }}>
          <span style={{ color: textColor, fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>{signedValue}</span>
        </div>
      )
    };
  }, [fmt, theme]);

  const renderGrowthPct = useCallback((baseVal: number, compVal: number, isTrulyNew = false) => {
    if (compVal === 0 && baseVal === 0) return {
      bgColor: 'transparent',
      node: <div style={{ textAlign: 'right', color: 'var(--color-text-quaternary)' }}>-</div>
    };
    if (compVal === 0 && baseVal > 0 && isTrulyNew) return {
      bgColor: theme === 'royal-white' ? 'color-mix(in srgb, var(--color-success-500) 8%, var(--color-surface-0))' : 'transparent',
      node: (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <span style={{ background: 'color-mix(in srgb, var(--color-success-500) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success-500) 45%, var(--color-border-light))', color: 'var(--color-success-500)', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, fontSize: 'var(--erp-text-meta)', letterSpacing: 0 }}>NEW</span>
        </div>
      )
    };
    if (compVal === 0 && baseVal > 0) return {
      bgColor: 'transparent',
      node: <div style={{ textAlign: 'right', color: 'var(--color-text-tertiary)', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>0.0%</div>
    };
    const pct = ((baseVal - compVal) / compVal) * 100;
    const isUp = pct > 0;
    const isDown = pct < 0;
    const bgColor = theme === 'royal-white'
      ? (isUp ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : isDown ? 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)' : 'transparent')
      : 'transparent';
    const textColor = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
    const sign = isUp ? '+' : isDown ? '\u2212' : '';
    return {
      bgColor,
      node: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
          <span style={{ color: textColor, fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>{sign}{Math.abs(pct).toFixed(1)}%</span>
        </div>
      )
    };
  }, [theme]);

  const currentDate = useMemo(() => new Date(), []);
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthIdx = currentDate.getMonth();
  const displayMonths = useMemo(() => MONTHS.filter(m => selMonths.includes(m)), [selMonths]);

  const activeYears = useMemo(() => {
    const yrs = [baseYear];
    if (compareYear !== 'none') yrs.push(compareYear);
    if (compareYear2 !== 'none') yrs.push(compareYear2);
    if (compareYear3 !== 'none') yrs.push(compareYear3);
    return Array.from(new Set(yrs.filter(Boolean)));
  }, [baseYear, compareYear, compareYear2, compareYear3]);

  const dataYears = useMemo(() => {
    const startYear = Number(firstDataYear);
    const maxYear = Math.max(...activeYears.map(Number).filter(Boolean));
    if (!Number.isFinite(startYear) || !Number.isFinite(maxYear) || maxYear < startYear) return [];
    return Array.from({ length: maxYear - startYear + 1 }, (_, index) => String(startYear + index));
  }, [activeYears, firstDataYear]);

  const displayYears = activeYears;

  useEffect(() => {
    fetchAvailableYearsMeta()
      .then(({ years, firstDataYear }) => {
        const sortedYrs = years.map(String).sort((a, b) => Number(a) - Number(b));
        setFirstDataYear(firstDataYear);
        setAvailableYears(sortedYrs);
        if (sortedYrs.length > 0) {
          const requested = requestedYears
            .filter(year => sortedYrs.includes(year))
            .sort((a, b) => Number(b) - Number(a));
          const latest = requested[0] || sortedYrs[sortedYrs.length - 1];
          const prev = requested[1] || (sortedYrs.length > 1 ? sortedYrs[sortedYrs.length - 2] : 'none');
          const third = requested[2] || 'none';
          const fourth = requested[3] || 'none';

          setBaseYear(latest);
          setCompareYear(prev !== latest ? prev : 'none');
          setCompareYear2(third !== latest && third !== prev ? third : 'none');
          setCompareYear3(fourth !== latest && fourth !== prev && fourth !== third ? fourth : 'none');
        }
      })
      .catch(err => console.error('Error fetching available years:', err));
  }, [requestedYears]);

  useEffect(() => {
    if (dataYears.length === 0) return;
    let cancelled = false;
    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      fetchCustomerSummary(dataYears, selMonths)
        .then(cData => { if (!cancelled) setCustData(cData); })
        .catch(err => console.error('Error fetching customer summary data:', err))
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [dataYears, selMonths]);

  useEffect(() => {
    if (loading) return;
    const startTimer = window.setTimeout(() => setIsFiltering(true), 0);
    const stopTimer = window.setTimeout(() => setIsFiltering(false), 400);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(stopTimer);
    };
  }, [baseYear, compareYear, compareYear2, compareYear3, selGroups, selCustomers, selMonths, searchQuery, sortOrder, growthComparisons, loading]);

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
        if (prevCusts.length === 0) return [];

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
        }

        const removedGroupCusts = new Set(
          custData
            .filter(c => getCustomerGroupId(c.id || '') === gId)
            .map(c => c.id as string)
        );
        const newSel = prevCusts.filter(id => !removedGroupCusts.has(id) && id !== '__NONE__');
        if (newSel.length === 0 && prevCusts.length > 0) return ['__NONE__'];
        return newSel;
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

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setGrowthComparisons(prev => {
        if (activeYears.length < 2) return prev.length === 0 ? prev : [];

        const maxPairs = Math.max(1, activeYears.length - 1);
        const seen = new Set<string>();
        const next = prev.slice(0, maxPairs)
          .map((comp, index) => {
            const normalizedA = activeYears.includes(comp.a) ? comp.a : activeYears[0];
            const normalizedB = activeYears.includes(comp.b) ? comp.b : (activeYears[index + 1] || activeYears[1]);
            const nextB = normalizedA === normalizedB
              ? (activeYears.find(year => year !== normalizedA) || normalizedB)
              : normalizedB;
            return { a: normalizedA, b: nextB };
          })
          .filter(comp => {
            if (!comp.a || !comp.b || comp.a === comp.b) return false;
            const key = `${comp.a}_${comp.b}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        const same = prev.length === next.length && prev.every((comp, index) => comp.a === next[index].a && comp.b === next[index].b);
        return same ? prev : next;
      });
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [activeYears]);

  const tableData = useMemo(() => {
    if (!baseYear || activeYears.length === 0) return { rows: [], colTotals: {} as Record<string, number>, activeYears: [] as string[] };

    let rows: CustomerReportMatrixRow[] = [];
    custData.forEach(cust => {
      if (activeCustomers.length === 0) return;
      if (!activeCustomers.includes(cust.id)) return;

      const row: CustomerReportMatrixRow = { id: cust.id, label: cust.id, topItem: cust.topItem, topItemQty: Number(cust.topItemQty || 0) };
      const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;
      const allYearsInSource = source ? Object.keys(source).map(Number) : [];

      activeYears.forEach(yr => {
        let yrTotal = 0;
        const numYr = Number(yr);
        let sumBeforeYr = 0;
        allYearsInSource.forEach(y => {
          if (y < numYr) Object.values(source?.[String(y)] || {}).forEach(v => { sumBeforeYr += Number(v) || 0; });
        });
        row[`isTrulyNew_${yr}`] = sumBeforeYr === 0;
        displayMonths.forEach(m => {
          const idx = MONTHS.indexOf(m);
          const val = source?.[yr]?.[String(idx + 1)] || 0;
          row[`${yr}_${m}`] = val;
          yrTotal += Number(val) || 0;
        });
        row[`${yr}_total`] = yrTotal;
      });
      rows.push(row);
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => r.label.toLowerCase().includes(q));
    }

    rows.sort((a, b) => {
      const valA = Number(a[`${activeYears[0]}_total`] || 0);
      const valB = Number(b[`${activeYears[0]}_total`] || 0);
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    const colTotals: Record<string, number> = {};
    activeYears.forEach(yr => {
      colTotals[`${yr}_total`] = 0;
      displayMonths.forEach(m => { colTotals[`${yr}_${m}`] = 0; });
    });
    rows.forEach(r => {
      activeYears.forEach(yr => {
        colTotals[`${yr}_total`] += Number(r[`${yr}_total`] || 0);
        displayMonths.forEach(m => { colTotals[`${yr}_${m}`] += Number(r[`${yr}_${m}`] || 0); });
      });
    });

    return { rows, colTotals, activeYears };
  }, [custData, baseYear, activeYears, activeCustomers, searchQuery, displayMonths, metric, sortOrder]);

  const kpi = useMemo(() => {
    const bTotal = tableData.colTotals[`${activeYears[0]}_total`] || 0;
    const cTotal = activeYears.length > 1 ? (tableData.colTotals[`${activeYears[1]}_total`] || 0) : 0;
    const pct = cTotal > 0 ? ((bTotal - cTotal) / cTotal) * 100 : null;
    return { bTotal, cTotal, pct, count: tableData.rows.length };
  }, [tableData, activeYears]);

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
          { label: 'Sales Analytics' },
          { label: 'Sales & Qty Summary', path: '/dashboard/customer' },
          { label: metric === 'qty' ? 'Quantity Matrix' : 'Sales Matrix' }
        ]}
        hideSearch
        contentLayout="dashboard-wide"
        bottomContent={(
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
            compareYear3={compareYear3}
            setCompareYear3={setCompareYear3}
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
        )}
      />

      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--dashboard-wide sales-report-page">
          {(!loading && !isFiltering) && (
            <div className="sales-report-kpis">
              {displayYears.map((yr, yIdx) => (
                <div key={yr} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '12px 18px', flex: '1 1 min-content', minWidth: 200, boxShadow: '0 10px 24px -20px color-mix(in srgb, var(--color-surface-900) 36%, transparent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                    <DollarSign size={14} />
                    <span style={{ fontSize: 'var(--erp-text-meta)', fontWeight: 800, textTransform: 'capitalize', letterSpacing: 0 }}>Year {yr}</span>
                  </div>
                  <div style={{ fontSize: 'var(--erp-text-kpi)', fontWeight: 900, color: yIdx === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: 0 }}>
                    {fmtCurr(tableData.colTotals[`${yr}_total`] || 0)}
                  </div>
                </div>
              ))}
              <div style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '12px 18px', flex: '1 1 min-content', minWidth: 160, boxShadow: '0 10px 24px -20px color-mix(in srgb, var(--color-surface-900) 36%, transparent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                  <Users size={14} />
                  <span style={{ fontSize: 'var(--erp-text-meta)', fontWeight: 800, textTransform: 'capitalize', letterSpacing: 0 }}>Customers</span>
                </div>
                <div style={{ fontSize: 'var(--erp-text-kpi)', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: 0 }}>
                  {kpi.count}
                </div>
              </div>
            </div>
          )}

          <div className="sales-report-table-region">
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <CustomerReportTable
                loading={loading || isFiltering}
                baseYear={baseYear}
                viewMode={viewMode}
                setViewMode={setViewMode}
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
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showFilters={isFilterOpen}
                setShowFilters={setIsFilterOpen}
                onResetMatrix={resetMatrixView}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
