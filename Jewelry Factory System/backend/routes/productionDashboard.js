const express = require('express');
const router = express.Router();
const productionDashboardService = require('../services/productionDashboardService');

/*
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        DASHBOARD ROUTES OVERVIEW                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Route                          │ Dashboard Page      │ Description         ║
 * ╟─────────────────────────────────┼─────────────────────┼─────────────────────╢
 * ║  GET /api/dashboard              │ Main Dashboard      │ Stat cards, charts  ║
 * ║  GET /api/dashboard/years        │ All Dashboards      │ Available years     ║
 * ║  GET /api/dashboard/detail/:type │ Main Dashboard      │ Card drill-down     ║
 * ║  GET /api/dashboard/sales-summary│ Sales Dashboard     │ Sales by rep/year   ║
 * ║  GET /api/dashboard/customer-summary│ Customer Dashboard│ Sales by cust/year  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
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
//  10. Executive Cockpit Data — Zero-Scroll Factory Overview (WIP, Overdue, Pipeline, Depts)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const data = await productionDashboardService.getMainDashboardData({
      yearParam: req.query.year,
      facilityParam: req.query.facility,
    });
    res.json(data);
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
    const result = await productionDashboardService.getDashboardYears();
    res.json(result);
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
    const { cardType } = req.params;
    if (!['today', 'completed', 'wip', 'overdue', 'month'].includes(cardType)) {
      return res.status(400).json({ ok: false, error: 'Invalid cardType' });
    }

    const response = await productionDashboardService.getCardDetailData({
      cardType,
      year1Param: req.query.year1,
      year2Param: req.query.year2,
    });
    res.json(response);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    console.error('[API ERROR] /api/dashboard/detail:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// [SALES DASHBOARD] GET /api/dashboard/sales-summary?years=2024,2025
// ใช้โดย: หน้า Sales Dashboard (SalesDashboard.tsx)
// หน้าที่: ดึงยอดขายรวม (SumOrdExchAmnt) จัดกลุ่มตาม Sales Rep และปี
//         เพื่อแสดง Bar Chart เปรียบเทียบยอดขายแต่ละ Sales ข้ามหลายปี
//         JOIN GMCust → GMEmp เพื่อ map CustCode → SalesName
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/sales-summary', async (req, res) => {
  try {
    const result = await productionDashboardService.getSalesSummaryData(req.query.years);
    res.json(result);
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;