const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// ─── helper: convert photo buffer → base64 ────────────────────────────────────
function toBase64Photo(buf) {
  if (!buf) return null;
  try {
    let b;
    if (Buffer.isBuffer(buf)) b = buf;
    else if (buf?.data) b = Buffer.from(buf.data); // mssql wrap เป็น {data:[...]}
    else b = Buffer.from(buf);
    if (b.length === 0) return null;
    return `data:image/jpeg;base64,${b.toString('base64')}`;
  } catch {
    return null;
  }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { status = 'pending', custCode, dateFrom, dateTo } = req.query;

    let whereClause = `WHERE 1=1`;
    if (status === 'pending') {
      whereClause += ` AND (h.CloseStatus IS NULL OR h.CloseStatus != 'Y')`;
    }
    if (custCode) whereClause += ` AND h.CustCode = @custCode`;
    if (dateFrom) whereClause += ` AND h.OrdDate >= @dateFrom`;
    if (dateTo) whereClause += ` AND h.OrdDate <= @dateTo`;

    const request = pool.request();
    if (custCode) request.input('custCode', sql.NVarChar, custCode);
    if (dateFrom) request.input('dateFrom', sql.DateTime, new Date(dateFrom));
    if (dateTo) request.input('dateTo', sql.DateTime, new Date(dateTo));

    const result = await request.query(`
      WITH OrderAgg AS (
        SELECT
          h.OrdNo,
          h.OrdDate,
          h.DueDate,
          h.CustCode,
          c.CustName,
          h.PONo,
          h.OrdMat,
          h.OrdKind,
          h.CustMultiAddr,
          h.OrdStatus,
          h.CloseStatus,
          h.SumOrdQty    AS TotalQty,
          h.SumOrdAmnt   AS TotalAmount,
          h.CurrCode,
          h.OrdWeek      AS Week,
          h.CastStatus,
          h.PolishStatus,
          h.PlateStatus,
          h.AssemStatus,
          h.QCStatus,
          h.CustQCDate,
          h.CustDueDate,
          COUNT(d.OrdNo) AS LineCount,
          SUM(d.ItemQty) AS SumItem
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT  d ON d.OrdNo    = h.OrdNo
        ${whereClause}
        GROUP BY
          h.OrdNo, h.OrdDate, h.DueDate, h.CustCode, c.CustName,
          h.PONo, h.OrdMat, h.OrdKind, h.CustMultiAddr,
          h.OrdStatus, h.CloseStatus,
          h.SumOrdQty, h.SumOrdAmnt, h.CurrCode, h.OrdWeek,
          h.CastStatus, h.PolishStatus, h.PlateStatus, h.AssemStatus, h.QCStatus,
          h.CustQCDate, h.CustDueDate
      )
      SELECT
        a.*,
        -- OrdTrackDT fields
        t.OrdSGS,
        t.TrackTest,
        t.OORDate,
        t.BookDate,
        t.QC1_Qty,  t.QC1_Date,  t.QC1_Fail,
        t.QC2_Qty,  t.QC2_Date,  t.QC2_Fail,
        t.QC3_Qty,  t.QC3_Date,
        -- Production pending qty
        agg.PolishPenQty,
        agg.PlatePenQty,
        -- รูปภาพ (LEFT JOIN แทน subquery)
        ph.ItemPhoto
      FROM OrderAgg a
      -- JOIN OrdTrackDT
      LEFT JOIN OrdTrackDT t
        ON  t.CustCode      = a.CustCode
        AND t.PONo          = a.PONo
        AND t.OrdMat        = a.OrdMat
        AND t.OrdKind       = a.OrdKind
        AND t.CustMultiAddr = a.CustMultiAddr
        AND t.CustDueDate   = a.CustDueDate
        AND (t.TrackStatus IS NULL OR t.TrackStatus != 'Y')
      -- JOIN aggregate สำหรับ PolishPenQty, PlatePenQty
      LEFT JOIN (
        SELECT
          d.OrdNo,
          SUM(CASE WHEN d.GrindQty = d.ItemQty
                   THEN ISNULL(d.PolishQty,0) - ISNULL(d.GrindQty,0)
                   ELSE ISNULL(d.PolishQty,0) - ISNULL(d.ItemQty,0) END) AS PolishPenQty,
          SUM(CASE WHEN d.PlateQty = d.ItemQty
                   THEN ISNULL(d.QCQty,0) - ISNULL(d.PlateQty,0)
                   ELSE ISNULL(d.QCQty,0) - ISNULL(d.ItemQty,0) END) AS PlatePenQty
        FROM OrdDT d
        GROUP BY d.OrdNo
      ) agg ON agg.OrdNo = a.OrdNo
      -- JOIN รูปภาพ (ใช้ MAX เพื่อเอารูปแรกที่มี)
      LEFT JOIN (
        SELECT
          d2.OrdNo,
          MAX(CAST(p.ItemPhoto AS VARBINARY(MAX))) AS ItemPhoto
        FROM OrdDT d2
        JOIN GMItemPhoto p ON p.ItemNo = d2.ItemNo
        WHERE p.ItemPhoto IS NOT NULL
          AND DATALENGTH(p.ItemPhoto) > 0
        GROUP BY d2.OrdNo
      ) ph ON ph.OrdNo = a.OrdNo
      ORDER BY a.OrdDate DESC
    `);

    const data = result.recordset.map(r => {
      const { ItemPhoto, ...rest } = r;
      return {
        ...rest,
        ItemPhoto: toBase64Photo(ItemPhoto),
      };
    });

    res.json({ ok: true, data, count: data.length });
  } catch (err) {
    console.error('GET /api/orders error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/orders/:ordNo ───────────────────────────────────────────────────
router.get('/:ordNo', async (req, res) => {
  try {
    const pool = await getPool();
    const { ordNo } = req.params;

    const result = await pool.request()
      .input('ordNo', sql.NVarChar, ordNo)
      .query(`
        SELECT
          h.OrdNo,
          h.OrdDate,
          h.DueDate,
          h.CustCode,
          c.CustName,
          h.PONo,
          h.OrdMat,
          h.OrdStatus,
          h.CloseStatus,
          h.SumOrdQty  AS TotalQty,
          h.SumOrdAmnt AS TotalAmount,
          h.CurrCode,
          d.OrdLineNo,
          d.ItemNo,
          d.ItemDesc,
          d.ItemMat,
          d.ItemSize,
          d.ItemQty     AS Qty,
          d.ItemPrice   AS Price,
          d.ItemAmnt    AS Amount,
          d.FinishQty,
          d.FinishStatus,
          d.ItemStatus,
          d.CastQty,   d.FCastStatus,
          d.GrindQty,  d.FGrindStatus,
          d.PolishQty, d.FPolishStatus,
          d.SetQty,    d.FSetStatus,
          d.EpoxQty,   d.FEpoxStatus,
          d.PlateQty,  d.FPlateStatus,
          d.AssemQty,  d.FAssemStatus,
          d.QCQty,     d.FQCStatus,
          d.PackQty,   d.FPackStatus,
          CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
        FROM OrdHD h
        LEFT JOIN GMCust       c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT        d ON d.OrdNo    = h.OrdNo
        LEFT JOIN GMItemPhoto  p ON p.ItemNo   = d.ItemNo
        WHERE h.OrdNo = @ordNo
        ORDER BY d.OrdLineNo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    const first = result.recordset[0];
    const header = {
      OrdNo: first.OrdNo,
      OrdDate: first.OrdDate,
      DueDate: first.DueDate,
      CustCode: first.CustCode,
      CustName: first.CustName,
      PONo: first.PONo,
      OrdMat: first.OrdMat,
      OrdStatus: first.OrdStatus,
      CloseStatus: first.CloseStatus,
      TotalQty: first.TotalQty,
      TotalAmount: first.TotalAmount,
      CurrCode: first.CurrCode,
    };

    const lines = result.recordset.map(r => ({
      LineNo: r.OrdLineNo,
      ItemNo: r.ItemNo,
      ItemDesc: r.ItemDesc,
      ItemMat: r.ItemMat,
      ItemSize: r.ItemSize,
      Qty: r.Qty,
      Price: r.Price,
      Amount: r.Amount,
      ItemPhoto: toBase64Photo(r.ItemPhoto),
      FinishQty: r.FinishQty,
      FinishStatus: r.FinishStatus,
      ItemStatus: r.ItemStatus,
      processes: {
        Cast: { qty: r.CastQty, status: r.FCastStatus },
        Grind: { qty: r.GrindQty, status: r.FGrindStatus },
        Polish: { qty: r.PolishQty, status: r.FPolishStatus },
        Set: { qty: r.SetQty, status: r.FSetStatus },
        Epox: { qty: r.EpoxQty, status: r.FEpoxStatus },
        Plate: { qty: r.PlateQty, status: r.FPlateStatus },
        Assem: { qty: r.AssemQty, status: r.FAssemStatus },
        QC: { qty: r.QCQty, status: r.FQCStatus },
        Pack: { qty: r.PackQty, status: r.FPackStatus },
      },
    }));

    res.json({ ok: true, header, lines, lineCount: lines.length });
  } catch (err) {
    console.error(`GET /api/orders/${req.params.ordNo} error:`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/orders/summary/by-customer ─────────────────────────────────────
router.get('/summary/by-customer', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        h.CustCode,
        c.CustName,
        COUNT(DISTINCT h.OrdNo) AS OrderCount,
        SUM(h.SumOrdQty)        AS TotalQty,
        SUM(h.SumOrdAmnt)       AS TotalAmount,
        h.CurrCode
      FROM OrdHD h
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      WHERE (h.CloseStatus IS NULL OR h.CloseStatus != 'Y')
      GROUP BY h.CustCode, c.CustName, h.CurrCode
      ORDER BY OrderCount DESC
    `);
    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('GET /api/orders/summary/by-customer error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;