import { pageShell } from '../components/infographic/InfographicSalesTrends';
import {
  CustomerTrendsLoadingState,
  SummaryMetric,
} from '../components/infographic/InfographicSalesTrends';
import { RefreshCw } from 'lucide-react';
import '../components/sales/SalesDenseTable.css';
import './OrderVolumeSummaryPage.css';
import { printChartDashboard } from '../utils/printChart';
import { DeliveryAndDepartmentOutlook } from '../components/sales/DeliveryAndDepartmentOutlook';
import { useOrderVolumeSummaryData, fmtMetric, fmtQty } from '../hooks/useOrderVolumeSummaryData';
import { VolumeFilterBar } from '../components/dashboard/orderVolume/VolumeFilterBar';
import { VolumeOrdersTable } from '../components/dashboard/orderVolume/VolumeOrdersTable';
import { RiskCustomerChart } from '../components/dashboard/orderVolume/RiskCustomerChart';
import { RiskMonthlyTable } from '../components/dashboard/orderVolume/RiskMonthlyTable';

export default function OrderVolumeSummaryPage() {
  const data = useOrderVolumeSummaryData();
  const {
    metric, switchMetric,
    activeView, setActiveView,
    drilldown, resetDrilldown,
    monthlyData, deliveryOutlookData,
    selectedBucket, handleSelectBucket,
    selectedDepartment, handleSelectDepartment,
    selectedCustCode, handleSelectCustCode,
    drilldownOrders, drilldownLoading,
    loading, error, hasResolvedData, retryLoad, loadOverviewData,
    search, setSearch, clearSearch, handleSearchKeyDown,
    page, setPage,
    primaryYear, compareYear, hasCompareYear,
    filteredOrderRows,
    selectedGroups
  } = data;

  const selectedYearSummary = hasCompareYear ? `${primaryYear} vs ${compareYear}` : primaryYear || '-';
  const selectedGroupSummary = selectedGroups.length === 0 ? 'All groups' : `${selectedGroups.length} groups`;
  const hasOverviewData = monthlyData.length > 0;
  const loadingScopeSummary = primaryYear ? `${selectedYearSummary} / ${selectedGroupSummary} / ${metric === 'amount' ? 'Sales ($)' : 'Quantity (PCS)'}` : 'Preparing available reporting periods';
  const loadFailure = !hasResolvedData ? error : '';

  // --- New Risk KPIs ---
  const getBucketStats = (name: string) => {
    const buckets = deliveryOutlookData?.buckets || [];
    const b = buckets.find(x => x.bucket?.toLowerCase() === name.toLowerCase());
    return {
      qty: b?.openQty || 0,
      amount: b?.openAmount || 0,
      orders: b?.orderCount || 0
    };
  };

  const overdue = getBucketStats('Overdue');
  const due15 = getBucketStats('Due in 15 Days');
  
  const totalWIP = (deliveryOutlookData?.departments || []).reduce((acc, d) => {
    return {
      qty: acc.qty + (d.openQty || 0),
      amount: acc.amount + (d.openAmount || 0)
    };
  }, { qty: 0, amount: 0 });

  const sortedDepts = [...(deliveryOutlookData?.departments || [])].sort((a, b) => (b.openQty || 0) - (a.openQty || 0));
  const topBottleneck = sortedDepts.length > 0 ? sortedDepts[0] : null;

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
                <section className="customer-trends-summary" aria-label="Risk and WIP summary">
                  <SummaryMetric
                    label="🔴 Total Overdue"
                    value={metric === 'amount' ? fmtMetric(overdue.amount, 'amount') : fmtMetric(overdue.qty, 'qty')}
                    hint={`${fmtQty(overdue.orders)} orders at risk`}
                    tone="down"
                  />
                  <SummaryMetric
                    label="🟡 Due in 15 Days"
                    value={metric === 'amount' ? fmtMetric(due15.amount, 'amount') : fmtMetric(due15.qty, 'qty')}
                    hint={`${fmtQty(due15.orders)} orders pending`}
                    tone="down"
                  />
                  <SummaryMetric
                    label="🔵 Total WIP (Factory)"
                    value={metric === 'amount' ? fmtMetric(totalWIP.amount, 'amount') : fmtMetric(totalWIP.qty, 'qty')}
                    hint="Open work-in-process"
                  />
                  <SummaryMetric
                    label="🏭 Top Bottleneck"
                    value={topBottleneck ? topBottleneck.department : '-'}
                    hint={topBottleneck ? `${metric === 'amount' ? fmtMetric(topBottleneck.openAmount, 'amount') : fmtMetric(topBottleneck.openQty, 'qty')} pending` : 'No bottlenecks'}
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
                      <h2>WIP & Late Delivery Risk Analysis</h2>
                      <span>{selectedYearSummary} / {metric === 'amount' ? 'Sales Amount ($)' : 'Ordered Quantity (PCS)'}</span>
                    </div>
                  </div>
                  {!hasOverviewData && !deliveryOutlookData ? (
                    <div className="customer-trends-empty">
                      <strong>No data for the current scope</strong>
                    </div>
                  ) : (
                    <>
                      {hasOverviewData && data.riskData && (
                        <div className="customer-trends-overview__body" style={{ flexDirection: 'column' }}>
                          <div className="customer-trends-chart-area" style={{ width: '100%', marginBottom: '24px' }}>
                            <RiskCustomerChart
                              riskData={data.riskData}
                              metric={metric}
                              selectedGroups={data.selectedGroups}
                            />
                          </div>
                          
                          <div style={{ width: '100%' }}>
                            <RiskMonthlyTable
                              riskData={data.riskData}
                              metric={metric}
                              selectedGroups={data.selectedGroups}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div style={{ marginTop: '32px' }}>
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
                      </div>
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
