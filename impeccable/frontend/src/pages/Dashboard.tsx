import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { fetchDashboardData, type DashboardData } from '../services/dashboardAPI';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// ─── Loading skeleton shimmer animation ───────────────────────────────────────
const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--color-surface-1) 25%, var(--color-surface-2) 50%, var(--color-surface-1) 75%)',
  backgroundSize: '400% 100%',
  animation: 'skeletonShimmer 1.6s ease-in-out infinite',
  borderRadius: '2px',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');
  const loadData = () => {
    setLoading(true);
    setError(null);
    setData(null);

    fetchDashboardData()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      const now = new Date();
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      setCurrentDate(
        `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()} | ` +
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Phase 1 + 2: Logo animation + Skeleton (data loading) ───────────────
  if (loading) {
    return (
      <>
        <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'DASHBOARD' }]} />
        <div
          className="flex h-full w-full flex-col p-6"
          style={{ background: 'var(--color-surface-0)' }}
        >
          <div className="mx-auto w-full max-w-[1400px]">
            {/* Header Skeleton */}
            <div className="mb-6 flex items-end justify-between border-b-[3px] border-[var(--color-border-light)] pb-4">
              <div>
                <div style={{ height: '36px', width: '300px', ...shimmerStyle }} className="mb-2" />
                <div style={{ height: '20px', width: '150px', ...shimmerStyle }} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div style={{ height: '16px', width: '120px', ...shimmerStyle }} />
                <div style={{ height: '26px', width: '200px', ...shimmerStyle }} />
              </div>
            </div>

            {/* Stats Row Skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: '96px', ...shimmerStyle }} />
              ))}
            </div>

            {/* Middle Row Skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '1rem', marginBottom: '1rem' }}>
              {[140, 140, 180].map((h, i) => (
                <div key={i} style={{ height: `${h}px`, ...shimmerStyle }} />
              ))}
            </div>

            {/* Bottom Row Skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
              {[160, 160].map((h, i) => (
                <div key={i} style={{ height: `${h}px`, ...shimmerStyle }} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <Topbar breadcrumb={[{ label: 'JEWELRY SMART FACTORY', path: '/' }, { label: 'DASHBOARD' }]} />
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-6"
          style={{ background: 'var(--color-surface-0)' }}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--color-danger-50)' }}
            >
              <AlertTriangle size={26} style={{ color: 'var(--color-danger-500)' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-logo)', fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--color-danger-500)' }}>
              CONNECTION ERROR
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', maxWidth: '320px', lineHeight: '1.6' }}>
              {error}
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
            style={{
              background: 'var(--color-brand-600)',
              color: 'var(--color-text-inverse)',
              fontFamily: 'var(--font-display)',
            }}
          >
            <RefreshCw size={14} />
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </>
    );
  }

  // ─── Full Dashboard ───────────────────────────────────────────────────────
  return (
    <>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'DASHBOARD' },
      ]} />
      <div className="content-scrollbar flex-1 overflow-y-auto bg-[var(--color-surface-0)] p-6">
        <div className="mx-auto flex flex-col gap-4 max-w-[1400px]">

          {/* Header */}
          <div className="flex items-end justify-between border-b-2 border-[var(--color-border-light)] pb-6 mb-2">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
                PRODUCTION <span className="text-[var(--color-brand-500)]">OVERVIEW</span>
              </h1>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-[0.1em]">Jewelry Manufacturing Intelligence</p>
            </div>
            <div className="text-right">
              <div className="text-[0.65rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-[0.15em] mb-1">{currentDate}</div>
              <div className="text-[20px] font-black tracking-tight text-[var(--color-text-primary)] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                IMPECCABLE <span className="text-[10px] font-bold tracking-[0.3em] text-[var(--color-brand-500)] align-middle ml-1">SYSTEMS</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-5">
            {data!.productionStats.map((stat, i) => (
              <div
                key={i}
                onClick={() => navigate('/dashboard/detail')}
                className="group animate-fade-in-up"
                style={{ 
                  background: 'var(--color-surface-0)', 
                  padding: '24px', 
                  borderRadius: '24px', 
                  border: `1px solid ${stat.isAlert ? 'var(--color-danger-200)' : 'var(--color-border-light)'}`, 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '16px', 
                  cursor: 'pointer', 
                  boxShadow: '0 4px 20px -4px rgba(0,0,0,0.04)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  animationDelay: `${i * 100}ms`
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px -8px rgba(0,0,0,0.1)';
                  if (stat.isAlert) e.currentTarget.style.borderColor = 'var(--color-danger-400)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px -4px rgba(0,0,0,0.04)';
                  if (stat.isAlert) e.currentTarget.style.borderColor = 'var(--color-danger-200)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</span>
                  {stat.isAlert && <span className="flex h-2 w-2 rounded-full bg-[var(--color-danger-500)] animate-pulse" />}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{stat.value}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: stat.trend === 'up' || stat.trend === 'good' ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-4">
            {/* Trend Chart */}
            {/* Trend Chart */}
            <div className="flex flex-col border border-[var(--color-border-light)] bg-[var(--color-surface-0)] p-6" style={{ borderRadius: '24px', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.02)' }}>
              <div className="mb-6 flex items-center justify-between">
                <span className="text-[0.7rem] font-extrabold tracking-[0.1em] text-[var(--color-text-tertiary)] uppercase">Production Trend (7 Days)</span>
                <span className="text-[0.65rem] font-bold text-[var(--color-success-600)] bg-[var(--color-success-50)] px-2 py-1 rounded">+12% Growth</span>
              </div>
              <div className="flex-1 flex items-end justify-between gap-2 pt-6 relative">
                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-[var(--color-text-tertiary)] pb-8 font-bold opacity-40">
                  <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
                </div>
                <div className="pl-8 flex w-full h-full items-end justify-between gap-3 pb-8 border-b border-[var(--color-border-light)] relative">
                  {[40, 60, 50, 80, 70, 95, 100].map((h, i) => (
                    <div key={i} className="w-full rounded-t-lg bg-[var(--color-brand-500)] hover:bg-[var(--color-brand-600)] transition-all relative group" style={{ height: `${h}%`, opacity: 0.15 + (h/100) }}>
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-[var(--color-text-primary)] text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-none">{h}%</div>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-[var(--color-text-tertiary)] pt-3 font-bold uppercase tracking-tighter opacity-60">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="flex flex-col border border-[var(--color-border-light)] bg-[var(--color-surface-0)] p-6" style={{ borderRadius: '24px', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.02)' }}>
              <div className="mb-6 text-[0.7rem] font-extrabold tracking-[0.1em] text-[var(--color-text-tertiary)] uppercase">Process Distribution</div>
              <div className="flex-1 flex items-center justify-center gap-8">
                <div className="relative w-36 h-36 rounded-full flex items-center justify-center p-4" style={{ 
                  background: 'conic-gradient(var(--color-brand-500) 0% 45%, var(--color-brand-300) 45% 70%, var(--color-accent-500) 70% 85%, var(--color-success-500) 85% 100%)' 
                }}>
                  <div className="w-full h-full bg-[var(--color-surface-0)] rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-3xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>128</span>
                    <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest">Total Orders</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Casting', color: 'var(--color-brand-500)', pct: '45%' },
                    { label: 'Polishing', color: 'var(--color-brand-300)', pct: '25%' },
                    { label: 'Setting', color: 'var(--color-accent-500)', pct: '15%' },
                    { label: 'QC/Final', color: 'var(--color-success-500)', pct: '15%' },
                  ].map(({ label, color, pct }) => (
                    <div key={label} className="flex items-center justify-between gap-6">
                      <span className="flex items-center gap-2 text-[0.75rem] font-bold text-[var(--color-text-secondary)]">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                        {label}
                      </span>
                      <span className="font-bold text-[var(--color-text-primary)] text-[0.75rem]">{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Delay Orders */}
            {/* Delay Orders Table */}
            <div className="flex flex-col border border-[var(--color-border-light)] bg-[var(--color-surface-0)] overflow-hidden" style={{ borderRadius: '24px', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.02)' }}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border-light)]">
                <div className="text-[0.7rem] font-extrabold tracking-[0.1em] text-[var(--color-text-tertiary)] uppercase flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[var(--color-danger-500)]" />
                  Critical Delay Orders
                </div>
                <button 
                  onClick={() => navigate('/dashboard/detail')}
                  className="text-[0.65rem] font-bold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] uppercase tracking-widest transition-all px-3 py-1.5 rounded-full bg-[var(--color-brand-50)]"
                >View Tracker</button>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-[0.8rem]">
                  <thead>
                    <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-light)] bg-[var(--color-surface-1)]">
                      <th className="font-bold text-left py-3 px-6 uppercase tracking-wider text-[0.65rem]">PO / Order</th>
                      <th className="font-bold text-left py-3 px-6 uppercase tracking-wider text-[0.65rem]">Customer</th>
                      <th className="font-bold text-right py-3 px-6 uppercase tracking-wider text-[0.65rem]">Days Late</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {data!.delayOrders.map((order, i) => (
                      <tr key={i} className="hover:bg-[var(--color-surface-1)] text-[var(--color-text-primary)] transition-colors">
                        <td className="py-3.5 px-6 font-bold">{order.no}</td>
                        <td className="py-3.5 px-6 font-semibold text-[var(--color-text-secondary)]">{order.customer}</td>
                        <td className="py-3.5 px-6 text-right text-[var(--color-danger-600)] font-black italic">{order.delay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-[1.2fr_1fr] gap-4">
            {/* Live Tracking */}
            {/* Live Tracking Feed */}
            <div className="flex flex-col border border-[var(--color-border-light)] bg-[var(--color-surface-0)] overflow-hidden" style={{ borderRadius: '24px', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.02)' }}>
              <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--color-border-light)]">
                <div className="text-[0.7rem] font-extrabold tracking-[0.1em] text-[var(--color-text-tertiary)] uppercase">Real-Time Factory Feed</div>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[var(--color-success-50)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success-500)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-success-500)]" />
                  </span>
                  <span className="text-[0.6rem] font-black text-[var(--color-success-700)] uppercase">Live</span>
                </div>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead>
                    <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-light)] bg-[var(--color-surface-1)]">
                      <th className="font-bold text-left py-3 px-6 uppercase tracking-wider text-[0.65rem]">PO No</th>
                      <th className="font-bold text-left py-3 px-6 uppercase tracking-wider text-[0.65rem]">Process Step</th>
                      <th className="font-bold text-left py-3 px-6 uppercase tracking-wider text-[0.65rem]">Location</th>
                      <th className="font-bold text-right py-3 px-6 uppercase tracking-wider text-[0.65rem]">Scan Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {data!.liveTracking.map((track, i) => (
                      <tr key={i} className="hover:bg-[var(--color-surface-1)] text-[var(--color-text-primary)] transition-colors">
                        <td className="py-3 px-6 font-bold text-[var(--color-brand-600)]">{track.no}</td>
                        <td className="py-3 px-6 font-semibold">{track.process}</td>
                        <td className="py-3 px-6 text-[var(--color-text-tertiary)] font-medium italic">{track.location}</td>
                        <td className="py-3 px-6 text-right text-[var(--color-text-tertiary)] font-bold">{track.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Material Stock Alerts */}
            {/* Material Alerts */}
            <div className="flex flex-col border border-[var(--color-border-light)] bg-[var(--color-surface-0)] overflow-hidden" style={{ borderRadius: '24px', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.02)' }}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border-light)]">
                <div className="flex items-center gap-3">
                  <div className="text-[0.7rem] font-extrabold tracking-[0.1em] text-[var(--color-text-tertiary)] uppercase">Material Stock Alerts</div>
                  <span className="flex h-2 w-2 rounded-full bg-[var(--color-danger-500)] animate-pulse" />
                </div>
                <button className="text-[0.65rem] font-bold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] uppercase tracking-widest transition-all">Stock Manager</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {data!.materialAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-1)] border border-[var(--color-border-light)] transition-all hover:border-[var(--color-brand-300)] hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className={`w-1.5 h-10 rounded-full ${alert.status === 'critical' ? 'bg-[var(--color-danger-500)]' : 'bg-[var(--color-accent-500)]'}`} />
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-[var(--color-text-primary)]">{alert.item}</span>
                        <span className="text-[0.65rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">{alert.type}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className={`text-base font-black ${alert.status === 'critical' ? 'text-[var(--color-danger-600)]' : 'text-[var(--color-accent-600)]'}`}>
                        {alert.currentStock}
                      </span>
                      <span className="text-[0.6rem] font-bold text-[var(--color-text-tertiary)] uppercase">Min Threshold: {alert.minStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
