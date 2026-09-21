import { useState, useEffect, useRef, useMemo } from 'react';
import PageHeader from '../../layout/PageHeader';
import { BREADCRUMBS } from '../../../config/breadcrumbs';
import { RefreshCw, FilterX } from 'lucide-react';
import CustomSelect from '../../ui/CustomSelect';
import { useToast } from '../../../contexts/ToastContext';
import { fetchWithAuth } from '../../../utils/fetchWithAuth';
import { ProductionForecastChart } from './ProductionForecastChart.tsx';
import { ProductionForecastTable } from './ProductionForecastTable.tsx';
import { ProductionForecastSkeleton } from './ProductionForecastSkeleton.tsx';
import { getYearOptions } from '../../../config/productionSummaryConfig';
import { useTopbarActions } from '../../../contexts/TopbarActionContext';
import PeriodSetupPanel from '../../period/PeriodSetupPanel';
import { usePeriodSetup } from '../../../hooks/usePeriodSetup';

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

export function ProductionForecastDashboard() {
  const [group, setGroup] = useState('All Customer');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const yearsStr = useMemo(() => getYearOptions().map(String), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultToDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);

  const periodSetup = usePeriodSetup({
    presets: ['ytd', 'custom', 'week', 'day'],
    allowWeekRange: true,
    compareSlots: 1,
    syncToUrl: false,
    availableYears: yearsStr,
    initialValues: {
      preset: 'day',
      dateFrom: todayStr,
      dateTo: defaultToDateStr,
      baseYear: String(new Date().getFullYear()),
    }
  });

  const committed = periodSetup.committed;

  const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Derive viewMode and date range from committed period
  let viewModeType: 'day' | 'week' | 'month' | 'year' = 'day';
  let apiViewMode: 'day' | 'week' | 'month' = 'day';
  let startStr = todayStr;
  let endStr = defaultToDateStr;
  const targetYear = Number(committed.baseYear || new Date().getFullYear());
  const targetMonth = committed.monthFrom || new Date().getMonth() + 1;
  const fromWk = committed.weekFrom || 1;
  const toWk = committed.weekTo || 52;

  if (committed.preset === 'day') {
    viewModeType = 'day';
    apiViewMode = 'day';
    startStr = committed.dateFrom || todayStr;
    endStr = committed.dateTo || defaultToDateStr;
  } else if (committed.preset === 'week') {
    viewModeType = 'week';
    apiViewMode = 'week';
    startStr = `${targetYear}-01-01`;
    endStr = `${targetYear}-12-31`;
  } else if (committed.preset === 'custom' || committed.preset === 'month') {
    // มุมมองเดือน: ดึงรายวันของเดือนนั้น (1 - 31 วัน)
    viewModeType = 'month';
    apiViewMode = 'day';
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    startStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    endStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else {
    // มุมมองปี: ดึงราย 12 เดือน (JAN - DEC)
    viewModeType = 'year';
    apiViewMode = 'month';
    startStr = `${targetYear}-01-01`;
    endStr = `${targetYear}-12-31`;
  }

  const isFiltered = group !== 'All Customer' || 
    committed.preset !== 'day' || 
    committed.dateFrom !== todayStr || 
    committed.dateTo !== defaultToDateStr ||
    committed.baseYear !== String(new Date().getFullYear());

  const handleResetFilters = () => {
    setGroup('All Customer');
    periodSetup.actions.reset();
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      if (apiViewMode === 'day') {
        const tStart = new Date(startStr).getTime();
        const tEnd = new Date(endStr).getTime();
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
      }

      const res = await fetchWithAuth(`/api/production-forecast?startDate=${startStr}&endDate=${endStr}&group=${encodeURIComponent(group)}&viewMode=${apiViewMode}`);
      const json = await res.json();
      
      if (json.ok) {
        const rawData: any[] = json.data || [];
        const rawMap = new Map<string, any>();
        rawData.forEach((d) => {
          rawMap.set(d.periodLabel, d);
        });

        const emptySlot = (periodLabel: string) => ({
          periodLabel,
          orderMap: { BBS: 0, 'BES+BCS': 0, 'BNS+BPS': 0, BTS: 0, BRS: 0, OTHER: 0 },
          doneMap: { BBS: 0, 'BES+BCS': 0, 'BNS+BPS': 0, BTS: 0, BRS: 0, OTHER: 0 },
          totalOrder: 0,
          totalDone: 0,
          totalRemain: 0
        });

        let finalData: any[] = [];

        if (viewModeType === 'year') {
          // มุมมองปี: แสดง 12 เดือนเต็ม (JAN - DEC) ของปีนั้น
          finalData = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const key = `${targetYear}-${String(m).padStart(2, '0')}`;
            const label = MONTH_NAMES[i];
            const existing = rawMap.get(key);
            if (existing) {
              return { ...existing, periodLabel: label };
            }
            return emptySlot(label);
          });
        } else if (viewModeType === 'month') {
          // มุมมองเดือน: แสดง 1-31 วันเต็มของเดือนนั้น ฟอร์แมต dd/MM/yyyy
          const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
          finalData = Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const key = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const label = `${String(d).padStart(2, '0')}/${String(targetMonth).padStart(2, '0')}/${targetYear}`;
            const existing = rawMap.get(key);
            if (existing) {
              return { ...existing, periodLabel: label };
            }
            return emptySlot(label);
          });
        } else if (viewModeType === 'day') {
          // มุมมองช่วงวัน: ฟอร์แมต dd/MM/yyyy
          const cur = new Date(startStr);
          const end = new Date(endStr);
          const daySlots: any[] = [];
          while (cur <= end) {
            const y = cur.getFullYear();
            const m = cur.getMonth() + 1;
            const d = cur.getDate();
            const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const label = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
            const existing = rawMap.get(key);
            if (existing) {
              daySlots.push({ ...existing, periodLabel: label });
            } else {
              daySlots.push(emptySlot(label));
            }
            cur.setDate(cur.getDate() + 1);
          }
          finalData = daySlots;
        } else if (viewModeType === 'week') {
          // มุมมองสัปดาห์: สัปดาห์ W_from ถึง W_to
          finalData = Array.from({ length: toWk - fromWk + 1 }, (_, i) => {
            const wk = fromWk + i;
            const wkStr = String(wk).padStart(2, '0');
            const label = `W${wkStr}`;
            const existing = rawData.find(d => d.periodLabel && d.periodLabel.includes(`-W${wkStr}`));
            if (existing) {
              return { ...existing, periodLabel: label };
            }
            return emptySlot(label);
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

  const fetchDataRef = useRef<() => void>(() => {});
  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, committed]);

  const { setTopbarActions } = useTopbarActions();
  useEffect(() => {
    setTopbarActions(
      <button onClick={() => void fetchDataRef.current()} style={{ width:36, height:36, borderRadius:8, border:'none', background:'transparent', color:'var(--color-text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--color-surface-2)'; e.currentTarget.style.color='var(--color-brand-600)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--color-text-secondary)'; }}
        title="Refresh Data"
        aria-label="Refresh Data"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={loading ? 'animate-spin text-[var(--color-brand-600)]' : ''} />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, loading]);

  return (
    <div className="erp-page-container flex flex-col h-full bg-[var(--color-ui-canvas)]">
      <div className="no-print">
        <PageHeader
          breadcrumb={BREADCRUMBS.PRODUCTION_FORECAST}
          contentLayout="workspace"
        />
      </div>

      <div className="app-content-frame app-content-frame--workspace app-page-content flex-1 overflow-hidden p-2.5 flex flex-col min-h-0">
        <div className="flex flex-col h-full gap-2 min-h-0">

          {/* Unified Filter Card Toolbar - Matches Production Summary Pattern */}
          <div className="no-print bg-[var(--color-surface-0)] border border-[var(--color-border-light)] rounded-lg p-2.5 flex flex-col gap-3 shadow-sm shrink-0">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <div style={{ width: 180 }}>
                  <CustomSelect
                    options={GROUPS}
                    value={group}
                    onChange={(val) => setGroup(val as string)}
                  />
                </div>
              </div>
              <div className="w-[1px] h-8 bg-[var(--color-border-light)] shrink-0 self-center" />
              <div className="flex-1 min-w-[300px] flex items-center gap-2">
                <PeriodSetupPanel 
                  periodSetup={periodSetup}
                  availableYears={yearsStr}
                />
                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    style={{
                      background: "none", border: "none", padding: "6px",
                      color: "var(--color-text-secondary)", cursor: "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 6, transition: "all 0.15s ease", flexShrink: 0,
                    }}
                    className="hover:bg-[var(--color-surface-2)] active:scale-95"
                    title="Reset filters"
                    aria-label="Reset filters"
                  >
                    <FilterX size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chart & Table */}
          {loading && data.length === 0 ? (
            <ProductionForecastSkeleton />
          ) : (
            <>
              {/* Chart */}
              <div className="bg-[var(--color-ui-surface)] p-4 rounded-md border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] shrink-0" style={{ height: 420 }}>
                <h3 className="text-base font-extrabold text-[var(--color-text-primary)] mb-2">
                  Production Forecast ({group})
                </h3>
                <div className="h-[calc(100%-32px)]">
                  <ProductionForecastChart data={data} />
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto print-table-box shrink-0">
                <ProductionForecastTable data={data} viewMode={viewModeType} />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
