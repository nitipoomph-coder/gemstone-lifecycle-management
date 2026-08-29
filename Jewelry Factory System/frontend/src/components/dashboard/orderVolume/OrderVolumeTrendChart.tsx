import { useState } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area
} from 'recharts';
import type { Metric, TrendComparisonDatum } from '../../../hooks/useOrderVolumeSummaryData';
import { fmtMetric } from '../../../hooks/useOrderVolumeSummaryData';

interface OrderVolumeTrendChartProps {
  data: TrendComparisonDatum[];
  metric: Metric;
  hasCompareYear: boolean;
  primaryYear: string;
  compareYear: string;
}

export function OrderVolumeTrendChart({ data, metric, hasCompareYear, primaryYear, compareYear }: OrderVolumeTrendChartProps) {
  const [showRates, setShowRates] = useState(false);

  const chartData = data.map(d => {
    const primaryVolume = d.report;
    const compareVolume = hasCompareYear ? d.compare : 0;
    
    const primaryOnTimeRate = primaryVolume > 0 ? ((d.reportShipped || 0) / primaryVolume) * 100 : 0;
    const primaryOverdueRate = primaryVolume > 0 ? (((primaryVolume - (d.reportShipped || 0)) / primaryVolume) * 100) : 0;

    return {
      name: d.label,
      primaryVolume,
      compareVolume,
      primaryOnTimeRate,
      primaryOverdueRate
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'var(--color-surface-0)',
            border: '1px solid var(--color-border-light)',
            padding: '10px 14px',
            borderRadius: 8,
            boxShadow: 'var(--shadow-dropdown)'
          }}
        >
          <p
            style={{
              fontWeight: 900,
              margin: '0 0 6px 0',
              color: 'var(--color-text-primary)',
              fontSize: '0.8rem',
              borderBottom: '1px solid var(--color-border-light)',
              paddingBottom: 4
            }}
          >
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '3px 0', fontSize: '0.75rem', fontWeight: 800 }}>
              {entry.name}: {entry.name.includes('%') ? `${entry.value.toFixed(1)}%` : fmtMetric(entry.value, metric)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        background: 'var(--color-surface-0)',
        borderRadius: 8,
        padding: '14px 16px',
        border: '1px solid var(--color-border-light)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
          Order Volume & Delivery Rate Trend
        </h3>
        <label
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={showRates}
            onChange={(e) => setShowRates(e.target.checked)}
          />
          Show Delivery Rates (%)
        </label>
      </div>

      <div style={{ width: '100%', height: 230 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(val) => fmtMetric(val, metric)}
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            {showRates && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
                tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: 4 }}
              formatter={(value) => (
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700, marginRight: 8 }}>
                  {value}
                </span>
              )}
            />

            {hasCompareYear && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="compareVolume"
                name={`${compareYear} Volume`}
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.12}
                strokeDasharray="4 4"
              />
            )}

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="primaryVolume"
              name={`${primaryYear} Volume`}
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />

            {showRates && (
              <>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="primaryOnTimeRate"
                  name="On-Time %"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="primaryOverdueRate"
                  name="Overdue %"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f43f5e' }}
                  activeDot={{ r: 6 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
