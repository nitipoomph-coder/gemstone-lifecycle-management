import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, CheckCircle2, Clock, PackageSearch, Search, Settings2, Wrench } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import {
  aggregateDepartmentPending,
  applyFilters,
  buildItemGroupTrend,
  buildYearComparison,
  BUCKET_ORDER,
  BUCKET_STYLE,
  countBuckets,
  DEFAULT_FILTERS,
  ITEM_GROUPS,
  formatNumber,
  type DueDateSource,
  type Filters,
  type PeriodMode,
  type StatusBucket,
  type TrackableRecord,
  type ViewMode,
  useAvailableMonths,
  useSalesOrderAnalyticsData,
} from './salesOrderAnalyticsModel';

const STATUS_ICONS: Record<StatusBucket, React.ElementType> = {
  completed: CheckCircle2,
  wip: Settings2,
  overdue: Clock,
  rework: Wrench,
};

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'order', label: 'View By Order' },
  { id: 'item', label: 'View By Item' },
];

const CHART_MODE_OPTIONS: { id: PeriodMode; label: string }[] = [
  { id: 'year', label: 'Year Compare' },
  { id: 'month', label: 'Monthly Detail' },
];

const ITEM_GROUP_COLORS: Record<string, string> = {
  BBS: 'var(--color-brand-500)',
  BES: 'var(--color-proc-polishing)',
  BNS: 'var(--color-proc-plating)',
  BRS: 'var(--color-success-500)',
  Others: 'var(--color-warning-500)',
};

const DUE_OPTIONS: { id: DueDateSource; label: string }[] = [
  { id: 'factory', label: 'Factory Due' },
  { id: 'customer', label: 'Customer Due' },
];

