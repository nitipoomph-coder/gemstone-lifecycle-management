import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import { fetchDashboardData, type DashboardData } from '../services/dashboardAPI';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// ─── Loading skeleton shimmer animation ───────────────────────────────────────
const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, oklch(0.22 0.03 250) 25%, oklch(0.28 0.04 250) 50%, oklch(0.22 0.03 250) 75%)',
  backgroundSize: '400% 100%',
  animation: 'skeletonShimmer 1.6s ease-in-out infinite',
  borderRadius: '2px',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoVisible, setLogoVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');

  const loadData = () => {
    setLoading(true);
    setError(null);
    setData(null);
    // Logo fade-in triggers immediately
    setTimeout(() => setLogoVisible(true), 80);

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
    // Real-time clock
    const timer = setInterval(() => {
      const now = new Date();
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      setCurrentDate(
        `${now.getDate().toString().padStart(2,'0')} ${months[now.getMonth()]} ${now.getFullYear()} | ` +
        `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Phase 1: Logo animation (data loading) ──────────────────────────────
  if (loading) {
    return (
      <>
        <style>{`
          @keyframes skeletonShimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes logoReveal {
            0%   { opacity: 0; letter-spacing: 0.35em; filter: blur(6px); }
            60%  { opacity: 1; letter-spacing: 0.2em; filter: blur(0); }
            100% { opacity: 1; letter-spacing: 0.2em; filter: blur(0); }
          }
          @keyframes subReveal {
            0%   { opacity: 0; transform: translateY(6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes barPulse {
            0%, 100% { opacity: 0.3; transform: scaleX(0.6); }
            50%       { opacity: 1; transform: scaleX(1); }
          }
        `}</style>

        <div
          className="flex h-full w-full flex-col items-center justify-center gap-10"
          style={{ background: 'oklch(0.18 0.03 250)' }}
        >
          {/* Logo block */}
          <div className="flex flex-col items-center gap-3">
            <div
              style={{
                fontFamily: 'var(--font-logo)',
                fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                fontWeight: 700,
                color: 'oklch(0.68 0.14 245)',
                letterSpacing: '0.2em',
                animation: logoVisible ? 'logoReveal 1.1s cubic-bezier(0.16,1,0.3,1) both' : 'none',
                opacity: logoVisible ? undefined : 0,
              }}
            >
              JEWELRY
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'oklch(0.75 0.02 250)',
                letterSpacing: '0.35em',
                animation: logoVisible ? 'subReveal 0.7s 0.5s cubic-bezier(0.16,1,0.3,1) both' : 'none',
                opacity: logoVisible ? undefined : 0,
              }}
            >
              SMART FACTORY
            </div>
          </div>

          {/* Loading bar */}
          <div
            style={{
              width: '180px',
              height: '2px',
              background: 'oklch(0.28 0.03 250)',
              borderRadius: '1px',
              overflow: 'hidden',
              opacity: logoVisible ? 1 : 0,
              transition: 'opacity 0.4s 0.6s',
            }}
          >
            <div
              style={{
                height: '100%',
                width: '60%',
                background: 'oklch(0.68 0.14 245)',
                borderRadius: '1px',
                animation: 'barPulse 1.4s ease-in-out infinite',
                transformOrigin: 'left',
              }}
            />
          </div>

          {/* Phase 2: Skeleton dashboard (fades in after logo) */}
          <div
            style={{
              width: '100%',
              maxWidth: '1100px',
              padding: '0 2rem',
              opacity: logoVisible ? 1 : 0,
              transition: 'opacity 0.5s 0.9s',
            }}
          >
            {/* Stats row skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: '96px',
                    ...shimmerStyle,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
            {/* Mid row skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '1rem', marginBottom: '1rem' }}>
              {[140, 140, 180].map((h, i) => (
                <div key={i} style={{ height: `${h}px`, ...shimmerStyle, animationDelay: `${0.4 + i * 0.08}s` }} />
              ))}
            </div>
            {/* Bottom row skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
              {[160, 160].map((h, i) => (
                <div key={i} style={{ height: `${h}px`, ...shimmerStyle, animationDelay: `${0.7 + i * 0.08}s` }} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-6"
        style={{ background: 'oklch(0.18 0.03 250)' }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'oklch(0.30 0.08 25)' }}
          >
            <AlertTriangle size={26} style={{ color: 'oklch(0.62 0.20 25)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-logo)', fontSize: '0.8rem', letterSpacing: '0.2em', color: 'oklch(0.62 0.20 25)' }}>
            CONNECTION ERROR
          </div>
          <p style={{ fontSize: '0.85rem', color: 'oklch(0.75 0.02 250)', maxWidth: '320px', lineHeight: '1.6' }}>
            {error}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
          style={{
            background: 'oklch(0.68 0.14 245)',
            color: 'oklch(0.15 0.02 250)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <RefreshCw size={14} />
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  // ─── Full Dashboard ───────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'DASHBOARD' },
      ]} />
      <div className="content-scrollbar flex-1 overflow-y-auto bg-[var(--color-surface-0)] p-6">
        
        {/* Main Dashboard Container */}
        <div className="mx-auto flex flex-col gap-4 max-w-[1400px]">
          
          {/* Header Row */}
          <div className="flex items-end justify-between border-b-[3px] border-[var(--color-brand-600)] pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-widest text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-logo)' }}>
                PRODUCTION OVERVIEW
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-tertiary)] font-body">ภาพรวมการผลิต</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-[var(--color-text-tertiary)] mb-1">{currentDate}</div>
              <div className="text-[26px] font-bold tracking-[0.15em] text-[var(--color-brand-500)] leading-none" style={{ fontFamily: 'var(--font-logo)' }}>
                JEWELRY <span className="text-[12px] font-sans tracking-[0.25em] text-[var(--color-text-secondary)] align-middle">SMART FACTORY</span>
              </div>
            </div>
          </div>

          {/* 5 Stats Row */}
          <div className="grid grid-cols-5 gap-4">
            {data!.productionStats.map((stat, i) => (
              <div 
                key={i} 
                className={`relative flex flex-col justify-between p-4 border bg-[var(--color-surface-1)] ${stat.isAlert ? 'border-[var(--color-danger-500)] border-t-[var(--color-danger-500)]' : 'border-[var(--color-border-strong)] border-t-[var(--color-border-strong)]'}`}
                style={{ borderRadius: '2px', borderTopWidth: '4px' }}
              >
                <div className="text-xs font-bold tracking-widest text-[var(--color-text-tertiary)] flex justify-between items-center">
                  <span>{stat.label}</span>
                  {stat.isAlert && <span className="flex h-2 w-2 rounded-full bg-[var(--color-danger-500)] animate-pulse"></span>}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div className={`text-[2.2rem] font-bold leading-none ${stat.isAlert ? 'text-[var(--color-danger-100)]' : 'text-[var(--color-text-primary)]'}`} style={{ fontFamily: 'var(--font-logo)' }}>{stat.value}</div>
                  <div className={`text-xs font-mono font-bold ${stat.trend === 'up' ? 'text-[var(--color-success-500)]' : stat.trend === 'bad' ? 'text-[var(--color-danger-500)]' : stat.trend === 'good' ? 'text-[var(--color-success-500)]' : 'text-[var(--color-danger-500)]'}`}>
                    {stat.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Row (Charts & Delays) */}
          <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-4">
            {/* Trend Chart Mockup */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-4" style={{ borderRadius: '2px' }}>
              <div className="mb-4 text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Production Trend (7 Days)</div>
              <div className="flex-1 flex items-end justify-between gap-2 pt-6 relative">
                <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-between text-[9px] text-[var(--color-text-tertiary)] pb-6 font-mono">
                  <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
                </div>
                <div className="pl-6 flex w-full h-full items-end justify-between gap-3 pb-6 border-b border-[var(--color-border-light)] relative">
                   {[40, 60, 50, 80, 70, 95, 100].map((h, i) => (
                     <div key={i} className="w-full bg-[var(--color-accent-500)] hover:bg-[var(--color-accent-600)] transition-colors relative group" style={{ height: `${h}%` }}>
                       <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity">{h}</span>
                     </div>
                   ))}
                </div>
                <div className="absolute bottom-0 left-6 right-0 flex justify-between text-[9px] text-[var(--color-text-tertiary)] pt-2 font-mono">
                   <span>14/05</span><span>15/05</span><span>16/05</span><span>17/05</span><span>18/05</span><span>19/05</span><span>20/05</span>
                </div>
              </div>
            </div>

            {/* Status Donut Mockup */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-4" style={{ borderRadius: '2px' }}>
              <div className="mb-4 text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Status By Process</div>
              <div className="flex-1 flex items-center justify-center gap-6">
                <div className="relative w-32 h-32 rounded-full flex items-center justify-center" style={{ background: 'conic-gradient(var(--color-info-500) 0% 45%, var(--color-brand-600) 45% 70%, var(--color-danger-500) 70% 85%, var(--color-success-500) 85% 100%)' }}>
                  <div className="w-24 h-24 bg-[var(--color-surface-1)] rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-2xl font-bold text-[var(--color-text-primary)]">128</span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">Total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-xs text-[var(--color-text-secondary)]">
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-info-500)] transform translate-y-[1px]"></span>Casting</span><span className="font-mono text-[var(--color-text-primary)]">45%</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-brand-600)] transform translate-y-[1px]"></span>Polishing</span><span className="font-mono text-[var(--color-text-primary)]">25%</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-danger-500)] transform translate-y-[1px]"></span>Setting</span><span className="font-mono text-[var(--color-text-primary)]">15%</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-success-500)] transform translate-y-[1px]"></span>QC</span><span className="font-mono text-[var(--color-text-primary)]">15%</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-border-strong)] transform translate-y-[1px]"></span>Packing</span><span className="font-mono text-[var(--color-text-primary)]">5%</span></div>
                </div>
              </div>
            </div>

            {/* Delay Orders Table */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-0" style={{ borderRadius: '2px' }}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-light)]">
                <div className="text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Top Delay Orders</div>
                <button className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] uppercase tracking-widest transition-colors">View All</button>
              </div>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-light)] bg-[var(--color-surface-0)]">
                    <th className="font-medium text-left py-2 px-4 uppercase tracking-wider">OrderNo</th>
                    <th className="font-medium text-left py-2 px-4 uppercase tracking-wider">Customer</th>
                    <th className="font-medium text-left py-2 px-4 uppercase tracking-wider">DueDate</th>
                    <th className="font-medium text-right py-2 px-4 text-[var(--color-danger-500)] uppercase tracking-wider">Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {data!.delayOrders.map((order, i) => (
                    <tr key={i} className="hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)] transition-colors">
                      <td className="py-2.5 px-4">{order.no}</td>
                      <td className="py-2.5 px-4 font-sans text-[var(--color-text-secondary)]">{order.customer}</td>
                      <td className="py-2.5 px-4">{order.date}</td>
                      <td className="py-2.5 px-4 text-right text-[var(--color-danger-500)] font-bold">{order.delay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-[1.2fr_1fr] gap-4">
            {/* Live Tracking */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-0" style={{ borderRadius: '2px' }}>
              <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border-light)]">
                <div className="text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Live Tracking</div>
                <div className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-text-primary)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-text-primary)]"></span>
                </div>
              </div>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-light)] bg-[var(--color-surface-0)]">
                    <th className="font-medium text-left py-3 px-4 uppercase tracking-wider">OrderNo</th>
                    <th className="font-medium text-left py-3 px-4 uppercase tracking-wider">ItemNo</th>
                    <th className="font-medium text-left py-3 px-4 uppercase tracking-wider">Process</th>
                    <th className="font-medium text-left py-3 px-4 uppercase tracking-wider">Location</th>
                    <th className="font-medium text-right py-3 px-4 uppercase tracking-wider">Scan Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {data!.liveTracking.map((track, i) => (
                    <tr key={i} className="hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)] transition-colors">
                      <td className="py-3 px-4 text-[var(--color-text-primary)]">{track.no}</td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">{track.item}</td>
                      <td className="py-3 px-4 font-sans text-[var(--color-text-secondary)]">{track.process}</td>
                      <td className="py-3 px-4 font-sans text-[var(--color-text-tertiary)]">{track.location}</td>
                      <td className="py-3 px-4 text-right text-[var(--color-text-tertiary)]">{track.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Factory Floor Plan */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-4 relative overflow-hidden" style={{ borderRadius: '2px' }}>
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--color-text-tertiary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-tertiary) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
              <div className="relative z-10 flex h-full flex-col justify-end gap-2 pb-2 px-2">
                 <div className="text-xl font-bold tracking-[0.2em] text-[var(--color-text-tertiary)] opacity-30 absolute top-4 left-4" style={{ fontFamily: 'var(--font-logo)' }}>FACTORY FLOOR PLAN</div>
                 <div className="flex gap-2 h-20 w-full items-end pb-2">
                   <div className="h-full flex-1 bg-[var(--color-info-500)]/20 border border-[var(--color-info-500)]/50 rounded flex items-center justify-center text-[10px] uppercase font-bold text-[var(--color-info-500)]">Casting</div>
                   <div className="h-2/3 flex-1 bg-[var(--color-brand-600)]/20 border border-[var(--color-brand-600)]/50 rounded flex items-center justify-center text-[10px] uppercase font-bold text-[var(--color-brand-600)]">Polishing</div>
                   <div className="h-4/5 flex-1 bg-[var(--color-success-500)]/20 border border-[var(--color-success-500)]/50 rounded flex items-center justify-center text-[10px] uppercase font-bold text-[var(--color-success-500)]">Setting</div>
                   <div className="h-1/2 w-16 bg-[var(--color-danger-500)]/20 border border-[var(--color-danger-500)]/50 rounded flex items-center justify-center text-[10px] uppercase font-bold text-[var(--color-danger-500)]">QC</div>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}


export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    // โหลดข้อมูลแบบ Async
    fetchDashboardData().then(res => setData(res));
    
    // นาฬิกาเดินแบบเรียลไทม์
    setCurrentDate('20 MAY 2024 | 10:45:32');
    const timer = setInterval(() => {
       const now = new Date();
       const formatted = `${now.getDate().toString().padStart(2, '0')} MAY ${now.getFullYear()} | ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
       setCurrentDate(formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!data) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-0)] text-[var(--color-brand-500)] font-logo text-2xl animate-pulse">
        CONNECTING TO DATABASE...
      </div>
    );
  }

  return (
    <>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'DASHBOARD' },
      ]} />
      <div className="content-scrollbar flex-1 overflow-y-auto bg-[var(--color-surface-0)] p-6">
        
        {/* Main Dashboard Container */}
        <div className="mx-auto flex flex-col gap-4 max-w-[1400px]">
          
          {/* Header Row */}
          <div className="flex items-end justify-between border-b-[3px] border-[var(--color-brand-600)] pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-widest text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-logo)' }}>
                PRODUCTION OVERVIEW
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-tertiary)] font-body">ภาพรวมการผลิต</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-[var(--color-text-tertiary)] mb-1">{currentDate}</div>
              <div className="text-[26px] font-bold tracking-[0.15em] text-[var(--color-brand-500)] leading-none" style={{ fontFamily: 'var(--font-logo)' }}>
                JEWELRY <span className="text-[12px] font-sans tracking-[0.25em] text-[var(--color-text-secondary)] align-middle">SMART FACTORY</span>
              </div>
            </div>
          </div>

          {/* 5 Stats Row */}
          <div className="grid grid-cols-5 gap-4">
            {data.productionStats.map((stat, i) => (
              <div 
                key={i} 
                className={`relative flex flex-col justify-between p-4 border bg-[var(--color-surface-1)] ${stat.isAlert ? 'border-[var(--color-danger-500)] border-t-[var(--color-danger-500)]' : 'border-[var(--color-border-strong)] border-t-[var(--color-border-strong)]'}`}
                style={{ borderRadius: '2px', borderTopWidth: '4px' }}
              >
                <div className="text-xs font-bold tracking-widest text-[var(--color-text-tertiary)] flex justify-between items-center">
                  <span>{stat.label}</span>
                  {stat.isAlert && <span className="flex h-2 w-2 rounded-full bg-[var(--color-danger-500)] animate-pulse"></span>}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div className={`text-[2.2rem] font-bold leading-none ${stat.isAlert ? 'text-[var(--color-danger-100)]' : 'text-[var(--color-text-primary)]'}`} style={{ fontFamily: 'var(--font-logo)' }}>{stat.value}</div>
                  <div className={`text-xs font-mono font-bold ${stat.trend === 'up' ? 'text-[var(--color-success-500)]' : stat.trend === 'bad' ? 'text-[var(--color-danger-500)]' : stat.trend === 'good' ? 'text-[var(--color-success-500)]' : 'text-[var(--color-danger-500)]'}`}>
                    {stat.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Row (Charts & Delays) */}
          <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-4">
            {/* Trend Chart Mockup */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-4" style={{ borderRadius: '2px' }}>
              <div className="mb-4 text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Production Trend (7 Days)</div>
              <div className="flex-1 flex items-end justify-between gap-2 pt-6 relative">
                {/* Y Axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-between text-[9px] text-[var(--color-text-tertiary)] pb-6 font-mono">
                  <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
                </div>
                <div className="pl-6 flex w-full h-full items-end justify-between gap-3 pb-6 border-b border-[var(--color-border-light)] relative">
                   {[40, 60, 50, 80, 70, 95, 100].map((h, i) => (
                     <div key={i} className="w-full bg-[var(--color-accent-500)] hover:bg-[var(--color-accent-600)] transition-colors relative group" style={{ height: `${h}%` }}>
                       <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity">{h}</span>
                     </div>
                   ))}
                </div>
                <div className="absolute bottom-0 left-6 right-0 flex justify-between text-[9px] text-[var(--color-text-tertiary)] pt-2 font-mono">
                   <span>14/05</span><span>15/05</span><span>16/05</span><span>17/05</span><span>18/05</span><span>19/05</span><span>20/05</span>
                </div>
              </div>
            </div>

            {/* Status Donut Mockup */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-4" style={{ borderRadius: '2px' }}>
              <div className="mb-4 text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Status By Process</div>
              <div className="flex-1 flex items-center justify-center gap-6">
                {/* CSS Donut Mockup */}
                <div className="relative w-32 h-32 rounded-full flex items-center justify-center" style={{ background: 'conic-gradient(var(--color-info-500) 0% 45%, var(--color-brand-600) 45% 70%, var(--color-danger-500) 70% 85%, var(--color-success-500) 85% 100%)' }}>
                  <div className="w-24 h-24 bg-[var(--color-surface-1)] rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-2xl font-bold text-[var(--color-text-primary)]">128</span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">Total</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex flex-col gap-2 text-xs text-[var(--color-text-secondary)]">
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-info-500)] transform translate-y-[1px]"></span>Casting</span><span className="font-mono text-[var(--color-text-primary)]">45%</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-brand-600)] transform translate-y-[1px]"></span>Polishing</span><span className="font-mono text-[var(--color-text-primary)]">25%</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-danger-500)] transform translate-y-[1px]"></span>Setting</span><span className="font-mono text-[var(--color-text-primary)]">15%</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-success-500)] transform translate-y-[1px]"></span>QC</span><span className="font-mono text-[var(--color-text-primary)]">15%</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-border-strong)] transform translate-y-[1px]"></span>Packing</span><span className="font-mono text-[var(--color-text-primary)]">5%</span></div>
                </div>
              </div>
            </div>

            {/* Delay Orders Table */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-0" style={{ borderRadius: '2px' }}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-light)]">
                <div className="text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Top Delay Orders</div>
                <button className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] uppercase tracking-widest transition-colors">View All</button>
              </div>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-light)] bg-[var(--color-surface-0)]">
                    <th className="font-medium text-left py-2 px-4 uppercase tracking-wider">OrderNo</th>
                    <th className="font-medium text-left py-2 px-4 uppercase tracking-wider">Customer</th>
                    <th className="font-medium text-left py-2 px-4 uppercase tracking-wider">DueDate</th>
                    <th className="font-medium text-right py-2 px-4 text-[var(--color-danger-500)] uppercase tracking-wider">Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {data.delayOrders.map((order, i) => (
                    <tr key={i} className="hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)] transition-colors">
                      <td className="py-2.5 px-4">{order.no}</td>
                      <td className="py-2.5 px-4 font-sans text-[var(--color-text-secondary)]">{order.customer}</td>
                      <td className="py-2.5 px-4">{order.date}</td>
                      <td className="py-2.5 px-4 text-right text-[var(--color-danger-500)] font-bold">{order.delay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-[1.2fr_1fr] gap-4">
            {/* Live Tracking */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-0" style={{ borderRadius: '2px' }}>
              <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border-light)]">
                <div className="text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Live Tracking</div>
                <div className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-text-primary)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-text-primary)]"></span>
                </div>
              </div>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-light)] bg-[var(--color-surface-0)]">
                    <th className="font-medium text-left py-3 px-4 uppercase tracking-wider">OrderNo</th>
                    <th className="font-medium text-left py-3 px-4 uppercase tracking-wider">ItemNo</th>
                    <th className="font-medium text-left py-3 px-4 uppercase tracking-wider">Process</th>
                    <th className="font-medium text-left py-3 px-4 uppercase tracking-wider">Location</th>
                    <th className="font-medium text-right py-3 px-4 uppercase tracking-wider">Scan Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {data.liveTracking.map((track, i) => (
                    <tr key={i} className="hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)] transition-colors">
                      <td className="py-3 px-4 text-[var(--color-text-primary)]">{track.no}</td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">{track.item}</td>
                      <td className="py-3 px-4 font-sans text-[var(--color-text-secondary)]">{track.process}</td>
                      <td className="py-3 px-4 font-sans text-[var(--color-text-tertiary)]">{track.location}</td>
                      <td className="py-3 px-4 text-right text-[var(--color-text-tertiary)]">{track.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Map Mockup */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-4 relative overflow-hidden" style={{ borderRadius: '2px' }}>
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--color-text-tertiary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-tertiary) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
              <div className="relative z-10 flex h-full flex-col justify-end gap-2 pb-2 px-2">
                 <div className="text-xl font-bold tracking-[0.2em] text-[var(--color-text-tertiary)] opacity-30 absolute top-4 left-4" style={{ fontFamily: 'var(--font-logo)' }}>FACTORY FLOOR PLAN</div>
                 <div className="flex gap-2 h-20 w-full items-end pb-2">
                   <div className="h-full flex-1 bg-[var(--color-info-500)]/20 border border-[var(--color-info-500)]/50 rounded flex items-center justify-center text-[10px] uppercase font-bold text-[var(--color-info-500)]">Casting</div>
                   <div className="h-2/3 flex-1 bg-[var(--color-brand-600)]/20 border border-[var(--color-brand-600)]/50 rounded flex items-center justify-center text-[10px] uppercase font-bold text-[var(--color-brand-600)]">Polishing</div>
                   <div className="h-4/5 flex-1 bg-[var(--color-success-500)]/20 border border-[var(--color-success-500)]/50 rounded flex items-center justify-center text-[10px] uppercase font-bold text-[var(--color-success-500)]">Setting</div>
                   <div className="h-1/2 w-16 bg-[var(--color-danger-500)]/20 border border-[var(--color-danger-500)]/50 rounded flex items-center justify-center text-[10px] uppercase font-bold text-[var(--color-danger-500)]">QC</div>
                 </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
