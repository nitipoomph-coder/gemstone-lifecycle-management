import React, { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
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

export default function FBEOrderTrackPage() {
  const [ordNo, setOrdNo] = useState('');
  const [ordLineNo, setOrdLineNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrderTrackingResponse | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const breadcrumb = [
    { label: 'JEWELRY FACTORY SYSTEM', path: '/' },
    { label: 'Production', path: '/po-tracker' },
    { label: 'FBE Order Tracker' }
  ];

  // ฟังก์ชันค้นหาพร้อมเงื่อนไขการแจ้งเตือนแบบแยกเคส
  const executeSearch = async (targetOrd: string, targetLine: string) => {
    const cleanOrd = targetOrd.trim();
    const cleanLine = targetLine.trim();

    if (!cleanOrd && !cleanLine) {
      setError('กรุณาระบุเลขที่ออเดอร์ (Order No.) และ Line No. ให้ครบถ้วน');
      return;
    }
    if (!cleanOrd) {
      setError('กรุณาระบุเลขที่ออเดอร์ (Order No.)');
      return;
    }
    if (!cleanLine) {
      setError('กรุณาระบุ Line No. ของออเดอร์');
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
      setError(err.message || 'ไม่พบข้อมูลออเดอร์และ Line ที่ระบุในระบบ');
    } finally {
      setLoading(false);
    }
  };

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

  // กรองเฉพาะสเต็ปที่กำลังดำเนินการ (WIP)
  const activeSteps = data?.steps.filter(s => s.status === 1 || s.balance > 0) || [];
  const activeStepNames = activeSteps.length > 0
    ? activeSteps.map(s => `${s.nameEN} (${s.nameTH})`).join(', ')
    : null;

  return (
    <div className="erp-page-container flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-ui-canvas)', color: 'var(--color-text-primary)' }}>
      {/* Topbar Header */}
      <div className="no-print">
        <PageHeader
          breadcrumb={breadcrumb}
          contentLayout="workspace"
          rightContent={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => executeSearch(ordNo, ordLineNo)}
                disabled={loading}
                className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                  background: 'var(--color-ui-surface)', border: '1px solid var(--color-border-default)',
                  borderRadius: 6, fontSize: '13px', fontWeight: 700,
                  color: 'var(--color-text-secondary)', cursor: loading ? 'not-allowed' : 'pointer',
                }}
                title="รีโหลดข้อมูล"
                aria-label="รีโหลดข้อมูลออเดอร์ปัจจุบัน"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} />
                <span>รีเฟรช</span>
              </button>
            </div>
          }
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

        {/* แถบค้นหา: WCAG 1.3.1 & 4.1.2 ผูก htmlFor/id ชัดเจน + WCAG 2.4.7 Focus Visible */}
        <div style={{ background: 'var(--color-ui-surface)', border: '1px solid var(--color-border-default)', borderRadius: 8, padding: '6px 12px', flexShrink: 0 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                htmlFor="fbe-order-no-input"
                style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}
              >
                Order No. ( ออเดอร์ )
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
                Line ( รายการ )
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
              <span>ค้นหา ( Search )</span>
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
              <span>ล้าง ( Clear )</span>
            </button>
          </form>
        </div>

        {/* พื้นที่หลักแบ่ง 2 คอลัมน์ (ซ้าย ~74% / ขวา ~26%) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-0 overflow-hidden">

          {/* ================================================================= */}
          {/* ฝั่งซ้าย: ข้อมูลออเดอร์ + แถบสถานะ + ไทม์ไลน์ 17 ขั้นตอน + ตารางประวัติ */}
          {/* ================================================================= */}
          <div className="lg:col-span-9 flex flex-col gap-2 min-h-0 overflow-hidden">

            {/* 1. ข้อมูลออเดอร์ (Order Information) */}
            <section
              aria-label="ข้อมูลออเดอร์ (Order Information)"
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
                  ข้อมูลออเดอร์ ( Order Information )
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
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Customer ( ลูกค้า ) :</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13px' }}>{info?.CustCode || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Order Date ( วันที่ ) :</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>
                      {info?.OrdDate ? new Date(info.OrdDate).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-warning-600)', fontWeight: 800 }}>Due Date ( ครบกำหนด ) :</span>
                    <span style={{ fontWeight: 900, color: 'var(--color-warning-600)', fontSize: '13px' }}>
                      {info?.DueDate ? new Date(info.DueDate).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>PO No ( เลขที่ PO ) :</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.PONo || '-'}</span>
                  </div>
                </div>

                {/* Column 2: Item No / Material / Cust Item / Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 12, borderRight: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Item No. ( เบอร์งาน ) :</span>
                    <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-text-primary)', fontSize: '13px' }}>{info?.ItemNo || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Material ( วัตถุดิบ ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemMat || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cust Item ( เบอร์งานลูกค้า ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemCust || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Description ( รายละเอียด ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '14rem' }} title={info?.ItemDesc || '-'}>
                      {info?.ItemDesc || '-'}
                    </span>
                  </div>
                </div>

                {/* Column 3: Stone / Plate / Size / Qty */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Stone ( พลอย ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemStone || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Plate ( ชุบ ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemPlate || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Size ( ขนาด ) :</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemSize || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-warning-600)', fontWeight: 800 }}>Qty ( จำนวน ) :</span>
                    <span style={{ fontWeight: 900, color: 'var(--color-warning-600)', fontSize: '13.5px', fontVariantNumeric: 'tabular-nums' }}>
                      {info?.ItemQty ? Number(info.ItemQty).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>

              </div>
            </section>

            {/* 2. แถบสถานะงานปัจจุบัน (Active Step Highlight Banner) */}
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
                  <span>งานอยู่ที่ขั้นตอน :</span>
                  <strong style={{ color: 'var(--color-warning-600)', fontSize: '13px' }}>{activeStepNames}</strong>
                  <span style={{ margin: '0 4px', color: 'var(--color-text-tertiary)' }}>&gt;&gt;</span>
                  <span>เสร็จแล้ว</span>
                  <strong style={{ color: 'var(--color-track-done-text)', fontSize: '13.5px' }}>{summary?.doneSteps || 0}</strong>
                  <span>จาก</span>
                  <strong style={{ fontSize: '13.5px' }}>{summary?.totalSteps || 17}</strong>
                  <span>ขั้นตอน</span>
                </>
              ) : summary?.percent === 100 ? (
                <span style={{ color: 'var(--color-track-done-text)', fontWeight: 800, fontSize: '13px' }}>
                  ผลิตเสร็จสมบูรณ์ครบทุกขั้นตอนแล้ว ({summary?.totalSteps || 0} จาก {summary?.totalSteps || 0} ขั้นตอน)
                </span>
              ) : data ? (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                  รอเริ่มดำเนินงานขั้นตอนแรก (0 จาก {summary?.totalSteps || 0} ขั้นตอน)
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                  กรุณาระบุเลขที่ออเดอร์ (Order No.) และ Line ด้านบน แล้วกดค้นหาเพื่อติดตามสถานะงาน
                </span>
              )}
            </div>

            {/* 3. ความคืบหน้าการผลิต (Production Progress >> 17 ขั้นตอน) */}
            <section
              aria-label="ความคืบหน้าการผลิต 17 ขั้นตอน"
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
                  ความคืบหน้าการผลิต ( Production Progress ) &gt;&gt; {summary?.totalSteps || 17} ขั้นตอน
                </h2>
              </div>
              <OrderTrackStepper steps={data?.steps || []} />
            </section>

            {/* 4. ประวัติการส่ง - รับงานแต่ละขั้นตอน (Step History Table) */}
            <section
              aria-label="ประวัติการส่ง - รับงานแต่ละขั้นตอน"
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
                  ประวัติการส่ง - รับงานแต่ละขั้นตอน ( Step History )
                </h2>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {data?.history.length || 0} รายการ
                </span>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ borderRadius: 6, border: '1px solid var(--color-border-default)', background: 'var(--color-ui-surface)' }}>
                <table aria-label="ประวัติการรับและส่งงานแต่ละขั้นตอน" style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse', background: 'transparent' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr style={{ background: 'var(--color-ui-surface)', borderBottom: '1px solid var(--color-border-default)', fontWeight: 800, color: 'var(--color-text-secondary)', fontSize: '11.5px' }}>
                      <th scope="col" style={{ padding: '7px 8px', borderRight: '1px solid var(--color-border-default)' }}>Step / ขั้นตอน</th>
                      <th scope="col" style={{ padding: '7px 8px', borderRight: '1px solid var(--color-border-default)' }}>Date / วันที่</th>
                      <th scope="col" style={{ padding: '7px 8px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)' }}>Receive Qty / จำนวนรับ</th>
                      <th scope="col" style={{ padding: '7px 8px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)' }}>Send Qty / จำนวนส่ง</th>
                      <th scope="col" style={{ padding: '7px 8px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)' }}>Balance Qty / คงเหลือ</th>
                      <th scope="col" style={{ padding: '7px 8px', textAlign: 'center' }}>Status / สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data || data.history.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                          {loading ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีประวัติการบันทึกงานในขั้นตอนใด'}
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
                                เสร็จแล้ว (Y)
                              </span>
                            ) : h.status === 1 ? (
                              <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--color-warning-600)' }}>
                                กำลังทำ (O)
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
          {/* ฝั่งขวา: รูปงาน (Item Photo) + สรุปสถานะ (Summary)                 */}
          {/* ================================================================= */}
          <div className="lg:col-span-3 flex flex-col gap-2 min-h-0 overflow-hidden">

            {/* 1. รูปงาน (Item Photo) - ขนาดกระชับ สมส่วน ไม่มีกรอบซ้อน และตัดแคปชันท้ายรูปออก */}
            <section
              aria-label="รูปงาน (Item Photo)"
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
                  รูปงาน ( Item Photo )
                </h2>
              </div>

              {/* พื้นที่รูปภาพ: ไม่มีกรอบซ้อน (ลบ border ภายในออก) รูปจัดวางสมส่วนอยู่ด้านบนพอดี */}
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
                        alt={`ภาพชิ้นงานรหัส ${info.ItemNo}`}
                        onError={(e) => attachPhotoFallback(e, info.ItemNo, () => setImgFailed(true))}
                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', padding: 6 }}
                      />
                    )}
                    {imgFailed && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', gap: 4 }}>
                        <ImageOff size={28} aria-hidden="true" />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>ไม่มีรูปภาพสินค้า</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', gap: 4 }}>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>ระบุออเดอร์เพื่อดูรูปภาพ</span>
                  </div>
                )}
              </div>
            </section>

            {/* 2. สรุปสถานะ (Summary) - ขยายให้เต็มพื้นที่: Donut Gauge เด่นตรงกลาง + สถิติ 4 ช่องแนวนอนตัวเลขใหญ่ด้านล่าง */}
            <section
              aria-label="สรุปสถานะ (Summary)"
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
                  สรุปสถานะ ( Summary )
                </h2>
              </div>

              {/* 1. วงแหวนความคืบหน้า (Donut Gauge) ขยายใหญ่ เด่นชัด ตรงกลาง */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
                <svg
                  width="350"
                  height="350"
                  viewBox="0 0 118 118"
                  role="progressbar"
                  aria-valuenow={summary?.percent || 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`ความคืบหน้ารวม ${summary?.percent || 0} เปอร์เซ็นต์`}
                >
                  {/* วงแหวนพื้นหลัง */}
                  <circle cx="59" cy="59" r="47" stroke="var(--color-surface-2)" strokeWidth="9" fill="none" />

                  {/* สถานะประมวลผลข้อมูล (Loading State) / สถานะความคืบหน้าปกติ (Executive Progress Ring) */}
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

                  {/* ตัวเลขเปอร์เซ็นต์ หรือข้อความระบุสถานะประมวลผลทางการสำหรับห้องประชุม */}
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
                    {loading ? "ประมวลผล..." : summary ? `${summary.percent} %` : "0 %"}
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
                      ความคืบหน้า
                    </text>
                  )}
                </svg>
              </div>

              {/* 2. ตัวเลขสถิติ 4 ช่องแนวนอน (ตัวเลข กับ Text อย่างเดียว ไม่มีกรอบ ตามภาพอ้างอิง) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, textAlign: 'center', width: '100%', flexShrink: 0, paddingBottom: 4 }}>

                {/* 1. ทั้งหมด - สีน้ำเงิน */}
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-brand-600)', fontFamily: 'monospace', lineHeight: 1.1 }}>
                    {data ? (summary?.totalSteps || 0) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    ทั้งหมด
                  </div>
                </div>

                {/* 2. เสร็จแล้ว - สีเขียว */}
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-track-done-text)', fontFamily: 'monospace', lineHeight: 1.1 }}>
                    {data ? (summary?.doneSteps || 0) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    เสร็จแล้ว
                  </div>
                </div>

                {/* 3. กำลังทำ - สีส้ม */}
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-warning-600)', fontFamily: 'monospace', lineHeight: 1.1 }}>
                    {data ? (summary?.inProgressCount || 0) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    กำลังทำ
                  </div>
                </div>

                {/* 4. คงเหลือ - สีกรม/เทาเข้ม */}
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace', lineHeight: 1.1 }}>
                    {data && summary ? (summary.totalSteps - summary.doneSteps - summary.inProgressCount) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    คงเหลือ
                  </div>
                </div>

              </div>
            </section>

          </div>

        </div>

      </main>
    </div>
  );
}
