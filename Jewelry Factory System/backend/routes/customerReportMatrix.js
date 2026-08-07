// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Customer Report Matrix (routes/customerReportMatrix.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles yearly aggregated sales data per customer directly querying OrdHD/OrdDT.
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

/*
 * =============================================================================
 * CUSTOMER SUMMARY ROUTES OVERVIEW
 * =============================================================================
 * Route                                  | Page/Menu           | Description
 * -------------------------------------- | ------------------- | ------------------------
 * GET /api/dashboard/customer-summary   | Customer Dashboard  | Sales by customer/year
 * GET /api/dashboard/customer-summary   | Top Orders          | First-load ranking source
 *
 * Filter policy:
 * - years selects the dashboard period; months narrows customer totals and top item ranking.
 * - Uses legacy NOT IN OrdNo blocklist: BBP, BBK, BBS, BBL, BBT, BBD.
 * - Active customers only: CustStatus = 'Y'.
 * =============================================================================
 */

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
// Customer Summary cards and Top Orders first ranking source.
router.get('/customer-summary', async (req, res) => {
  try {
    const pool = await getPool();
    const years = (req.query.years || '').split(',').map(y => parseInt(y)).filter(y => !isNaN(y));
    if (years.length === 0) years.push(new Date().getFullYear());
    const months = req.query.months ? req.query.months.split(',').map(m => parseInt(m)).filter(m => !isNaN(m)) : [];

    const request = pool.request();
    // SARGable date range helper
    function buildDateRangeCondition(col, yearList, monthList) {
      if (!yearList || yearList.length === 0) return '1=1';
      if (!monthList || monthList.length === 0) {
        return '(' + yearList.map(y => `(${col} >= '${y}-01-01' AND ${col} < '${y + 1}-01-01')`).join(' OR ') + ')';
      }
      const conditions = [];
      for (const y of yearList) {
        for (const m of monthList) {
          const sM = m.toString().padStart(2, '0');
          const eM_val = m + 1;
          const eY = eM_val > 12 ? y + 1 : y;
          const eM = (eM_val > 12 ? 1 : eM_val).toString().padStart(2, '0');
          conditions.push(`(${col} >= '${y}-${sM}-01' AND ${col} < '${eY}-${eM}-01')`);
        }
      }
      return '(' + conditions.join(' OR ') + ')';
    }

    const sargableDateCondition = buildDateRangeCondition('OrdDate', years, months);
    const sargableTopItemDateCondition = buildDateRangeCondition('OrdDate', years, months);

    const query = `
      SELECT
        CustCode AS id,
        MAX(CustName) AS name,
        MAX(CustStatus) AS custStatus,
        MAX(SalesName) AS salesName,
        OrdYear AS yr,
        OrdMonth AS mth,
        SUM(ItemAmnt) AS totalSales,
        SUM(ItemQty) AS totalQty
      FROM VW_Web_SalesDashboard
      WHERE ${sargableDateCondition}
        AND ISNULL(CustStatus, 'Y') = 'Y'
      GROUP BY CustCode, OrdYear, OrdMonth
    `;
    const result = await request.query(query);

    const topItemQuery = `
      WITH ItemTotals AS (
        SELECT
          CustCode,
          ItemNo,
          SUM(ItemQty) as totalQty
        FROM VW_Web_SalesDashboard
        WHERE ${sargableTopItemDateCondition}
          AND ISNULL(CustStatus, 'Y') = 'Y'
        GROUP BY CustCode, ItemNo
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
          CustCode,
          OrdYear AS yr,
          ItemNo,
          SUM(ItemQty) as totalQty
        FROM VW_Web_SalesDashboard
        WHERE ${sargableTopItemDateCondition}
          AND ISNULL(CustStatus, 'Y') = 'Y'
        GROUP BY CustCode, OrdYear, ItemNo
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
          CustCode,
          OrdYear AS yr,
          ProductType AS productType,
          ItemNo,
          SUM(ItemQty) as totalQty
        FROM VW_Web_SalesDashboard
        WHERE ${sargableTopItemDateCondition}
          AND ISNULL(CustStatus, 'Y') = 'Y'
        GROUP BY CustCode, OrdYear, ProductType, ItemNo
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

module.exports = router;
