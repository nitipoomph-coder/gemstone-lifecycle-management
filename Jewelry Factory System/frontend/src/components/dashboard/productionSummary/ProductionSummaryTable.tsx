// src/components/dashboard/productionSummary/ProductionSummaryTable.tsx
import { PROD_CUSTOMER_GROUPS } from '../../../config/productionSummaryConfig';
import type { ProdCustomerGroup } from '../../../config/productionSummaryConfig';

interface TableProps {
  data: any[];
  tab: 'year' | 'week' | 'month' | 'day';
}

export function ProductionSummaryTable({ data, tab }: TableProps) {
  if (!data || data.length === 0) return null;

  const isDaily = tab === 'month' || tab === 'day';
  const totalCols = data.length;

  // คำนวณยอดรวม TOTAL
  const totals = {
    N008: 0,
    N098: 0,
    N051: 0,
    total: 0,
    workDays: 0,
  };

  data.forEach((d) => {
    totals.N008 += d.N008 || 0;
    totals.N098 += d.N098 || 0;
    totals.N051 += d.N051 || 0;
    totals.total += d.total || 0;
    totals.workDays += d.workDays || 0;
  });

  const avgTotal = totals.workDays > 0 ? totals.total / totals.workDays : 0;

  const renderCell = (val: number | null | undefined, isAvg = false) => {
    if (val === 0 && !isAvg) return '-';
    if (val == null) return '-';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  // ปรับขนาดฟอนต์อัตโนมัติตามจำนวนคอลัมน์ (ยิ่งวันเยอะ ยิ่งปรับฟอนต์ให้กะทัดรัด)
  const cellFontSize = totalCols > 25 ? '10px' : totalCols > 15 ? '10.5px' : '11px';

  return (
    <div
      style={{
        width: '100%',
        background: 'var(--color-ui-surface)',
        borderRadius: '6px',
        border: '1px solid var(--color-border-light)',
        overflow: 'hidden', // ล็อกไม่ให้มี Scrollbar แนวนอน
      }}
    >
      <table
        style={{
          width: '100%',
          tableLayout: 'fixed', // 👈 บังคับเฉลี่ยคอลัมน์เป๊ะ 100% ไม่ล้นจอ
          borderCollapse: 'collapse',
          fontSize: cellFontSize,
          fontVariantNumeric: 'tabular-nums', // 👈 ตัวเลขหน้ากว้างเท่ากัน อ่านง่าย
          textAlign: 'right',
        }}
      >
        <thead>
          <tr
            style={{
              background: 'var(--color-table-header)',
              borderBottom: '1.5px solid var(--color-border-strong)',
              color: 'var(--color-text-primary)',
              height: isDaily ? '32px' : '26px',
            }}
          >
            {/* คอลัมน์แรก: ชื่อกลุ่ม (ความกว้างคงที่) */}
            <th
              style={{
                width: totalCols > 25 ? '58px' : '75px',
                padding: '4px 6px',
                textAlign: 'center',
                borderRight: '1px solid var(--color-border-light)',
                fontWeight: 700,
              }}
            >
              Group
            </th>

            {/* คอลัมน์ข้อมูล (เฉลี่ยความกว้างเท่ากันทั้งหมด) */}
            {data.map((d) => {
              // ในโหมด Month ย่อหัวตารางเหลือแค่เลขวัน เช่น "01", "02" .. "31"
              const headerLabel = isDaily && d.periodLabel?.includes('/')
                ? d.periodLabel.split('/')[0]
                : d.periodLabel || d.period;

              return (
                <th
                  key={d.period}
                  style={{
                    padding: '2px 1px',
                    textAlign: 'center',
                    borderRight: '1px solid var(--color-border-light)',
                    fontWeight: 600,
                  }}
                >
                  {headerLabel}
                </th>
              );
            })}

            {/* คอลัมน์สุดท้าย: TOTAL / Avg (ความกว้างคงที่) */}
            <th
              style={{
                width: isDaily ? '85px' : '75px',
                padding: '4px 6px',
                textAlign: 'center',
                fontWeight: 700,
                color: 'var(--color-danger-600)',
              }}
            >
              {isDaily ? (
                <div style={{ lineHeight: '1.1', fontSize: '9.5px' }}>
                  <span>{totals.workDays} ({data.length}) Days</span>
                  <br />
                  <span style={{ fontSize: '10px', fontWeight: 800 }}>Avg.</span>
                </div>
              ) : (
                'TOTAL'
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {/* แถว 3 กลุ่มลูกค้า */}
          {PROD_CUSTOMER_GROUPS.map((g: ProdCustomerGroup) => (
            <tr
              key={g.id}
              style={{
                borderBottom: '1px solid var(--color-border-light)',
                height: '22px',
              }}
            >
              <td
                style={{
                  padding: '2px 6px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: g.color,
                  borderRight: '1px solid var(--color-border-light)',
                }}
              >
                {g.id}
              </td>

              {data.map((d) => (
                <td
                  key={d.period}
                  style={{
                    padding: '2px 2px',
                    borderRight: '1px solid var(--color-border-light)',
                  }}
                >
                  {renderCell(d[g.id])}
                </td>
              ))}

              <td
                style={{
                  padding: '2px 6px',
                  fontWeight: 700,
                  textAlign: 'center',
                  color: 'var(--color-text-primary)',
                }}
              >
                {isDaily
                  ? renderCell(
                    totals.workDays > 0
                      ? totals[g.id as keyof typeof totals] / totals.workDays
                      : 0,
                    true
                  )
                  : renderCell(totals[g.id as keyof typeof totals])}
              </td>
            </tr>
          ))}

          {/* แถว Total (พื้นหลังสีฟ้าอ่อน) */}
          <tr
            style={{
              background: 'var(--color-prod-total-row-bg)',
              borderBottom: '1px solid var(--color-border-light)',
              height: '24px',
            }}
          >
            <td
              style={{
                padding: '2px 6px',
                textAlign: 'center',
                fontWeight: 800,
                color: 'var(--color-chart-1)',
                borderRight: '1px solid var(--color-border-light)',
              }}
            >
              Total
            </td>

            {data.map((d) => (
              <td
                key={d.period}
                style={{
                  padding: '2px 2px',
                  fontWeight: 700,
                  borderRight: '1px solid var(--color-border-light)',
                }}
              >
                {renderCell(d.total)}
              </td>
            ))}

            <td
              style={{
                padding: '2px 6px',
                fontWeight: 800,
                textAlign: 'center',
                color: 'var(--color-chart-1)',
              }}
            >
              {isDaily ? renderCell(avgTotal, true) : renderCell(totals.total)}
            </td>
          </tr>

          {/* แถว Avg. (เฉพาะโหมด Year และ Week - พื้นหลังสีม่วงอ่อน) */}
          {!isDaily && (
            <tr
              style={{
                background: 'var(--color-prod-avg-row-bg)',
                height: '22px',
              }}
            >
              <td
                style={{
                  padding: '2px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: 'var(--color-chart-2)',
                  borderRight: '1px solid var(--color-border-light)',
                  fontSize: '9.5px',
                  lineHeight: '1.1',
                }}
              >
                Avg.(Day)
              </td>

              {data.map((d) => (
                <td
                  key={d.period}
                  style={{
                    padding: '2px 2px',
                    fontWeight: 700,
                    borderRight: '1px solid var(--color-border-light)',
                  }}
                >
                  {renderCell(d.avg, true)}
                </td>
              ))}

              <td
                style={{
                  padding: '2px 6px',
                  fontWeight: 800,
                  textAlign: 'center',
                  color: 'var(--color-chart-2)',
                }}
              >
                {renderCell(avgTotal, true)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
