import React from 'react';
import { Check, Plus, X } from 'lucide-react';
import { ALL_GROUPS, getCustomerGroupId } from '../../config/customerGroups';
import CustomSelect from '../ui/CustomSelect';

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
  compareYear3: string;
  setCompareYear3: (v: string) => void;

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
  isFilterOpen,
  availableYears,
  baseYear, setBaseYear,
  compareYear, setCompareYear,
  compareYear2, setCompareYear2,
  compareYear3, setCompareYear3,
  activeYears,
  growthComparisons, setGrowthComparisons,
  selMonths, setSelMonths,
  selGroups, toggleGroup,
  groupCustomers, selCustomers, toggleCustomer, toggleAllCustomers,
}: CustomerReportFiltersProps) {
  React.useEffect(() => {
    if (compareYear !== 'none' && compareYear === baseYear) setCompareYear('none');
    if (compareYear2 !== 'none' && (compareYear2 === baseYear || compareYear2 === compareYear)) setCompareYear2('none');
    if (compareYear3 !== 'none' && (compareYear3 === baseYear || compareYear3 === compareYear || compareYear3 === compareYear2)) setCompareYear3('none');
  }, [baseYear, compareYear, compareYear2, compareYear3, setCompareYear, setCompareYear2, setCompareYear3]);

  if (!isFilterOpen) return null;

  const yearOptions = availableYears.map(year => ({ value: year, label: year }));
  const compareOptions = [
    { value: 'none', label: 'None' },
    ...availableYears
      .filter(year => year !== baseYear && year !== compareYear2 && year !== compareYear3)
      .map(year => ({ value: year, label: year }))
  ];
  const compare2Options = [
    { value: 'none', label: 'None' },
    ...availableYears
      .filter(year => year !== baseYear && year !== compareYear && year !== compareYear3)
      .map(year => ({ value: year, label: year }))
  ];
  const compare3Options = [
    { value: 'none', label: 'None' },
    ...availableYears
      .filter(year => year !== baseYear && year !== compareYear && year !== compareYear2)
      .map(year => ({ value: year, label: year }))
  ];
  const growthOptions = activeYears.map(year => ({ value: year, label: year }));

  const selectedGroupCount = selGroups.length;
  const selectedCustomerIds = selCustomers.length === 0 ? groupCustomers : selCustomers.filter(id => id !== '__NONE__');
  const selectedCustomerCount = selectedCustomerIds.length;
  const allGroupsSelected = selectedGroupCount === ALL_GROUPS.length;
  const allCustomersSelected = groupCustomers.length > 0 && selCustomers.length === 0;
  const noCustomersSelected = groupCustomers.length === 0 || selCustomers.includes('__NONE__') || selectedCustomerCount === 0;
  const selectedCompareYears = [compareYear, compareYear2, compareYear3].filter(year => year !== 'none');
  const availableAddYears = availableYears.filter(year => year !== baseYear && !selectedCompareYears.includes(year));
  const suggestedAddYear = [...availableAddYears].reverse().find(year => Number(year) < Number(baseYear)) || availableAddYears[availableAddYears.length - 1] || 'none';
  const canAddYear = selectedCompareYears.length < 3 && suggestedAddYear !== 'none';
  const maxGrowthComparisons = Math.max(1, activeYears.length - 1);
  const canAddGrowth = activeYears.length > 1 && growthComparisons.length < maxGrowthComparisons;

  const groupColorByCustomer = (customerId: string) => {
    const groupId = getCustomerGroupId(customerId);
    return ALL_GROUPS.find(group => group.id === groupId)?.color;
  };

  const selectAllGroups = () => {
    ALL_GROUPS.forEach(group => {
      if (!selGroups.includes(group.id)) toggleGroup(group.id);
    });
  };

  const clearGroups = () => {
    selGroups.forEach(groupId => toggleGroup(groupId));
  };

  const selectAllCustomers = () => {
    if (!allCustomersSelected) toggleAllCustomers();
  };

  const clearCustomers = () => {
    if (allCustomersSelected) {
      toggleAllCustomers();
      return;
    }
    selectedCustomerIds.forEach(customerId => toggleCustomer(customerId));
  };

  const handleBaseYearChange = (year: string) => {
    setBaseYear(year);
    if (compareYear === year) setCompareYear('none');
    if (compareYear2 === year) setCompareYear2('none');
    if (compareYear3 === year) setCompareYear3('none');
  };

  const handleCompareYearChange = (year: string) => {
    setCompareYear(year);
    if (year !== 'none' && compareYear2 === year) setCompareYear2('none');
    if (year !== 'none' && compareYear3 === year) setCompareYear3('none');
  };

  const handleCompareYear2Change = (year: string) => {
    setCompareYear2(year);
    if (year !== 'none' && compareYear === year) setCompareYear('none');
    if (year !== 'none' && compareYear3 === year) setCompareYear3('none');
  };

  const handleCompareYear3Change = (year: string) => {
    setCompareYear3(year);
    if (year !== 'none' && compareYear === year) setCompareYear('none');
    if (year !== 'none' && compareYear2 === year) setCompareYear2('none');
  };

  const addCompareYearSlot = () => {
    if (!canAddYear) return;
    if (compareYear === 'none') {
      setCompareYear(suggestedAddYear);
      return;
    }
    if (compareYear2 === 'none') {
      setCompareYear2(suggestedAddYear);
      return;
    }
    if (compareYear3 === 'none') setCompareYear3(suggestedAddYear);
  };

  const removeCompareYear = () => {
    if (compareYear2 !== 'none') {
      setCompareYear(compareYear2);
      setCompareYear2(compareYear3);
      setCompareYear3('none');
      return;
    }
    if (compareYear3 !== 'none') {
      setCompareYear(compareYear3);
      setCompareYear3('none');
      return;
    }
    setCompareYear('none');
  };

  const removeCompareYear2 = () => {
    if (compareYear3 !== 'none') {
      setCompareYear2(compareYear3);
      setCompareYear3('none');
      return;
    }
    setCompareYear2('none');
  };

  const removeCompareYear3 = () => setCompareYear3('none');

  const toggleMonth = (month: string) => {
    setSelMonths(prev => prev.includes(month) ? prev.filter(item => item !== month) : [...prev, month]);
  };

  const addGrowthComparison = () => {
    if (!canAddGrowth) return;
    const usedTargets = new Set(growthComparisons.map(comp => comp.b));
    const nextTarget = activeYears.slice(1).find(year => !usedTargets.has(year)) || activeYears[1];
    setGrowthComparisons(prev => [...prev, { a: activeYears[0], b: nextTarget }]);
  };

  const updateGrowth = (index: number, side: 'a' | 'b', year: string) => {
    setGrowthComparisons(prev => prev.map((comp, compIndex) => (
      compIndex === index ? { ...comp, [side]: year } : comp
    )));
  };

  const removeGrowthComparison = (index: number) => {
    setGrowthComparisons(prev => (prev.length <= 1 ? prev : prev.filter((_, compIndex) => compIndex !== index)));
  };

  return (
    <div className="content-scrollbar" style={stripStyle}>
      <div style={filterRowStyle}>
        <FilterBlock
          title={`Years ${activeYears.length}/${Math.min(availableYears.length, 4) || 1}`}
          tone="primary"
          size="years"
          action={<AddYearButton onClick={addCompareYearSlot} disabled={!canAddYear} />}
        >
          <div style={yearStackStyle}>
            <SelectField label="Base" value={baseYear} onChange={handleBaseYearChange} options={yearOptions} />
            {compareYear !== 'none' && (
              <YearSlotField label="Compare 1" value={compareYear} onChange={handleCompareYearChange} options={compareOptions} onRemove={removeCompareYear} />
            )}
            {compareYear2 !== 'none' && (
              <YearSlotField label="Compare 2" value={compareYear2} onChange={handleCompareYear2Change} options={compare2Options} onRemove={removeCompareYear2} />
            )}
            {compareYear3 !== 'none' && (
              <YearSlotField label="Compare 3" value={compareYear3} onChange={handleCompareYear3Change} options={compare3Options} onRemove={removeCompareYear3} />
            )}
            {selectedCompareYears.length === 0 && <span style={yearHintStyle}>Add a year to compare or show another year column.</span>}
          </div>
        </FilterBlock>

        {activeYears.length > 1 && (
          <FilterBlock
            title={`Growth ${growthComparisons.length}/${maxGrowthComparisons}`}
            size="growth"
            action={<AddGrowthButton onClick={addGrowthComparison} disabled={!canAddGrowth} />}
          >
            <div style={growthStackStyle}>
              {growthComparisons.map((comparison, index) => (
                <div key={`${comparison.a}_${comparison.b}_${index}`} style={growthSlotStyle}>
                  <CustomSelect value={comparison.a} onChange={v => updateGrowth(index, 'a', v)} options={growthOptions} width="100%" />
                  <span style={vsStyle}>VS</span>
                  <CustomSelect value={comparison.b} onChange={v => updateGrowth(index, 'b', v)} options={growthOptions} width="100%" />
                  <button
                    type="button"
                    onClick={() => removeGrowthComparison(index)}
                    disabled={growthComparisons.length <= 1}
                    title="Remove growth comparison"
                    aria-label="Remove growth comparison"
                    style={growthRemoveButtonStyle(growthComparisons.length <= 1)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </FilterBlock>
        )}
      </div>

      <div style={filterRowStyle}>
        <FilterBlock
          title={`Months ${selMonths.length}/${MONTHS.length}`}
          size="months"
          action={(
            <ActionButtons>
              <TextAction onClick={() => setSelMonths(MONTHS)} disabled={selMonths.length === MONTHS.length} tone="brand">Select all</TextAction>
              <TextAction onClick={() => setSelMonths([])} disabled={selMonths.length === 0} tone="danger">Clear</TextAction>
            </ActionButtons>
          )}
        >
          <InlineOptions>
            {MONTHS.map(month => (
              <ChoiceButton key={month} selected={selMonths.includes(month)} type="checkbox" onClick={() => toggleMonth(month)} compact>
                {month}
              </ChoiceButton>
            ))}
          </InlineOptions>
        </FilterBlock>

        <FilterBlock
          title={`Groups ${selectedGroupCount}/${ALL_GROUPS.length}`}
          size="groups"
          action={(
            <ActionButtons>
              <TextAction onClick={selectAllGroups} disabled={allGroupsSelected} tone="brand">Select all</TextAction>
              <TextAction onClick={clearGroups} disabled={selectedGroupCount === 0} tone="danger">Clear</TextAction>
            </ActionButtons>
          )}
        >
          <InlineOptions>
            {ALL_GROUPS.map(group => (
              <ChoiceButton key={group.id} selected={selGroups.includes(group.id)} type="checkbox" onClick={() => toggleGroup(group.id)} swatch={group.color}>
                {group.label}
              </ChoiceButton>
            ))}
          </InlineOptions>
        </FilterBlock>

        <FilterBlock
          title={`Customers ${selectedCustomerCount}/${groupCustomers.length}`}
          size="customers"
          action={(
            <ActionButtons>
              <TextAction onClick={selectAllCustomers} disabled={groupCustomers.length === 0 || allCustomersSelected} tone="brand">Select all</TextAction>
              <TextAction onClick={clearCustomers} disabled={noCustomersSelected} tone="danger">Clear</TextAction>
            </ActionButtons>
          )}
        >
          <InlineOptions clipped>
            {groupCustomers.length === 0 ? (
              <span style={emptyTextStyle}>Select a group first</span>
            ) : groupCustomers.map(customerId => {
              const selected = selCustomers.length === 0 || selCustomers.includes(customerId);
              return (
                <ChoiceButton key={customerId} selected={selected} type="checkbox" onClick={() => toggleCustomer(customerId)} swatch={groupColorByCustomer(customerId)} compact>
                  {customerId}
                </ChoiceButton>
              );
            })}
          </InlineOptions>
        </FilterBlock>
      </div>
    </div>
  );
}

function FilterBlock({ title, action, tone = 'default', size, children }: { title: string; action?: React.ReactNode; tone?: 'default' | 'primary'; size: 'years' | 'growth' | 'months' | 'groups' | 'customers'; children: React.ReactNode }) {
  return (
    <section style={{ ...blockStyle, ...blockSizeStyle[size], ...(tone === 'primary' ? primaryBlockStyle : null) }}>
      <div style={blockHeaderStyle}>
        <div style={blockTitleStyle}>{title}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label style={selectFieldStyle}>
      <span style={selectLabelStyle}>{label}</span>
      <CustomSelect value={value} onChange={onChange} options={options} width="100%" />
    </label>
  );
}

function YearSlotField({ label, value, onChange, options, onRemove }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; onRemove: () => void }) {
  return (
    <div style={yearSlotStyle}>
      <SelectField label={label} value={value} onChange={onChange} options={options} />
      <button type="button" onClick={onRemove} title={`Remove ${label}`} aria-label={`Remove ${label}`} style={yearRemoveButtonStyle}>
        <X size={13} />
      </button>
    </div>
  );
}

function AddYearButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title="Add year column" style={addYearButtonStyle(disabled)}>
      <Plus size={12} /> Add year
    </button>
  );
}

function AddGrowthButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title="Add growth comparison" style={addYearButtonStyle(disabled)}>
      <Plus size={12} /> Growth
    </button>
  );
}

