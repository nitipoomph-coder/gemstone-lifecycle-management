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
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      setCurrentDate(
        `${now.getDate().toString().padStart(2,'0')} ${months[now.getMonth()]} ${now.getFullYear()} | ` +
        `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
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
          <div className="flex items-end justify-between border-b-[3px] border-[var(--color-brand-600)] pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-widest text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-logo)' }}>
                PRODUCTION OVERVIEW
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">ภาพรวมการผลิต</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-[var(--color-text-tertiary)] mb-1">{currentDate}</div>
              <div className="text-[26px] font-bold tracking-[0.15em] text-[var(--color-brand-500)] leading-none" style={{ fontFamily: 'var(--font-logo)' }}>
                JEWELRY <span className="text-[12px] font-sans tracking-[0.25em] text-[var(--color-text-secondary)] align-middle">SMART FACTORY</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-4">
            {data!.productionStats.map((stat, i) => (
              <div
                key={i}
                onClick={() => navigate('/dashboard/detail')}
                className={`cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative flex flex-col justify-between p-4 border bg-[var(--color-surface-1)] ${stat.isAlert ? 'border-[var(--color-danger-500)]' : 'border-[var(--color-border-strong)]'}`}
                style={{ borderRadius: '2px', borderTopWidth: '4px', borderTopColor: stat.isAlert ? 'var(--color-danger-500)' : 'var(--color-border-strong)' }}
              >
                <div className="text-xs font-bold tracking-widest text-[var(--color-text-tertiary)] flex justify-between items-center">
                  <span>{stat.label}</span>
                  {stat.isAlert && <span className="flex h-2 w-2 rounded-full bg-[var(--color-danger-500)] animate-pulse" />}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div className={`text-[2.2rem] font-bold leading-none ${stat.isAlert ? 'text-[var(--color-danger-100)]' : 'text-[var(--color-text-primary)]'}`} style={{ fontFamily: 'var(--font-logo)' }}>{stat.value}</div>
                  <div className={`text-xs font-mono font-bold ${stat.trend === 'up' || stat.trend === 'good' ? 'text-[var(--color-success-500)]' : 'text-[var(--color-danger-500)]'}`}>{stat.change}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-4">
            {/* Trend Chart */}
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

            {/* Donut */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-4" style={{ borderRadius: '2px' }}>
              <div className="mb-4 text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Status By Process</div>
              <div className="flex-1 flex items-center justify-center gap-6">
                <div className="relative w-32 h-32 rounded-full flex items-center justify-center" style={{ background: 'conic-gradient(var(--color-info-500) 0% 45%, var(--color-brand-600) 45% 70%, var(--color-danger-500) 70% 85%, var(--color-success-500) 85% 100%)' }}>
                  <div className="w-24 h-24 bg-[var(--color-surface-1)] rounded-full flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-[var(--color-text-primary)]">128</span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">Total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-xs text-[var(--color-text-secondary)]">
                  {[
                    { label: 'Casting',  color: 'var(--color-info-500)',    pct: '45%' },
                    { label: 'Polishing',color: 'var(--color-brand-600)',   pct: '25%' },
                    { label: 'Setting',  color: 'var(--color-danger-500)',  pct: '15%' },
                    { label: 'QC',       color: 'var(--color-success-500)', pct: '15%' },
                    { label: 'Packing',  color: 'var(--color-border-strong)',pct: '5%'  },
                  ].map(({ label, color, pct }) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        {label}
                      </span>
                      <span className="font-mono text-[var(--color-text-primary)]">{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Delay Orders */}
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-text-primary)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-text-primary)]" />
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
                      <td className="py-3 px-4">{track.no}</td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">{track.item}</td>
                      <td className="py-3 px-4 font-sans text-[var(--color-text-secondary)]">{track.process}</td>
                      <td className="py-3 px-4 font-sans text-[var(--color-text-tertiary)]">{track.location}</td>
                      <td className="py-3 px-4 text-right text-[var(--color-text-tertiary)]">{track.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Low Material Stock Alerts */}
            <div className="flex flex-col border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-0" style={{ borderRadius: '2px' }}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-light)]">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">Material Alerts</div>
                  <span className="flex h-2 w-2 rounded-full bg-[var(--color-danger-500)] animate-pulse" />
                </div>
                <button className="text-[10px] font-bold text-[var(--color-brand-600)] hover:text-[var(--color-brand-500)] uppercase tracking-widest transition-colors">Request PO</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {data!.materialAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded bg-[var(--color-surface-0)] border border-[var(--color-border-light)] transition-colors hover:border-[var(--color-brand-500)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-8 rounded-full ${alert.status === 'critical' ? 'bg-[var(--color-danger-500)]' : 'bg-[var(--color-accent-500)]'}`} />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--color-text-primary)]">{alert.item}</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider">{alert.type}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className={`text-sm font-bold font-mono ${alert.status === 'critical' ? 'text-[var(--color-danger-500)]' : 'text-[var(--color-accent-500)]'}`}>
                        {alert.currentStock}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono">Min: {alert.minStock}</span>
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
