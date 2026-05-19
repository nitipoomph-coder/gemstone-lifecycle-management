// ============================================
// Procurement & Receiving API Routes
// SPA (สั่งซื้อพลอย), SRA (รับพลอย), SRB (รับพลอย B), SIR (คืนพลอย)
// ============================================
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// ─── Cache helpers ────────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    console.log(`[CACHE HIT] ${key}`);
    return entry.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Table Configuration Helper ───────────────────────────────────────────────
function getTableConfig(docTypeOrNo) {
  const upper = docTypeOrNo.toUpperCase();
  const code = upper.substring(0, 3);

  if (code === 'SPA' || upper.startsWith('SPA')) {
    return {
      type: 'SPA',
      headerTable: 'dbInventory.dbo.STPOStockHD',
      detailTable: 'dbInventory.dbo.STPOStockDT',
      idCol: 'POStockID',
      qtyCol: 'SumGoodQty',
      amtCol: 'SumGoodAmnt',
      prefix: 'SPA',
      detailQtyCol: 'GoodQty',
      detailWeightCol: 'GoodWeight',
      detailPriceCol: 'GoodPrice',
      detailAmntCol: 'GoodAmnt',
      detailUnitCol: 'GoodUnitCode',
      hasPO: true,
      hasRemark: true,
      hasCTPrice: true,
      hasGoodDesc: true
    };
  }
  if (code === 'SRA' || upper.startsWith('SRA')) {
    return {
      type: 'SRA',
      headerTable: 'dbInventory.dbo.STRecStockHD',
      detailTable: 'dbInventory.dbo.STRecStockDT',
      idCol: 'RecStockID',
      qtyCol: 'SumGoodQty',
      amtCol: 'SumGoodAmnt',
      prefix: 'SRA',
      detailQtyCol: 'GoodQty',
      detailWeightCol: 'GoodWeight',
      detailPriceCol: 'GoodPrice',
      detailAmntCol: 'GoodAmnt',
      detailUnitCol: 'GoodUnitCode',
      hasPO: false,
      hasRemark: true,
      hasCTPrice: true,
      hasGoodDesc: false
    };
  }
  if (code === 'SRB' || upper.startsWith('SRB')) {
    return {
      type: 'SRB',
      headerTable: 'dbInventory.dbo.STRecStockHD',
      detailTable: 'dbInventory.dbo.STRecStockDT',
      idCol: 'RecStockID',
      qtyCol: 'SumGoodQty',
      amtCol: 'SumGoodAmnt',
      prefix: 'SRB',
      detailQtyCol: 'GoodQty',
      detailWeightCol: 'GoodWeight',
      detailPriceCol: 'GoodPrice',
      detailAmntCol: 'GoodAmnt',
      detailUnitCol: 'GoodUnitCode',
      hasPO: false,
      hasRemark: true,
      hasCTPrice: true,
      hasGoodDesc: false
    };
  }
  if (code === 'SIR' || upper.startsWith('SIR')) {
    return {
      type: 'SIR',
      headerTable: 'dbInventory.dbo.STRetStockHD',
      detailTable: 'dbInventory.dbo.STRetStockDT',
      idCol: 'RetStockID',
      qtyCol: 'SumGoodQty',
      amtCol: 'SumGoodAmnt',
      prefix: 'SIR',
      detailQtyCol: 'GoodQty',
      detailWeightCol: 'GoodWeight',
      detailPriceCol: 'GoodPrice',
      detailAmntCol: 'GoodAmnt',
      detailUnitCol: 'GoodUnitCode',
      hasPO: false,
      hasRemark: false,
      hasCTPrice: false,
      hasGoodDesc: false
    };
  }

  throw new Error(`Unsupported document identifier: ${docTypeOrNo}`);
}

