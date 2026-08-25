import { DollarSign, Hash, BarChart3, Table2, Printer, RefreshCw } from 'lucide-react';
import { ErpSegmentedControl, ErpIconButton } from '../../ui/ErpButtons';
import type { Metric, ViewMode } from '../../../hooks/useOrderVolumeSummaryData';

interface VolumeFilterBarProps {
  metric: Metric;
  switchMetric: (m: Metric) => void;
  activeView: ViewMode;
  setActiveView: (v: ViewMode) => void;
  resetDrilldown: () => void;
  setDrilldownOrders: (orders: any[]) => void;
  loading: boolean;
  loadOverviewData: () => void;
  handlePrint: () => void;
}

export function VolumeFilterBar({
  metric,
  switchMetric,
  activeView,
  setActiveView,
  resetDrilldown,
  setDrilldownOrders,
  loading,
  loadOverviewData,
  handlePrint
}: VolumeFilterBarProps) {
  return (
    <header className="customer-trends-page-header no-print">
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>Order Trends</h1>
        <p>Sales & Order Volume Trends by Customer Group with line details</p>
      </div>
      <div className="customer-trends-page-header__actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <ErpSegmentedControl
          ariaLabel="Metric switch"
          value={metric}
          onChange={(v) => switchMetric(v as Metric)}
          options={[
            { value: 'amount', label: 'Sales ($)', icon: <DollarSign size={13} /> },
            { value: 'qty', label: 'Qty (PCS)', icon: <Hash size={13} /> },
          ]}
        />
        <div style={{ width: '1px', height: '20px', background: 'var(--color-border)' }} />
        <ErpSegmentedControl
          ariaLabel="Order Volume Summary view"
          value={activeView}
          onChange={(v) => {
            setActiveView(v as ViewMode);
            if (v === 'overview') {
              resetDrilldown();
              setDrilldownOrders([]);
            }
          }}
          options={[
            { value: 'overview', label: 'Overview', icon: <BarChart3 size={13} /> },
            { value: 'details', label: 'Order Details', icon: <Table2 size={13} /> },
          ]}
        />
        <div style={{ width: '1px', height: '20px', background: 'var(--color-border)' }} />
        <button
          type="button"
          disabled={loading}
          onClick={handlePrint}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 6,
            background: 'var(--color-surface-0)',
            border: '1px solid var(--color-border-light)',
            fontSize: 'var(--erp-text-control)',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Print current page or Save as PDF (Ctrl+P)"
        >
          <Printer size={13} style={{ color: 'var(--color-brand-600)' }} />
          <span>Print / PDF</span>
        </button>
        <ErpIconButton
          label="Reload data"
          tone="refresh"
          onClick={() => void loadOverviewData()}
          icon={<RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />}
          disabled={loading}
          size="sm"
        />
      </div>
    </header>
  );
}
