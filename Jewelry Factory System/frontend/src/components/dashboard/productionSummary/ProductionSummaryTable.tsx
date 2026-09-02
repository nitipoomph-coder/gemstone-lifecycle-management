import { PROD_CUSTOMER_GROUPS } from '../../../config/productionSummaryConfig';
import type { ProdCustomerGroup } from '../../../config/productionSummaryConfig';

interface TableProps {
  data: any[];
  tab: 'year' | 'week' | 'month' | 'day';
}

export function ProductionSummaryTable({ data, tab }: TableProps) {
  if (!data || data.length === 0) return null;

  const isDaily = tab === 'month' || tab === 'day';

  // Calculate TOTAL column
  const totals = {
    N008: 0,
    N098: 0,
    N051: 0,
    total: 0,
    workDays: 0,
  };

  data.forEach(d => {
    totals.N008 += d.N008 || 0;
    totals.N098 += d.N098 || 0;
    totals.N051 += d.N051 || 0;
    totals.total += d.total || 0;
    totals.workDays += d.workDays || 0;
  });

  const avgTotal = totals.workDays > 0 ? totals.total / totals.workDays : 0;

  const renderCell = (val: number, isAvg = false) => {
    if (val === 0 && !isAvg) return '-';
    if (val == null) return '-';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: isAvg ? 0 : 0 });
  };

  return (
    <div style={{ overflowX: 'auto', background: 'var(--color-ui-surface)', borderRadius: '6px', border: '1px solid var(--color-border-light)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'right' }}>
        <thead>
          <tr style={{ background: 'var(--color-table-header)', borderBottom: '1px solid var(--color-border-strong)', color: 'var(--color-text-primary)' }}>
            <th style={{ padding: '4px 6px', textAlign: 'left', minWidth: '70px', borderRight: '1px solid var(--color-border-light)', fontWeight: 600 }}>Customer</th>
            {data.map(d => (
              <th key={d.period} style={{ padding: '4px 2px', textAlign: 'center', borderRight: '1px solid var(--color-border-light)', minWidth: isDaily ? '26px' : '50px', fontWeight: 600, fontSize: '10.5px' }}>
                {d.periodLabel || d.period}
              </th>
            ))}
            <th style={{ padding: '4px 6px', textAlign: 'right', minWidth: isDaily ? '75px' : '65px', fontWeight: 700 }}>
              {isDaily ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.1', fontSize: '10px' }}>
                  <span>{totals.workDays} ({data.length}) Days</span>
                  <span>Avg.</span>
                </div>
              ) : 'TOTAL'}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Group Rows */}
          {PROD_CUSTOMER_GROUPS.map((g: ProdCustomerGroup) => (
            <tr key={g.id} style={{ borderBottom: '1px solid var(--color-border-light)', height: '22px' }}>
              <td style={{ padding: '2px 6px', textAlign: 'left', fontWeight: 'bold', color: g.color, borderRight: '1px solid var(--color-border-light)' }}>
                {g.id}
              </td>
              {data.map(d => (
                <td key={d.period} style={{ padding: '2px 2px', borderRight: '1px solid var(--color-border-light)', fontSize: '10.5px' }}>
                  {renderCell(d[g.id])}
                </td>
              ))}
              <td style={{ padding: '2px 6px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {isDaily ? renderCell(totals.workDays > 0 ? totals[g.id as keyof typeof totals] / totals.workDays : 0, true) : renderCell(totals[g.id as keyof typeof totals])}
              </td>
            </tr>
          ))}

          {/* Total Row */}
          <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border-light)', height: '24px' }}>
            <td style={{ padding: '2px 6px', textAlign: 'left', fontWeight: 'bold', color: 'var(--color-chart-1)', borderRight: '1px solid var(--color-border-light)' }}>
              Total
            </td>
            {data.map(d => (
              <td key={d.period} style={{ padding: '2px 2px', fontWeight: 'bold', borderRight: '1px solid var(--color-border-light)', fontSize: '10.5px' }}>
                {renderCell(d.total)}
              </td>
            ))}
            <td style={{ padding: '2px 6px', fontWeight: 'bold', color: 'var(--color-chart-1)' }}>
              {isDaily ? renderCell(avgTotal, true) : renderCell(totals.total)}
            </td>
          </tr>

          {/* Avg Row (Year/Week only) */}
          {!isDaily && (
            <tr style={{ background: 'var(--color-table-row-alt)', height: '22px' }}>
              <td style={{ padding: '2px 6px', textAlign: 'left', fontWeight: 'bold', color: 'var(--color-chart-2)', borderRight: '1px solid var(--color-border-light)' }}>
                Avg. (Day/Pcs)
              </td>
              {data.map(d => (
                <td key={d.period} style={{ padding: '2px 2px', fontWeight: 'bold', borderRight: '1px solid var(--color-border-light)', fontSize: '10.5px' }}>
                  {renderCell(d.avg, true)}
                </td>
              ))}
              <td style={{ padding: '2px 6px', fontWeight: 'bold', color: 'var(--color-chart-2)' }}>
                {renderCell(avgTotal, true)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
