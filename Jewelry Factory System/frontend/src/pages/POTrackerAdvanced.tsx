import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import OrderTable from '../components/dashboard/poTracker/OrderTable';
import CustomViewModal from '../components/dashboard/poTracker/CustomViewModal';
import CustomSelect from '../components/ui/CustomSelect';
import { RefreshCw, AlertTriangle, Filter, X, Layers } from 'lucide-react';
import { usePOTrackerAdvanced } from '../hooks/usePOTrackerAdvanced';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { useEffect } from 'react';

export default function POTrackerAdvanced() {
  const {
    statusFilter,
    setStatusFilter,
    groupFilter,
    setGroupFilter,
    dateType,
    setDateType,
    setPage,
    pageSize,
    setPageSize,
    filterType,
    setFilterType,
    filterWeek,
    setFilterWeek,
    filterCust,
    setFilterCust,
    filterPO,
    setFilterPO,
    filterShipTo,
    setFilterShipTo,
    showFiltersPopover,
    setShowFiltersPopover,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    visibleKeys,
    setVisibleKeys,
    loading,
    error,
    load,
    showCustomViewModal,
    setShowCustomViewModal,
    filtered,
    totalQty,
    totalAmount,
    pendingCount,
    delayedCount,
    uniqueTypes,
    totalPages,
    page,
    pageStart,
    paged,
    pageNumbers,
    activeFilterCount
  } = usePOTrackerAdvanced();

  const { setTopbarActions } = useTopbarActions();
  useEffect(() => {
    setTopbarActions(
      <button onClick={load} style={{ width:36, height:36, borderRadius:8, border:'none', background:'transparent', color:'var(--color-text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--color-surface-2)'; e.currentTarget.style.color='var(--color-brand-600)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--color-text-secondary)'; }}
        title="Refresh Data"
        aria-label="Refresh Data"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={loading ? 'animate-spin text-[var(--color-brand-600)]' : ''} />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, load, loading]);

  return (
    <div className="app-page font-body">
      <PageHeader breadcrumb={BREADCRUMBS.PO_TRACKER} contentLayout="dashboard-wide" />

      <div className="app-content-frame app-content-frame--dashboard-wide app-page-content po-tracker-page" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* ─── FILTERS: compact toolbar + popover + active chips ─── */}
          <div className="po-toolbar app-panel no-print" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
            background: 'var(--color-surface-0)',
            padding: '14px 20px', marginBottom: '24px',
          }}>
            {/* Left: Group + Status pill toggles */}
            <div className="po-toolbar__modes" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {/* Group Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Group</span>
                <div className="po-segmented" style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                  {['N008', 'N044', 'N098', 'N051', 'N083', 'MLT', 'ALL'].map(grp => (
                    <button
                      key={grp}
                      onClick={() => setGroupFilter(grp)}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, border: 'none',
                        background: groupFilter === grp ? 'var(--color-surface-0)' : 'transparent',
                        color: groupFilter === grp ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        boxShadow: groupFilter === grp ? '0 2px 8px color-mix(in srgb, var(--color-surface-900) 6%, transparent), 0 0 0 1px var(--color-border-light)' : 'none',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >{grp === 'ALL' ? 'General' : grp}</button>
                  ))}
                </div>
              </div>

              {/* Status Toggle — SP ทั้ง 5 dateType รับ @Status แล้ว */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Status</span>
                <div className="po-segmented" style={{ display: 'flex', background: 'var(--color-surface-1)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                  {['pending', 'finish', 'all'].map(st => {
                    const isActive = statusFilter === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st as 'pending' | 'finish' | 'all')}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, border: 'none', textTransform: 'capitalize',
                          background: isActive ? 'var(--color-surface-0)' : 'transparent',
                          color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          boxShadow: isActive ? '0 2px 8px color-mix(in srgb, var(--color-surface-900) 6%, transparent), 0 0 0 1px var(--color-border-light)' : 'none',
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >{st}</button>
                    );
                  })}
                </div>
              </div>

              {/* Reset button at end of chip row */}
              {(groupFilter !== 'ALL' || statusFilter !== 'pending' || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setGroupFilter('ALL');
                    setStatusFilter('pending');
                    setFilterWeek('');
                    setFilterCust('');
                    setFilterPO('');
                    setFilterType('');
                    setFilterShipTo('');
                    setDateType('Order Date');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border-light)',
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  className="hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="po-toolbar__actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowCustomViewModal(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px',
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-strong)', color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                className="hover:bg-[var(--color-surface-1)]"
              >
                <Layers size={14} />
                Custom View
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFiltersPopover(!showFiltersPopover); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px',
                    background: showFiltersPopover ? 'var(--color-surface-2)' : 'var(--color-surface-0)', border: '1px solid var(--color-border-strong)',
                    color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  className="hover:bg-[var(--color-surface-1)]"
                >
                  <Filter size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span style={{ background: 'var(--color-brand-500)', color: 'var(--color-ui-on-interactive)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem' }}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {showFiltersPopover && (
                  <>
                    <div
                      onClick={() => setShowFiltersPopover(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'transparent' }}
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="po-filter-popover"
                      style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 101,
                        background: 'var(--color-ui-surface)', borderRadius: '8px',
                        boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--color-border-light)',
                        padding: '20px', width: '640px', maxWidth: '92vw',
                        display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Week</label>
                        <input type="text" value={filterWeek} onChange={e => setFilterWeek(e.target.value)} placeholder="Filter Week..." style={{ width: '120px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Customer</label>
                        <input type="text" value={filterCust} onChange={e => setFilterCust(e.target.value)} placeholder="Filter Cust..." style={{ width: '120px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>PO / Order No</label>
                        <input type="text" value={filterPO} onChange={e => setFilterPO(e.target.value)} placeholder="Filter PO/Ord..." style={{ width: '150px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Order Type</label>
                        <CustomSelect
                          value={filterType}
                          onChange={setFilterType}
                          options={[
                            { value: '', label: 'All Types' },
                            ...uniqueTypes.map(t => ({ value: t, label: t }))
                          ]}
                          width="140px"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Ship To</label>
                        <input type="text" value={filterShipTo} onChange={e => setFilterShipTo(e.target.value)} placeholder="Filter ShipTo..." style={{ width: '150px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                      </div>

                      <div className="po-filter-date-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '300px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Date Range</label>
                        <div className="po-date-range" style={{ display: 'flex', alignItems: 'center', borderRadius: '8px', gap: '8px' }}>
                          <CustomSelect
                            value={dateType}
                            onChange={setDateType}
                            options={[
                              { value: 'Order Date', label: 'Order Date' },
                              { value: 'Factory Due Date', label: 'Factory Due Date' },
                              { value: 'Cust Due Date', label: 'Cust Due Date' },
                              { value: 'Finish Date', label: 'Finish Date' },
                              { value: 'All', label: 'All Dates' }
                            ]}
                            width="140px"
                          />
                          <div className="po-date-inputs" style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: '8px', flex: 1, border: '1px solid var(--color-border-strong)', borderRadius: '8px', background: 'var(--color-surface-0)' }}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                            <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.65rem', fontWeight: 800 }}>TO</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                          </div>
                        </div>
                      </div>

                      {activeFilterCount > 0 && (
                        <button
                          onClick={() => {
                            setFilterWeek(''); setFilterCust(''); setFilterPO(''); setFilterType(''); setFilterShipTo('');
                            setDateType('Order Date');
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '10px 16px', borderRadius: '10px',
                            background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border-strong)',
                            fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                          className="hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200"
                        >
                          <X size={16} />
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* Refresh button moved to the KPI header below */}
            </div>
          </div>

          {/* ─── SMART KPI TOOLBAR (WCAG 2.1 AA) ─── */}
          <div
            role="banner"
            aria-label="Tracker summary and data refresh"
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: '24px',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
              background: 'var(--color-surface-0)',
              boxShadow: 'var(--shadow-panel)'
            }}
          >
            {/* Left Side: Priority Metrics (ACTIVE, LATE, PENDING) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              {loading && filtered.length === 0 ? (
                <>
                  {[80, 60, 70, 90, 110].map((w, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="app-skeleton" style={{ width: w * 0.7, height: 10, borderRadius: 2 }} />
                      <div className="app-skeleton" style={{ width: w, height: 20, borderRadius: 4 }} />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { id: 'total', label: 'ACTIVE ORDERS', value: filtered.length.toLocaleString(), color: 'var(--color-brand-600)' },
                    { id: 'late', label: 'LATE', value: delayedCount.toLocaleString(), color: 'var(--color-danger-600)' },
                    { id: 'pending', label: 'PENDING', value: pendingCount.toLocaleString(), color: 'var(--color-warning-700)' },
                  ].map((stat) => (
                    <div key={stat.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>{stat.label}</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: stat.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{stat.value}</span>
                    </div>
                  ))}
                  
                  <div style={{ width: 1, height: 24, background: 'var(--color-border-strong)', margin: '0 8px' }} />

                  {/* Secondary Metrics (QTY, AMOUNT) */}
                  {[
                    { id: 'qty', label: 'TOTAL QTY', value: totalQty.toLocaleString(), color: 'var(--color-text-primary)' },
                    { id: 'amount', label: 'TOTAL AMOUNT', value: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'var(--color-text-primary)' },
                  ].map((stat) => (
                    <div key={stat.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-quaternary)', textTransform: 'capitalize' }}>{stat.label}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: stat.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{stat.value}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Right Side: Refresh Button integrated with summary context */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                 Last updated: Just now
               </span>
            </div>
          </div>

          {/* ─── DATA TABLE — outer box owns the leftover viewport space (invisible, no chrome);
               inner card shrinks to its actual content and only grows up to that budget when the
               table is long enough to need it, so a short result set doesn't leave an empty box ─── */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }} className="content-scrollbar">
            <div style={{ background: 'var(--color-surface-0)', borderRadius: '8px', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-panel)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {error && <div style={{ padding: '16px', background: 'var(--color-danger-50)', borderBottom: '1px solid var(--color-danger-500)', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} style={{ color: 'var(--color-danger-600)' }} /> <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-600)' }}>{error}</span></div>}

              <OrderTable
                data={paged}
                loading={loading}
                pageOffset={pageStart}
                visibleKeys={visibleKeys}
              />

              {/* Single Pagination Bar — record count, page size, and page nav together */}
              {!loading && filtered.length > 0 && (
                <div className="po-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', gap: '12px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                    Showing <strong style={{ color: 'var(--color-text-primary)' }}>{pageStart + 1}</strong>–<strong style={{ color: 'var(--color-text-primary)' }}>{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong style={{ color: 'var(--color-brand-600)' }}>{filtered.length.toLocaleString()}</strong>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid var(--color-border-light)', background: page === 1 ? 'transparent' : 'var(--color-surface-1)', color: page === 1 ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }} className="hover:bg-surface-2 active:scale-95">Prev</button>
                      {pageNumbers.map((p, i) => p === '...' ? <span key={i} style={{ color: 'var(--color-text-quaternary)', padding: '0 8px' }}>...</span> : (
                        <button key={i} onClick={() => setPage(p as number)} style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`, background: page === p ? 'var(--color-brand-500)' : 'transparent', color: page === p ? 'var(--color-ui-on-interactive)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 900, minWidth: '38px', transition: 'all 0.2s' }} className="hover:bg-surface-1 active:scale-95">{p}</button>
                      ))}
                      <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid var(--color-border-light)', background: page === totalPages ? 'transparent' : 'var(--color-surface-1)', color: page === totalPages ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }} className="hover:bg-surface-2 active:scale-95">Next</button>
                    </div>

                    <div style={{ width: '1px', height: '16px', background: 'var(--color-border-strong)' }} />

                    <select
                      value={String(pageSize)}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                      style={{
                        padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--color-border-strong)',
                        background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)',
                        fontSize: '0.75rem', fontWeight: 700, outline: 'none', cursor: 'pointer'
                      }}
                      className="hover:border-brand-400"
                    >
                      <option value="20">20 / page</option>
                      <option value="50">50 / page</option>
                      <option value="100">100 / page</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .animate-spin{animation:spin 1s linear infinite}
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <CustomViewModal
        isOpen={showCustomViewModal}
        onClose={() => setShowCustomViewModal(false)}
        initialVisibleKeys={visibleKeys}
        initialGroup={groupFilter}
        onApply={(grp, keys) => {
          setGroupFilter(grp);
          setVisibleKeys(keys);
        }}
      />
    </div>
  );
}
