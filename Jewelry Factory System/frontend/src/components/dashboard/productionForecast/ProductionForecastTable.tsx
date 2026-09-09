const CATS = ["BBS", "BES+BCS", "BNS+BPS", "BTS", "BRS", "OTHER"];

interface ProductionForecastTableProps {
  data: any[];
  viewMode?: string;
}

export function ProductionForecastTable({ data }: ProductionForecastTableProps) {
  if (!data || data.length === 0) {
    return <div className="text-center p-10 text-[var(--color-text-tertiary)]">No forecast data available</div>;
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

  const baseTd = "px-4 py-2.5 border-b border-r border-[var(--color-border-light)] text-[13px] text-right min-w-[90px]";
  const baseTh = "px-4 py-3 border-b border-r border-[var(--color-border-light)] text-xs text-center text-[var(--color-text-secondary)] bg-[var(--color-surface-1)] sticky top-0 z-20 shadow-[0_1px_0_var(--color-border-light)]";
  
  const stickyCol = "sticky left-0 bg-[var(--color-ui-surface)] z-10 border-r border-[var(--color-border-light)] shadow-[2px_0_4px_rgba(0,0,0,0.02)]";
  const stickyHeaderCol = `${baseTh} !left-0 !bg-[var(--color-surface-1)] !z-30 text-left min-w-[140px]`;
  
  const stickyTotal = "sticky right-0 bg-[var(--color-surface-1)] z-10 border-l border-[var(--color-border-light)] shadow-[-2px_0_4px_rgba(0,0,0,0.02)]";
  const stickyHeaderTotal = `${baseTh} !right-0 !bg-[var(--color-surface-2)] !z-30 text-[var(--color-text-primary)] font-extrabold`;

  return (
    <div className="w-full overflow-auto max-h-[500px] border border-[var(--color-border-light)] rounded-md">
      <table className="w-full border-separate border-spacing-0 whitespace-nowrap">
        <thead>
          <tr>
            <th className={stickyHeaderCol}>Item Type</th>
            {data.map((d, i) => (
              <th key={i} className={baseTh}>{d.periodLabel}</th>
            ))}
            <th className={stickyHeaderTotal}>Total</th>
          </tr>
        </thead>
        <tbody>
          {/* Item Types Rows */}
          {CATS.map(cat => (
            <tr key={cat} className="hover:bg-[var(--color-surface-1)] transition-colors">
              <td className={`${baseTd} ${stickyCol} text-left font-semibold text-[var(--color-text-primary)]`}>{cat}</td>
              {data.map((d, i) => (
                <td key={i} className={`${baseTd} ${d.orderMap[cat] > 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>
                  {d.orderMap[cat] > 0 ? d.orderMap[cat].toLocaleString() : '-'}
                </td>
              ))}
              <td className={`${baseTd} ${stickyTotal} font-bold text-[var(--color-text-primary)]`}>
                {rowTotals[cat as keyof typeof rowTotals].toLocaleString()}
              </td>
            </tr>
          ))}

          {/* Summary Rows */}
          <tr className="bg-[var(--color-surface-2)] transition-colors">
            <td className={`${baseTd} ${stickyCol} !bg-[var(--color-surface-2)] text-left font-extrabold text-[var(--color-brand-600)]`}>Order Qty</td>
            {data.map((d, i) => (
              <td key={i} className={`${baseTd} font-bold text-[var(--color-brand-600)]`}>
                {d.totalOrder > 0 ? d.totalOrder.toLocaleString() : '-'}
              </td>
            ))}
            <td className={`${baseTd} ${stickyTotal} !bg-[var(--color-surface-2)] font-black text-[var(--color-brand-600)]`}>
              {rowTotals.OrderQty.toLocaleString()}
            </td>
          </tr>

          <tr className="bg-[var(--color-status-success-soft)] transition-colors">
            <td className={`${baseTd} ${stickyCol} !bg-[var(--color-status-success-soft)] text-left font-extrabold text-[var(--color-success-600)]`}>Finish Qty</td>
            {data.map((d, i) => (
              <td key={i} className={`${baseTd} font-bold text-[var(--color-success-600)]`}>
                {d.totalDone > 0 ? d.totalDone.toLocaleString() : '-'}
              </td>
            ))}
            <td className={`${baseTd} ${stickyTotal} !bg-[var(--color-status-success-soft)] font-black text-[var(--color-success-600)]`}>
              {rowTotals.FinishQty.toLocaleString()}
            </td>
          </tr>

          <tr className="bg-[var(--color-status-danger-soft)] transition-colors">
            <td className={`${baseTd} ${stickyCol} !bg-[var(--color-status-danger-soft)] text-left font-extrabold text-[var(--color-danger-600)]`}>Balance Qty</td>
            {data.map((d, i) => (
              <td key={i} className={`${baseTd} font-bold text-[var(--color-danger-600)]`}>
                {d.totalRemain > 0 ? d.totalRemain.toLocaleString() : '-'}
              </td>
            ))}
            <td className={`${baseTd} ${stickyTotal} !bg-[var(--color-status-danger-soft)] font-black text-[var(--color-danger-600)]`}>
              {rowTotals.BalanceQty.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