// ============================================
// GET /api/procurement/documents/:docType
// ดึงรายการเอกสาร (Document List) ตาม docType
// docType: SPA | SRA | SRB | SIR
// ============================================
router.get('/documents/:docType', async (req, res) => {
  const { docType } = req.params;
  const validTypes = ['SPA', 'SRA', 'SRB', 'SIR'];

  if (!validTypes.includes(docType.toUpperCase())) {
    return res.json({ ok: false, error: `Invalid document type: ${docType}` });
  }

  const cacheKey = `proc_docs_${docType}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ok: true, data: cached });

  try {
    const pool = await getPool();
    const config = getTableConfig(docType);

    const queryStr = `
      SELECT TOP 200
        h.DocuNo AS docNumber,
        CONVERT(VARCHAR(10), h.DocuDate, 103) AS docDate,
        ISNULL(h.VendorCode, '') AS supplier,
        ISNULL(v.VendorName, '') AS supplierName,
        ISNULL(h.CurrCode, 'THB') AS currency,
        ISNULL(h.${config.amtCol}, 0) AS totalAmount,
        ISNULL(h.${config.qtyCol}, 0) AS totalQty,
        ISNULL(h.DocuStatus, '') AS status
      FROM ${config.headerTable} h
      LEFT JOIN dbInventory.dbo.GMVendor v ON h.VendorCode = v.VendorCode
      WHERE h.DocuNo LIKE @prefix + '%'
      ORDER BY h.DocuNo DESC
    `;

    const result = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .query(queryStr);

    const docs = result.recordset;
    setCache(cacheKey, docs);

    console.log(`[PROC] ${docType} documents: ${docs.length} records`);
    res.json({ ok: true, data: docs });
  } catch (err) {
    console.error(`❌ [PROC] Error fetching ${docType} documents:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/procurement/document/:docNo
// ดึงรายละเอียดเอกสาร (Document Detail) ตาม DocNo
// ============================================
router.get('/document/:docNo', async (req, res) => {
  const { docNo } = req.params;
  const cacheKey = `proc_doc_${docNo}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ok: true, data: cached });

  try {
    const pool = await getPool();
    const config = getTableConfig(docNo);

    // Dynamic fields mapping based on document type
    let dueDateSelect = "'' AS dueDate";
    let refSelect = "'' AS refNumber";
    let invSelect = "'' AS invoiceNumber";
    let remarkSelect = "'' AS remark";
    let buyerSelect = "'' AS buyer";

    if (config.type === 'SPA') {
      dueDateSelect = "ISNULL(CONVERT(VARCHAR(10), h.DueDate, 103), '') AS dueDate";
      buyerSelect = "ISNULL(h.BuyName, '') AS buyer";
    } else if (config.type === 'SRA' || config.type === 'SRB') {
      refSelect = "ISNULL(h.RefDocuNo, '') AS refNumber";
      remarkSelect = "ISNULL(h.TransNo, '') AS remark";
    } else if (config.type === 'SIR') {
      refSelect = "ISNULL(h.RefDocuNo, '') AS refNumber";
    }

    // 1. Fetch Header
    const headerQuery = `
      SELECT
        h.DocuNo AS docNumber,
        CONVERT(VARCHAR(10), h.DocuDate, 103) AS docDate,
        ISNULL(CONVERT(VARCHAR(10), h.DocuDate, 103), '') AS purchaseDate,
        ${dueDateSelect},
        '' AS receiveDate,
        ISNULL(h.VendorCode, '') AS supplierCode,
        ISNULL(v.VendorName, '') AS supplierName,
        ${buyerSelect},
        ISNULL(h.CurrCode, 'THB') AS currency,
        ISNULL(h.${config.amtCol}, 0) AS totalAmount,
        ISNULL(h.${config.qtyCol}, 0) AS totalQty,
        ${refSelect},
        '' AS billNumber,
        ${invSelect},
        ${remarkSelect},
        ISNULL(h.ExchRate, 1) AS exchangeRate,
        '' AS category,
        ISNULL(h.DocuStatus, '') AS status
      FROM ${config.headerTable} h
      LEFT JOIN dbInventory.dbo.GMVendor v ON h.VendorCode = v.VendorCode
      WHERE h.DocuNo = @docNo
    `;

    const hdr = await pool.request()
      .input('docNo', sql.VarChar(20), docNo)
      .query(headerQuery);

    if (hdr.recordset.length === 0) {
      return res.json({ ok: false, error: 'Document not found' });
    }
    // 2. Fetch Detail Lines
    const orderNumField = config.hasPO ? 'ISNULL(GoodPO, \'\')' : 'ISNULL(OCode, \'\')';
    const remarkField = config.hasRemark ? 'ISNULL(GoodRemark, \'\')' : '\'\'';
    const ctPriceField = config.hasCTPrice ? 'ISNULL(GoodCTPrice, 0)' : '0';
    const customerField = config.type === 'SPA' ? 'ISNULL(GoodCustPO, \'\')' : '\'\'';
    const descField = config.hasGoodDesc ? 'ISNULL(GoodDesc, \'\')' : '\'\'';

    const detailQuery = `
      SELECT
        ListNo AS seq,
        ISNULL(GoodCode, '') AS stoneCode,
        ${descField} AS stoneName,
        ISNULL(GoodColorCode, '') AS color,
        ISNULL(GoodShapeCode, '') AS shape,
        ISNULL(GoodSizeCode, '') AS size,
        ISNULL(GoodSpecCode, '') AS characteristic,
        ISNULL(GoodGradeCode, '') AS grade,
        ISNULL(GoodThick, '') AS height,
        ISNULL(${config.detailUnitCol}, '') AS unit,
        '' AS warehouse,
        ISNULL(${config.detailWeightCol}, 0) AS weight,
        ISNULL(${config.detailQtyCol}, 0) AS qty,
        ISNULL(${config.detailPriceCol}, 0) AS price,
        ISNULL(${config.detailAmntCol}, 0) AS amount,
        ${ctPriceField} AS ctPerPc,
        ${orderNumField} AS orderNumber,
        ${customerField} AS customer,
        '' AS jobNumber,
        '' AS useStone,
        ${remarkField} AS remark
      FROM ${config.detailTable}
      WHERE ${config.idCol} = (SELECT ${config.idCol} FROM ${config.headerTable} WHERE DocuNo = @docNo)
      ORDER BY ListNo
    `;

    const dtl = await pool.request()
      .input('docNo', sql.VarChar(20), docNo)
      .query(detailQuery);

    const data = {
      header: hdr.recordset[0],
      lines: dtl.recordset,
    };

    setCache(cacheKey, data);
    console.log(`[PROC] ${docNo}: ${dtl.recordset.length} lines`);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(`❌ [PROC] Error fetching document ${docNo}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/procurement/summary/:docType
// สรุปภาพรวม — จำนวนเอกสาร, มูลค่ารวม ฯลฯ
// ============================================
router.get('/summary/:docType', async (req, res) => {
  const { docType } = req.params;
  const validTypes = ['SPA', 'SRA', 'SRB', 'SIR'];
  if (!validTypes.includes(docType.toUpperCase())) {
    return res.json({ ok: false, error: `Invalid document type: ${docType}` });
  }

  try {
    const pool = await getPool();
    const config = getTableConfig(docType);

    const queryStr = `
      SELECT
        COUNT(*) AS docCount,
        ISNULL(SUM(${config.amtCol}), 0) AS totalValue,
        ISNULL(SUM(${config.qtyCol}), 0) AS totalQty,
        MIN(CONVERT(VARCHAR(10), DocuDate, 103)) AS earliestDate,
        MAX(CONVERT(VARCHAR(10), DocuDate, 103)) AS latestDate
      FROM ${config.headerTable}
      WHERE DocuNo LIKE @prefix + '%'
    `;

    const result = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .query(queryStr);

    res.json({ ok: true, data: result.recordset[0] });
  } catch (err) {
    console.error(`❌ [PROC] Error fetching summary for ${docType}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
