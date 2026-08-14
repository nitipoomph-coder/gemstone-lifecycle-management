import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { DollarSign, Hash } from 'lucide-react';
import './SalesResponsive.css';
import { fetchAvailableYearsMeta } from '../services/dashboardAPI';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS, getCustomerGroupId } from '../config/customerGroups';

import CustomerReportTable from '../components/report/CustomerReportTable';
import { useTheme } from '../contexts/useTheme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];

interface CustomerSummaryRecord {
  id: string;
  name?: string;
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

export default function CustomerReportPage() {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedYears, selectedMonths, selGroups, kpiCompareYear } = useOutletContext<any>();
  const metric = searchParams.get('metric') || 'amount';

  const handleSetMetric = useCallback((nextMetric: 'amount' | 'qty') => {
    const newParams = new URLSearchParams(searchParams);
    if (nextMetric === 'qty') {
      newParams.set('metric', 'qty');
    } else {
      newParams.delete('metric');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const requestedCustomers = useMemo(() => csv(searchParams.get('customers')).map(customer => customer.toUpperCase()), [searchParams]);
  const requestedViewMode: 'ytd' | 'quarterly' | 'monthly' = searchParams.get('view') === 'monthly' ? 'monthly' : searchParams.get('view') === 'quarterly' ? 'quarterly' : 'ytd';

  const fmt = useCallback((val: number) => {
    if (metric === 'qty') return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [metric]);
  const fmtCurr = fmt;

  const activeYears: string[] = selectedYears;
  const baseYear = selectedYears[0] || '';
  const selMonths = useMemo(() => {
    return selectedMonths.map((mIdx: string) => MONTHS[Number(mIdx) - 1]);
  }, [selectedMonths]);

  const [custData, setCustData] = useState<CustomerSummaryRecord[]>([]);
  const [firstDataYear, setFirstDataYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const [viewMode, setViewMode] = useState<'ytd' | 'quarterly' | 'monthly'>(requestedViewMode);
  const [aggregationMode, setAggregationMode] = useState<'group' | 'customer'>('group');

  useEffect(() => {
    setAggregationMode(selGroups.length === 1 ? 'customer' : 'group');
  }, [selGroups.length]);

  const searchQuery = searchParams.get('search') || '';
  const setSearchQuery = () => { }; // Mock to satisfy table props
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [growthComparisons, setGrowthComparisons] = useState<{ a: string; b: string }[]>([]);
  const resetMatrixView = useCallback(() => {
    setSortOrder('desc');
    setViewMode('ytd');
  }, []);





  const renderGrowthAmt = useCallback((baseVal: number, compVal: number) => {
    const diff = baseVal - compVal;
    if (diff === 0) return {
      bgColor: 'transparent',
      node: (
        <div style={{ width: '100%', textAlign: 'right' }}>
          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>{fmt(0)}</span>
        </div>
      )
    };
    const isUp = diff > 0;
    const isDown = diff < 0;
    const isRoyal = theme === 'royal-white';
    const bgColor = isRoyal
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
      node: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>0.00%</span>
        </div>
      )
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
      node: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>0.00%</span>
        </div>
      )
    };
    const pct = ((baseVal - compVal) / compVal) * 100;
    if (pct === 0) return {
      bgColor: 'transparent',
      node: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>0.00%</span>
        </div>
      )
    };
    const isUp = pct > 0;
    const isDown = pct < 0;
    const isRoyal = theme === 'royal-white';
    const bgColor = isRoyal
      ? (isUp ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : isDown ? 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)' : 'transparent')
      : 'transparent';
    const textColor = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
    const sign = isUp ? '+' : isDown ? '\u2212' : '';
    const arrow = isUp ? '↑ ' : isDown ? '↓ ' : '';
    return {
      bgColor,
      node: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: 2 }}>
          <span style={{ color: textColor, fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>
            {arrow}{sign}{Math.abs(pct).toFixed(2)}%
          </span>
        </div>
      )
    };
  }, [theme]);

  const currentDate = useMemo(() => new Date(), []);
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthIdx = currentDate.getMonth();
  const displayMonths = useMemo(() => MONTHS.filter(m => selMonths.includes(m)), [selMonths]);

