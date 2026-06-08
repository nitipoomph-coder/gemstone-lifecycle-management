import { useState, useMemo, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import { Calendar, ArrowUpRight, ArrowDownRight, Minus, DollarSign, Building, RefreshCw, Users, UserCheck } from 'lucide-react';
import { fetchCustomerSummary, fetchAvailableYears } from '../services/dashboardAPI';

const COLORS = [
  'var(--color-proc-plating)', 'var(--color-proc-polishing)', 'var(--color-info-500)',
  'var(--color-brand-300)', 'var(--color-brand-500)', 'var(--color-brand-700)',
  'var(--color-proc-qc)', 'var(--color-success-500)', 'var(--color-proc-grinding)',
  'var(--color-danger-500)', 'var(--color-proc-casting)', 'var(--color-accent-500)'
];

// กลุ่มลูกค้า
const CUSTOMER_GROUPS = [
  { id: 'all', label: 'All Customers' },
  { id: 'N008', label: 'N008 Group' },
  { id: 'MLT', label: 'MLT Group' },
  { id: 'N083', label: 'N083 Group' },
  { id: 'N044', label: 'N044 Group' },
  { id: 'N051', label: 'N051 Group' },
  { id: 'General', label: 'General' },
];

// ชื่อ Sales 
const SALES_REPS = [
  { id: 'all', label: 'All Sales' },
  { id: 'SSA1', label: 'Beau-Kook-Un' },
  { id: 'SSA2', label: 'Beau-Un' },
  { id: 'SSA3', label: 'Buum-Am-Fah' },
  { id: 'SSA4', label: 'Buum-Nan-Fah' },
  { id: 'SSA5', label: 'Buum-Pup-Ni' },
  { id: 'SSA6', label: 'Buum-Pup' },
  { id: 'SSA7', label: 'Eileen-Pui-Neng' },
  { id: 'SSA8', label: 'Som N.-Manow' },
  { id: 'SSA9', label: 'Wendy' },
  { id: 'SSA10', label: 'Som N.-Som N.-Manow' },
  { id: 'SSA11', label: 'Sale Other' },
  { id: 'SSA12', label: 'Sale Thailand' },
];

export default function CustomerDashboard() {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [custData, setCustData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('monthly');
  const [showLabels, setShowLabels] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedSales, setSelectedSales] = useState('all');

  useEffect(() => {
    if (selectedYears.length > 3) {
      setShowLabels(false);
    } else {
      setShowLabels(true);
    }
  }, [selectedYears.length]);

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
    fetchCustomerSummary(selectedYears)
      .then(data => {
        setCustData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedYears]);

  // Filter data ตาม group และ sales ที่เลือก
  const filteredCustData = useMemo(() => {
    let filtered = custData;
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(c => {
        const custId = (c.id || '').toUpperCase();
        if (selectedGroup === 'General') {
          // General = ลูกค้าที่ไม่อยู่ในกลุ่มใดเลย
          return !['N008', 'MLT', 'N083', 'N044', 'N051'].some(g => custId.startsWith(g));
        }
        return custId.startsWith(selectedGroup.toUpperCase());
      });
    }
    if (selectedSales !== 'all') {
      const salesLabel = SALES_REPS.find(s => s.id === selectedSales)?.label || '';
      filtered = filtered.filter(c => (c.salesName || '') === salesLabel);
    }
    return filtered;
  }, [custData, selectedGroup, selectedSales]);

  const toggleYear = (year: string) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year].sort());
    }
  };

  const formatAxisValue = (value: number): string => {
    if (value >= 1000000) {
      return (Math.trunc((value / 1000000) * 100) / 100).toFixed(2) + 'M';
    }
    if (value >= 1000) {
      return (Math.trunc((value / 1000) * 100) / 100).toFixed(2) + 'K';
    }
    return value.toLocaleString();
  };

  // Compute Nice Ticks & Nice Maximum dynamically for Yearly Chart
  const { maxVal, gridTicks } = useMemo(() => {
    let rawMax = 0;
    filteredCustData.forEach(c => {
      selectedYears.forEach(y => {
        if (c.data[y] > rawMax) rawMax = c.data[y];
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
  }, [filteredCustData, selectedYears]);

  // Compute Monthly Aggregation & Ticks
  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const series = months.map((m, idx) => {
      const row: any = { month: m, monthIdx: idx + 1 };
      selectedYears.forEach(yr => {
        row[yr] = 0;
        row[`${yr}_qty`] = 0;
      });
      return row;
    });

    filteredCustData.forEach(cust => {
      selectedYears.forEach(yr => {
        if (cust.monthly && cust.monthly[yr]) {
          Object.keys(cust.monthly[yr]).forEach(mStr => {
            const mNum = parseInt(mStr);
            if (mNum >= 1 && mNum <= 12) {
              series[mNum - 1][yr] += cust.monthly[yr][mStr];
            }
          });
        }
        if (cust.monthlyQty && cust.monthlyQty[yr]) {
          Object.keys(cust.monthlyQty[yr]).forEach(mStr => {
            const mNum = parseInt(mStr);
            if (mNum >= 1 && mNum <= 12) {
              series[mNum - 1][`${yr}_qty`] += cust.monthlyQty[yr][mStr];
            }
          });
        }
      });
    });

    let rawMax = 0;
    series.forEach(row => {
      selectedYears.forEach(yr => {
        if (row[yr] > rawMax) rawMax = row[yr];
      });
    });
    rawMax = Math.max(rawMax, 1000);

    const targets = [
      1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500,
      1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000,
      100000, 200000, 250000, 500000, 1000000, 2000000, 5000000, 10000000
    ];
    const roughStep = rawMax / 5;
    const niceStep = targets.find(t => t >= roughStep) || 10000000;
    const computedMax = Math.ceil(rawMax / niceStep) * niceStep;

    const ticks: number[] = [];
    const numSteps = Math.round(computedMax / niceStep);
    for (let i = 0; i <= numSteps; i++) {
      ticks.push(i * niceStep);
    }

    return { data: series, maxVal: computedMax, gridTicks: ticks };
  }, [filteredCustData, selectedYears]);

  const currentMonthIdx = new Date().getMonth() + 1;

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'SALES SUMMARY BY CUSTOMER' }]} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="p-6 flex flex-col gap-6 w-full">

          {/* Header & Filters */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Yearly Sales <span style={{ color: 'var(--color-proc-polishing)' }}>By Customer</span>
              </h1>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Client Account Growth Analysis
              </p>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {selectedYears.length <= 3 && (
                <button onClick={() => setShowLabels(!showLabels)} style={{ padding: '6px 16px', background: showLabels ? 'var(--color-surface-0)' : 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', cursor: 'pointer', boxShadow: showLabels ? '0 2px 8px -2px rgba(0,0,0,0.05)' : 'none' }}>
                  {showLabels ? 'Hide Labels' : 'Show Labels'}
                </button>
              )}

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', background: 'var(--color-surface-0)', padding: 4, borderRadius: 16, border: '1px solid var(--color-border-light)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)' }}>
                <button
                  onClick={() => setViewMode('monthly')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: viewMode === 'monthly' ? '#fff' : 'var(--color-text-tertiary)',
                    background: viewMode === 'monthly' ? 'var(--color-proc-polishing)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'monthly' ? '0 2px 8px -2px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  Monthly View
                </button>
                <button
                  onClick={() => setViewMode('yearly')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: viewMode === 'yearly' ? '#fff' : 'var(--color-text-tertiary)',
                    background: viewMode === 'yearly' ? 'var(--color-proc-polishing)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'yearly' ? '0 2px 8px -2px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  Yearly Breakdown
                </button>
              </div>

              {/* Year Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-surface-0)', padding: '8px 16px', borderRadius: 16, border: '1px solid var(--color-border-light)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  <Calendar size={14} /> Compare Years:
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {availableYears.map((yr) => {
                    const isSelected = selectedYears.includes(yr);
                    const colorIdx = availableYears.indexOf(yr) % COLORS.length;
                    const color = COLORS[colorIdx !== -1 ? colorIdx : 0];
                    return (
                      <button
                        key={yr}
                        onClick={() => toggleYear(yr)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 10,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          border: `1px solid ${isSelected ? color : 'var(--color-border-light)'}`,
                          background: isSelected ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
                          color: isSelected ? color : 'var(--color-text-tertiary)',
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
          </div>

          {/* Filter Groups — กลุ่มลูกค้า + Sales */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Customer Group Filter */}
            <div style={{
              flex: 1, minWidth: 340, background: 'var(--color-surface-0)', borderRadius: 16,
              padding: '14px 20px', border: '1px solid var(--color-border-light)',
              boxShadow: '0 2px 12px -4px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Users size={14} /> Customer Group
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CUSTOMER_GROUPS.map(g => {
                  const isActive = selectedGroup === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroup(g.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 20,
                        fontSize: '0.72rem', fontWeight: 800,
                        border: `1.5px solid ${isActive ? 'var(--color-proc-polishing)' : 'var(--color-border-light)'}`,
                        background: isActive ? 'color-mix(in srgb, var(--color-proc-polishing) 12%, transparent)' : 'var(--color-surface-1)',
                        color: isActive ? 'var(--color-proc-polishing)' : 'var(--color-text-tertiary)',
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isActive ? '0 2px 8px -2px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: `2px solid ${isActive ? 'var(--color-proc-polishing)' : 'var(--color-border-light)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {isActive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-proc-polishing)' }} />}
                      </span>
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sales Rep Filter */}
            <div style={{
              flex: 1, minWidth: 340, background: 'var(--color-surface-0)', borderRadius: 16,
              padding: '14px 20px', border: '1px solid var(--color-border-light)',
              boxShadow: '0 2px 12px -4px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <UserCheck size={14} /> Sales Representative
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SALES_REPS.map(s => {
                  const isActive = selectedSales === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSales(s.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 20,
                        fontSize: '0.72rem', fontWeight: 800,
                        border: `1.5px solid ${isActive ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                        background: isActive ? 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)' : 'var(--color-surface-1)',
                        color: isActive ? 'var(--color-brand-500)' : 'var(--color-text-tertiary)',
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isActive ? '0 2px 8px -2px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: `2px solid ${isActive ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {isActive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-brand-500)' }} />}
                      </span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart Area */}
          {viewMode === 'monthly' && (
            <div style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 32, border: '1px solid var(--color-border-light)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.04)', animation: 'fadeInUp 0.4s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} /> Monthly Sales Summary By Customer
                </h2>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 16 }}>
                  {selectedYears.map((yr) => {
                    const colorIdx = availableYears.indexOf(yr) % COLORS.length;
                    const color = COLORS[colorIdx !== -1 ? colorIdx : 0];
                    return (
                      <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 4, background: color }} /> {yr}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Grouped Bar Chart */}
              <div style={{ display: 'flex', height: 350 }}>
                {/* Fixed Y-Axis Labels */}
                <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', paddingRight: 16, paddingBottom: 30, zIndex: 10 }}>
                  {monthlyChartData.gridTicks.map((tick, i) => (
                    <div key={i} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-quaternary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatAxisValue(tick)}
                    </div>
                  ))}
                </div>

                {/* Chart Area */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', gap: 16, paddingBottom: 40, width: '100%', paddingRight: 16, justifyContent: 'space-between' }}>

                    {/* Y-Axis Grid Lines */}
                    <div style={{ position: 'absolute', inset: '0 0 40px 0', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                      {monthlyChartData.gridTicks.map((_, i) => (
                        <div key={i} style={{ borderTop: '1px dashed var(--color-border-light)', width: '100%' }} />
                      ))}
                    </div>

                    {/* Bars */}
                    {loading && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-proc-polishing)' }}>
                        <RefreshCw className="animate-spin" />
                      </div>
                    )}
                    {!loading && monthlyChartData.data.map((row) => {
                      return (
                        <div key={row.monthIdx} className="group" style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 1 }}>

                          {/* Grouped Bars */}
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: '100%' }}>
                            {selectedYears.map((yr) => {
                              const colorIdx = availableYears.indexOf(yr) % COLORS.length;
                              const color = COLORS[colorIdx !== -1 ? colorIdx : 0];
                              const val = row[yr] || 0;
                              const pct = monthlyChartData.maxVal > 0 ? (val / monthlyChartData.maxVal) * 100 : 0;
                              return (
                                <div key={yr} style={{
                                  flex: 1, maxWidth: 40, height: `${pct}%`, background: color,
                                  borderRadius: '8px 8px 0 0', transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                                  position: 'relative', boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.2)'
                                }}>
                                  {/* Permanent Value Label */}
                                  {val > 0 && showLabels && (
                                    <div style={{
                                      position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                                      fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-text-secondary)',
                                      fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none'
                                    }}>
                                      {formatAxisValue(val).replace('$', '')}
                                    </div>
                                  )}

                                  {/* Hover Tooltip */}
                                  <div className="opacity-0 hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[0.65rem] py-1 px-2 rounded pointer-events-none whitespace-nowrap transition-opacity z-10 font-bold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                    ${val.toLocaleString()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* X-Axis Label */}
                          <div style={{
                            position: 'absolute', bottom: -30, left: 0, width: '100%', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap',
                            color: row.monthIdx === currentMonthIdx ? 'var(--color-proc-polishing)' : 'var(--color-text-secondary)',
                            background: row.monthIdx === currentMonthIdx ? 'color-mix(in srgb, var(--color-proc-polishing) 15%, transparent)' : 'transparent',
                            borderRadius: 12, padding: row.monthIdx === currentMonthIdx ? '2px 0' : 0
                          }}>
                            {row.month}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Chart Section */}
          {viewMode === 'yearly' && (
            <div style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 32, border: '1px solid var(--color-border-light)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.04)', animation: 'fadeInUp 0.4s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building size={18} /> Yearly Top Customers Comparison
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
                  <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', gap: 32, paddingBottom: 40, minWidth: Math.max(1000, filteredCustData.length * 120), paddingRight: 32 }}>

                    {/* Y-Axis Grid Lines */}
                    <div style={{ position: 'absolute', inset: '0 0 40px 0', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                      {gridTicks.map((_, i) => (
                        <div key={i} style={{ borderTop: '1px dashed var(--color-border-light)', width: '100%' }} />
                      ))}
                    </div>

                    {/* Bars */}
                    {filteredCustData.length === 0 && !loading && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>No data found</div>
                    )}
                    {loading && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-proc-polishing)' }}>
                        <RefreshCw className="animate-spin" />
                      </div>
                    )}
                    {filteredCustData.map((cust) => {
                      const firstYear = selectedYears[0];
                      const lastYear = selectedYears[selectedYears.length - 1];
                      const v1 = cust.data[firstYear] || 0;
                      const v2 = cust.data[lastYear] || 0;
                      const growth = v1 > 0 ? ((v2 - v1) / v1) * 100 : 0;

                      const isFlat = Math.abs(growth) < 1.0;
                      const isUp = growth >= 1.0;

                      return (
                        <div key={cust.id} className="group" style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 1 }}>

                          {/* Growth Indicator Badge — Redesigned: larger, bolder, colored accent bar */}
                          <div style={{ position: 'absolute', top: -36, left: '50%', transform: 'translateX(-50%)', display: 'flex', justifyContent: 'center', width: '100%', transition: 'all 0.3s' }}>
                            {isFlat ? (
                              <span style={{
                                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                borderRadius: 6, background: 'var(--color-surface-1)',
                                color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800,
                              }}>
                                <Minus size={14} strokeWidth={2.5} /> Flat
                              </span>
                            ) : (
                              <span style={{
                                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                borderRadius: 6,
                                background: isUp
                                  ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)'
                                  : 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)',
                                color: isUp ? 'var(--color-success-500)' : 'var(--color-danger-500)',
                                fontSize: '0.75rem', fontWeight: 800,
                              }}>
                                {isUp ? <ArrowUpRight size={14} strokeWidth={2.5} /> : <ArrowDownRight size={14} strokeWidth={2.5} />}
                              </span>
                            )}
                          </div>

                          {/* Grouped Bars */}
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: '100%' }}>
                            {selectedYears.map((yr, idx) => {
                              const val = cust.data[yr] || 0;
                              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                              return (
                                <div key={yr} style={{
                                  flex: 1, maxWidth: 60, height: `${pct}%`, background: COLORS[idx % COLORS.length],
                                  borderRadius: '8px 8px 0 0', transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                                  position: 'relative', boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.2)'
                                }}>
                                  {/* Permanent Value Label */}
                                  {val > 0 && showLabels && (
                                    <div style={{
                                      position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                                      fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-text-secondary)',
                                      fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none'
                                    }}>
                                      {formatAxisValue(val).replace('$', '')}
                                    </div>
                                  )}

                                  {/* Hover Tooltip */}
                                  <div className="opacity-0 hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[0.65rem] py-1 px-2 rounded pointer-events-none whitespace-nowrap transition-opacity z-10 font-bold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                    ${val.toLocaleString()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* X-Axis Label */}
                          <div style={{ position: 'absolute', bottom: -30, left: 0, width: '100%', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }} title={cust.id}>
                            {cust.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Table */}
          <div style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 24, border: '1px solid var(--color-border-light)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.03)', animation: 'fadeInUp 0.5s ease-out' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={16} style={{ color: 'var(--color-proc-polishing)' }} /> Breakdown Data
            </h3>
            <div style={{ overflowX: 'auto', paddingBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '250px', minWidth: '250px', textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)', whiteSpace: 'nowrap' }}>Cust ID</th>
                    {selectedYears.map(yr => (
                      <th key={yr} style={{ width: '180px', minWidth: '150px', textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)', whiteSpace: 'nowrap' }}>{yr} Sales</th>
                    ))}
                    <th style={{ width: '150px', minWidth: '150px', textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)', whiteSpace: 'nowrap' }}>Growth</th>
                    <th style={{ borderBottom: '2px solid var(--color-border-light)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustData.map((cust, idx) => {
                    const firstYear = selectedYears[0];
                    const lastYear = selectedYears[selectedYears.length - 1];
                    const v1 = cust.data[firstYear] || 0;
                    const v2 = cust.data[lastYear] || 0;
                    const growth = v1 > 0 ? ((v2 - v1) / v1) * 100 : 0;
                    const isFlat = Math.abs(growth) < 1.0;
                    const isUp = growth >= 1.0;
                    const diff = v2 - v1;

                    return (
                      <tr key={cust.id} style={{ borderBottom: idx === filteredCustData.length - 1 ? 'none' : '1px solid var(--color-border-light)' }}>
                        <td style={{ padding: '16px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                          <div>{cust.id}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                            {cust.custStatus ? `Status: ${cust.custStatus}` : ''} {cust.salesName ? `· Sales: ${cust.salesName}` : ''}
                          </div>
                        </td>
                        {selectedYears.map(yr => (
                          <td key={yr} style={{ padding: '16px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                            ${(cust.data[yr] || 0).toLocaleString()}
                          </td>
                        ))}
                        <td style={{ padding: '16px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          {isFlat ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                              borderRadius: 6, background: 'var(--color-surface-1)',
                              color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800,
                            }}>
                              <Minus size={20} strokeWidth={5} /> 0.0%
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                              borderRadius: 6,
                              background: isUp
                                ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)'
                                : 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)',
                              color: isUp ? 'var(--color-success-500)' : 'var(--color-danger-500)',
                              fontSize: '0.75rem', fontWeight: 800,
                            }}>
                              {isUp ? <ArrowUpRight size={20} strokeWidth={5} /> : <ArrowDownRight size={20} strokeWidth={5} />}
                              {isUp ? '+' : '-'} (${Math.abs(diff).toLocaleString()}) {(Math.round(Math.abs(growth) * 100) / 100).toFixed(2)}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
