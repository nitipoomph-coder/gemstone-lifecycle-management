import { useState, useMemo, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import { Calendar, TrendingUp, TrendingDown, Minus, DollarSign, Users, RefreshCw } from 'lucide-react';
import { fetchSalesSummary, fetchAvailableYears } from '../services/dashboardAPI';

const COLORS = [
  'var(--color-brand-300)', 'var(--color-brand-500)', 'var(--color-brand-700)',
  'var(--color-proc-plating)', 'var(--color-proc-polishing)', 'var(--color-info-500)',
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'
];

export default function SalesDashboard() {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableYears().then(years => {
      const stringYears = years.map(String).sort();
      setAvailableYears(stringYears);
      if (stringYears.length >= 2) {
        setSelectedYears([stringYears[stringYears.length - 2], stringYears[stringYears.length - 1]]);
      } else if (stringYears.length === 1) {
        setSelectedYears([stringYears[0]]);
      }
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedYears.length === 0) return;
    setLoading(true);
    fetchSalesSummary(selectedYears)
      .then(data => {
        setSalesData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedYears]);

  const toggleYear = (year: string) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year].sort());
    }
  };

  const formatAxisValue = (val: number) => {
    if (val >= 1000000) {
      const m = val / 1000000;
      return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
    }
    if (val >= 1000) {
      const k = val / 1000;
      return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
    }
    return `$${Math.round(val)}`;
  };

  // Compute Nice Ticks & Nice Maximum dynamically
  const { maxVal, gridTicks } = useMemo(() => {
    let rawMax = 0;
    salesData.forEach(s => {
      selectedYears.forEach(y => {
        if (s.data[y] > rawMax) rawMax = s.data[y];
      });
    });
    rawMax = Math.max(rawMax, 1000);

    const targets = [
      1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500,
      1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000,
      100000, 200000, 250000, 500000, 1000000, 2000000, 5000000, 10000000
    ];
    const roughStep = rawMax / 4;
    const niceStep = targets.find(t => t >= roughStep) || 10000000;
    const computedMax = Math.ceil(rawMax / niceStep) * niceStep;

    const ticks: number[] = [];
    const numSteps = Math.round(computedMax / niceStep);
    for (let i = 0; i <= numSteps; i++) {
      ticks.push(i * niceStep);
    }

    return { maxVal: computedMax, gridTicks: ticks };
  }, [salesData, selectedYears]);

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'SALES SUMMARY BY SALESPERSON' }]} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="mx-auto p-6 flex flex-col gap-6" style={{ maxWidth: 1400 }}>
          
          {/* Header & Filters */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Yearly Sales <span style={{ color: 'var(--color-brand-500)' }}>By Sales</span>
              </h1>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Comparison & Growth Analysis
              </p>
            </div>
            
            {/* Year Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-surface-0)', padding: '8px 16px', borderRadius: 16, border: '1px solid var(--color-border-light)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                <Calendar size={14} /> Compare Years:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {availableYears.map((yr) => {
                  const isSelected = selectedYears.includes(yr);
                  const colorIdx = availableYears.indexOf(yr);
                  return (
                    <button
                      key={yr}
                      onClick={() => toggleYear(yr)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 10,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        border: `1px solid ${isSelected ? COLORS[colorIdx] : 'var(--color-border-light)'}`,
                        background: isSelected ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
                        color: isSelected ? COLORS[colorIdx] : 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? `0 2px 8px -2px ${COLORS[colorIdx]}40` : 'none'
                      }}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Chart Section */}
          <div style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 32, border: '1px solid var(--color-border-light)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} /> Sales Performance Comparison
              </h2>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16 }}>
                {selectedYears.map((yr, idx) => (
                  <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 4, background: COLORS[idx] }} /> {yr}
                  </div>
                ))}
              </div>
            </div>

            {/* Grouped Bar Chart */}
            <div style={{ display: 'flex', height: 400 }}>
              {/* Fixed Y-Axis Labels */}
              <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', paddingRight: 16, paddingBottom: 30, zIndex: 10 }}>
                {gridTicks.map((tick, i) => (
                  <div key={i} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-quaternary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {formatAxisValue(tick)}
                  </div>
                ))}
              </div>
              
              {/* Scrollable Chart Area */}
              <div className="content-scrollbar" style={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
                <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', gap: 32, paddingBottom: 40, minWidth: Math.max(1000, salesData.length * 120), paddingRight: 32 }}>
                  
                  {/* Y-Axis Grid Lines */}
                  <div style={{ position: 'absolute', inset: '0 0 40px 0', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                    {gridTicks.map((_, i) => (
                      <div key={i} style={{ borderTop: '1px dashed var(--color-border-light)', width: '100%' }} />
                    ))}
                  </div>

                  {/* Bars */}
                  {salesData.length === 0 && !loading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>No data found</div>
                  )}
                  {loading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-brand-500)' }}>
                      <RefreshCw className="animate-spin" />
                    </div>
                  )}
                  {salesData.map((sales) => {
                    // Calculate growth between first selected year and last selected year
                    const firstYear = selectedYears[0];
                const lastYear = selectedYears[selectedYears.length - 1];
                const v1 = sales.data[firstYear] || 0;
                const v2 = sales.data[lastYear] || 0;
                const growth = v1 > 0 ? ((v2 - v1) / v1) * 100 : 0;
                
                const isFlat = Math.abs(growth) < 1.0;
                const isUp = growth >= 1.0;

                return (
                  <div key={sales.id} className="group" style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 1 }}>
                    
                    {/* Growth Indicator Badge above the group */}
                    <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', display: 'flex', justifyContent: 'center', width: '100%', transition: 'all 0.3s', opacity: 0.9 }}>
                      {isFlat ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', fontWeight: 800, border: '1px solid var(--color-border-light)' }}>
                          <Minus size={10} /> Flat
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 10px', borderRadius: 12, background: isUp ? 'color-mix(in srgb, var(--color-success-500) 10%, transparent)' : 'color-mix(in srgb, var(--color-danger-500) 10%, transparent)', color: isUp ? 'var(--color-success-500)' : 'var(--color-danger-500)', fontSize: '0.65rem', fontWeight: 900, border: `1px solid ${isUp ? 'color-mix(in srgb, var(--color-success-500) 20%, transparent)' : 'color-mix(in srgb, var(--color-danger-500) 20%, transparent)'}` }}>
                          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(growth).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {/* Grouped Bars */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: '100%' }}>
                      {selectedYears.map((yr, idx) => {
                        const val = sales.data[yr] || 0;
                        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                        return (
                          <div key={yr} style={{
                            flex: 1, maxWidth: 60, height: `${pct}%`, background: COLORS[idx % COLORS.length],
                            borderRadius: '8px 8px 0 0', transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                            position: 'relative', boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.2)'
                          }}>
                            {/* Permanent Value Label */}
                            {val > 0 && (
                              <div style={{
                                position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                                fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-text-secondary)',
                                fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none'
                              }}>
                                {formatAxisValue(val).replace('$', '')}
                              </div>
                            )}

                            {/* Hover Tooltip */}
                            <div className="opacity-0 hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 text-[0.65rem] py-1 px-2 rounded pointer-events-none whitespace-nowrap transition-opacity z-10 font-bold" style={{ background: 'var(--color-surface-800)', color: 'var(--color-text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
                              ${val.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* X-Axis Label */}
                    <div style={{ position: 'absolute', bottom: -30, left: 0, width: '100%', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }} title={sales.name}>
                      {sales.name}
                    </div>
                  </div>
                );
              })}
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 24, border: '1px solid var(--color-border-light)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.03)' }}>
             <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={16} style={{ color: 'var(--color-brand-500)' }}/> Breakdown Data
             </h3>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr>
                   <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)' }}>Salesperson</th>
                   {selectedYears.map(yr => (
                     <th key={yr} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)' }}>{yr} Sales</th>
                   ))}
                   <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)' }}>Growth</th>
                 </tr>
               </thead>
               <tbody>
                 {salesData.map((sales, idx) => {
                    const firstYear = selectedYears[0];
                    const lastYear = selectedYears[selectedYears.length - 1];
                    const v1 = sales.data[firstYear] || 0;
                    const v2 = sales.data[lastYear] || 0;
                    const growth = v1 > 0 ? ((v2 - v1) / v1) * 100 : 0;
                    const isFlat = Math.abs(growth) < 1.0;
                    const isUp = growth >= 1.0;

                    return (
                      <tr key={sales.id} style={{ borderBottom: idx === salesData.length - 1 ? 'none' : '1px solid var(--color-border-light)' }}>
                        <td style={{ padding: '16px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          <div>{sales.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                            ID: {sales.id} {sales.empType ? `· ${sales.empType}` : ''} {sales.salesLv ? `· Lv${sales.salesLv}` : ''}
                          </div>
                        </td>
                        {selectedYears.map(yr => (
                          <td key={yr} style={{ padding: '16px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                            ${(sales.data[yr] || 0).toLocaleString()}
                          </td>
                        ))}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, background: isFlat ? 'var(--color-surface-1)' : isUp ? 'color-mix(in srgb, var(--color-success-500) 10%, transparent)' : 'color-mix(in srgb, var(--color-danger-500) 10%, transparent)', color: isFlat ? 'var(--color-text-secondary)' : isUp ? 'var(--color-success-500)' : 'var(--color-danger-500)', fontSize: '0.7rem', fontWeight: 800 }}>
                            {isFlat ? 'Flat' : `${isUp ? '+' : ''}${growth.toFixed(1)}%`}
                          </span>
                        </td>
                      </tr>
                    );
                 })}
               </tbody>
             </table>
          </div>

        </div>
      </div>
    </>
  );
}
