// src/utils/exportOrderDetailExcel.ts
// Full-column Excel export for the Order Detail line table. Mirrors ItemSum's
// legacy format exactly (headers on row 1, 56 columns, strict formatting).
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ORDER_DETAIL_COLUMNS } from '../config/orderDetailColumns';

// Synthetic UI-only columns (photo thumbnail) are included as empty columns to match legacy CSV structure perfectly.
// Excluded columns based on user request: FQC, Finish, Export, and trailing sales/remark columns.
const EXPORT_COLUMNS = ORDER_DETAIL_COLUMNS.filter(c =>
  !['FQCQty', 'FinishQty', 'ExportQty', 'InvoiceNo', 'AWB', 'InvoiceDate', 'OrdRemark'].includes(c.key)
);

const EMU_PER_PIXEL = 9525; // ค่ามาตรฐานคงที่ของ Office: 914400 EMU/inch, 96px/inch

function pxToEMU(px: number): number {
  return Math.round(px * EMU_PER_PIXEL);
}

const PHOTO_IMG_WIDTH = 60;
const PHOTO_IMG_HEIGHT = 42;
const PHOTO_COL_PX = 98; // Width 14 in Excel units ≈ 98px
const PHOTO_ROW_PX = 51; // Height 38pt ≈ 51px


function numFmtFor(excelType: string | undefined): string | undefined {
  switch (excelType) {
    case 'int':
      return '#,##0';
    case 'currency':
      return '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
    case 'date':
      return 'dd/mm/yyyy'; // Native Excel date format
    case 'text':
      return '@'; // Strict Text
    case 'general':
    default:
      return undefined; // General
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

// Fetch image buffer with fallback
async function fetchImageAsBuffer(itemNo: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`/api/photos/ps/${encodeURIComponent(itemNo)}`);
    if (res.ok && res.headers.get('content-type')?.includes('image')) return await res.arrayBuffer();

    const resCad = await fetch(`/api/photos/cad/${encodeURIComponent(itemNo)}`);
    if (resCad.ok && resCad.headers.get('content-type')?.includes('image')) return await resCad.arrayBuffer();
  } catch (err) {
    console.error("Failed to fetch image for", itemNo, err);
  }
  return null;
}

export async function exportOrderDetailExcel(
  lines: Record<string, unknown>[],
  header: Record<string, unknown> | null | undefined,
  pageTitle: string,
  onSuccess?: (filePath: string) => void
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Order Detail');

  // Row 1: real column headers. Exact match to legacy structure.
  const headerRowIdx = 1;
  const headerRow = worksheet.getRow(headerRowIdx);
  EXPORT_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    cell.font = { name: 'Calibri', size: 10, bold: true };

    // Check if it's a purple column (the specific remark columns)
    const isPurple = ['RecRemark', 'EnaRemark', 'CryRemark', 'AsmRemark', 'ShfRemark', 'PkRemark', 'ProdRemark'].includes(col.key);

    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: isPurple };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isPurple ? 'FFE4DAF2' : 'FFFFEAB0' } };

    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Adjust column widths (1 Excel unit ~= 7.5 pixels)
    if (col.key === '_photo') {
      worksheet.getColumn(i + 1).width = 14; // ~105 pixels (adds padding around 60px image)
    } else {
      worksheet.getColumn(i + 1).width = (col.width || 100) / 7.5;
    }
  });
  headerRow.height = 28;

  // Add Auto-Filter to the header row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EXPORT_COLUMNS.length }
  };

  const photoColIdx = EXPORT_COLUMNS.findIndex(c => c.key === '_photo');

  // Data rows from row 2 (Async loop to fetch images)
  for (let rIdx = 0; rIdx < lines.length; rIdx++) {
    const line = lines[rIdx];
    const dataRow = worksheet.getRow(headerRowIdx + 1 + rIdx);
    dataRow.height = 38; // ~50 pixels (adds padding around 42px image)
    const isClosed = line.CloseStatus === 'Y';

    EXPORT_COLUMNS.forEach((col, cIdx) => {
      const cell = dataRow.getCell(cIdx + 1);
      const raw = line[col.key];
      const isPurple = ['RecRemark', 'EnaRemark', 'CryRemark', 'AsmRemark', 'ShfRemark', 'PkRemark', 'ProdRemark'].includes(col.key);

      // Center ALL cells per user request + Wrap Text for purple columns
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: isPurple };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.numFmt = numFmtFor(col.excelType);

      // Null, undefined, or 0 becomes empty string
      if (raw == null || raw === 0 || raw === '0') {
        cell.value = "";
      } else {
        switch (col.excelType) {
          case 'date': {
            const d = new Date(String(raw));
            if (!isNaN(d.getTime())) {
              // Convert to UTC to avoid timezone shift in Excel
              cell.value = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            } else {
              cell.value = String(raw);
            }
            break;
          }
          case 'int':
          case 'currency':
            const num = Number(raw);
            cell.value = num === 0 ? "" : num;
            break;
          case 'text':
            cell.value = String(raw);
            break;
          case 'general':
          default:
            cell.value = raw as ExcelJS.CellValue;
            break;
        }
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

    // Embed Image
    if (photoColIdx !== -1) {
      const itemNo = line.ItemNo as string;
      if (itemNo) {
        const buffer = await fetchImageAsBuffer(itemNo);
        if (buffer) {
          try {
            const imageId = workbook.addImage({
              buffer: buffer,
              extension: 'jpeg', // works for png too in exceljs
            });
            const colOffsetPx = (PHOTO_COL_PX - PHOTO_IMG_WIDTH) / 2;
            const rowOffsetPx = (PHOTO_ROW_PX - PHOTO_IMG_HEIGHT) / 2;

            worksheet.addImage(imageId, {
              tl: {
                nativeCol: photoColIdx,
                nativeColOff: pxToEMU(colOffsetPx),
                nativeRow: headerRowIdx + rIdx,
                nativeRowOff: pxToEMU(rowOffsetPx),
              },
              ext: { width: PHOTO_IMG_WIDTH, height: PHOTO_IMG_HEIGHT },
              editAs: 'oneCell'
            });
          } catch (e) {
            console.error("Failed to add image to workbook", e);
          }
        }
      }
    }
  }

  // Excel "freeze panes"
  const freezeIdx = EXPORT_COLUMNS.findIndex((c) => c.key === 'Stone');
  worksheet.views = [
    {
      state: 'frozen',
      xSplit: freezeIdx !== -1 ? freezeIdx + 1 : 15,
      ySplit: headerRowIdx,
      topLeftCell: `${columnLetter(freezeIdx !== -1 ? freezeIdx + 2 : 16)}${headerRowIdx + 1}`,
      zoomScale: 80 // Set zoom level to 80%
    },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeTitle = pageTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const defaultFilename = `ItemSum_${dateStr}.xlsx`;

  // File System Access API for custom save location
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: defaultFilename,
        types: [{
          description: 'Excel Workbook',
          accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(buffer);
      await writable.close();

      if (onSuccess) {
        onSuccess(handle.name);
      }
      return;
    } catch (err: any) {
      // User cancelled the picker, don't fallback to standard download
      if (err.name === 'AbortError') return;
      console.warn("File System Access API failed, falling back to standard download", err);
    }
  }

  // Fallback for browsers without File System Access API
  saveAs(new Blob([buffer]), defaultFilename);
  if (onSuccess) {
    onSuccess('Downloads folder (Standard Download)');
  }
}
