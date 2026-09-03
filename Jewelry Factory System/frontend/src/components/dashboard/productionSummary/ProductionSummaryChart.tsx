// src/components/dashboard/productionSummary/ProductionSummaryChart.tsx
import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  PROD_CUSTOMER_GROUPS,
  CHART_COLORS,
  niceNum,
} from '../../../config/productionSummaryConfig';
import type { ProdCustomerGroup } from '../../../config/productionSummaryConfig';

interface ChartProps {
  data: any[];
  title: string;
  showAvgLine?: boolean; // year/week tabs have avg
}

export function ProductionSummaryChart({ data, title, showAvgLine = false }: ChartProps) {
  // -------------------------------------------------------------
  // 1. คำนวณสเกล 3-Zone Layering + Ticks แกน Y + Smart Trimming
  // -------------------------------------------------------------
  const { chartData, yAxisMax, yAxisTicks, y2Min, y2Max, hasData } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        chartData: [],
        yAxisMax: 100,
        yAxisTicks: [0, 50, 100],
        y2Min: 0,
        y2Max: 100,
        hasData: false,
      };
    }

    let maxBar = 0;
    let maxTot = 0;
    let minTot = Number.MAX_VALUE;
    let maxAvg = 0;
    let minAvg = Number.MAX_VALUE;
    let anyData = false;

    data.forEach((d) => {
      PROD_CUSTOMER_GROUPS.forEach((g) => {
        const val = Number(d[g.id] || 0);
        if (val > maxBar) maxBar = val;
      });

      const tot = Number(d.total || 0);
      if (tot > 0) {
        anyData = true;
        if (tot > maxTot) maxTot = tot;
        if (tot < minTot) minTot = tot;
      }

      const avg = Number(d.avg || 0);
      if (avg > 0) {
        if (avg > maxAvg) maxAvg = avg;
        if (avg < minAvg) minAvg = avg;
      }
    });

    if (minTot === Number.MAX_VALUE) minTot = 0;
    if (minAvg === Number.MAX_VALUE) minAvg = 0;

    // โซน 3 ชั้น
    const BAR_ZONE = 0.52; // แท่งอยู่ล่าง ~52%
    const TOT_LO = 0.58;   // เส้น Total ลอย 58% - 78%
    const TOT_HI = 0.78;
    const AVG_LO = 0.84;   // เส้น Avg ลอย 84% - 94%
    const AVG_HI = 0.94;

    // 1) คำนวณเพดานและ Ticks แกน Y หลัก
    let calculatedYMax = 1000;
    let calculatedTicks: number[] = [0, 500, 1000];

    if (maxBar > 0) {
      const pTarget = maxBar / BAR_ZONE;
      const pInt = niceNum(pTarget / 12.0);
      calculatedYMax = Math.ceil(pTarget / pInt) * pInt;

      calculatedTicks = [];
      for (let val = 0; val <= calculatedYMax; val += pInt) {
        calculatedTicks.push(val);
      }
    }

    // 2) แกน Y รองสำหรับเส้น Avg
    let calculatedY2Min = 0;
    let calculatedY2Max = 100;
    if (maxAvg > 0) {
      if (maxAvg > minAvg) {
        const spanA = (maxAvg - minAvg) / (AVG_HI - AVG_LO);
        calculatedY2Min = minAvg - AVG_LO * spanA;
        calculatedY2Max = calculatedY2Min + spanA;
      } else {
        calculatedY2Min = 0;
        calculatedY2Max = maxAvg / AVG_HI;
      }
    }

    // 3) Smart Trimming: ตัดช่วงว่างหัว-ท้ายที่เป็น 0 ออก (ตามแบบระบบเดิม)
    let firstIdx = -1;
    let lastIdx = -1;

    data.forEach((d, index) => {
      const tot = Number(d.total || 0);
      if (tot > 0) {
        if (firstIdx === -1) firstIdx = index;
        lastIdx = index;
      }
    });

    // ถ้าไม่มีข้อมูลเลยในทุกช่วง
    if (firstIdx === -1) {
      return {
        chartData: [],
        yAxisMax: 100,
        yAxisTicks: [0, 50, 100],
        y2Min: 0,
        y2Max: 100,
        hasData: false,
      };
    }

    // ตัดเอาเฉพาะช่วงวัน/เดือนแรกที่มีข้อมูล ถึงวัน/เดือนสุดท้ายที่มีข้อมูล
    const activeData = data.slice(firstIdx, lastIdx + 1);

    const processed = activeData.map((d) => {
      const tot = Number(d.total || 0);
      let totalPlotY: number | null = null;

      if (tot > 0) {
        let frac = (TOT_LO + TOT_HI) / 2;
        if (maxTot > minTot) {
          frac = TOT_LO + ((tot - minTot) / (maxTot - minTot)) * (TOT_HI - TOT_LO);
        }
        totalPlotY = calculatedYMax * frac;
      }

      return {
        ...d,
        _totalPlotY: totalPlotY,
        _avg: Number(d.avg || 0) > 0 ? Number(d.avg) : null,
      };
    });

    return {
      chartData: processed,
      yAxisMax: calculatedYMax,
      yAxisTicks: calculatedTicks,
      y2Min: calculatedY2Min,
      y2Max: calculatedY2Max,
      hasData: anyData,
    };
  }, [data]);


  // -------------------------------------------------------------
  // 2. Data Labels (แสดงตัวเลขจริง)
  // -------------------------------------------------------------
  const renderTotalLabel = (props: any) => {
    const { x, y, index } = props;
    const item = chartData[index];
    if (!item || !item.total || item.total === 0) return <g />; // 👈 เปลี่ยนเป็น <g />;

    return (
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        fill="var(--color-text-primary)"
        fontSize={10}
        fontWeight={700}
      >
        {Number(item.total).toLocaleString()}
      </text>
    );
  };

  const renderAvgLabel = (props: any) => {
    const { x, y, value } = props;
    if (value == null || value === 0) return <g />; // 👈 เปลี่ยนเป็น <g />;

    return (
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        fill={CHART_COLORS.avg}
        fontSize={10}
        fontWeight={700}
      >
        {Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </text>
    );
  };

  // -------------------------------------------------------------
  // 3. Custom Tooltip
  // -------------------------------------------------------------
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentItem = payload[0]?.payload;
      return (
        <div
          style={{
            padding: '12px 16px 8px', //บน-ซ้าย-ล่าง
            background: 'var(--color-ui-surface)',
            border: '1px solid var(--color-border-light)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-dropdown)',
            minWidth: '190px',
          }}
        >
          <p
            style={{
              fontWeight: 800,
              marginBottom: '10px',
              color: 'var(--color-text-primary)',
              borderBottom: '1px solid var(--color-border-light)',
              paddingBottom: '6px',
            }}
          >
            {label}
          </p>

          {PROD_CUSTOMER_GROUPS.map((g: ProdCustomerGroup) => {
            const val = currentItem?.[g.id];
            if (val == null || val === 0) return null;
            return (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  marginBottom: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: g.color }} />
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{g.id}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '12px' }}>
                  {Number(val).toLocaleString()}
                </span>
              </div>
            );
          })}

          {currentItem?.total > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginTop: '6px',
                paddingTop: '4px',
                borderTop: '1px dashed var(--color-border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '3px', backgroundColor: CHART_COLORS.total }} />
                <span style={{ color: 'var(--color-text-primary)', fontSize: '12px', fontWeight: 600 }}>Total</span>
              </div>
              <span style={{ fontWeight: 800, color: CHART_COLORS.total, fontSize: '12px' }}>
                {Number(currentItem.total).toLocaleString()}
              </span>
            </div>
          )}

          {showAvgLine && currentItem?.avg > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginTop: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '3px', backgroundColor: CHART_COLORS.avg }} />
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Avg (Day/Pcs)</span>
              </div>
              <span style={{ fontWeight: 800, color: CHART_COLORS.avg, fontSize: '12px' }}>
                {Number(currentItem.avg).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };


  if (!hasData) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-ui-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-light)',
          padding: '24px',
        }}
      >
        <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 'bold' }}>{title}</h3>
        <p style={{ color: 'var(--color-text-tertiary)', marginTop: '8px', fontSize: '0.85rem' }}>
          (ไม่พบข้อมูลในช่วงที่เลือก)
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-ui-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-light)',
        padding: '12px 16px 8px',
      }}
    >
      <h3
        style={{
          fontSize: '1rem',
          color: 'var(--color-text-primary)',
          fontWeight: 700,
          textAlign: 'center',
          margin: '0 0 8px 0',
        }}
      >
        {title}
      </h3>

      {/* 👈 กราฟความสูง 100% ตามกล่องแม่ (320px) */}
      <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
        <ResponsiveContainer width="99%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
            <XAxis
              dataKey="periodLabel"
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 600 }}
              axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
              tickLine={false}
              tickMargin={8}
            />

            {/* แกน Y หลัก พร้อมกำหนด Ticks ถี่ๆ แบบระบบเดิม */}
            <YAxis
              yAxisId="mainAxis"
              domain={[0, yAxisMax]}
              ticks={yAxisTicks}
              interval={0}
              tickFormatter={(v) => v.toLocaleString()}
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }}
              axisLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1.5 }}
              tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }}
              tickMargin={6}
              width={60}
            />

            {/* แกน Y รอง (ซ่อนรูป สำหรับเส้น Avg) */}
            <YAxis
              yAxisId="avgAxis"
              orientation="right"
              domain={[y2Min, y2Max]}
              hide={true}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />

            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: '6px', fontWeight: 600 }}
              iconType="square"
              iconSize={10}
            />

            {/* แท่ง 3 กลุ่ม */}
            {PROD_CUSTOMER_GROUPS.map((g: ProdCustomerGroup) => (
              <Bar
                key={g.id}
                yAxisId="mainAxis"
                dataKey={g.id}
                name={g.id}
                fill={g.color}
                maxBarSize={38}
                radius={[3, 3, 0, 0]}
              />
            ))}

            {/* เส้น Total */}
            <Line
              yAxisId="mainAxis"
              type="monotone"
              dataKey="_totalPlotY"
              name="Total"
              stroke={CHART_COLORS.total}
              strokeWidth={3}
              dot={{ r: 4, fill: CHART_COLORS.total, stroke: 'var(--color-ui-surface)', strokeWidth: 1.5 }}
              activeDot={{ r: 6 }}
              connectNulls={true}
              label={renderTotalLabel}
            />

            {/* เส้น Avg */}
            {showAvgLine && (
              <Line
                yAxisId="avgAxis"
                type="monotone"
                dataKey="_avg"
                name="Avg (Day/Pcs)"
                stroke={CHART_COLORS.avg}
                strokeWidth={3}
                dot={{ r: 4, fill: CHART_COLORS.avg, stroke: 'var(--color-ui-surface)', strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
                label={renderAvgLabel}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

}
