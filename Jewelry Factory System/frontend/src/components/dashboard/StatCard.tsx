import { PackageCheck, ClipboardList, Factory, BarChart3 } from 'lucide-react';
import type { DashboardStat } from '../../types';

const variantStyles: Record<string, { border: string; iconColor: string }> = {
  procurement: { border: 'border-l-[var(--color-brand-600)]', iconColor: 'text-[var(--color-brand-600)]' },
  orders: { border: 'border-l-[var(--color-accent-600)]', iconColor: 'text-[var(--color-accent-600)]' },
  production: { border: 'border-l-[oklch(0.45_0.10_280)]', iconColor: 'text-[oklch(0.45_0.10_280)]' },
  stock: { border: 'border-l-[var(--color-success-500)]', iconColor: 'text-[var(--color-success-500)]' },
};

const iconMap: Record<string, React.ElementType> = {
  procurement: PackageCheck,
  orders: ClipboardList,
  production: Factory,
  stock: BarChart3,
};

interface StatCardProps {
  stat: DashboardStat;
}

export default function StatCard({ stat }: StatCardProps) {
  const style = variantStyles[stat.variant];
  const IconComponent = iconMap[stat.variant] || BarChart3;

  return (
    <div
      className={`border-l-4 bg-[var(--color-surface-1)] p-4 transition-colors duration-150 hover:bg-[var(--color-surface-2)] ${style.border}`}
      style={{
        borderTop: '1px solid var(--color-border-strong)',
        borderRight: '1px solid var(--color-border-strong)',
        borderBottom: '1px solid var(--color-border-strong)',
        borderRadius: '2px',
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">{stat.label}</span>
        <IconComponent size={18} className={style.iconColor} />
      </div>
      <div className="mb-1 text-[2rem] font-bold leading-none tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        {stat.value}
      </div>
      <div
        className={`flex items-center gap-1 text-xs ${
          stat.direction === 'up' ? 'text-[var(--color-success-500)]' : 'text-[var(--color-danger-500)]'
        }`}
      >
        {stat.change}
      </div>
    </div>
  );
}
