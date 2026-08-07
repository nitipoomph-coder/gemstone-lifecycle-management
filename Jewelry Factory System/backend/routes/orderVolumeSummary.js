// ═══════════════════════════════════════════════════════════════════════════════
// 📌 MODULE: Customer Sales Analysis (routes/salesAnalytics.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Handles data fetching for the Customer Sales dashboards from the reviewed
// TEST DATABASE sales analytics view (without Legacy SPs).
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// TEST DATABASE source. Production use requires separate review and approval.
const SALES_ANALYTICS_VIEW = 'dbo.VW_Web_SalesDashboard';

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
    ship: 'shipmonth',
    shipmonth: 'shipmonth',
    ordmonth: 'ordmonth',
  };
  const basis = aliases[raw] || 'orddate';
  const dateExprByBasis = {
    orddate: viewAlias + '.OrdDate',
    duedate: viewAlias + '.DueDate',
    custdate: viewAlias + '.CustDue',
    ordmonth: viewAlias + '.OrdDate',
    shipmonth: viewAlias + '.ShipDate',
  };
  return { basis, dateExpr: dateExprByBasis[basis] };
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
    `SUBSTRING(${viewAlias}.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')`,
    `(${viewAlias}.PONo IS NULL OR UPPER(${viewAlias}.PONo) NOT LIKE '%SAMPLE%')`,
  ];

  if (customers.length > 0) {
    const customerParams = addInParams(request, 'sc', customers, sql.NVarChar);
    filters.push(`${viewAlias}.CustomerCode IN (${customerParams})`);
  }

  if (types.length > 0) {
    const typeParams = addInParams(request, 'st', types, sql.NVarChar);
    filters.push(`UPPER(ISNULL(${viewAlias}.ProductType, 'OTHERS')) IN (${typeParams})`);
  }

  return { years, months, customers, types, whereSql: filters.join('\n        AND ') };
}

