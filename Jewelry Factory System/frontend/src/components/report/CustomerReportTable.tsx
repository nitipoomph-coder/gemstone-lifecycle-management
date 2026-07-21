import React from 'react';
import { ArrowDown, ArrowUp, Download, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { ErpButton, ErpIconButton, ErpSegmentedControl } from '../ui/ErpButtons';
import './CustomerReportTable.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CustomerReportRow extends Record<string, unknown> {
  id: string;
  label: string;
  topItem?: string;
  topItemQty?: number;
}

interface CustomerReportTableProps {
  loading: boolean;
  baseYear: string;
  viewMode: 'ytd' | 'monthly';
  setViewMode?: (v: 'ytd' | 'monthly') => void;
  tableData: {
    rows: CustomerReportRow[];
    colTotals: Record<string, number>;
    activeYears: string[];
  };
  displayYears: string[];
  displayMonths: string[];
  currentYearStr: string;
  currentMonthIdx: number;
  growthComparisons: { a: string; b: string }[];
  sortOrder: 'desc' | 'asc';
  setSortOrder: (v: 'desc' | 'asc') => void;
  metric: string;
  fmt: (val: number) => string;
  renderGrowthAmt: (baseVal: number, compVal: number) => { node: React.ReactNode, bgColor: string };
  renderGrowthPct: (baseVal: number, compVal: number, isTrulyNew?: boolean) => { node: React.ReactNode, bgColor: string };
  searchQuery?: string;
  setSearchQuery?: (value: string) => void;
  showFilters?: boolean;
  setShowFilters?: (value: boolean) => void;
  onResetMatrix?: () => void;
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function saveCsv(fileName: string, rows: unknown[][]) {
  const body = rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([`\ufeff${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

type MatrixSkeletonStyle = React.CSSProperties & {
  '--matrix-skeleton-columns'?: number;
  '--matrix-skeleton-width'?: string;
};

export default function CustomerReportTable({
  loading,
  baseYear,
  viewMode,
  setViewMode,
  tableData,
  displayYears,
  displayMonths,
  currentYearStr,
  currentMonthIdx,
  growthComparisons,
  sortOrder,
  setSortOrder,
  metric,
  fmt,
  renderGrowthAmt,
  renderGrowthPct,
  searchQuery = '',
  setSearchQuery,
  showFilters,
  setShowFilters,
  onResetMatrix,
}: CustomerReportTableProps) {
  const activeGrowthCount = displayYears.length > 1 ? growthComparisons.length : 0;
  const [searchDraft, setSearchDraft] = React.useState(searchQuery);
  const lastAppliedSearchRef = React.useRef(searchQuery);

  React.useEffect(() => {
    if (searchQuery !== lastAppliedSearchRef.current) {
      lastAppliedSearchRef.current = searchQuery;
      setSearchDraft(searchQuery);
    }
  }, [searchQuery]);

  const applySearch = () => {
    if (!setSearchQuery) return;
    const nextSearch = searchDraft.toUpperCase();
    setSearchDraft(nextSearch);
    lastAppliedSearchRef.current = nextSearch;
    setSearchQuery(nextSearch);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') applySearch();
    if (event.key === 'Escape') setSearchDraft(searchQuery.toUpperCase());
  };

  const isSearchActive = searchDraft.trim().length > 0;

  const resetMatrix = () => {
    setSearchDraft('');
    if (onResetMatrix) {
      onResetMatrix();
      return;
    }
    setSearchQuery?.('');
    setSortOrder('desc');
  };

  const exportCsv = () => {
    const exportRows: unknown[][] = [];

    if (viewMode === 'ytd') {
      const headers = ['Customer ID'];
      displayYears.forEach((yr) => {
        displayMonths.forEach((m) => headers.push(`${yr} ${m}`));
        headers.push(`${yr} Total`);
      });
      if (displayYears.length > 1) {
        growthComparisons.forEach((comp) => {
          headers.push(`Growth ${comp.a} vs ${comp.b}`);
          headers.push(`Growth % ${comp.a} vs ${comp.b}`);
        });
      }
      exportRows.push(headers);

      tableData.rows.forEach((row) => {
        const line: unknown[] = [row.label];
        displayYears.forEach((yr) => {
          displayMonths.forEach((m) => line.push(fmt(Number(row[`${yr}_${m}`] || 0))));
          line.push(fmt(Number(row[`${yr}_total`] || 0)));
        });
        if (displayYears.length > 1) {
          growthComparisons.forEach((comp) => {
            const baseVal = Number(row[`${comp.a}_total`] || 0);
            const compVal = Number(row[`${comp.b}_total`] || 0);
            line.push(fmt(baseVal - compVal));
            line.push(compVal > 0 ? `${(((baseVal - compVal) / compVal) * 100).toFixed(1)}%` : baseVal > 0 ? 'No base' : '-');
          });
        }
        exportRows.push(line);
      });
    } else {
      const headers = ['Customer ID'];
      displayMonths.forEach((m) => {
        displayYears.forEach((yr) => headers.push(`${m} ${yr}`));
        if (displayYears.length > 1) {
          growthComparisons.forEach((comp) => {
            headers.push(`${m} Growth ${comp.a} vs ${comp.b}`);
            headers.push(`${m} Growth % ${comp.a} vs ${comp.b}`);
          });
        }
      });
      displayYears.forEach((yr) => headers.push(`Total ${yr}`));
      if (displayYears.length > 1) {
        growthComparisons.forEach((comp) => {
          headers.push(`Total Growth ${comp.a} vs ${comp.b}`);
          headers.push(`Total Growth % ${comp.a} vs ${comp.b}`);
        });
      }
      exportRows.push(headers);

      tableData.rows.forEach((row) => {
        const line: unknown[] = [row.label];
        displayMonths.forEach((m) => {
          displayYears.forEach((yr) => line.push(fmt(Number(row[`${yr}_${m}`] || 0))));
          if (displayYears.length > 1) {
            growthComparisons.forEach((comp) => {
              const baseVal = Number(row[`${comp.a}_${m}`] || 0);
              const compVal = Number(row[`${comp.b}_${m}`] || 0);
              line.push(fmt(baseVal - compVal));
              line.push(compVal > 0 ? `${(((baseVal - compVal) / compVal) * 100).toFixed(1)}%` : baseVal > 0 ? 'No base' : '-');
            });
          }
        });
        displayYears.forEach((yr) => line.push(fmt(Number(row[`${yr}_total`] || 0))));
        if (displayYears.length > 1) {
          growthComparisons.forEach((comp) => {
            const baseVal = Number(row[`${comp.a}_total`] || 0);
            const compVal = Number(row[`${comp.b}_total`] || 0);
            line.push(fmt(baseVal - compVal));
            line.push(compVal > 0 ? `${(((baseVal - compVal) / compVal) * 100).toFixed(1)}%` : baseVal > 0 ? 'No base' : '-');
          });
        }
        exportRows.push(line);
      });
    }

    saveCsv(`customer-report-matrix-${viewMode}.csv`, exportRows);
  };

  const skeletonYearCount = Math.max(displayYears.length, 2);
  const skeletonMonthCount = displayMonths.length || (viewMode === 'ytd' ? 8 : 6);
  const skeletonColumnCount = Math.min(22, Math.max(10, viewMode === 'ytd'
    ? skeletonYearCount * (skeletonMonthCount + 1) + activeGrowthCount * 2
    : (skeletonMonthCount + 1) * (skeletonYearCount + activeGrowthCount * 2)));
  const skeletonColumns = Array.from({ length: skeletonColumnCount }, (_, index) => index);
  const skeletonRows = Array.from({ length: 17 }, (_, index) => index);
  const skeletonWidths = [54, 72, 60, 84, 66, 78, 58, 70, 88, 62, 76, 56];
  const activeCurrentMonthIndex = displayMonths.findIndex((month) => MONTHS.indexOf(month) === currentMonthIdx);
  const skeletonPeriod = Math.max(skeletonMonthCount + 1, 1);
  const skeletonGridStyle: MatrixSkeletonStyle = { '--matrix-skeleton-columns': skeletonColumnCount };
  const skeletonCellStyle = (index: number): MatrixSkeletonStyle => ({
    '--matrix-skeleton-width': `${skeletonWidths[index % skeletonWidths.length]}%`,
  });
  const skeletonRowStyle = (index: number): React.CSSProperties => ({
    animationDelay: `${Math.min(index * 14, 180)}ms`,
  });
  const skeletonCellClassName = (index: number) => `customer-matrix-loading-cell ${activeCurrentMonthIndex >= 0 && index % skeletonPeriod === activeCurrentMonthIndex ? 'customer-matrix-loading-cell--current' : ''}`.trim();

  if (loading) {
    return (
      <section className="customer-matrix-shell customer-matrix-shell--loading" aria-busy="true" aria-label="Loading customer report matrix">
        <div className="customer-matrix-control-bar customer-matrix-control-bar--loading">
          <span className="customer-matrix-skeleton customer-matrix-skeleton--segment" />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--search" />
          <span className="customer-matrix-loading-status">Loading matrix...</span>
          <span className="customer-matrix-control-spacer" />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--icon" />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--icon" />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--button" />
        </div>

        <div className="customer-matrix-scroll content-scrollbar">
          <div className="customer-matrix-loading-table" style={skeletonGridStyle}>
            <div className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--header">
              <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer customer-matrix-loading-cell--header">
                <span className="customer-matrix-skeleton customer-matrix-skeleton--customer-label" />
                <span className="customer-matrix-skeleton customer-matrix-skeleton--sort" />
              </div>
              {skeletonColumns.map((columnIndex) => (
                <div key={`head_${columnIndex}`} className="customer-matrix-loading-cell customer-matrix-loading-cell--header">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--header" style={skeletonCellStyle(columnIndex)} />
                </div>
              ))}
            </div>

            <div className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--subheader">
              <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer customer-matrix-loading-cell--subheader" />
              {skeletonColumns.map((columnIndex) => (
                <div key={`sub_${columnIndex}`} className={`${skeletonCellClassName(columnIndex)} customer-matrix-loading-cell--subheader`}>
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--subheader" style={skeletonCellStyle(columnIndex + 3)} />
                </div>
              ))}
            </div>

            {skeletonRows.map((rowIndex) => (
              <div key={`row_${rowIndex}`} className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--data" style={skeletonRowStyle(rowIndex)}>
                <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--customer-id" style={skeletonCellStyle(rowIndex)} />
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--customer-sub" style={skeletonCellStyle(rowIndex + 5)} />
                </div>
                {skeletonColumns.map((columnIndex) => (
                  <div key={`cell_${rowIndex}_${columnIndex}`} className={skeletonCellClassName(columnIndex)}>
                    <span className="customer-matrix-skeleton customer-matrix-skeleton--value" style={skeletonCellStyle(columnIndex + rowIndex)} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!baseYear) {
    return (
      <div className="customer-matrix-shell">
        <div className="customer-matrix-empty">No base year selected. Please apply filters.</div>
      </div>
    );
  }

  const sortSelect = (
    <ErpButton
      size="sm"
      variant="ghost"
      icon={sortOrder === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
      title="Toggle sort order"
    >
      {sortOrder === 'desc' ? 'High First' : 'Low First'}
    </ErpButton>
  );

  const customerIdTh = (rowSpan: number) => (
    <th rowSpan={rowSpan} className="customer-matrix-th customer-matrix-th--top customer-matrix-th--customer">
      <div className="customer-matrix-sort-stack">
        <span>Customer ID</span>
        {sortSelect}
      </div>
    </th>
  );

  const renderCell = (val: number, className = '') => {
    const isAmt = metric === 'amount';
    const str = fmt(val);
    const numStr = isAmt ? str.replace('$', '') : str;
    const muted = val > 0 ? '' : 'customer-matrix-muted';
    return (
      <div className={`customer-matrix-cell-value ${muted} ${className}`.trim()}>
        {isAmt && <span className="customer-matrix-currency">$</span>}
        <span>{numStr}</span>
      </div>
    );
  };

  const isCurrentMonth = (yr: string, month: string) => yr === currentYearStr && MONTHS.indexOf(month) === currentMonthIdx;
  const isCurrentYear = (yr: string) => yr === currentYearStr;
  const totalHeaderClassName = (yr: string) => `customer-matrix-th customer-matrix-th--sub customer-matrix-td--number customer-matrix-td--total ${isCurrentYear(yr) ? 'customer-matrix-current' : ''}`.trim();
  const totalCellClassName = (yr: string) => `customer-matrix-td customer-matrix-td--number customer-matrix-td--total customer-matrix-total ${isCurrentYear(yr) ? 'customer-matrix-current' : ''}`.trim();

  return (
    <section className={['customer-matrix-shell', isSearchActive ? 'customer-matrix-shell--searching' : ''].filter(Boolean).join(' ')} aria-label="Customer report matrix">
      <div className="customer-matrix-control-bar">
        {setViewMode && (
          <ErpSegmentedControl
            ariaLabel="Matrix view mode"
            value={viewMode}
            onChange={setViewMode}
            options={[{ value: 'ytd', label: 'YTD' }, { value: 'monthly', label: 'Monthly' }]}
          />
        )}

        {setSearchQuery && (
          <label className="customer-matrix-search">
            <Search size={14} />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value.toUpperCase())}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search customer"
            />
          </label>
        )}

        <span className="customer-matrix-count">{tableData.rows.length} customers</span>
        <span className="customer-matrix-control-spacer" />

        {setShowFilters && (
          <ErpIconButton
            label={showFilters ? 'Hide filters' : 'Show filters'}
            tone="neutral"
            icon={<SlidersHorizontal size={14} />}
            onClick={() => setShowFilters(!showFilters)}
          />
        )}
        <ErpIconButton label="Reset table view" tone="refresh" icon={<RotateCcw size={14} />} onClick={resetMatrix} />
        <ErpButton size="sm" variant="secondary" icon={<Download size={14} />} onClick={exportCsv} disabled={tableData.rows.length === 0}>
          Export
        </ErpButton>
      </div>

      <div className="customer-matrix-scroll content-scrollbar">
        <table className="customer-matrix-table">
          {viewMode === 'ytd' ? (
            <>
              <thead>
                <tr>
                  {customerIdTh(2)}
                  {displayYears.map((yr) => (
                    <th key={yr} colSpan={displayMonths.length + 1} className="customer-matrix-th customer-matrix-th--top">
                      <div className="customer-matrix-year-label"><span>{yr}</span></div>
                    </th>
                  ))}
                  {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                    <th key={`growth_hdr_top_${idx}`} colSpan={2} className="customer-matrix-th customer-matrix-th--top">
                      <div className="customer-matrix-growth-label"><span>Growth</span><span>{comp.a} vs {comp.b}</span></div>
                    </th>
                  ))}
                </tr>
                <tr>
                  {displayYears.map((yr) => (
                    <React.Fragment key={yr}>
                      {displayMonths.map((m) => (
                        <th key={`${yr}_${m}`} className={`customer-matrix-th customer-matrix-th--sub customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{m}</th>
                      ))}
                      <th key={`${yr}_total`} className={totalHeaderClassName(yr)}>Total</th>
                    </React.Fragment>
                  ))}
                  {displayYears.length > 1 && growthComparisons.map((_, idx) => (
                    <React.Fragment key={`growth_hdr_sub_${idx}`}>
                      <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth">Growth</th>
                      <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth">%</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableData.rows.length === 0 ? (
                  <tr><td colSpan={1 + displayYears.length * (displayMonths.length + 1) + activeGrowthCount * 2} className="customer-matrix-empty">No customers match the current filter.</td></tr>
                ) : tableData.rows.map((row) => (
                  <tr key={row.id} className="customer-matrix-row">
                    <td className="customer-matrix-td customer-matrix-td--customer">{row.label}</td>
                    {displayYears.map((yr) => (
                      <React.Fragment key={yr}>
                        {displayMonths.map((m) => {
                          const val = Number(row[`${yr}_${m}`] || 0);
                          return <td key={`${yr}_${m}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{renderCell(val)}</td>;
                        })}
                        <td key={`${yr}_total`} className={totalCellClassName(yr)}>{renderCell(Number(row[`${yr}_total`] || 0))}</td>
                      </React.Fragment>
                    ))}
                    {displayYears.length > 1 && growthComparisons.map((comp, idx) => {
                      const amt = renderGrowthAmt(Number(row[`${comp.a}_total`] || 0), Number(row[`${comp.b}_total`] || 0));
                      const pct = renderGrowthPct(Number(row[`${comp.a}_total`] || 0), Number(row[`${comp.b}_total`] || 0), Boolean(row[`isTrulyNew_${comp.a}`]));
                      return (
                        <React.Fragment key={`growth_row_${idx}`}>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              {tableData.rows.length > 0 && (
                <tfoot className="customer-matrix-footer">
                  <tr>
                    <td className="customer-matrix-td customer-matrix-footer-label">GRAND TOTAL</td>
                    {displayYears.map((yr) => (
                      <React.Fragment key={yr}>
                        {displayMonths.map((m) => <td key={`${yr}_${m}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{renderCell(tableData.colTotals[`${yr}_${m}`] || 0)}</td>)}
                        <td key={`${yr}_total`} className={totalCellClassName(yr)}>{renderCell(tableData.colTotals[`${yr}_total`] || 0)}</td>
                      </React.Fragment>
                    ))}
                    {displayYears.length > 1 && growthComparisons.map((comp, idx) => {
                      const amt = renderGrowthAmt(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0);
                      const pct = renderGrowthPct(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0);
                      return (
                        <React.Fragment key={`growth_foot_${idx}`}>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: 'var(--matrix-header-bg)' }}>{amt.node}</td>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: 'var(--matrix-header-bg)' }}>{pct.node}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </>
          ) : (
            <>
              <thead>
                <tr>
                  {customerIdTh(2)}
                  {displayMonths.map((m) => (
                    <th key={m} colSpan={displayYears.length + activeGrowthCount * 2} className="customer-matrix-th customer-matrix-th--top">{m}</th>
                  ))}
                  <th colSpan={displayYears.length + activeGrowthCount * 2} className="customer-matrix-th customer-matrix-th--top">{metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales'}</th>
                </tr>
                <tr>
                  {displayMonths.map((m) => (
                    <React.Fragment key={m}>
                      {displayYears.map((yr) => <th key={`${m}_${yr}`} className={`customer-matrix-th customer-matrix-th--sub customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{yr}</th>)}
                      {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                        <React.Fragment key={`growth_m_hdr_${idx}`}>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth">Growth <span className="customer-matrix-muted">{comp.a}/{comp.b}</span></th>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth">%</th>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                  {displayYears.map((yr) => <th key={`tot_hdr_${yr}`} className={totalHeaderClassName(yr)}>{yr}</th>)}
                  {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                    <React.Fragment key={`growth_m_tot_hdr_${idx}`}>
                      <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth">Growth <span className="customer-matrix-muted">{comp.a}/{comp.b}</span></th>
                      <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth">%</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableData.rows.length === 0 ? (
                  <tr><td colSpan={1 + (displayMonths.length + 1) * (displayYears.length + activeGrowthCount * 2)} className="customer-matrix-empty">No customers match the current filter.</td></tr>
                ) : tableData.rows.map((row) => (
                  <tr key={row.id} className="customer-matrix-row">
                    <td className="customer-matrix-td customer-matrix-td--customer">
                      <span>{row.label}</span>
                      {metric === 'qty' && row.topItem && displayYears.some(yr => Number(row[`${yr}_total`] || 0) > 0) && <span className="customer-matrix-top-item">Top: {row.topItem} ({fmt(Number(row.topItemQty || 0))} pcs)</span>}
                    </td>
                    {displayMonths.map((m) => (
                      <React.Fragment key={m}>
                        {displayYears.map((yr) => {
                          const val = Number(row[`${yr}_${m}`] || 0);
                          return <td key={`${m}_${yr}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{renderCell(val)}</td>;
                        })}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const amt = renderGrowthAmt(Number(row[`${comp.a}_${m}`] || 0), Number(row[`${comp.b}_${m}`] || 0));
                          const pct = renderGrowthPct(Number(row[`${comp.a}_${m}`] || 0), Number(row[`${comp.b}_${m}`] || 0), Boolean(row[`isTrulyNew_${comp.a}`]));
                          return (
                            <React.Fragment key={`growth_m_row_${m}_${gIdx}`}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => <td key={`total_${yr}`} className={totalCellClassName(yr)}>{renderCell(Number(row[`${yr}_total`] || 0))}</td>)}
                    {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                      const amt = renderGrowthAmt(Number(row[`${comp.a}_total`] || 0), Number(row[`${comp.b}_total`] || 0));
                      const pct = renderGrowthPct(Number(row[`${comp.a}_total`] || 0), Number(row[`${comp.b}_total`] || 0), Boolean(row[`isTrulyNew_${comp.a}`]));
                      return (
                        <React.Fragment key={`growth_m_row_tot_${gIdx}`}>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              {tableData.rows.length > 0 && (
                <tfoot className="customer-matrix-footer">
                  <tr>
                    <td className="customer-matrix-td customer-matrix-footer-label">GRAND TOTAL</td>
                    {displayMonths.map((m) => (
                      <React.Fragment key={m}>
                        {displayYears.map((yr) => <td key={`${m}_${yr}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{renderCell(tableData.colTotals[`${yr}_${m}`] || 0)}</td>)}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const amt = renderGrowthAmt(tableData.colTotals[`${comp.a}_${m}`] || 0, tableData.colTotals[`${comp.b}_${m}`] || 0);
                          const pct = renderGrowthPct(tableData.colTotals[`${comp.a}_${m}`] || 0, tableData.colTotals[`${comp.b}_${m}`] || 0);
                          return (
                            <React.Fragment key={`growth_m_foot_${m}_${gIdx}`}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: 'var(--matrix-header-bg)' }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: 'var(--matrix-header-bg)' }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => <td key={`total_${yr}`} className={totalCellClassName(yr)}>{renderCell(tableData.colTotals[`${yr}_total`] || 0)}</td>)}
                    {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                      const amt = renderGrowthAmt(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0);
                      const pct = renderGrowthPct(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0);
                      return (
                        <React.Fragment key={`growth_m_foot_tot_${gIdx}`}>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: 'var(--matrix-header-bg)' }}>{amt.node}</td>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: 'var(--matrix-header-bg)' }}>{pct.node}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </>
          )}
        </table>
      </div>
    </section>
  );
}
