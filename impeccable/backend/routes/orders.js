const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// --- helper: convert photo buffer -> base64 ---
function toBase64Photo(buf) {
  if (!buf) return null;
  try {
    let b;
    if (Buffer.isBuffer(buf)) b = buf;
    else if (buf?.data) b = Buffer.from(buf.data);
    else b = Buffer.from(buf);
    if (b.length === 0) return null;
    return `data:image/jpeg;base64,${b.toString('base64')}`;
  } catch (err) {
    console.error('Photo conversion error:', err.message);
    return null;
  }
}

// --- In-Memory Cache + Request Coalescing ---
const cache = new Map();
const inFlight = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}
function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// === GET /api/orders =========================================================
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { dateFrom, dateTo, dateType, noCache } = req.query;

    // Default range: 7 months back -> today
    const defaultFrom = new Date(); defaultFrom.setMonth(defaultFrom.getMonth() - 7);
    const defaultTo = new Date(); defaultTo.setMonth(defaultTo.getMonth() + 0);

    const startDate = dateFrom ? new Date(dateFrom) : defaultFrom;
    const endDate = dateTo ? new Date(dateTo) : defaultTo;

    let spName = 'dbo.PC_Show_OrdTrack_Sum_DueDate';
    if (dateType === 'Order Date') spName = 'dbo.PC_Show_OrdTrack_Sum_OrdDate';
    else if (dateType === 'Cust Due Date') spName = 'dbo.PC_Show_OrdTrack_Sum_CustDueDate';
    else if (dateType === 'Finish Date') spName = 'dbo.PC_Show_OrdTrack_Sum_FinDate';
    else if (dateType === 'All') spName = 'dbo.PC_Show_OrdTrack_Sum_All';

    const cacheKey = `${spName}|${startDate.toISOString().slice(0, 10)}|${endDate.toISOString().slice(0, 10)}`;

    // 1) Cache hit - return immediately
    if (!noCache) {
      const cached = getCached(cacheKey);
      if (cached) {
        console.log(`[CACHE HIT] ${cacheKey} (${cached.length} rows)`);
        return res.json({ ok: true, data: cached, count: cached.length, cached: true });
      }
    }

    // 2) In-flight check - if same request is already running, wait for it
    if (inFlight.has(cacheKey)) {
      console.log(`[IN-FLIGHT] waiting: ${cacheKey}`);
      const data = await inFlight.get(cacheKey);
      return res.json({ ok: true, data, count: data.length, cached: 'coalesced' });
    }

    // 3) DB call - create shared Promise so other callers can wait
    const fetchPromise = (async () => {
      console.log(`[DB] Executing: ${spName} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`);
      const request = pool.request();
      request.input('FromDate', sql.DateTime, startDate);
      request.input('ToDate', sql.DateTime, endDate);
      const result = await request.execute(spName);

      const data = result.recordset.map(r => {
        const { ItemPhoto, ...rest } = r;
        return {
          ...rest,
          ItemPhoto: toBase64Photo(ItemPhoto),
          hasPhoto: !!(ItemPhoto && (ItemPhoto.data?.length || ItemPhoto.length)),
        };
      });
      setCached(cacheKey, data);
      console.log(`[DB] Done: ${data.length} rows - cached`);
      return data;
    })();

    inFlight.set(cacheKey, fetchPromise);
    try {
      const data = await fetchPromise;
      res.json({ ok: true, data, count: data.length });
    } finally {
      inFlight.delete(cacheKey);
    }

  } catch (err) {
    console.error('[API ERROR]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === GET /api/orders/photo/:itemNo ===========================================
router.get('/photo/:itemNo', async (req, res) => {
  try {
    const pool = await getPool();
    const itemNo = req.params.itemNo;
    const cacheKey = `photo:${itemNo}`;
    const cached = getCached(cacheKey);
    if (cached !== undefined && cached !== null) return res.json({ ok: true, photo: cached });

    const result = await pool.request()
      .input('itemNo', sql.NVarChar, itemNo)
      .query('SELECT CAST(ItemPhoto AS VARBINARY(MAX)) AS photo FROM GMItemPhoto WHERE ItemNo = @itemNo');
    const photo = toBase64Photo(result.recordset[0]?.photo);
    setCached(cacheKey, photo);
    res.json({ ok: true, photo });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


// === GET /api/orders/by-po/:poNo (MUST be BEFORE /:ordNo) ====================
router.get('/by-po/:poNo', async (req, res) => {
  try {
    const pool = await getPool();
    const poNo = decodeURIComponent(req.params.poNo);
    console.log('[GET /api/orders/by-po/' + poNo + ']');

    const result = await pool.request()
      .input('poNo', sql.NVarChar, poNo)
      .query(`
        SELECT
          h.OrdNo, h.OrdDate, h.DueDate, h.CustQCDate, h.CustDueDate,
          h.CustCode, c.CustName, c.SalesName AS Sales,
          h.PONo, h.OrdMat, h.OrdKind, h.OrdStatus, h.CloseStatus,
          h.SumOrdQty AS TotalQty, h.SumOrdAmnt AS TotalAmount, h.CurrCode,
          h.OrdWeek AS Week, h.CustMultiAddr AS Destination,
          d.OrdLineNo, d.ItemNo, d.ItemDesc, d.ItemMat, d.ItemSize,
          d.ItemStone AS Stone, d.ItemPlate AS Plating, d.ItemCust AS CustItem,
          d.ItemQty AS Qty, d.ItemPrice AS Price, d.ItemAmnt AS Amount,
          d.ItemRemark AS OrdRemark,
          d.FinishQty, d.FinishStatus, d.ItemStatus,
          d.StoneQty, d.FitQty AS FindingQty, d.WijQty AS WaxQty,
          d.WstQty AS WaxSetQty, d.CastQty, d.FCastStatus,
          d.GrindQty, d.FGrindStatus, d.EpoxQty, d.FEpoxStatus,
          d.FilQty AS FilingQty, d.PolishQty, d.FPolishStatus,
          d.SetQty, d.FSetStatus, d.PlateQty AS PlatingQty, d.FPlateStatus,
          d.AssemQty, d.FAssemStatus, d.QCQty AS FQCQty, d.FQCStatus,
          d.PackQty, d.FPackStatus, d.QPQty AS PQCQty, d.FQPStatus,
          d.ExportQty AS GroupQty, d.FinishQty AS BalQty,
          d.Recvmark AS RecRemark, d.Enamark AS EnaRemark,
          d.Crysmark AS CryRemark, d.Assemmark AS AsmRemark,
          d.Shelfmark AS ShfRemark, d.Packmark AS PkRemark,
          d.Prodmark AS ProdRemark,
          CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
        LEFT JOIN GMItemPhoto p ON p.ItemNo = d.ItemNo
        WHERE h.PONo = @poNo
        ORDER BY h.OrdNo, d.OrdLineNo
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ ok: false, error: 'PO not found' });

    const first = result.recordset[0];
    const uniqueOrds = new Map();
    result.recordset.forEach(r => {
      if (!uniqueOrds.has(r.OrdNo))
        uniqueOrds.set(r.OrdNo, { qty: r.TotalQty || 0, amnt: r.TotalAmount || 0 });
    });
    let sumQty = 0, sumAmnt = 0;
    for (const v of uniqueOrds.values()) { sumQty += v.qty; sumAmnt += v.amnt; }

    const header = {
      PONo: first.PONo, OrdNos: [...uniqueOrds.keys()], OrdNo: first.OrdNo,
      OrdDate: first.OrdDate, DueDate: first.DueDate,
      CustQCDate: first.CustQCDate, CustDueDate: first.CustDueDate,
      CustCode: first.CustCode, CustName: first.CustName,
      OrdMat: first.OrdMat, OrdKind: first.OrdKind,
      OrdStatus: first.OrdStatus, CloseStatus: first.CloseStatus,
      TotalQty: sumQty, TotalAmount: sumAmnt,
      CurrCode: first.CurrCode, Week: first.Week,
    };

    const lines = result.recordset.map(r => ({
      OrdNo: r.OrdNo, LineNo: r.OrdLineNo, ItemNo: r.ItemNo,
      ItemDesc: r.ItemDesc, ItemMat: r.ItemMat, ItemSize: r.ItemSize,
      Stone: r.Stone, Plating: r.Plating, CustItem: r.CustItem,
      OrdRemark: r.OrdRemark,
      Qty: r.Qty, Price: r.Price, Amount: r.Amount,
      ItemPhoto: toBase64Photo(r.ItemPhoto),
      FinishQty: r.FinishQty, FinishStatus: r.FinishStatus, ItemStatus: r.ItemStatus,
      OrdDate:     r.OrdDate,
      DueDate:     r.DueDate,
      QCDate:      r.CustQCDate,
      CustDueDate: r.CustDueDate,
      Destination: r.Destination,
      Sales:       r.Sales,
      PONo:        r.PONo,
      StoneQty: r.StoneQty, FindingQty: r.FindingQty,
      WaxQty: r.WaxQty, WaxSetQty: r.WaxSetQty,
      CastQty: r.CastQty, GrindQty: r.GrindQty,
      EpoxQty: r.EpoxQty, FilingQty: r.FilingQty,
      PolishQty: r.PolishQty, PQCQty: r.PQCQty,
      PlatingQty: r.PlatingQty, AssemQty: r.AssemQty,
      FQCQty: r.FQCQty, PackQty: r.PackQty,
      GroupQty: r.GroupQty, BalQty: r.BalQty,
      RecRemark: r.RecRemark, EnaRemark: r.EnaRemark,
      CryRemark: r.CryRemark, AsmRemark: r.AsmRemark,
      ShfRemark: r.ShfRemark, PkRemark: r.PkRemark, ProdRemark: r.ProdRemark,
    }));

    res.json({ ok: true, header, lines, lineCount: lines.length, ordCount: uniqueOrds.size });
  } catch (err) {
    console.error('[API ERROR] by-po:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === GET /api/orders/:ordNo ==================================================
router.get('/:ordNo', async (req, res) => {
  try {
    const pool = await getPool();
    const { ordNo } = req.params;
    console.log(`[GET /api/orders/${ordNo}] Fetching detail...`);

    // Handle "Group PO" case where ordNo is "BBC123/ BBC456"
    const ordList = ordNo.split('/').map(s => s.trim()).filter(Boolean);
    const request = pool.request();
    let whereClause = "";

    if (ordList.length > 1) {
      whereClause = `h.OrdNo IN (${ordList.map((_, i) => `@ord${i}`).join(',')})`;
      ordList.forEach((ord, i) => request.input(`ord${i}`, sql.NVarChar, ord));
    } else {
      // Single string: check OrdNo or PONo
      whereClause = `(h.OrdNo = @val OR h.PONo = @val)`;
      request.input('val', sql.NVarChar, ordList[0]);
    }

    const result = await request.query(`
        SELECT
          h.OrdNo, h.OrdDate, h.DueDate, h.CustCode, c.CustName, h.PONo, h.OrdMat,
          h.OrdStatus, h.CloseStatus, h.SumOrdQty AS TotalQty, h.SumOrdAmnt AS TotalAmount, h.CurrCode,
          d.OrdLineNo, d.ItemNo, d.ItemDesc, d.ItemMat, d.ItemSize, d.ItemQty AS Qty,
          d.ItemPrice AS Price, d.ItemAmnt AS Amount, d.FinishQty, d.FinishStatus, d.ItemStatus,
          d.CastQty, d.FCastStatus, d.GrindQty, d.FGrindStatus, d.PolishQty, d.FPolishStatus,
          d.SetQty, d.FSetStatus, d.EpoxQty, d.FEpoxStatus, d.PlateQty, d.FPlateStatus,
          d.AssemQty, d.FAssemStatus, d.QCQty, d.FQCStatus, d.PackQty, d.FPackStatus,
          CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
        LEFT JOIN GMItemPhoto p ON p.ItemNo = d.ItemNo
        WHERE ${whereClause}
        ORDER BY h.OrdNo, d.OrdLineNo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    // Aggregate Header if multiple orders
    const first = result.recordset[0];

    // Sum up totals across unique orders
    const uniqueOrders = new Map();
    result.recordset.forEach(r => {
      if (!uniqueOrders.has(r.OrdNo)) {
        uniqueOrders.set(r.OrdNo, { qty: r.TotalQty || 0, amnt: r.TotalAmount || 0 });
      }
    });

    let sumTotalQty = 0;
    let sumTotalAmnt = 0;
    for (const v of uniqueOrders.values()) {
      sumTotalQty += v.qty;
      sumTotalAmnt += v.amnt;
    }

    const header = {
      OrdNo: ordList.length > 1 ? ordNo : first.OrdNo,
      OrdDate: first.OrdDate,
      DueDate: first.DueDate,
      CustCode: first.CustCode,
      CustName: first.CustName,
      PONo: ordList.length > 1 ? 'Group PO By ShipTo' : first.PONo,
      OrdMat: first.OrdMat,
      OrdStatus: first.OrdStatus,
      CloseStatus: first.CloseStatus,
      TotalQty: sumTotalQty,
      TotalAmount: sumTotalAmnt,
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
    console.error('[API ERROR] Detail:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