// Customer Sales Overview KPI/group rows.
router.get('/sales-customer-groups', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        ISNULL(NULLIF(v.SalesName, ''), 'Unassigned') AS salesName,
        ISNULL(NULLIF(v.SalesName, ''), 'Unassigned') AS customerCode,
        ISNULL(NULLIF(v.SalesName, ''), 'Unassigned') AS customerName,
        YEAR(${dateExpr}) AS year,
        MONTH(${dateExpr}) AS month,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        SUM(v.OrderQty) AS qty,
        SUM(v.ShippedQty) AS shippedQty,
        SUM(v.OrderAmount) AS amount
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
        AND ISNULL(v.CustomerStatus, 'Y') = 'Y'
      GROUP BY ISNULL(NULLIF(v.SalesName, ''), 'Unassigned'), YEAR(${dateExpr}), MONTH(${dateExpr})
      ORDER BY year, month, salesName
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
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        YEAR(${dateExpr}) AS year,
        MONTH(${dateExpr}) AS month,
        COUNT(DISTINCT v.OrdNo) AS orderCount,
        SUM(v.OrderQty) AS qty,
        SUM(v.ShippedQty) AS shippedQty,
        SUM(v.OpenQty) AS gapQty,
        SUM(v.OrderAmount) AS amount,
        SUM(v.ShippedAmount) AS shippedAmount,
        CASE WHEN SUM(v.OrderQty) = 0 THEN 0 ELSE (SUM(v.ShippedQty) / SUM(v.OrderQty)) * 100 END AS fulfillmentRate
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
        AND ISNULL(v.CustomerStatus, 'Y') = 'Y'
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
          v.OrderQty AS qty,
          v.ShippedQty AS shippedQty,
          v.OpenQty AS gapQty,
          v.OrderAmount AS amount,
          v.ShippedAmount AS shippedAmount
        FROM ${SALES_ANALYTICS_VIEW} v
        WHERE ${whereSql}
          AND ISNULL(v.CustomerStatus, 'Y') = 'Y'
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
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      SELECT
        v.OrdNo AS orderNo,
        v.PONo AS poNo,
        v.OrdDate AS ordDate,
        v.DueDate AS dueDate,
        v.CustDue AS custDate,
        v.CustomerCode AS customerCode,
        ISNULL(v.CustomerCode, v.CustomerCode) AS customerName,
        ISNULL(NULLIF(v.SalesName, ''), 'Unassigned') AS salesName,
        ISNULL(NULLIF(v.CustomerCode, ''), ISNULL(v.CustomerCode, v.CustomerCode)) AS brand,
        v.PO2 AS po2,
        v.ShipTo AS shipT,
        v.OrderStamp AS ordStamp,
        v.OrderMaker AS ordMaker,
        v.ItemNo AS itemNo,
        v.ItemSKU AS itemSku,
        ISNULL(NULLIF(v.ItemType, ''), LEFT(ISNULL(v.ItemNo, ''), 3)) AS itemType,
        ${itemTypeNameSql('v.ItemType', 'v.ItemNo', 'gt.GoodTypeNameEng', 'gt.GoodTypeName')} AS itemTypeName,
        UPPER(ISNULL(v.ProductType, 'OTHERS')) AS productTypeCode,
        v.CustomerItem AS custItem,
        v.ItemMat AS itemMat,
        v.ItemSize AS itemSize,
        v.ItemStone AS itemStone,
        v.ItemDescription AS itemDesc,
        v.ItemPlate AS itemPlate,
        v.SetType AS setType,
        v.ItemWeight AS itemWeight,
        v.OrderQty AS orderQty,
        v.ShippedQty AS shippedQty,
        v.ItemPrice AS itemPrice,
        v.OrderAmount AS amount,
        v.ShippedAmount AS shippedAmount,
        ${salesStatusSql('v.OrderQty', 'v.ShippedQty', 'v.CustDue')} AS status,
        ISNULL(NULLIF(v.Market, ''), '-') AS market
      FROM ${SALES_ANALYTICS_VIEW} v
      LEFT JOIN GMGoodType gt ON gt.GoodTypeCode = v.ItemType
      WHERE ${whereSql}
        AND ISNULL(v.CustomerStatus, 'Y') = 'Y'
      ORDER BY v.OrdDate DESC, v.OrdNo, v.OrdLineNo
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
    const { dateExpr } = salesDateBasis(req, 'v');
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);
    const metric = String(req.query.metric || 'amount').toLowerCase() === 'qty' ? 'qty' : 'amount';
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isNaN(rawLimit) ? 30 : Math.min(Math.max(rawLimit, 1), 100);
    request.input('limit', sql.Int, limit);

    const orderExpr = metric === 'qty' ? 'qty' : 'amount';

    const result = await request.query(`
      WITH ItemCustomer AS (
        SELECT
          v.ItemNo AS itemNo,
          v.CustomerCode AS customerCode,
          ISNULL(v.CustomerCode, v.CustomerCode) AS customerName,
          SUM(v.OrderQty) AS qty,
          SUM(v.OrderAmount) AS amount
        FROM ${SALES_ANALYTICS_VIEW} v
        WHERE ${whereSql}
          AND ISNULL(v.CustomerStatus, 'Y') = 'Y'
        GROUP BY v.ItemNo, v.CustomerCode, v.CustomerCode
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
          v.ItemNo AS itemNo,
          MAX(v.ItemDescription) AS itemDesc,
          ISNULL(NULLIF(MAX(v.ItemType), ''), LEFT(ISNULL(v.ItemNo, ''), 3)) AS itemType,
          ${itemTypeNameMaxSql('v.ItemType', 'v.ItemNo', 'gt.GoodTypeNameEng', 'gt.GoodTypeName')} AS itemTypeName,
          UPPER(ISNULL(v.ProductType, 'OTHERS')) AS productTypeCode,
          SUM(v.OrderQty) AS qty,
          SUM(v.ShippedQty) AS shippedQty,
          SUM(v.OrderAmount) AS amount,
          COUNT(DISTINCT v.OrdNo) AS orderCount
        FROM ${SALES_ANALYTICS_VIEW} v
        LEFT JOIN GMGoodType gt ON gt.GoodTypeCode = v.ItemType
        WHERE ${whereSql}
          AND ISNULL(v.CustomerStatus, 'Y') = 'Y'
        GROUP BY v.ItemNo, UPPER(ISNULL(v.ProductType, 'OTHERS'))
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

// Weekly trend source for Customer Sales Analysis charts.
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
        SUM(v.OrderQty) AS qty,
        SUM(v.ShippedQty) AS shippedQty,
        SUM(v.OpenQty) AS gapQty,
        SUM(v.OrderAmount) AS amount,
        SUM(v.ShippedAmount) AS shippedAmount
      FROM ${SALES_ANALYTICS_VIEW} v
      WHERE ${whereSql}
        AND ISNULL(v.CustomerStatus, 'Y') = 'Y'
      GROUP BY YEAR(${dateExpr}), DATEPART(iso_week, ${dateExpr})
      ORDER BY year, week
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-weekly-analytics:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Due Outlook for Customer Sales Analysis charts.
// [SALES DUE OUTLOOK] GET /api/dashboard/sales-due-outlook
router.get('/sales-due-outlook', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    // For Due Outlook, we base the dateExpr on CustomerDueDate, unless otherwise requested
    const { dateExpr } = { dateExpr: 'v.CustDue' };
    const { whereSql } = buildSalesFilters(req, request, 'v', dateExpr);

    const result = await request.query(`
      WITH BaseData AS (
        SELECT
          v.OrdNo,
          YEAR(${dateExpr}) AS year,
          MONTH(${dateExpr}) AS month,
          MAX(CASE WHEN v.OpenQty > 0 AND CAST(${dateExpr} AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS isOverdue,
          MAX(CASE WHEN v.OpenQty > 0 AND CAST(${dateExpr} AS DATE) >= CAST(GETDATE() AS DATE) AND CAST(${dateExpr} AS DATE) <= CAST(DATEADD(day, 14, GETDATE()) AS DATE) THEN 1 ELSE 0 END) AS isDueSoon,
          SUM(v.OrderQty) AS dueQty,
          SUM(CASE WHEN v.ShippedQty > v.OrderQty THEN v.OrderQty ELSE v.ShippedQty END) AS shippedQty,
          SUM(v.OrderAmount) AS dueAmount,
          SUM(CASE WHEN v.ShippedAmount > v.OrderAmount THEN v.OrderAmount ELSE v.ShippedAmount END) AS shippedAmount
        FROM ${SALES_ANALYTICS_VIEW} v
        WHERE ${whereSql}
          AND ISNULL(v.CustomerStatus, 'Y') = 'Y'
        GROUP BY v.OrdNo, YEAR(${dateExpr}), MONTH(${dateExpr})
      )
      SELECT
        year,
        month,
        SUM(dueQty) AS dueQty,
        SUM(shippedQty) AS shippedQty,
        SUM(CASE WHEN dueQty > shippedQty THEN dueQty - shippedQty ELSE 0 END) AS openQty,
        SUM(dueAmount) AS dueAmount,
        SUM(shippedAmount) AS shippedAmount,
        SUM(CASE WHEN dueAmount > shippedAmount THEN dueAmount - shippedAmount ELSE 0 END) AS openAmount,
        SUM(isOverdue) AS overdueOrders,
        SUM(isDueSoon) AS dueSoonOrders
      FROM BaseData
      GROUP BY year, month
      ORDER BY year, month
    `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('[API ERROR] /api/dashboard/sales-due-outlook:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
