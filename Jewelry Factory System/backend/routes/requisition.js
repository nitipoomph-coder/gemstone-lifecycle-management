// ============================================
// Requisition & Issue API Routes
// ออเดอร์และการเบิก: SOA, SIA, SIB, SIP, SIS
// ============================================
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// --- Helper: Convert binary to base64 ---
function toBase64Photo(buf) {
  if (!buf) return null;
  try {
    const actualBuffer = Buffer.isBuffer(buf) ? buf : (buf.data ? Buffer.from(buf.data) : Buffer.from(buf));
    if (!actualBuffer || actualBuffer.length === 0) return null;
    return `data:image/jpeg;base64,${actualBuffer.toString('base64')}`;
  } catch (err) {
    return null;
  }
}

// ─── Table Configuration Helper ───────────────────────────────────────────────
function getTableConfig(docTypeOrNo) {
  const upper = docTypeOrNo.toUpperCase();
  const code = upper.substring(0, 3);

  if (code === 'SOA') {
    return {
      type: 'SOA',
      headerTable: 'dbInventory.dbo.STOrdStockHD',
      detailTable: 'dbInventory.dbo.STOrdStockDT',
      idCol: 'OrdStockID',
      prefix: 'SOA',
      selectFields: 'DocuNo, DocuDate, OrderNo, PONo, CustCode, DueDate, DocuStatus'
    };
  }
  if (code === 'SIA') {
    return {
      type: 'SIA',
      headerTable: 'dbInventory.dbo.STIssStockHD',
      detailTable: 'dbInventory.dbo.STIssStockDT',
      idCol: 'IssStockID',
      prefix: 'SIA',
      selectFields: "DocuNo, DocuDate, '' AS OrderNo, '' AS PONo, CustCode, NULL AS DueDate, DocuStatus"
    };
  }
  if (code === 'SIB') {
    return {
      type: 'SIB',
      headerTable: 'dbInventory.dbo.STRetStockHD',
      detailTable: 'dbInventory.dbo.STRetStockDT',
      idCol: 'RetStockID',
      prefix: 'SIB',
      selectFields: "DocuNo, DocuDate, '' AS OrderNo, '' AS PONo, VendorCode AS CustCode, NULL AS DueDate, DocuStatus"
    };
  }
  if (code === 'SIP') {
    return {
      type: 'SIP',
      headerTable: 'dbInventory.dbo.STRepStockHD',
      detailTable: 'dbInventory.dbo.STRepStockDT',
      idCol: 'RepStockID',
      prefix: 'SIP',
      selectFields: "DocuNo, DocuDate, '' AS OrderNo, '' AS PONo, CustCode, NULL AS DueDate, DocuStatus"
    };
  }
  if (code === 'SIS') {
    return {
      type: 'SIS',
      headerTable: 'dbInventory.dbo.STSenStockHD',
      detailTable: 'dbInventory.dbo.STSenStockDT',
      idCol: 'SenStockID',
      prefix: 'SIS',
      selectFields: "DocuNo, DocuDate, '' AS OrderNo, '' AS PONo, '' AS CustCode, NULL AS DueDate, DocuStatus"
    };
  }

  throw new Error(`Unsupported document identifier: ${docTypeOrNo}`);
}

// ============================================
// GET /api/requisition/order/:ordNo
// ค้นหาข้อมูลออเดอร์เพื่อเตรียมทำ SOA / เบิก
// ============================================
router.get('/order/:ordNo', async (req, res) => {
  try {
    const pool = await getPool();
    const ordNo = req.params.ordNo;

    // Fetch Header from OrdHD
    const headerResult = await pool.request()
      .input('ordNo', sql.NVarChar, ordNo)
      .query(`
        SELECT 
          OrdNo, OrdDate, DueDate, PONo, CustCode, 
          SumOrdQty, OrdStatus
        FROM OrdHD 
        WHERE OrdNo = @ordNo
      `);

    if (headerResult.recordset.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    const header = headerResult.recordset[0];

    // Fetch Details
    const detailResult = await pool.request()
      .input('ordNo', sql.NVarChar, ordNo)
      .query(`
        SELECT 
          d.OrdNo,
          d.OrdLineNo,
          d.ItemNo,
          d.ItemDesc,
          d.ItemQty,
          d.ItemStone,
          CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
        FROM OrdDT d
        LEFT JOIN GMItemPhoto p ON d.ItemNo = p.ItemNo
        WHERE d.OrdNo = @ordNo
        ORDER BY d.OrdLineNo
      `);

    const lines = detailResult.recordset.map(r => ({
      ...r,
      ItemPhoto: toBase64Photo(r.ItemPhoto)
    }));

    res.json({ ok: true, header, lines });
  } catch (err) {
    console.error('[REQ API Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/requisition/document/:docuNo
// ดึงข้อมูลเอกสาร (เช่น SOA, SIA)
// ============================================
router.get('/document/:docuNo', async (req, res) => {
  try {
    const pool = await getPool();
    const docuNo = req.params.docuNo;
    const config = getTableConfig(docuNo);

    const headerQuery = await pool.request()
      .input('docuNo', sql.VarChar, docuNo)
      .query(`
        SELECT * 
        FROM ${config.headerTable} 
        WHERE DocuNo = @docuNo
      `);

    if (headerQuery.recordset.length === 0) {
      return res.status(404).json({ ok: false, error: 'Document not found' });
    }

    const header = headerQuery.recordset[0];

    const detailQuery = await pool.request()
      .input('docID', sql.Int, header[config.idCol])
      .query(`
        SELECT d.*, 
               CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
        FROM ${config.detailTable} d
        LEFT JOIN GMItemPhoto p ON d.ItemNo = p.ItemNo
        WHERE d.${config.idCol} = @docID
        ORDER BY d.ListNo
      `);

    const lines = detailQuery.recordset.map(r => ({
      ...r,
      ItemPhoto: toBase64Photo(r.ItemPhoto)
    }));

    res.json({ ok: true, header, lines });
  } catch (err) {
    console.error('[REQ API Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// GET /api/requisition/documents/:docType
// List Documents by Type (SOA, SIA, etc.)
// ============================================
router.get('/documents/:docType', async (req, res) => {
  try {
    const docType = req.params.docType.toUpperCase();
    const config = getTableConfig(docType);
    const pool = await getPool();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Count Total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${config.headerTable}
      WHERE DocuNo LIKE @prefix + '%'
      ${search ? `AND DocuNo LIKE '%' + @search + '%'` : ''}
    `;

    const countResult = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .input('search', sql.VarChar(50), search)
      .query(countQuery);
      
    const total = countResult.recordset[0].total;

    // Fetch Paginated Data
    let queryStr = `
      SELECT
        ${config.selectFields}
      FROM ${config.headerTable}
      WHERE DocuNo LIKE @prefix + '%'
    `;
    
    if (search) {
      queryStr += ` AND DocuNo LIKE '%' + @search + '%'`;
    }

    queryStr += `
      ORDER BY DocuNo DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const result = await pool.request()
      .input('prefix', sql.VarChar(5), config.prefix)
      .input('search', sql.VarChar(50), search)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(queryStr);

    res.json({ 
      ok: true, 
      data: result.recordset,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('[REQ API Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
