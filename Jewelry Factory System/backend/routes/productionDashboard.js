const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// â”€â”€â”€ Detail Cache (à¹à¸¢à¸à¸ˆà¸²à¸ main dashboard cache â€” TTL 10 à¸™à¸²à¸—à¸µ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// à¹ƒà¸Šà¹‰à¸ªà¸³à¸«à¸£à¸±à¸š cache à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆ query à¸‹à¹‰à¸³à¸šà¹ˆà¸­à¸¢ à¹€à¸Šà¹ˆà¸™ years, detail drilldown
const detailCache = new Map();
const DETAIL_TTL = 10 * 60 * 1000;
function getDC(k) { const e = detailCache.get(k); if (!e) return null; if (Date.now() > e.ex) { detailCache.delete(k); return null; } return e.d; }
function setDC(k, d) { detailCache.set(k, { d, ex: Date.now() + DETAIL_TTL }); }

/*
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘                        DASHBOARD ROUTES OVERVIEW                            â•‘
 * â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
 * â•‘  Route                          â”‚ Dashboard Page      â”‚ Description         â•‘
 * â•Ÿâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¢
 * â•‘  GET /api/dashboard              â”‚ Main Dashboard      â”‚ Stat cards, charts  â•‘
 * â•‘  GET /api/dashboard/years        â”‚ All Dashboards      â”‚ Available years     â•‘
 * â•‘  GET /api/dashboard/detail/:type â”‚ Main Dashboard      â”‚ Card drill-down     â•‘
 * â•‘  GET /api/dashboard/sales-summaryâ”‚ Sales Dashboard     â”‚ Sales by rep/year   â•‘
 * â•‘  GET /api/dashboard/customer-summaryâ”‚ Customer Dashboardâ”‚ Sales by cust/year  â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * OrdNo Prefix Filter Policy:
 * - Main Dashboard & Sales Dashboard: à¹ƒà¸Šà¹‰ IN allowlist (à¸£à¸§à¸¡à¸—à¸¸à¸ order type)
 * - Customer Dashboard: à¹ƒà¸Šà¹‰ NOT IN blocklist à¸•à¸²à¸¡ Legacy VB.NET (FrmSalesYear_SumCust)
 *   â†’ à¹„à¸¡à¹ˆà¸™à¸±à¸š BBP, BBK, BBS, BBL, BBT, BBD (à¹€à¸›à¹‡à¸™à¸£à¸²à¸¢à¸à¸²à¸£à¸žà¸´à¹€à¸¨à¸©/à¸ à¸²à¸¢à¹ƒà¸™)
 */

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// [MAIN DASHBOARD] GET /api/dashboard
// à¹ƒà¸Šà¹‰à¹‚à¸”à¸¢: à¸«à¸™à¹‰à¸² Main Dashboard (à¸«à¸™à¹‰à¸²à¹à¸£à¸)
// à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ: à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸§à¸¡à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¹ƒà¸™à¸„à¸£à¸±à¹‰à¸‡à¹€à¸”à¸µà¸¢à¸§ à¸›à¸£à¸°à¸à¸­à¸šà¸”à¹‰à¸§à¸¢ 9 à¸ªà¹ˆà¸§à¸™:
//   1. Stat Cards (5 cards)   â€” à¸ªà¸£à¸¸à¸›à¸¢à¸­à¸” Orders à¸§à¸±à¸™à¸™à¸µà¹‰, Completed, WIP, Overdue, à¹€à¸”à¸·à¸­à¸™à¸™à¸µà¹‰
//   2. 7-Day Order Trend      â€” à¸à¸£à¸²à¸Ÿà¹à¸—à¹ˆà¸‡ 7 à¸§à¸±à¸™à¸¥à¹ˆà¸²à¸ªà¸¸à¸”
//   3. Process Distribution   â€” Donut chart à¸ªà¸–à¸²à¸™à¸° production (Castingâ†’Packing)
//   4. Material Breakdown     â€” à¸ªà¸±à¸”à¸ªà¹ˆà¸§à¸™à¸§à¸±à¸ªà¸”à¸¸ (Brass/Silver/Tin)
//   5. Order Types            â€” New vs Replenishment
//   6. Top Customers          â€” à¸¥à¸¹à¸à¸„à¹‰à¸² active orders à¸ªà¸¹à¸‡à¸ªà¸¸à¸” 9 à¸­à¸±à¸™à¸”à¸±à¸š
//   7. Critical Delay Orders  â€” à¸£à¸²à¸¢à¸à¸²à¸£ overdue à¹€à¸£à¸µà¸¢à¸‡à¸ˆà¸²à¸à¹€à¸à¹ˆà¸²à¸ªà¸¸à¸”
//   8. Recent Orders          â€” 6 à¸£à¸²à¸¢à¸à¸²à¸£à¸¥à¹ˆà¸²à¸ªà¸¸à¸” (Live Feed)
//   9. Stone & Finding        â€” à¸ªà¸£à¸¸à¸›à¸žà¸¥à¸­à¸¢/à¸­à¸°à¹„à¸«à¸¥à¹ˆà¸„à¹‰à¸²à¸‡à¹ƒà¸™à¸ªà¸²à¸¢à¸à¸²à¸£à¸œà¸¥à¸´à¸•
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 1. STAT CARDS (5 cards: Orders Today, Completed, WIP, Delay, This Month)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 2. 7-DAY ORDER TREND (bar chart data)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 3. PROCESS DISTRIBUTION (donut chart â€” items at each production stage)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 4. MATERIAL BREAKDOWN (Brass/Silver/Other for active orders)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 5. ORDER TYPE (New vs Replenishment)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 6. TOP CUSTOMERS (by active order count)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 7. CRITICAL DELAY ORDERS (with PO & customer info)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      poNo: r.PONo || 'â€”',
      custCode: r.CustCode,
      custName: r.custName,
      dueDate: r.DueDate,
      delayDays: r.delayDays,
      qty: r.qty,
    }));

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 8. RECENT ORDERS (Latest 6 orders â€” "Live Feed")
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      poNo: r.PONo || 'â€”',
      custCode: r.CustCode,
      ordDate: r.OrdDate,
      material: r.OrdMat === 'B' ? 'Brass' : r.OrdMat === 'S' ? 'Silver' : r.OrdMat || 'â€”',
      type: r.OrdKind === 'NEW' ? 'New' : r.OrdKind === 'REP' ? 'Replen' : r.OrdKind || 'â€”',
      qty: r.qty,
      status: r.status,
    }));

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 9. STONE & FINDING SUMMARY (à¸žà¸¥à¸­à¸¢/à¸­à¸°à¹„à¸«à¸¥à¹ˆà¸„à¹‰à¸²à¸‡à¹ƒà¸™à¸ªà¸²à¸¢à¸à¸²à¸£à¸œà¸¥à¸´à¸•)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // RESPONSE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// [ALL DASHBOARDS] GET /api/dashboard/years
// à¹ƒà¸Šà¹‰à¹‚à¸”à¸¢: à¸—à¸¸à¸ Dashboard (Main, Sales, Customer)
// à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ: à¸”à¸¶à¸‡à¸›à¸µà¸—à¸µà¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥ OrdHD à¸­à¸¢à¸¹à¹ˆà¹ƒà¸™à¸£à¸°à¸šà¸š à¸ªà¸³à¸«à¸£à¸±à¸šà¹ƒà¸«à¹‰ user à¹€à¸¥à¸·à¸­à¸ filter
//         à¸¡à¸µ cache TTL 10 à¸™à¸²à¸—à¸µà¹€à¸žà¸·à¹ˆà¸­à¸¥à¸” load
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/years', async (req, res) => {
  try {
    const cached = getDC('years');
    if (cached && Array.isArray(cached.years)) return res.json({ ok: true, years: cached.years, firstDataYear: cached.firstDataYear ?? null });

    const pool = await getPool();
    const request = pool.request();
    const result = await request.query(`
      SELECT DISTINCT YEAR(OrdDate) AS yr
      FROM OrdHD
      WHERE OrdDate IS NOT NULL
      ORDER BY yr DESC;

      SELECT MIN(YEAR(OrdDate)) AS firstDataYear
      FROM OrdHD
      WHERE OrdDate IS NOT NULL;
    `);

    let years = (result.recordsets?.[0] || []).map(row => row.yr);
    const firstDataYear = result.recordsets?.[1]?.[0]?.firstDataYear || years[years.length - 1] || null;

    if (years.length > 6) {
      years = years.slice(0, 6);
    }
    years.sort((a, b) => a - b);

    const payload = { years, firstDataYear };
    setDC('years', payload);
    res.json({ ok: true, ...payload });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/years:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// [MAIN DASHBOARD â€” DRILL DOWN] GET /api/dashboard/detail/:cardType
// à¹ƒà¸Šà¹‰à¹‚à¸”à¸¢: à¸«à¸™à¹‰à¸² Main Dashboard à¹€à¸¡à¸·à¹ˆà¸­ user à¸„à¸¥à¸´à¸à¸—à¸µà¹ˆ Stat Card
// à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ: à¹à¸ªà¸”à¸‡ Detail Popup à¹€à¸›à¸£à¸µà¸¢à¸šà¹€à¸—à¸µà¸¢à¸š 2 à¸›à¸µ (year1 vs year2)
//   - cardType: 'today' | 'completed' | 'wip' | 'overdue' | 'month'
//   - 'today' â†’ à¹€à¸—à¸µà¸¢à¸šà¸§à¸±à¸™à¸™à¸µà¹‰à¸à¸±à¸šà¸„à¹ˆà¸²à¹€à¸‰à¸¥à¸µà¹ˆà¸¢ 7 à¸§à¸±à¸™à¸—à¸³à¸‡à¸²à¸™à¸¥à¹ˆà¸²à¸ªà¸¸à¸”
//   - à¸­à¸·à¹ˆà¸™à¹†   â†’ à¹€à¸—à¸µà¸¢à¸šà¸£à¸²à¸¢à¹€à¸”à¸·à¸­à¸™ + breakdown à¸¥à¸¹à¸à¸„à¹‰à¸² top 10
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // à¸à¸³à¸«à¸™à¸” WHERE + dateField à¸•à¸²à¸¡ cardType
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// [SALES DASHBOARD] GET /api/dashboard/sales-summary?years=2024,2025
// à¹ƒà¸Šà¹‰à¹‚à¸”à¸¢: à¸«à¸™à¹‰à¸² Sales Dashboard (SalesDashboard.tsx)
// à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ: à¸”à¸¶à¸‡à¸¢à¸­à¸”à¸‚à¸²à¸¢à¸£à¸§à¸¡ (SumOrdExchAmnt) à¸ˆà¸±à¸šà¸à¸¥à¸¸à¹ˆà¸¡à¸•à¸²à¸¡ Sales Rep à¹à¸¥à¸°à¸›à¸µ
//         à¹€à¸žà¸·à¹ˆà¸­à¹à¸ªà¸”à¸‡ Bar Chart à¹€à¸›à¸£à¸µà¸¢à¸šà¹€à¸—à¸µà¸¢à¸šà¸¢à¸­à¸”à¸‚à¸²à¸¢à¹à¸•à¹ˆà¸¥à¸° Sales à¸‚à¹‰à¸²à¸¡à¸«à¸¥à¸²à¸¢à¸›à¸µ
//         JOIN GMCust â†’ GMEmp à¹€à¸žà¸·à¹ˆà¸­ map CustCode â†’ SalesName
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

module.exports = router;