function InlineOptions({ children, clipped = false }: { children: React.ReactNode; clipped?: boolean }) {
  return <div className={clipped ? 'content-scrollbar' : undefined} style={{ ...inlineOptionsStyle, ...(clipped ? clippedOptionsStyle : null) }}>{children}</div>;
}

function ActionButtons({ children }: { children: React.ReactNode }) {
  return <div style={actionRowStyle}>{children}</div>;
}

function TextAction({ children, disabled, tone, onClick }: { children: React.ReactNode; disabled: boolean; tone: 'brand' | 'danger'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={textActionStyle(disabled, tone)}>
      {children}
    </button>
  );
}

function ChoiceButton({ selected, type, children, onClick, swatch, compact = false }: { selected: boolean; type: 'radio' | 'checkbox'; children: React.ReactNode; onClick: () => void; swatch?: string; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={choiceStyle(selected, compact)}>
      <span style={markStyle(selected, type)}>{selected && type === 'checkbox' && <Check size={9} strokeWidth={3} />}</span>
      {swatch && <span style={{ width: 7, height: 7, borderRadius: 2, background: swatch, opacity: selected ? 0.82 : 0.34, flexShrink: 0 }} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </button>
  );
}

const stripStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  overflowX: 'visible',
  overflowY: 'visible',
  paddingBottom: 0,
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: 8,
  flexWrap: 'wrap',
  borderBottom: '1px solid color-mix(in srgb, var(--color-border-light) 70%, transparent)',
  paddingBottom: 7,
};

