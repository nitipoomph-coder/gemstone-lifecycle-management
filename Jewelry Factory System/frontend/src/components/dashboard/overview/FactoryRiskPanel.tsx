import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Users, ArrowRight, ExternalLink } from 'lucide-react';
import type { CockpitOverdueOrder, CockpitCustomerShare } from '../../../services/dashboardAPI';

interface FactoryRiskPanelProps {
  overdueOrders?: CockpitOverdueOrder[];
  customerShare?: CockpitCustomerShare[];
}

export const FactoryRiskPanel: React.FC<FactoryRiskPanelProps> = ({
  overdueOrders = [],
  customerShare = [],
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overdue' | 'customers'>('overdue');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

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
      }}
    >
      {/* Panel Header with Segmented Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border-light)',
          paddingBottom: '10px',
          marginBottom: '10px',
        }}
      >
        {/* Tab Buttons */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-surface-1)',
            borderRadius: '8px',
            padding: '3px',
            gap: '3px',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('overdue')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: activeTab === 'overdue' ? '1px solid var(--color-danger-300, var(--color-danger-500))' : '1px solid transparent',
              backgroundColor: activeTab === 'overdue' ? 'var(--color-surface-0)' : 'transparent',
              color: activeTab === 'overdue' ? 'var(--color-danger-500)' : 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <AlertTriangle size={13} />
            <span>Critical Overdue</span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-danger-50)',
                color: 'var(--color-danger-500)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {overdueOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: activeTab === 'customers' ? '1px solid var(--color-brand-300)' : '1px solid transparent',
              backgroundColor: activeTab === 'customers' ? 'var(--color-surface-0)' : 'transparent',
              color: activeTab === 'customers' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={13} />
            <span>Customer Volume</span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: '8px',
                backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)',
                color: 'var(--color-brand-600)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Top 5
            </span>
          </button>
        </div>

        {/* Action Link */}
        {activeTab === 'overdue' ? (
          <button
            type="button"
            onClick={() => navigate('/po-tracker')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.7rem',
              fontWeight: 800,
              color: 'var(--color-brand-600)',
              backgroundColor: 'var(--color-brand-50)',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Open PO Tracker</span>
            <ArrowRight size={11} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/dashboard/customer')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.7rem',
              fontWeight: 800,
              color: 'var(--color-brand-600)',
              backgroundColor: 'var(--color-brand-50)',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Sales Dashboard</span>
            <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* ── Content View ── */}
      {activeTab === 'overdue' ? (
        <div
          className="content-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid var(--color-border-light)',
            borderRadius: '6px',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.75rem',
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--color-surface-1)',
                zIndex: 1,
              }}
            >
              <tr style={{ borderBottom: '1px solid var(--color-border-medium)' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Order No</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Customer</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Due Date</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-danger-500)', whiteSpace: 'nowrap', minWidth: '90px' }}>Days Overdue</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', minWidth: '70px' }}>Qty (Pcs)</th>
              </tr>
            </thead>
            <tbody>
              {overdueOrders.map((ord, idx) => (
                <tr
                  key={ord.ordNo || idx}
                  onClick={() => navigate(`/po-tracker/${ord.ordNo}`)}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  className="hover:bg-[var(--color-surface-1)]"
                >
                  <td style={{ padding: '6px 10px', fontWeight: 900, color: 'var(--color-brand-600)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                    {ord.ordNo}
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                    {ord.custCode}
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDate(ord.dueDate)}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 900, color: 'var(--color-danger-500)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                    +{ord.delayDays}d
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                    {ord.qty?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="content-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            justifyContent: 'flex-start',
          }}
        >
          {customerShare.map((cust) => (
            <div
              key={cust.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.74rem',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <span
                style={{
                  width: '45px',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--color-brand-600)',
                }}
              >
                {cust.code}
              </span>

              <span
                style={{
                  flex: '0 1 180px',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={cust.name}
              >
                {cust.name}
              </span>

              {/* Progress Bar */}
              <div
                style={{
                  flex: 1,
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-surface-2)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(cust.sharePct * 2.5, 100)}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-brand-500)',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <span
                style={{
                  width: '45px',
                  textAlign: 'right',
                  fontWeight: 800,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {cust.sharePct}%
              </span>

              <span
                style={{
                  width: '75px',
                  textAlign: 'right',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {cust.qty.toLocaleString()} pcs
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FactoryRiskPanel;
