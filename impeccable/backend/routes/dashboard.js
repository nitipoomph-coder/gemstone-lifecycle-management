const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// ─── GET /api/dashboard ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();

    // 1. Production Stats
    // Orders Today
    const todayResult = await pool.request().query(`
      SELECT COUNT(*) AS total FROM OrdHD 
      WHERE CAST(OrdDate AS DATE) = CAST(GETDATE() AS DATE)
    `);
    const ordersToday = todayResult.recordset[0].total;

    // Completed
    const completedResult = await pool.request().query(`
      SELECT COUNT(*) AS total FROM OrdHD 
      WHERE CloseStatus = 'Y' OR OrdStatus = 'C'
    `);
    const completed = completedResult.recordset[0].total;

    // WIP
    const wipResult = await pool.request().query(`
      SELECT COUNT(*) AS total FROM OrdHD 
      WHERE OrdStatus IN ('P', 'N') AND CloseStatus <> 'Y'
    `);
    const wip = wipResult.recordset[0].total;

    // Delay
    const delayResult = await pool.request().query(`
      SELECT COUNT(*) AS total FROM OrdHD 
      WHERE DueDate < CAST(GETDATE() AS DATE) AND OrdStatus IN ('P', 'N') AND CloseStatus <> 'Y'
    `);
    const delay = delayResult.recordset[0].total;

    // Defect (No defect table available, mock as 0)
    const defect = 0;

    const productionStats = [
      { label: 'ORDERS TODAY', value: String(ordersToday), change: '', trend: 'up' },
      { label: 'COMPLETED', value: String(completed), change: '', trend: 'good' },
      { label: 'WIP', value: String(wip), change: '', trend: 'up' },
      { label: 'DELAY', value: String(delay), change: '', trend: 'bad', isAlert: delay > 0 },
      { label: 'DEFECT', value: String(defect), change: '', trend: 'good' },
    ];

    // 2. Delay Orders
    const delayOrdersResult = await pool.request().query(`
      SELECT TOP 5 
        OrdNo as no, 
        CustCode as customer, 
        DueDate as date, 
        DATEDIFF(day, DueDate, GETDATE()) as delayDays 
      FROM OrdHD 
      WHERE DueDate < CAST(GETDATE() AS DATE) AND OrdStatus IN ('P', 'N') AND CloseStatus <> 'Y' 
      ORDER BY DueDate ASC
    `);
    const delayOrders = delayOrdersResult.recordset.map(r => ({
      no: r.no,
      customer: r.customer,
      date: new Date(r.date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      delay: `${r.delayDays} วัน`,
    }));

    // 3. Live Tracking (Latest Active Orders)
    const liveTrackingResult = await pool.request().query(`
      SELECT TOP 5 
        d.OrdNo as no, 
        d.ItemNo as item, 
        d.ItemStatus,
        h.OrdDate
      FROM OrdDT d
      JOIN OrdHD h ON d.OrdNo = h.OrdNo
      WHERE h.OrdStatus IN ('P', 'N') AND h.CloseStatus <> 'Y'
      ORDER BY h.OrdDate DESC
    `);
    const liveTracking = liveTrackingResult.recordset.map(r => ({
      no: r.no,
      item: r.item,
      process: r.ItemStatus === 'Y' ? 'Completed' : 'Processing',
      location: 'โรงงาน',
      time: new Date(r.OrdDate).toLocaleDateString('th-TH'),
    }));

    // 4. Material Alerts (Mock for now since table is unknown)
    const materialAlerts = [
      { item: 'Gold 18K Yellow', type: 'Gold', currentStock: '120g', minStock: '500g', status: 'critical' },
      { item: 'Ruby 3mm Round', type: 'Gemstone', currentStock: '45 pcs', minStock: '100 pcs', status: 'low' },
    ];

    res.json({
      productionStats,
      delayOrders,
      liveTracking,
      materialAlerts
    });

  } catch (err) {
    console.error('[API ERROR] /api/dashboard:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
