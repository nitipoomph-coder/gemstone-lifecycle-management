import React, { useState, useCallback, useRef } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import {
  Search,
  RotateCcw,
  AlertCircle,
  ImageOff,
  RefreshCw
} from 'lucide-react';
import { getOrderTracking } from '../services/orderTrackingAPI';
import type { OrderTrackingResponse } from '../services/orderTrackingAPI';
import { OrderTrackStepper } from '../components/dashboard/orderTracking/OrderTrackStepper';
import { psPhotoUrl, attachPhotoFallback } from '../utils/photoUrl';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { FBEOrderTrackSkeleton } from '../components/dashboard/fbeOrderTrack/FBEOrderTrackSkeleton';

export default function FBEOrderTrackPage() {
  const [ordNo, setOrdNo] = useState('');
  const [ordLineNo, setOrdLineNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrderTrackingResponse | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const breadcrumb = BREADCRUMBS.FBE_ORDER_TRACK;

  const ordNoRef = useRef(ordNo);
  ordNoRef.current = ordNo;
  const ordLineNoRef = useRef(ordLineNo);
  ordLineNoRef.current = ordLineNo;

  // ฟังก์ชันSearchพร้อมเงื่อนไขNotificationsแบบแยกเคส
  const executeSearch = useCallback(async (targetOrd: string, targetLine: string) => {
    const cleanOrd = targetOrd.trim();
    const cleanLine = targetLine.trim();

    if (!cleanOrd && !cleanLine) {
      setError('Please enter Order No. (Order No.) and Line No. completely');
      return;
    }
    if (!cleanOrd) {
      setError('Please enter Order No. (Order No.)');
      return;
    }
    if (!cleanLine) {
      setError('Please specify Line No. of order');
      return;
    }

    setLoading(true);
    setError(null);
    setImgFailed(false);

    try {
      const res = await getOrderTracking(cleanOrd, cleanLine);
      setData(res);
    } catch (err: any) {
      setData(null);
      setError(err.message || 'Order data not found and Line specified in system');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(ordNo, ordLineNo);
  };

  const handleClear = () => {
    setOrdNo('');
    setOrdLineNo('');
    setData(null);
    setError(null);
    setImgFailed(false);
  };

  const info = data?.orderInfo;
  const summary = data?.summary;

  // กWaitงเฉพาะสเต็ปที่In Progress (WIP)
  const activeSteps = data?.steps.filter(s => s.status === 1 || s.balance > 0) || [];
  const activeStepNames = activeSteps.length > 0
    ? activeSteps.map(s => `${s.nameEN} (${s.nameTH})`).join(', ')
    : null;

  const { setTopbarActions } = useTopbarActions();
  const [isSpinning, setIsSpinning] = React.useState(false);

  const handleReload = async () => {
    setIsSpinning(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
    try {
      if (ordNoRef.current) {
        await executeSearch(ordNoRef.current, ordLineNoRef.current);
      }
      await minDelay;
    } finally {
      setIsSpinning(false);
    }
  };

  const isRefreshing = isSpinning || loading;

  React.useEffect(() => {
    setTopbarActions(
      <button
        onClick={handleReload}
        disabled={isRefreshing}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isRefreshing ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: isRefreshing ? 0.8 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isRefreshing) {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.color = 'var(--color-brand-600)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
        title="Reload Data"
        aria-label="Reload current order"
      >
        <RefreshCw
          size={18}
          strokeWidth={1.75}
          className={isRefreshing ? 'animate-spin text-[var(--color-brand-600)]' : ''}
        />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, executeSearch, isRefreshing]);

  return (
    <div className="erp-page-container flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-ui-canvas)', color: 'var(--color-text-primary)' }}>
      {/* Topbar Header */}
      <div className="no-print">
        <PageHeader
          breadcrumb={breadcrumb}
          contentLayout="workspace"
        />
      </div>

      {/* Workspace Body: Semantic <main> พร้อม Single-Screen Fit (ไม่เลื่อนจอหลัก) */}
      <main
        aria-label="FBE Order Tracker Workspace"
        className="app-content-frame app-content-frame--workspace app-page-content flex-1 overflow-hidden p-2 flex flex-col min-h-0 gap-2"
      >
        {/* Error Alert: WCAG 4.1.3 (Status Message) */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
              background: 'var(--color-status-danger-soft)', border: '1px solid color-mix(in srgb, var(--color-danger-500) 25%, transparent)',
              color: 'var(--color-danger-700)', borderRadius: 6, fontSize: '13px',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span style={{ fontWeight: 700 }}>{error}</span>
          </div>
        )}

        {/* แถบSearch: WCAG 1.3.1 & 4.1.2 ผูก htmlFor/id ชัดเจน + WCAG 2.4.7 Focus Visible */}
        <div style={{ background: 'var(--color-ui-surface)', border: '1px solid var(--color-border-default)', borderRadius: 8, padding: '6px 12px', flexShrink: 0 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                htmlFor="fbe-order-no-input"
                style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}
              >
                Order No. ( Order )
              </label>
              <input
                id="fbe-order-no-input"
                name="orderNo"
                type="text"
                value={ordNo}
                onChange={(e) => setOrdNo(e.target.value)}
                aria-required="true"
                className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
                style={{
                  width: '11.5rem', padding: '4px 8px', fontSize: '13px',
                  fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase',
                  borderRadius: 5, border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                htmlFor="fbe-order-line-input"
                style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}
              >
                Line ( Item )
              </label>
              <input
                id="fbe-order-line-input"
                name="orderLine"
                type="text"
                value={ordLineNo}
                onChange={(e) => setOrdLineNo(e.target.value)}
                aria-required="true"
                className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
                style={{
                  width: '3.4rem', padding: '4px 6px', fontSize: '13px',
                  fontFamily: 'monospace', fontWeight: 800, textAlign: 'center',
                  borderRadius: 5, border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px',
                background: 'var(--color-ui-interactive)', color: 'var(--color-ui-on-interactive)',
                border: 'none', borderRadius: 5, fontSize: '12.5px',
                fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, transition: 'all 0.15s ease',
              }}
            >
              {loading ? <RefreshCw size={12} className="animate-spin" aria-hidden="true" /> : <Search size={12} aria-hidden="true" />}
              <span>Search ( Search )</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border-default)',
                borderRadius: 5, color: 'var(--color-text-secondary)', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
              }}
            >
              <RotateCcw size={11} aria-hidden="true" />
              <span>Clear ( Clear )</span>
            </button>
          </form>
        </div>

        {/* พื้นที่หลักแบ่ง 2 คอลัมน์ หรือ Skeleton ขณะโหลด */}
        {loading ? (
          <FBEOrderTrackSkeleton />
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-0 overflow-hidden">

          {/* ================================================================= */}
          {/* ฝั่งซ้าย: Order Info + แถบStatus + ไทม์ไลน์ 17 Step + ตารางประวัติ */}
          {/* ================================================================= */}
          <div className="lg:col-span-9 flex flex-col gap-2 min-h-0 overflow-hidden">

            {/* 1. Order Info (Order Information) */}
            <section
              aria-label="Order Info (Order Information)"
              className="flex-shrink-0"
              style={{
                background: 'linear-gradient(180deg, var(--color-ui-surface) 0%, color-mix(in srgb, var(--color-surface-1) 70%, var(--color-ui-surface)) 100%)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 5, borderBottom: '1px solid var(--color-border-default)', marginBottom: 6 }}>
                <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Order Info ( Order Information )
                </h2>
                <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-ui-interactive)' }}>
                  {info ? `${ordNo} / Line ${info.OrdLineNo || ordLineNo}` : '-'}
                </span>
              </div>

              {/* Grid 3 คอลัมน์ตามเลย์เอาต์ต้นแบบ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, fontSize: '12px' }}>

                {/* Column 1: Customer / Order Date / Due Date / PO No */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 12, borderRight: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Customer ( Customer ) :</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13px' }}>{info?.CustCode || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Order Date ( Date ) :</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>
                      {info?.OrdDate ? new Date(info.OrdDate).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-warning-600)', fontWeight: 800 }}>Due Date ( Due Date ) :</span>
                    <span style={{ fontWeight: 900, color: 'var(--color-warning-600)', fontSize: '13px' }}>
                      {info?.DueDate ? new Date(info.DueDate).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>PO No ( No. PO ) :</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.PONo || '-'}</span>
                  </div>
                </div>

                {/* Column 2: Item No / Material / Cust Item / Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 12, borderRight: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Item No. ( Item No ) :</span>
                    <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-text-primary)', fontSize: '13px' }}>{info?.ItemNo || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Material ( Material ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemMat || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cust Item ( Customer Item ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemCust || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Description ( Details ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '14rem' }} title={info?.ItemDesc || '-'}>
                      {info?.ItemDesc || '-'}
                    </span>
                  </div>
                </div>

                {/* Column 3: Stone / Plate / Size / Qty */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Stone ( Stone ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemStone || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Plate ( Plate ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemPlate || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Size ( Size ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemSize || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-warning-600)', fontWeight: 800 }}>Qty ( Qty ) :</span>
                    <span style={{ fontWeight: 900, color: 'var(--color-warning-600)', fontSize: '13.5px', fontVariantNumeric: 'tabular-nums' }}>
                      {info?.ItemQty ? Number(info.ItemQty).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>

              </div>
            </section>

            {/* 2. แถบStatusWorkปัจจุบัน (Active Step Highlight Banner) */}
            <div
              role="status"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-warning-500) 14%, var(--color-surface-0)), color-mix(in srgb, var(--color-warning-500) 6%, var(--color-surface-0)))',
                border: '1px solid color-mix(in srgb, var(--color-warning-500) 35%, transparent)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {activeStepNames ? (
                <>
                  <span>Current Step :</span>
                  <strong style={{ color: 'var(--color-warning-600)', fontSize: '13px' }}>{activeStepNames}</strong>
                  <span style={{ margin: '0 4px', color: 'var(--color-text-tertiary)' }}>&gt;&gt;</span>
                  <span>Done</span>
                  <strong style={{ color: 'var(--color-track-done-text)', fontSize: '13.5px' }}>{summary?.doneSteps || 0}</strong>
                  <span>from</span>
                  <strong style={{ fontSize: '13.5px' }}>{summary?.totalSteps || 17}</strong>
                  <span>Step</span>
                </>
              ) : summary?.percent === 100 ? (
                <span style={{ color: 'var(--color-track-done-text)', fontWeight: 800, fontSize: '13px' }}>
                  Production fully completed ({summary?.totalSteps || 0} from {summary?.totalSteps || 0} Step)
                </span>
              ) : data ? (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                  Waiting to start first step (0 of {summary?.totalSteps || 0} Step)
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                  Please enter Order No. (Order No.) and Line above and click Search to track status
                </span>
              )}
            </div>

            {/* 3. Production Progress (Production Progress >> 17 Step) */}
            <section
              aria-label="17 Steps Production Progress"
              style={{
                background: 'var(--color-ui-surface)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                padding: '6px 12px',
                flexShrink: 0,
              }}
            >
              <div style={{ paddingBottom: 4, borderBottom: '1px solid var(--color-border-default)', marginBottom: 4 }}>
                <h2 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Production Progress ( Production Progress ) &gt;&gt; {summary?.totalSteps || 17} Step
                </h2>
              </div>
              <OrderTrackStepper steps={data?.steps || []} />
            </section>

            {/* 4. Step History (Step History Table) */}
            <section
              aria-label="Step History"
              className="flex-1 flex flex-col min-h-0"
              style={{
                background: 'var(--color-ui-surface)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                padding: '10px 12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ paddingBottom: 8, borderBottom: '1px solid var(--color-border-default)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Step History ( Step History )
                </h2>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {data?.history.length || 0} Item
                </span>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ borderRadius: 6, border: '1px solid var(--color-border-default)', background: 'var(--color-ui-surface)' }}>
                <table aria-label="Step History" style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse', background: 'transparent' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr style={{ background: 'var(--color-ui-surface)', borderBottom: '1px solid var(--color-border-default)', fontWeight: 800, color: 'var(--color-text-secondary)', fontSize: '11.5px' }}>
                      <th scope="col" style={{ padding: '7px 8px', borderRight: '1px solid var(--color-border-default)' }}>Step / Step</th>
                      <th scope="col" style={{ padding: '7px 8px', borderRight: '1px solid var(--color-border-default)' }}>Date / Date</th>
                      <th scope="col" style={{ padding: '7px 8px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)' }}>Receive Qty / Receive Qty</th>
                      <th scope="col" style={{ padding: '7px 8px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)' }}>Send Qty / Send Qty</th>
                      <th scope="col" style={{ padding: '7px 8px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)' }}>Balance Qty / Remain</th>
                      <th scope="col" style={{ padding: '7px 8px', textAlign: 'center' }}>Status / Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data || data.history.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                          {loading ? 'Loading data...' : 'No history available'}
                        </td>
                      </tr>
                    ) : (
                      data.history.map((h, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border-default)', background: 'transparent' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: 'var(--color-text-primary)', borderRight: '1px solid var(--color-border-default)' }}>
                            {h.stepIndex}. {h.nameEN} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>({h.nameTH})</span>
                          </td>
                          <td style={{ padding: '6px 8px', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-default)' }}>
                            {h.repDate ? new Date(h.repDate).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-default)' }}>
                            {h.recQty > 0 ? h.recQty.toLocaleString() : '-'}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-default)' }}>
                            {h.senQty > 0 ? h.senQty.toLocaleString() : '-'}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 900, color: h.balance > 0 ? 'var(--color-warning-600)' : 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-default)', fontSize: '12.5px' }}>
                            {h.balance.toLocaleString()}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            {h.status === 2 ? (
                              <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--color-track-done-text)' }}>
                                Done (Y)
                              </span>
                            ) : h.status === 1 ? (
                              <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--color-warning-600)' }}>
                                In Progress (O)
                              </span>
                            ) : (
                              <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>

          {/* ================================================================= */}
          {/* ฝั่งขวา: Item Photo (Item Photo) + Status Summary (Summary)                 */}
          {/* ================================================================= */}
          <div className="lg:col-span-3 flex flex-col gap-2 min-h-0 overflow-hidden">

            {/* 1. Item Photo (Item Photo) - Sizeกระชับ สมส่วน ไม่มีกWaitบซ้อน andตัดแคปชันท้ายรูปออก */}
            <section
              aria-label="Item Photo (Item Photo)"
              className="flex-shrink-0 flex flex-col"
              style={{
                background: 'var(--color-ui-surface)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                padding: '10px',
                height: '375px',
                overflow: 'hidden',
              }}
            >
              <div style={{ paddingBottom: 5, borderBottom: '1px solid var(--color-border-default)', marginBottom: 6, flexShrink: 0 }}>
                <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Item Photo ( Item Photo )
                </h2>
              </div>

              {/* พื้นที่รูปภาพ: ไม่มีกWaitบซ้อน (Delete border ภายในออก) รูปArrangeวางสมส่วนอยู่ด้านบนพอดี */}
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  background: 'var(--color-surface-1)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {info?.ItemNo ? (
                  <>
                    {!imgFailed && (
                      <img
                        key={info.ItemNo}
                        src={psPhotoUrl(info.ItemNo)}
                        alt={`Item Photo Code ${info.ItemNo}`}
                        onError={(e) => attachPhotoFallback(e, info.ItemNo, () => setImgFailed(true))}
                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', padding: 6 }}
                      />
                    )}
                    {imgFailed && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', gap: 4 }}>
                        <ImageOff size={28} aria-hidden="true" />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>No picture</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', gap: 4 }}>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>Specify order to view photos</span>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Status Summary (Summary) - ขยายให้เต็มพื้นที่: Donut Gauge เด่นตรงกลาง + สถิติ 4 ช่องแนวนอนตัวเลขใหญ่ด้านล่าง */}
            <section
              aria-label="Status Summary (Summary)"
              className="flex-1 flex flex-col justify-between min-h-0"
              style={{
                background: 'var(--color-ui-surface)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                padding: '12px',
                gap: 10,
              }}
            >
              <div style={{ paddingBottom: 6, borderBottom: '1px solid var(--color-border-default)', flexShrink: 0 }}>
                <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Status Summary ( Summary )
                </h2>
              </div>

              {/* 1. วงแหวนProgress (Donut Gauge) ขยายใหญ่ เด่นชัด ตรงกลาง */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
                <svg
                  width="350"
                  height="350"
                  viewBox="0 0 118 118"
                  role="progressbar"
                  aria-valuenow={summary?.percent || 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Total Progress ${summary?.percent || 0} Percent`}
                >
                  {/* วงแหวนพื้นหลัง */}
                  <circle cx="59" cy="59" r="47" stroke="var(--color-surface-2)" strokeWidth="9" fill="none" />

                  {/* StatusProcessข้อมูล (Loading State) / StatusProgressNormal (Executive Progress Ring) */}
                  {loading ? (
                    <circle
                      cx="59"
                      cy="59"
                      r="47"
                      stroke="var(--color-brand-500)"
                      strokeWidth="9"
                      fill="none"
                      strokeDasharray="75 180"
                      strokeLinecap="round"
                      className="donut-loading-spin"
                    />
                  ) : (
                    <>
                      <circle
                        cx="59"
                        cy="59"
                        r="47"
                        stroke={summary?.percent === 100 ? 'var(--color-track-done)' : 'var(--color-warning-500)'}
                        strokeWidth="9"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 47}
                        strokeDashoffset={2 * Math.PI * 47 * (1 - (summary?.percent || 0) / 100)}
                        strokeLinecap="round"
                        transform="rotate(-90 59 59)"
                        className={summary?.percent && summary.percent < 100 ? 'donut-pulse-active' : undefined}
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                      />
                      
                      {/* Shimmer Line (Only when < 100% and > 0%) */}
                      {summary?.percent && summary.percent > 0 && summary.percent < 100 ? (
                        <circle
                          cx="59"
                          cy="59"
                          r="47"
                          stroke="rgba(255, 255, 255, 0.9)"
                          strokeWidth="9"
                          fill="transparent"
                          strokeDasharray={`15 ${2 * Math.PI * 47}`}
                          strokeLinecap="round"
                          transform="rotate(-90 59 59)"
                          className="donut-shimmer-line"
                          style={{
                             '--shimmer-end': `${-1 * ((2 * Math.PI * 47 * (summary.percent / 100)) - 15)}px`
                          } as React.CSSProperties}
                        />
                      ) : null}
                    </>
                  )}

                  {/* ตัวเลขPercent หรือข้อความระบุStatusProcessทางการสำหรับห้องประชุม */}
                  <text
                    x="59"
                    y={loading ? "59" : "52"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={loading ? "11.5" : "24"}
                    fontWeight="900"
                    fill={loading ? "var(--color-brand-600)" : summary?.percent === 100 ? "var(--color-track-done-text)" : "var(--color-warning-600)"}
                    fontFamily="monospace"
                  >
                    {loading ? "Process..." : summary ? `${summary.percent} %` : "0 %"}
                  </text>

                  {!loading && (
                    <text
                      x="59"
                      y="71"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill="var(--color-text-secondary)"
                    >
                      Progress
                    </text>
                  )}
                </svg>
              </div>

              {/* 2. ตัวเลขสถิติ 4 ช่องแนวนอน (ตัวเลข กับ Text อย่างเดียว ไม่มีกWaitบ ตามภาพRef) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, textAlign: 'center', width: '100%', flexShrink: 0, paddingBottom: 4 }}>

                {/* 1. All - สีน้ำเงิน */}
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-brand-600)', fontFamily: 'monospace', lineHeight: 1.1 }}>
                    {data ? (summary?.totalSteps || 0) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    All
                  </div>
                </div>

                {/* 2. Done - สีเขียว */}
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-track-done-text)', fontFamily: 'monospace', lineHeight: 1.1 }}>
                    {data ? (summary?.doneSteps || 0) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    Done
                  </div>
                </div>

                {/* 3. In Progress - สีส้ม */}
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-warning-600)', fontFamily: 'monospace', lineHeight: 1.1 }}>
                    {data ? (summary?.inProgressCount || 0) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    In Progress
                  </div>
                </div>

                {/* 4. Remain - สีกรม/เทาเข้ม */}
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace', lineHeight: 1.1 }}>
                    {data && summary ? (summary.totalSteps - summary.doneSteps - summary.inProgressCount) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    Remain
                  </div>
                </div>

              </div>
            </section>

          </div>

        </div>
        )}

      </main>
    </div>
  );
}
