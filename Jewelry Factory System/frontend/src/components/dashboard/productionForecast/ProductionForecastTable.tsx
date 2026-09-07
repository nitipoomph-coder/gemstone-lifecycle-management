import React from 'react';

const CATS = ["BBS", "BES+BCS", "BNS+BPS", "BTS", "BRS", "OTHER"];

interface ProductionForecastTableProps {
  data: any[];
  viewMode: 'day' | 'week' | 'month' | 'year';
}

export function ProductionForecastTable({ data, viewMode }: ProductionForecastTableProps) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>No forecast data available</div>;
  }

  // Calculate row totals
  const rowTotals = {
    BBS: 0, 'BES+BCS': 0, 'BNS+BPS': 0, BTS: 0, BRS: 0, OTHER: 0,
    OrderQty: 0, FinishQty: 0, BalanceQty: 0
  };

  data.forEach(d => {
    CATS.forEach(c => {
      rowTotals[c as keyof typeof rowTotals] += d.orderMap[c] || 0;
    });
    rowTotals.OrderQty += d.totalOrder || 0;
    rowTotals.FinishQty += d.totalDone || 0;
    rowTotals.BalanceQty += d.totalRemain || 0;
  });

  const tdStyle: React.CSSProperties = { 
    padding: '10px 16px', 
    borderBottom: '1px solid var(--color-border-light)', 
    borderRight: '1px solid var(--color-border-light)',
    fontSize: '13px', 
    textAlign: 'right',
    minWidth: '90px'
  };
  
  const thStyle: React.CSSProperties = { 
    padding: '12px 16px', 
    borderBottom: '1px solid var(--color-border-light)', 
    borderRight: '1px solid var(--color-border-light)',
    fontSize: '12px', 
    textAlign: 'center', 
    color: 'var(--color-text-secondary)',
    background: 'var(--color-surface-1)',
    position: 'sticky',
    top: 0,
    zIndex: 2,
    boxShadow: '0 1px 0 var(--color-border-light)'
  };
  
  const stickyColStyle: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    background: 'var(--color-ui-surface)',
    zIndex: 1,
    borderRight: '1px solid var(--color-border-light)',
    boxShadow: '2px 0 4px rgba(0,0,0,0.02)'
  };

  const stickyHeaderColStyle: React.CSSProperties = {
    ...thStyle,
    ...stickyColStyle,
    background: 'var(--color-surface-1)',
    zIndex: 3,
  };

  const stickyTotalStyle: React.CSSProperties = {
    position: 'sticky',
    right: 0,
    background: 'var(--color-surface-1)',
    zIndex: 1,
    borderLeft: '1px solid var(--color-border-light)',
    boxShadow: '-2px 0 4px rgba(0,0,0,0.02)'
  };

  const stickyHeaderTotalStyle: React.CSSProperties = {
    ...thStyle,
    ...stickyTotalStyle,
    background: 'var(--color-surface-2)',
    zIndex: 3,
    color: 'var(--color-text-primary)',
  };
  
  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', border: '1px solid var(--color-border-light)', borderRadius: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, whiteSpace: 'nowrap' }}>
        <thead>
          <tr>
            <th style={{ ...stickyHeaderColStyle, textAlign: 'left', minWidth: '140px' }}>Item Type</th>
            {data.map((d, i) => (
              <th key={i} style={{ ...thStyle, textAlign: 'center' }}>{d.periodLabel}</th>
            ))}
            <th style={{ ...stickyHeaderTotalStyle, fontWeight: 800 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {/* Item Types Rows */}
          {CATS.map(cat => (
            <tr key={cat} className="hover:bg-[var(--color-surface-1)] transition-colors">
              <td style={{ ...tdStyle, ...stickyColStyle, textAlign: 'left', fontWeight: 600, color: 'var(--color-text-primary)' }}>{cat}</td>
              {data.map((d, i) => (
                <td key={i} style={{ ...tdStyle, color: d.orderMap[cat] > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                  {d.orderMap[cat] > 0 ? d.orderMap[cat].toLocaleString() : '-'}
                </td>
              ))}
              <td style={{ ...tdStyle, ...stickyTotalStyle, fontWeight: 700, color: '#0f172a' }}>
                {rowTotals[cat as keyof typeof rowTotals].toLocaleString()}
              </td>
            </tr>
          ))}

          {/* Summary Rows */}
          <tr style={{ backgroundColor: 'var(--color-surface-2)' }} className="transition-colors">
            <td style={{ ...tdStyle, ...stickyColStyle, background: 'var(--color-surface-2)', textAlign: 'left', fontWeight: 800, color: 'var(--color-brand-600)' }}>Order Qty</td>
            {data.map((d, i) => (
              <td key={i} style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-brand-600)' }}>
                {d.totalOrder > 0 ? d.totalOrder.toLocaleString() : '-'}
              </td>
            ))}
            <td style={{ ...tdStyle, ...stickyTotalStyle, background: 'var(--color-surface-2)', fontWeight: 900, color: 'var(--color-brand-600)' }}>{rowTotals.OrderQty.toLocaleString()}</td>
          </tr>

          <tr style={{ backgroundColor: 'var(--color-status-success-soft)' }} className="transition-colors">
            <td style={{ ...tdStyle, ...stickyColStyle, background: 'var(--color-status-success-soft)', textAlign: 'left', fontWeight: 800, color: 'var(--color-success-600)' }}>Finish Qty</td>
            {data.map((d, i) => (
              <td key={i} style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-success-600)' }}>
                {d.totalDone > 0 ? d.totalDone.toLocaleString() : '-'}
              </td>
            ))}
            <td style={{ ...tdStyle, ...stickyTotalStyle, background: 'var(--color-status-success-soft)', fontWeight: 900, color: 'var(--color-success-600)' }}>{rowTotals.FinishQty.toLocaleString()}</td>
          </tr>

          <tr style={{ backgroundColor: 'var(--color-status-danger-soft)' }} className="transition-colors">
            <td style={{ ...tdStyle, ...stickyColStyle, background: 'var(--color-status-danger-soft)', textAlign: 'left', fontWeight: 800, color: 'var(--color-danger-600)' }}>Balance Qty</td>
            {data.map((d, i) => (
              <td key={i} style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-danger-600)' }}>
                {d.totalRemain > 0 ? d.totalRemain.toLocaleString() : '-'}
              </td>
            ))}
            <td style={{ ...tdStyle, ...stickyTotalStyle, background: 'var(--color-status-danger-soft)', fontWeight: 900, color: 'var(--color-danger-600)' }}>{rowTotals.BalanceQty.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