const blockSizeStyle: Record<'years' | 'growth' | 'months' | 'groups' | 'customers', React.CSSProperties> = {
  years: { flex: '2 1 620px', minWidth: 460, maxWidth: 820 },
  growth: { flex: '1 1 330px', minWidth: 300, maxWidth: 520 },
  months: { flex: '1 1 360px', minWidth: 340, maxWidth: 460 },
  groups: { flex: '1 1 390px', minWidth: 360, maxWidth: 520 },
  customers: { flex: '2 1 500px', minWidth: 390, maxWidth: '100%' },
};

const blockStyle: React.CSSProperties = {
  border: '1px solid transparent',
  borderRadius: 0,
  background: 'transparent',
  padding: '3px 8px 6px',
};

const primaryBlockStyle: React.CSSProperties = {
  background: 'transparent',
  borderColor: 'transparent',
};

const blockHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 5,
  minHeight: 16,
};

const blockTitleStyle: React.CSSProperties = {
  color: 'var(--color-text-quaternary)',
  fontSize: '0.61rem',
  fontWeight: 760,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};

const yearStackStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
  alignItems: 'end',
  gap: 8,
};


const yearSlotStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 26px',
  alignItems: 'end',
  gap: 6,
  minWidth: 0,
};

const yearRemoveButtonStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--color-border-light)',
  borderRadius: 6,
  background: 'var(--color-surface-0)',
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
};

