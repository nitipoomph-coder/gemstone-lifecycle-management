import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SalesRiskPoint, SalesMetric } from '../../../services/orderVolumeSummaryAPI';
import { CUSTOMER_GROUPS } from '../../../config/customerGroups';
import { fmtCurrency, fmtQty } from '../../../hooks/useOrderVolumeSummaryData';

interface Props {
  riskData: SalesRiskPoint[];
  metric: SalesMetric;
  selectedGroups: string[];
}

export const RiskCustomerChart: React.FC<Props> = ({ riskData, metric, selectedGroups }) => {
  const groupsToDisplay = useMemo(() => {
    if (selectedGroups.length === 0) return CUSTOMER_GROUPS.map(g => g.id);
    return selectedGroups;
  }, [selectedGroups]);

  const chartData = useMemo(() => {
    const getGroupForCustCode = (custCode: string) => {
      for (const group of CUSTOMER_GROUPS) {
        if (group.prefixes.some(p => custCode.startsWith(p))) return group.id;
      }
      return 'Other';
    };

    const groupMap: Record<string, { wip: number, overdue: number, safe: number }> = {};
    for (const g of groupsToDisplay) {
      groupMap[g] = { wip: 0, overdue: 0, safe: 0 };
    }

    riskData.forEach(row => {
      const gId = getGroupForCustCode(row.custCode);
      if (groupsToDisplay.includes(gId)) {
        const wipVal = metric === 'amount' ? row.wipAmount : row.wipQty;
        const overdueVal = metric === 'amount' ? row.overdueAmount : row.overdueQty;
        
        groupMap[gId].wip += wipVal;
        groupMap[gId].overdue += overdueVal;
        groupMap[gId].safe += Math.max(0, wipVal - overdueVal);
      }
    });

    return groupsToDisplay.map(gId => {
      const g = CUSTOMER_GROUPS.find(x => x.id === gId);
      return {
        id: gId,
        label: g?.label || gId,
        wip: groupMap[gId].wip,
        overdue: groupMap[gId].overdue,
        safe: groupMap[gId].safe,
        color: g?.color || '#3b82f6'
      };
    });
  }, [riskData, metric, groupsToDisplay]);

  const formatAxisValue = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    if (metric === 'qty') return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ background: 'var(--color-surface-0)', borderRadius: 8, padding: '14px 16px', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
          Delivery Risk by Customer Group
        </h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
          On Schedule vs Overdue • {metric === 'amount' ? 'USD ($)' : 'Pieces (PCS)'}
        </span>
      </div>

      <div style={{ height: 210, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 15, left: 5, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 700 }} axisLine={false} tickLine={false} dy={4} />
            <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 10, fill: 'var(--color-text-quaternary)', fontWeight: 700 }} axisLine={false} tickLine={false} dx={-4} width={55} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: 'var(--color-surface-0)', padding: '12px 16px', border: '1px solid var(--color-border-light)', borderRadius: 8, boxShadow: 'var(--shadow-dropdown)' }}>
                      <p style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: 'var(--erp-text-panel)', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-light)', paddingBottom: 6 }}>{label}</p>
                      {payload.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: entry.color }} />
                            <span style={{ fontSize: 'var(--erp-text-control)', color: 'var(--color-text-secondary)', fontWeight: 700 }}>{entry.name}</span>
                          </div>
                          <span style={{ fontSize: 'var(--erp-text-body)', color: 'var(--color-text-primary)', fontWeight: 900 }}>
                            {metric === 'amount' ? fmtCurrency(Number(entry.value)) : fmtQty(Number(entry.value))}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'var(--color-surface-1)', opacity: 0.4 }}
            />
            <Legend wrapperStyle={{ paddingTop: 2, fontSize: '11px', fontWeight: 700 }} />
            <Bar dataKey="safe" stackId="a" name="On Schedule" fill="#3b82f6" radius={[0, 0, 4, 4]} />
            <Bar dataKey="overdue" stackId="a" name="Overdue / At Risk" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
