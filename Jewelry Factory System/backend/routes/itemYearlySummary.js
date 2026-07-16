const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

const ORDER_BLOCKLIST = "SUBSTRING(h.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD')";

function parseYears(value) {
  const years = String(value || '')
    .split(',')
    .map(v => parseInt(v, 10))
    .filter(v => !Number.isNaN(v));

  const unique = Array.from(new Set(years)).sort((a, b) => a - b);
  if (unique.length > 0) return unique;

  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear];
}

function parseMonths(value) {
  return Array.from(new Set(
    String(value || '')
      .split(',')
      .map(v => parseInt(v, 10))
      .filter(v => !Number.isNaN(v) && v >= 1 && v <= 12),
  )).sort((a, b) => a - b);
}

function parseStyles(value) {
  return Array.from(new Set(
    String(value || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean),
  ));
}

function normalizeStyle(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeCustomer(value) {
  return String(value || '').trim().toUpperCase();
}

function pairKey(customerCode, styleNo) {
  return `${normalizeCustomer(customerCode)}|${normalizeStyle(styleNo)}`;
}

function parsePairs(value) {
  const unique = new Map();
  String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .forEach(raw => {
      const parts = raw.split('|');
      if (parts.length < 2) return;
      const customerCode = normalizeCustomer(parts[0]);
      const styleNo = normalizeStyle(parts.slice(1).join('|'));
      if (!customerCode || !styleNo) return;
      unique.set(pairKey(customerCode, styleNo), { customerCode, styleNo });
    });
  return Array.from(unique.values());
}

function addIntParams(request, prefix, values) {
  values.forEach((value, index) => request.input(`${prefix}${index}`, sql.Int, value));
  return values.map((_, index) => `@${prefix}${index}`).join(',');
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function pctChange(current, previous) {
  const cur = safeNumber(current);
  const prev = safeNumber(previous);
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

function totals(rows) {
  return rows.reduce(
    (acc, row) => ({
      qty: acc.qty + safeNumber(row.hasData ? row.qty : 0),
      value: acc.value + safeNumber(row.hasData ? row.value : 0),
      orderCount: acc.orderCount + safeNumber(row.hasData ? row.orderCount : 0),
      lineCount: acc.lineCount + safeNumber(row.hasData ? row.lineCount : 0),
    }),
    { qty: 0, value: 0, orderCount: 0, lineCount: 0 },
  );
}

function mapYearlyRows(years, recordset) {
  const byYear = new Map(recordset.map(row => [Number(row.year), row]));

  const rows = years.map(year => {
    const raw = byYear.get(year);
    return {
      year,
      qty: safeNumber(raw?.qty),
      value: safeNumber(raw?.value),
      orderCount: safeNumber(raw?.orderCount),
      lineCount: safeNumber(raw?.lineCount),
      hasData: !!raw,
      status: raw ? 'base' : 'no_data',
      yoyQtyPct: null,
      yoyValuePct: null,
    };
  });

  rows.forEach((row, index) => {
    if (!row.hasData) {
      row.status = 'no_data';
      return;
    }

    const previous = rows[index - 1];
    if (!previous) {
      row.status = 'base';
      return;
    }

    if (!previous.hasData) {
      row.status = 'new';
      return;
    }

    row.status = 'ok';
    row.yoyQtyPct = pctChange(row.qty, previous.qty);
    row.yoyValuePct = pctChange(row.value, previous.value);
  });

  return rows;
}

// Batch yearly summary for Top Orders compare mode.
router.get('/yearly-summary', async (req, res) => {
  try {
    const years = parseYears(req.query.years);
    const months = parseMonths(req.query.months);
    const pairs = parsePairs(req.query.pairs).slice(0, 300);

    // Pair mode compares specific customer+item rows shown in Top Orders.
    if (pairs.length > 0) {
      const pool = await getPool();
      const request = pool.request();
      const pairClauses = pairs.map((pair, index) => {
        request.input(`cust${index}`, sql.NVarChar, pair.customerCode);
        request.input(`pairStyle${index}`, sql.NVarChar, pair.styleNo);
        return `(UPPER(LTRIM(RTRIM(ISNULL(h.CustCode, '')))) = @cust${index} AND UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) = @pairStyle${index})`;
      }).join(' OR ');
      const yearParams = addIntParams(request, 'yr', years);
      const monthParams = months.length ? addIntParams(request, 'mo', months) : '';
      const monthWhereClause = months.length ? `AND MONTH(h.OrdDate) IN (${monthParams})` : '';

      const result = await request.query(`
        SELECT
          UPPER(LTRIM(RTRIM(ISNULL(h.CustCode, '')))) AS customerCode,
          UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) AS styleNo,
          YEAR(h.OrdDate) AS [year],
          SUM(ISNULL(d.ItemQty, 0)) AS qty,
          SUM(ISNULL(ISNULL(d.ItemExchAmnt, d.ItemAmnt), 0)) AS value,
          COUNT(DISTINCT h.OrdNo) AS orderCount,
          COUNT(*) AS lineCount
        FROM OrdHD h
        INNER JOIN OrdDT d ON d.OrdNo = h.OrdNo
        LEFT JOIN GMCust c ON c.CustCode = h.CustCode
        WHERE (${pairClauses})
          AND h.OrdDate IS NOT NULL
          AND YEAR(h.OrdDate) IN (${yearParams})
          ${monthWhereClause}
          AND ${ORDER_BLOCKLIST}
          AND (h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%')
          AND ISNULL(c.CustStatus, 'Y') = 'Y'
        GROUP BY UPPER(LTRIM(RTRIM(ISNULL(h.CustCode, '')))), UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))), YEAR(h.OrdDate)
        ORDER BY UPPER(LTRIM(RTRIM(ISNULL(h.CustCode, '')))), UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))), YEAR(h.OrdDate)
      `);

      const recordsByPair = new Map();
      result.recordset.forEach(row => {
        const key = pairKey(row.customerCode, row.styleNo);
        if (!recordsByPair.has(key)) recordsByPair.set(key, []);
        recordsByPair.get(key).push(row);
      });

      const data = pairs.map(pair => {
        const key = pairKey(pair.customerCode, pair.styleNo);
        const yearlyRows = mapYearlyRows(years, recordsByPair.get(key) || []);
        return {
          customerCode: pair.customerCode,
          normalizedCustomerCode: pair.customerCode,
          styleNo: pair.styleNo,
          normalizedStyleNo: pair.styleNo,
          combined: totals(yearlyRows),
          data: yearlyRows,
        };
      });

      return res.json({ ok: true, years, data });
    }

    const styles = parseStyles(req.query.styles).slice(0, 300);
    if (styles.length === 0) {
      return res.status(400).json({ ok: false, error: 'At least one Style No. is required' });
    }

    const pool = await getPool();
    const request = pool.request();
    const styleParams = styles.map((styleNo, index) => {
      request.input(`style${index}`, sql.NVarChar, normalizeStyle(styleNo));
      return `@style${index}`;
    }).join(',');
    const yearParams = addIntParams(request, 'yr', years);
    const monthParams = months.length ? addIntParams(request, 'mo', months) : '';
    const monthWhereClause = months.length ? `AND MONTH(h.OrdDate) IN (${monthParams})` : '';

    const result = await request.query(`
      SELECT
        UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) AS styleNo,
        YEAR(h.OrdDate) AS [year],
        SUM(ISNULL(d.ItemQty, 0)) AS qty,
        SUM(ISNULL(ISNULL(d.ItemExchAmnt, d.ItemAmnt), 0)) AS value,
        COUNT(DISTINCT h.OrdNo) AS orderCount,
        COUNT(*) AS lineCount
      FROM OrdHD h
      INNER JOIN OrdDT d ON d.OrdNo = h.OrdNo
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      WHERE UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) IN (${styleParams})
        AND h.OrdDate IS NOT NULL
        AND YEAR(h.OrdDate) IN (${yearParams})
        ${monthWhereClause}
        AND ${ORDER_BLOCKLIST}
        AND (h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%')
        AND ISNULL(c.CustStatus, 'Y') = 'Y'
      GROUP BY UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))), YEAR(h.OrdDate)
      ORDER BY UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))), YEAR(h.OrdDate)
    `);

    const recordsByStyle = new Map();
    result.recordset.forEach(row => {
      const key = normalizeStyle(row.styleNo);
      if (!recordsByStyle.has(key)) recordsByStyle.set(key, []);
      recordsByStyle.get(key).push(row);
    });

    const data = styles.map(styleNo => {
      const normalizedStyleNo = normalizeStyle(styleNo);
      const yearlyRows = mapYearlyRows(years, recordsByStyle.get(normalizedStyleNo) || []);
      return {
        styleNo,
        normalizedStyleNo,
        combined: totals(yearlyRows),
        data: yearlyRows,
      };
    });

    res.json({ ok: true, years, data });
  } catch (err) {
    console.error('[API ERROR] /api/items/yearly-summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});
// Single item yearly summary detail endpoint.
router.get('/:styleNo/yearly-summary', async (req, res) => {
  try {
    const styleNo = String(req.params.styleNo || '').trim();
    if (!styleNo) {
      return res.status(400).json({ ok: false, error: 'Style No. is required' });
    }

    const years = parseYears(req.query.years);
    const months = parseMonths(req.query.months);
    const pool = await getPool();
    const request = pool.request();
    request.input('styleNo', sql.NVarChar, styleNo);
    const yearParams = addIntParams(request, 'yr', years);
    const monthParams = months.length ? addIntParams(request, 'mo', months) : '';
    const monthWhereClause = months.length ? `AND MONTH(h.OrdDate) IN (${monthParams})` : '';

    const result = await request.query(`
      SELECT
        YEAR(h.OrdDate) AS [year],
        SUM(ISNULL(d.ItemQty, 0)) AS qty,
        SUM(ISNULL(ISNULL(d.ItemExchAmnt, d.ItemAmnt), 0)) AS value,
        COUNT(DISTINCT h.OrdNo) AS orderCount,
        COUNT(*) AS lineCount
      FROM OrdHD h
      INNER JOIN OrdDT d ON d.OrdNo = h.OrdNo
      LEFT JOIN GMCust c ON c.CustCode = h.CustCode
      WHERE UPPER(LTRIM(RTRIM(ISNULL(d.ItemNo, '')))) = UPPER(@styleNo)
        AND h.OrdDate IS NOT NULL
        AND YEAR(h.OrdDate) IN (${yearParams})
        ${monthWhereClause}
        AND ${ORDER_BLOCKLIST}
        AND (h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%')
        AND ISNULL(c.CustStatus, 'Y') = 'Y'
      GROUP BY YEAR(h.OrdDate)
      ORDER BY YEAR(h.OrdDate)
    `);

    const data = mapYearlyRows(years, result.recordset);
    res.json({
      ok: true,
      styleNo,
      years,
      combined: totals(data),
      data,
    });
  } catch (err) {
    console.error('[API ERROR] /api/items/:styleNo/yearly-summary:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
