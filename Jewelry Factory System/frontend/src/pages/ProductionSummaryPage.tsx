import { useState, useEffect, useRef } from 'react';
import Topbar from '../components/layout/Topbar';
import { ErpSegmentedControl, ErpIconButton } from '../components/ui/ErpButtons';
import { Printer, Settings2, RefreshCw, ChevronDown } from 'lucide-react';
import { ProductionSummaryChart } from '../components/dashboard/productionSummary/ProductionSummaryChart';
import { ProductionSummaryTable } from '../components/dashboard/productionSummary/ProductionSummaryTable';
import { getMaxWeek, getHolidays } from '../services/productionSummaryAPI';
import { PRODUCTION_STEPS, PRODUCTION_MODES, MONTH_FULL, getYearOptions, PROD_CUSTOMER_GROUPS } from '../config/productionSummaryConfig';
import type { ProdCustomerGroup } from '../config/productionSummaryConfig';
import { fetchWithAuth } from '../utils/fetchWithAuth';

function parseDateLocal(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toLocalYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateStr(ymd: string) {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getWorkDaysInDateRange(minDateStr: string, maxDateStr: string, holidays: string[]): number {
  if (!minDateStr || !maxDateStr) return 0;
  let workDays = 0;
  const d = parseDateLocal(minDateStr);
  const end = parseDateLocal(maxDateStr);
  
  while (d <= end) {
    if (d.getDay() !== 0) {
      const dStr = toLocalYMD(d);
      if (!holidays.includes(dStr)) {
        workDays++;
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return workDays;
}

function getWorkDaysInMonth(year: number, month: number, holidays: string[]): number {
  let workDays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === 0) continue;
    
    const dStr = toLocalYMD(date);
    if (holidays.includes(dStr)) continue;
    workDays++;
  }
  return workDays;
}

function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((now.getDay() + 1 + days) / 7);
}

export default function ProductionSummaryPage() {
  const [tab, setTab] = useState<'year' | 'week' | 'month' | 'day'>('year');
  const [step, setStep] = useState('GR');
  const [mode, setMode] = useState('good'); // Default to 'good' instead of 'sen'
  const [year, setYear] = useState(new Date().getFullYear());
  const [fromWeek, setFromWeek] = useState(() => Math.max(1, getCurrentWeek() - 11));
  const [toWeek, setToWeek] = useState(() => getCurrentWeek());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [maxWeek, setMaxWeek] = useState(52);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartTitle, setChartTitle] = useState('');
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Auto-fetch data when filters change, but wait for init
  useEffect(() => {
    if (isReady) {
      handleShow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, step, mode, year, fromWeek, toWeek, month, fromDate, toDate, isReady]);

  useEffect(() => {
    async function initYear() {
      try {
        setIsReady(false);
        const [mw, hols] = await Promise.all([
          getMaxWeek(year),
          getHolidays(year)
        ]);
        setMaxWeek(mw || 52);
        
        const cleanHols = hols.map(h => {
          if (h.includes('T')) return h.split('T')[0];
          return h;
        });
        setHolidays(cleanHols);
        
        // If year changes, reset week range to make sense for that year
        if (year === new Date().getFullYear()) {
          const currentWk = getCurrentWeek();
          setFromWeek(Math.max(1, currentWk - 11));
          setToWeek(Math.min(mw || 52, currentWk));
        } else {
          const mwk = mw || 52;
          setFromWeek(Math.max(1, mwk - 11));
          setToWeek(mwk);
        }
      } catch (err) {
        console.error('Failed to init year data:', err);
      } finally {
        setIsReady(true);
      }
    }
    initYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShow = async () => {
    // Prevent fetching if dates are invalid
    if (tab === 'week') {
      if (toWeek < fromWeek) return;
      if (toWeek - fromWeek > 11) {
        // Enforce 12-week max
        setToWeek(fromWeek + 11);
        return; // will re-trigger effect
      }
    }

    setLoading(true);
    try {
      let rawData: any[] = [];
      let weekDatesMap: any = {};
      
      const stepName = PRODUCTION_STEPS.find((s: any) => s.code === step)?.nameEN || step;
      const modeName = PRODUCTION_MODES.find((m: any) => m.key === mode)?.label || mode;

      if (tab === 'year') {
        const res = await fetchWithAuth(`/api/production-summary/year?step=${step}&mode=${mode}&year=${year}`);
        const dataJson = await res.json();
        rawData = dataJson.data || [];
        
        const chartData = rawData.map(item => {
          const m = item.month;
          let total = 0;
          const groupData: Record<string, number> = {};
          
          PROD_CUSTOMER_GROUPS.forEach((g: ProdCustomerGroup) => {
            const val = item[g.id] || 0;
            groupData[g.id] = val;
            total += val;
          });
          
          const workDays = getWorkDaysInMonth(year, m, holidays);
          const avg = workDays > 0 ? total / workDays : 0;
          
          return {
            period: m,
            periodLabel: MONTH_FULL[m - 1].substring(0, 3).toUpperCase(),
            ...groupData,
            total, avg, workDays
          };
        });
        setData(chartData);
        setChartTitle(`${stepName} Yearly ${modeName} [ ${year} ]`);

      } else if (tab === 'week') {
        const res = await fetchWithAuth(`/api/production-summary/week?step=${step}&mode=${mode}&year=${year}&fromWeek=${fromWeek}&toWeek=${toWeek}`);
        const dataJson = await res.json();
        rawData = dataJson.data || [];
        weekDatesMap = dataJson.weekDates || {};

        const chartData = rawData.map(item => {
          const w = item.week;
          let total = 0;
          const groupData: Record<string, number> = {};
          
          PROD_CUSTOMER_GROUPS.forEach((g: ProdCustomerGroup) => {
            const val = item[g.id] || 0;
            groupData[g.id] = val;
            total += val;
          });
          
          let workDays = 0;
          if (weekDatesMap[w]) {
            workDays = getWorkDaysInDateRange(weekDatesMap[w].min, weekDatesMap[w].max, holidays);
          } else {
            workDays = 6;
          }
          
          const avg = workDays > 0 ? total / workDays : 0;
          
          return {
            period: w,
            periodLabel: `W${w}`,
            ...groupData,
            total, avg, workDays
          };
        });
        setData(chartData);
        setChartTitle(`${stepName} Weekly ${modeName} [ W${fromWeek} - W${toWeek} ${year} ]`);

      } else if (tab === 'month') {
        const res = await fetchWithAuth(`/api/production-summary/month?step=${step}&mode=${mode}&year=${year}&month=${month}`);
        const dataJson = await res.json();
        rawData = dataJson.data || [];
        
        const chartData = rawData.map(item => {
          const d = item.day;
          let total = 0;
          const groupData: Record<string, number> = {};
          
          PROD_CUSTOMER_GROUPS.forEach((g: ProdCustomerGroup) => {
            const val = item[g.id] || 0;
            groupData[g.id] = val;
            total += val;
          });
          
          const date = new Date(year, month - 1, d);
          const dStr = toLocalYMD(date);
          
          let workDays = 0;
          if (date.getDay() !== 0 && !holidays.includes(dStr)) {
            workDays = 1;
          }
          
          return {
            period: dStr,
            periodLabel: `${String(d).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
            ...groupData,
            total, workDays
          };
        });
        setData(chartData);
        setChartTitle(`${stepName} Monthly ${modeName} [ ${MONTH_FULL[month - 1]} ${year} ]`);

      } else if (tab === 'day') {
        const d1 = new Date(fromDate);
        const d2 = new Date(toDate);
        
        if (d1 > d2) {
          alert("Date From cannot be greater than Date To");
          setLoading(false);
          return;
        }

        const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)); 
        let finalToDate = toDate;
        
        if (diffDays > 31) {
          const maxD = new Date(d1);
          maxD.setDate(maxD.getDate() + 31);
          finalToDate = toLocalYMD(maxD);
          setToDate(finalToDate);
        }

        const res = await fetchWithAuth(`/api/production-summary/daily?step=${step}&mode=${mode}&startDate=${fromDate}&endDate=${finalToDate}`);
        const dataJson = await res.json();
        rawData = dataJson.data || [];
        
        const chartData = rawData.map(item => {
          let total = 0;
          const groupData: Record<string, number> = {};
          
          PROD_CUSTOMER_GROUPS.forEach((g: ProdCustomerGroup) => {
            const val = item[g.id] || 0;
            groupData[g.id] = val;
            total += val;
          });
          
          let workDays = 0;
          const dStr = item.dateStr;
          const dateObj = parseDateLocal(dStr);
          if (dateObj.getDay() !== 0 && !holidays.includes(dStr)) {
            workDays = 1;
          }
          
          // Format date for label: dd/mm
          const parts = dStr.split('-');
          const label = `${parts[2]}/${parts[1]}`;
          
          return {
            period: dStr,
            periodLabel: label,
            ...groupData,
            total, workDays
          };
        });
        setData(chartData);
        
        const fTitle = formatDateStr(fromDate);
        const tTitle = formatDateStr(finalToDate);
        setChartTitle(`${stepName} Daily ${modeName} [ ${fTitle} - ${tTitle} ]`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const years = getYearOptions();
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

  const getFilterSummaryText = () => {
    const sName = PRODUCTION_STEPS.find((s) => s.code === step)?.nameEN || step;
    const mName = PRODUCTION_MODES.find((m) => m.key === mode)?.label || mode;
    return `${sName} • ${mName} • ${tab === 'year' ? year : tab === 'month' ? MONTH_FULL[month - 1].substring(0, 3) + ' ' + year : tab === 'week' ? 'W' + fromWeek + '-W' + toWeek + ' ' + year : formatDateStr(fromDate) + ' - ' + formatDateStr(toDate)}`;
  };

  const breadcrumb = [
    { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
    { label: 'Production Dashboard' }
  ];

  return (
    <div className="erp-page-container print-layout-production flex flex-col h-full bg-[var(--color-ui-canvas)]">
      <div className="no-print">
        <Topbar
          breadcrumb={breadcrumb}
          contentLayout="workspace"
          hideSearch
          rightContent={
            <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center justify-end gap-3 pr-2">
              
              {/* Filter Popover moved to the main Topbar row */}
              <div style={{ position: 'relative' }} ref={filterPopoverRef}>
                <button
                  type="button"
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                    background: showFilterPopover ? 'var(--color-surface-2)' : 'transparent',
                    border: '1px solid',
                    borderColor: showFilterPopover ? 'var(--color-border-strong)' : 'var(--color-border-light)', 
                    borderRadius: 6,
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
                    <span>{getFilterSummaryText()}</span>
                  </>
                  <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                </button>

                {showFilterPopover && (
                  <div className="absolute right-0 z-[110] mt-2 bg-[var(--color-surface-0)] border border-[var(--color-border-strong)] rounded-lg shadow-lg p-4" style={{ width: 320 }}>
                    <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2.5 mb-3">
                      <span className="text-xs font-black capitalize tracking-wider text-[var(--color-text-primary)]">
                        Report Settings
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Department</label>
                        <select 
                          value={step} 
                          onChange={e => setStep(e.target.value)}
                          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                        >
                          {PRODUCTION_STEPS.map((s) => (
                            <option key={s.code} value={s.code}>{s.nameEN} ({s.nameTH})</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Mode</label>
                        <select 
                          value={mode} 
                          onChange={e => setMode(e.target.value)}
                          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                        >
                          {PRODUCTION_MODES.map((m) => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      {tab !== 'day' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Year</label>
                          <select 
                            value={year} 
                            onChange={e => setYear(Number(e.target.value))}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                          >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      )}

                      {tab === 'week' && (
                        <div className="flex gap-2">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>From Wk</label>
                            <select 
                              value={fromWeek} 
                              onChange={e => setFromWeek(Number(e.target.value))}
                              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                            >
                              {weeks.map(w => <option key={w} value={w}>W{w}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>To Wk (Max 12)</label>
                            <select 
                              value={toWeek} 
                              onChange={e => setToWeek(Number(e.target.value))}
                              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                            >
                              {weeks.map(w => <option key={w} value={w}>W{w}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      {tab === 'month' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Month</label>
                          <select 
                            value={month} 
                            onChange={e => setMonth(Number(e.target.value))}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                          >
                            {MONTH_FULL.map((m, i) => (
                              <option key={i+1} value={i+1}>{m}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {tab === 'day' && (
                        <div className="flex flex-col gap-3">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date From</label>
                            <input 
                              type="date"
                              value={fromDate}
                              max={toDate}
                              onChange={e => setFromDate(e.target.value)}
                              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date To (Max 31 days)</label>
                            <input 
                              type="date"
                              value={toDate}
                              min={fromDate}
                              onChange={e => setToDate(e.target.value)}
                              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 flex justify-end">
                        <button 
                          onClick={() => setShowFilterPopover(false)}
                          style={{
                            padding: '6px 16px', background: 'var(--color-ui-interactive)', color: 'var(--color-ui-on-interactive)',
                            border: 'none', borderRadius: '4px', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ width: '1px', height: '20px', background: 'var(--color-border-light)' }} />

              <ErpSegmentedControl
                ariaLabel="View Mode"
                value={tab}
                onChange={(v) => setTab(v as any)}
                options={[
                  { value: 'year', label: 'Yearly' },
                  { value: 'month', label: 'Monthly' },
                  { value: 'week', label: 'Weekly' },
                  { value: 'day', label: 'Daily' }
                ]}
              />

              <div style={{ width: '1px', height: '20px', background: 'var(--color-border-light)' }} />
              
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                  borderRadius: 6, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)',
                  fontSize: 'var(--erp-text-control)', fontWeight: 800, color: 'var(--color-text-primary)', cursor: 'pointer'
                }}
              >
                <Printer size={13} style={{ color: 'var(--color-brand-600)' }} />
                <span>Print</span>
              </button>
              
              <ErpIconButton
                label="Reload data"
                tone="refresh"
                onClick={() => void handleShow()}
                icon={<RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />}
                disabled={loading}
                size="sm"
              />
            </div>
          }
        />
      </div>

      <div className="app-content-frame app-content-frame--workspace app-page-content flex-1 overflow-hidden p-2.5 flex flex-col min-h-0">
        <div ref={printRef} className="print-content flex flex-col h-full gap-2 min-h-0">
          <div className="print-only" style={{ display: 'none', justifyContent: 'flex-end', fontSize: '10px' }}>
            Printed: {new Date().toLocaleString('en-GB')}
          </div>

          <div className="flex-1 min-h-0">
            {loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
                <RefreshCw className="animate-spin mr-2" size={20} /> Loading data...
              </div>
            ) : (
              <ProductionSummaryChart data={data} title={chartTitle} />
            )}
          </div>

          <div className="shrink-0">
            <ProductionSummaryTable data={data} tab={tab} />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-layout-production {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .print-content {
            page-break-inside: avoid;
          }
          .print-only {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
