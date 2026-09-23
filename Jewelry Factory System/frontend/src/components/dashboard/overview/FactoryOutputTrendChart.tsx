import React, { useState } from 'react';
import { BarChart3, Info } from 'lucide-react';
import type { CockpitTimelinePoint } from '../../../services/dashboardAPI';

interface FactoryOutputTrendChartProps {
  timeline?: CockpitTimelinePoint[];
  selectedFacility: 'ALL' | 'FBE' | 'CLL';
}

export const FactoryOutputTrendChart: React.FC<FactoryOutputTrendChartProps> = ({
  timeline = [],
  selectedFacility,
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<CockpitTimelinePoint | null>(null);

  const maxTotal = Math.max(...timeline.map((t) => t.total), 1);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-0)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-panel)',
        padding: '14px 16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border-light)',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-brand-50)',
              color: 'var(--color-brand-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 size={15} />
          </span>
          <div>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Facility Production Output Trend
            </div>
            <div
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--color-text-tertiary)',
              }}
            >
              Monthly Output: FBE vs CLL Facility Throughput
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.65rem', fontWeight: 800 }}>
          {(selectedFacility === 'ALL' || selectedFacility === 'FBE') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-brand-500)',
                }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>FBE Facility</span>
            </div>
          )}
          {(selectedFacility === 'ALL' || selectedFacility === 'CLL') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-proc-polishing, var(--color-brand-300))',
                }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>CLL Facility</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          paddingTop: '20px',
          paddingBottom: '6px',
          position: 'relative',
        }}
      >
        {timeline.map((point) => {
          const totalHeightPct = Math.max((point.total / maxTotal) * 78, 3);
          const isHovered = hoveredMonth?.month === point.month;

          return (
            <div
              key={point.month}
              onMouseEnter={() => setHoveredMonth(point)}
              onMouseLeave={() => setHoveredMonth(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Value Label above bar */}
              <span
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  color: isHovered ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-mono, monospace)',
                  marginBottom: '4px',
                }}
              >
                {point.total > 0
                  ? point.total >= 1000000
                    ? `${(point.total / 1000000).toFixed(1)}M`
                    : `${Math.round(point.total / 1000)}k`
                  : ''}
              </span>

              {/* Stacked / Split Bars */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '36px',
                  height: `${totalHeightPct}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  borderRadius: '4px 4px 1px 1px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-surface-2)',
                  transition: 'height 0.4s ease, opacity 0.2s ease',
                  opacity: isHovered ? 1 : 0.88,
                  outline: isHovered ? '2px solid var(--color-brand-400)' : 'none',
                }}
              >
                {/* CLL Bar on top */}
                {(selectedFacility === 'ALL' || selectedFacility === 'CLL') && point.cll > 0 && (
                  <div
                    style={{
                      height: `${(point.cll / Math.max(point.total, 1)) * 100}%`,
                      backgroundColor: 'var(--color-proc-polishing, var(--color-brand-300))',
                      width: '100%',
                      transition: 'height 0.3s ease',
                    }}
                    title={`CLL: ${point.cll.toLocaleString()} pcs`}
                  />
                )}
                {/* FBE Bar on bottom */}
                {(selectedFacility === 'ALL' || selectedFacility === 'FBE') && point.fbe > 0 && (
                  <div
                    style={{
                      height: `${(point.fbe / Math.max(point.total, 1)) * 100}%`,
                      backgroundColor: 'var(--color-brand-500)',
                      width: '100%',
                      transition: 'height 0.3s ease',
                    }}
                    title={`FBE: ${point.fbe.toLocaleString()} pcs`}
                  />
                )}
              </div>

              {/* Month Label */}
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: isHovered ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
                  marginTop: '6px',
                }}
              >
                {point.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Floating or Footer Tooltip */}
      {hoveredMonth ? (
        <div
          style={{
            backgroundColor: 'var(--color-surface-1)',
            borderRadius: '6px',
            border: '1px solid var(--color-border-medium)',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            fontWeight: 800,
            marginTop: '4px',
          }}
        >
          <span style={{ color: 'var(--color-text-primary)' }}>
            <strong>{hoveredMonth.label} Output:</strong> {hoveredMonth.total.toLocaleString()} pcs total
          </span>
          <div style={{ display: 'flex', gap: '14px' }}>
            <span style={{ color: 'var(--color-brand-600)' }}>
              FBE: {hoveredMonth.fbe.toLocaleString()} pcs ({hoveredMonth.total > 0 ? Math.round((hoveredMonth.fbe / hoveredMonth.total) * 100) : 0}%)
            </span>
            <span style={{ color: 'var(--color-proc-polishing, var(--color-text-primary))' }}>
              CLL: {hoveredMonth.cll.toLocaleString()} pcs ({hoveredMonth.total > 0 ? Math.round((hoveredMonth.cll / hoveredMonth.total) * 100) : 0}%)
            </span>
            <span style={{ color: 'var(--color-success-500)' }}>
              Avg: ~{hoveredMonth.dailyAvg.toLocaleString()} pcs/day
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.62rem',
            fontWeight: 700,
            color: 'var(--color-text-tertiary)',
            paddingTop: '4px',
          }}
        >
          <Info size={12} />
          <span>Hover over any month to view exact facility breakdown and daily average throughput.</span>
        </div>
      )}
    </div>
  );
};

export default FactoryOutputTrendChart;
