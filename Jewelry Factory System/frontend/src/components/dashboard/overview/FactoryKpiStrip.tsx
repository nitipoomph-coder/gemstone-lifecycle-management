import React from 'react';
import { Package, Building2, Factory, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import type { CockpitKpi } from '../../../services/dashboardAPI';

interface FactoryKpiStripProps {
  kpi?: CockpitKpi;
  selectedFacility: 'ALL' | 'FBE' | 'CLL';
}

export const FactoryKpiStrip: React.FC<FactoryKpiStripProps> = ({
  kpi,
  selectedFacility,
}) => {
  const formatNumber = (num?: number) => {
    if (num == null) return '—';
    return num.toLocaleString();
  };

  const cards = [
    {
      id: 'wip',
      label: 'Total Active WIP',
      value: formatNumber(kpi?.totalWipPcs),
      subtext: `Pcs in production · ${formatNumber(kpi?.totalWipOrders)} orders`,
      icon: <Package size={17} />,
      colorClass: 'var(--color-brand-600)',
      bgClass: 'var(--color-brand-50)',
      isHighlighted: false,
    },
    {
      id: 'fbe',
      label: 'FBE Production',
      value: formatNumber(kpi?.fbeOutputPcs),
      subtext: `Pcs completed · ${kpi?.fbeShare ?? 0}% factory share`,
      icon: <Building2 size={17} />,
      colorClass: 'var(--color-brand-600)',
      bgClass: 'var(--color-surface-1)',
      isHighlighted: selectedFacility === 'FBE',
    },
    {
      id: 'cll',
      label: 'CLL Production',
      value: formatNumber(kpi?.cllOutputPcs),
      subtext: `Pcs completed · ${kpi?.cllShare ?? 0}% factory share`,
      icon: <Factory size={17} />,
      colorClass: 'var(--color-proc-polishing, var(--color-brand-600))',
      bgClass: 'var(--color-surface-1)',
      isHighlighted: selectedFacility === 'CLL',
    },
    {
      id: 'runrate',
      label: 'Daily Run-Rate',
      value: formatNumber(kpi?.dailyRunRate),
      subtext: `Pcs / workday · ${kpi?.activeWorkdays ?? 298} workdays`,
      icon: <Zap size={17} />,
      colorClass: 'var(--color-success-500)',
      bgClass: 'var(--color-success-50)',
      isHighlighted: false,
    },
    {
      id: 'overdue',
      label: 'Overdue Orders',
      value: formatNumber(kpi?.overdueCount),
      subtext: `Delayed orders · ${kpi?.onTimeRate ?? 100}% on-time`,
      icon: <AlertTriangle size={17} />,
      colorClass: (kpi?.overdueCount ?? 0) > 0 ? 'var(--color-danger-500)' : 'var(--color-success-500)',
      bgClass: (kpi?.overdueCount ?? 0) > 0 ? 'var(--color-danger-50)' : 'var(--color-success-50)',
      isHighlighted: (kpi?.overdueCount ?? 0) > 0,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '12px',
        width: '100%',
        minHeight: '80px',
      }}
    >
      {cards.map((c) => (
        <div
          key={c.id}
          style={{
            backgroundColor: 'var(--color-surface-0)',
            borderRadius: '8px',
            border: c.isHighlighted
              ? `1.5px solid ${c.colorClass}`
              : '1px solid var(--color-border-light)',
            boxShadow: 'var(--shadow-panel)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {c.label}
            </span>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: c.bgClass,
                color: c.colorClass,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {c.icon}
            </span>
          </div>

          {/* Card Value Row */}
          <div style={{ marginTop: '4px', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '1.55rem',
                fontWeight: 900,
                fontFamily: 'var(--font-display, inherit)',
                lineHeight: 1.1,
                color: c.id === 'overdue' && (kpi?.overdueCount ?? 0) > 0
                  ? 'var(--color-danger-500)'
                  : 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {c.value}
            </span>
          </div>

          {/* Card Subtext Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: c.id === 'overdue' && (kpi?.overdueCount ?? 0) > 0
                ? 'var(--color-danger-500)'
                : 'var(--color-text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {c.id !== 'overdue' && (
              <TrendingUp size={12} style={{ color: 'var(--color-brand-600)', flexShrink: 0 }} />
            )}
            <span>{c.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FactoryKpiStrip;
