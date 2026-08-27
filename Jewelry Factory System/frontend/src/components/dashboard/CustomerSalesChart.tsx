import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ALL_GROUPS } from '../../config/customerGroups';
import type { Metric, ChartDatum } from '../../hooks/useCustomerSalesData';

const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];

type TooltipPayloadEntry = { value?: number; color?: string; dataKey?: string | number; name?: string };
type CustomTooltipProps = { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string; metric: Metric; chartData?: any[]; mode?: string; monthlySeries?: string; };

const CustomTooltip = ({ active, payload, label, metric, chartData, mode, monthlySeries }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--color-border-light)', minWidth: 200, background: 'var(--color-ui-surface)', boxShadow: 'var(--shadow-dropdown)' }}>
        <p style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 8, borderBottom: '1px solid var(--color-border-light)', paddingBottom: 6 }}>
          {label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payload.map((entry, index) => {
            if (entry.value === 0) return null;

            let diff = null;
            let pct = null;
            const currVal = Number(entry.value || 0);

            if (monthlySeries === 'year' && String(entry.dataKey).length === 4) {
              const prevYear = String(Number(entry.dataKey) - 1);
              const prevEntry = payload.find((p: any) => String(p.dataKey) === prevYear);
              if (prevEntry) {
                const prevVal = Number(prevEntry.value || 0);
                if (prevVal > 0 || currVal > 0) {
                  diff = currVal - prevVal;
                  if (prevVal > 0) pct = ((currVal - prevVal) / prevVal) * 100;
                }
              }
            } else if (mode === 'yearly' && monthlySeries === 'group' && chartData) {
              const prevYear = String(Number(label) - 1);
              const prevData = chartData.find(d => String(d.label) === prevYear);
              if (prevData && prevData[entry.dataKey!]) {
                const prevVal = Number(prevData[entry.dataKey!]);
                if (prevVal > 0 || currVal > 0) {
                  diff = currVal - prevVal;
                  if (prevVal > 0) pct = ((currVal - prevVal) / prevVal) * 100;
                }
              }
            }

            const isUp = diff !== null && diff > 0;
            const isDown = diff !== null && diff < 0;

            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--erp-text-control)', fontWeight: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color }} />
                    {ALL_GROUPS.find(g => g.id === entry.dataKey)?.label || (String(entry.dataKey).length === 4 ? `Year ${entry.dataKey}` : entry.name)}
                  </div>
                  <span style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {metric === 'qty'
                      ? currVal.toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : '$' + currVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {diff !== null && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', fontWeight: 900, color: isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)' }}>
                    <span>
                      {isUp ? '↑ ' : isDown ? '↓ ' : ''}
                      {metric === 'qty' ? Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '$' + Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {pct !== null && ` (${Math.abs(pct).toFixed(2)}%)`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

interface CustomerSalesChartProps {
  chartData: ChartDatum[];
  metric: Metric;
  mode: 'yearly' | 'monthly';
  monthlySeries: 'year' | 'group';
  showLabels: boolean;
  sortedSel: string[];
  activeYears: string[];
}

export function CustomerSalesChart({
  chartData,
  metric,
  mode,
  monthlySeries,
  showLabels,
  sortedSel,
  activeYears
}: CustomerSalesChartProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleBarClick = (seriesId: string, seriesType: 'group' | 'year') => {
    const params = new URLSearchParams(searchParams);

    // If they click a specific group bar, we isolate the filter to that group
    if (seriesType === 'group') {
      params.set('groups', seriesId);
    }
    // If they click a specific year bar, we isolate the filter to that year
    else if (seriesType === 'year') {
      params.set('years', seriesId);
    }

    navigate(`/dashboard/customer/matrix?${params.toString()}`);
  };
  const formatAxisValue = (value: number): string => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    if (metric === 'qty') return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border-light)" opacity={0.5} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 800 }} axisLine={false} tickLine={false} dy={10} />
        <YAxis tickFormatter={(val) => formatAxisValue(val)} tick={{ fontSize: 10, fill: 'var(--color-text-quaternary)', fontWeight: 700 }} axisLine={false} tickLine={false} dx={-5} width={70} />
        <Tooltip content={<CustomTooltip metric={metric} chartData={chartData} mode={mode} monthlySeries={monthlySeries} />} cursor={{ fill: 'var(--color-surface-1)', opacity: 0.4 }} />
        {monthlySeries === 'group' ? sortedSel.map((gId) => {
          const g = ALL_GROUPS.find(x => x.id === gId)!;
          return (
            <Bar
              key={gId}
              dataKey={gId}
              name={g.label}
              fill={g.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
              onClick={() => handleBarClick(gId, 'group')}
              style={{ cursor: 'pointer' }}
            >
              {showLabels && (
                <LabelList dataKey={gId} position="top" formatter={(val: unknown) => Number(val) > 0 ? formatAxisValue(Number(val)).replace('$', '') : ''} style={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 800, pointerEvents: 'none' }} />
              )}
            </Bar>
          );
        }) : activeYears.map((y, idx) => {
          const color = YEAR_COLORS[idx % YEAR_COLORS.length];
          return (
            <Bar
              key={y}
              dataKey={y}
              name={`Year ${y}`}
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
              onClick={() => handleBarClick(y, 'year')}
              style={{ cursor: 'pointer' }}
            >
              {showLabels && (
                <LabelList dataKey={y} position="top" formatter={(val: unknown) => Number(val) > 0 ? formatAxisValue(Number(val)).replace('$', '') : ''} style={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 800, pointerEvents: 'none' }} />
              )}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
