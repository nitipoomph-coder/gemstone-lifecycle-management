import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import {
  SearchBox,
  EmptyRow,
  orderPanel, panelTitle, panelHeaderRight, panelMeta, tableScroll, tdStrongCenter, tdStrong, tdCenter, td, tdStrongRight, linkButton, paginationBar, paginationText, paginationButtons, pageButton, pageButtonDisabled, pageText
} from '../../infographic/InfographicSalesTrends';
import type { SalesOrderRow } from '../../../services/orderVolumeSummaryAPI';
import type { Drilldown } from '../../../hooks/useOrderVolumeSummaryData';
import { fmtQty, ORDER_DETAIL_COLUMNS } from '../../../hooks/useOrderVolumeSummaryData';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE_SIZE = 50;

interface VolumeOrdersTableProps {
  drilldown: Drilldown | null;
  drilldownLoading: boolean;
  drilldownOrders: SalesOrderRow[];
  filteredOrderRows: SalesOrderRow[];
  search: string;
  setSearch: (s: string) => void;
  clearSearch: () => void;
  handleSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  resetDrilldown: () => void;
  page: number;
  setPage: (p: number) => void;
}

export function VolumeOrdersTable({
  drilldown,
  drilldownLoading,
  drilldownOrders,
  filteredOrderRows,
  search,
  setSearch,
  clearSearch,
  handleSearchKeyDown,
  resetDrilldown,
  page,
  setPage
}: VolumeOrdersTableProps) {
  const navigate = useNavigate();
  const totalPages = Math.max(1, Math.ceil(filteredOrderRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredOrderRows.length);
  const pageRows = filteredOrderRows.slice(pageStart, pageEnd);

  return (
    <>
      {drilldown && (
        <div className="customer-trends-drilldown" role="status">
          <span>Drill-down</span>
          {drilldown.basis === 'due' && <strong>Customer Due</strong>}
          <strong>{drilldown.year}</strong>
          <strong>
            {drilldown.week
              ? `W${String(drilldown.week).padStart(2, '0')}`
              : drilldown.month
                ? MONTHS[Number(drilldown.month) - 1]
                : 'Selected Dates'}
          </strong>
          {drilldown.type && <strong>{drilldown.type}</strong>}
          {drilldown.basis === 'due' && <strong>Quantity</strong>}
          <button type="button" onClick={resetDrilldown}><X size={13} />Clear</button>
        </div>
      )}
      <section id="customer-trends-details-panel" className={['sales-dense-panel', filteredOrderRows.length > PAGE_SIZE ? 'sales-dense-panel--static-rows' : ''].filter(Boolean).join(' ')} style={orderPanel}>
        <div className="sales-dense-panel__header customer-trends-order-header">
          <h2 style={panelTitle}>Order Details</h2>
          <div className="customer-trends-order-actions" style={panelHeaderRight}>
            <div className="customer-trends-order-search">
              <SearchBox
                value={search}
                onChange={value => setSearch(value.toUpperCase())}
                onKeyDown={handleSearchKeyDown}
                onClear={clearSearch}
              />
            </div>
            <span style={panelMeta}>
              {drilldownLoading
                ? 'Loading...'
                : `Showing ${filteredOrderRows.length === 0 ? 0 : pageStart + 1}-${pageEnd} of ${fmtQty(filteredOrderRows.length)} rows`}
            </span>
          </div>
        </div>
        <div className="content-scrollbar sales-dense-scroll" style={tableScroll}>
          {drilldownLoading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 'var(--erp-text-control)', fontWeight: 800 }}>Loading order details...</p>
            </div>
          ) : !drilldown && drilldownOrders.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              <p style={{ fontSize: 'var(--erp-text-control)', fontWeight: 800 }}>Click a chart bar or type to view order details</p>
            </div>
          ) : (
            <table className="sales-dense-table sales-dense-table--sticky-first" style={{ width: '100%', minWidth: 1600 }}>
              <thead>
                <tr>
                  {ORDER_DETAIL_COLUMNS.map(([head, width]: any, index: any) => (
                    <th
                      key={head}
                      className={index >= 15 ? 'sales-dense-table__number' : undefined}
                      style={{ width: Number(width) }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrderRows.length === 0 && <EmptyRow colSpan={20} label="No order item lines match the current filters." />}
                {pageRows.map(row => {
                  const isOverdue = row.dueRiskBucket === 'Overdue';
                  const isDue15 = row.dueRiskBucket === 'Due in 15 Days';
                  const isDue30 = row.dueRiskBucket === 'Due in 16-30 Days';

                  return (
                    <tr key={`${row.orderNo}-${row.itemNo}-${row.ordDate}-${row.custDate}`}>
                      <td style={tdStrongCenter}>{row.orderNo}</td>
                      <td style={tdStrong}>{row.poNo || '-'}</td>
                      <td style={tdStrong}>{row.po2 || '-'}</td>
                      <td style={tdStrongCenter}>
                        <span style={{ fontWeight: 900, color: 'var(--color-brand-600)' }}>
                          {row.customerCode}
                        </span>
                      </td>
                      <td style={{ ...tdCenter, fontWeight: isOverdue || isDue15 ? 900 : 700, color: isOverdue ? 'var(--color-danger-600)' : isDue15 ? 'var(--color-warning-600)' : 'inherit' }}>
                        {row.custDate ? new Date(row.custDate).toISOString().slice(0, 10) : '-'}
                      </td>
                      <td style={tdCenter}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'var(--color-surface-2)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border-light)'
                        }}>
                          {row.currentDepartment || 'Wax'}
                        </span>
                      </td>
                      <td style={tdCenter}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isOverdue ? 'var(--color-danger-50)' : isDue15 ? 'var(--color-warning-50)' : isDue30 ? 'var(--color-success-50)' : 'var(--color-brand-50)',
                          color: isOverdue ? 'var(--color-danger-600)' : isDue15 ? 'var(--color-warning-600)' : isDue30 ? 'var(--color-success-600)' : 'var(--color-brand-700)'
                        }}>
                          {row.dueRiskBucket || 'Scheduled'}
                        </span>
                      </td>
                      <td style={tdStrong}>{row.shipTo || '-'}</td>
                      <td style={tdStrongCenter}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(row.itemNo)}`)} style={linkButton}>{row.itemNo}</button></td>
                      <td style={tdStrongCenter}>{row.productTypeCode || '-'}</td>
                      <td style={tdStrongCenter}>{row.custItem || '-'}</td>
                      <td style={tdCenter}>{row.itemMat || '-'}</td>
                      <td style={td}>{row.itemSize || '-'}</td>
                      <td style={td}>{row.itemStone || '-'}</td>
                      <td style={tdStrongRight}>{row.itemPlate || '-'}</td>
                      <td style={tdStrongRight}>{row.orderQty}</td>
                      <td style={tdStrongRight}>{row.shippedQty}</td>
                      <td style={{ ...tdStrongRight, color: row.openQty > 0 ? 'var(--color-brand-600)' : 'inherit' }}>{row.openQty || 0}</td>
                      <td style={tdStrongRight}>{row.itemPrice !== undefined ? `$${Number(row.itemPrice).toFixed(2)}` : '-'}</td>
                      <td style={tdStrongRight}>{row.itemAmnt !== undefined ? `$${Number(row.itemAmnt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {filteredOrderRows.length > PAGE_SIZE && (
          <div className="sales-dense-pagination" style={paginationBar}>
            <div style={paginationText}>Showing {filteredOrderRows.length === 0 ? 0 : pageStart + 1}-{pageEnd} of {fmtQty(filteredOrderRows.length)}</div>
            <div style={paginationButtons}>
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} title="Previous page" style={{ ...pageButton, ...(currentPage <= 1 ? pageButtonDisabled : null) }}><ChevronLeft size={14} /></button>
              <span style={pageText}>Page {currentPage} / {totalPages}</span>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} title="Next page" style={{ ...pageButton, ...(currentPage >= totalPages ? pageButtonDisabled : null) }}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
