// src/utils/exportOrderDetailExcel.ts
// Full-column Excel export for the Order Detail line table. Mirrors exportPOTrackerExcel.ts's
// styling conventions (Calibri 10pt, bold header, per-column numFmt, red fill/font for negative
// alert values) for visual consistency between the app's two Excel exports.
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ORDER_DETAIL_COLUMNS } from '../config/orderDetailColumns';

// Synthetic UI-only columns (row number, photo thumbnail) carry no exportable data field —
// embedding actual photo images via worksheet.addImage is explicitly out of scope here.
const EXPORT_COLUMNS = ORDER_DETAIL_COLUMNS.filter((c) => !c.key.startsWith('_'));

function numFmtFor(excelType: string | undefined): string {
  switch (excelType) {
    case 'date':
      return 'dd/mm/yyyy';
    case 'int':
      return '#,##0';
    case 'currency':
      return '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
    default:
      return '@';
  }
}

function columnLetter(n: number): string {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

export async function exportOrderDetailExcel(
  lines: Record<string, unknown>[],
  header: Record<string, unknown> | null | undefined,
  pageTitle: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Order Detail');
  const colCount = EXPORT_COLUMNS.length;

  // Rows 1-2: summary block — page-level fields (Customer/PO/Status/Totals) aren't per-line
  // data, but the user wants "every column" represented, so they go here instead of being
  // silently dropped.
  worksheet.mergeCells(1, 1, 1, colCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `${pageTitle} — ${header?.CustCode ?? ''} ${header?.CustName ?? ''}`.trim();
  titleCell.font = { name: 'Calibri', size: 12, bold: true };

  worksheet.mergeCells(2, 1, 2, colCount);
  const summaryCell = worksheet.getCell(2, 1);
  summaryCell.value =
    `PO: ${header?.PONo ?? '-'}   |   Status: ${header?.OrdStatus ?? '-'} / ${header?.CloseStatus ?? '-'}` +
    `   |   Total Qty: ${header?.TotalQty ?? '-'}   |   Total Amount: ${header?.TotalAmount ?? '-'}`;
  summaryCell.font = { name: 'Calibri', size: 10, italic: true };

  // Row 4: real column headers (row 3 left blank as a visual gap). Always uses the FULL
  // registry regardless of which columns are currently toggled visible on screen — this is
  // what guarantees "every column, none missing."
  const headerRowIdx = 4;
  const headerRow = worksheet.getRow(headerRowIdx);
  EXPORT_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getColumn(i + 1).width = Math.max(8, Math.round(col.width / 7));
  });
  headerRow.height = 28;

  // Data rows from row 5
  lines.forEach((line, rIdx) => {
    const row = worksheet.getRow(headerRowIdx + 1 + rIdx);
    const isClosed = line.CloseStatus === 'Y';

    EXPORT_COLUMNS.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      const raw = line[col.key];
      cell.alignment = { horizontal: col.align, vertical: 'middle' };
      cell.numFmt = numFmtFor(col.excelType);

      switch (col.excelType) {
        case 'date':
          cell.value = raw ? new Date(String(raw)) : null;
          break;
        case 'int':
        case 'currency':
          cell.value = raw == null || raw === '' ? null : Number(raw);
          break;
        default:
          cell.value = raw == null ? '' : String(raw);
      }

      if (isClosed) {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF999999' } };
      } else if (col.negativeIsAlert && typeof cell.value === 'number' && cell.value < 0) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFC00000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE8EB' } };
      } else {
        cell.font = { name: 'Calibri', size: 10 };
      }
    });
  });

  // Excel "freeze panes" approximates the on-screen sticky-column behavior, computed from
  // ItemNo's position in the registry rather than hardcoded.
  const itemNoIdx = EXPORT_COLUMNS.findIndex((c) => c.key === 'ItemNo');
  worksheet.views = [
    {
      state: 'frozen',
      xSplit: itemNoIdx + 1,
      ySplit: headerRowIdx,
      topLeftCell: `${columnLetter(itemNoIdx + 2)}${headerRowIdx + 1}`,
    },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeTitle = pageTitle.replace(/[^a-zA-Z0-9]/g, '_');
  saveAs(new Blob([buffer]), `OrderDetail_${safeTitle}_${dateStr}.xlsx`);
}
