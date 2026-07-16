const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// ─── Detail Cache (แยกจาก main dashboard cache — TTL 10 นาที) ──────────────────
// ใช้สำหรับ cache ข้อมูลที่ query ซ้ำบ่อย เช่น years, detail drilldown
const detailCache = new Map();
const DETAIL_TTL = 10 * 60 * 1000;
function getDC(k) { const e = detailCache.get(k); if (!e) return null; if (Date.now() > e.ex) { detailCache.delete(k); return null; } return e.d; }
function setDC(k, d) { detailCache.set(k, { d, ex: Date.now() + DETAIL_TTL }); }

/*
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                        DASHBOARD ROUTES OVERVIEW                            ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Route                          │ Dashboard Page      │ Description         ║
 * ╟──────────────────────────────────┼─────────────────────┼─────────────────────╢
 * ║  GET /api/dashboard              │ Main Dashboard      │ Stat cards, charts  ║
 * ║  GET /api/dashboard/years        │ All Dashboards      │ Available years     ║
 * ║  GET /api/dashboard/detail/:type │ Main Dashboard      │ Card drill-down     ║
 * ║  GET /api/dashboard/sales-summary│ Sales Dashboard     │ Sales by rep/year   ║
 * ║  GET /api/dashboard/customer-summary│ Customer Dashboard│ Sales by cust/year  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * OrdNo Prefix Filter Policy:
 * - Main Dashboard & Sales Dashboard: ใช้ IN allowlist (รวมทุก order type)
 * - Customer Dashboard: ใช้ NOT IN blocklist ตาม Legacy VB.NET (FrmSalesYear_SumCust)
 *   → ไม่นับ BBP, BBK, BBS, BBL, BBT, BBD (เป็นรายการพิเศษ/ภายใน)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// [MAIN DASHBOARD] GET /api/dashboard
// ใช้โดย: หน้า Main Dashboard (หน้าแรก)
// หน้าที่: ดึงข้อมูลรวมทั้งหมดในครั้งเดียว ประกอบด้วย 9 ส่วน:
//   1. Stat Cards (5 cards)   — สรุปยอด Orders วันนี้, Completed, WIP, Overdue, เดือนนี้
//   2. 7-Day Order Trend      — กราฟแท่ง 7 วันล่าสุด
//   3. Process Distribution   — Donut chart สถานะ production (Casting→Packing)
//   4. Material Breakdown     — สัดส่วนวัสดุ (Brass/Silver/Tin)
//   5. Order Types            — New vs Replenishment
//   6. Top Customers          — ลูกค้า active orders สูงสุด 9 อันดับ
//   7. Critical Delay Orders  — รายการ overdue เรียงจากเก่าสุด
//   8. Recent Orders          — 6 รายการล่าสุด (Live Feed)
//   9. Stone & Finding        — สรุปพลอย/อะไหล่ค้างในสายการผลิต
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();

    // Parse selected year
    const yearParam = req.query.year;
    const selectedYear = (yearParam && yearParam !== 'all') ? parseInt(yearParam) : null;
    const activeYear = selectedYear || new Date().getFullYear();

    // Set reference date for trend queries (Dec 31 of selected year if past, else today)
    let refDate = new Date();
    if (selectedYear && selectedYear < new Date().getFullYear()) {
      refDate = new Date(selectedYear, 11, 31);
    }

    // Helper to generate a pre-configured request with common parameters
    const getReq = () => pool.request()
      .input('year', sql.Int, selectedYear)
      .input('activeYear', sql.Int, activeYear)
      .input('refDate', sql.Date, refDate);

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. STAT CARDS (5 cards: Orders Today, Completed, WIP, Delay, This Month)
    // ═══════════════════════════════════════════════════════════════════════════
    const statsResult = await getReq().query(`
      SELECT
        COUNT(CASE WHEN CAST(OrdDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 END) AS ordersToday,
        COUNT(CASE WHEN CloseStatus = 'Y' OR OrdStatus = 'C' THEN 1 END) AS completed,
        COUNT(CASE WHEN OrdStatus IN ('P','N') AND CloseStatus <> 'Y' THEN 1 END) AS wip,
        COUNT(CASE WHEN DueDate < CAST(GETDATE() AS DATE) AND OrdStatus IN ('P','N') AND CloseStatus <> 'Y' THEN 1 END) AS delay
      FROM OrdHD
      WHERE ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(OrdDate) = @year)
    `);
    const s = statsResult.recordset[0];

    // Week-over-week comparison
    const weekResult = await getReq().query(`
      SELECT
        COUNT(CASE WHEN CAST(OrdDate AS DATE) >= DATEADD(day, -7, CAST(GETDATE() AS DATE)) THEN 1 END) AS thisWeek,
        COUNT(CASE WHEN CAST(OrdDate AS DATE) >= DATEADD(day, -14, CAST(GETDATE() AS DATE))
                    AND CAST(OrdDate AS DATE) < DATEADD(day, -7, CAST(GETDATE() AS DATE)) THEN 1 END) AS lastWeek
      FROM OrdHD
      WHERE ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(OrdDate) = @year)
    `);
    const w = weekResult.recordset[0];
    const weekChange = w.lastWeek > 0 ? Math.round(((w.thisWeek - w.lastWeek) / w.lastWeek) * 100) : 0;

    // 7 working days average query (excluding Sundays and holidays)
    const avgResult = await getReq().query(`
      WITH Last7Days AS (
        SELECT DISTINCT TOP 7 CAST(OrdDate AS DATE) AS WorkDate
        FROM OrdHD
        WHERE
          CAST(OrdDate AS DATE) < CAST(GETDATE() AS DATE)
          AND DATENAME(dw, OrdDate) <> 'Sunday'
          AND OrdDate IS NOT NULL
          AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
          AND (@year IS NULL OR YEAR(OrdDate) = @year)
        ORDER BY WorkDate DESC
      )
      SELECT
        ISNULL(AVG(CAST(d.OrderCount AS FLOAT)), 0) AS avgOrders
      FROM (
        SELECT COUNT(OrdNo) AS OrderCount
        FROM Last7Days w
        JOIN OrdHD o ON CAST(o.OrdDate AS DATE) = w.WorkDate AND ((o.PONo IS NULL OR UPPER(o.PONo) NOT LIKE '%SAMPLE%') AND LEFT(o.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        GROUP BY w.WorkDate
      ) d
    `);
    const avg7Days = avgResult.recordset[0]?.avgOrders || 0;

    // This month summary
    const monthResult = await getReq().query(`
      SELECT COUNT(*) AS ordCount, SUM(ISNULL(SumOrdQty,0)) AS totalQty
      FROM OrdHD
      WHERE MONTH(OrdDate) = MONTH(GETDATE()) AND YEAR(OrdDate) = ISNULL(@year, YEAR(GETDATE()))
        AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
    `);
    const m = monthResult.recordset[0];

    // Year-over-year comparison (this month vs same month last year)
    const yoyResult = await getReq().query(`
      SELECT
        -- Completed: this month vs same month last year
        COUNT(CASE WHEN (CloseStatus='Y' OR OrdStatus='C') AND MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=@activeYear THEN 1 END) AS compNow,
        COUNT(CASE WHEN (CloseStatus='Y' OR OrdStatus='C') AND MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=@activeYear-1 THEN 1 END) AS compLY,
        -- This Month: this month vs same month last year
        COUNT(CASE WHEN MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=@activeYear THEN 1 END) AS monthNow,
        COUNT(CASE WHEN MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=@activeYear-1 THEN 1 END) AS monthLY
      FROM OrdHD
      WHERE ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
    `);
    const y = yoyResult.recordset[0];
    const pct = (now, ly) => ly > 0 ? Math.round(((now - ly) / ly) * 100) : (now > 0 ? 100 : 0);

    const statCards = [
      {
        label: 'Orders Today', value: s.ordersToday, change: '', trend: 'up',
        yoyPct: null, yoyLabel: ''
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
        label: 'This Month', value: m.ordCount, change: `${(m.totalQty || 0).toLocaleString()} pcs`, trend: 'up',
        yoyPct: pct(y.monthNow, y.monthLY), yoyLabel: 'vs last year'
      },
    ];

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. 7-DAY ORDER TREND (bar chart data)
    // ═══════════════════════════════════════════════════════════════════════════
    const trendResult = await getReq().query(`
      ;WITH Last7 AS (
        SELECT DATEADD(day, -6, CAST(@refDate AS DATE)) AS dt
        UNION ALL SELECT DATEADD(day, 1, dt) FROM Last7 WHERE dt < CAST(@refDate AS DATE)
      )
      SELECT
        l.dt,
        ISNULL(cnt, 0) AS cnt
      FROM Last7 l
      LEFT JOIN (
        SELECT CAST(OrdDate AS DATE) AS dt, COUNT(*) AS cnt
        FROM OrdHD
        WHERE OrdDate >= DATEADD(day, -7, CAST(@refDate AS DATE))
          AND OrdDate <= CAST(@refDate AS DATE)
          AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
          AND (@year IS NULL OR YEAR(OrdDate) = @year)
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
    const procResult = await getReq().query(`
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
        AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
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
    const matResult = await getReq().query(`
      SELECT ISNULL(OrdMat,'Other') AS material, COUNT(*) AS cnt,
             SUM(ISNULL(SumOrdQty,0)) AS totalQty
      FROM OrdHD
      WHERE OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
        AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(OrdDate) = @year)
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
    const kindResult = await getReq().query(`
      SELECT ISNULL(OrdKind,'Other') AS kind, COUNT(*) AS cnt
      FROM OrdHD
      WHERE OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
        AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(OrdDate) = @year)
      GROUP BY OrdKind ORDER BY cnt DESC
    `);
    const orderTypes = kindResult.recordset.map(r => ({
      type: r.kind === 'NEW' ? 'New Order' : r.kind === 'REP' ? 'Replenishment' : r.kind,
      count: r.cnt,
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. TOP CUSTOMERS (by active order count)
    // ═══════════════════════════════════════════════════════════════════════════
    const custResult = await getReq().query(`
      SELECT TOP 9
        h.CustCode,
        ISNULL(c.CustName, h.CustCode) AS custName,
        COUNT(*) AS orderCount,
        SUM(ISNULL(h.SumOrdQty,0)) AS totalQty
      FROM OrdHD h
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      WHERE h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'
        AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
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
    const delayResult = await getReq().query(`
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
        AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
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
    const recentResult = await getReq().query(`
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
      WHERE ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
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
    // 9. STONE & FINDING SUMMARY (พลอย/อะไหล่ค้างในสายการผลิต)
    // ═══════════════════════════════════════════════════════════════════════════
    const sfResult = await getReq().query(`
      SELECT
        COUNT(*) AS totalItems,
        SUM(CASE WHEN ISNULL(d.StoneQty, 0) = 0 AND ISNULL(d.FStoneStatus, '') NOT IN ('N','X') THEN 1 ELSE 0 END) AS stonePendingItems,
        SUM(CASE WHEN ISNULL(d.StoneQty, 0) > 0 THEN 1 ELSE 0 END) AS stoneDoneItems,
        SUM(CASE WHEN ISNULL(d.StoneQty, 0) = 0 AND ISNULL(d.FStoneStatus, '') NOT IN ('N','X') THEN ISNULL(d.ItemQty, 0) ELSE 0 END) AS stonePendingQty,
        SUM(CASE WHEN ISNULL(d.FitQty, 0) = 0 AND ISNULL(d.FFitStatus, '') NOT IN ('N','X') THEN 1 ELSE 0 END) AS findingPendingItems,
        SUM(CASE WHEN ISNULL(d.FitQty, 0) > 0 THEN 1 ELSE 0 END) AS findingDoneItems,
        SUM(CASE WHEN ISNULL(d.FitQty, 0) = 0 AND ISNULL(d.FFitStatus, '') NOT IN ('N','X') THEN ISNULL(d.ItemQty, 0) ELSE 0 END) AS findingPendingQty
      FROM OrdDT d
      JOIN OrdHD h ON d.OrdNo = h.OrdNo
      WHERE (@year IS NULL OR YEAR(h.OrdDate) = @year)
    `);
    const sf = sfResult.recordset[0];
    const stoneFindings = {
      totalItems: sf.totalItems,
      stone: { pending: sf.stonePendingItems, done: sf.stoneDoneItems, pendingQty: sf.stonePendingQty },
      finding: { pending: sf.findingPendingItems, done: sf.findingDoneItems, pendingQty: sf.findingPendingQty },
    };

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
      stoneFindings,
    });

  } catch (err) {
    console.error('[API ERROR] /api/dashboard:', err.stack);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// [ALL DASHBOARDS] GET /api/dashboard/years
// ใช้โดย: ทุก Dashboard (Main, Sales, Customer)
// หน้าที่: ดึงปีที่มีข้อมูล OrdHD อยู่ในระบบ สำหรับให้ user เลือก filter
//         มี cache TTL 10 นาทีเพื่อลด load
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/years', async (req, res) => {
  try {
    const cached = getDC('years');
    if (cached) return res.json({ ok: true, years: cached });

    const pool = await getPool();

    // 1. ประกาศตัวแปร request ให้ถูกต้องตามโครงสร้างระบบเดิมของคุณ
    const request = pool.request();

    // 2. ยิง Query ไปที่ฐานข้อมูลจริง
    const query = `
      SELECT DISTINCT YEAR(OrdDate) AS yr
      FROM OrdHD
      WHERE OrdDate IS NOT NULL
      ORDER BY yr DESC
    `;
    const result = await request.query(query);

    // 3. นำข้อมูลแปลงเป็น Array ของปี [2026, 2025, 2024, ...]
    let years = result.recordset.map(row => row.yr);

    // 4. บล็อกให้เหลือเฉพาะ 6 ปีล่าสุด
    if (years.length > 6) {
      years = years.slice(0, 6);
    }

    // 5. จัดเรียงจากน้อยไปมาก เพื่อให้ปุ่มบนเว็บเรียงจากอดีตมาปัจจุบัน (เช่น 2021 -> 2026)
    years.sort((a, b) => a - b);

    setDC('years', years);
    res.json({ ok: true, years });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/years:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// [MAIN DASHBOARD — DRILL DOWN] GET /api/dashboard/detail/:cardType
// ใช้โดย: หน้า Main Dashboard เมื่อ user คลิกที่ Stat Card
// หน้าที่: แสดง Detail Popup เปรียบเทียบ 2 ปี (year1 vs year2)
//   - cardType: 'today' | 'completed' | 'wip' | 'overdue' | 'month'
//   - 'today' → เทียบวันนี้กับค่าเฉลี่ย 7 วันทำงานล่าสุด
//   - อื่นๆ   → เทียบรายเดือน + breakdown ลูกค้า top 10
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
          AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
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
            AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
          ORDER BY WorkDate DESC
        )
        SELECT
          w.WorkDate,
          DATENAME(dw, w.WorkDate) AS DayName,
          COUNT(o.OrdNo) AS OrderCount,
          SUM(ISNULL(o.SumOrdQty,0)) AS TotalQty
        FROM Last7Days w
        LEFT JOIN OrdHD o ON CAST(o.OrdDate AS DATE) = w.WorkDate AND ((o.PONo IS NULL OR UPPER(o.PONo) NOT LIKE '%SAMPLE%') AND LEFT(o.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
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
      case 'today': case 'month': where = "((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))"; break;
      case 'completed': where = "(h.CloseStatus = 'Y' OR h.OrdStatus = 'C') AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))"; break;
      case 'wip': where = "h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y' AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))"; break;
      case 'overdue':
        where = "h.DueDate < CAST(GETDATE() AS DATE) AND h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y' AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))";
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
          SUM(CASE WHEN YEAR(h.${dateCol})=@y2 THEN ISNULL(h.SumOrdQty,0) ELSE 0 END) as y2Qty
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

// ═══════════════════════════════════════════════════════════════════════════════
// [SALES DASHBOARD] GET /api/dashboard/sales-summary?years=2024,2025
// ใช้โดย: หน้า Sales Dashboard (SalesDashboard.tsx)
// หน้าที่: ดึงยอดขายรวม (SumOrdExchAmnt) จับกลุ่มตาม Sales Rep และปี
//         เพื่อแสดง Bar Chart เปรียบเทียบยอดขายแต่ละ Sales ข้ามหลายปี
//         JOIN GMCust → GMEmp เพื่อ map CustCode → SalesName
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/sales-summary', async (req, res) => {
  try {
    const pool = await getPool();
    let years = (req.query.years || '').split(',').map(y => parseInt(y)).filter(y => !isNaN(y));
    if (years.length > 6) {
      years = years.sort((a, b) => a - b).slice(-6);
    }

    if (years.length === 0) years.push(new Date().getFullYear());
    // Build the IN clause dynamically for years
    const yearParams = years.map((_, i) => `@y${i}`).join(',');
    const request = pool.request();
    years.forEach((y, i) => request.input(`y${i}`, sql.Int, y));

    const query = `
      SELECT
        e.SalesName AS id,
        e.SalesName AS name,
        MAX(e.EmpType) AS empType,
        MAX(e.SalesLV) AS salesLv,
        YEAR(h.OrdDate) AS yr,
        SUM(ISNULL(h.SumOrdExchAmnt, 0)) AS totalSales
      FROM OrdHD h
      JOIN GMCust c ON h.CustCode = c.CustCode
      JOIN GMEmp e ON c.SalesName = e.SalesName
      WHERE YEAR(h.OrdDate) IN (${yearParams})
        AND h.OrdStatus IN ('P','N','C') AND h.CloseStatus <> 'Y' -- Adjust as needed
      GROUP BY e.SalesName, YEAR(h.OrdDate)
    `;
    const result = await request.query(query);

    // Format data into the structure expected by frontend
    const salesMap = {};
    result.recordset.forEach(row => {
      if (!salesMap[row.id]) {
        salesMap[row.id] = {
          id: row.id,
          name: row.name,
          empType: row.empType,
          salesLv: row.salesLv,
          data: {}
        };
      }
      salesMap[row.id].data[row.yr.toString()] = row.totalSales;
    });

    const data = Object.values(salesMap).sort((a, b) => {
      const lastYr = Math.max(...years).toString();
      return (b.data[lastYr] || 0) - (a.data[lastYr] || 0);
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// [CUSTOMER DASHBOARD] GET /api/dashboard/customer-summary?years=2024,2025
// ใช้โดย: หน้า Customer Dashboard (CustomerDashboard.tsx)
// หน้าที่: ดึงยอดขายรวม (SumOrdExchAmnt) จับกลุ่มตาม Customer และปี/เดือน
//         เพื่อแสดง Bar Chart, Monthly Breakdown, Breakdown Table
//
// ⚠️ OrdNo Filter: ใช้ NOT IN blocklist ตาม Legacy VB.NET (FrmSalesYear_SumCust)
//    → ไม่นับ BBP, BBK, BBS, BBL, BBT, BBD
//    → กรองเฉพาะ CustStatus = 'Y' (ลูกค้า Active เท่านั้น)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/customer-summary', async (req, res) => {
  try {
    const pool = await getPool();
    const years = (req.query.years || '').split(',').map(y => parseInt(y)).filter(y => !isNaN(y));
    if (years.length === 0) years.push(new Date().getFullYear());
    const months = req.query.months ? req.query.months.split(',').map(m => parseInt(m)).filter(m => !isNaN(m)) : [];

    // สร้าง parameterized IN clause สำหรับปีที่ต้องการ
    const yearParams = years.map((_, i) => `@y${i}`).join(',');
    const request = pool.request();
    years.forEach((y, i) => request.input(`y${i}`, sql.Int, y));

    let monthWhereClause = '';
    let topItemMonthWhereClause = '';
    if (months.length > 0) {
      const monthParams = months.map((_, i) => `@m${i}`).join(',');
      months.forEach((m, i) => request.input(`m${i}`, sql.Int, m));
      monthWhereClause = `AND MONTH(h.OrdDate) IN (${monthParams})`;
      topItemMonthWhereClause = `AND MONTH(oh.OrdDate) IN (${monthParams})`;
    }

    // Query ตาม Logic เดิมของ FrmSalesYear_SumCust.vb:
    //   - ใช้ NOT IN blocklist แทน IN allowlist
    //   - กรองเฉพาะ CustStatus = 'Y' (Active customers)
    //   - ดึง SumOrdExchAmnt (ยอดแลกเปลี่ยนเงินตรา)
    const query = `
      SELECT
        h.CustCode AS id,
        ISNULL(MAX(c.CustName), h.CustCode) AS name,
        MAX(c.CustStatus) AS custStatus,
        MAX(c.SalesName) AS salesName,
        YEAR(h.OrdDate) AS yr,
        MONTH(h.OrdDate) AS mth,
        SUM(ISNULL(h.SumOrdExchAmnt, 0)) AS totalSales,
        SUM(ISNULL(h.SumOrdQty, 0)) AS totalQty
      FROM OrdHD h
      LEFT JOIN GMCust c ON h.CustCode = c.CustCode
      WHERE YEAR(h.OrdDate) IN (${yearParams})
        ${monthWhereClause}
        AND SUBSTRING(h.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')
        AND c.CustStatus = 'Y'
      GROUP BY h.CustCode, YEAR(h.OrdDate), MONTH(h.OrdDate)
    `;
    const result = await request.query(query);

    const topItemQuery = `
      WITH ItemTotals AS (
        SELECT
          oh.CustCode,
          od.ItemNo,
          SUM(ISNULL(od.ItemQty, 0)) as totalQty
        FROM OrdHD oh
        JOIN OrdDT od ON oh.OrdNo = od.OrdNo
        LEFT JOIN GMCust c ON c.CustCode = oh.CustCode
        WHERE YEAR(oh.OrdDate) IN (${yearParams})
          ${topItemMonthWhereClause}
          AND SUBSTRING(oh.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')
          AND (oh.PONo IS NULL OR UPPER(oh.PONo) NOT LIKE '%SAMPLE%')
          AND ISNULL(c.CustStatus, 'Y') = 'Y'
        GROUP BY oh.CustCode, od.ItemNo
      ),
      RankedItems AS (
        SELECT
          CustCode,
          ItemNo,
          totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems
      WHERE rn = 1
    `;
    const topItemResult = await request.query(topItemQuery);

    const topItemByYearQuery = `
      WITH ItemTotals AS (
        SELECT
          oh.CustCode,
          YEAR(oh.OrdDate) AS yr,
          od.ItemNo,
          SUM(ISNULL(od.ItemQty, 0)) as totalQty
        FROM OrdHD oh
        JOIN OrdDT od ON oh.OrdNo = od.OrdNo
        LEFT JOIN GMCust c ON c.CustCode = oh.CustCode
        WHERE YEAR(oh.OrdDate) IN (${yearParams})
          ${topItemMonthWhereClause}
          AND SUBSTRING(oh.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')
          AND (oh.PONo IS NULL OR UPPER(oh.PONo) NOT LIKE '%SAMPLE%')
          AND ISNULL(c.CustStatus, 'Y') = 'Y'
        GROUP BY oh.CustCode, YEAR(oh.OrdDate), od.ItemNo
      ),
      RankedItems AS (
        SELECT
          CustCode,
          yr,
          ItemNo,
          totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode, yr ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, yr, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems
      WHERE rn = 1
    `;
    const topItemByYearResult = await request.query(topItemByYearQuery);

    const topItemByYearTypeQuery = `
      WITH ItemTotals AS (
        SELECT
          oh.CustCode,
          YEAR(oh.OrdDate) AS yr,
          CASE
            WHEN UPPER(LEFT(ISNULL(od.ItemNo, ''), 3)) IN ('BBS','BES','BNS','BRS') THEN UPPER(LEFT(ISNULL(od.ItemNo, ''), 3))
            WHEN UPPER(ISNULL(od.ItemType, '')) IN ('BBS','BES','BNS','BRS') THEN UPPER(od.ItemType)
            WHEN UPPER(LEFT(ISNULL(od.ItemType, ''), 1)) IN ('B', 'T') THEN 'BBS'
            WHEN UPPER(LEFT(ISNULL(od.ItemType, ''), 1)) = 'E' THEN 'BES'
            WHEN UPPER(LEFT(ISNULL(od.ItemType, ''), 1)) = 'N' THEN 'BNS'
            WHEN UPPER(LEFT(ISNULL(od.ItemType, ''), 1)) = 'R' THEN 'BRS'
            ELSE 'Others'
          END AS productType,
          od.ItemNo,
          SUM(ISNULL(od.ItemQty, 0)) as totalQty
        FROM OrdHD oh
        JOIN OrdDT od ON oh.OrdNo = od.OrdNo
        LEFT JOIN GMCust c ON c.CustCode = oh.CustCode
        WHERE YEAR(oh.OrdDate) IN (${yearParams})
          ${topItemMonthWhereClause}
          AND SUBSTRING(oh.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')
          AND (oh.PONo IS NULL OR UPPER(oh.PONo) NOT LIKE '%SAMPLE%')
          AND ISNULL(c.CustStatus, 'Y') = 'Y'
        GROUP BY
          oh.CustCode,
          YEAR(oh.OrdDate),
          CASE
            WHEN UPPER(LEFT(ISNULL(od.ItemNo, ''), 3)) IN ('BBS','BES','BNS','BRS') THEN UPPER(LEFT(ISNULL(od.ItemNo, ''), 3))
            WHEN UPPER(ISNULL(od.ItemType, '')) IN ('BBS','BES','BNS','BRS') THEN UPPER(od.ItemType)
            WHEN UPPER(LEFT(ISNULL(od.ItemType, ''), 1)) IN ('B', 'T') THEN 'BBS'
            WHEN UPPER(LEFT(ISNULL(od.ItemType, ''), 1)) = 'E' THEN 'BES'
            WHEN UPPER(LEFT(ISNULL(od.ItemType, ''), 1)) = 'N' THEN 'BNS'
            WHEN UPPER(LEFT(ISNULL(od.ItemType, ''), 1)) = 'R' THEN 'BRS'
            ELSE 'Others'
          END,
          od.ItemNo
      ),
      RankedItems AS (
        SELECT
          CustCode,
          yr,
          productType,
          ItemNo,
          totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode, yr, productType ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, yr, productType, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems
      WHERE rn = 1
    `;
    const topItemByYearTypeResult = await request.query(topItemByYearTypeQuery);

    const topItemMap = {};
    topItemResult.recordset.forEach(r => {
      topItemMap[r.id] = {
        topItem: r.topItem,
        topItemQty: r.topItemQty
      };
    });

    const topItemsByYearMap = {};
    topItemByYearResult.recordset.forEach(r => {
      if (!topItemsByYearMap[r.id]) topItemsByYearMap[r.id] = {};
      topItemsByYearMap[r.id][String(r.yr)] = {
        topItem: r.topItem,
        topItemQty: r.topItemQty
      };
    });

    const topItemsByYearByTypeMap = {};
    topItemByYearTypeResult.recordset.forEach(r => {
      if (!topItemsByYearByTypeMap[r.id]) topItemsByYearByTypeMap[r.id] = {};
      if (!topItemsByYearByTypeMap[r.id][String(r.yr)]) topItemsByYearByTypeMap[r.id][String(r.yr)] = {};
      topItemsByYearByTypeMap[r.id][String(r.yr)][r.productType] = {
        topItem: r.topItem,
        topItemQty: r.topItemQty,
        productType: r.productType
      };
    });

    const custMap = {};
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;

    result.recordset.forEach(row => {
      if (!custMap[row.id]) {
        custMap[row.id] = {
          id: row.id,
          name: row.name,
          custStatus: row.custStatus,
          salesName: row.salesName,
          data: {},
          monthly: {},
          dataQty: {},
          monthlyQty: {},
          monthlyQty: {},
          currentMonthSales: 0,
          topItem: topItemMap[row.id]?.topItem || null,
          topItemQty: topItemMap[row.id]?.topItemQty || 0,
          topItemsByYear: topItemsByYearMap[row.id] || {},
          topItemsByYearByType: topItemsByYearByTypeMap[row.id] || {}
        };
      }

      const yrStr = row.yr.toString();
      const mthStr = row.mth.toString();

      if (!custMap[row.id].data[yrStr]) {
        custMap[row.id].data[yrStr] = 0;
      }
      custMap[row.id].data[yrStr] += row.totalSales;

      if (!custMap[row.id].monthly[yrStr]) {
        custMap[row.id].monthly[yrStr] = {};
      }
      custMap[row.id].monthly[yrStr][mthStr] = row.totalSales;

      if (!custMap[row.id].dataQty[yrStr]) {
        custMap[row.id].dataQty[yrStr] = 0;
      }
      custMap[row.id].dataQty[yrStr] += row.totalQty;

      if (!custMap[row.id].monthlyQty[yrStr]) {
        custMap[row.id].monthlyQty[yrStr] = {};
      }
      custMap[row.id].monthlyQty[yrStr][mthStr] = row.totalQty;

      if (row.yr === curYear && row.mth === curMonth) {
        custMap[row.id].currentMonthSales += row.totalSales;
      }
    });

    // เรียงลำดับ: ยอดเดือนปัจจุบันมากสุดก่อน → ถ้าเท่ากันดูยอดปีรวม
    const curYearStr = curYear.toString();
    const data = Object.values(custMap).sort((a, b) => {
      if (b.currentMonthSales !== a.currentMonthSales) {
        return (b.currentMonthSales || 0) - (a.currentMonthSales || 0);
      }
      return (b.data[curYearStr] || 0) - (a.data[curYearStr] || 0);
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/customer-summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Sales customer analytics helpers keep the sales pages focused on customer,
// item, amount, qty, and shipping summary instead of production-stage detail.
function parseCsvInts(value, fallback = []) {
  const parsed = String(value || '')
    .split(',')
    .map(v => parseInt(v, 10))
    .filter(v => !Number.isNaN(v));
  return parsed.length > 0 ? parsed : fallback;
}

function parseCsvStrings(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function addInParams(request, prefix, values, type) {
  values.forEach((value, index) => request.input(`${prefix}${index}`, type, value));
  return values.map((_, index) => `@${prefix}${index}`).join(',');
}

function salesStatusSql(qtyExpr, shippedExpr, dueExpr) {
  return `
    CASE
      WHEN ISNULL(${qtyExpr}, 0) > 0 AND ISNULL(${shippedExpr}, 0) >= ISNULL(${qtyExpr}, 0) THEN 'Shipped'
      WHEN ${dueExpr} < CAST(GETDATE() AS DATE) AND ISNULL(${shippedExpr}, 0) < ISNULL(${qtyExpr}, 0) THEN 'Late'
      WHEN ISNULL(${shippedExpr}, 0) > 0 THEN 'Partial'
      ELSE 'Open'
    END
  `;
}

function salesProductTypeSql(detailAlias = 'd') {
  return `
    CASE
      WHEN UPPER(LEFT(ISNULL(${detailAlias}.ItemNo, ''), 3)) IN ('BBS','BES','BNS','BRS') THEN UPPER(LEFT(ISNULL(${detailAlias}.ItemNo, ''), 3))
      WHEN UPPER(ISNULL(${detailAlias}.ItemType, '')) IN ('BBS','BES','BNS','BRS') THEN UPPER(${detailAlias}.ItemType)
      WHEN UPPER(LEFT(ISNULL(${detailAlias}.ItemType, ''), 1)) IN ('B', 'T') THEN 'BBS'
      WHEN UPPER(LEFT(ISNULL(${detailAlias}.ItemType, ''), 1)) = 'E' THEN 'BES'
      WHEN UPPER(LEFT(ISNULL(${detailAlias}.ItemType, ''), 1)) = 'N' THEN 'BNS'
      WHEN UPPER(LEFT(ISNULL(${detailAlias}.ItemType, ''), 1)) = 'R' THEN 'BRS'
      ELSE 'Others'
    END
  `;
}

function salesProductTypeNameSql(codeExpr = 'typeCode') {
  return `
    CASE ${codeExpr}
      WHEN 'BBS' THEN 'Bracelet / Bangle'
      WHEN 'BES' THEN 'Earring'
      WHEN 'BNS' THEN 'Necklace'
      WHEN 'BRS' THEN 'Ring'
      ELSE 'Others'
    END
  `;
}

function itemTypeNameSql(typeExpr, itemExpr, engExpr, localExpr) {
  return `
    COALESCE(
      NULLIF(${engExpr}, ''),
      NULLIF(${localExpr}, ''),
      CASE UPPER(LEFT(ISNULL(NULLIF(${typeExpr}, ''), ISNULL(${itemExpr}, '')), 1))
        WHEN 'R' THEN 'Ring'
        WHEN 'E' THEN 'Earring'
        WHEN 'N' THEN 'Necklace'
        WHEN 'T' THEN 'Bracelet'
        WHEN 'B' THEN 'Bangle'
        ELSE 'Unclassified'
      END
    )
  `;
}

function itemTypeNameMaxSql(typeExpr, itemExpr, engExpr, localExpr) {
  return `
    COALESCE(
      NULLIF(MAX(${engExpr}), ''),
      NULLIF(MAX(${localExpr}), ''),
      CASE UPPER(LEFT(ISNULL(NULLIF(MAX(${typeExpr}), ''), ISNULL(MAX(${itemExpr}), '')), 1))
        WHEN 'R' THEN 'Ring'
        WHEN 'E' THEN 'Earring'
        WHEN 'N' THEN 'Necklace'
        WHEN 'T' THEN 'Bracelet'
        WHEN 'B' THEN 'Bangle'
        ELSE 'Unclassified'
      END
    )
  `;
}

function buildSalesFilters(req, request, headerAlias = 'h', detailAlias = 'd', dateExpr = null) {
  const years = parseCsvInts(req.query.years, [new Date().getFullYear()]);
  const months = parseCsvInts(req.query.months);
  const customers = parseCsvStrings(req.query.customers);
  const types = parseCsvStrings(req.query.types).map(v => v.toUpperCase());
  const effectiveDateExpr = dateExpr || `${headerAlias}.OrdDate`;

  const yearParams = addInParams(request, 'sy', years, sql.Int);
  const filters = [
    `YEAR(${effectiveDateExpr}) IN (${yearParams})`,
    `SUBSTRING(${headerAlias}.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')`,
    `(${headerAlias}.PONo IS NULL OR UPPER(${headerAlias}.PONo) NOT LIKE '%SAMPLE%')`,
  ];

  if (months.length > 0) {
    const monthParams = addInParams(request, 'sm', months, sql.Int);
    filters.push(`MONTH(${effectiveDateExpr}) IN (${monthParams})`);
  }

  if (customers.length > 0) {
    const customerParams = addInParams(request, 'sc', customers, sql.NVarChar);
    filters.push(`${headerAlias}.CustCode IN (${customerParams})`);
  }

  if (types.length > 0) {
    const typeParams = addInParams(request, 'st', types, sql.NVarChar);
    filters.push(`${salesProductTypeSql(detailAlias)} IN (${typeParams})`);
  }

  return { years, months, customers, types, whereSql: filters.join('\n        AND ') };
}

// [SALES CUSTOMER GROUPS] GET /api/dashboard/sales-customer-groups
router.get('/sales-customer-groups', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { whereSql } = buildSalesFilters(req, request, 'h', 'd');

    const result = await request.query(`
      SELECT
        h.CustCode AS customerCode,
        ISNULL(MAX(c.CustName), h.CustCode) AS customerName,
        YEAR(h.OrdDate) AS year,
        MONTH(h.OrdDate) AS month,
        COUNT(DISTINCT h.OrdNo) AS orderCount,
        SUM(ISNULL(d.ItemQty, 0)) AS qty,
        SUM(ISNULL(d.ExportQty, 0)) AS shippedQty,
        SUM(ISNULL(d.ItemExchAmnt, d.ItemAmnt)) AS amount
      FROM OrdHD h
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
      WHERE ${whereSql}
        AND ISNULL(c.CustStatus, 'Y') = 'Y'
      GROUP BY h.CustCode, YEAR(h.OrdDate), MONTH(h.OrdDate)
      ORDER BY year, month, customerCode
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-customer-groups:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES MONTHLY ANALYTICS] GET /api/dashboard/sales-monthly-analytics
router.get('/sales-monthly-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const dateView = String(req.query.dateView || 'order').toLowerCase() === 'ship' ? 'ship' : 'order';
    const dateExpr = dateView === 'ship' ? 'd.ExportDate' : 'h.OrdDate';
    const { whereSql } = buildSalesFilters(req, request, 'h', 'd', dateExpr);

    const result = await request.query(`
      SELECT
        YEAR(${dateExpr}) AS year,
        MONTH(${dateExpr}) AS month,
        COUNT(DISTINCT h.OrdNo) AS orderCount,
        SUM(ISNULL(d.ItemQty, 0)) AS qty,
        SUM(ISNULL(d.ExportQty, 0)) AS shippedQty,
        SUM(CASE WHEN ISNULL(d.ItemQty, 0) > ISNULL(d.ExportQty, 0) THEN ISNULL(d.ItemQty, 0) - ISNULL(d.ExportQty, 0) ELSE 0 END) AS gapQty,
        SUM(ISNULL(d.ItemExchAmnt, d.ItemAmnt)) AS amount,
        SUM(ISNULL(d.ExportAmnt, 0)) AS shippedAmount,
        CASE WHEN SUM(ISNULL(d.ItemQty, 0)) = 0 THEN 0 ELSE (SUM(ISNULL(d.ExportQty, 0)) / SUM(ISNULL(d.ItemQty, 0))) * 100 END AS fulfillmentRate
      FROM OrdHD h
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
      WHERE ${whereSql}
        AND ISNULL(c.CustStatus, 'Y') = 'Y'
        AND d.ItemNo IS NOT NULL
      GROUP BY YEAR(${dateExpr}), MONTH(${dateExpr})
      ORDER BY year, month
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-monthly-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES TYPE ANALYTICS] GET /api/dashboard/sales-type-analytics
router.get('/sales-type-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const dateView = String(req.query.dateView || 'order').toLowerCase() === 'ship' ? 'ship' : 'order';
    const dateExpr = dateView === 'ship' ? 'd.ExportDate' : 'h.OrdDate';
    const typeExpr = salesProductTypeSql('d');
    const { whereSql } = buildSalesFilters(req, request, 'h', 'd', dateExpr);

    const result = await request.query(`
      WITH Lines AS (
        SELECT
          YEAR(${dateExpr}) AS year,
          MONTH(${dateExpr}) AS month,
          ${typeExpr} AS typeCode,
          h.OrdNo AS orderNo,
          ISNULL(d.ItemQty, 0) AS qty,
          ISNULL(d.ExportQty, 0) AS shippedQty,
          CASE WHEN ISNULL(d.ItemQty, 0) > ISNULL(d.ExportQty, 0) THEN ISNULL(d.ItemQty, 0) - ISNULL(d.ExportQty, 0) ELSE 0 END AS gapQty,
          ISNULL(d.ItemExchAmnt, d.ItemAmnt) AS amount,
          ISNULL(d.ExportAmnt, 0) AS shippedAmount
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
        WHERE ${whereSql}
          AND ISNULL(c.CustStatus, 'Y') = 'Y'
          AND d.ItemNo IS NOT NULL
      )
      SELECT
        year,
        month,
        typeCode,
        ${salesProductTypeNameSql('typeCode')} AS typeName,
        COUNT(DISTINCT orderNo) AS orderCount,
        SUM(qty) AS qty,
        SUM(shippedQty) AS shippedQty,
        SUM(gapQty) AS gapQty,
        SUM(amount) AS amount,
        SUM(shippedAmount) AS shippedAmount,
        CASE WHEN SUM(qty) = 0 THEN 0 ELSE (SUM(shippedQty) / SUM(qty)) * 100 END AS fulfillmentRate
      FROM Lines
      GROUP BY year, month, typeCode
      ORDER BY year, month, typeCode
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-type-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES ORDER DETAIL] GET /api/dashboard/sales-orders
router.get('/sales-orders', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { whereSql } = buildSalesFilters(req, request, 'h', 'd');

    const result = await request.query(`
      SELECT
        h.OrdNo AS orderNo,
        h.PONo AS poNo,
        h.OrdDate AS ordDate,
        h.CustDueDate AS custDueDate,
        h.CustCode AS customerCode,
        ISNULL(c.CustName, h.CustCode) AS customerName,
        ISNULL(NULLIF(h.SoldTo, ''), ISNULL(c.CustName, h.CustCode)) AS brand,
        d.ItemNo AS itemNo,
        ISNULL(NULLIF(d.ItemType, ''), LEFT(ISNULL(d.ItemNo, ''), 3)) AS itemType,
        ${itemTypeNameSql('d.ItemType', 'd.ItemNo', 'gt.GoodTypeNameEng', 'gt.GoodTypeName')} AS itemTypeName,
        ${salesProductTypeSql('d')} AS productTypeCode,
        ISNULL(d.ItemQty, 0) AS orderQty,
        ISNULL(d.ExportQty, 0) AS shippedQty,
        ISNULL(d.ItemExchAmnt, d.ItemAmnt) AS amount,
        ${salesStatusSql('d.ItemQty', 'd.ExportQty', 'h.CustDueDate')} AS status,
        ISNULL(NULLIF(c.Country, ''), '-') AS market
      FROM OrdHD h
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
      LEFT JOIN GMGoodType gt ON gt.GoodTypeCode = d.ItemType
      WHERE ${whereSql}
        AND ISNULL(c.CustStatus, 'Y') = 'Y'
        AND d.ItemNo IS NOT NULL
      ORDER BY h.OrdDate DESC, h.OrdNo, d.OrdLineNo
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-orders:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [TOP ITEMS] GET /api/dashboard/top-items
router.get('/top-items', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { whereSql } = buildSalesFilters(req, request, 'h', 'd');
    const metric = String(req.query.metric || 'amount').toLowerCase() === 'qty' ? 'qty' : 'amount';
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isNaN(rawLimit) ? 30 : Math.min(Math.max(rawLimit, 1), 100);
    request.input('limit', sql.Int, limit);

    const orderExpr = metric === 'qty' ? 'qty' : 'amount';

    const result = await request.query(`
      WITH ItemCustomer AS (
        SELECT
          d.ItemNo AS itemNo,
          h.CustCode AS customerCode,
          ISNULL(c.CustName, h.CustCode) AS customerName,
          SUM(ISNULL(d.ItemQty, 0)) AS qty,
          SUM(ISNULL(d.ItemExchAmnt, d.ItemAmnt)) AS amount
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
        WHERE ${whereSql}
          AND ISNULL(c.CustStatus, 'Y') = 'Y'
          AND d.ItemNo IS NOT NULL
        GROUP BY d.ItemNo, h.CustCode, c.CustName
      ),
      PrimaryCustomer AS (
        SELECT
          itemNo,
          customerCode,
          customerName,
          ROW_NUMBER() OVER (PARTITION BY itemNo ORDER BY ${orderExpr} DESC, customerCode) AS rn
        FROM ItemCustomer
      ),
      ItemTotals AS (
        SELECT
          d.ItemNo AS itemNo,
          MAX(d.ItemDesc) AS itemDesc,
          ISNULL(NULLIF(MAX(d.ItemType), ''), LEFT(ISNULL(d.ItemNo, ''), 3)) AS itemType,
          ${itemTypeNameMaxSql('d.ItemType', 'd.ItemNo', 'gt.GoodTypeNameEng', 'gt.GoodTypeName')} AS itemTypeName,
          ${salesProductTypeSql('d')} AS productTypeCode,
          SUM(ISNULL(d.ItemQty, 0)) AS qty,
          SUM(ISNULL(d.ExportQty, 0)) AS shippedQty,
          SUM(ISNULL(d.ItemExchAmnt, d.ItemAmnt)) AS amount,
          COUNT(DISTINCT h.OrdNo) AS orderCount
        FROM OrdHD h
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo
        LEFT JOIN GMGoodType gt ON gt.GoodTypeCode = d.ItemType
        WHERE ${whereSql}
          AND ISNULL(c.CustStatus, 'Y') = 'Y'
          AND d.ItemNo IS NOT NULL
        GROUP BY d.ItemNo, ${salesProductTypeSql('d')}
      )
      SELECT TOP (@limit)
        t.itemNo,
        t.itemDesc,
        t.itemType,
        t.itemTypeName,
        t.productTypeCode,
        t.qty,
        t.shippedQty,
        t.amount,
        t.orderCount,
        CASE WHEN t.qty = 0 THEN 0 ELSE t.amount / t.qty END AS avgPrice,
        p.customerCode AS primaryCustomerCode,
        p.customerName AS primaryCustomerName
      FROM ItemTotals t
      LEFT JOIN PrimaryCustomer p ON p.itemNo = t.itemNo AND p.rn = 1
      ORDER BY t.${orderExpr} DESC
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/top-items:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});
module.exports = router;
