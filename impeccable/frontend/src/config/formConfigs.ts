// ============================================
// Form configuration per document type
// Defines field layouts based on legacy system screenshots
// ============================================

export interface FormFieldDef {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'select';
  readOnly?: boolean;
  options?: string[];
  colSpan?: number;
  hasSearch?: boolean;
}

export interface TableColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface FormConfig {
  code: string;
  titleTh: string;
  headerFields: FormFieldDef[];
  stoneFields?: FormFieldDef[];
  tableColumns: TableColumnDef[];
  footerStats?: string[];
}

// ============================================
// SPA — บันทึกสั่งซื้อพลอย (ref: legacy screenshot)
// ============================================
const spaConfig: FormConfig = {
  code: 'SPA',
  titleTh: 'บันทึกสั่งซื้อพลอย',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'purchaseDate', label: 'วันที่สั่งซื้อ', type: 'date' },
    { name: 'dueDate', label: 'วันที่ครบกำหนด', type: 'date' },
    { name: 'totalQty', label: 'รวม', type: 'number' },
    { name: 'supplierCode', label: 'ผู้ขาย', hasSearch: true },
    { name: 'buyer', label: 'ผู้ซื้อ' },
    { name: 'currency', label: 'สกุลเงิน', type: 'select', options: ['THB', 'USD'] },
    { name: 'receiveDate', label: 'วันที่นัดรับของ', type: 'date' },
    { name: 'totalMoney', label: 'รวมเงิน', type: 'number' },
  ],
  stoneFields: [
    { name: 'color', label: 'สี' },
    { name: 'shape', label: 'รูปทรง' },
    { name: 'size', label: 'ขนาด' },
    { name: 'characteristic', label: 'ลักษณะ', type: 'select', options: ['FAC', 'CAB'] },
    { name: 'grade', label: 'เกรด', type: 'select', options: ['A', 'B', 'C'] },
    { name: 'height', label: 'ความสูง' },
    { name: 'stoneName', label: 'พลอย', colSpan: 2 },
    { name: 'unit', label: 'หน่วยนับ' },
    { name: 'pricePerCarat', label: 'ราคา/กะรัต', type: 'number' },
    { name: 'lastPrice', label: 'ราคาล่าสุด', type: 'number' },
    { name: 'weight', label: 'น้ำหนัก', type: 'number' },
    { name: 'orderNumber', label: 'ออเดอร์', colSpan: 2 },
    { name: 'jobNumber', label: 'เบอร์งาน' },
    { name: 'useStone', label: 'ใช้พลอย', type: 'number' },
    { name: 'price', label: 'ราคา', type: 'number' },
    { name: 'totalAmnt', label: 'รวม', type: 'number' },
    { name: 'remark', label: 'หมายเหตุ', colSpan: 2 },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'stoneCode', label: 'พลอย' },
    { key: 'color', label: 'สี' },
    { key: 'shape', label: 'รูปทรง' },
    { key: 'size', label: 'ขนาด(มม.)' },
    { key: 'char', label: 'ลักษณะ' },
    { key: 'grade', label: 'เกรด' },
    { key: 'order', label: 'ออเดอร์' },
    { key: 'customer', label: 'ลูกค้า' },
    { key: 'height', label: 'สูง(มม.)' },
    { key: 'pricePerCt', label: 'ราคา/กะรัต', align: 'right' },
    { key: 'ctPerPc', label: 'กะรัต/ชิ้น', align: 'right' },
    { key: 'qty', label: 'จำนวน', align: 'right' },
    { key: 'price', label: 'ราคา', align: 'right' },
    { key: 'total', label: 'รวมเงิน', align: 'right' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// SRA — บันทึกรับพลอย (ref: legacy screenshot)
// ============================================
const sraConfig: FormConfig = {
  code: 'SRA',
  titleTh: 'บันทึกรับพลอย',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'refNumber', label: 'เลขที่อื่น' },
    { name: 'receiptNumber', label: 'เลขที่ใบตั้น' },
    { name: 'supplierCode', label: 'รหัสลูกค้า', hasSearch: true },
    { name: 'deliveryNote', label: 'ใบส่งของ' },
    { name: 'totalAmount', label: 'รวม', type: 'number' },
    { name: 'reason', label: 'เหตุผล', colSpan: 2 },
    { name: 'currency', label: 'สกุลเงิน', type: 'select', options: ['THB', 'USD'] },
    { name: 'totalMoney', label: 'รวมเงิน', type: 'number' },
  ],
  stoneFields: [
    { name: 'color', label: 'สี' },
    { name: 'shape', label: 'รูปทรง' },
    { name: 'size', label: 'ขนาด' },
    { name: 'characteristic', label: 'ลักษณะ', type: 'select', options: [''] },
    { name: 'grade', label: 'เกรด' },
    { name: 'stoneName', label: 'พลอย' },
    { name: 'warehouse', label: 'คลัง' },
    { name: 'unit', label: 'หน่วยนับ' },
    { name: 'height', label: 'ความสูง' },
    { name: 'weight', label: 'น้ำหนัก', type: 'number' },
    { name: 'dollarPerCt', label: '$/CT', type: 'number' },
    { name: 'subTotal', label: 'ส่วนรวม', type: 'number' },
    { name: 'price', label: 'ราคา', type: 'number' },
    { name: 'total', label: 'รวม', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'stone', label: 'พลอย' },
    { key: 'warehouse', label: 'คลัง' },
    { key: 'gradeAmm', label: 'สุง(ลม.)' },
    { key: 'dollarCt', label: '$/CT', align: 'right' },
    { key: 'weight', label: 'น้ำหนัก', align: 'right' },
    { key: 'qty', label: 'จำนวน', align: 'right' },
    { key: 'price', label: 'ราคา', align: 'right' },
    { key: 'total', label: 'รวม', align: 'right' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// SRB — บันทึกรับพลอย B (same layout as SRA)
// ============================================
const srbConfig: FormConfig = {
  ...sraConfig,
  code: 'SRB',
  titleTh: 'บันทึกรับพลอย B',
};

// ============================================
// SIR — บันทึกคืนพลอย (has own SIRPage.tsx)
// ============================================
const sirConfig: FormConfig = {
  code: 'SIR',
  titleTh: 'บันทึกคืนพลอย',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'refNumber', label: 'เลขที่อ้างอิง (SRA)', readOnly: true },
    { name: 'category', label: 'ประเภท', type: 'select', options: ['A', 'B', 'C'] },
    { name: 'supplier', label: 'ผู้ขาย', colSpan: 2 },
    { name: 'currency', label: 'สกุลเงิน', type: 'select', options: ['THB — บาท', 'USD — ดอลลาร์'] },
    { name: 'exchangeRate', label: 'อัตราแลกเปลี่ยน', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'stoneCode', label: 'รหัสพลอย' },
    { key: 'unit', label: 'หน่วย' },
    { key: 'grade', label: 'สุง' },
    { key: 'weight', label: 'น้ำหนัก', align: 'right' },
    { key: 'returnQty', label: 'คืน', align: 'right' },
    { key: 'price', label: 'ราคา', align: 'right' },
    { key: 'total', label: 'รวม', align: 'right' },
    { key: 'warehouse', label: 'คลัง' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// CHK-SPA — ตรวจสอบรับพลอยจากสั่งซื้อ (ref: legacy screenshot)
// ============================================
const chkSpaConfig: FormConfig = {
  code: 'CHK-SPA',
  titleTh: 'ตรวจสอบรับพลอยจากสั่งซื้อ',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'purchaseDate', label: 'วันที่สั่งซื้อ', type: 'date' },
    { name: 'purchaseDateEnd', label: 'ถึงวันที่', type: 'date' },
    { name: 'seller', label: 'ผู้ขาย' },
    { name: 'dueDate', label: 'กำหนดส่ง', type: 'date' },
    { name: 'dueDateEnd', label: 'ถึงวันที่', type: 'date' },
    { name: 'totalAmount', label: 'รวม', type: 'number' },
    { name: 'buyer', label: 'ผู้ซื้อ' },
    { name: 'currency', label: 'สกุลเงิน', type: 'select', options: ['THB', 'USD'] },
    { name: 'deadlineDate', label: 'วันที่ครบกำหนด', type: 'date' },
    { name: 'deadlineDateEnd', label: 'ถึงวันที่', type: 'date' },
    { name: 'totalMoney', label: 'รวมเงิน', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'stone', label: 'พลอย' },
    { key: 'color', label: 'สี' },
    { key: 'grade', label: 'สุง' },
    { key: 'aRemain', label: 'A คงเหลือ', align: 'right' },
    { key: 'bRemain', label: 'B คงเหลือ', align: 'right' },
    { key: 'purchase', label: 'สั่งซื้อ', align: 'right' },
    { key: 'receive', label: 'รับ', align: 'right' },
    { key: 'shortage', label: 'ขาด', align: 'right' },
    { key: 'status', label: 'สถานะ' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม'],
};

// ============================================
// SOA — บันทึกออเดอร์พลอย (ref: legacy screenshot)
// ============================================
const soaConfig: FormConfig = {
  code: 'SOA',
  titleTh: 'บันทึกออเดอร์พลอย',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'orderNumber', label: 'เลขที่ออเดอร์' },
    { name: 'orderDate', label: 'วันที่ออเดอร์', type: 'date' },
    { name: 'supplierCode', label: 'รหัสลูกค้า', hasSearch: true },
    { name: 'dueDate', label: 'กำหนดส่ง', type: 'date' },
    { name: 'poNumber', label: 'เลขที่ PO' },
    { name: 'itemCount', label: 'รายการ', type: 'number' },
    { name: 'jobNumber', label: 'เบอร์งาน' },
    { name: 'qty', label: 'จำนวน', type: 'number' },
    { name: 'stone', label: 'พลอย' },
    { name: 'detail', label: 'รายละเอียด' },
  ],
  stoneFields: [
    { name: 'color', label: 'สี' },
    { name: 'shape', label: 'รูปทรง' },
    { name: 'size', label: 'ขนาด' },
    { name: 'characteristic', label: 'ลักษณะ', type: 'select', options: [''] },
    { name: 'grade', label: 'เกรด' },
    { name: 'stoneName', label: 'พลอย' },
    { name: 'stoneType', label: 'ประเภท' },
    { name: 'stoneQty', label: 'จำนวน', type: 'number' },
    { name: 'useStone', label: 'ใช้พลอย' },
    { name: 'height', label: 'ความสูง' },
    { name: 'sendGrade', label: 'ส่ง', type: 'select', options: [''] },
    { name: 'note', label: 'หมายเหตุ', colSpan: 2 },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'order', label: 'ออเดอร์' },
    { key: 'group', label: 'กลุ่ม' },
    { key: 'item', label: 'รายการ' },
    { key: 'jobNo', label: 'เบอร์งาน' },
    { key: 'qty', label: 'จำนวน', align: 'right' },
    { key: 'stone', label: 'พลอย' },
    { key: 'type', label: 'ประเภท' },
    { key: 'use', label: 'ใช้' },
    { key: 'color', label: 'สี' },
    { key: 'shape', label: 'รูปทรง' },
    { key: 'size', label: 'ขนาด' },
    { key: 'char', label: 'ลักษณะ' },
    { key: 'grade', label: 'เกรด' },
    { key: 'gradeAmm', label: 'สุง(ส.ม.)' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// SIA — บันทึกเบิกพลอย (same layout as SRA)
// ============================================
const siaConfig: FormConfig = {
  ...sraConfig,
  code: 'SIA',
  titleTh: 'บันทึกเบิกพลอย',
};

// ============================================
// SIB — บันทึกเบิกพลอย B (ref: legacy screenshot)
// ============================================
const sibConfig: FormConfig = {
  code: 'SIB',
  titleTh: 'บันทึกเบิกพลอย B',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'refNumber', label: 'เลขที่อื่น' },
    { name: 'supplierCode', label: 'รหัสลูกค้า', hasSearch: true },
    { name: 'total', label: 'รวม', type: 'number' },
    { name: 'reason', label: 'เหตุผล', colSpan: 2 },
    { name: 'currency', label: 'สกุลเงิน', type: 'select', options: ['THB', 'USD'] },
    { name: 'totalMoney', label: 'รวมเงิน', type: 'number' },
  ],
  stoneFields: [
    { name: 'color', label: 'สี' },
    { name: 'shape', label: 'รูปทรง' },
    { name: 'size', label: 'ขนาด' },
    { name: 'characteristic', label: 'ลักษณะ', type: 'select', options: [''] },
    { name: 'grade', label: 'เกรด' },
    { name: 'stoneName', label: 'พลอย' },
    { name: 'warehouse', label: 'คลัง' },
    { name: 'unit', label: 'หน่วยนับ' },
    { name: 'checkGrade', label: 'ตรวจสุง' },
    { name: 'weight', label: 'น้ำหนัก', type: 'number' },
    { name: 'useStone', label: 'ใช้พลอย' },
    { name: 'price', label: 'ราคา', type: 'number' },
    { name: 'total', label: 'รวม', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'stone', label: 'พลอย' },
    { key: 'unit', label: 'หน่วย' },
    { key: 'grade', label: 'สุง' },
    { key: 'warehouse', label: 'คลัง' },
    { key: 'weight', label: 'น้ำหนัก', align: 'right' },
    { key: 'use', label: 'ใช้', align: 'right' },
    { key: 'price', label: 'ราคา', align: 'right' },
    { key: 'total', label: 'รวม', align: 'right' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// SIS — บันทึกส่งพลอย งานออเดอร์ (ref: legacy screenshot)
// ============================================
const sisConfig: FormConfig = {
  code: 'SIS',
  titleTh: 'บันทึกส่งพลอย งานออเดอร์',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'total', label: 'รวม', type: 'number' },
    { name: 'totalMoney', label: 'รวมเงิน', type: 'number' },
    { name: 'reason', label: 'เหตุผล', colSpan: 2 },
    { name: 'note', label: 'หมายเหตุ', colSpan: 2 },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'order', label: 'ออเดอร์' },
    { key: 'item', label: 'รายการ' },
    { key: 'jobNo', label: 'เบอร์งาน' },
    { key: 'stone', label: 'พลอย' },
    { key: 'type', label: 'ประเภท' },
    { key: 'grade', label: 'สุง' },
    { key: 'weight', label: 'น้ำหนัก', align: 'right' },
    { key: 'use', label: 'ใช้', align: 'right' },
    { key: 'price', label: 'ราคา', align: 'right' },
    { key: 'total', label: 'รวม', align: 'right' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// SIP — บันทึกเบิกพลอย งานซ่อม (ref: legacy screenshot)
// ============================================
const sipConfig: FormConfig = {
  code: 'SIP',
  titleTh: 'บันทึกเบิกพลอย งานซ่อม',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'refNumber', label: 'เลขที่อื่น' },
    { name: 'department', label: 'แผนก' },
    { name: 'reason', label: 'เหตุผล' },
    { name: 'stone', label: 'พลอย' },
    { name: 'orderNumber', label: 'เลขที่ออเดอร์' },
    { name: 'itemCount', label: 'รายการ', type: 'number' },
    { name: 'jobNumber', label: 'เบอร์งาน' },
    { name: 'detail', label: 'รายละเอียด', colSpan: 2 },
  ],
  stoneFields: [
    { name: 'color', label: 'สี' },
    { name: 'shape', label: 'รูปทรง' },
    { name: 'size', label: 'ขนาด' },
    { name: 'characteristic', label: 'ลักษณะ', type: 'select', options: [''] },
    { name: 'grade', label: 'เกรด' },
    { name: 'stoneQty', label: 'จำนวนเม็ด', type: 'number' },
    { name: 'price', label: 'ราคา', type: 'number' },
    { name: 'total', label: 'รวม', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'department', label: 'แผนก' },
    { key: 'order', label: 'ออเดอร์' },
    { key: 'item', label: 'รายการ' },
    { key: 'jobNo', label: 'เบอร์งาน' },
    { key: 'refNo', label: 'เลขที่อื่น' },
    { key: 'reason', label: 'เหตุผล' },
    { key: 'stone', label: 'พลอย' },
    { key: 'qty', label: 'จำนวน', align: 'right' },
    { key: 'price', label: 'ราคา', align: 'right' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// SSA — บันทึกออเดอร์พลอย ห้องตัวอย่าง (ref: legacy screenshot)
// ============================================
const ssaConfig: FormConfig = {
  code: 'SSA',
  titleTh: 'บันทึกออเดอร์พลอย ห้องตัวอย่าง',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'supplierCode', label: 'รหัสลูกค้า' },
    { name: 'note', label: 'หมายเหตุ', colSpan: 2 },
    { name: 'psNo', label: 'PS No' },
    { name: 'pdNo', label: 'PD No' },
    { name: 'jobNumber', label: 'เบอร์งาน' },
    { name: 'dateOther1', label: 'วันที่อื่น', type: 'date' },
    { name: 'dateOther2', label: 'วันที่อื่น', type: 'date' },
  ],
  stoneFields: [
    { name: 'color', label: 'สี' },
    { name: 'shape', label: 'รูปทรง' },
    { name: 'size', label: 'ขนาด' },
    { name: 'characteristic', label: 'ลักษณะ', type: 'select', options: [''] },
    { name: 'grade', label: 'เกรด' },
    { name: 'weight', label: 'น้ำหนัก', type: 'number' },
    { name: 'height', label: 'ความสูง' },
    { name: 'src', label: 'S.R.C.' },
    { name: 'seed', label: 'เม็ด', type: 'number' },
    { name: 'useStone', label: 'ใช้พลอย' },
    { name: 'price', label: 'ราคา', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'psNo', label: 'PS No' },
    { key: 'pdNo', label: 'PD No' },
    { key: 'jobNo', label: 'เบอร์งาน' },
    { key: 'customer', label: 'ลูกค้า' },
    { key: 'color', label: 'สี' },
    { key: 'shape', label: 'รูปทรง' },
    { key: 'size', label: 'ขนาด' },
    { key: 'char', label: 'ลักษณะ' },
    { key: 'grade', label: 'เกรด' },
    { key: 'height', label: 'สุง' },
    { key: 'seed', label: 'เม็ด', align: 'right' },
    { key: 'useStone', label: 'ใช้พลอย', align: 'right' },
    { key: 'workUse', label: 'งานใช้พลอย', align: 'right' },
    { key: 'sampleWork', label: 'งานตัวอย่าง', align: 'right' },
    { key: 'src', label: 'S.R.C.' },
    { key: 'price', label: 'ราคา', align: 'right' },
    { key: 'weight', label: 'น้ำหนัก', align: 'right' },
    { key: 'warehouse', label: 'คลัง' },
    { key: 'note', label: 'หมายเหตุ' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// SIM — บันทึกส่งพลอย ห้องตัวอย่าง (ref: legacy screenshot)
// ============================================
const simConfig: FormConfig = {
  code: 'SIM',
  titleTh: 'บันทึกส่งพลอย ห้องตัวอย่าง',
  headerFields: [
    { name: 'docNumber', label: 'เลขที่', readOnly: true },
    { name: 'docDate', label: 'วันที่เอกสาร', type: 'date' },
    { name: 'refNumber', label: 'เลขที่อื่น' },
    { name: 'supplierCode', label: 'รหัสลูกค้า', hasSearch: true },
    { name: 'supplierName', label: '' },
    { name: 'total', label: 'รวม', type: 'number' },
    { name: 'reason', label: 'เหตุผล', colSpan: 2 },
    { name: 'currency', label: 'สกุลเงิน', type: 'select', options: ['THB', 'USD'] },
    { name: 'totalMoney', label: 'รวมเงิน', type: 'number' },
  ],
  tableColumns: [
    { key: 'seq', label: 'ลำดับ' },
    { key: 'stone', label: 'พลอย' },
    { key: 'color', label: 'สี' },
    { key: 'shape', label: 'รูปทรง' },
    { key: 'size', label: 'ขนาด' },
    { key: 'char', label: 'ลักษณะ' },
    { key: 'grade', label: 'เกรด' },
    { key: 'height', label: 'สุง' },
    { key: 'seed', label: 'เม็ง', align: 'right' },
    { key: 'warehouse', label: 'คลัง' },
    { key: 'weight', label: 'น้ำหนัก', align: 'right' },
    { key: 'use', label: 'ใช้', align: 'right' },
    { key: 'price', label: 'ราคา', align: 'right' },
    { key: 'total', label: 'รวม', align: 'right' },
  ],
  footerStats: ['รายการ', 'จำนวนรวม', 'มูลค่ารวม'],
};

// ============================================
// CFM-STK — Confirm Stock (ref: legacy screenshot)
// ============================================
const cfmStkConfig: FormConfig = {
  code: 'CFM-STK',
  titleTh: 'Confirm Stock',
  headerFields: [
    { name: 'stone', label: 'Stone', hasSearch: true },
  ],
  tableColumns: [
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
    { key: 'size', label: 'Size' },
    { key: 'spec', label: 'Spec' },
    { key: 'grade', label: 'Grade' },
    { key: 'in', label: 'In', align: 'right' },
    { key: 'out', label: 'Out', align: 'right' },
    { key: 'return', label: 'Return', align: 'right' },
    { key: 'totalQty', label: 'Total Qty', align: 'right' },
    { key: 'totalAmnt', label: 'Total Amnt', align: 'right' },
  ],
  footerStats: ['Total List', 'Stock Qty', 'Stock Amnt'],
};

// ============================================
// Lookup map: code => config
// ============================================
export const formConfigMap: Record<string, FormConfig> = {
  SPA: spaConfig,
  SRA: sraConfig,
  SRB: srbConfig,
  SIR: sirConfig,
  'CHK-SPA': chkSpaConfig,
  SOA: soaConfig,
  SIA: siaConfig,
  SIB: sibConfig,
  SIS: sisConfig,
  SIP: sipConfig,
  SSA: ssaConfig,
  SIM: simConfig,
  'CFM-STK': cfmStkConfig,
};
