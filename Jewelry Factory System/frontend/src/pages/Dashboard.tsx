import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumbs } from '../contexts/BreadcrumbContext';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { fetchDashboardData, fetchAvailableYears, type DashboardData, type CardType } from '../services/dashboardAPI';
import CardDetailPanel from '../components/dashboard/overview/CardDetailPanel';
import CustomSelect from '../components/ui/CustomSelect';
import { AlertTriangle, RefreshCw, TrendingUp, Package, Users, BarChart3, Clock, ArrowRight, Gem, Wrench, Calendar } from 'lucide-react';

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--color-surface-1) 25%, var(--color-surface-2) 50%, var(--color-surface-1) 75%)',
  backgroundSize: '400% 100%', animation: 'skeletonShimmer 1.6s ease-in-out infinite', borderRadius: '12px',
};

const fDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PROC_COLORS = [
  'var(--color-proc-casting)',
  'var(--color-proc-grinding)',
  'var(--color-proc-polishing)',
  'var(--color-proc-plating)',
  'var(--color-proc-qc)',
  'var(--color-proc-packing)'
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => { setBreadcrumbs(BREADCRUMBS.DASHBOARD); }, [setBreadcrumbs]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [dashboardState, setDashboardState] = useState<{
    key: string;
    data: DashboardData | null;
    error: string | null;
  }>({ key: '', data: null, error: null });
  const [clock, setClock] = useState('');
  const [expandedCard, setExpandedCard] = useState<CardType | null>(null);
  
  // Year filter states (default to current year)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [yearsList, setYearsList] = useState<number[]>([]);

  // Stat card → CardType mapping
  const CARD_TYPE_MAP: Record<string, CardType> = {
    'Orders Today': 'today', 'Completed': 'completed',
    'Work In Progress': 'wip', 'Overdue': 'overdue', 'This Month': 'month',
  };

  const requestKey = `${selectedYear}:${refreshVersion}`;
  const hasCurrentData = dashboardState.key === requestKey;
  const data = hasCurrentData ? dashboardState.data : null;
  const error = hasCurrentData ? dashboardState.error : null;
  const loading = !hasCurrentData;
  const load = useCallback(() => setRefreshVersion(version => version + 1), []);

  // 1) Load available years once on mount
  useEffect(() => {
    fetchAvailableYears()
      .then(list => setYearsList(list))
      .catch(() => {});
  }, []);

  // 2) Keep clock ticking independently
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setClock(n.toLocaleDateString('en-US', { weekday:'short', day:'2-digit', month:'short', year:'numeric' }) + ' · ' + n.toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 3) Reload data when selectedYear changes, and setup auto-refresh
  useEffect(() => {
    let cancelled = false;
    fetchDashboardData(selectedYear)
      .then(nextData => {
        if (!cancelled) setDashboardState({ key: requestKey, data: nextData, error: null });
      })
      .catch(() => {
        if (!cancelled) setDashboardState({ key: requestKey, data: null, error: 'Cannot connect to database' });
      });
    const r = setInterval(() => {
      fetchDashboardData(selectedYear)
        .then(nextData => {
          if (!cancelled) setDashboardState({ key: requestKey, data: nextData, error: null });
        })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(r);
    };
  }, [selectedYear, requestKey]);

  // Mount Refresh Button globally
  const { setTopbarActions } = useTopbarActions();
  useEffect(() => {
    setTopbarActions(
      <button onClick={load} style={{ width:36, height:36, borderRadius:8, border:'none', background:'transparent', color:'var(--color-text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--color-surface-2)'; e.currentTarget.style.color='var(--color-brand-600)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--color-text-secondary)'; }}
        title="Refresh Data"
        aria-label="Refresh Data"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={loading ? 'animate-spin text-[var(--color-brand-600)]' : ''} />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, load, loading]);

  // Loading
  if (loading) return (

      <div className="app-page-scroll content-scrollbar">
        <div className="app-content-frame app-content-frame--dashboard app-page-content dashboard-page flex flex-col gap-4">
          {/* Header Skeleton */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', paddingBottom:8 }}>
            <div style={{ width: 220, height: 32, ...shimmerStyle }}/>
            <div style={{ display:'flex', gap:12 }}>
              <div style={{ width: 180, height: 38, ...shimmerStyle }}/>
              <div style={{ width: 140, height: 38, ...shimmerStyle }}/>
              <div style={{ width: 40, height: 40, ...shimmerStyle }}/>
            </div>
          </div>
          
          {/* Row 1: Stat Cards */}
          <div className="dashboard-stat-grid">{Array.from({length:5}).map((_,i) => <div key={i} style={{height:120,...shimmerStyle}}/>)}</div>
          
          {/* Row 2: Stone & Finding */}
          <div className="dashboard-duo-grid">{Array.from({length:2}).map((_,i) => <div key={i} style={{height:180,...shimmerStyle}}/>)}</div>
          
          {/* Row 3: Trend, Donut, Material */}
          <div className="dashboard-triple-grid">{Array.from({length:3}).map((_,i) => <div key={i} style={{height:280,...shimmerStyle}}/>)}</div>
          
          {/* Row 4: Overdue & Customers */}
          <div className="dashboard-bottom-grid">{Array.from({length:2}).map((_,i) => <div key={i} style={{height:320,...shimmerStyle}}/>)}</div>
          
          {/* Row 5: Recent Orders */}
          <div style={{height:140,...shimmerStyle}}/>
        </div>
      </div>
  );

  // Error
  if (error) return (

      <div className="app-page-scroll flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--color-danger-50)' }}>
            <AlertTriangle size={26} style={{ color: 'var(--color-danger-500)' }} />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>{error}</p>
          <button onClick={() => load()} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold" style={{ background:'var(--color-brand-500)', color:'var(--color-ui-on-interactive)' }}>
            <RefreshCw size={14}/> Retry
          </button>
        </div>
      </div>
  );

  const d = data!;
  const trendMax = Math.max(...d.orderTrend.map(t => t.count), 1);
  const procTotal = d.processDistribution.segments.reduce((a,s) => a+s.value, 0);

  // Build conic gradient for donut
  let conicStops = '';
  let cumPct = 0;
  d.processDistribution.segments.forEach((seg, i) => {
    const pct = procTotal > 0 ? (seg.value / procTotal) * 100 : 0;
    conicStops += `${PROC_COLORS[i % PROC_COLORS.length]} ${cumPct}% ${cumPct + pct}%${i < d.processDistribution.segments.length - 1 ? ', ' : ''}`;
    cumPct += pct;
  });

  const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--color-surface-0)', borderRadius: '8px', border: '1px solid var(--color-border-light)',
    boxShadow: 'var(--shadow-panel)', overflow: 'hidden', transition: 'background-color 0.2s ease, border-color 0.2s ease', ...extra,
  });

  const sectionTitle = (icon: React.ReactNode, text: string, action?: React.ReactNode) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-border-light)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.72rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.08em' }}>
        {icon} {text}
      </div>
      {action}
    </div>
  );



  return (
    <>
      <div className="app-page-scroll content-scrollbar">
        <div className="app-content-frame app-content-frame--dashboard app-page-content dashboard-page flex flex-col gap-4">

          {/* Header Controls (Clock, Year Dropdown, Refresh) */}
          <div className="dashboard-page-header" style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', paddingBottom:8, paddingTop: 4 }}>
            <div className="dashboard-page-header__controls" style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', borderRadius:14, background:'var(--color-surface-0)', border:'1px solid var(--color-border-light)' }}>
                <Clock size={16} style={{ color:'var(--color-brand-500)' }}/>
                <span style={{ fontSize:'0.85rem', fontWeight:800, color:'var(--color-text-primary)', fontFamily:'var(--font-display)', letterSpacing:'-0.01em' }}>{clock}</span>
              </div>
              
              {/* Year Dropdown Selector */}
              <div style={{ position:'relative', display:'flex', alignItems:'center', width: 130 }}>
                <CustomSelect
                  value={selectedYear}
                  onChange={v => setSelectedYear(v)}
                  icon={<Calendar size={14} />}
                  options={[
                    { value: 'all', label: 'All Years' },
                    ...yearsList.map(yr => ({ value: yr.toString(), label: yr.toString() }))
                  ]}
                />
              </div>
            </div>
          </div>

          {/* ═══ Stat Cards ═══ */}
          <div className="dashboard-stat-grid">
            {d.statCards.map((c, i) => {
              const ct = CARD_TYPE_MAP[c.label];
              const isActive = expandedCard === ct;
              const isClickable = c.label !== 'Orders Today';
              return (
                <div key={i} onClick={() => isClickable && setExpandedCard(isActive ? null : ct)} style={{
                  ...cardStyle(), padding:'22px 24px', cursor: isClickable ? 'pointer' : 'default',
                  border: isActive ? '1px solid var(--color-brand-500)' : c.isAlert ? '1px solid var(--color-danger-200)' : '1px solid var(--color-border-light)',
                  background: isActive ? 'var(--color-brand-50)' : 'var(--color-surface-0)',
                  boxShadow: 'var(--shadow-panel)',
                }}
                >
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <span style={{ fontSize:'0.8rem', fontWeight:800, color: isActive ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.06em', transition:'color 0.2s' }}>{c.label}</span>
                    {c.isAlert && (
                      <span style={{ width:10, height:10, borderRadius:'50%', background:'var(--color-danger-500)' }}/>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'var(--erp-text-grand)', fontWeight:900, color:'var(--color-text-primary)', fontFamily:'var(--font-display)', lineHeight:1 }}>
                        {typeof c.value === 'number' ? c.value.toLocaleString() : c.value}
                      </div>
                      {c.change && <div style={{ fontSize:'0.78rem', fontWeight:700, marginTop:8, color: c.trend==='bad'?'var(--color-danger-500)': c.trend==='down'?'var(--color-danger-500)':'var(--color-success-500)', fontFamily:'monospace' }}>{c.change}</div>}
                    </div>
                    {c.yoyPct != null && (
                      <div style={{
                        display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2
                      }}>
                        <span style={{
                          display:'inline-flex', alignItems:'center', gap:3,
                          padding:'4px 10px', borderRadius:20,
                          fontSize:'0.78rem', fontWeight:800,
                          background: c.yoyPct >= 0 ? 'color-mix(in srgb, var(--color-success-500) 12%, transparent)' : 'color-mix(in srgb, var(--color-danger-500) 12%, transparent)',
                          color: c.yoyPct >= 0 ? 'var(--color-success-500)' : 'var(--color-danger-500)',
                          border: `1px solid ${c.yoyPct >= 0 ? 'color-mix(in srgb, var(--color-success-500) 20%, transparent)' : 'color-mix(in srgb, var(--color-danger-500) 20%, transparent)'}`,
                        }}>
                          <TrendingUp size={12} style={{ transform: c.yoyPct < 0 ? 'rotate(180deg)' : 'none' }}/> {c.yoyPct > 0 ? '+' : ''}{c.yoyPct}%
                        </span>
                        <span style={{ fontSize:'0.6rem', fontWeight:600, color:'var(--color-text-tertiary)' }}>{c.yoyLabel}</span>
                      </div>
                    )}
                  </div>
                  {/* Active indicator */}
                  <div style={{ height:3, borderRadius:2, background: isActive ? 'var(--color-brand-500)' : 'transparent', marginTop:10, transition:'all 0.3s' }}/>
                </div>
              );
            })}
          </div>

          {/* ═══ Expandable Detail Panel ═══ */}
          {expandedCard && (
            <CardDetailPanel cardType={expandedCard} selectedYear={selectedYear} onClose={() => setExpandedCard(null)} />
          )}
          {/* ═══ Stone & Finding Cards ═══ */}
          {d.stoneFindings && (() => {
            const sf = d.stoneFindings;

            const sfCard = (opts: { icon: React.ReactNode; title: string; subtitle: string; pending: number; pendingQty: number; done: number; accentColor: string; bgAccent: string; borderAccent: string; navPath: string; navLabel: string }) => (
              <div style={{
                ...cardStyle(), padding: 0, display: 'flex', flexDirection: 'column',
                border: `1px solid ${opts.borderAccent}`,
              }}>
                {/* Header */}
                <div style={{ padding: '18px 24px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: opts.bgAccent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {opts.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>{opts.title}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.06em' }}>{opts.subtitle}</div>
                    </div>
                  </div>
                  <button onClick={() => navigate(opts.navPath)} style={{
                    display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', fontWeight: 800,
                    color: opts.accentColor, background: opts.bgAccent, border: 'none',
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    textTransform: 'capitalize', letterSpacing: '0.05em', transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.9)'; }}
                    onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
                  >
                    {opts.navLabel} <ArrowRight size={11}/>
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '0 24px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Numbers row */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 'var(--erp-text-grand)', fontWeight: 900, color: opts.accentColor, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                        {opts.pending.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Items Pending</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                        {opts.pendingQty.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginTop: 4, textTransform: 'capitalize' }}>pcs pending</div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-success-500)', fontFamily: 'var(--font-display)' }}>{opts.done.toLocaleString()}</div>
                      <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em', marginTop: 2 }}>Done</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: opts.accentColor, fontFamily: 'var(--font-display)' }}>{opts.pending.toLocaleString()}</div>
                      <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em', marginTop: 2 }}>Pending</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{(opts.pending + opts.done).toLocaleString()}</div>
                      <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em', marginTop: 2 }}>Total</div>
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <div className="dashboard-duo-grid">
                {sfCard({
                  icon: <Gem size={18} style={{ color: 'var(--color-brand-600)' }}/>,
                  title: 'Stone',
                  subtitle: 'Gemstone preparation status',
                  pending: sf.stone.pending,
                  pendingQty: sf.stone.pendingQty,
                  done: sf.stone.done,
                  accentColor: 'var(--color-brand-600)',
                  bgAccent: 'var(--color-brand-50)',
                  borderAccent: 'var(--color-border-light)',
                  navPath: '/procurement/purchase',
                  navLabel: 'Purchase Stone',
                })}
                {sfCard({
                  icon: <Wrench size={18} style={{ color: 'var(--color-brand-600)' }}/>,
                  title: 'Finding',
                  subtitle: 'Finding preparation status',
                  pending: sf.finding.pending,
                  pendingQty: sf.finding.pendingQty,
                  done: sf.finding.done,
                  accentColor: 'var(--color-brand-600)',
                  bgAccent: 'var(--color-brand-50)',
                  borderAccent: 'var(--color-border-light)',
                  navPath: '/spare-parts/order',
                  navLabel: 'Spare Parts',
                })}
              </div>
            );
          })()}


          <div className="dashboard-triple-grid">

            {/* 7-Day Trend */}
            <div style={cardStyle()}>
              {sectionTitle(<TrendingUp size={14}/>, 'Order Trend (7 Days)')}
              <div style={{ padding:'16px 20px', display:'flex', alignItems:'flex-end', gap:6, height:200 }}>
                {d.orderTrend.map((t, i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <span style={{ fontSize:'0.62rem', fontWeight:800, color:'var(--color-text-primary)' }}>{t.count || ''}</span>
                    <div style={{
                      width:'100%', borderRadius:'8px 8px 2px 2px', transition:'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                      height: `${Math.max((t.count / trendMax) * 140, 4)}px`,
                      background: t.count > 0 ? 'var(--color-brand-500)' : 'var(--color-border-light)',
                      opacity: 0.3 + (t.count / trendMax) * 0.7,
                    }}/>
                    <span style={{ fontSize:'0.58rem', fontWeight:700, color:'var(--color-text-tertiary)', textTransform: 'capitalize' }}>{t.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Process Donut */}
            <div style={cardStyle()}>
              {sectionTitle(<BarChart3 size={14}/>, 'Process Distribution')}
              <div style={{ padding:'20px', display:'flex', alignItems:'center', justifyContent:'center', gap:24 }}>
                <div style={{ position:'relative', width:130, height:130, borderRadius:'50%', background:`conic-gradient(${conicStops})`, flexShrink:0 }}>
                  <div style={{ position:'absolute', inset:20, borderRadius:'50%', background:'var(--color-surface-0)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', boxShadow:'var(--shadow-inset-panel)' }}>
                    <span style={{ fontSize:'1.4rem', fontWeight:900, color:'var(--color-text-primary)', fontFamily:'var(--font-display)' }}>{d.processDistribution.total.toLocaleString()}</span>
                    <span style={{ fontSize:'0.55rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.1em' }}>Items</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {d.processDistribution.segments.map((seg, i) => (
                    <div key={seg.label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.7rem' }}>
                      <span style={{ width:10, height:10, borderRadius:3, background:PROC_COLORS[i%PROC_COLORS.length], flexShrink:0 }}/>
                      <span style={{ fontWeight:700, color:'var(--color-text-secondary)', minWidth:60 }}>{seg.label}</span>
                      <span style={{ fontWeight:800, color:'var(--color-text-primary)', marginLeft:'auto' }}>{seg.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Material & Type Breakdown */}
            <div style={cardStyle()}>
              {sectionTitle(<Package size={14}/>, 'Material & Type')}
              <div style={{ padding:'16px 20px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {d.materialBreakdown.map(m => {
                    const pct = d.statCards[2]?.value > 0 ? Math.round((m.orders / (d.statCards[2].value as number)) * 100) : 0;
                    return (
                      <div key={m.code} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--color-text-secondary)', minWidth:130, whiteSpace:'nowrap' }}>{m.material}</span>
                        <div style={{ flex:1, height:8, borderRadius:4, background:'var(--color-surface-2)', overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', borderRadius:4, background:'var(--color-brand-500)', transition:'width 0.6s' }}/>
                        </div>
                        <span style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--color-text-primary)', minWidth:40, textAlign:'right' }}>{m.orders.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop:'1px solid var(--color-border-light)', paddingTop:12, display:'flex', gap:12 }}>
                  {d.orderTypes.map(t => (
                    <div key={t.type} style={{ flex:1, padding:'10px 12px', borderRadius:12, background:'var(--color-surface-1)', border:'1px solid var(--color-border-light)', textAlign:'center' }}>
                      <div style={{ fontSize:'1.1rem', fontWeight:900, color:'var(--color-text-primary)', fontFamily:'var(--font-display)' }}>{t.count.toLocaleString()}</div>
                      <div style={{ fontSize:'0.58rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.05em', marginTop:2 }}>{t.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Bottom Row: Top Customers | Delay Orders ═══ */}
          <div className="dashboard-bottom-grid">

            {/* Top Customers */}
            <div style={cardStyle()}>
              {sectionTitle(<Users size={14}/>, 'Top Customers (Active)')}
              <div style={{ padding:'4px 0' }}>
                {d.topCustomers.map((c, i) => (
                  <div key={c.code} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom: i < d.topCustomers.length-1 ? '1px solid var(--color-border-light)' : 'none', transition:'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--color-surface-1)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <span style={{ width:24, height:24, borderRadius:8, background:'var(--color-brand-50)', color:'var(--color-brand-600)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:900, flexShrink:0 }}>{i+1}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'0.78rem', fontWeight:800, color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--color-text-tertiary)' }}>{c.code} · {c.orders} orders</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'0.8rem', fontWeight:900, color:'var(--color-brand-600)' }}>{c.qty.toLocaleString()}</div>
                      <div style={{ fontSize:'0.55rem', fontWeight:700, color:'var(--color-text-tertiary)', textTransform: 'capitalize' }}>pcs</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delay Orders */}
            <div style={cardStyle()}>
              {sectionTitle(
                <><AlertTriangle size={14} style={{color:'var(--color-danger-500)'}}/></>,
                'Overdue Orders',
                <button onClick={() => navigate('/po-tracker')} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.65rem', fontWeight:800, color:'var(--color-brand-600)', background:'var(--color-brand-50)', border:'none', padding:'6px 12px', borderRadius:20, cursor:'pointer', textTransform: 'capitalize', letterSpacing:'0.05em' }}>
                  View PO Tracker <ArrowRight size={12}/>
                </button>
              )}
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', fontSize:'0.75rem', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--color-surface-1)' }}>
                      {['Order','PO','Customer','Due Date','Days Late','Qty'].map(h => (
                        <th key={h} style={{ padding:'10px 16px', textAlign: h==='Days Late'||h==='Qty'?'right':'left', fontSize:'0.62rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.08em', borderBottom:'1px solid var(--color-border-light)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.delayOrders.map((o, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--color-border-light)', transition:'background 0.2s', cursor:'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--color-surface-1)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                        onClick={() => navigate(`/po-tracker/${o.ordNo}`)}
                      >
                        <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--color-brand-600)' }}>{o.ordNo}</td>
                        <td style={{ padding:'10px 16px', fontWeight:600, color:'var(--color-text-secondary)' }}>{o.poNo}</td>
                        <td style={{ padding:'10px 16px', fontWeight:700, color:'var(--color-text-primary)' }}>
                          <div>{o.custCode}</div>
                          <div style={{ fontSize:'0.6rem', color:'var(--color-text-tertiary)', fontWeight:600 }}>{o.custName}</div>
                        </td>
                        <td style={{ padding:'10px 16px', fontWeight:600, color:'var(--color-text-secondary)' }}>{fDate(o.dueDate)}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:900, color:'var(--color-danger-500)' }}>{o.delayDays.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'var(--color-text-primary)' }}>{o.qty?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ═══ Recent Orders ═══ */}
          <div style={cardStyle()}>
            {sectionTitle(
              <><Clock size={14}/><span style={{ display:'inline-flex', alignItems:'center', gap:4, marginLeft:8, padding:'2px 8px', borderRadius:12, background:'var(--color-success-50)', fontSize:'0.58rem', fontWeight:900, color:'var(--color-success-500)', textTransform: 'capitalize' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--color-success-500)' }}/> Live
              </span></>,
              'Recent Orders',
            )}
            <div className="dashboard-recent-grid">
              {d.recentOrders.map((o, i) => (
                <div key={i} style={{ padding:'16px 20px', borderRight: i<5?'1px solid var(--color-border-light)':'none', cursor:'pointer', transition:'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--color-surface-1)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  onClick={() => navigate(`/po-tracker/${o.ordNo}`)}
                >
                  <div style={{ fontSize:'0.78rem', fontWeight:900, color:'var(--color-text-primary)', marginBottom:4 }}>{o.ordNo}</div>
                  <div style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--color-text-tertiary)', marginBottom:8 }}>{o.custCode} · {o.material}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'0.85rem', fontWeight:900, color:'var(--color-brand-600)', fontFamily:'var(--font-display)' }}>{o.qty?.toLocaleString()}</span>
                    <span style={{
                      fontSize:'0.55rem', fontWeight:800, padding:'3px 8px', borderRadius:6, textTransform: 'capitalize', letterSpacing:'0.04em',
                      background: o.status==='Overdue'?'var(--color-danger-50)': o.status==='Completed'?'var(--color-success-50)':'var(--color-brand-50)',
                      color: o.status==='Overdue'?'var(--color-danger-500)': o.status==='Completed'?'var(--color-success-500)':'var(--color-brand-600)',
                    }}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
