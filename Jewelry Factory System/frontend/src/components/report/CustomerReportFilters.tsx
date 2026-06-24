import React from 'react';
import { X, CheckSquare, Square } from 'lucide-react';
import { ALL_GROUPS } from '../../config/customerGroups';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CustomerReportFiltersProps {
  isFilterOpen: boolean;
  setIsFilterOpen: (v: boolean) => void;

  availableYears: string[];
  baseYear: string;
  setBaseYear: (v: string) => void;
  compareYear: string;
  setCompareYear: (v: string) => void;
  compareYear2: string;
  setCompareYear2: (v: string) => void;

  activeYears: string[];
  growthComparisons: { a: string; b: string }[];
  setGrowthComparisons: React.Dispatch<React.SetStateAction<{ a: string; b: string }[]>>;

  selMonths: string[];
  setSelMonths: React.Dispatch<React.SetStateAction<string[]>>;

  selGroups: string[];
  toggleGroup: (gId: string) => void;

  groupCustomers: string[];
  selCustomers: string[];
  toggleCustomer: (cId: string) => void;
  toggleAllCustomers: () => void;
}

export default function CustomerReportFilters({
  isFilterOpen, setIsFilterOpen,
  availableYears,
  baseYear, setBaseYear,
  compareYear, setCompareYear,
  compareYear2, setCompareYear2,
  activeYears,
  growthComparisons, setGrowthComparisons,
  selMonths, setSelMonths,
  selGroups, toggleGroup,
  groupCustomers, selCustomers, toggleCustomer, toggleAllCustomers,
}: CustomerReportFiltersProps) {
  if (!isFilterOpen) return null;

  const toggleMonth = (m: string) => {
    setSelMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'color-mix(in srgb, var(--color-surface-900) 60%, transparent)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--color-surface-0)', width: '900px', maxWidth: '95%', maxHeight: '90vh',
        borderRadius: 16, display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 40px color-mix(in srgb, var(--color-surface-900) 40%, transparent)',
        border: '1px solid var(--color-border-light)', animation: 'fadeInUp 0.3s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderBottom: '1px solid var(--color-border-light)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, margin: 0, color: 'var(--color-text-primary)' }}>
            Report Filters
          </h3>
          <button
            onClick={() => setIsFilterOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="content-scrollbar"
          style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {/* Year Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 6 }}>
                Base Year
              </label>
              <select
                value={baseYear}
                onChange={e => setBaseYear(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 6 }}>
                Compare Year 1
              </label>
              <select
                value={compareYear}
                onChange={e => setCompareYear(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}
              >
                <option value="none">-- None --</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 6 }}>
                Compare Year 2
              </label>
              <select
                value={compareYear2}
                onChange={e => setCompareYear2(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}
              >
                <option value="none">-- None --</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Growth Comparison */}
          <div>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 6 }}>
              Growth Comparison Years
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {growthComparisons.map((comp, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <select
                    value={comp.a}
                    onChange={e => {
                      const newComps = [...growthComparisons];
                      newComps[idx] = { ...newComps[idx], a: e.target.value };
                      setGrowthComparisons(newComps);
                    }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}
                  >
                    {activeYears.map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>VS</span>
                  <select
                    value={comp.b}
                    onChange={e => {
                      const newComps = [...growthComparisons];
                      newComps[idx] = { ...newComps[idx], b: e.target.value };
                      setGrowthComparisons(newComps);
                    }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 800, outline: 'none' }}
                  >
                    {activeYears.map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                  {growthComparisons.length > 1 && (
                    <button
                      onClick={() => setGrowthComparisons(comps => comps.filter((_, i) => i !== idx))}
                      style={{ padding: '8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border-light)', borderRadius: 8, cursor: 'pointer', color: 'var(--color-danger-500)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setGrowthComparisons(comps => [...comps, { a: activeYears[0], b: activeYears[1] || activeYears[0] }])}
                style={{ padding: '6px 12px', background: 'var(--color-surface-2)', border: '1px dashed var(--color-brand-300)', borderRadius: 8, cursor: 'pointer', color: 'var(--color-brand-600)', fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-start' }}
              >
                + Add Comparison
              </button>
            </div>
          </div>

          {/* Month Selectors */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)' }}>
                Select Months ({selMonths.length})
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setSelMonths([])}
                  disabled={selMonths.length === 0}
                  style={{ background: 'none', border: 'none', color: selMonths.length === 0 ? 'var(--color-text-quaternary)' : 'var(--color-danger-500)', fontSize: '0.7rem', fontWeight: 800, cursor: selMonths.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Clear All
                </button>
                <button
                  onClick={() => setSelMonths(MONTHS)}
                  disabled={selMonths.length === MONTHS.length}
                  style={{ background: 'none', border: 'none', color: selMonths.length === MONTHS.length ? 'var(--color-text-quaternary)' : 'var(--color-brand-500)', fontSize: '0.7rem', fontWeight: 800, cursor: selMonths.length === MONTHS.length ? 'not-allowed' : 'pointer' }}
                >
                  Select All
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {MONTHS.map(m => {
                const on = selMonths.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleMonth(m)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800,
                      border: `1px solid ${on ? 'var(--color-brand-500)' : 'var(--color-border-strong)'}`,
                      background: on ? 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)' : 'var(--color-surface-1)',
                      color: on ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Selectors */}
          <div>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 10 }}>
              Select Customer Groups
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_GROUPS.map(g => {
                const on = selGroups.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800,
                      border: `1px solid ${on ? g.color : 'var(--color-border-strong)'}`,
                      background: on ? `color-mix(in srgb, ${g.color} 15%, transparent)` : 'var(--color-surface-1)',
                      color: on ? g.color : 'var(--color-text-tertiary)',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: on ? g.color : 'var(--color-border-strong)', flexShrink: 0 }} />
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Selectors */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-quaternary)' }}>
                Select Customers ({selCustomers.length === 0 ? (groupCustomers.length > 0 ? 'All' : '0') : selCustomers.filter(id => id !== '__NONE__').length} selected)
              </label>
              <button
                onClick={toggleAllCustomers}
                style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-brand-500)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {selCustomers.length === 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div
              className="content-scrollbar"
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6,
                maxHeight: 250, overflowY: 'auto', padding: '12px',
                background: 'var(--color-surface-1)', borderRadius: 8, border: '1px solid var(--color-border-light)'
              }}
            >
              {groupCustomers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', gridColumn: '1 / -1' }}>
                  Please select at least one Customer Group above.
                </div>
              ) : groupCustomers.map(cId => {
                const on = selCustomers.length === 0 || selCustomers.includes(cId);
                return (
                  <div
                    key={cId}
                    onClick={() => toggleCustomer(cId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px', borderRadius: 6, cursor: 'pointer',
                      background: on ? 'var(--color-surface-0)' : 'transparent'
                    }}
                  >
                    {on
                      ? <CheckSquare size={14} style={{ color: 'var(--color-brand-500)' }} />
                      : <Square size={14} style={{ color: 'var(--color-border-strong)' }} />
                    }
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: on ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                      {cId}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setIsFilterOpen(false)}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, background: 'var(--color-brand-500)', color: 'var(--color-surface-0)', border: 'none', cursor: 'pointer' }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
