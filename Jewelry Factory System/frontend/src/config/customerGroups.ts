/**
 * Customer Group Configuration
 * 
 * Single Source of Truth สำหรับการจัดกลุ่มลูกค้าในระบบ
 * ใช้ใน: CustomerDashboard, CustomerDetailModal
 * 
 * กฎ: ห้าม Hardcode group logic ลงใน Component โดยตรง
 */

export interface CustomerGroup {
  id: string;
  label: string;
  color: string;
  /** รหัสลูกค้าที่อยู่ในกลุ่มนี้ (exact match กับ prefix ของ CustCode) */
  prefixes: string[];
}

/**
 * กลุ่มลูกค้าทั้งหมด (ไม่รวม General)
 * General = ลูกค้าทุกรหัสที่ไม่ตรงกับกลุ่ม 1-5
 */
export const CUSTOMER_GROUPS: CustomerGroup[] = [
  {
    id: 'N008',
    label: 'N008 Group',
    color: 'var(--color-brand-500)',
    prefixes: ['N008', 'N048', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'],
  },
  {
    id: 'MLT',
    label: 'MLT Group',
    color: 'var(--color-proc-polishing)',
    // U411 ถึง U426 (16 รหัส)
    prefixes: [
      'U411', 'U412', 'U413', 'U414', 'U415', 'U416',
      'U417', 'U418', 'U419', 'U420', 'U421', 'U422',
      'U423', 'U424', 'U425', 'U426',
    ],
  },
  {
    id: 'N083',
    label: 'N083 Group',
    color: 'var(--color-proc-plating)',
    prefixes: ['N083', 'N086', 'N087', 'N088', 'N089'],
  },
  {
    id: 'N044',
    label: 'N044 Group',
    color: 'var(--color-proc-grinding)',
    prefixes: ['N044'],
  },
  {
    id: 'N051',
    label: 'N051 Group',
    color: 'var(--color-proc-packing)',
    prefixes: ['N051'],
  },
];

/** กลุ่ม General (ลูกค้าที่ไม่ตรงกับกลุ่มไหนเลย) */
export const GENERAL_GROUP: CustomerGroup = {
  id: 'General',
  label: 'General',
  color: 'var(--color-text-tertiary)',
  prefixes: [],
};

/** ALL_GROUPS รวม General — ใช้สำหรับ UI toggle / legend */
export const ALL_GROUPS: CustomerGroup[] = [...CUSTOMER_GROUPS, GENERAL_GROUP];

/**
 * หาว่าลูกค้ารหัสนี้อยู่ในกลุ่มไหน
 * @param custCode รหัสลูกค้า เช่น "N008", "U411", "N048"
 * @returns group ID เช่น "N008", "MLT", "General"
 */
export function getCustomerGroupId(custCode: string): string {
  const code = custCode.toUpperCase().trim();
  for (const group of CUSTOMER_GROUPS) {
    if (group.prefixes.some(prefix => code.startsWith(prefix))) {
      return group.id;
    }
  }
  return 'General';
}
