import React, { useState, useEffect, useCallback } from 'react';
import { useBreadcrumbs } from '../contexts/BreadcrumbContext';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { fetchDashboardData, fetchAvailableYears, type DashboardData } from '../services/dashboardAPI';
import CustomSelect from '../components/ui/CustomSelect';
import {
  FactoryFacilitySwitcher,
  type FacilityView,
} from '../components/dashboard/overview/FactoryFacilitySwitcher';
import FactoryKpiStrip from '../components/dashboard/overview/FactoryKpiStrip';
import FactoryOutputTrendChart from '../components/dashboard/overview/FactoryOutputTrendChart';
import FactoryPipelineFlow from '../components/dashboard/overview/FactoryPipelineFlow';
import FactoryDepartmentMatrix from '../components/dashboard/overview/FactoryDepartmentMatrix';
import FactoryRiskPanel from '../components/dashboard/overview/FactoryRiskPanel';
import { AlertTriangle, RefreshCw, Clock, Calendar } from 'lucide-react';

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--color-surface-1) 25%, var(--color-surface-2) 50%, var(--color-surface-1) 75%)',
  backgroundSize: '400% 100%',
  animation: 'skeletonShimmer 1.6s ease-in-out infinite',
  borderRadius: '8px',
};

export default function Dashboard() {
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs(BREADCRUMBS.DASHBOARD);
  }, [setBreadcrumbs]);

  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clock, setClock] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<FacilityView>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [yearsList, setYearsList] = useState<number[]>([]);

  const [dashboardState, setDashboardState] = useState<{
    key: string;
    data: DashboardData | null;
    error: string | null;
  }>({ key: '', data: null, error: null });

  const requestKey = `${selectedYear}:${selectedFacility}:${refreshVersion}`;
  const hasCurrentData = dashboardState.key === requestKey;
  const data = hasCurrentData ? dashboardState.data : null;
  const error = hasCurrentData ? dashboardState.error : null;
  const loading = !hasCurrentData;

  // Manual refresh with guaranteed minimum 600ms spin feedback & skeleton transition
  const load = useCallback(async () => {
    setIsRefreshing(true);
    setDashboardState({ key: '', data: null, error: null });
    const minTimer = new Promise((resolve) => setTimeout(resolve, 600));
    try {
      const [nextData] = await Promise.all([
        fetchDashboardData(selectedYear, selectedFacility),
        minTimer,
      ]);
      setDashboardState({ key: `${selectedYear}:${selectedFacility}:${refreshVersion + 1}`, data: nextData, error: null });
      setRefreshVersion((v) => v + 1);
    } catch {
      setDashboardState({
        key: `${selectedYear}:${selectedFacility}:${refreshVersion + 1}`,
        data: null,
        error: 'Failed to connect to manufacturing database',
      });
      setRefreshVersion((v) => v + 1);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedYear, selectedFacility, refreshVersion]);

  // 1. Fetch available years once
  useEffect(() => {
    fetchAvailableYears()
      .then((list) => setYearsList(list))
      .catch(() => {});
  }, []);

  // 2. Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const n = new Date();
      setClock(
        n.toLocaleDateString('en-US', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' · ' +
          n.toLocaleTimeString('en-US', { hour12: false })
      );
    };
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, []);

  // 3. Fetch Dashboard Data on filter change
  useEffect(() => {
    let cancelled = false;
    fetchDashboardData(selectedYear, selectedFacility)
      .then((nextData) => {
        if (!cancelled) setDashboardState({ key: requestKey, data: nextData, error: null });
      })
      .catch(() => {
        if (!cancelled)
          setDashboardState({
            key: requestKey,
            data: null,
            error: 'Failed to connect to manufacturing database',
          });
      });

    const interval = setInterval(() => {
      fetchDashboardData(selectedYear, selectedFacility)
        .then((nextData) => {
          if (!cancelled) setDashboardState({ key: requestKey, data: nextData, error: null });
        })
        .catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedYear, selectedFacility, requestKey]);

  // 4. Mount Refresh Action in Topbar
  const { setTopbarActions } = useTopbarActions();
  const isSpinning = isRefreshing || loading;

  useEffect(() => {
    setTopbarActions(
      <button
        onClick={load}
        disabled={isSpinning}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isSpinning ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: isSpinning ? 0.8 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isSpinning) {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.color = 'var(--color-brand-600)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
        title="Refresh Data"
        aria-label="Refresh Data"
      >
        <RefreshCw
          size={18}
          strokeWidth={1.75}
          className={isSpinning ? 'animate-spin text-[var(--color-brand-600)]' : ''}
        />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, load, isSpinning]);

  // Loading skeleton layout (Zero-scroll matching layout)
  if (loading && !data) {
    return (
      <div className="h-full w-full overflow-hidden flex flex-col justify-between p-3 gap-2 bg-[var(--color-surface-1)]">
        {/* Topbar Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '40px' }}>
          <div className="app-skeleton" style={{ width: 340, height: 36, ...shimmerStyle }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="app-skeleton" style={{ width: 120, height: 36, ...shimmerStyle }} />
            <div className="app-skeleton" style={{ width: 190, height: 36, ...shimmerStyle }} />
          </div>
        </div>
        {/* Row 1: KPI Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', height: '78px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="app-skeleton" style={{ height: '100%', ...shimmerStyle }} />
          ))}
        </div>
        {/* Row 2: Charts Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', height: '315px' }}>
          <div className="app-skeleton" style={{ height: '100%', ...shimmerStyle }} />
          <div className="app-skeleton" style={{ height: '100%', ...shimmerStyle }} />
        </div>
        {/* Row 3: Tables Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '10px', flex: 1, minHeight: '300px' }}>
          <div className="app-skeleton" style={{ height: '100%', ...shimmerStyle }} />
          <div className="app-skeleton" style={{ height: '100%', ...shimmerStyle }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--color-surface-0)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-danger-50)' }}
          >
            <AlertTriangle size={24} style={{ color: 'var(--color-danger-500)' }} />
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
            {error}
          </p>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold"
            style={{
              background: 'var(--color-brand-500)',
              color: 'var(--color-ui-on-interactive)',
            }}
          >
            <RefreshCw size={13} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const cockpit = data?.cockpit;

  return (
    <div
      className="h-full w-full overflow-hidden flex flex-col justify-between p-3 gap-2.5 bg-[var(--color-surface-1)]"
      style={{
        boxSizing: 'border-box',
        maxHeight: '100%',
      }}
    >
      {/* ── Top Bar Controls (~40px) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          height: '38px',
        }}
      >
        {/* Facility Segmented Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FactoryFacilitySwitcher
            value={selectedFacility}
            onChange={setSelectedFacility}
            fbeShare={cockpit?.kpi?.fbeShare}
            cllShare={cockpit?.kpi?.cllShare}
          />
        </div>

        {/* Year Dropdown & Real-time Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Real-time Clock */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-0)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <Clock size={14} style={{ color: 'var(--color-brand-600)' }} />
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono, monospace)',
                letterSpacing: '-0.01em',
              }}
            >
              {clock}
            </span>
          </div>

          {/* Year Dropdown */}
          <div style={{ width: '115px' }}>
            <CustomSelect
              value={selectedYear}
              onChange={(v) => setSelectedYear(v)}
              icon={<Calendar size={13} />}
              options={[
                { value: 'all', label: 'All Years' },
                ...yearsList.map((yr) => ({
                  value: yr.toString(),
                  label: yr.toString(),
                })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* ── Row 1: Executive KPI Strip (~78px) ── */}
      <div style={{ flexShrink: 0 }}>
        <FactoryKpiStrip
          kpi={cockpit?.kpi}
          selectedFacility={selectedFacility}
        />
      </div>

      {/* ── Row 2: Visual Comparison & Pipeline (~315px) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          height: '315px',
          flexShrink: 0,
        }}
      >
        <FactoryOutputTrendChart
          timeline={cockpit?.timeline}
          selectedFacility={selectedFacility}
        />
        <FactoryPipelineFlow
          pipeline={cockpit?.pipeline}
          totalWipPcs={cockpit?.kpi?.totalWipPcs}
        />
      </div>

      {/* ── Row 3: Operational Breakdown & Risk Matrix (~320px flex-1) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '7fr 5fr',
          gap: '10px',
          flex: 1,
          minHeight: '280px',
          maxHeight: '345px',
          overflow: 'hidden',
        }}
      >
        <FactoryDepartmentMatrix
          departments={cockpit?.departments}
          selectedFacility={selectedFacility}
        />
        <FactoryRiskPanel
          overdueOrders={cockpit?.overdueOrders}
          customerShare={cockpit?.customerShare}
        />
      </div>
    </div>
  );
}