const addYearButtonStyle = (disabled: boolean): React.CSSProperties => ({
  height: 24,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  border: '1px solid var(--color-border-light)',
  borderRadius: 6,
  background: disabled ? 'transparent' : 'color-mix(in srgb, var(--color-brand-500) 7%, var(--color-surface-0))',
  color: disabled ? 'var(--color-text-quaternary)' : 'color-mix(in srgb, var(--color-brand-600) 80%, var(--color-text-primary))',
  padding: '0 8px',
  fontSize: '0.66rem',
  fontWeight: 850,
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});

const yearHintStyle: React.CSSProperties = {
  alignSelf: 'center',
  color: 'var(--color-text-tertiary)',
  fontSize: '0.68rem',
  fontWeight: 760,
  whiteSpace: 'nowrap',
};
const selectFieldStyle: React.CSSProperties = {
  display: 'flex',
  minWidth: 0,
  flexDirection: 'column',
  gap: 4,
};

const selectLabelStyle: React.CSSProperties = {
  color: 'var(--color-text-quaternary)',
  fontSize: '0.62rem',
  fontWeight: 850,
};

const inlineOptionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
};

const clippedOptionsStyle: React.CSSProperties = {
  maxHeight: 62,
  overflowY: 'auto',
  paddingRight: 2,
};

const growthStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const growthSlotStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(76px, 1fr) auto minmax(76px, 1fr) 26px',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
};

const growthRemoveButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: 26,
  height: 26,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--color-border-light)',
  borderRadius: 6,
  background: disabled ? 'transparent' : 'var(--color-surface-0)',
  color: disabled ? 'var(--color-text-quaternary)' : 'var(--color-text-tertiary)',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const vsStyle: React.CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: '0.66rem',
  fontWeight: 950,
  lineHeight: 1,
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  flexShrink: 0,
};

const textActionStyle = (disabled: boolean, tone: 'brand' | 'danger'): React.CSSProperties => ({
  border: 0,
  background: 'transparent',
  color: disabled ? 'var(--color-text-quaternary)' : tone === 'danger' ? 'color-mix(in srgb, var(--color-danger-500) 76%, var(--color-text-secondary))' : 'color-mix(in srgb, var(--color-brand-600) 72%, var(--color-text-secondary))',
  fontSize: '0.64rem',
  fontWeight: 760,
  cursor: disabled ? 'not-allowed' : 'pointer',
  padding: 0,
  whiteSpace: 'nowrap',
});

const choiceStyle = (selected: boolean, compact: boolean): React.CSSProperties => ({
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: compact ? 24 : 26,
  maxWidth: 132,
  padding: compact ? '4px 7px' : '4px 8px',
  borderRadius: 5,
  border: `1px solid ${selected ? 'color-mix(in srgb, var(--color-brand-500) 32%, var(--color-border-light))' : 'var(--color-border-light)'}`,
  background: selected ? 'color-mix(in srgb, var(--color-brand-500) 5%, var(--color-surface-0))' : 'color-mix(in srgb, var(--color-surface-0) 82%, transparent)',
  color: selected ? 'color-mix(in srgb, var(--color-brand-600) 78%, var(--color-text-primary))' : 'var(--color-text-secondary)',
  fontSize: compact ? '0.68rem' : '0.71rem',
  fontWeight: selected ? 850 : 760,
  cursor: 'pointer',
});

const markStyle = (selected: boolean, type: 'radio' | 'checkbox'): React.CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: type === 'radio' ? '50%' : 2,
  border: `1.4px solid ${selected ? 'color-mix(in srgb, var(--color-brand-600) 70%, var(--color-border-light))' : 'var(--color-text-quaternary)'}`,
  background: selected ? (type === 'radio' ? 'radial-gradient(circle at center, color-mix(in srgb, var(--color-brand-600) 72%, var(--color-text-secondary)) 0 42%, transparent 46%)' : 'color-mix(in srgb, var(--color-brand-600) 72%, var(--color-text-secondary))') : 'transparent',
  color: 'var(--color-surface-0)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const emptyTextStyle: React.CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: '0.7rem',
  fontWeight: 800,
  padding: '4px 0',
};