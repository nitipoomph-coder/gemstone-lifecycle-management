import React from 'react';
import { Building2, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import type { CustomerBacklogItem, SalesMetric } from '../../../services/orderVolumeSummaryAPI';
import { getCustomerGroupId } from '../../../config/customerGroups';

interface Props {
  customers: CustomerBacklogItem[];
  metric: SalesMetric;
  selectedCustCode: string | null;
  onSelectCustCode: (custCode: string | null) => void;
}

export const CustomerBacklogTable: React.FC<Props> = ({
  customers,
  metric,
  selectedCustCode,
  onSelectCustCode
}) => {
  const topCustomers = customers.slice(0, 10);

  const fmtValue = (qty: number, amount: number) => {
    if (metric === 'amount') {
      return '$' + Math.round(amount).toLocaleString();
    }
    return qty.toLocaleString() + ' pcs';
  };

  return (
    <div
      style={{
        background: 'var(--color-surface-0)',
        border: '1px solid var(--color-border-light)',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 250
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: '0.86rem',
              fontWeight: 900,
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Building2 size={15} style={{ color: 'var(--color-brand-500)' }} />
            Top Pending Customers (CustCode)
          </h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
            Ranked accounts by open order volume
          </span>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 4,
            background: 'var(--color-surface-2)',
            color: 'var(--color-text-secondary)'
          }}
        >
          {customers.length} Accounts
        </span>
      </div>

      {/* Customer List / Cards */}
      <div
        className="custom-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflowY: 'auto',
          maxHeight: 280,
          paddingRight: 2
        }}
      >
        {topCustomers.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
            No pending customer orders for selected period
          </div>
        ) : (
          topCustomers.map((cust, idx) => {
            const isSelected = selectedCustCode === cust.custCode;
            const groupId = getCustomerGroupId(cust.custCode);
            const riskQty = cust.overdueQty + cust.due15Qty;
            const riskPct = cust.totalQty > 0 ? (riskQty / cust.totalQty) * 100 : 0;
            const isAtRisk = riskQty > 0;

            return (
              <div
                key={cust.custCode}
                onClick={() => onSelectCustCode(isSelected ? null : cust.custCode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 6,
                  background: isSelected
                    ? 'color-mix(in srgb, var(--color-brand-500) 10%, var(--color-surface-0))'
                    : 'var(--color-surface-1)',
                  border: isSelected
                    ? '1.5px solid var(--color-brand-500)'
                    : '1px solid var(--color-border-light)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Left: Rank + CustCode + Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: idx < 3 ? 'var(--color-brand-500)' : 'var(--color-surface-2)',
                      color: idx < 3 ? '#fff' : 'var(--color-text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                      {cust.custCode}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                      Group: {groupId} • {cust.orderCount} Orders
                    </span>
                  </div>
                </div>

                {/* Right: Value + Risk Tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                      {fmtValue(cust.openQty, cust.totalAmount)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      {isAtRisk ? (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: 'var(--color-danger-600)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2
                          }}
                        >
                          <AlertTriangle size={11} /> {riskPct.toFixed(0)}% Overdue
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: 'var(--color-success-600)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2
                          }}
                        >
                          <CheckCircle2 size={11} /> On Schedule
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: isSelected ? 'var(--color-brand-500)' : 'var(--color-text-quaternary)' }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
