import { useState, useEffect, type SyntheticEvent } from 'react';
import { X, Sparkles, Calendar, Users, BarChart2 } from 'lucide-react';
import type { TopGalleryItem } from '../../../services/itemYearlySummaryAPI';
import type { PerspectiveMode } from '../../../hooks/useTopOrdersGalleryData';
import { comparisonPctColor, comparisonTextStyle, formatSignedPct } from './galleryComparison';

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TopOrdersItemPreviewProps {
  item: TopGalleryItem | null;
  onClose: () => void;
  baseYear: string;
  compareYear: string;
  compareEnabled: boolean;
  metric: 'qty' | 'amount';
  perspectiveMode?: PerspectiveMode;
  fmt: (value: number) => string;
  fmtQty: (value: number) => string;
}

export function TopOrdersItemPreview({
  item,
  onClose,
  baseYear,
  compareYear,
  compareEnabled,
  metric,
  perspectiveMode = 'combined',
  fmt,
  fmtQty,
}: TopOrdersItemPreviewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'customers'>('overview');

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item) return null;

  const isCompare = perspectiveMode === 'compare';
  const activeSharePct = isCompare
    ? (metric === 'amount' ? (item.baseYearShareOfPortfolioAmntPct ?? item.shareOfPortfolioAmntPct) : (item.baseYearShareOfPortfolioQtyPct ?? item.shareOfPortfolioQtyPct))
    : (metric === 'amount' ? item.shareOfPortfolioAmntPct : item.shareOfPortfolioQtyPct);

  const yearsList = Object.keys(item.yearlyTotals).sort((a, b) => Number(b) - Number(a));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(1040px, 95vw)',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-surface-0)',
          borderRadius: 14,
          border: '1px solid var(--color-border-light)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: item.rank === 1 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'var(--color-brand-500)',
                color: item.rank === 1 ? '#000' : '#FFF',
                fontSize: '0.85rem',
                fontWeight: 950,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {item.rank === 1 && <Sparkles size={13} />}
              Rank #{item.rank}
            </span>

            <span style={{ fontSize: '1.25rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              {item.itemNo}
            </span>

            <span
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 900,
                background: 'var(--color-brand-50)',
                color: 'var(--color-brand-600)',
                border: '1px solid var(--color-brand-300)',
              }}
            >
              {item.productTypeLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              borderRadius: 6,
              display: 'flex',
            }}
            className="hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Left Column: Big Image & Key Metrics */}
          <div
            style={{
              padding: 20,
              borderRight: '1px solid var(--color-border-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              background: 'var(--color-surface-1)',
              overflowY: 'auto',
            }}
          >
            {/* Image Preview Box */}
            <div
              style={{
                width: '100%',
                height: 230,
                borderRadius: 10,
                background: 'var(--color-surface-0)',
                border: '1px solid var(--color-border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                position: 'relative',
              }}
            >
              <img
                src={`/api/photos/ps/${item.itemNo}`}
                alt={item.itemNo}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                onError={(event: SyntheticEvent<HTMLImageElement>) => {
                  const image = event.currentTarget;
                  if (!image.dataset.triedCad) {
                    image.dataset.triedCad = "true";
                    image.src = `/api/photos/cad/${item.itemNo}`;
                  } else {
                    image.style.display = "none";
                  }
                }}
              />
            </div>

            {/* Significance Strip */}
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: 'var(--color-surface-0)',
                border: '1px solid var(--color-border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                  {isCompare ? `Share of ${baseYear} Total` : 'Portfolio Share (Combined)'}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 5,
                    background: 'var(--color-brand-500)',
                    color: '#FFF',
                    fontSize: '0.8rem',
                    fontWeight: 950,
                  }}
                  title={isCompare ? `สัดส่วน ${activeSharePct}% ของยอด ${baseYear} ทั้งหมด` : `สัดส่วน ${activeSharePct}% ของยอดสะสมรวมทั้งหมด`}
                >
                  {activeSharePct}% Share
                </span>
              </div>

              <div style={{ width: '100%', height: 6, background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.max(2, activeSharePct))}%`, height: '100%', background: 'var(--color-brand-500)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>{isCompare ? `${baseYear} Volume` : 'Combined Volume'}</div>
                  <div style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', fontWeight: 950 }}>{fmtQty(isCompare ? item.baseYearQty : item.totalCombinedQty)} pcs</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>{isCompare ? `${baseYear} Value` : 'Combined Value'}</div>
                  <div style={{ fontSize: '1.1rem', color: 'var(--color-brand-600)', fontWeight: 950 }}>{fmt(isCompare ? item.baseYearAmnt : item.totalCombinedAmnt)}</div>
                </div>
              </div>

              {isCompare && item.yoyGrowthPct !== null && (
                <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>YoY vs {compareYear}</span>
                  <span style={comparisonTextStyle(item.yoyGrowthPct)}>
                    {formatSignedPct(item.yoyGrowthPct)} ({item.qtyDiff >= 0 ? '+' : ''}{fmtQty(item.qtyDiff)} pcs)
                  </span>
                </div>
              )}

              {!isCompare && compareEnabled && compareYear && item.yoyGrowthPct !== null && (
                <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>{baseYear} Contribution</span>
                  <span style={comparisonTextStyle(item.yoyGrowthPct)}>
                    {fmtQty(item.baseYearQty)} pcs ({formatSignedPct(item.yoyGrowthPct)} · {item.qtyDiff >= 0 ? '+' : ''}{fmtQty(item.qtyDiff)} pcs vs {compareYear})
                  </span>
                </div>
              )}
            </div>

            {/* Primary Customer Group Badge */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'var(--color-surface-0)',
                border: '1px solid var(--color-border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>
                  {isCompare ? `Primary Customer (${baseYear})` : 'Primary Customer'}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', fontWeight: 950 }}>{item.primaryCustCode}</div>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                {item.primaryGroupLabel}
              </span>
            </div>
          </div>

          {/* Right Column: Tabbed Breakdown Views */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', padding: '0 12px', overflowX: 'auto' }}>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                style={{
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  border: 'none',
                  borderBottom: activeTab === 'overview' ? '2px solid var(--color-brand-500)' : '2px solid transparent',
                  color: activeTab === 'overview' ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <BarChart2 size={14} />
                Multi-Year Breakdown
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('monthly')}
                style={{
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  border: 'none',
                  borderBottom: activeTab === 'monthly' ? '2px solid var(--color-brand-500)' : '2px solid transparent',
                  color: activeTab === 'monthly' ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Calendar size={14} />
                Monthly Distribution
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customers')}
                style={{
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  border: 'none',
                  borderBottom: activeTab === 'customers' ? '2px solid var(--color-brand-500)' : '2px solid transparent',
                  color: activeTab === 'customers' ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Users size={14} />
                Customer Breakdown ({item.customersCount})
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Period Trend Banner */}
                  {compareEnabled && compareYear && (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        background: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 'var(--erp-text-control)', color: 'var(--color-text-secondary)', fontWeight: 800 }}>
                          Period Trend ({compareYear} → {baseYear})
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--erp-text-kpi)',
                            fontWeight: 800,
                            color: item.yoyGrowthPct !== null ? comparisonPctColor(item.yoyGrowthPct) : 'var(--color-text-tertiary)',
                            marginTop: 2,
                            letterSpacing: 0,
                          }}
                        >
                          {item.yoyGrowthPct !== null ? `${formatSignedPct(item.yoyGrowthPct)} vs ${compareYear}` : 'New Data'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 'var(--erp-text-control)', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>Volume Change</div>
                        <div style={{ fontSize: 'var(--erp-text-section)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          {item.qtyDiff >= 0 ? '+' : ''}{fmtQty(item.qtyDiff)} pcs
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Year by Year Cards */}
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                    Yearly Order History
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    {yearsList.map((yr) => {
                      const yrData = item.yearlyTotals[yr] || { qty: 0, amount: 0 };
                      const isBase = yr === baseYear;
                      const isComp = yr === compareYear;
                      return (
                        <div
                          key={yr}
                          style={{
                            padding: 14,
                            borderRadius: 8,
                            background: isBase ? 'color-mix(in srgb, var(--color-brand-500) 8%, var(--color-surface-0))' : 'var(--color-surface-1)',
                            border: `1px solid ${isBase ? 'var(--color-brand-400)' : 'var(--color-border-light)'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 950, color: 'var(--color-text-primary)' }}>{yr}</span>
                            {isBase && <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--color-brand-600)', background: 'var(--color-brand-50)', padding: '1px 6px', borderRadius: 4 }}>Base</span>}
                            {isComp && <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)', padding: '1px 6px', borderRadius: 4 }}>Compare</span>}
                          </div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 950, color: 'var(--color-text-primary)' }}>{fmtQty(yrData.qty)} pcs</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-brand-600)' }}>{fmt(yrData.amount)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'monthly' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                    Monthly Order Volume (12-Month Distribution)
                  </div>
                  {yearsList.map((yr) => {
                    const mthMap = item.monthlyBreakdown[yr] || {};
                    const maxMthVal = Math.max(...Object.values(mthMap).map(Number), 1);
                    return (
                      <div key={yr} style={{ padding: 14, borderRadius: 8, background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 950, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                          Year {yr} {yr === baseYear && isCompare ? '(Base Year)' : ''}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
                          {MONTH_NAMES.map((mName, mIdx) => {
                            const val = mthMap[String(mIdx + 1)] || 0;
                            const heightPct = Math.min(100, Math.max(12, (val / maxMthVal) * 100));
                            return (
                              <div key={mName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{ height: 60, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                  <div
                                    style={{
                                      width: '75%',
                                      height: `${heightPct}%`,
                                      background: val > 0 ? 'var(--color-brand-500)' : 'var(--color-surface-2)',
                                      borderRadius: '3px 3px 0 0',
                                    }}
                                    title={`${mName} ${yr}: ${fmtQty(val)} pcs`}
                                  />
                                </div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>{mName}</span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                                  {val > 0 ? fmtQty(val) : '-'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'customers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                      {isCompare ? `Customer Distribution (${baseYear})` : 'Customer Distribution for this Item (Combined)'}
                    </div>
                    {isCompare && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-brand-600)', fontWeight: 900 }}>
                        Showing {baseYear} active customers
                      </span>
                    )}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-light)', color: 'var(--color-text-tertiary)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', fontWeight: 900 }}>Customer</th>
                        <th style={{ padding: '8px 10px', fontWeight: 900 }}>Group</th>
                        <th style={{ padding: '8px 10px', fontWeight: 900, textAlign: 'right' }}>
                          {isCompare ? `${baseYear} Qty` : 'Total Qty'}
                        </th>
                        <th style={{ padding: '8px 10px', fontWeight: 900, textAlign: 'right' }}>
                          {isCompare ? `${baseYear} Value` : 'Total Value'}
                        </th>
                        {isCompare && compareYear && (
                          <th style={{ padding: '8px 10px', fontWeight: 900, textAlign: 'right' }}>
                            {compareYear} Qty
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {item.customerBreakdown.map((cust) => {
                        const displayQty = isCompare ? (cust.baseYearQty ?? cust.qty) : cust.qty;
                        const displayAmnt = isCompare ? (cust.baseYearAmnt ?? cust.amount) : cust.amount;
                        const compQty = cust.compareYearQty ?? 0;

                        return (
                          <tr key={cust.custCode} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '10px', fontWeight: 950, color: 'var(--color-text-primary)' }}>{cust.custCode}</td>
                            <td style={{ padding: '10px', fontWeight: 800, color: 'var(--color-text-secondary)' }}>{cust.groupLabel}</td>
                            <td style={{ padding: '10px', fontWeight: 950, textAlign: 'right', color: 'var(--color-text-primary)' }}>{fmtQty(displayQty)} pcs</td>
                            <td style={{ padding: '10px', fontWeight: 950, textAlign: 'right', color: 'var(--color-brand-600)' }}>{fmt(displayAmnt)}</td>
                            {isCompare && compareYear && (
                              <td style={{ padding: '10px', fontWeight: 800, textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                                {compQty > 0 ? `${fmtQty(compQty)} pcs` : '-'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