  const dataYears = useMemo(() => {
    if (firstDataYear === null) return [];
    const startYear = Number(firstDataYear);
    const maxYear = Math.max(...activeYears.map(Number).filter(Boolean));
    if (!Number.isFinite(startYear) || !Number.isFinite(maxYear) || maxYear < startYear) return [];
    return Array.from({ length: maxYear - startYear + 1 }, (_, index) => String(startYear + index));
  }, [activeYears, firstDataYear]);

  const displayYears = activeYears;

  useEffect(() => {
    fetchAvailableYearsMeta()
      .then(({ firstDataYear }) => {
        setFirstDataYear(firstDataYear);
      })
      .catch(err => console.error('Error fetching available years:', err));
  }, []);

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

  const groupCustomers = useMemo(() => {
    return custData
      .filter(c => selGroups.includes(getCustomerGroupId(c.id || '')))
      .map(c => c.id as string)
      .sort();
  }, [custData, selGroups]);

  const activeCustomers = requestedCustomers.length > 0 ? requestedCustomers.filter((id: string) => id !== '__NONE__') : groupCustomers;

  useEffect(() => {
    if (activeYears.length < 2) {
      setGrowthComparisons(prev => (prev.length === 0 ? prev : []));
      return;
    }
    const sortedDesc = [...activeYears].map(String).sort((y1, y2) => Number(y2) - Number(y1));
    const newestYear = sortedDesc[0];
    const pairs: { a: string; b: string }[] = [];
    for (let i = 1; i < sortedDesc.length; i++) {
      if (sortedDesc[i] && sortedDesc[i] !== newestYear) {
        pairs.push({ a: newestYear, b: sortedDesc[i] });
      }
    }
    setGrowthComparisons(prev => {
      const isSame = prev.length === pairs.length && prev.every((p, idx) => p.a === pairs[idx].a && p.b === pairs[idx].b);
      return isSame ? prev : pairs;
    });
  }, [activeYears]);

