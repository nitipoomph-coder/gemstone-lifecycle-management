import React from 'react';
import { GitCommit, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CockpitPipelineStage } from '../../../services/dashboardAPI';

interface FactoryPipelineFlowProps {
  pipeline?: CockpitPipelineStage[];
  totalWipPcs?: number;
}

// Clean standardized single-line ERP stage names
const STAGE_NAME_MAP: Record<string, string> = {
  wax: 'Wax Prep',
  cast: 'Casting',
  grind: 'Filing',
  polish: 'Polishing',
  plate: 'Plating',
  qc: 'QC Check',
  pack: 'Packing',
};

export const FactoryPipelineFlow: React.FC<FactoryPipelineFlowProps> = ({
  pipeline = [],
  totalWipPcs = 1,
}) => {
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
            <GitCommit size={16} />
          </span>
          <div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Production Process Pipeline
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--color-text-tertiary)',
              }}
            >
              Real-time WIP Stage Balance & Bottleneck Detection
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-surface-1)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-light)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {totalWipPcs.toLocaleString()} Total WIP pcs
          </span>
        </div>
      </div>

      {/* Pipeline Stage Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(pipeline.length, 1)}, 1fr)`,
          gap: '8px',
          alignItems: 'stretch',
          padding: '10px 0',
          flex: 1,
        }}
      >
        {pipeline.map((stage, idx) => {
          const isBottleneck = stage.isBottleneck;
          const cleanName = STAGE_NAME_MAP[stage.id] || stage.name;

          return (
            <div
              key={stage.id || idx}
              style={{
                backgroundColor: isBottleneck
                  ? 'color-mix(in srgb, var(--color-danger-500) 6%, var(--color-surface-0))'
                  : 'var(--color-surface-1)',
                borderRadius: '8px',
                border: isBottleneck
                  ? '1.5px solid var(--color-danger-500)'
                  : '1px solid var(--color-border-light)',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {/* Top Row: Sequence Badge & Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isBottleneck ? 'var(--color-danger-500)' : 'var(--color-brand-500)',
                    color: 'var(--color-ui-on-interactive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono, monospace)',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>

                {isBottleneck ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      color: 'var(--color-danger-500)',
                      backgroundColor: 'var(--color-danger-50)',
                      padding: '2px 5px',
                      borderRadius: '6px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <AlertCircle size={10} /> Peak
                  </span>
                ) : (
                  <CheckCircle2 size={13} style={{ color: 'var(--color-success-500)', opacity: 0.8 }} />
                )}
              </div>

              {/* Stage Name (Clean, single-line guaranteed) */}
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  color: isBottleneck ? 'var(--color-danger-500)' : 'var(--color-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '6px',
                }}
                title={cleanName}
              >
                {cleanName}
              </div>

              {/* Stage Pieces & Share */}
              <div style={{ marginTop: '6px' }}>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-display, inherit)',
                    lineHeight: 1.1,
                    color: isBottleneck ? 'var(--color-danger-500)' : 'var(--color-brand-600)',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {stage.pcs.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--color-text-tertiary)',
                    marginTop: '2px',
                  }}
                >
                  {stage.sharePct}% of WIP
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-surface-2)',
                  overflow: 'hidden',
                  marginTop: '8px',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(stage.sharePct * 2.2, 100)}%`,
                    height: '100%',
                    backgroundColor: isBottleneck ? 'var(--color-danger-500)' : 'var(--color-brand-500)',
                    borderRadius: '2px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--color-text-tertiary)',
          borderTop: '1px solid var(--color-border-light)',
          paddingTop: '6px',
        }}
      >
        <span>Sequence: Raw Casting ➔ Precision Surface Finishing ➔ Quality Acceptance</span>
        <span>Dual Milestones synced across FBE and CLL</span>
      </div>
    </div>
  );
};

export default FactoryPipelineFlow;
