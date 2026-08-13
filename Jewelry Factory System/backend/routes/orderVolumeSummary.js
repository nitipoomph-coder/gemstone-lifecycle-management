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

function salesDateBasis(req, viewAlias = 'v') {
  const raw = String(req.query.dateView || req.query.dateBasis || 'orddate').toLowerCase();
  const aliases = {
    order: 'orddate',
    ord: 'orddate',
    orddate: 'orddate',
    due: 'duedate',
    duedate: 'duedate',
    cust: 'custdate',
    custdate: 'custdate',
    ship: 'orddate',
    shipmonth: 'orddate',
    ordmonth: 'orddate',
  };
  const basis = aliases[raw] || 'orddate';
  const dateExprByBasis = {
    orddate: viewAlias + '.OrdDate',
    duedate: viewAlias + '.DueDate',
    custdate: viewAlias + '.CustDueDate',
  };
  return { basis, dateExpr: dateExprByBasis[basis] || viewAlias + '.OrdDate' };
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
    `ISNULL(${viewAlias}.OrdStatus, '') != 'C'`,
    `ISNULL(${viewAlias}.CloseStatus, '') != 'C'`,
    `SUBSTRING(${viewAlias}.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')`,
    `(${viewAlias}.PONo IS NULL OR UPPER(${viewAlias}.PONo) NOT LIKE '%SAMPLE%')`,
  ];

  if (customers.length > 0) {
    const customerParams = addInParams(request, 'sc', customers, sql.NVarChar);
    filters.push(`${viewAlias}.CustCode IN (${customerParams})`);
  }

  if (types.length > 0) {
    const typeParams = addInParams(request, 'st', types, sql.NVarChar);
    filters.push(`UPPER(ISNULL(${viewAlias}.ProductType, 'OTHERS')) IN (${typeParams})`);
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
        CASE WHEN COUNT(DISTINCT v.OrdNo) = 0 THEN 0 ELSE CAST(SUM(v.ItemQty) AS FLOAT) / COUNT(DISTINCT v.OrdNo) END AS avgQtyPerOrder
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

// [SALES TYPE ANALYTICS] GET /api/dashboard/sales-type-analytics
router.get('/sales-type-analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const typeExpr = `UPPER(ISNULL(v.ProductType, 'OTHERS'))`;
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      WITH Lines AS (
        SELECT
          YEAR(${dateExpr}) AS year,
          MONTH(${dateExpr}) AS month,
          ${typeExpr} AS typeCode,
          v.OrdNo AS orderNo,
          v.ItemQty AS qty
        FROM ${SALES_ANALYTICS_VIEW} v
        WHERE ${whereSql}
      )
      SELECT
        year,
        month,
        typeCode,
        ${salesProductTypeNameSql('typeCode')} AS typeName,
        COUNT(DISTINCT orderNo) AS orderCount,
        SUM(qty) AS qty
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
        SUM(v.OpenQty) AS gapQty
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

// [SALES ORDER DETAIL] GET /api/dashboard/sales-orders
router.get('/sales-orders', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        v.OrdNo AS orderNo,
        v.PONo AS poNo,
        v.EXNo AS po2,
        v.OrdDate AS ordDate,
        v.DueDate AS dueDate,
        v.CustDueDate AS custDate,
        v.CustCode AS customerCode,
        v.SalesName AS salesName,
        v.ShipTo AS shipTo,
        v.OrdStamp AS ordStamp,
        v.OrdMaker AS ordMaker,
        v.ItemNo AS itemNo,
        v.CustItem AS custItem,
        v.ItemType AS itemType,
        UPPER(ISNULL(v.ProductType, 'OTHERS')) AS productTypeCode,
        v.ItemMat AS itemMat,
        v.ItemSize AS itemSize,
        v.ItemStone AS itemStone,
        v.ItemDesc AS itemDesc,
        v.ItemPlate AS itemPlate,
        v.SetType AS setType,
        v.ItemQty AS orderQty,
        v.ExportQty AS shippedQty,
        v.OpenQty AS openQty,
        v.OrdStatus AS ordStatus,
        v.CloseStatus AS closeStatus
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
