import React from 'react';
import { Check } from 'lucide-react';
import type { TrackingStep } from '../../../services/orderTrackingAPI';

interface OrderTrackStepperProps {
    steps: TrackingStep[];
}

export const OrderTrackStepper: React.FC<OrderTrackStepperProps> = ({ steps }) => {
    if (!steps || steps.length === 0) return null;

    return (
        <div style={{ width: '100%', overflowX: 'auto', padding: '2px 0' }}>
            <div style={{ minWidth: 980, padding: '2px 0' }}>
                {/* แถวของขั้นตอน 17 สเต็ป: เชื่อมต่อด้วยเส้นที่ไม่มีการซ้อนทับ ไม่ยื่นเลยหัวท้าย */}
                <div role="list" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                    {steps.map((step, idx) => {
                        const isDone = step.status === 2;
                        const isCurrent = step.status === 1;
                        const statusLabel = isDone ? 'เสร็จสมบูรณ์' : isCurrent ? 'กำลังดำเนินการ' : 'รอดำเนินการ';

                        // เส้นเชื่อมฝั่งซ้าย: สีเขียวเมื่อขั้นตอนก่อนหน้าเสร็จและขั้นตอนนี้กำลังทำหรือเสร็จ
                        const isLeftActive = idx > 0 && steps[idx - 1].status === 2 && step.status >= 1;
                        // เส้นเชื่อมฝั่งขวา: สีเขียวเมื่อขั้นตอนนี้เสร็จและขั้นตอนถัดไปกำลังทำหรือเสร็จ
                        const isRightActive = idx < steps.length - 1 && isDone && steps[idx + 1].status >= 1;

                        return (
                            <div
                                key={step.stepIndex}
                                role="listitem"
                                aria-label={`ขั้นตอนที่ ${step.stepIndex}: ${step.nameEN} (${step.nameTH}) - สถานะ ${statusLabel}`}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    flex: 1,
                                    textAlign: 'center',
                                    minWidth: 0,
                                }}
                            >
                                {/* แถว Node และเส้นเชื่อมต่อ (ต่อชิดขอบวงกลมพอดี ไม่ลอดใต้ ไม่ทับซ้อน) */}
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    {/* เส้นครึ่งซ้าย */}
                                    <div
                                        style={{
                                            flex: 1,
                                            height: 2,
                                            background: idx === 0
                                                ? 'transparent'
                                                : isLeftActive
                                                    ? 'var(--color-track-done)'
                                                    : 'var(--color-track-line)',
                                        }}
                                    />

                                    {/* จุดวงกลม Node */}
                                    <div
                                        aria-hidden="true"
                                        className={isCurrent ? 'step-current-blink' : undefined}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: '15px',
                                            fontFamily: 'monospace',
                                            transition: 'all 0.2s ease',
                                            background: isDone
                                                ? 'var(--color-track-done)'
                                                : isCurrent
                                                    ? 'var(--color-track-current)'
                                                    : 'var(--color-ui-surface)',
                                            color: isDone || isCurrent
                                                ? 'var(--color-ui-on-interactive)'
                                                : 'var(--color-text-secondary)',
                                            border: isDone
                                                ? '2px solid var(--color-track-done)'
                                                : isCurrent
                                                    ? '2px solid var(--color-track-current)'
                                                    : '1.5px solid var(--color-track-pending-border)',
                                            boxShadow: isCurrent ? '0 0 0 3px var(--color-track-current-soft)' : 'none',
                                        }}
                                    >
                                        {isDone ? <Check size={14} strokeWidth={3} /> : step.stepIndex}
                                    </div>

                                    {/* เส้นครึ่งขวา */}
                                    <div
                                        style={{
                                            flex: 1,
                                            height: 2,
                                            background: idx === steps.length - 1
                                                ? 'transparent'
                                                : isRightActive
                                                    ? 'var(--color-track-done)'
                                                    : 'var(--color-track-line)',
                                        }}
                                    />
                                </div>

                                {/* ชื่อขั้นตอน EN / TH */}
                                <div style={{ marginTop: 6, maxWidth: 68 }}>
                                    <div
                                        style={{
                                            fontSize: '11.5px',
                                            fontWeight: isCurrent || isDone ? 800 : 600,
                                            color: isCurrent
                                                ? 'var(--color-track-current-text)'
                                                : isDone
                                                    ? 'var(--color-track-done-text)'
                                                    : 'var(--color-text-primary)',
                                            lineHeight: 1.2,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                        title={step.nameEN}
                                    >
                                        {step.nameEN}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '10.5px',
                                            color: 'var(--color-text-secondary)',
                                            marginTop: 2,
                                            lineHeight: 1.1,
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                        title={step.nameTH}
                                    >
                                        {step.nameTH}
                                    </div>
                                </div>

                                {/* สถานะ / วันที่ (Date / In-Progress Blink / Waiting) - ตัด Qty ออกตามที่ผู้ใช้สั่ง */}
                                <div style={{ marginTop: 4, fontSize: '11px' }}>
                                    {isCurrent ? (
                                        <div
                                            className="text-current-blink"
                                            style={{
                                                fontWeight: 800,
                                                fontSize: '11.5px',
                                                color: 'var(--color-warning-600)',
                                                letterSpacing: '0.02em',
                                            }}
                                        >
                                            กำลังทำ
                                        </div>
                                    ) : isDone ? (
                                        <div style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                            {step.repDate
                                                ? new Date(step.repDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
                                                : '-'}
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                                            รอ
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
