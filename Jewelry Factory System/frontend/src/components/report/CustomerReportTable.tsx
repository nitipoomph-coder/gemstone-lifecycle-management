import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const thBase: React.CSSProperties = {
  padding: '10px 10px',
  textAlign: 'center' as const,
  fontWeight: 900,
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface-1)',
  borderRight: '1px solid var(--color-border-strong)',
  whiteSpace: 'nowrap' as const,
  fontSize: '0.75rem',
  letterSpacing: '0.02em',
  textTransform: 'capitalize' as const,
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
};

const yearColors = [
  { bg: 'var(--color-surface-1)', text: 'var(--color-text-primary)', totalText: 'var(--color-brand-600)' },
  { bg: 'var(--color-surface-1)', text: 'var(--color-text-primary)', totalText: 'var(--color-brand-600)' },
  { bg: 'var(--color-surface-1)', text: 'var(--color-text-primary)', totalText: 'var(--color-brand-600)' },
];

interface CustomerReportTableProps {
  loading: boolean;
  baseYear: string;
  viewMode: 'ytd' | 'monthly';
  tableData: {
    rows: any[];
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
  renderGrowthPct: (baseVal: number, compVal: number) => { node: React.ReactNode, bgColor: string };
}

export default function CustomerReportTable({
  loading,
  baseYear,
  viewMode,
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
}: CustomerReportTableProps) {
  const { theme } = useTheme();
  const isRoyal = theme === 'royal-white';
  const totalBg = isRoyal ? 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-2))' : 'var(--color-surface-2)';

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={`kpi_skel_${i}`} className="animate-pulse" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', borderRadius: 10, padding: '12px 18px', flex: '1 1 min-content', minWidth: 200, height: 76 }} />
          ))}
        </div>
        <div className="animate-pulse" style={{ border: '1px solid var(--color-border-strong)', borderRadius: 12, background: 'var(--color-surface-0)', width: '100%', overflow: 'hidden' }}>
          <div style={{ height: 48, borderBottom: '1px solid var(--color-border-strong)', background: 'var(--color-surface-2)', display: 'flex' }}>
            <div style={{ width: 160, height: '100%', borderRight: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)' }} />
            <div style={{ flex: 1 }} />
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={`row_skel_${i}`} style={{ height: 40, borderBottom: '1px solid var(--color-border-strong)', display: 'flex' }}>
              <div style={{ width: 160, height: '100%', borderRight: '1px solid var(--color-border-strong)' }}>
                <div style={{ height: 16, width: '60%', background: 'var(--color-surface-2)', margin: '12px 16px', borderRadius: 4 }} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 20 }}>
                {[8, 6, 10, 7, 9].map((w, wi) => (
                  <div key={wi} style={{ height: 16, width: `${w}%`, background: 'var(--color-surface-2)', borderRadius: 4 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!baseYear) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', gap: 8 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>
          No base year selected. Please apply filters.
        </p>
      </div>
    );
  }

  // ── SORT DROPDOWN HEADER ──
  const sortSelect = (
    <button
      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8,
        fontSize: '0.65rem', padding: '4px 8px', borderRadius: 6,
        background: 'var(--color-surface-0)', border: '1px solid var(--color-border-strong)',
        color: 'var(--color-text-secondary)', outline: 'none', cursor: 'pointer',
        fontWeight: 700, textTransform: 'capitalize', letterSpacing: '0.02em',
        boxShadow: '0 1px 2px color-mix(in srgb, var(--color-surface-900) 5%, transparent)',
        transition: 'all 0.2s ease'
      }}
      className="hover:border-brand-400 hover:text-brand-600 active:scale-95"
      title="Toggle Sort Order"
    >
      {sortOrder === 'desc' ? (
        <><ArrowDown size={12} /> Highest First</>
      ) : (
        <><ArrowUp size={12} /> Lowest First</>
      )}
    </button>
  );

  const customerIdTh = (rowSpan: number) => (
    <th rowSpan={rowSpan} style={{ ...thBase, minWidth: 160, textAlign: 'left', padding: '12px 16px', zIndex: 12, left: 0, position: 'sticky', top: 0, borderBottom: '1px solid var(--color-border-strong)', verticalAlign: 'middle' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <span>Customer ID</span>
        {sortSelect}
      </div>
    </th>
  );

  const renderCell = (val: number, colorStyle: React.CSSProperties) => {
    const isAmt = metric === 'amount';
    const str = fmt(val);
    const numStr = isAmt ? str.replace('$', '') : str;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', ...colorStyle }}>
        {isAmt && (
          <span style={{ color: 'color-mix(in srgb, currentColor 40%, transparent)', fontWeight: 800, fontSize: '0.8em', marginRight: 8 }}>
            $
          </span>
        )}
        <span>{numStr}</span>
      </div>
    );
  };

  return (
    <div
      className="content-scrollbar"
      style={{ border: '1px solid var(--color-border-strong)', borderRadius: 12, background: 'var(--color-surface-0)', width: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 250px)' }}
    >
      <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>

        {/* ── YTD VIEW ── */}
        {viewMode === 'ytd' ? (
          <>
          <thead>
            <tr>
                {customerIdTh(2)}
                {displayYears.map((yr, _yIdx) => {
                  const yc = yearColors[_yIdx] || yearColors[0];
                  return (
                    <React.Fragment key={yr}>
                      <th colSpan={displayMonths.length + 1} style={{
                        ...thBase, background: yc.bg, color: yr === currentYearStr ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                        textAlign: 'center', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.05em',
                        position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)'
                      }}>
                        {yr}
                      </th>
                    </React.Fragment>
                  );
                })}
                {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                  <th key={`growth_hdr_top_${idx}`} colSpan={2} style={{
                    ...thBase, background: 'var(--color-surface-2)', color: 'var(--color-text-primary)',
                    textAlign: 'center', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.05em',
                    position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span>Growth</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-600)', fontWeight: 700, opacity: 0.8 }}>
                        ({comp.a} vs {comp.b})
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
              <tr>
                {displayYears.map((yr, _yIdx) => {
                  const yc = yearColors[_yIdx] || yearColors[0];
                  return displayMonths.map((m) => {
                    const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                    return (
                      <th key={`${yr}_${m}`} style={{
                        ...thBase, minWidth: 100,
                        background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-1))' : yc.bg,
                        color: isCurrent ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                        position: 'sticky', top: 34, zIndex: 10,
                        borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.68rem'
                      }}>
                        {m}
                      </th>
                    );
                  }).concat(
                    <th key={`${yr}_total`} style={{
                      ...thBase, minWidth: 120, background: totalBg, color: yc.totalText,
                      position: 'sticky', top: 34, zIndex: 10,
                      borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.7rem'
                    }}>
                      Total
                    </th>
                  );
                })}
                {displayYears.length > 1 && growthComparisons.map((_, idx) => (
                  <React.Fragment key={`growth_hdr_sub_${idx}`}>
                    <th style={{ ...thBase, minWidth: 90, background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.7rem' }}>
                      Growth
                    </th>
                    <th style={{ ...thBase, minWidth: 80, background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.7rem' }}>
                      %
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableData.rows.length === 0 ? (
                <tr>
                  <td colSpan={1 + displayYears.length * (displayMonths.length + 1) + (displayYears.length > 1 ? growthComparisons.length * 2 : 0)}
                    style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>
                    No customers match the current filter.
                  </td>
                </tr>
              ) : tableData.rows.map((row: any) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)' }} className="hover:bg-brand-50">
                  <td style={{ padding: '10px 16px', borderRight: '1px solid var(--color-border-strong)', fontWeight: 900, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', fontSize: '0.85rem', position: 'sticky', left: 0, background: 'var(--color-surface-1)', zIndex: 2 }}>
                    {row.label}
                  </td>
                  {displayYears.map((yr, _yIdx) => {
                    const yc = yearColors[_yIdx] || yearColors[0];
                    return displayMonths.map(m => {
                      const val = row[`${yr}_${m}`] || 0;
                      const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                      return (
                        <td key={`${yr}_${m}`} style={{ padding: '8px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-strong)', whiteSpace: 'nowrap', background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)' : 'inherit' }}>
                          {renderCell(val, { fontSize: '0.9rem', fontWeight: 900, color: val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' })}
                        </td>
                      );
                    }).concat(
                      <td key={`${yr}_total`} style={{ padding: '8px 12px', textAlign: 'right', background: 'inherit', whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border-strong)' }}>
                        {renderCell(row[`${yr}_total`] || 0, { fontSize: '0.95rem', fontWeight: 900, color: yc.totalText })}
                      </td>
                    );
                  })}
                  {displayYears.length > 1 && growthComparisons.map((comp, idx) => {
                    const amt = renderGrowthAmt(row[`${comp.a}_total`] || 0, row[`${comp.b}_total`] || 0);
                    const pct = renderGrowthPct(row[`${comp.a}_total`] || 0, row[`${comp.b}_total`] || 0);
                    return (
                      <React.Fragment key={`growth_row_${idx}`}>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: amt.bgColor, borderRight: '1px solid var(--color-border-strong)' }}>
                          {amt.node}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: pct.bgColor, borderRight: '1px solid var(--color-border-strong)' }}>
                          {pct.node}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {tableData.rows.length > 0 && (
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                <tr style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border-strong)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 900, color: 'var(--color-text-primary)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.85rem', position: 'sticky', left: 0, background: 'var(--color-surface-2)', zIndex: 12 }}>
                    GRAND TOTAL
                  </td>
                  {displayYears.map((yr, _yIdx) => {
                    const yc = yearColors[_yIdx] || yearColors[0];
                    return displayMonths.map(m => {
                      const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                      return (
                        <td key={`${yr}_${m}`} style={{ padding: '10px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-strong)', whiteSpace: 'nowrap', background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-2))' : 'inherit' }}>
                          {renderCell(tableData.colTotals[`${yr}_${m}`] || 0, { fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-text-primary)' })}
                        </td>
                      );
                    }).concat(
                      <td key={`${yr}_total`} style={{ padding: '10px 12px', textAlign: 'right', background: isRoyal ? 'color-mix(in srgb, var(--color-brand-500) 15%, var(--color-surface-2))' : 'var(--color-surface-2)', whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border-strong)' }}>
                        {renderCell(tableData.colTotals[`${yr}_total`] || 0, { fontSize: '0.95rem', fontWeight: 900, color: yc.totalText })}
                      </td>
                    );
                  })}
                  {displayYears.length > 1 && growthComparisons.map((comp, idx) => {
                    const amt = renderGrowthAmt(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0);
                    const pct = renderGrowthPct(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0);
                    return (
                      <React.Fragment key={`growth_foot_${idx}`}>
                        <td style={{ padding: '10px 12px', textAlign: 'right', background: amt.bgColor, whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border-strong)' }}>
                          {amt.node}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', background: pct.bgColor, whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border-strong)' }}>
                          {pct.node}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </>
        ) : (
          /* ── MONTHLY COMPARISON VIEW ── */
          <>
            <thead>
              <tr>
                {customerIdTh(2)}
                {displayMonths.map((m) => (
                  <th key={m} colSpan={displayYears.length + (displayYears.length > 1 ? growthComparisons.length * 2 : 0)} style={{
                    ...thBase, background: 'var(--color-surface-1)', color: 'var(--color-text-primary)',
                    textAlign: 'center', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.05em',
                    position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)'
                  }}>
                    {m}
                  </th>
                ))}
                <th colSpan={displayYears.length + (displayYears.length > 1 ? growthComparisons.length * 2 : 0)} style={{
                  ...thBase, background: 'var(--color-surface-2)', color: 'var(--color-brand-600)',
                  textAlign: 'center', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.05em',
                  position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)'
                }}>
                  {metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales'}
                </th>
              </tr>
              <tr>
                {displayMonths.map((m) => (
                  <React.Fragment key={m}>
                    {displayYears.map((yr, _yIdx) => {
                      const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                      const yc = yearColors[_yIdx] || yearColors[0];
                      return (
                        <th key={`${m}_${yr}`} style={{
                          ...thBase, minWidth: 100,
                          background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-1))' : yc.bg,
                          color: yr === currentYearStr ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                          position: 'sticky', top: 34, zIndex: 10,
                          borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.68rem'
                        }}>
                          {yr}
                        </th>
                      );
                    })}
                    {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                      <React.Fragment key={`growth_m_hdr_${idx}`}>
                        <th style={{ ...thBase, minWidth: 100, background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.65rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span>Growth</span>
                            <span style={{ fontSize: '0.55rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>({comp.a} vs {comp.b})</span>
                          </div>
                        </th>
                        <th style={{ ...thBase, minWidth: 80, background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.65rem' }}>
                          %
                        </th>
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                {/* Grand Total sub-headers */}
                {displayYears.map((yr) => {
                  return (
                    <th key={`tot_hdr_${yr}`} style={{
                      ...thBase, minWidth: 100, background: totalBg, color: yr === currentYearStr ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                      position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.68rem'
                    }}>
                      {yr}
                    </th>
                  );
                })}
                {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                  <React.Fragment key={`growth_m_tot_hdr_${idx}`}>
                    <th style={{ ...thBase, minWidth: 100, background: totalBg, color: 'var(--color-brand-600)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.65rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span>Growth</span>
                        <span style={{ fontSize: '0.55rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>({comp.a} vs {comp.b})</span>
                      </div>
                    </th>
                    <th style={{ ...thBase, minWidth: 80, background: totalBg, color: 'var(--color-brand-600)', position: 'sticky', top: 34, zIndex: 10, borderBottom: '1px solid var(--color-border-strong)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.65rem' }}>
                      %
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableData.rows.length === 0 ? (
                <tr>
                  <td colSpan={1 + (displayMonths.length + 1) * (displayYears.length + (displayYears.length > 1 ? growthComparisons.length * 2 : 0))}
                    style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>
                    No customers match the current filter.
                  </td>
                </tr>
              ) : tableData.rows.map((row: any) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border-strong)', background: 'var(--color-surface-1)' }} className="hover:bg-brand-50">
                  <td style={{ padding: '10px 16px', borderRight: '1px solid var(--color-border-strong)', fontWeight: 900, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', fontSize: '0.85rem', position: 'sticky', left: 0, background: 'var(--color-surface-1)', zIndex: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{row.label}</span>
                      {metric === 'qty' && row.topItem && displayYears.some(yr => (row[`${yr}_total`] || 0) > 0) && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-500)', marginTop: 2, fontWeight: 700, letterSpacing: '0.02em' }}>
                          Top: {row.topItem} ({fmt(row.topItemQty)} pcs)
                        </span>
                      )}
                    </div>
                  </td>
                  {displayMonths.map((m) => (
                    <React.Fragment key={m}>
                      {displayYears.map((yr) => {
                        const val = row[`${yr}_${m}`] || 0;
                        const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                        return (
                          <td key={`${m}_${yr}`} style={{ padding: '8px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-strong)', whiteSpace: 'nowrap', background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)' : 'inherit' }}>
                            {renderCell(val, { fontSize: '0.9rem', fontWeight: 900, color: val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' })}
                          </td>
                        );
                      })}
                      {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                        const amt = renderGrowthAmt(row[`${comp.a}_${m}`] || 0, row[`${comp.b}_${m}`] || 0);
                        const pct = renderGrowthPct(row[`${comp.a}_${m}`] || 0, row[`${comp.b}_${m}`] || 0);
                        return (
                          <React.Fragment key={`growth_m_row_${m}_${gIdx}`}>
                            <td style={{ padding: '8px 10px', textAlign: 'right', background: amt.bgColor, borderRight: '1px solid var(--color-border-strong)' }}>
                              {amt.node}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', background: pct.bgColor, borderRight: '1px solid var(--color-border-strong)' }}>
                              {pct.node}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {displayYears.map((yr, _yIdx) => {
                    const yc = yearColors[_yIdx] || yearColors[0];
                    return (
                      <td key={`total_${yr}`} style={{ padding: '8px 12px', textAlign: 'right', background: 'inherit', whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border-strong)' }}>
                        {renderCell(row[`${yr}_total`] || 0, { fontSize: '0.95rem', fontWeight: 900, color: yc.totalText })}
                      </td>
                    );
                  })}
                  {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                    const amt = renderGrowthAmt(row[`${comp.a}_total`] || 0, row[`${comp.b}_total`] || 0);
                    const pct = renderGrowthPct(row[`${comp.a}_total`] || 0, row[`${comp.b}_total`] || 0);
                    return (
                      <React.Fragment key={`growth_m_row_tot_${gIdx}`}>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: amt.bgColor, borderRight: '1px solid var(--color-border-strong)' }}>
                          {amt.node}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: pct.bgColor, borderRight: '1px solid var(--color-border-strong)' }}>
                          {pct.node}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {tableData.rows.length > 0 && (
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                <tr style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border-strong)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 900, color: 'var(--color-text-primary)', borderRight: '1px solid var(--color-border-strong)', fontSize: '0.85rem', position: 'sticky', left: 0, background: 'var(--color-surface-2)', zIndex: 12 }}>
                    GRAND TOTAL
                  </td>
                  {displayMonths.map((m) => (
                    <React.Fragment key={m}>
                      {displayYears.map((yr) => {
                        const isCurrent = yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
                        return (
                          <td key={`${m}_${yr}`} style={{ padding: '10px 10px', textAlign: 'right', borderRight: '1px solid var(--color-border-strong)', whiteSpace: 'nowrap', background: isCurrent ? 'color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-2))' : 'inherit' }}>
                            {renderCell(tableData.colTotals[`${yr}_${m}`] || 0, { fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-text-primary)' })}
                          </td>
                        );
                      })}
                      {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                        const amt = renderGrowthAmt(tableData.colTotals[`${comp.a}_${m}`] || 0, tableData.colTotals[`${comp.b}_${m}`] || 0);
                        const pct = renderGrowthPct(tableData.colTotals[`${comp.a}_${m}`] || 0, tableData.colTotals[`${comp.b}_${m}`] || 0);
                        return (
                          <React.Fragment key={`growth_m_foot_${m}_${gIdx}`}>
                            <td style={{ padding: '8px 10px', textAlign: 'right', background: amt.bgColor === 'transparent' ? 'var(--color-surface-2)' : amt.bgColor, borderRight: '1px solid var(--color-border-strong)', fontSize: '0.85rem', fontWeight: 900 }}>
                              {amt.node}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', background: pct.bgColor === 'transparent' ? 'var(--color-surface-2)' : pct.bgColor, borderRight: '1px solid var(--color-border-strong)', fontSize: '0.85rem', fontWeight: 900 }}>
                              {pct.node}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {displayYears.map((yr, _yIdx) => {
                    const yc = yearColors[_yIdx] || yearColors[0];
                    return (
                      <td key={`total_${yr}`} style={{ padding: '10px 12px', textAlign: 'right', background: isRoyal ? 'color-mix(in srgb, var(--color-brand-500) 15%, var(--color-surface-2))' : 'var(--color-surface-2)', whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border-strong)' }}>
                        {renderCell(tableData.colTotals[`${yr}_total`] || 0, { fontSize: '0.95rem', fontWeight: 900, color: yc.totalText })}
                      </td>
                    );
                  })}
                  {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                    const amt = renderGrowthAmt(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0);
                    const pct = renderGrowthPct(tableData.colTotals[`${comp.a}_total`] || 0, tableData.colTotals[`${comp.b}_total`] || 0);
                    return (
                      <React.Fragment key={`growth_m_foot_tot_${gIdx}`}>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: amt.bgColor === 'transparent' ? (isRoyal ? 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-2))' : 'var(--color-surface-2)') : amt.bgColor, borderRight: '1px solid var(--color-border-strong)' }}>
                          {amt.node}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: pct.bgColor === 'transparent' ? (isRoyal ? 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-2))' : 'var(--color-surface-2)') : pct.bgColor, borderRight: '1px solid var(--color-border-strong)' }}>
                          {pct.node}
                        </td>
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
  );
}
