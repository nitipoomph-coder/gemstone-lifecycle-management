import { useState, useEffect, useRef } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { ErpSegmentedControl, ErpIconButton } from '../components/ui/ErpButtons';
import { Printer, Settings2, RefreshCw, ChevronDown } from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import { ProductionSummaryChart } from '../components/dashboard/productionSummary/ProductionSummaryChart';
import { ProductionSummaryTable } from '../components/dashboard/productionSummary/ProductionSummaryTable';
import { ProductionDashboardSkeleton } from '../components/dashboard/productionSummary/ProductionDashboardSkeleton';
import { useToast } from '../contexts/ToastContext';
import { getMaxWeek, getHolidays } from '../services/productionSummaryAPI';
import { PRODUCTION_STEPS, PRODUCTION_MODES, MONTH_FULL, getYearOptions, PROD_CUSTOMER_GROUPS } from '../config/productionSummaryConfig';
import type { ProdCustomerGroup } from '../config/productionSummaryConfig';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import html2canvas from 'html2canvas';


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
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

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
          showToast("Date From cannot be greater than Date To", "error");
          setLoading(false);
          return;
        }

        const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        let finalToDate = toDate;

        if (diffDays > 30) {
          const maxD = new Date(d1);
          maxD.setDate(maxD.getDate() + 30);
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

  const handlePrint = async () => {
    if (!printRef.current) return;

    try {
      const helperCanvas = document.createElement('canvas');
      helperCanvas.width = 1;
      helperCanvas.height = 1;
      const helperCtx = helperCanvas.getContext('2d');

      const resolveColor = (colorStr: string): string => {
        if (!colorStr || !helperCtx || colorStr === 'none') return colorStr;
        helperCtx.fillStyle = 'transparent';
        helperCtx.fillStyle = colorStr;
        return helperCtx.fillStyle;
      };

      // 1) แคปภาพหน้าจอความละเอียดสูง (2x Retina / 300 DPI) เหมือน DrawToBitmap ในระบบเดิม
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.setProperty('background', 'var(--color-ui-surface)');

          // แปลงสี CSS Variables และ OKLCH ในองค์ประกอบ SVG ทั้งหมดให้เป็น HEX/RGB มาตรฐาน
          const origSvgElements = printRef.current?.querySelectorAll('svg, svg *') || [];
          const clonedSvgElements = clonedElement.querySelectorAll('svg, svg *');

          origSvgElements.forEach((origEl, i) => {
            const clonedEl = clonedSvgElements[i] as HTMLElement | SVGElement | undefined;
            if (!clonedEl) return;

            const computed = window.getComputedStyle(origEl);

            // 1.1 Fill (Bars, Circles, Legend icons)
            const fill = origEl.getAttribute('fill') || computed.fill;
            if (fill && fill !== 'none') {
              const resolvedFill = resolveColor(computed.fill || fill);
              if (resolvedFill) {
                clonedEl.setAttribute('fill', resolvedFill);
                clonedEl.style.fill = resolvedFill;
              }
            }

            // 1.2 Stroke (Lines, Dots, Grids, Axes)
            const stroke = origEl.getAttribute('stroke') || computed.stroke;
            if (stroke && stroke !== 'none') {
              const resolvedStroke = resolveColor(computed.stroke || stroke);
              if (resolvedStroke) {
                clonedEl.setAttribute('stroke', resolvedStroke);
                clonedEl.style.stroke = resolvedStroke;
              }
            }

            // 1.3 Text (Data Labels, Axis numbers, Legend text)
            if (origEl.tagName.toLowerCase() === 'text') {
              const textFill = resolveColor(computed.fill || computed.color);
              if (textFill) {
                clonedEl.setAttribute('fill', textFill);
                clonedEl.style.fill = textFill;
              }
              clonedEl.style.fontFamily = computed.fontFamily;
              clonedEl.style.fontSize = computed.fontSize;
              clonedEl.style.fontWeight = computed.fontWeight;
            }
          });

          // แปลงสีในตารางข้อมูลให้ตรงกับหน้าจอ 100%
          const origCells = printRef.current?.querySelectorAll('th, td, tr') || [];
          const clonedCells = clonedElement.querySelectorAll('th, td, tr');
          origCells.forEach((origEl, i) => {
            const clonedEl = clonedCells[i] as HTMLElement | undefined;
            if (!clonedEl) return;
            const computed = window.getComputedStyle(origEl);
            if (computed.backgroundColor && computed.backgroundColor !== 'transparent' && !computed.backgroundColor.includes('0, 0, 0, 0')) {
              clonedEl.style.backgroundColor = resolveColor(computed.backgroundColor);
            }
            if (computed.color) {
              clonedEl.style.color = resolveColor(computed.color);
            }
          });
        },
      });

      const imgData = canvas.toDataURL('image/png');

      // 2) ส่งภาพที่แคปได้ไปพิมพ์ลงกระดาษ A4 แนวนอน
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${chartTitle || 'Production Summary'}</title>
              <style>
                @page {
                  size: A4 landscape;
                  margin: 0.5cm;
                }
                * {
                  box-sizing: border-box;
                }
                body {
                  margin: 0;
                  padding: 0;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: flex-start;
                  background: white;
                }
                .print-img {
                  width: 100%;
                  height: auto;
                  max-height: 96vh;
                  object-fit: contain;
                  display: block;
                }
              </style>
            </head>
            <body>
              <img class="print-img" src="${imgData}" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        // Fallback using hidden iframe if popup is blocked
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${chartTitle || 'Production Summary'}</title>
                <style>
                  @page { size: A4 landscape; margin: 0.5cm; }
                  body { margin: 0; display: flex; justify-content: center; background: white; }
                  .print-img { width: 100%; height: auto; max-height: 96vh; object-fit: contain; }
                </style>
              </head>
              <body>
                <img class="print-img" src="${imgData}" onload="window.print();" />
              </body>
            </html>
          `);
          doc.close();
          iframe.contentWindow?.addEventListener('afterprint', () => {
            iframe.remove();
          });
        }
      }
    } catch (err) {
      console.error('Print snapshot error:', err);
      window.print(); // fallback
    }
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
        <PageHeader
          breadcrumb={breadcrumb}
          contentLayout="workspace"
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
                        <CustomSelect
                          value={step}
                          onChange={setStep}
                          options={PRODUCTION_STEPS.map(s => ({ value: s.code, label: `${s.nameEN} (${s.nameTH})` }))}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Mode</label>
                        <CustomSelect
                          value={mode}
                          onChange={setMode}
                          options={PRODUCTION_MODES.map(m => ({ value: m.key, label: m.label }))}
                        />
                      </div>

                      {tab !== 'day' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Year</label>
                          <CustomSelect
                            value={String(year)}
                            onChange={(v) => setYear(Number(v))}
                            options={years.map(y => ({ value: String(y), label: String(y) }))}
                          />
                        </div>
                      )}

                      {tab === 'week' && (
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
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>To Wk (Max 12)</label>
                            <CustomSelect
                              value={String(toWeek)}
                              onChange={(v) => setToWeek(Number(v))}
                              options={weeks.map(w => ({ value: String(w), label: `W${w}` }))}
                            />
                          </div>
                        </div>
                      )}

                      {tab === 'month' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Month</label>
                          <CustomSelect
                            value={String(month)}
                            onChange={(v) => setMonth(Number(v))}
                            options={MONTH_FULL.map((m, i) => ({ value: String(i + 1), label: m }))}
                          />
                        </div>
                      )}

                      {tab === 'day' && (() => {
                        // Calculate max allowed toDate (fromDate + 30 days = 31 total)
                        const maxToDateStr = (() => {
                          if (!fromDate) return '';
                          const d = new Date(fromDate);
                          d.setDate(d.getDate() + 30);
                          return toLocalYMD(d);
                        })();
                        return (
                          <div className="flex flex-col gap-3">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date From</label>
                              <input
                                type="date"
                                value={fromDate}
                                onChange={e => {
                                  const newFrom = e.target.value;
                                  setFromDate(newFrom);
                                  // If toDate is now more than 30 days away, cap it
                                  if (newFrom && toDate) {
                                    const diff = Math.ceil(Math.abs(new Date(toDate).getTime() - new Date(newFrom).getTime()) / (1000 * 60 * 60 * 24));
                                    if (diff > 30) {
                                      const maxD = new Date(newFrom);
                                      maxD.setDate(maxD.getDate() + 30);
                                      setToDate(toLocalYMD(maxD));
                                    }
                                  }
                                }}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date To (Max 31 days)</label>
                              <input
                                type="date"
                                value={toDate}
                                min={fromDate}
                                max={maxToDateStr}
                                onChange={e => {
                                  const newTo = e.target.value;
                                  // Enforce max 30-day diff
                                  if (fromDate && newTo) {
                                    const diff = Math.ceil(Math.abs(new Date(newTo).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24));
                                    if (diff > 30) {
                                      const maxD = new Date(fromDate);
                                      maxD.setDate(maxD.getDate() + 30);
                                      setToDate(toLocalYMD(maxD));
                                      return;
                                    }
                                  }
                                  setToDate(newTo);
                                }}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
                              />
                            </div>
                          </div>
                        );
                      })()}

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

          {loading ? (
            <ProductionDashboardSkeleton />
          ) : (
            <>
              {/* กล่องกราฟ (ปรับความสูงเป็น 500px) */}
              <div className="print-chart-box" style={{ height: '500px', width: '100%' }}>
                <ProductionSummaryChart data={data} title={chartTitle} showAvgLine={tab === 'year' || tab === 'week'} />
              </div>

              {/* กล่องตาราง (ใส่ class print-table-box) */}
              <div className="print-table-box shrink-0">
                <ProductionSummaryTable data={data} tab={tab} />
              </div>
            </>
          )}

        </div>
      </div>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.5cm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: var(--color-ui-surface) !important;
          }
          .no-print,
          .sidebar,
          .app-sidebar,
          nav,
          header,
          button,
          .recharts-tooltip-wrapper,
          .recharts-default-tooltip {
            display: none !important;
          }
          .erp-page-container,
          .app-content-frame {
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            border: none !important;
            background: transparent !important;
          }
          .print-content {
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            page-break-inside: avoid;
          }
          .print-only {
            display: flex !important;
          }

          /* กล่องกราฟ: ปรับความสูงอัตโนมัติ ไม่ตัดขอบกราฟ */
          .print-chart-box {
            width: 100% !important;
            height: auto !important;
            display: block !important;
          }
          .print-chart-box > div {
            width: 100% !important;
            height: 100% !important;
          }

          /* ตาราง: กว้าง 100% พอดีเป๊ะ */
          .print-table-box {
            width: 100% !important;
          }
          .print-table-box table {
            width: 100% !important;
            font-size: 10pt !important;
          }
          .print-table-box th,
          .print-table-box td {
            padding: 4px 2px !important;
          }
        }
      `}</style>
    </div>
  );
}
