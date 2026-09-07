import { useState, useEffect, useRef } from 'react';
import Topbar from '../../layout/Topbar';
import { ErpSegmentedControl, ErpIconButton } from '../../ui/ErpButtons';
import { RefreshCw, Settings2, ChevronDown } from 'lucide-react';
import CustomSelect from '../../ui/CustomSelect';
import { useToast } from '../../../contexts/ToastContext';
import { fetchWithAuth } from '../../../utils/fetchWithAuth';
import { ProductionForecastChart } from './ProductionForecastChart';
import { ProductionForecastTable } from './ProductionForecastTable';
import { getYearOptions, MONTH_FULL } from '../../../config/productionSummaryConfig';

const GROUPS = [
  { value: 'All Customer', label: 'All Customer' },
  { value: 'N008', label: 'N008 Group' },
  { value: 'N098', label: 'N098 Group' },
  { value: 'N051', label: 'N051 Group' },
  { value: 'N092', label: 'N092 Group' },
  { value: 'N089', label: 'N089 Group' },
  { value: 'U414', label: 'U414 Group' },
  { value: 'General', label: 'General' },
];

function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((now.getDay() + 1 + days) / 7);
}

export function ProductionForecastDashboard() {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [group, setGroup] = useState('All Customer');
  
  // Date states
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [fromWeek, setFromWeek] = useState(() => Math.max(1, getCurrentWeek() - 11));
  const [toWeek, setToWeek] = useState(() => getCurrentWeek());
  
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  
  const years = getYearOptions();
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  // Handle clicks outside popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let startStr = fromDate;
      let endStr = toDate;

      if (viewMode === 'day') {
        const tStart = new Date(fromDate).getTime();
        const tEnd = new Date(toDate).getTime();
        if (tEnd < tStart) {
          showToast('To Date cannot be before From Date', 'error');
          setLoading(false);
          return;
        }
        if ((tEnd - tStart) / (1000 * 3600 * 24) > 31) {
          showToast('Day view is limited to a maximum of 31 days', 'error');
          setLoading(false);
          return;
        }
      } else if (viewMode === 'year') {
        startStr = `${Math.min(...years)}-01-01`;
        endStr = `${Math.max(...years)}-12-31`;
      } else if (viewMode === 'month') {
        const lastDay = new Date(year, month, 0).getDate();
        startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      } else if (viewMode === 'week') {
        startStr = `${year}-01-01`;
        endStr = `${year}-12-31`;
      }

      const res = await fetchWithAuth(`/api/production-forecast?startDate=${startStr}&endDate=${endStr}&group=${encodeURIComponent(group)}&viewMode=${viewMode}`);
      const json = await res.json();
      
      if (json.ok) {
        let finalData = json.data;
        // Filter weeks on frontend if needed
        if (viewMode === 'week') {
          finalData = finalData.filter((d: any) => {
            const wkMatch = d.periodLabel.match(/-W(\d+)/);
            if (wkMatch) {
              const wk = parseInt(wkMatch[1], 10);
              return wk >= fromWeek && wk <= toWeek;
            }
            return true;
          });
        }
        if (viewMode === 'day') {
          finalData = finalData.map((d: any) => {
            const parts = d.periodLabel.split('-');
            if (parts.length === 3) {
              return { ...d, periodLabel: `${parts[2]}/${parts[1]}` };
            }
            return d;
          });
        }
        
        setData(finalData);
      } else {
        showToast(json.error || 'Failed to fetch', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, group, fromDate, toDate, year, month, fromWeek, toWeek]);

  const getFilterSummaryText = () => {
    if (viewMode === 'year') return 'All Years';
    if (viewMode === 'month') return `${MONTH_FULL[month - 1]} ${year}`;
    if (viewMode === 'week') return `W${fromWeek} - W${toWeek} ${year}`;
    
    // Format YYYY-MM-DD to DD/MM/YYYY
    const formatStr = (ymd: string) => {
      const parts = ymd.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return ymd;
    };
    return `${formatStr(fromDate)} to ${formatStr(toDate)}`;
  };

  return (
    <div className="erp-page-layout">
      <Topbar 
        breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'Production Forecast' }]}
        hideSearch
        contentLayout="workspace"
        rightContent={
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', alignItems: 'center' }}>
            <div style={{ minWidth: 160 }}>
              <CustomSelect
                options={GROUPS}
                value={group}
                onChange={(val) => setGroup(val as string)}
              />
            </div>
            
            <div className="relative" ref={filterPopoverRef}>
              <button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                  background: showFilterPopover ? 'var(--color-surface-2)' : 'transparent',
                  border: '1px solid',
                  borderColor: showFilterPopover ? 'var(--color-border-strong)' : 'var(--color-border-light)',
                  borderRadius: 6, height: '36px',
                  fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-primary)',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
                  transition: 'all 0.15s'
                }}
                className="hover:bg-[var(--color-surface-1)] hover:border-[var(--color-border-strong)]"
              >
                <Settings2 size={14} style={{ color: 'var(--color-brand-500)' }} />
                <>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.76rem", fontWeight: 700 }}>
                    Filters:
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{getFilterSummaryText()}</span>
                </>
                <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
              </button>

              {showFilterPopover && (
                <div className="absolute right-0 z-[110] mt-2 bg-[var(--color-surface-0)] border border-[var(--color-border-strong)] rounded-lg shadow-lg p-4" style={{ width: 320 }}>
                  <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2.5 mb-3">
                    <span className="text-xs font-black capitalize tracking-wider text-[var(--color-text-primary)]">
                      Date Filters
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {viewMode !== 'day' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Year</label>
                        <CustomSelect
                          value={String(year)}
                          onChange={(v) => setYear(Number(v))}
                          options={years.map(y => ({ value: String(y), label: String(y) }))}
                        />
                      </div>
                    )}

                    {viewMode === 'week' && (
                      <div className="flex gap-2">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>From Wk</label>
                          <CustomSelect
                            value={String(fromWeek)}
                            onChange={(v) => setFromWeek(Number(v))}
                            options={weeks.map(w => ({ value: String(w), label: `W${w}` }))}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>To Wk</label>
                          <CustomSelect
                            value={String(toWeek)}
                            onChange={(v) => setToWeek(Number(v))}
                            options={weeks.map(w => ({ value: String(w), label: `W${w}` }))}
                          />
                        </div>
                      </div>
                    )}

                    {viewMode === 'month' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Month</label>
                        <CustomSelect
                          value={String(month)}
                          onChange={(v) => setMonth(Number(v))}
                          options={MONTH_FULL.map((m, i) => ({ value: String(i + 1), label: m }))}
                        />
                      </div>
                    )}

                    {viewMode === 'day' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>From Date</label>
                          <input 
                            type="date" 
                            value={fromDate} 
                            onChange={e => setFromDate(e.target.value)}
                            className="erp-input"
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border-light)' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>To Date</label>
                          <input 
                            type="date" 
                            value={toDate} 
                            onChange={e => setToDate(e.target.value)}
                            className="erp-input"
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border-light)' }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ borderLeft: '1px solid var(--color-border-light)', paddingLeft: '8px', marginLeft: '4px' }}>
              <ErpSegmentedControl
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                  { value: 'year', label: 'Year' },
                ]}
                value={viewMode}
                onChange={(val) => setViewMode(val as any)}
              />
            </div>
            
            <ErpIconButton
              icon={<RefreshCw size={18} className={loading ? 'animate-spin' : ''} />}
              label="Refresh"
              variant="outline"
              onClick={fetchData}
              disabled={loading}
            />
          </div>
        }
      />
      
      <div className="erp-page-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
        
        {/* Chart */}
        <div style={{ background: 'var(--color-ui-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border-light)', height: '400px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
            Production Forecast ({group})
          </h3>
          <div style={{ height: 'calc(100% - 40px)' }}>
            <ProductionForecastChart data={data} />
          </div>
        </div>

        {/* Table */}
        <div style={{ paddingBottom: '24px' }}>
          <ProductionForecastTable data={data} viewMode={viewMode} />
        </div>

      </div>
    </div>
  );
}
