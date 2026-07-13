import React, { useState, useEffect } from 'react';
import { X, Search, Check, Layers, Filter } from 'lucide-react';
import { MASTER_COLS, COLUMN_GROUPS } from './OrderTable';

interface CustomViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVisibleKeys: string[];
  initialGroup: string;
  onApply: (group: string, keys: string[]) => void;
}

export default function CustomViewModal({ isOpen, onClose, initialVisibleKeys, initialGroup, onApply }: CustomViewModalProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'columns'>('columns');

  // Data State
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);

  // Columns State
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialVisibleKeys);
  const [searchCol, setSearchCol] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedGroup(initialGroup);
      setSelectedKeys(initialVisibleKeys);
      setSearchCol('');
      setActiveTab('columns');
    }
  }, [isOpen, initialGroup, initialVisibleKeys]);

  if (!isOpen) return null;

  const handleToggleKey = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleApply = () => {
    onApply(selectedGroup, selectedKeys);
    onClose();
  };

  const filteredGroups = COLUMN_GROUPS.map(g => ({
    ...g,
    keys: g.keys.filter(k => !searchCol || (MASTER_COLS[k]?.label || k).toLowerCase().includes(searchCol.toLowerCase()))
  })).filter(g => g.keys.length > 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div
        className="animate-fade-in-up"
        style={{
          background: 'var(--color-surface-0)',
          borderRadius: '20px',
          width: '100%', maxWidth: '800px',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.2)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--color-brand-100)', color: 'var(--color-brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Custom View Builder</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>Select data and columns to build your custom ERP report.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'var(--color-surface-1)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-tertiary)' }} className="hover:bg-surface-2 hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* Sidebar */}
          <div style={{ width: '220px', borderRight: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('data')}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
                background: activeTab === 'data' ? 'var(--color-surface-0)' : 'transparent',
                color: activeTab === 'data' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
                fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left',
                boxShadow: activeTab === 'data' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Filter size={18} />
              Data Filters
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: 'none',
                background: activeTab === 'columns' ? 'var(--color-surface-0)' : 'transparent',
                color: activeTab === 'columns' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
                fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left',
                boxShadow: activeTab === 'columns' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Layers size={18} />
              Columns
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }} className="custom-scrollbar">

            {activeTab === 'data' && (
              <div className="animate-fade-in-up">
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800 }}>Select Data Group</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {['N008', 'MLT', 'N083', 'N044', 'N051', 'ALL'].map(grp => (
                    <button
                      key={grp}
                      onClick={() => setSelectedGroup(grp)}
                      style={{
                        padding: '16px', borderRadius: '12px', border: `2px solid ${selectedGroup === grp ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                        background: selectedGroup === grp ? 'var(--color-brand-50)' : 'var(--color-surface-0)',
                        color: selectedGroup === grp ? 'var(--color-brand-700)' : 'var(--color-text-primary)',
                        fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.2s', position: 'relative'
                      }}
                    >
                      {grp === 'ALL' ? 'General' : grp}
                      {selectedGroup === grp && (
                        <div style={{ position: 'absolute', top: -8, right: -8, background: 'var(--color-brand-500)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-surface-1)', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  <strong>Tip:</strong> Selecting a specific group (like N008) will filter rows to only show that customer. Selecting <strong>ALL</strong> or <strong>CUSTOM</strong> shows all rows, letting you use other filters freely.
                </div>
              </div>
            )}

            {activeTab === 'columns' && (
              <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Choose Columns</h3>
                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-quaternary)' }} />
                    <input
                      placeholder="Search columns..."
                      value={searchCol}
                      onChange={e => setSearchCol(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px',
                        border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)',
                        fontSize: '0.85rem', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px' }} className="custom-scrollbar">
                  {filteredGroups.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>No columns found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {filteredGroups.map(g => {
                        const allSelected = g.keys.every(k => selectedKeys.includes(k));
                        return (
                          <div key={g.label}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '8px' }}>
                              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g.label}</h4>
                              <button
                                onClick={() => {
                                  if (allSelected) {
                                    setSelectedKeys(prev => prev.filter(k => !g.keys.includes(k)));
                                  } else {
                                    setSelectedKeys(prev => Array.from(new Set([...prev, ...g.keys])));
                                  }
                                }}
                                style={{ border: 'none', background: 'transparent', color: 'var(--color-brand-600)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                              >
                                {allSelected ? 'Unselect All' : 'Select All'}
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                              {g.keys.map(key => {
                                const isSelected = selectedKeys.includes(key);
                                return (
                                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', background: isSelected ? 'var(--color-brand-50)' : 'transparent', transition: 'all 0.2s' }} className="hover:bg-surface-1">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleKey(key)}
                                      style={{ accentColor: 'var(--color-brand-500)', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--color-brand-700)' : 'var(--color-text-primary)' }}>
                                      {MASTER_COLS[key]?.label || key}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-1)', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
            <strong style={{ color: 'var(--color-brand-600)' }}>{selectedKeys.length}</strong> columns selected
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'white', color: 'var(--color-text-secondary)', fontWeight: 800, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--color-brand-500)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-brand-500) 40%, transparent)' }}
              className="hover:bg-brand-600"
            >
              Apply View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
