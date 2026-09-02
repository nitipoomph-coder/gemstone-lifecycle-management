import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { PROD_CUSTOMER_GROUPS, CHART_COLORS } from '../../../config/productionSummaryConfig';
import type { ProdCustomerGroup } from '../../../config/productionSummaryConfig';

interface ChartProps {
  data: any[];
  title: string;
}

export function ProductionSummaryChart({ data, title }: ChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ padding: '12px 16px', background: 'var(--color-ui-surface)', border: '1px solid var(--color-border-light)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '180px' }}>
          <p style={{ fontWeight: 800, marginBottom: '10px', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '6px' }}>{label}</p>
          {payload.map((entry: any, index: number) => {
            let val = entry.value;
            let dataKey = entry.dataKey;
            
            const group = PROD_CUSTOMER_GROUPS.find((g: ProdCustomerGroup) => g.id === dataKey);
            if (group) {
              dataKey = group.id;
            }

            if (val == null) return null;

            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{dataKey}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '12px' }}>{Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
            );
          })}
          {/* Inject Total and Avg into Tooltip if they exist in the payload data */}
          {payload[0] && payload[0].payload && (
            <>
              {payload[0].payload.total != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border-light)' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontSize: '12px', fontWeight: 700 }}>Total:</span>
                  <span style={{ color: CHART_COLORS.total, fontWeight: 900, fontSize: '13px' }}>{Number(payload[0].payload.total).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                </div>
              )}
              {payload[0].payload.avg != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontSize: '12px', fontWeight: 700 }}>Avg (Day/Pcs):</span>
                  <span style={{ color: CHART_COLORS.avg, fontWeight: 900, fontSize: '13px' }}>{Number(payload[0].payload.avg).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-ui-surface)', borderRadius: '6px', border: '1px solid var(--color-border-light)' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 'bold' }}>{title}</h3>
        <p style={{ color: 'var(--color-text-tertiary)', marginTop: '8px', fontSize: '0.85rem' }}>(ไม่พบข้อมูลในช่วงที่เลือก)</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-ui-surface)', borderRadius: '6px', border: '1px solid var(--color-border-light)', padding: '10px 14px' }}>
      <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 'bold', textAlign: 'center', margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 15, left: 5, bottom: 0 }}>
            <defs>
              {PROD_CUSTOMER_GROUPS.map((g: ProdCustomerGroup) => (
                <linearGradient id={`gradient-${g.id}`} x1="0" y1="0" x2="0" y2="1" key={g.id}>
                  <stop offset="0%" stopColor={g.color} stopOpacity={1}/>
                  <stop offset="100%" stopColor={g.color} stopOpacity={0.6}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--color-border-light)" strokeOpacity={0.5} />
            <XAxis 
              dataKey="periodLabel" 
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 500 }} 
              axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }} 
              tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5, size: 5 }} 
              tickMargin={6} 
            />
            <YAxis 
              tickFormatter={(v) => v.toLocaleString()}
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 500 }}
              axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
              tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5, size: 5 }}
              tickMargin={6}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-2)', opacity: 0.4 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: '4px', fontWeight: 600 }} iconType="circle" iconSize={8} />

            {/* Bars */}
            {PROD_CUSTOMER_GROUPS.map((g: ProdCustomerGroup) => (
              <Bar key={g.id} dataKey={g.id} name={g.id} fill={`url(#gradient-${g.id})`} maxBarSize={28} radius={[4, 4, 0, 0]} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
