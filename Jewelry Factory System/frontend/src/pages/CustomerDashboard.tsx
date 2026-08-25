import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { RefreshCw, DollarSign, Hash, Calendar, CalendarDays, Layers, Users, Eye, EyeOff, Printer } from 'lucide-react';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS } from '../config/customerGroups';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import { printChartDashboard } from '../utils/printChart';
import { useTheme } from '../contexts/useTheme';
import { useCustomerSalesData, type Metric, type CustomerSummaryRow } from '../hooks/useCustomerSalesData';
import { CustomerSalesChart } from '../components/dashboard/CustomerSalesChart';
import { CustomerKpiCards } from '../components/dashboard/CustomerKpiCards';
import { CustomerDashboardSkeleton } from '../components/dashboard/CustomerDashboardSkeleton';
import './CustomerDashboard.css';

const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];

export default function CustomerDashboard({ metric: propMetric = 'amount' }: { metric?: Metric }) {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const metric = (searchParams.get('metric') as Metric) || propMetric;
  const { selectedYears, selectedMonths, selGroups, availableYears, kpiCompareYear } = useOutletContext<any>();
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


  const activeYears = [...selectedYears].sort();

  const handlePrint = () => {
    const scopeYears = activeYears.join('-');
    const title = `Customer_Sales_Chart_${mode}_${metric}_${scopeYears || 'all'}`;
    printChartDashboard(title);
  };

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

  const {
    chartData,
    summaries,
    yearSummaries,
    grandTotal,
    grandYoy,
    grandLatestYear
  } = useCustomerSalesData({
    custData,
    availableYears,
    activeYears,
    selectedMonths,
    sortedSel,
    metric,
    mode,
    monthlySeries,
    kpiCompareYear
  });

  const usesGroupSeriesColors = monthlySeries === 'group';

  const switchMetric = (nextMetric: Metric) => {
    if (nextMetric === metric) return;
    const nextParams = new URLSearchParams(searchParams);
    if (nextMetric === 'qty') {
      nextParams.set('metric', 'qty');
    } else {
      nextParams.delete('metric');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const resetSummaryView = () => {
    setMode('yearly');
    setMonthlySeries('year');
    setShowLabels(true);
  };

  if (loading) {
    return <CustomerDashboardSkeleton sortedSel={sortedSel} activeYears={activeYears} />;
  }

  return (
    <>
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--workspace app-page-content sales-summary-page" style={{ paddingTop: 16 }}>

          {/* Internal Dashboard Filter Bar */}
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)', borderRadius: '8px 8px 0 0', marginBottom: 16 }}>
            <h2 style={{ fontSize: 'var(--erp-text-section)', fontWeight: 900, color: 'var(--color-text-primary)', margin: 0 }}>
              Sales Summary
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ErpSegmentedControl ariaLabel="Metric" value={metric} onChange={(v) => switchMetric(v as Metric)} options={[{ value: 'amount', label: 'Sales', icon: <DollarSign size={13} /> }, { value: 'qty', label: 'Qty', icon: <Hash size={13} /> }]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="View" value={mode} onChange={(v) => setMode(v as 'yearly' | 'monthly')} options={[{ value: 'yearly', label: 'Year', icon: <CalendarDays size={13} /> }, { value: 'monthly', label: 'Month', icon: <Calendar size={13} /> }]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="Series" value={monthlySeries} onChange={(v) => setMonthlySeries(v as 'year' | 'group')} options={[{ value: 'year', label: 'By Year', icon: <Layers size={13} /> }, { value: 'group', label: 'By Group', icon: <Users size={13} /> }]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="Labels" value={showLabels ? 'on' : 'off'} onChange={(v) => setShowLabels(v === 'on')} options={[{ value: 'on', label: 'Show Labels', icon: <Eye size={13} /> }, { value: 'off', label: 'Hide Labels', icon: <EyeOff size={13} /> }]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <button
                type="button"
                disabled={loading}
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)',
                  fontSize: 'var(--erp-text-control)',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Print current page or Save as PDF (Ctrl+P)"
              >
                <Printer size={13} style={{ color: 'var(--color-brand-600)' }} />
                <span>Print / PDF</span>
              </button>
              <button onClick={resetSummaryView} style={{ background: "none", border: "none", padding: "6px", color: "var(--color-text-tertiary)", cursor: "pointer", marginLeft: 8 }} title="Reset View"><RefreshCw size={14} /></button>
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
                <CustomerSalesChart 
                  chartData={chartData} 
                  metric={metric} 
                  mode={mode} 
                  monthlySeries={monthlySeries} 
                  showLabels={showLabels} 
                  sortedSel={sortedSel} 
                  activeYears={activeYears} 
                />
              </div>
            </div>

            <CustomerKpiCards 
              yearSummaries={yearSummaries} 
              groupSummaries={summaries} 
              activeYears={activeYears} 
              metric={metric} 
              monthlySeries={monthlySeries} 
              sortedSel={sortedSel} 
            />

          </div>
        </div>
      </div>
    </>
  );
}
