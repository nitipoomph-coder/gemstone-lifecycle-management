import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { getCustomerGroupId, ALL_GROUPS } from '../../config/customerGroups';

interface GroupType {
  id: string;
  label: string;
  color: string;
}

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  custData: any[];
  activeYears: string[];
  selGroups: string[];
  ALL_GROUPS: GroupType[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CustomerDetailModal({
  isOpen,
  onClose,
  custData,
  activeYears,
  selGroups
}: CustomerDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Update selected year if activeYears change
  useEffect(() => {
    if (activeYears.length > 0) {
      if (!activeYears.includes(selectedYear)) {
        setSelectedYear(activeYears[activeYears.length - 1]);
      }
    }
  }, [activeYears, selectedYear]);

  // Compute table data based on selectedYear
  const { tableData, totals, isGroupView } = useMemo(() => {
    if (!isOpen || !selectedYear) return { tableData: [], totals: {}, isGroupView: false };
    
    // ถ้าเลือก 1 กลุ่ม ให้โชว์รายคน, ถ้าเลือกหลายกลุ่ม (หรือทั้งหมด) ให้โชว์สรุปเป็นกลุ่มใหญ่
    const isGroupView = selGroups.length !== 1;
    let list: any[] = [];

    if (!isGroupView) {
      // Individual customer view
      list = custData.map(cust => {
        const gId = getCustomerGroupId(cust.id || '');
        if (!selGroups.includes(gId)) return null;

        const monthlyData: Record<string, number> = {};
        let yearlyTotal = 0;
        
        MONTHS.forEach((m, idx) => {
          const mStr = String(idx + 1);
          const val = cust.monthly?.[selectedYear]?.[mStr] || 0;
          monthlyData[m] = val;
          yearlyTotal += val;
        });

        if (yearlyTotal === 0) return null;

        return {
          id: cust.id,
          name: cust.name,
          group: gId,
          monthly: monthlyData,
          yearlyTotal
        };
      }).filter(Boolean);
    } else {
      // Group aggregation view
      const groupMap: Record<string, any> = {};
      
      custData.forEach(cust => {
        const gId = getCustomerGroupId(cust.id || '');
        if (!selGroups.includes(gId)) return;

        if (!groupMap[gId]) {
          const gInfo = ALL_GROUPS.find(g => g.id === gId);
          groupMap[gId] = {
            id: gInfo ? gInfo.label : gId,
            name: '',
            group: gId,
            monthly: {},
            yearlyTotal: 0
          };
          MONTHS.forEach(m => groupMap[gId].monthly[m] = 0);
        }

        MONTHS.forEach((m, idx) => {
          const mStr = String(idx + 1);
          const val = cust.monthly?.[selectedYear]?.[mStr] || 0;
          groupMap[gId].monthly[m] += val;
          groupMap[gId].yearlyTotal += val;
        });
      });
      
      list = Object.values(groupMap).filter((g: any) => g.yearlyTotal > 0);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => b.yearlyTotal - a.yearlyTotal);

    // Compute column totals
    const colTotals: Record<string, number> = { yearlyTotal: 0 };
    MONTHS.forEach(m => colTotals[m] = 0);
    
    list.forEach(row => {
      colTotals.yearlyTotal += row.yearlyTotal;
      MONTHS.forEach(m => {
        colTotals[m] += row.monthly[m];
      });
    });

    return { tableData: list, totals: colTotals, isGroupView };
  }, [custData, isOpen, selectedYear, selGroups, searchQuery]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out' }} 
      />
      
      {/* Modal Content */}
      <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: 1400, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '0', animation: 'fadeInUp 0.3s ease-out', overflow: 'hidden' }}>
        
        {/* Header Section */}
        <div style={{ padding: '24px 32px 16px 32px', borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Customers Matrix
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0' }}>
                Detailed monthly breakdown for selected groups
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-tertiary)' }} className="hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-all">
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            {/* Year Tabs */}
            <div style={{ display: 'flex', background: 'var(--color-surface-1)', borderRadius: 20, padding: 4, border: '1px solid var(--color-border-light)' }}>
              {activeYears.map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  style={{
                    padding: '6px 20px',
                    borderRadius: 16,
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: 'none',
                    background: selectedYear === yr ? 'var(--color-brand-600)' : 'transparent',
                    color: selectedYear === yr ? 'white' : 'var(--color-text-secondary)',
                    boxShadow: selectedYear === yr ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
              <input 
                type="text" 
                placeholder={isGroupView ? "Search Group Name..." : "Search Customer ID or Name..."} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', borderRadius: 24, padding: '10px 16px 10px 38px', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', width: 280, transition: 'all 0.2s' }}
                className="focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {/* Matrix Table Area */}
        <div className="content-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: 'var(--color-surface-0)', padding: '20px 32px 32px 32px' }}>
          <div style={{ border: '1px solid var(--color-border-strong)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 1600 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: '12%', padding: '12px 16px', textAlign: 'left', fontWeight: 900, color: 'var(--color-text-inverse)', background: 'var(--color-table-header)', borderRight: '1px solid oklch(from var(--color-table-header) calc(l + 0.1) c h / 0.3)' }}>
                    {isGroupView ? 'Customer Group' : 'Customer ID'}
                  </th>
                  {MONTHS.map(m => (
                    <th key={m} style={{ width: '6.5%', padding: '12px 8px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-inverse)', background: 'var(--color-table-header)', borderRight: '1px solid oklch(from var(--color-table-header) calc(l + 0.1) c h / 0.3)', whiteSpace: 'nowrap' }}>
                      {m}
                    </th>
                  ))}
                  <th style={{ width: '10%', padding: '12px 16px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-inverse)', background: 'var(--color-table-header)', whiteSpace: 'nowrap' }}>Yearly Total</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                      No customers found for {selectedYear} matching the criteria.
                    </td>
                  </tr>
                ) : (
                  tableData.map((cust, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr key={cust.id} style={{ borderBottom: '1px solid var(--color-border-light)', background: isEven ? 'var(--color-surface-0)' : 'var(--color-table-row-alt)' }}>
                        <td style={{ padding: '10px 16px', borderRight: '1px solid var(--color-border-light)' }}>
                          <div style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{cust.id}</div>
                        </td>
                        {MONTHS.map(m => {
                          const val = cust.monthly[m];
                          return (
                            <td key={m} style={{ padding: '10px 8px', textAlign: 'right', color: val > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-quaternary)', borderRight: '1px solid var(--color-border-light)', whiteSpace: 'nowrap' }}>
                              {val > 0 ? `$ ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$ 0.00'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 900, color: 'var(--color-brand-700)', whiteSpace: 'nowrap' }}>
                          $ {cust.yearlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {tableData.length > 0 && (
                <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                  <tr style={{ background: 'var(--color-table-footer)', borderTop: '2px solid var(--color-border-strong)', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 900, color: 'var(--color-text-primary)', borderRight: '1px solid var(--color-border-light)' }}>
                      Total Amount
                    </td>
                    {MONTHS.map(m => (
                      <td key={m} style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 900, color: 'var(--color-brand-600)', borderRight: '1px solid var(--color-border-light)', whiteSpace: 'nowrap' }}>
                        $ {totals[m].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    ))}
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: 'var(--color-brand-700)', whiteSpace: 'nowrap' }}>
                      $ {totals.yearlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
