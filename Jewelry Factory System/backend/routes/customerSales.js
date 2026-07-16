const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

/*
 * =============================================================================
 * CUSTOMER SALES ANALYSIS ROUTES OVERVIEW
 * =============================================================================
 * Route                                  | Page/Menu                | Description
 * -------------------------------------- | ------------------------ | ------------------------
 * GET /api/dashboard/sales-customer-groups | Customer Sales Overview | KPI/group rows
 * GET /api/dashboard/sales-monthly-analytics | Customer Sales Analysis | Month trend data
 * GET /api/dashboard/sales-type-analytics | Customer Sales Analysis | Product type trend data
 * GET /api/dashboard/sales-orders       | Customer Order List      | Order drilldown rows
 * GET /api/dashboard/top-items          | Customer Sales Overview  | Top 30 Items table
 *
 * Filter policy:
 * - buildSalesFilters() owns year/month/customer/type filters for all routes here.
 * - Keep this route sales-focused: customer, item, amount, qty, shipped qty, status.
 * - Do not add production-stage detail here; link to PO Tracker when needed.
 * =============================================================================
 */

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

// Applies the shared year/month/customer/type filters for sales endpoints.
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

// Customer Sales Overview KPI/group rows.
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

// Monthly trend source for Customer Sales Analysis charts.
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

// Product type trend source for Customer Sales Analysis charts.
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

// Customer Order List drilldown rows.
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

// Top 30 Items table source for Customer Sales Overview.
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
