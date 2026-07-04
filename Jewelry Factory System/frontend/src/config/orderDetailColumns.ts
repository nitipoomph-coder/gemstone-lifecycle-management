// src/config/orderDetailColumns.ts
// Single source of truth for the Order Detail line table, its "View Columns" popover,
// and the full-column Excel export — keeps all three in sync (the old export silently
// dropped InvoiceDate because columns were hand-listed separately in 3 places).

export type ColGroup = 'core' | 'info' | 'sales' | 'production' | 'remark';
export type ColAlign = 'left' | 'center' | 'right';
export type ExcelType = 'text' | 'date' | 'int' | 'currency';

export interface OrderDetailColumn {
  key: string;
  label: string;
  group: ColGroup;
  width: number;
  align: ColAlign;
  /** Always visible + sticky to the left edge regardless of active preset. */
  locked?: boolean;
  excelType?: ExcelType;
  /** Negative values render as a flat danger-colored alert (production qty + balance). */
  negativeIsAlert?: boolean;
  /** Editable only inside the line detail drawer's remarks form; read-only everywhere else. */
  readOnly?: boolean;
  /** Suffix appended to formatted numeric values on screen, e.g. "g" for weights. */
  unit?: string;
}

export const ORDER_DETAIL_COLUMNS: OrderDetailColumn[] = [
  // ── core: minimal sticky identity columns, always visible in every preset ──
  { key: '_rowNo', label: 'No.', group: 'core', width: 44, align: 'center', locked: true },
  { key: '_photo', label: 'Photo', group: 'core', width: 64, align: 'center', locked: true },
  { key: 'ItemNo', label: 'Item No.', group: 'core', width: 130, align: 'left', locked: true, excelType: 'text' },

  // ── info: item/date/qty essentials useful in every preset, not sticky ──
  { key: 'ItemDesc', label: 'Description', group: 'info', width: 240, align: 'left', excelType: 'text' },
  { key: 'ItemMat', label: 'Metal', group: 'info', width: 70, align: 'center', excelType: 'text' },
  { key: 'ItemSize', label: 'Size', group: 'info', width: 70, align: 'center', excelType: 'text' },
  { key: 'Stone', label: 'Stone', group: 'info', width: 90, align: 'left', excelType: 'text' },
  { key: 'Plating', label: 'Plating', group: 'info', width: 90, align: 'left', excelType: 'text' },
  { key: 'CustItem', label: 'Cust Item', group: 'info', width: 110, align: 'left', excelType: 'text' },
  { key: 'SilverWt', label: 'Silver Wt.', group: 'info', width: 90, align: 'right', excelType: 'int', unit: 'g' },
  { key: 'FinishWt', label: 'Finish Wt.', group: 'info', width: 90, align: 'right', excelType: 'int', unit: 'g' },
  { key: 'Qty', label: 'Qty', group: 'info', width: 80, align: 'right', excelType: 'int' },
  { key: 'OrdDate', label: 'Order Date', group: 'info', width: 100, align: 'center', excelType: 'date' },
  { key: 'DueDate', label: 'Factory Due', group: 'info', width: 100, align: 'center', excelType: 'date' },
  { key: 'CustDueDate', label: 'Cust Due', group: 'info', width: 100, align: 'center', excelType: 'date' },
  { key: 'QCDate', label: 'QC Date', group: 'info', width: 100, align: 'center', excelType: 'date' },

  // ── sales & shipping (Sales preset) ──
  { key: 'OrdNo', label: 'Order No.', group: 'sales', width: 110, align: 'left', excelType: 'text' },
  { key: 'LineNo', label: 'Line', group: 'sales', width: 60, align: 'center', excelType: 'text' },
  { key: 'PONo', label: 'PO Number', group: 'sales', width: 130, align: 'left', excelType: 'text' },
  { key: 'Price', label: 'Price', group: 'sales', width: 90, align: 'right', excelType: 'currency' },
  { key: 'Amount', label: 'Amount', group: 'sales', width: 110, align: 'right', excelType: 'currency' },
  { key: 'Sales', label: 'Sales', group: 'sales', width: 90, align: 'left', excelType: 'text' },
  { key: 'Destination', label: 'Destination', group: 'sales', width: 130, align: 'left', excelType: 'text' },
  { key: 'InvoiceNo', label: 'Invoice No.', group: 'sales', width: 110, align: 'left', excelType: 'text' },
  { key: 'InvoiceDate', label: 'Invoice Date', group: 'sales', width: 100, align: 'center', excelType: 'date' },
  { key: 'AWB', label: 'AWB', group: 'sales', width: 110, align: 'left', excelType: 'text' },

  // ── production tracking pipeline (Production preset) — order matches the original PROD_STEPS sequence ──
  { key: 'StoneQty', label: 'Stone', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'FindingQty', label: 'Finding', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'WaxQty', label: 'Wax', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'WaxSetQty', label: 'Wax Set', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'CastQty', label: 'Cast', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'GrindQty', label: 'Grind', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'EpoxQty', label: 'Epoxy', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'SolderQty', label: 'Solder', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'FilingQty', label: 'Filing', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'ControlQty', label: 'Control', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'SetQty', label: 'Setting', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'PolishQty', label: 'Polish', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'PQCQty', label: 'PQC', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'PlatingQty', label: 'Plating', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'AssemQty', label: 'Assemble', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'FQCQty', label: 'FQC', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'PackQty', label: 'Pack', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'FinishQty', label: 'Finish', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'ExportQty', label: 'Export', group: 'production', width: 76, align: 'right', excelType: 'int', negativeIsAlert: true },
  { key: 'BalQty', label: 'Balance', group: 'production', width: 84, align: 'right', excelType: 'int', negativeIsAlert: true },

  // ── remarks: sales & production (Remarks preset) ──
  { key: 'RecRemark', label: 'Receive', group: 'remark', width: 160, align: 'left', excelType: 'text' },
  { key: 'EnaRemark', label: 'Enamel', group: 'remark', width: 160, align: 'left', excelType: 'text' },
  { key: 'CryRemark', label: 'Crystal', group: 'remark', width: 160, align: 'left', excelType: 'text' },
  { key: 'AsmRemark', label: 'Assembly', group: 'remark', width: 160, align: 'left', excelType: 'text' },
  { key: 'ShfRemark', label: 'Shelf', group: 'remark', width: 160, align: 'left', excelType: 'text' },
  { key: 'PkRemark', label: 'Pack', group: 'remark', width: 160, align: 'left', excelType: 'text' },
  { key: 'ProdRemark', label: 'Prod Remark', group: 'remark', width: 160, align: 'left', excelType: 'text' },
  { key: 'OrdRemark', label: 'Order Remark', group: 'remark', width: 180, align: 'left', excelType: 'text', readOnly: true },

  // Deliberately excluded — present in the backend response but not shown in the current UI
  // or export (legacy/internal-looking fields): GroupQty, ItemStatus, FinishStatus.
  // To surface one later: add an entry here (e.g. group: 'info') and it will automatically
  // flow into the table, popover, and Excel export — no other code change needed.
];

export const ORDER_DETAIL_COLUMNS_BY_KEY: Record<string, OrderDetailColumn> = Object.fromEntries(
  ORDER_DETAIL_COLUMNS.map((c) => [c.key, c])
);

export const LOCKED_COLUMN_KEYS = ORDER_DETAIL_COLUMNS.filter((c) => c.locked).map((c) => c.key);

function keysOf(...groups: ColGroup[]): string[] {
  return ORDER_DETAIL_COLUMNS.filter((c) => groups.includes(c.group)).map((c) => c.key);
}

export type ColumnPreset = 'Sales' | 'Production' | 'Remarks' | 'All';

export const COLUMN_GROUP_PRESETS: Record<ColumnPreset, string[]> = {
  Sales: keysOf('core', 'info', 'sales'),
  Production: keysOf('core', 'info', 'production'),
  Remarks: keysOf('core', 'info', 'remark'),
  All: ORDER_DETAIL_COLUMNS.map((c) => c.key),
};
