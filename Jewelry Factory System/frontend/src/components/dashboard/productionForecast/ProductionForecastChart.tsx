import { useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

function niceNum(range: number, round = false) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

interface ProductionForecastChartProps {
  data: any[];
}

export function ProductionForecastChart({ data }: ProductionForecastChartProps) {
  const { processedData, yAxisMax, yAxisTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { processedData: [], yAxisMax: 100, yAxisTicks: [0, 50, 100] };
    }

    let maxTotal = 0;
    
    // VB Code colors: ColDone = Color.FromArgb(46, 125, 50) -> #2e7d32
    // ColRemain = Color.FromArgb(211, 47, 47) -> #d32f2f

    const pData = data.map(d => {
      if (d.totalOrder > maxTotal) maxTotal = d.totalOrder;
      
      // Calculate _balanceLabelY to position the label above the stacked bars
      // _balanceLabelY will be equal to totalOrder
      return {
        ...d,
        _balanceLabelY: d.totalRemain > 0 ? d.totalOrder : null
      };
    });

    const BAR_ZONE = 0.8; // Give bars 80% height to fit labels
    let calculatedYMax = 100;
    let calculatedTicks: number[] = [0, 50, 100];

    if (maxTotal > 0) {
      const pTarget = maxTotal / BAR_ZONE;
      const pInt = niceNum(pTarget / 8.0, false); 
      calculatedYMax = Math.ceil(pTarget / pInt) * pInt;

      calculatedTicks = [];
      for (let val = 0; val <= calculatedYMax; val += pInt) {
        calculatedTicks.push(val);
      }
    }

    return { processedData: pData, yAxisMax: calculatedYMax, yAxisTicks: calculatedTicks };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const finish = payload.find((p: any) => p.dataKey === 'totalDone')?.value || 0;
      const remain = payload.find((p: any) => p.dataKey === 'totalRemain')?.value || 0;
      const total = finish + remain;
      
      return (
        <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--color-border-light)', minWidth: 200, background: 'var(--color-ui-surface)', boxShadow: 'var(--shadow-dropdown)' }}>
          <p style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 8, borderBottom: '1px solid var(--color-border-light)', paddingBottom: 6 }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Finish Qty:</span>
              <span style={{ color: 'var(--color-success-600)' }}>{finish.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Balance Qty:</span>
              <span style={{ color: 'var(--color-danger-600)' }}>{remain.toLocaleString()}</span>
            </div>
            <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900 }}>
              <span style={{ color: 'var(--color-text-primary)' }}>Total Order:</span>
              <span>{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderBalanceLabel = (props: any) => {
    const { x, y, value, width } = props;
    if (!value || value === 0) return <g />;

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        fill="var(--color-danger-600)"
        fontSize={10}
        fontWeight={800}
      >
        {Number(value).toLocaleString()}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={processedData} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border-light)" />
        <XAxis 
          dataKey="periodLabel" 
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 600 }} 
          axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
          tickLine={false} 
          tickMargin={8} 
        />
        <YAxis 
          domain={[0, yAxisMax]}
          ticks={yAxisTicks}
          interval={0}
          tickFormatter={(val) => val.toLocaleString()} 
          tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }} 
          axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
          tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }}
          tickMargin={6} 
          width={60} 
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-1)', opacity: 0.4 }} />
        
        {/* Finish Qty (Green) */}
        <Bar 
          dataKey="totalDone" 
          stackId="a" 
          fill="var(--color-success-500)" 
          maxBarSize={40}
          isAnimationActive={true}
          animationDuration={600}
        />
        
        {/* Balance Qty (Red) */}
        <Bar 
          dataKey="totalRemain" 
          stackId="a" 
          fill="var(--color-danger-500)" 
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          isAnimationActive={true}
          animationDuration={600}
        >
          {/* Label for Balance Qty shown on top of the red bar */}
          <LabelList dataKey="totalRemain" content={renderBalanceLabel} />
        </Bar>

      </ComposedChart>
    </ResponsiveContainer>
  );
}
