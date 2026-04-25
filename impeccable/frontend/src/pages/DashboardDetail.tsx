import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { fetchDashboardData, type DashboardData } from '../services/dashboardAPI';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--color-surface-1) 25%, var(--color-surface-2) 50%, var(--color-surface-1) 75%)',
  backgroundSize: '400% 100%',
  animation: 'skeletonShimmer 1.6s ease-in-out infinite',
  borderRadius: '2px',
};

export default function DashboardDetail() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');

  const loadData = () => {
    setLoading(true);
    setError(null);

    fetchDashboardData()
      .then(() => {
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

  if (loading) {
    return (
      <div
        className="flex h-full w-full flex-col p-6"
        style={{ background: 'var(--color-surface-0)' }}
      >
        <div className="mx-auto w-full max-w-[1400px]">
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '1rem', marginBottom: '1rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: '96px', ...shimmerStyle }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-6"
        style={{ background: 'var(--color-surface-0)' }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'var(--color-danger-50)' }}
          >
            <AlertTriangle size={26} className="text-[var(--color-danger-500)]" />
          </div>
          <div style={{ fontFamily: 'var(--font-logo)', fontSize: '0.8rem', letterSpacing: '0.2em' }} className="text-[var(--color-danger-500)]">
            CONNECTION ERROR
          </div>
          <p className="text-[0.85rem] text-[var(--color-text-secondary)] max-w-[320px] leading-relaxed">
            {error}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-80 active:scale-95 bg-[var(--color-brand-600)] text-[var(--color-text-inverse)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <RefreshCw size={14} />
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'DASHBOARD', path: '/' },
        { label: 'DETAIL VIEW' }
      ]} />
      <div className="content-scrollbar flex-1 overflow-y-auto bg-[var(--color-surface-0)] p-6">
        <div className="mx-auto flex flex-col gap-4 max-w-[1400px]">
          
          <button 
            onClick={() => navigate(-1)} 
            className="self-start flex items-center gap-2 text-sm font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-600)] transition-colors mb-2"
          >
            <ArrowLeft size={16} /> ย้อนกลับ (Back)
          </button>

          {/* Header */}
          <div className="flex items-end justify-between border-b-[3px] border-[var(--color-brand-600)] pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-widest text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-logo)' }}>
                DETAIL DASHBOARD
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">หน้ารายละเอียดเชิงลึก (Mockup)</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-[var(--color-text-tertiary)] mb-1">{currentDate}</div>
              <div className="text-[26px] font-bold tracking-[0.15em] text-[var(--color-brand-500)] leading-none" style={{ fontFamily: 'var(--font-logo)' }}>
                JEWELRY <span className="text-[12px] font-sans tracking-[0.25em] text-[var(--color-text-secondary)] align-middle">SMART FACTORY</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-20 border border-dashed border-[var(--color-border-strong)] rounded-lg text-[var(--color-text-tertiary)] bg-[var(--color-surface-1)]">
            <h2 className="text-2xl font-bold text-[var(--color-text-secondary)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>พื้นที่จำลอง (Drill-down Concept)</h2>
            <p>หน้าจอนี้จำลองการกดมาจากการ์ดในหน้าแรก เพื่อแสดงรายละเอียดเชิงลึก</p>
          </div>

        </div>
      </div>
    </>
  );
}
