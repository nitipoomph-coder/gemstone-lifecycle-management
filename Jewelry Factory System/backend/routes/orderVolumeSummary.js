// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Customer Sales Analysis (routes/salesAnalytics.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles data fetching for the Order Trends dashboards from the new lean
// view VW_Web_OrderTrends (Volume/Qty only, No Pricing).
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

const SALES_ANALYTICS_VIEW = 'dbo.VW_Web_OrderTrends';

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

function salesProductTypeNameSql(codeExpr = 'typeCode') {
  return codeExpr;
}

function salesDateBasis(req, viewAlias = 'v') {
  return { basis: 'orddate', dateExpr: viewAlias + '.OrdDate' };
}

// Applies the shared year/month/customer/type filters for sales endpoints.
function buildSalesFilters(req, request, viewAlias = 'v', dateExpr = null) {
  const years = parseCsvInts(req.query.years, [new Date().getFullYear()]);
  const months = parseCsvInts(req.query.months);
  const customers = parseCsvStrings(req.query.customers);
  const types = parseCsvStrings(req.query.types).map(v => v.toUpperCase());
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const effectiveDateExpr = dateExpr || salesDateBasis(req, viewAlias).dateExpr;

  function buildDateRangeCondition(col, yearList, monthList) {
    if (startDate && endDate) {
      return `(${col} >= '${startDate} 00:00:00' AND ${col} <= '${endDate} 23:59:59')`;
    }
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

  const sargableDateCondition = buildDateRangeCondition(effectiveDateExpr, years, months);

  const filters = [
    sargableDateCondition,
  ];

  if (customers.length > 0) {
    const customerParams = addInParams(request, 'sc', customers, sql.NVarChar);
    filters.push(`${viewAlias}.CustCode IN (${customerParams})`);
  }

  if (types.length > 0) {
    const typeParams = addInParams(request, 'st', types, sql.NVarChar);
    filters.push(`LEFT(ISNULL(${viewAlias}.ItemNo, ''), 3) IN (${typeParams})`);
  }

  return { years, months, customers, types, whereSql: filters.join('\n        AND ') };
}

// [SALES MONTHLY ANALYTICS] GET /api/dashboard/sales-monthly-analytics
router.get('/sales-monthly-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        YEAR(${dateExpr}) AS year,
        MONTH(${dateExpr}) AS month,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        SUM(v.ItemQty) AS qty,
        SUM(v.ExportQty) AS shippedQty,
        SUM(v.OpenQty) AS gapQty,
        SUM(v.ItemAmnt) AS amount,
        SUM(ISNULL(v.ExportQty * v.ItemPrice, 0)) AS shippedAmount,
        CASE WHEN COUNT(DISTINCT v.OrdNo) = 0 THEN 0 ELSE CAST(SUM(v.ItemQty) AS FLOAT) / COUNT(DISTINCT v.OrdNo) END AS avgQtyPerOrder,
        CASE WHEN COUNT(DISTINCT v.OrdNo) = 0 THEN 0 ELSE CAST(SUM(v.ItemAmnt) AS FLOAT) / COUNT(DISTINCT v.OrdNo) END AS avgAmountPerOrder
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      GROUP BY YEAR(${dateExpr}), MONTH(${dateExpr})
      ORDER BY year, month
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-monthly-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES RISK ANALYTICS] GET /api/dashboard/sales-risk-analytics
router.get('/sales-risk-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      WITH Lines AS (
        SELECT
          YEAR(${dateExpr}) AS year,
          MONTH(${dateExpr}) AS month,
          v.CustCode AS custCode,
          v.ItemQty AS qty,
          v.OpenQty AS openQty,
          v.ItemAmnt AS amount,
          v.CustDueDate AS custDueDate
        FROM ${SALES_ANALYTICS_VIEW} v
        WHERE ${whereSql} AND v.OpenQty > 0
      )
      SELECT
        year,
        month,
        custCode,
        SUM(openQty) AS wipQty,
        SUM(CASE WHEN qty > 0 THEN (CAST(openQty AS FLOAT) / qty) * amount ELSE 0 END) AS wipAmount,
        SUM(CASE WHEN custDueDate < GETDATE() THEN openQty ELSE 0 END) AS overdueQty,
        SUM(CASE WHEN custDueDate < GETDATE() THEN (CASE WHEN qty > 0 THEN (CAST(openQty AS FLOAT) / qty) * amount ELSE 0 END) ELSE 0 END) AS overdueAmount
      FROM Lines
      GROUP BY year, month, custCode
      ORDER BY year, month, custCode
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-risk-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES WEEKLY ANALYTICS] GET /api/dashboard/sales-weekly-analytics
router.get('/sales-weekly-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        YEAR(${dateExpr}) AS year,
        DATEPART(iso_week, ${dateExpr}) AS week,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        SUM(v.ItemQty) AS qty,
        SUM(v.ExportQty) AS shippedQty,
        SUM(v.OpenQty) AS gapQty,
        SUM(v.ItemAmnt) AS amount,
        SUM(ISNULL(v.ExportQty * v.ItemPrice, 0)) AS shippedAmount
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      GROUP BY YEAR(${dateExpr}), DATEPART(iso_week, ${dateExpr})
      ORDER BY year, week
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-weekly-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [DELIVERY & DEPARTMENT OUTLOOK] GET /api/dashboard/sales-delivery-outlook
router.get('/sales-delivery-outlook', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      -- 1. Delivery Risk Buckets
      SELECT 
        v.DueRiskBucket AS bucket,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        COUNT(1) AS lineCount,
        SUM(v.ItemQty) AS totalQty,
        SUM(v.ExportQty) AS shippedQty,
        SUM(v.OpenQty) AS openQty,
        SUM(v.ItemAmnt) AS totalAmount,
        SUM(ISNULL(v.ExportQty * v.ItemPrice, 0)) AS shippedAmount,
        SUM(CASE WHEN v.ItemQty > 0 THEN v.ItemAmnt * (CAST(v.OpenQty AS FLOAT) / v.ItemQty) ELSE 0 END) AS openAmount
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      GROUP BY v.DueRiskBucket;

      -- 2. Department Breakdown for Open/Pending items
      SELECT 
        v.CurrentDepartment AS department,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        COUNT(1) AS lineCount,
        SUM(v.OpenQty) AS openQty,
        SUM(CASE WHEN v.ItemQty > 0 THEN v.ItemAmnt * (CAST(v.OpenQty AS FLOAT) / v.ItemQty) ELSE 0 END) AS openAmount
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql} AND v.OpenQty > 0 AND v.CurrentDepartment <> 'Shipped'
      GROUP BY v.CurrentDepartment
      ORDER BY openQty DESC;

      -- 3. Customer Code Backlog Summary (Confidential - No CustName)
      SELECT 
        v.CustCode AS custCode,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        SUM(v.ItemQty) AS totalQty,
        SUM(v.ExportQty) AS shippedQty,
        SUM(v.OpenQty) AS openQty,
        SUM(v.ItemAmnt) AS totalAmount,
        SUM(CASE WHEN v.DueRiskBucket = 'Overdue' THEN v.OpenQty ELSE 0 END) AS overdueQty,
        SUM(CASE WHEN v.DueRiskBucket = 'Due in 15 Days' THEN v.OpenQty ELSE 0 END) AS due15Qty
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      GROUP BY v.CustCode
      ORDER BY openQty DESC;
    `);

    res.json({
      ok: true,
      data: {
        buckets: result.recordsets[0] || [],
        departments: result.recordsets[1] || [],
        customers: result.recordsets[2] || []
      }
    });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-delivery-outlook:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// [SALES ORDER DETAIL] GET /api/dashboard/sales-orders
router.get('/sales-orders', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    let { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const bucket = req.query.bucket;
    const department = req.query.department;

    if (bucket) {
      request.input('paramBucket', sql.NVarChar, bucket);
      whereSql += ` AND v.DueRiskBucket = @paramBucket`;
    }
    if (department) {
      request.input('paramDept', sql.NVarChar, department);
      whereSql += ` AND v.CurrentDepartment = @paramDept`;
    }

    const result = await request.query(`
      SELECT
        v.OrdWeek AS ordWeek,
        v.OrdNo AS orderNo,
        v.PONo AS poNo,
        v.PO2 AS po2,
        v.OrdDate AS ordDate,
        v.DueDate AS dueDate,
        v.CustDueDate AS custDate,
        v.CustCode AS customerCode,
        v.OrdKind AS ordKind,
        v.Metal AS metal,
        v.ShipTo AS shipTo,
        v.ItemNo AS itemNo,
        LEFT(ISNULL(v.ItemNo, ''), 3) AS productTypeCode,
        v.ItemQty AS orderQty,
        v.ExportQty AS shippedQty,
        v.OpenQty AS openQty,
        v.ItemPrice AS itemPrice,
        v.ItemAmnt AS itemAmnt,
        ISNULL(v.ExportQty * v.ItemPrice, 0) AS shippedAmnt,
        v.DaysToCustDue AS daysToCustDue,
        v.DueRiskBucket AS dueRiskBucket,
        v.CurrentDepartment AS currentDepartment
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
      ORDER BY v.OrdDate DESC, v.OrdNo
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-orders:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Legacy routes kept alive to avoid breaking other pages
router.get('/top-items', async (req, res) => {
  res.json({ ok: true, data: [] });
});
router.get('/sales-customer-groups', async (req, res) => {
  res.json({ ok: true, data: [] });
});
router.get('/sales-due-outlook', async (req, res) => {
  res.json({ ok: true, data: [] });
});

module.exports = router;
