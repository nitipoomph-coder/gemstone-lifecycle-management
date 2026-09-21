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

  const totalCols = data.length;
  const cellFontSize = totalCols > 25 ? '10px' : totalCols > 15 ? '10.5px' : '11px';

  return (
    <div
      style={{
        width: '100%',
        background: 'var(--color-ui-surface)',
        borderRadius: '6px',
        border: '1px solid var(--color-border-light)',
        overflow: 'hidden',
      }}
    >
      <table
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          fontSize: cellFontSize,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
        }}
      >
        <thead>
          <tr
            style={{
              background: 'var(--color-table-header)',
              borderBottom: '1.5px solid var(--color-border-strong)',
              color: 'var(--color-text-primary)',
              height: '26px',
            }}
          >
            <th
              style={{
                width: totalCols > 25 ? '78px' : '90px',
                padding: '4px 6px',
                textAlign: 'center',
                borderRight: '1px solid var(--color-border-light)',
                fontWeight: 700,
              }}
            >
              Item Type
            </th>
            {data.map((d, i) => (
              <th
                key={i}
                title={d.periodLabel}
                style={{
                  padding: '2px 1px',
                  textAlign: 'center',
                  borderRight: '1px solid var(--color-border-light)',
                  fontWeight: 600,
                  lineHeight: 1.15,
                }}
              >
                {typeof d.periodLabel === 'string' && d.periodLabel.length === 10 && d.periodLabel.includes('/') ? (
                  <div style={{ fontSize: totalCols > 20 ? '9px' : '9.5px' }}>
                    <div>{d.periodLabel.slice(0, 5)}</div>
                    <div style={{ fontSize: '8px', opacity: 0.65 }}>{d.periodLabel.slice(6)}</div>
                  </div>
                ) : (
                  d.periodLabel
                )}
              </th>
            ))}
            <th
              style={{
                width: '75px',
                padding: '4px 6px',
                textAlign: 'center',
                fontWeight: 700,
                color: 'var(--color-danger-600)',
              }}
            >
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Item Types Rows */}
          {CATS.map(cat => (
            <tr
              key={cat}
              style={{
                borderBottom: '1px solid var(--color-border-light)',
                height: '22px',
              }}
            >
              <td
                style={{
                  padding: '2px 6px',
                  textAlign: 'left',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  borderRight: '1px solid var(--color-border-light)',
                }}
              >
                {cat}
              </td>
              {data.map((d, i) => (
                <td
                  key={i}
                  style={{
                    padding: '2px 2px',
                    borderRight: '1px solid var(--color-border-light)',
                    color: d.orderMap[cat] > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)'
                  }}
                >
                  {d.orderMap[cat] > 0 ? d.orderMap[cat].toLocaleString() : '-'}
                </td>
              ))}
              <td
                style={{
                  padding: '2px 6px',
                  fontWeight: 700,
                  textAlign: 'center',
                  color: 'var(--color-text-primary)',
                }}
              >
                {rowTotals[cat as keyof typeof rowTotals] > 0 ? rowTotals[cat as keyof typeof rowTotals].toLocaleString() : '-'}
              </td>
            </tr>
          ))}

          {/* Order Qty */}
          <tr
            style={{
              background: 'var(--color-surface-2)',
              borderBottom: '1px solid var(--color-border-light)',
              height: '24px',
            }}
          >
            <td
              style={{
                padding: '2px 6px',
                textAlign: 'left',
                fontWeight: 800,
                color: 'var(--color-brand-600)',
                borderRight: '1px solid var(--color-border-light)',
              }}
            >
              Order Qty
            </td>
            {data.map((d, i) => (
              <td
                key={i}
                style={{
                  padding: '2px 2px',
                  fontWeight: 700,
                  borderRight: '1px solid var(--color-border-light)',
                  color: d.totalOrder > 0 ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)'
                }}
              >
                {d.totalOrder > 0 ? d.totalOrder.toLocaleString() : '-'}
              </td>
            ))}
            <td
              style={{
                padding: '2px 6px',
                fontWeight: 800,
                textAlign: 'center',
                color: 'var(--color-brand-600)',
              }}
            >
              {rowTotals.OrderQty.toLocaleString()}
            </td>
          </tr>

          {/* Finish Qty */}
          <tr
            style={{
              background: 'var(--color-status-success-soft)',
              borderBottom: '1px solid var(--color-border-light)',
              height: '24px',
            }}
          >
            <td
              style={{
                padding: '2px 6px',
                textAlign: 'left',
                fontWeight: 800,
                color: 'var(--color-success-600)',
                borderRight: '1px solid var(--color-border-light)',
              }}
            >
              Finish Qty
            </td>
            {data.map((d, i) => (
              <td
                key={i}
                style={{
                  padding: '2px 2px',
                  fontWeight: 700,
                  borderRight: '1px solid var(--color-border-light)',
                  color: d.totalDone > 0 ? 'var(--color-success-600)' : 'var(--color-text-tertiary)'
                }}
              >
                {d.totalDone > 0 ? d.totalDone.toLocaleString() : '-'}
              </td>
            ))}
            <td
              style={{
                padding: '2px 6px',
                fontWeight: 800,
                textAlign: 'center',
                color: 'var(--color-success-600)',
              }}
            >
              {rowTotals.FinishQty.toLocaleString()}
            </td>
          </tr>

          {/* Balance Qty */}
          <tr
            style={{
              background: 'var(--color-prod-total-row-bg)',
              height: '24px',
            }}
          >
            <td
              style={{
                padding: '2px 6px',
                textAlign: 'left',
                fontWeight: 800,
                color: 'var(--color-danger-600)',
                borderRight: '1px solid var(--color-border-light)',
              }}
            >
              Balance Qty
            </td>
            {data.map((d, i) => (
              <td
                key={i}
                style={{
                  padding: '2px 2px',
                  fontWeight: 700,
                  borderRight: '1px solid var(--color-border-light)',
                  color: d.totalRemain > 0 ? 'var(--color-danger-600)' : 'var(--color-text-tertiary)'
                }}
              >
                {d.totalRemain > 0 ? d.totalRemain.toLocaleString() : '-'}
              </td>
            ))}
            <td
              style={{
                padding: '2px 6px',
                fontWeight: 800,
                textAlign: 'center',
                color: 'var(--color-danger-600)',
              }}
            >
              {rowTotals.BalanceQty.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

