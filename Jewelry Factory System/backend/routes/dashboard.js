const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// ─── Detail Cache (แยกจาก main dashboard cache — TTL 10 นาที) ──────────────────
const detailCache = new Map();
const DETAIL_TTL = 10 * 60 * 1000;
function getDC(k) { const e = detailCache.get(k); if (!e) return null; if (Date.now() > e.ex) { detailCache.delete(k); return null; } return e.d; }
function setDC(k, d) { detailCache.set(k, { d, ex: Date.now() + DETAIL_TTL }); }

// ─── GET /api/dashboard ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. STAT CARDS (5 cards: Orders Today, Completed, WIP, Delay, This Month)
    // ═══════════════════════════════════════════════════════════════════════════
    const statsResult = await pool.request().query(`
      SELECT
        COUNT(CASE WHEN CAST(OrdDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 END) AS ordersToday,
        COUNT(CASE WHEN CloseStatus = 'Y' OR OrdStatus = 'C' THEN 1 END) AS completed,
        COUNT(CASE WHEN OrdStatus IN ('P','N') AND CloseStatus <> 'Y' THEN 1 END) AS wip,
        COUNT(CASE WHEN DueDate < CAST(GETDATE() AS DATE) AND OrdStatus IN ('P','N') AND CloseStatus <> 'Y' THEN 1 END) AS delay
      FROM OrdHD
    `);
    const s = statsResult.recordset[0];

    // Week-over-week comparison
    const weekResult = await pool.request().query(`
      SELECT
        COUNT(CASE WHEN CAST(OrdDate AS DATE) >= DATEADD(day, -7, CAST(GETDATE() AS DATE)) THEN 1 END) AS thisWeek,
        COUNT(CASE WHEN CAST(OrdDate AS DATE) >= DATEADD(day, -14, CAST(GETDATE() AS DATE))
                    AND CAST(OrdDate AS DATE) < DATEADD(day, -7, CAST(GETDATE() AS DATE)) THEN 1 END) AS lastWeek
      FROM OrdHD
    `);
    const w = weekResult.recordset[0];
    const weekChange = w.lastWeek > 0 ? Math.round(((w.thisWeek - w.lastWeek) / w.lastWeek) * 100) : 0;

    // 7 working days average query (excluding Sundays and holidays)
    const avgResult = await pool.request().query(`
      WITH Last7Days AS (
        SELECT DISTINCT TOP 7 CAST(OrdDate AS DATE) AS WorkDate
        FROM OrdHD
        WHERE 
          CAST(OrdDate AS DATE) < CAST(GETDATE() AS DATE)
          AND DATENAME(dw, OrdDate) <> 'Sunday'
          AND OrdDate IS NOT NULL
        ORDER BY WorkDate DESC
      )
      SELECT 
        ISNULL(AVG(CAST(d.OrderCount AS FLOAT)), 0) AS avgOrders
      FROM (
        SELECT COUNT(OrdNo) AS OrderCount
        FROM Last7Days w
        JOIN OrdHD o ON CAST(o.OrdDate AS DATE) = w.WorkDate
        GROUP BY w.WorkDate
      ) d
    `);
    const avg7Days = avgResult.recordset[0]?.avgOrders || 0;

    // This month summary
    const monthResult = await pool.request().query(`
      SELECT COUNT(*) AS ordCount, SUM(ISNULL(SumOrdQty,0)) AS totalQty
      FROM OrdHD
      WHERE MONTH(OrdDate) = MONTH(GETDATE()) AND YEAR(OrdDate) = YEAR(GETDATE())
    `);
    const m = monthResult.recordset[0];

    // Year-over-year comparison (this month vs same month last year)
    const yoyResult = await pool.request().query(`
      SELECT
        -- Completed: this month vs same month last year
        COUNT(CASE WHEN (CloseStatus='Y' OR OrdStatus='C') AND MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=YEAR(GETDATE()) THEN 1 END) AS compNow,
        COUNT(CASE WHEN (CloseStatus='Y' OR OrdStatus='C') AND MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=YEAR(GETDATE())-1 THEN 1 END) AS compLY,
        -- This Month: this month vs same month last year
        COUNT(CASE WHEN MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=YEAR(GETDATE()) THEN 1 END) AS monthNow,
        COUNT(CASE WHEN MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=YEAR(GETDATE())-1 THEN 1 END) AS monthLY
      FROM OrdHD
    `);
    const y = yoyResult.recordset[0];
    const pct = (now, ly) => ly > 0 ? Math.round(((now - ly) / ly) * 100) : (now > 0 ? 100 : 0);

    const statCards = [
      {
        label: 'Orders Today', value: s.ordersToday, change: '', trend: s.ordersToday >= avg7Days ? 'up' : 'down',
        yoyPct: avg7Days > 0 ? Math.round(((s.ordersToday - avg7Days) / avg7Days) * 100) : (s.ordersToday > 0 ? 100 : 0), yoyLabel: 'vs 7d avg'
      },
      {
        label: 'Completed', value: s.completed, change: '', trend: 'good',
        yoyPct: pct(y.compNow, y.compLY), yoyLabel: 'vs last year'
      },
      {
        label: 'Work In Progress', value: s.wip, change: `${weekChange >= 0 ? '+' : ''}${weekChange}% vs last week`, trend: weekChange >= 0 ? 'up' : 'down',
        yoyPct: null, yoyLabel: ''
      },
      {
        label: 'Overdue', value: s.delay, change: '', trend: 'bad', isAlert: s.delay > 0,
        yoyPct: null, yoyLabel: ''
      },
      {
        label: 'This Month', value: m.ordCount, change: `${m.totalQty.toLocaleString()} pcs`, trend: 'up',
        yoyPct: pct(y.monthNow, y.monthLY), yoyLabel: 'vs last year'
      },
    ];

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. 7-DAY ORDER TREND (bar chart data)
    // ═══════════════════════════════════════════════════════════════════════════
    const trendResult = await pool.request().query(`
      ;WITH Last7 AS (
        SELECT DATEADD(day, -6, CAST(GETDATE() AS DATE)) AS dt
        UNION ALL SELECT DATEADD(day, 1, dt) FROM Last7 WHERE dt < CAST(GETDATE() AS DATE)
      )
      SELECT
        l.dt,
        ISNULL(cnt, 0) AS cnt
      FROM Last7 l
      LEFT JOIN (
        SELECT CAST(OrdDate AS DATE) AS dt, COUNT(*) AS cnt
        FROM OrdHD
        WHERE OrdDate >= DATEADD(day, -7, CAST(GETDATE() AS DATE))
        GROUP BY CAST(OrdDate AS DATE)
      ) o ON l.dt = o.dt
      ORDER BY l.dt
    `);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const orderTrend = trendResult.recordset.map(r => ({
      day: dayNames[new Date(r.dt).getDay()],
      date: new Date(r.dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: r.cnt,
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. PROCESS DISTRIBUTION (donut chart — items at each production stage)
    // ═══════════════════════════════════════════════════════════════════════════
    const procResult = await pool.request().query(`
      SELECT
        SUM(CASE WHEN d.CastQty > 0 AND ISNULL(d.GrindQty,0) = 0 THEN 1 ELSE 0 END) AS casting,
        SUM(CASE WHEN d.GrindQty > 0 AND ISNULL(d.PolishQty,0) = 0 THEN 1 ELSE 0 END) AS grinding,
        SUM(CASE WHEN d.PolishQty > 0 AND ISNULL(d.PlateQty,0) = 0 THEN 1 ELSE 0 END) AS polishing,
        SUM(CASE WHEN d.PlateQty > 0 AND ISNULL(d.AssemQty,0) = 0 THEN 1 ELSE 0 END) AS plating,
        SUM(CASE WHEN d.QCQty > 0 AND ISNULL(d.PackQty,0) = 0 THEN 1 ELSE 0 END) AS qc,
        SUM(CASE WHEN d.PackQty > 0 THEN 1 ELSE 0 END) AS packing,
        COUNT(*) AS total
      FROM OrdDT d
      JOIN OrdHD h ON d.OrdNo = h.OrdNo
      WHERE h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'
    `);
    const p = procResult.recordset[0];
    const processDistribution = {
      total: p.total,
      segments: [
        { label: 'Casting', value: p.casting },
        { label: 'Grinding', value: p.grinding },
        { label: 'Polishing', value: p.polishing },
        { label: 'Plating', value: p.plating },
        { label: 'QC', value: p.qc },
        { label: 'Packing', value: p.packing },
      ],
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. MATERIAL BREAKDOWN (Brass/Silver/Other for active orders)
    // ═══════════════════════════════════════════════════════════════════════════
    const matResult = await pool.request().query(`
      SELECT ISNULL(OrdMat,'Other') AS material, COUNT(*) AS cnt,
             SUM(ISNULL(SumOrdQty,0)) AS totalQty
      FROM OrdHD
      WHERE OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
      GROUP BY OrdMat ORDER BY cnt DESC
    `);
    const materialBreakdown = matResult.recordset.map(r => ({
      material: r.material === 'B' ? 'Brass' : r.material === 'S' ? 'Silver' : r.material === 'T' ? 'Tin' : r.material === 'Other' ? 'Other (Accessories / Tin)' : r.material,
      code: r.material,
      orders: r.cnt,
      qty: r.totalQty,
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. ORDER TYPE (New vs Replenishment)
    // ═══════════════════════════════════════════════════════════════════════════
    const kindResult = await pool.request().query(`
      SELECT ISNULL(OrdKind,'Other') AS kind, COUNT(*) AS cnt
      FROM OrdHD
      WHERE OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
      GROUP BY OrdKind ORDER BY cnt DESC
    `);
    const orderTypes = kindResult.recordset.map(r => ({
      type: r.kind === 'NEW' ? 'New Order' : r.kind === 'REP' ? 'Replenishment' : r.kind,
      count: r.cnt,
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. TOP CUSTOMERS (by active order count)
    // ═══════════════════════════════════════════════════════════════════════════
    const custResult = await pool.request().query(`
      SELECT TOP 9
        h.CustCode,
        ISNULL(c.CustName, h.CustCode) AS custName,
        COUNT(*) AS orderCount,
        SUM(ISNULL(h.SumOrdQty,0)) AS totalQty
      FROM OrdHD h
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      WHERE h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'
      GROUP BY h.CustCode, c.CustName
      ORDER BY orderCount DESC
    `);
    const topCustomers = custResult.recordset.map(r => ({
      code: r.CustCode,
      name: r.custName,
      orders: r.orderCount,
      qty: r.totalQty,
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. CRITICAL DELAY ORDERS (with PO & customer info)
    // ═══════════════════════════════════════════════════════════════════════════
    const delayResult = await pool.request().query(`
      SELECT TOP 8
        h.OrdNo,
        h.PONo,
        h.CustCode,
        ISNULL(c.CustName, h.CustCode) AS custName,
        h.DueDate,
        DATEDIFF(day, h.DueDate, GETDATE()) AS delayDays,
        h.SumOrdQty AS qty
      FROM OrdHD h
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      WHERE h.DueDate < CAST(GETDATE() AS DATE)
        AND h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'
      ORDER BY h.DueDate ASC
    `);
    const delayOrders = delayResult.recordset.map(r => ({
      ordNo: r.OrdNo,
      poNo: r.PONo || '—',
      custCode: r.CustCode,
      custName: r.custName,
      dueDate: r.DueDate,
      delayDays: r.delayDays,
      qty: r.qty,
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. RECENT ORDERS (Latest 6 orders — "Live Feed")
    // ═══════════════════════════════════════════════════════════════════════════
    const recentResult = await pool.request().query(`
      SELECT TOP 6
        h.OrdNo,
        h.PONo,
        h.CustCode,
        h.OrdDate,
        h.OrdMat,
        h.OrdKind,
        h.SumOrdQty AS qty,
        CASE
          WHEN h.CloseStatus = 'Y' THEN 'Completed'
          WHEN h.DueDate < CAST(GETDATE() AS DATE) THEN 'Overdue'
          ELSE 'In Progress'
        END AS status
      FROM OrdHD h
      ORDER BY h.OrdDate DESC
    `);
    const recentOrders = recentResult.recordset.map(r => ({
      ordNo: r.OrdNo,
      poNo: r.PONo || '—',
      custCode: r.CustCode,
      ordDate: r.OrdDate,
      material: r.OrdMat === 'B' ? 'Brass' : r.OrdMat === 'S' ? 'Silver' : r.OrdMat || '—',
      type: r.OrdKind === 'NEW' ? 'New' : r.OrdKind === 'REP' ? 'Replen' : r.OrdKind || '—',
      qty: r.qty,
      status: r.status,
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════════════════════
    res.json({
      statCards,
      orderTrend,
      processDistribution,
      materialBreakdown,
      orderTypes,
      topCustomers,
      delayOrders,
      recentOrders,
    });

  } catch (err) {
    console.error('[API ERROR] /api/dashboard:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/years — ปีที่มีข้อมูลในระบบ
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/years', async (req, res) => {
  try {
    const cached = getDC('years');
    if (cached) return res.json(cached);
    const pool = await getPool();
    const r = await pool.request().query(`SELECT DISTINCT YEAR(OrdDate) as yr FROM OrdHD WHERE OrdDate IS NOT NULL ORDER BY yr DESC`);
    const result = { ok: true, years: r.recordset.map(x => x.yr) };
    setDC('years', result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/detail/:cardType?year1=2026&year2=2025
// cardType: today | completed | wip | overdue | month
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/detail/:cardType', async (req, res) => {
  try {
    const pool = await getPool();
    const { cardType } = req.params;
    const year1 = parseInt(req.query.year1) || new Date().getFullYear();
    const year2 = parseInt(req.query.year2) || year1 - 1;

    const cacheKey = `detail:${cardType}:${year1}:${year2}`;
    const cached = getDC(cacheKey);
    if (cached) { console.log(`[CACHE HIT] ${cacheKey}`); return res.json(cached); }

    console.log(`[DETAIL] ${cardType} ${year1} vs ${year2}`);

    // Dedicated moving average comparison logic for Orders Today
    if (cardType === 'today') {
      // 1) Fetch today's actual orders and quantity
      const todayRes = await pool.request().query(`
        SELECT COUNT(*) AS cnt, SUM(ISNULL(SumOrdQty, 0)) AS qty
        FROM OrdHD
        WHERE CAST(OrdDate AS DATE) = CAST(GETDATE() AS DATE)
      `);
      const t = todayRes.recordset[0];
      const todayTotal = t?.cnt || 0;
      const todayQty = t?.qty || 0;

      // 2) Fetch the last 7 working days (excluding Sundays and holidays with 0 orders)
      const daysRes = await pool.request().query(`
        WITH Last7Days AS (
          SELECT DISTINCT TOP 7 CAST(OrdDate AS DATE) AS WorkDate
          FROM OrdHD
          WHERE 
            CAST(OrdDate AS DATE) < CAST(GETDATE() AS DATE)
            AND DATENAME(dw, OrdDate) <> 'Sunday'
            AND OrdDate IS NOT NULL
          ORDER BY WorkDate DESC
        )
        SELECT 
          w.WorkDate,
          DATENAME(dw, w.WorkDate) AS DayName,
          COUNT(o.OrdNo) AS OrderCount,
          SUM(ISNULL(o.SumOrdQty,0)) AS TotalQty
        FROM Last7Days w
        LEFT JOIN OrdHD o ON CAST(o.OrdDate AS DATE) = w.WorkDate
        GROUP BY w.WorkDate
        ORDER BY w.WorkDate ASC
      `);

      const daysData = daysRes.recordset;
      const sumOrders = daysData.reduce((sum, d) => sum + d.OrderCount, 0);
      const sumQty = daysData.reduce((sum, d) => sum + d.TotalQty, 0);
      const avgOrders = daysData.length > 0 ? Math.round(sumOrders / daysData.length) : 0;
      const avgQty = daysData.length > 0 ? Math.round(sumQty / daysData.length) : 0;

      // Map to monthly-like structure for frontend chart compatibility
      const monthly = daysData.map((d, index) => {
        const formattedDate = new Date(d.WorkDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        return {
          month: index + 1,
          label: `${d.DayName.substring(0, 3)} ${formattedDate}`,
          year1: d.OrderCount,
          year1Qty: d.TotalQty,
          year2: avgOrders,
          year2Qty: avgQty,
          isFuture: false
        };
      });

      // Map to breakdown structure for frontend table compatibility
      const breakdown = daysData.map(d => {
        const dateStr = new Date(d.WorkDate).toISOString().split('T')[0];
        const pctDiff = avgOrders > 0 ? +(((d.OrderCount - avgOrders) / avgOrders) * 100).toFixed(1) : 0;
        return {
          code: dateStr,
          name: d.DayName,
          year1: d.OrderCount,
          year2: avgOrders,
          year1Qty: d.TotalQty,
          year2Qty: avgQty,
          changePct: pctDiff
        };
      });

      const response = {
        ok: true,
        cardType,
        year1,
        year2,
        summary: {
          year1Total: todayTotal,
          year2Total: avgOrders,
          year1Qty: todayQty,
          year2Qty: avgQty,
          changePct: avgOrders > 0 ? +(((todayTotal - avgOrders) / avgOrders) * 100).toFixed(1) : (todayTotal > 0 ? 100 : 0)
        },
        monthly,
        breakdown
      };

      setDC(cacheKey, response);
      return res.json(response);
    }

    const curMonth = new Date().getMonth() + 1;
    const curYear = new Date().getFullYear();
    const ML = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // กำหนด WHERE + dateField ตาม cardType
    let where, dateCol = 'OrdDate';
    switch (cardType) {
      case 'today': case 'month': where = '1=1'; break;
      case 'completed': where = "(h.CloseStatus = 'Y' OR h.OrdStatus = 'C')"; break;
      case 'wip': where = "h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'"; break;
      case 'overdue':
        where = "h.DueDate < CAST(GETDATE() AS DATE) AND h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'";
        dateCol = 'DueDate'; break;
      default: return res.status(400).json({ ok: false, error: 'Invalid cardType' });
    }

    // 1) Monthly counts for both years
    const mR = await pool.request()
      .input('y1', sql.Int, year1).input('y2', sql.Int, year2)
      .query(`
        SELECT YEAR(h.${dateCol}) as yr, MONTH(h.${dateCol}) as m,
               COUNT(*) as cnt, SUM(ISNULL(h.SumOrdQty,0)) as qty, SUM(ISNULL(h.SumOrdAmnt,0)) as amt
        FROM OrdHD h WHERE ${where} AND YEAR(h.${dateCol}) IN (@y1,@y2)
        GROUP BY YEAR(h.${dateCol}), MONTH(h.${dateCol}) ORDER BY yr, m
      `);

    const monthly = [];
    for (let m = 1; m <= 12; m++) {
      const d1 = mR.recordset.find(r => r.yr === year1 && r.m === m);
      const d2 = mR.recordset.find(r => r.yr === year2 && r.m === m);
      const isFuture = year1 === curYear && m > curMonth;
      monthly.push({
        month: m, label: ML[m - 1], isFuture,
        year1: isFuture ? null : (d1?.cnt || 0),
        year1Qty: isFuture ? null : (d1?.qty || 0),
        year2: d2?.cnt || 0, year2Qty: d2?.qty || 0,
      });
    }

    // 2) Summary totals
    const y1T = monthly.reduce((s, m) => s + (m.year1 || 0), 0);
    const y2T = monthly.reduce((s, m) => s + m.year2, 0);
    const y1Q = monthly.reduce((s, m) => s + (m.year1Qty || 0), 0);
    const y2Q = monthly.reduce((s, m) => s + m.year2Qty, 0);

    // 3) Customer breakdown (top 10)
    const bR = await pool.request()
      .input('y1', sql.Int, year1).input('y2', sql.Int, year2)
      .query(`
        SELECT TOP 10 h.CustCode, ISNULL(c.CustName, h.CustCode) as custName,
          SUM(CASE WHEN YEAR(h.${dateCol})=@y1 THEN 1 ELSE 0 END) as y1Cnt,
          SUM(CASE WHEN YEAR(h.${dateCol})=@y2 THEN 1 ELSE 0 END) as y2Cnt,
          SUM(CASE WHEN YEAR(h.${dateCol})=@y1 THEN ISNULL(h.SumOrdQty,0) ELSE 0 END) as y1Qty,
          SUM(CASE WHEN YEAR(h.${dateCol})=@y2 THEN ISNULL(h.SumOrdQty,0) ELSE 0 END) as y2Qty*-+
        FROM OrdHD h LEFT JOIN GMCust c ON c.CustCode=h.CustCode
        WHERE ${where} AND YEAR(h.${dateCol}) IN (@y1,@y2)
        GROUP BY h.CustCode, c.CustName
        ORDER BY SUM(CASE WHEN YEAR(h.${dateCol})=@y1 THEN 1 ELSE 0 END) DESC
      `);

    const breakdown = bR.recordset.map(r => ({
      code: r.CustCode, name: r.custName,
      year1: r.y1Cnt, year2: r.y2Cnt,
      year1Qty: r.y1Qty, year2Qty: r.y2Qty,
      changePct: r.y2Cnt > 0 ? +((r.y1Cnt - r.y2Cnt) / r.y2Cnt * 100).toFixed(1) : (r.y1Cnt > 0 ? 100 : 0),
    }));

    const response = {
      ok: true, cardType, year1, year2,
      summary: {
        year1Total: y1T, year2Total: y2T,
        year1Qty: y1Q, year2Qty: y2Q,
        changePct: y2T > 0 ? +((y1T - y2T) / y2T * 100).toFixed(1) : 0,
      },
      monthly, breakdown,
    };
    setDC(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/detail:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
