const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// รูปเสิร์ฟจาก network path (/api/photos/ps|cad/:itemNo) — search คืน itemNo ให้ frontend ประกอบ URL เอง

router.get('/', async (req, res) => {
  try {
    const { q, type } = req.query;
    const queryText = q ? String(q).trim() : '';
    const searchType = type ? String(type).toLowerCase().trim() : null;

    console.log(`[Search Request] q: "${queryText}", type: "${searchType}"`);
    if (queryText.length < 2) return res.json({ ok: true, data: [] });

    const pool = await getPool();
    const likeQuery = `%${queryText}%`;
    const prefixQuery = `${queryText}%`;
    const results = [];

    // Search Orders (OrdHD)
    if (!searchType || searchType === 'order' || searchType === 'po') {
      let whereClause = 'h.OrdNo LIKE @qPrefix OR h.PONo LIKE @qPrefix OR h.CustCode LIKE @qPrefix OR c.SalesName LIKE @qPrefix';
      if (searchType === 'po') {
        whereClause = 'h.PONo LIKE @qPrefix';
      }

      const orderResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          WITH FilteredOrders AS (
            SELECT TOP 10 h.OrdNo, h.PONo, h.CustCode, c.SalesName
            FROM OrdHD h
            LEFT JOIN GMCust c ON c.CustCode = h.CustCode
            WHERE ${whereClause}
          )
          SELECT 
            f.OrdNo AS id, 
            'order' AS type, 
            f.OrdNo AS title, 
            'Order No: ' + f.OrdNo + ' / PO: ' + ISNULL(f.PONo, '-') + ' / Cust: ' + ISNULL(f.CustCode, '') AS sub, 
            '/order-tracker?search=' + f.OrdNo AS path,
            d.ItemNo AS itemNo
          FROM FilteredOrders f
          LEFT JOIN OrdDT d ON d.OrdNo = f.OrdNo AND d.OrdLineNo = '1'
        `);
      results.push(...orderResult.recordset);
    }

    // Search Items (OrdDT)
    if (!searchType || searchType === 'item') {
      const itemResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          WITH FilteredItems AS (
            SELECT DISTINCT TOP 10 d.ItemNo, d.ItemDesc, d.ItemMat
            FROM OrdDT d
            WHERE d.ItemNo LIKE @qPrefix OR d.ItemDesc LIKE @qPrefix
          )
          SELECT 
            f.ItemNo AS id, 
            'item' AS type, 
            f.ItemNo AS title, 
            'Item Desc: ' + ISNULL(f.ItemDesc, '') + ' / Mat: ' + ISNULL(f.ItemMat, '') AS sub, 
            '/order-tracker?search=' + f.ItemNo AS path,
            f.ItemNo AS itemNo
          FROM FilteredItems f
        `);
      results.push(...itemResult.recordset);
    }

    // Search Customers (GMCust) — show CustCode only; never expose CustName
    if (!searchType || searchType === 'customer') {
      const custResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          SELECT TOP 10
            c.CustCode AS id,
            'customer' AS type,
            c.CustCode AS title,
            '' AS sub,
            '/order-tracker?search=' + c.CustCode AS path
          FROM GMCust c
          WHERE c.CustCode LIKE @qPrefix OR c.CustName LIKE @q
        `);
      results.push(...custResult.recordset.map(r => ({ ...r, itemNo: null })));
    }

    res.json({ ok: true, data: results });
  } catch (err) {
    console.error('[Search API Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