  const tableData = useMemo(() => {
    if (!baseYear || activeYears.length === 0) return { rows: [], colTotals: {} as Record<string, number>, activeYears: [] as string[] };

    let rows: CustomerReportMatrixRow[] = [];

    const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
    const Q_MAP: Record<string, string[]> = {
      Q1: ['Jan', 'Feb', 'Mar'],
      Q2: ['Apr', 'May', 'Jun'],
      Q3: ['Jul', 'Aug', 'Sep'],
      Q4: ['Oct', 'Nov', 'Dec']
    };

    if (aggregationMode === 'group') {
      const groupRows: Record<string, CustomerReportMatrixRow> = {};
      selGroups.forEach((gId: string) => {
        const group = ALL_GROUPS.find(g => g.id === gId);
        if (!group) return;
        groupRows[gId] = { id: gId, label: group.label, topItem: '', topItemQty: 0 };
        activeYears.forEach((yr: string) => {
          groupRows[gId][`isTrulyNew_${yr}`] = false;
          displayMonths.forEach((m: string) => { groupRows[gId][`${yr}_${m}`] = 0; });
          QUARTERS.forEach(q => { groupRows[gId][`${yr}_${q}`] = 0; });
          groupRows[gId][`${yr}_total`] = 0;
        });
      });

      custData.forEach(cust => {
        const gId = getCustomerGroupId(cust.id || '');
        if (!selGroups.includes(gId)) return;

        const row = groupRows[gId];
        if (!row) return;
        const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;

        activeYears.forEach((yr: string) => {
          displayMonths.forEach((m: string) => {
            const idx = MONTHS.indexOf(m);
            const val = source?.[yr]?.[String(idx + 1)] || 0;
            row[`${yr}_${m}`] = Number(row[`${yr}_${m}`]) + Number(val);
            row[`${yr}_total`] = Number(row[`${yr}_total`]) + Number(val);
          });
          QUARTERS.forEach(q => {
            row[`${yr}_${q}`] = Q_MAP[q].reduce((s, m) => s + Number(row[`${yr}_${m}`] || 0), 0);
          });
        });
      });

      rows = Object.values(groupRows).filter((r: any) => activeYears.some((yr: string) => Number(r[`${yr}_total`]) > 0));
    } else {
      const custRows: Record<string, CustomerReportMatrixRow> = {};

      custData.forEach(cust => {
        const gId = getCustomerGroupId(cust.id || '');
        if (!selGroups.includes(gId)) return;
        const cId = cust.id || '';

        if (!custRows[cId]) {
          custRows[cId] = { id: cId, label: cId, topItem: '', topItemQty: 0 };
          activeYears.forEach((yr: string) => {
            custRows[cId][`isTrulyNew_${yr}`] = false;
            displayMonths.forEach((m: string) => { custRows[cId][`${yr}_${m}`] = 0; });
            QUARTERS.forEach(q => { custRows[cId][`${yr}_${q}`] = 0; });
            custRows[cId][`${yr}_total`] = 0;
          });
        }

        const row = custRows[cId];
        const source = metric === 'qty' ? cust.monthlyQty : cust.monthly;

        activeYears.forEach((yr: string) => {
          displayMonths.forEach((m: string) => {
            const idx = MONTHS.indexOf(m);
            const val = source?.[yr]?.[String(idx + 1)] || 0;
            row[`${yr}_${m}`] = Number(row[`${yr}_${m}`]) + Number(val);
            row[`${yr}_total`] = Number(row[`${yr}_total`]) + Number(val);
          });
          QUARTERS.forEach(q => {
            row[`${yr}_${q}`] = Q_MAP[q].reduce((s, m) => s + Number(row[`${yr}_${m}`] || 0), 0);
          });
        });
      });

      rows = Object.values(custRows).filter((r: any) => activeYears.some((yr: string) => Number(r[`${yr}_total`]) > 0));
    }

    rows.sort((a, b) => {
      const valA = Number(a[`${activeYears[0]}_total`] || 0);
      const valB = Number(b[`${activeYears[0]}_total`] || 0);
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    const colTotals: Record<string, number> = {};
    activeYears.forEach((yr: string) => {
      colTotals[`${yr}_total`] = 0;
      displayMonths.forEach((m: string) => { colTotals[`${yr}_${m}`] = 0; });
      QUARTERS.forEach(q => { colTotals[`${yr}_${q}`] = 0; });
    });
    rows.forEach(r => {
      activeYears.forEach((yr: string) => {
        colTotals[`${yr}_total`] += Number(r[`${yr}_total`] || 0);
        displayMonths.forEach((m: string) => { colTotals[`${yr}_${m}`] += Number(r[`${yr}_${m}`] || 0); });
        QUARTERS.forEach(q => { colTotals[`${yr}_${q}`] += Number(r[`${yr}_${q}`] || 0); });
      });
    });

    return { rows, colTotals, activeYears };
  }, [custData, baseYear, activeYears, activeCustomers, searchQuery, displayMonths, metric, sortOrder, aggregationMode]);



  const groupKpis = useMemo(() => {
    if (tableData.rows.length <= 1 && activeYears.length <= 1) return [];

    const groupTotals: Record<string, Record<string, number>> = {};
    selGroups.forEach((gId: string) => {
      groupTotals[gId] = {};
      activeYears.forEach((yr: string) => { groupTotals[gId][yr] = 0; });
    });

    tableData.rows.forEach(row => {
      const gId = getCustomerGroupId(row.id);
      if (!groupTotals[gId]) return;
      activeYears.forEach((yr: string) => {
        groupTotals[gId][yr] += Number(row[`${yr}_total`] || 0);
      });
    });

    return ALL_GROUPS
      .filter(g => selGroups.includes(g.id) && groupTotals[g.id])
      .map(g => ({ ...g, totals: groupTotals[g.id] }));
  }, [tableData, selGroups, activeYears]);

  return (
    <>
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--dashboard-wide sales-report-page">
          {/* Loading Skeletons for KPIs */}
          {(loading) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="sales-report-kpis flex-wrap" style={{ display: 'flex', gap: 12 }}>
                {Array.from({ length: displayYears.length || 2 }).map((_, i) => (
                  <div key={`kpi-skeleton-yr-${i}`} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '12px 18px', flex: '1 1 min-content', minWidth: 200, boxShadow: '0 10px 24px -20px color-mix(in srgb, var(--color-surface-900) 36%, transparent)' }}>
                    <div className="app-skeleton" style={{ width: 100, height: 16, marginBottom: 12, borderRadius: 4 }} />
                    <div className="app-skeleton" style={{ width: '80%', height: 32, marginBottom: 8, borderRadius: 6 }} />
                    <div className="app-skeleton" style={{ width: 140, height: 14, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <div className="sales-report-kpis flex-wrap" style={{ display: 'flex', gap: 12 }}>
                {Array.from({ length: selGroups?.length || 6 }).map((_, i) => (
                  <div key={`kpi-skeleton-grp-${i}`} style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '12px 18px', flex: '1 1 200px', minWidth: 180, boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)' }}>
                    <div className="app-skeleton" style={{ width: 120, height: 16, marginBottom: 12, borderRadius: 4 }} />
                    <div className="app-skeleton" style={{ width: '80%', height: 32, marginBottom: 8, borderRadius: 6 }} />
                    <div className="app-skeleton" style={{ width: 140, height: 14, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <div className="app-skeleton rounded-lg" style={{ width: '100%', height: 600, borderRadius: 12 }} />
            </div>
          )}

          {(!loading) && (
            <>
              <div className="sales-report-kpis flex-wrap" style={{ display: 'flex', gap: 12, marginBottom: 1 }}>
                {displayYears.map((yr, yIdx) => (
                  <div
                    key={yr}
                    className="kpi-card"
                    style={{
                      background: 'var(--color-surface-0)',
                      border: '1px solid var(--color-border-light)',
                      borderLeft: `4px solid ${YEAR_COLORS[yIdx % YEAR_COLORS.length] || 'var(--color-border-light)'}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      flex: '1 1 200px',
                      minWidth: 180,
                      boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)' }}>
                      {metric === 'qty' ? <Hash size={14} /> : <DollarSign size={14} />}
                      <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, textTransform: 'capitalize', letterSpacing: 0 }}>
                        Year {yr} {metric === 'qty' ? '(PCS)' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--erp-text-kpi)', fontWeight: 900, color: yIdx === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: 0, marginTop: 2 }}>
                      {fmtCurr(tableData.colTotals[`${yr}_total`] || 0)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Groups Growth KPI Cards */}
              {groupKpis.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div className="sales-report-kpis flex-wrap" style={{ display: 'flex', gap: 12 }}>
                    {groupKpis.map((g: any) => {
                      const sortedYearsDesc = [...activeYears].map(String).sort((y1, y2) => Number(y2) - Number(y1));
                      const cardBaseYear = sortedYearsDesc[0] || activeYears[0];
                      const cardCompYear = kpiCompareYear && activeYears.includes(kpiCompareYear) && kpiCompareYear !== cardBaseYear
                        ? kpiCompareYear
                        : (sortedYearsDesc.length > 1 ? sortedYearsDesc.find(y => y !== cardBaseYear) || null : null);

                      const bTotal = g.totals[cardBaseYear] || 0;
                      const cTotal = cardCompYear ? (g.totals[cardCompYear] || 0) : 0;

                      let diff = null;
                      let pct = null;
                      if (cardCompYear) {
                        if (bTotal > 0 || cTotal > 0) diff = bTotal - cTotal;
                        if (cTotal > 0) pct = ((bTotal - cTotal) / cTotal) * 100;
                      }

                      const isUp = diff !== null && diff > 0;
                      const isDown = diff !== null && diff < 0;

                      return (
                        <div
                          key={g.id}
                          className="kpi-card"
                          style={{
                            background: 'var(--color-surface-0)',
                            border: '1px solid var(--color-border-light)',
                            borderLeft: `4px solid ${g.color || 'var(--color-border-light)'}`,
                            borderRadius: 8,
                            padding: '12px 16px',
                            flex: '1 1 200px',
                            minWidth: 180,
                            boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{g.label}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>{cardBaseYear}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
                                {fmtCurr(bTotal)}
                              </div>
                              {diff !== null && cardCompYear && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 900,
                                      color: isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <span>
                                      {isUp ? '↑ ' : isDown ? '↓ ' : ''}
                                      {metric === 'qty' ? Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '$' + Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      {pct !== null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`}
                                    </span>
                                  </span>
                                  <span style={{ fontSize: '0.62rem', opacity: 0.75, color: 'var(--color-text-quaternary)', fontWeight: 800 }}>
                                    vs {cardCompYear}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="sales-report-table-region">
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <CustomerReportTable
                loading={loading}
                baseYear={baseYear}
                viewMode={viewMode}
                setViewMode={setViewMode}
                aggregationMode={aggregationMode}
                setAggregationMode={setAggregationMode}
                tableData={tableData}
                displayYears={displayYears}
                displayMonths={displayMonths}
                currentYearStr={currentYearStr}
                currentMonthIdx={currentMonthIdx}
                growthComparisons={growthComparisons}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                metric={metric}
                setMetric={handleSetMetric}
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
