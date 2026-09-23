import React from 'react';
import { TableProperties } from 'lucide-react';
import type { CockpitDepartment } from '../../../services/dashboardAPI';

interface FactoryDepartmentMatrixProps {
  departments?: CockpitDepartment[];
  selectedFacility: 'ALL' | 'FBE' | 'CLL';
}

export const FactoryDepartmentMatrix: React.FC<FactoryDepartmentMatrixProps> = ({
  departments = [],
  selectedFacility,
}) => {
  const totalFbe = departments.reduce((acc, d) => acc + (d.fbePcs || 0), 0);
  const totalCll = departments.reduce((acc, d) => acc + (d.cllPcs || 0), 0);
  const grandTotal = departments.reduce((acc, d) => acc + (d.totalPcs || 0), 0);
  const totalDailyAvg = departments.reduce((acc, d) => acc + (d.dailyAvg || 0), 0);

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
      {/* Table Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-brand-50)',
              color: 'var(--color-brand-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TableProperties size={14} />
          </span>
          <div>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              11 Production Departments Matrix
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--color-text-tertiary)',
                marginLeft: '8px',
              }}
            >
              Real-time Output Across All Manufacturing Lines
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 800,
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-surface-1)',
            padding: '2px 8px',
            borderRadius: '6px',
            border: '1px solid var(--color-border-light)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          11 Depts Active
        </span>
      </div>

      {/* Table Container with Internal Scroll */}
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
            fontSize: '0.72rem',
          }}
        >
          {/* Sticky Header */}
          <thead
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--color-surface-1)',
              zIndex: 2,
            }}
          >
            <tr style={{ borderBottom: '1px solid var(--color-border-medium)' }}>
              <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', width: '45px', whiteSpace: 'nowrap' }}>
                Code
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                Department Name
              </th>
              {(selectedFacility === 'ALL' || selectedFacility === 'FBE') && (
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-brand-600)', width: '95px', whiteSpace: 'nowrap' }}>
                  FBE (Pcs)
                </th>
              )}
              {(selectedFacility === 'ALL' || selectedFacility === 'CLL') && (
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-proc-polishing, var(--color-text-primary))', width: '95px', whiteSpace: 'nowrap' }}>
                  CLL (Pcs)
                </th>
              )}
              <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)', width: '95px', whiteSpace: 'nowrap' }}>
                Total Output
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-tertiary)', width: '70px', whiteSpace: 'nowrap' }}>
                Share %
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-tertiary)', width: '80px', whiteSpace: 'nowrap' }}>
                Avg / Day
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {departments.map((dept, index) => {
              return (
                <tr
                  key={dept.code}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    backgroundColor: index % 2 === 0 ? 'var(--color-surface-0)' : 'color-mix(in srgb, var(--color-surface-1) 50%, var(--color-surface-0))',
                    transition: 'background-color 0.15s ease',
                  }}
                  className="hover:bg-[var(--color-surface-1)]"
                >
                  <td style={{ padding: '4px 8px', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-brand-600)' }}>
                    {dept.code}
                  </td>
                  <td style={{ padding: '4px 8px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {dept.name}
                  </td>
                  {(selectedFacility === 'ALL' || selectedFacility === 'FBE') && (
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {dept.fbePcs > 0 ? dept.fbePcs.toLocaleString() : '—'}
                    </td>
                  )}
                  {(selectedFacility === 'ALL' || selectedFacility === 'CLL') && (
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {dept.cllPcs > 0 ? dept.cllPcs.toLocaleString() : '—'}
                    </td>
                  )}
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {dept.totalPcs.toLocaleString()}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {dept.sharePct}%
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {dept.dailyAvg.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Sticky Total Footer */}
          <tfoot
            style={{
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'var(--color-surface-2)',
              zIndex: 2,
              fontWeight: 900,
            }}
          >
            <tr style={{ borderTop: '2px solid var(--color-border-medium)' }}>
              <td style={{ padding: '5px 8px', color: 'var(--color-text-primary)' }} colSpan={2}>
                Grand Total
              </td>
              {(selectedFacility === 'ALL' || selectedFacility === 'FBE') && (
                <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--color-brand-600)', fontFamily: 'var(--font-mono, monospace)' }}>
                  {totalFbe.toLocaleString()}
                </td>
              )}
              {(selectedFacility === 'ALL' || selectedFacility === 'CLL') && (
                <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--color-proc-polishing, var(--color-text-primary))', fontFamily: 'var(--font-mono, monospace)' }}>
                  {totalCll.toLocaleString()}
                </td>
              )}
              <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                {grandTotal.toLocaleString()}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                100%
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                {totalDailyAvg.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default FactoryDepartmentMatrix;
