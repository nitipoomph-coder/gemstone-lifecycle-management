import React from 'react';
import { Layers, Building2, Factory } from 'lucide-react';

export type FacilityView = 'ALL' | 'FBE' | 'CLL';

interface FactoryFacilitySwitcherProps {
  value: FacilityView;
  onChange: (val: FacilityView) => void;
  fbeShare?: number;
  cllShare?: number;
}

export const FactoryFacilitySwitcher: React.FC<FactoryFacilitySwitcherProps> = ({
  value,
  onChange,
  fbeShare = 31,
  cllShare = 69,
}) => {
  const options: { id: FacilityView; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'ALL',
      label: 'ALL (Compare)',
      icon: <Layers size={14} />,
      badge: 'Dual View',
    },
    {
      id: 'FBE',
      label: 'FBE Facility',
      icon: <Building2 size={14} />,
      badge: `${fbeShare}%`,
    },
    {
      id: 'CLL',
      label: 'CLL Facility',
      icon: <Factory size={14} />,
      badge: `${cllShare}%`,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Manufacturing Facility Filter"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        borderRadius: '10px',
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-light)',
        gap: '4px',
      }}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: 'var(--erp-text-control, 0.78rem)',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: isActive ? '1px solid var(--color-brand-300)' : '1px solid transparent',
              backgroundColor: isActive
                ? 'var(--color-surface-0)'
                : 'transparent',
              color: isActive
                ? 'var(--color-brand-600)'
                : 'var(--color-text-secondary)',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <span
              style={{
                color: isActive ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {opt.icon}
            </span>
            <span>{opt.label}</span>
            {opt.badge && (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)'
                    : 'var(--color-surface-2)',
                  color: isActive
                    ? 'var(--color-brand-600)'
                    : 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FactoryFacilitySwitcher;