export default function SalesOrderAnalytics() {
  const navigate = useNavigate();
  const { orders, items, loading, error } = useSalesOrderAnalyticsData();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [chartMode, setChartMode] = useState<PeriodMode>('year');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const sourceRows: TrackableRecord[] = filters.viewMode === 'order' ? orders : items;
  const { shipMonths } = useAvailableMonths(sourceRows);

  const filteredRows = useMemo(() => applyFilters(sourceRows, filters), [sourceRows, filters]);
  const bucketCounts = useMemo(() => countBuckets(filteredRows, filters.dueDateSource), [filteredRows, filters.dueDateSource]);
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    buildYearComparison(filteredRows).forEach((row) => years.add(String(row.year)));
    return Array.from(years).sort();
  }, [filteredRows]);
  const activeYears = selectedYears.length > 0 ? selectedYears.filter((year) => availableYears.includes(year)) : availableYears.slice(-2);
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    buildItemGroupTrend(filteredRows, 'month', 'order', filters.dueDateSource)
      .forEach((row) => {
        const period = String(row.period);
        if (activeYears.some((year) => period.startsWith(year))) months.add(period.slice(5, 7));
      });
    return Array.from(months).sort();
  }, [filteredRows, filters.dueDateSource, activeYears]);
  const yearComparison = useMemo(() => {
    if (chartMode === 'year') {
      return buildYearComparison(filteredRows).filter((row) => activeYears.includes(String(row.year)));
    }
    return buildItemGroupTrend(filteredRows, 'month', 'order', filters.dueDateSource)
      .filter((row) => {
        const period = String(row.period);
        return activeYears.some((year) => period.startsWith(year)) && (selectedMonth === 'all' || period.slice(5, 7) === selectedMonth);
      })
      .map((row) => ({ ...row, year: row.period }));
  }, [filteredRows, chartMode, activeYears, selectedMonth, filters.dueDateSource]);
  function toggleYear(year: string) {
    setSelectedYears((prev) => prev.includes(year) ? prev.filter((item) => item !== year) : [...prev, year].sort());
  }

  const departmentRows = useMemo(() => aggregateDepartmentPending(filteredRows), [filteredRows]);

  function openDetail(status: StatusBucket | 'all') {
    const params = new URLSearchParams({
      viewMode: filters.viewMode,
      dueDateSource: filters.dueDateSource,
      shipMonth: filters.shipMonth,
      status,
    });
    navigate(`/dashboard/sales-order-analytics/detail?${params.toString()}`);
  }

  if (loading) {
    return (
      <>
        <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'SALES ORDER ANALYTICS' }]} icon={<BarChart3 size={22} />} />
        <div className="flex-1 p-6 flex flex-col gap-6 w-full h-full" style={{ background: 'var(--color-surface-1)' }}>
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-2">
              <div className="animate-pulse rounded-lg" style={{ width: 320, height: 34, background: 'var(--color-surface-2)' }} />
              <div className="animate-pulse rounded-md" style={{ width: 260, height: 16, background: 'var(--color-surface-2)' }} />
            </div>
            <div className="animate-pulse rounded-2xl" style={{ width: 360, height: 48, background: 'var(--color-surface-2)' }} />
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {BUCKET_ORDER.map((bucket) => <div key={bucket} className="animate-pulse rounded-2xl" style={{ height: 150, background: 'var(--color-surface-2)' }} />)}
          </div>
          <div className="animate-pulse rounded-3xl" style={{ height: 420, background: 'var(--color-surface-2)' }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar breadcrumb={[{ label: 'JEWELRY FACTORY SYSTEM', path: '/' }, { label: 'SALES ORDER ANALYTICS' }]} icon={<BarChart3 size={22} />} />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="p-6 flex flex-col gap-6 w-full">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: 0, lineHeight: 1 }}>
                Sales Order <span style={{ color: 'var(--color-proc-polishing)' }}>Analytics</span>
              </h1>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'capitalize' }}>
                Order and item status overview for sales review
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl value={filters.viewMode} options={VIEW_OPTIONS} onChange={(value) => setFilters((prev) => ({ ...prev, viewMode: value }))} />
              <button onClick={() => openDetail('all')} className="hover:-translate-y-0.5 active:scale-95" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: 'none', background: 'var(--color-proc-polishing)', color: 'var(--color-text-inverse)', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px color-mix(in srgb, var(--color-proc-polishing) 28%, transparent)' }}>
                <Search size={15} /> View Detail Table
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-stretch">
            <FilterPanel label="Chart View">
              <SegmentedControl value={chartMode} options={CHART_MODE_OPTIONS} onChange={setChartMode} compact />
            </FilterPanel>
            <FilterPanel label="Compare Years">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {availableYears.map((year) => {
                  const active = activeYears.includes(year);
                  return (
                    <button key={year} onClick={() => toggleYear(year)} style={{ padding: '7px 12px', borderRadius: 10, border: `1.5px solid ${active ? 'var(--color-proc-polishing)' : 'var(--color-border-light)'}`, background: active ? 'color-mix(in srgb, var(--color-proc-polishing) 12%, transparent)' : 'var(--color-surface-1)', color: active ? 'var(--color-proc-polishing)' : 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}>
                      {year}
                    </button>
                  );
                })}
              </div>
            </FilterPanel>
            {chartMode === 'month' && (
              <FilterPanel label="Month">
                <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border-light)', borderRadius: 10, padding: '7px 12px', color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, outline: 'none' }}>
                  <option value="all">All Months</option>
                  {availableMonths.map((month) => <option key={month} value={month}>{month}</option>)}
                </select>
              </FilterPanel>
            )}
            <FilterPanel label="Due Date Source">
              <SegmentedControl value={filters.dueDateSource} options={DUE_OPTIONS} onChange={(value) => setFilters((prev) => ({ ...prev, dueDateSource: value }))} compact />
            </FilterPanel>
            <FilterPanel label="Ship Month Filter">
              <select value={filters.shipMonth} onChange={(event) => setFilters((prev) => ({ ...prev, shipMonth: event.target.value }))} style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border-light)', borderRadius: 10, padding: '7px 12px', color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, outline: 'none' }}>
                <option value="all">All Months</option>
                {shipMonths.map((month) => <option key={month} value={month}>{month}</option>)}
              </select>
            </FilterPanel>
            {error && <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: 16, border: '1px solid var(--color-danger-200)', background: 'var(--color-danger-50)', color: 'var(--color-danger-600)', fontSize: '0.8rem', fontWeight: 800 }}>{error}</div>}
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {BUCKET_ORDER.map((bucket, index) => (
              <StatusCard key={bucket} bucket={bucket} count={bucketCounts[bucket]} total={bucketCounts.total} delay={index} onClick={() => openDetail(bucket)} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Panel title={chartMode === 'year' ? "Yearly Qty Comparison by Item Type" : "Monthly Qty Comparison by Item Type"} subtitle={chartMode === 'year' ? "Compare selected years side by side by BBS, BES, BNS, BRS, Others" : "Compare selected years by month and item type"} icon={<BarChart3 size={18} />}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, marginBottom: 4 }}>
                {ITEM_GROUPS.map((group) => (
                  <div key={group} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: ITEM_GROUP_COLORS[group] }} />
                    {group}
                  </div>
                ))}
              </div>
              <div style={{ height: 420, padding: '20px 8px 8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearComparison} margin={{ top: 24, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border-light)" opacity={0.55} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 800 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fontSize: 11, fill: 'var(--color-text-quaternary)', fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} width={70} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-1)', opacity: 0.45 }} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem', fontWeight: 800 }} />
                    {ITEM_GROUPS.map((group) => (
                      <Bar key={group} dataKey={group} name={group} fill={ITEM_GROUP_COLORS[group]} radius={[4, 4, 0, 0]} maxBarSize={54} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Item Flow by Department" subtitle="Pending quantity by production stage" icon={<PackageSearch size={18} />}>
              <div style={{ height: 420, padding: '20px 8px 8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentRows} layout="vertical" margin={{ top: 8, right: 28, left: 18, bottom: 8 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-border-light)" opacity={0.55} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-quaternary)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="label" type="category" width={92} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-1)', opacity: 0.45 }} />
                    <Bar dataKey="pendingQty" name="Pending Qty" fill="var(--color-proc-polishing)" radius={[0, 8, 8, 0]} maxBarSize={34}>
                      <LabelList dataKey="pendingQty" position="right" formatter={(value: unknown) => Number(value) > 0 ? formatNumber(Number(value)) : ''} style={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 900 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

        </div>
      </div>
    </>
  );
}

function SegmentedControl<T extends string>({ value, options, onChange, compact = false }: { value: T; options: { id: T; label: string }[]; onChange: (value: T) => void; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', background: 'var(--color-surface-0)', padding: 4, borderRadius: 16, border: '1px solid var(--color-border-light)', boxShadow: '0 4px 16px -4px color-mix(in srgb, var(--color-surface-900) 10%, transparent)' }}>
      {options.map((option) => (
        <button key={option.id} onClick={() => onChange(option.id)} style={{ padding: compact ? '7px 12px' : '9px 18px', borderRadius: 12, border: 'none', fontSize: '0.76rem', fontWeight: 900, color: value === option.id ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)', background: value === option.id ? 'var(--color-proc-polishing)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FilterPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface-0)', borderRadius: 16, padding: '14px 18px', border: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'capitalize', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>{label}</div>
      {children}
    </div>
  );
}

function StatusCard({ bucket, count, total, delay, onClick }: { bucket: StatusBucket; count: number; total: number; delay: number; onClick: () => void }) {
  const style = BUCKET_STYLE[bucket];
  const Icon = STATUS_ICONS[bucket];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button onClick={onClick} className="hover:-translate-y-0.5 active:scale-95" style={{ textAlign: 'left', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderTop: `4px solid ${style.color}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 16px -4px color-mix(in srgb, var(--color-surface-900) 10%, transparent)', cursor: 'pointer', animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${delay * 0.05}s` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: style.color, fontSize: '0.75rem', fontWeight: 900, textTransform: 'capitalize' }}><Icon size={17} /> {style.label}</div>
        <span style={{ background: style.softBg, color: style.color, border: `1px solid ${style.border}`, padding: '3px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 900 }}>{pct}%</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-text-primary)', lineHeight: 1 }}>{formatNumber(count)}</div>
      <div style={{ marginTop: 7, color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 800 }}>of {formatNumber(total)} records</div>
    </button>
  );
}

function Panel({ title, subtitle, icon, children, right }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--color-surface-0)', borderRadius: 24, padding: 28, border: '1px solid var(--color-border-light)', boxShadow: '0 8px 32px -8px color-mix(in srgb, var(--color-surface-900) 12%, transparent)', animation: 'fadeInUp 0.4s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-primary)', textTransform: 'capitalize', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 10 }}>{icon}{title}</h2>
          <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>{subtitle}</p>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}


function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', boxShadow: '0 12px 30px color-mix(in srgb, var(--color-surface-900) 18%, transparent)', minWidth: 180 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {payload.map((entry) => (
          <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.72rem', fontWeight: 800 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>{entry.name}</span>
            <span style={{ color: entry.color }}>{formatNumber(Number(entry.value || 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
