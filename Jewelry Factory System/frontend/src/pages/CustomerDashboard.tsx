import { useState, useMemo, useEffect, useCallback } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { DollarSign, Hash, Calendar, CalendarDays, Layers, Users, Eye, EyeOff } from 'lucide-react';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS } from '../config/customerGroups';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import { printChartDashboard } from '../utils/printChart';
import { useTheme } from '../contexts/useTheme';
import { useCustomerSalesData, type Metric, type CustomerSummaryRow } from '../hooks/useCustomerSalesData';
import { CustomerSalesChart } from '../components/dashboard/customerSales/CustomerSalesChart';
import { CustomerKpiCards } from '../components/dashboard/customerSales/CustomerKpiCards';
import { CustomerDashboardSkeleton } from '../components/dashboard/customerSales/CustomerDashboardSkeleton';
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


  const activeYears = useMemo(() => [...selectedYears].sort(), [selectedYears]);

  const handlePrint = useCallback(() => {
    const scopeYears = activeYears.join('-');
    const title = `Customer_Sales_Chart_${mode}_${metric}_${scopeYears || 'all'}`;
    printChartDashboard(title);
  }, [activeYears, mode, metric]);

  // Listen to GlobalTopbar app-print event
  useEffect(() => {
    const onPrint = () => handlePrint();
    window.addEventListener('app-print', onPrint);
    return () => window.removeEventListener('app-print', onPrint);
  }, [handlePrint]);

  // Fetch all data for available years
  useEffect(() => {
    if (!availableYears || availableYears.length === 0) {
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

  // Listen to GlobalTopbar app-export event
  useEffect(() => {
    const handleExportEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string }>;
      const exportType = customEvent.detail?.type;
      if (!chartData || chartData.length === 0) return;

      customEvent.preventDefault();

      const keys = Object.keys(chartData[0] || {}).filter(k => k !== 'sortKey');
      const filename = `Sales_Summary_${mode}_${metric}_${new Date().toISOString().slice(0, 10)}`;

      if (exportType === 'csv') {
        const headerRow = keys.join(',');
        const dataRows = chartData.map(row =>
          keys.map(k => {
            const val = row[k];
            if (typeof val === 'number') return val;
            return `"${String(val ?? '').replace(/"/g, '""')}"`;
          }).join(',')
        );
        const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (exportType === 'excel') {
        const tableHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head><meta charset="utf-8"/></head>
          <body>
            <table>
              <thead>
                <tr style="background-color: #2563eb; color: #ffffff; font-weight: bold;">
                  ${keys.map(k => `<th>${k.toUpperCase()}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${chartData.map(row => `
                  <tr>
                    ${keys.map(k => `<td>${row[k] ?? ''}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.xls`;
        link.click();
        URL.revokeObjectURL(url);
      }
    };

    window.addEventListener('app-export', handleExportEvent);
    return () => window.removeEventListener('app-export', handleExportEvent);
  }, [chartData, mode, metric]);

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

  if (loading) {
    return <CustomerDashboardSkeleton sortedSel={sortedSel} activeYears={activeYears} />;
  }

  return (
    <>
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--workspace app-page-content sales-summary-page" style={{ paddingTop: 16 }}>

          {/* Internal Dashboard Filter Bar */}
          <div className="no-print sales-summary-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)', borderRadius: '8px 8px 0 0', marginBottom: 16 }}>
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
