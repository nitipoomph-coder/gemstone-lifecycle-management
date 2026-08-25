import { pageShell } from '../components/infographic/InfographicSalesTrends';
import {
  CustomerTrendsLoadingState,
  TrendComparisonChart,
  TypeContribution,
  SummaryMetric,
  KpiTypeSelect,
} from '../components/infographic/InfographicSalesTrends';
import { RefreshCw } from 'lucide-react';
import '../components/sales/SalesDenseTable.css';
import './OrderVolumeSummaryPage.css';
import { printChartDashboard } from '../utils/printChart';
import { DeliveryAndDepartmentOutlook } from '../components/sales/DeliveryAndDepartmentOutlook';
import { useOrderVolumeSummaryData, fmtMetric, fmtSignedMetric, fmtQty, fmtPercent } from '../hooks/useOrderVolumeSummaryData';
import { VolumeFilterBar } from '../components/dashboard/orderVolume/VolumeFilterBar';
import { VolumeOrdersTable } from '../components/dashboard/orderVolume/VolumeOrdersTable';

export default function OrderVolumeSummaryPage() {
  const data = useOrderVolumeSummaryData();
  const {
    metric, switchMetric,
    activeView, setActiveView,
    drilldown, resetDrilldown,
    monthlyData, typeData, deliveryOutlookData,
    selectedBucket, handleSelectBucket,
    selectedDepartment, handleSelectDepartment,
    selectedCustCode, handleSelectCustCode,
    drilldownOrders, drilldownLoading,
    loading, error, hasResolvedData, retryLoad, loadOverviewData,
    search, setSearch, clearSearch, handleSearchKeyDown,
    page, setPage,
    primaryYear, compareYear, hasCompareYear,
    primaryMetric, selectedTypeTotals,
    kpiPrimaryMetric, kpiCompareMetric, kpiChangeAmount, kpiGrowthRate, kpiDeliveryRate, kpiOutstandingMetric,
    selectedKpiType, setSelectedKpiType,
    monthlyComparisonData, typeContribution,
    filteredOrderRows,
    selectedGroups,
    openChartDetail
  } = data;

  const selectedYearSummary = hasCompareYear ? `${primaryYear} vs ${compareYear}` : primaryYear || '-';
  const selectedGroupSummary = selectedGroups.length === 0 ? 'All groups' : `${selectedGroups.length} groups`;
  const hasOverviewData = monthlyData.length > 0 || typeData.length > 0;
  const loadingScopeSummary = primaryYear ? `${selectedYearSummary} / ${selectedGroupSummary} / ${metric === 'amount' ? 'Sales ($)' : 'Quantity (PCS)'}` : 'Preparing available reporting periods';
  const loadFailure = !hasResolvedData ? error : '';
  const orderCountHint = selectedTypeTotals.isFiltered
    ? `${selectedTypeTotals.typeName}`
    : `${fmtQty(typeData.filter(r => r.year === Number(primaryYear)).reduce((s, r) => s + r.orderCount, 0))} Total orders`;

  const handlePrint = () => {
    const title = `Order_Trends_${activeView}_${primaryYear}_${metric}`;
    printChartDashboard(title);
  };

  return (
    <>
      <div className="content-scrollbar flex-1 overflow-y-auto" style={pageShell}>
        <div className={`app-content-frame app-content-frame--workspace app-page-content customer-trends-page customer-trends-page--${activeView}`}>
          <VolumeFilterBar
            metric={metric}
            switchMetric={switchMetric}
            activeView={activeView}
            setActiveView={setActiveView}
            resetDrilldown={resetDrilldown}
            setDrilldownOrders={() => {}} // Hook manages this, or pass a handler
            loading={loading}
            loadOverviewData={loadOverviewData}
            handlePrint={handlePrint}
          />

          {loading ? (
            <CustomerTrendsLoadingState
              activeView={activeView}
              granularity="monthly"
              scopeSummary={loadingScopeSummary}
            />
          ) : loadFailure ? (
            <div className="customer-trends-load-failure" role="alert">
              <div className="customer-trends-error">
                <span>{loadFailure}</span>
                <button type="button" onClick={retryLoad}><RefreshCw size={13} />Retry</button>
              </div>
            </div>
          ) : (
            <>
              {activeView === 'overview' && (
                <section className="customer-trends-summary" aria-label="Selected period summary">
                  <SummaryMetric
                    label={`Ordered ${metric === 'amount' ? 'Amount' : 'Qty'} ${primaryYear || '-'}`}
                    value={fmtMetric(kpiPrimaryMetric, metric)}
                    hint={selectedTypeTotals.isFiltered ? `${selectedTypeTotals.typeName}` : 'Primary year'}
                  />
                  <SummaryMetric
                    label={`Ordered ${metric === 'amount' ? 'Amount' : 'Qty'} ${hasCompareYear ? compareYear : '-'}`}
                    value={hasCompareYear ? fmtMetric(kpiCompareMetric, metric) : '-'}
                    hint={selectedTypeTotals.isFiltered ? `${selectedTypeTotals.typeName}` : 'Compare year'}
                    muted={!hasCompareYear}
                  />
                  <SummaryMetric
                    label={hasCompareYear ? `Change vs ${compareYear}` : 'Change'}
                    value={hasCompareYear ? fmtSignedMetric(kpiChangeAmount, metric) : '-'}
                    hint={kpiGrowthRate === null ? 'No comparison baseline' : fmtPercent(kpiGrowthRate)}
                    tone={!hasCompareYear || kpiChangeAmount === 0 ? undefined : kpiChangeAmount < 0 ? 'down' : 'up'}
                    muted={!hasCompareYear}
                  />
                  <SummaryMetric
                    label="Order Count"
                    value={fmtQty(selectedTypeTotals.primary.orders)}
                    hint={selectedTypeTotals.isFiltered ? `${selectedTypeTotals.typeName}` : orderCountHint}
                    control={<KpiTypeSelect value={selectedKpiType} onChange={setSelectedKpiType} />}
                  />
                  <SummaryMetric
                    label="Delivery Rate"
                    value={`${kpiDeliveryRate.toFixed(1)}%`}
                    hint={`${fmtQty(selectedTypeTotals.primary.shippedQty)} / ${fmtQty(selectedTypeTotals.primary.qty)} qty`}
                    tone={kpiDeliveryRate >= 100 ? 'up' : undefined}
                  />
                  <SummaryMetric
                    label={`Outstanding ${metric === 'amount' ? 'Balance' : 'Qty'}`}
                    value={fmtMetric(kpiOutstandingMetric, metric)}
                    hint={`${fmtQty(selectedTypeTotals.primary.orders)} orders`}
                  />
                </section>
              )}

              {error && (
                <div role="alert" className="customer-trends-error">
                  <span>{error}</span>
                  <button type="button" onClick={() => void loadOverviewData()}><RefreshCw size={13} />Retry</button>
                </div>
              )}

              {activeView === 'overview' && (
                <section id="customer-trends-overview-panel" className="customer-trends-overview">
                  <div className="customer-trends-overview__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2>Monthly Comparison & Product Type Breakdown</h2>
                      <span>{selectedYearSummary} / {metric === 'amount' ? 'Sales Amount ($)' : 'Ordered Quantity (PCS)'}</span>
                    </div>
                  </div>
                  {!hasOverviewData && !deliveryOutlookData ? (
                    <div className="customer-trends-empty">
                      <strong>No data for the current scope</strong>
                    </div>
                  ) : (
                    <>
                      {hasOverviewData && (
                        <div className="customer-trends-overview__body">
                          <div className="customer-trends-chart-area">
                            <TrendComparisonChart
                              data={monthlyComparisonData}
                              reportYear={primaryYear}
                              compareYear={hasCompareYear ? compareYear : undefined}
                              metric={metric}
                              granularity="monthly"
                              onDrilldown={openChartDetail}
                            />
                          </div>
                          <TypeContribution
                            rows={typeContribution}
                            metric={metric}
                            year={primaryYear}
                            compareYear={hasCompareYear ? compareYear : undefined}
                            total={primaryMetric}
                            onDrilldown={openChartDetail}
                          />
                        </div>
                      )}
                      <DeliveryAndDepartmentOutlook
                        data={deliveryOutlookData}
                        metric={metric}
                        year={primaryYear}
                        loading={loading}
                        selectedBucket={selectedBucket}
                        selectedDepartment={selectedDepartment}
                        selectedCustCode={selectedCustCode}
                        onSelectBucket={handleSelectBucket}
                        onSelectDepartment={handleSelectDepartment}
                        onSelectCustCode={handleSelectCustCode}
                      />
                    </>
                  )}
                </section>
              )}

              {activeView === 'details' && (
                <VolumeOrdersTable
                  drilldown={drilldown}
                  drilldownLoading={drilldownLoading}
                  drilldownOrders={drilldownOrders}
                  filteredOrderRows={filteredOrderRows}
                  search={search}
                  setSearch={setSearch}
                  clearSearch={clearSearch}
                  handleSearchKeyDown={handleSearchKeyDown}
                  resetDrilldown={resetDrilldown}
                  page={page}
                  setPage={setPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
